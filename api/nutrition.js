// Server-side nutrition estimate using the official USDA FoodData Central API.
// The USDA key is read from the USDA_API_KEY environment variable and never
// reaches the browser.

const FDC = 'https://api.nal.usda.gov/fdc/v1';
const NUTRIENTS = {
  calories: '208',
  protein: '203',
  fat: '204',
  carbs: '205',
  fiber: '291',
  sugar: '269',
  saturatedFat: '606',
  cholesterol: '601',
  sodium: '307',
};
const DEFAULT_SERVINGS = 4;
const MAX_INGREDIENTS = 40;

const searchCache = new Map();
const portionCache = new Map();

// Search terms that give a better USDA match than the raw ingredient name.
const ALIASES = {
  sugar: 'sugars, granulated',
  'caster sugar': 'sugars, granulated',
  'granulated sugar': 'sugars, granulated',
  'icing sugar': 'sugars, powdered',
  salt: 'salt, table',
  egg: 'egg, whole, raw, fresh',
  eggs: 'egg, whole, raw, fresh',
  'egg yolk': 'egg, yolk, raw, fresh',
  'egg yolks': 'egg, yolk, raw, fresh',
  'egg white': 'egg, white, raw, fresh',
  'egg whites': 'egg, white, raw, fresh',
  milk: 'milk, whole, 3.25% milkfat',
  butter: 'butter, salted',
  flour: 'wheat flour, white, all-purpose, enriched',
  'plain flour': 'wheat flour, white, all-purpose, enriched',
  'self raising flour': 'wheat flour, white, self-rising, enriched',
  'olive oil': 'oil, olive, salad or cooking',
  oil: 'oil, vegetable',
  'vegetable oil': 'oil, vegetable',
  onion: 'onions, raw',
  onions: 'onions, raw',
  garlic: 'garlic, raw',
  rice: 'rice, white, long-grain, regular, raw, enriched',
  chicken: 'chicken, broilers or fryers, breast, meat only, raw',
  'chicken breast': 'chicken, broilers or fryers, breast, meat only, raw',
  tomato: 'tomatoes, red, ripe, raw',
  tomatoes: 'tomatoes, red, ripe, raw',
};

const SKIP_WORDS = /^(water|ice)$/i;
const NO_QTY = /\b(to taste|pinch|dash|garnish|as needed|for (the )?(garnish|serving)|handful|sprinkling|splash)\b/i;

const MASS = { g: 1, gram: 1, grams: 1, gr: 1, kg: 1000, kilo: 1000, oz: 28.3495, ounce: 28.3495, ounces: 28.3495, lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592 };
const VOLUME_ML = { ml: 1, l: 1000, litre: 1000, liter: 1000, tsp: 4.92892, teaspoon: 4.92892, teaspoons: 4.92892, tbsp: 14.7868, tblsp: 14.7868, tbs: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868, cup: 236.588, cups: 236.588 };
const PORTION_NAMES = {
  tsp: ['tsp', 'teaspoon'], teaspoon: ['tsp', 'teaspoon'], teaspoons: ['tsp', 'teaspoon'],
  tbsp: ['tbsp', 'tablespoon'], tblsp: ['tbsp', 'tablespoon'], tbs: ['tbsp', 'tablespoon'], tablespoon: ['tbsp', 'tablespoon'], tablespoons: ['tbsp', 'tablespoon'],
  cup: ['cup'], cups: ['cup'],
};

function parseFraction(str) {
  const unicode = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  let total = 0;
  let found = false;
  for (const part of str.trim().split(/\s+/)) {
    if (unicode[part] !== undefined) { total += unicode[part]; found = true; continue; }
    if (/^\d+\/\d+$/.test(part)) { const [a, b] = part.split('/').map(Number); if (b) { total += a / b; found = true; } continue; }
    if (/^\d+(\.\d+)?$/.test(part)) { total += Number(part); found = true; continue; }
    return null;
  }
  return found ? total : null;
}

// "100g Sugar" -> { qty: 100, unit: 'g', name: 'Sugar' }
function parseIngredient(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text || NO_QTY.test(text)) return null;
  const m = text.match(/^((?:\d+\s+)?\d+\/\d+|[\d.]+(?:\s*[½¼¾⅓⅔])?|[½¼¾⅓⅔])\s*([a-zA-Z]*)\.?\s*(.*)$/);
  if (!m) return null;
  const qty = parseFraction(m[1].replace(/([\d.])([½¼¾⅓⅔])/, '$1 $2'));
  if (!qty) return null;
  let unit = m[2].toLowerCase();
  let name = m[3].replace(/\(.*?\)/g, '').replace(/^of\s+/i, '').trim();
  if (!(unit in MASS) && !(unit in VOLUME_ML)) {
    // Not a known unit: the word belongs to the ingredient name ("2 Egg", "1 vanilla pod").
    name = `${m[2]} ${name}`.trim();
    unit = '';
  }
  name = name
    .replace(/,.*$/, '')
    .replace(/\b(small|medium|large|big|fresh|finely|roughly|chopped|diced|sliced|minced|grated|ground|whole|ripe|peeled|boneless|skinless|cooked)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name || SKIP_WORDS.test(name)) return null;
  return { qty, unit, name };
}

async function fdcGet(path, params, key) {
  const qs = new URLSearchParams({ ...params, api_key: key });
  const res = await fetch(`${FDC}${path}?${qs}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const err = new Error(`USDA request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9% ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

// Strict match: every word of the query must appear in the USDA description,
// otherwise the ingredient is left out instead of guessing a wrong food.
async function findFood(name, key) {
  const lower = name.toLowerCase();
  const aliased = ALIASES[lower];
  const query = aliased || lower;
  if (searchCache.has(query)) return searchCache.get(query);
  const data = await fdcGet(
    '/foods/search',
    { query, dataType: 'Foundation,SR Legacy', pageSize: 25, requireAllWords: 'true' },
    key
  );
  const want = tokens(aliased ? aliased.split(',')[0] : lower);
  let best = null;
  let bestScore = -Infinity;
  for (const f of data.foods || []) {
    const desc = String(f.description || '');
    const all = new Set(tokens(desc));
    if (!want.every((w) => all.has(w))) continue;
    const junk = /\b(ice creams?|candies|candy|cookie|school lunch|restaurant|babyfood|nugget|fast food|puffed|beverages|snacks|cereals|pie|cake|sandwich)\b/i;
    if (junk.test(desc) && !junk.test(query)) continue;
    const first = tokens(desc.split(',')[0]);
    let score = 0;
    if (first.join(' ') === want.join(' ')) score += 10;
    else if (want.every((w) => first.includes(w))) score += 5;
    if (/\braw\b/i.test(desc)) score += 2;
    if (/\b(dehydrated|frozen|canned|dried|cooked|babyfood|restaurant|nugget|cookie|candies|school lunch)\b/i.test(desc) && !/\b(dehydrated|frozen|canned|dried|cooked)\b/i.test(query)) score -= 4;
    score -= desc.length / 60;
    if (score > bestScore) { bestScore = score; best = f; }
  }
  searchCache.set(query, best);
  return best;
}

async function gramsPerUnit(food, unit, key) {
  const names = PORTION_NAMES[unit];
  if (!names) return null;
  let portions = portionCache.get(food.fdcId);
  if (!portions) {
    const detail = await fdcGet(`/food/${food.fdcId}`, {}, key);
    portions = detail.foodPortions || [];
    portionCache.set(food.fdcId, portions);
  }
  for (const p of portions) {
    const label = `${p.measureUnit?.name || ''} ${p.modifier || ''}`.toLowerCase();
    if (names.some((n) => label.includes(n)) && p.gramWeight) return p.gramWeight / (p.amount || 1);
  }
  return null;
}

async function ingredientGrams(parsed, food, key) {
  if (parsed.unit in MASS) return parsed.qty * MASS[parsed.unit];
  if (parsed.unit in VOLUME_ML) {
    const per = await gramsPerUnit(food, parsed.unit, key);
    if (per) return parsed.qty * per;
    return parsed.qty * VOLUME_ML[parsed.unit]; // assumes water-like density
  }
  // Counted items ("2 Egg"): use the food's first portion weight when known.
  const detail = portionCache.get(food.fdcId) || (await fdcGet(`/food/${food.fdcId}`, {}, key)).foodPortions || [];
  portionCache.set(food.fdcId, detail);
  const piece = detail.find((p) => {
    const label = `${p.measureUnit?.name || ''} ${p.modifier || ''} ${p.portionDescription || ''}`;
    return (
      p.gramWeight &&
      /(medium|large|each|whole|unit|clove|slice|stalk|piece|fruit|breast|fillet|pod|bunch|sprig|leaf|head|item)/i.test(label) &&
      !/\b(cup|tbsp|tsp|oz|lb|ml|fl|quart|pint|gallon|cubic|package|packet|can)\b/i.test(label)
    );
  });
  return piece ? parsed.qty * (piece.gramWeight / (piece.amount || 1)) : null;
}

function per100g(food) {
  const out = {};
  for (const [field, number] of Object.entries(NUTRIENTS)) {
    const n = (food.foodNutrients || []).find((x) => String(x.nutrientNumber) === number);
    out[field] = n && Number(n.value) ? Number(n.value) : 0;
  }
  return out;
}

async function analyze(ingredients, key) {
  const totals = Object.fromEntries(Object.keys(NUTRIENTS).map((k) => [k, 0]));
  let matched = 0;
  let considered = 0;
  const details = [];
  for (const raw of ingredients) {
    const parsed = parseIngredient(raw);
    if (!parsed) continue; // "to taste", water, unparseable
    considered += 1;
    try {
      const food = await findFood(parsed.name, key);
      if (!food) { details.push({ original: raw, matched: false }); continue; }
      const grams = await ingredientGrams(parsed, food, key);
      if (!grams) { details.push({ original: raw, matched: false }); continue; }
      const base = per100g(food);
      for (const k of Object.keys(totals)) totals[k] += (base[k] * grams) / 100;
      matched += 1;
      details.push({ original: raw, matched: true, food: food.description, grams: Math.round(grams) });
    } catch (err) {
      if (err.status === 429 || err.status === 403 || err.status === 401) throw err;
      details.push({ original: raw, matched: false });
    }
  }
  return { totals, matched, considered, details };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED' } });
  }
  const key = process.env.USDA_API_KEY;
  if (!key) return res.status(503).json({ success: false, error: { code: 'NOT_CONFIGURED' } });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const ingredients = Array.isArray(body?.ingredients) ? body.ingredients.slice(0, MAX_INGREDIENTS).map(String) : null;
  if (!ingredients || !ingredients.length) {
    return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST' } });
  }

  try {
    const { totals, matched, considered, details } = await analyze(ingredients, key);
    // Refuse to present numbers built from too little data.
    if (!considered || matched / considered < 0.7 || totals.calories <= 0) {
      return res.status(422).json({ success: false, error: { code: 'INSUFFICIENT_DATA' }, matched, considered });
    }
    const servings = DEFAULT_SERVINGS;
    const round = (n) => Math.round(n * 10) / 10;
    const perServing = {};
    const roundedTotals = {};
    for (const k of Object.keys(totals)) {
      roundedTotals[k] = round(totals[k]);
      perServing[k] = round(totals[k] / servings);
    }
    return res.status(200).json({
      success: true,
      data: { servings, totals: roundedTotals, perServing, matched, considered, ingredients: details },
    });
  } catch (err) {
    const status = err.status === 429 ? 429 : 502;
    return res.status(status).json({ success: false, error: { code: status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR' } });
  }
};
module.exports.parseIngredient = parseIngredient;
