
export class FoodLog {
  static STORAGE_KEY = 'nutriplan_food_log';

  static _load() {
    try {
      return JSON.parse(localStorage.getItem(FoodLog.STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  static _save(data) {
    localStorage.setItem(FoodLog.STORAGE_KEY, JSON.stringify(data));
  }

  // YYYY-MM-DD in the user's local time zone (not UTC), so the log day matches the clock.
  static _dateKey(d = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  static _todayKey() {
    return FoodLog._dateKey(new Date());
  }

  /**
   *
   * @param {{ type, name, thumbnail, nutrition }} entry
   * @returns {LogEntry}
   */
  static addEntry(entry) {
    const all = FoodLog._load();
    const key = FoodLog._todayKey();
    if (!all[key]) all[key] = [];
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      loggedAt: new Date().toISOString(),
      ...entry,
      nutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        saturatedFat: 0,
        cholesterol: 0,
        sodium: 0,
        ...entry.nutrition,
      },
    };
    all[key].push(logEntry);
    FoodLog._save(all);
    return logEntry;
  }

  /**
   * 
   * @param {string} id
   */
  static removeEntry(id) {
    const all = FoodLog._load();
    for (const key of Object.keys(all)) {
      const before = all[key].length;
      all[key] = all[key].filter((e) => e.id !== id);
      if (all[key].length !== before) break;
    }
    FoodLog._save(all);
  }

  /**
   * Get entries for a specific date (default: today).
   * @param {string} [dateKey] 
   * @returns {LogEntry[]}
   */
  static getEntries(dateKey = FoodLog._todayKey()) {
    return FoodLog._load()[dateKey] || [];
  }

  /**
   * Get entries for all dates.
   * @returns {{ [dateKey]: LogEntry[] }}
   */
  static getAllEntries() {
    return FoodLog._load();
  }

  /**
   * Sum nutrition for a given date.
   * @param {string} [dateKey]
   * @returns {{ calories, protein, carbs, fat, fiber, sugar }}
   */
  static getDailyTotals(dateKey = FoodLog._todayKey()) {
    const entries = FoodLog.getEntries(dateKey);
    return entries.reduce(
      (acc, e) => {
        acc.calories += Number(e.nutrition.calories) || 0;
        acc.protein += Number(e.nutrition.protein) || 0;
        acc.carbs += Number(e.nutrition.carbs) || 0;
        acc.fat += Number(e.nutrition.fat) || 0;
        acc.fiber += Number(e.nutrition.fiber) || 0;
        acc.sugar += Number(e.nutrition.sugar) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );
  }

  /**
   * Clear all entries for today.
   */
  static clearToday() {
    const all = FoodLog._load();
    delete all[FoodLog._todayKey()];
    FoodLog._save(all);
  }

  /**
   * Get weekly totals (last 7 days), keyed by date.
   * @returns {Array<{ date: string, ...totals }>}
   */
  static getWeeklyData() {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = FoodLog._dateKey(d);
      result.push({ date: key, ...FoodLog.getDailyTotals(key) });
    }
    return result;
  }
}
