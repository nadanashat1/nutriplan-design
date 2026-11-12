
export class UIRenderer {
  static showLoading(container, msg = 'Loading...') {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 col-span-full">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
        <p class="text-gray-500">${msg}</p>
      </div>`;
  }

  static showError(container, msg = 'Something went wrong. Please try again.') {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 col-span-full text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <i class="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
        </div>
        <p class="text-gray-700 font-semibold">${msg}</p>
      </div>`;
  }

  static showEmpty(container, msg = 'No results found.', sub = '') {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 col-span-full text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <i class="fa-solid fa-search text-gray-400 text-2xl"></i>
        </div>
        <p class="text-gray-700 font-semibold">${msg}</p>
        ${sub ? `<p class="text-gray-400 text-sm mt-1">${sub}</p>` : ''}
      </div>`;
  }


  static CATEGORY_ICONS = {
    Beef: 'fa-drumstick-bite',
    Chicken: 'fa-drumstick-bite',
    Dessert: 'fa-ice-cream',
    Lamb: 'fa-sheep',
    Miscellaneous: 'fa-bowl-food',
    Pasta: 'fa-wheat-awn',
    Pork: 'fa-bacon',
    Seafood: 'fa-fish',
    Side: 'fa-plate-wheat',
    Starter: 'fa-egg',
    Vegan: 'fa-leaf',
    Vegetarian: 'fa-carrot',
    Breakfast: 'fa-mug-hot',
    Goat: 'fa-paw',
  };

  static CATEGORY_COLORS = [
    'from-emerald-400 to-green-500',
    'from-blue-400 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-orange-400 to-amber-500',
    'from-red-400 to-rose-500',
    'from-teal-400 to-cyan-500',
    'from-indigo-500 to-blue-600',
    'from-lime-400 to-green-500',
    'from-amber-500 to-orange-600',
    'from-sky-400 to-blue-500',
    'from-pink-400 to-rose-500',
    'from-slate-400 to-gray-500',
  ];

  static _categoryColor(idx) {
    return UIRenderer.CATEGORY_COLORS[idx % UIRenderer.CATEGORY_COLORS.length];
  }


  static renderCategories(container, categories) {
    if (!categories.length) {
      UIRenderer.showEmpty(container, 'No categories found.');
      return;
    }
    container.innerHTML = categories
      .map((cat, i) => {
        const name = cat.name || cat;
        const icon = UIRenderer.CATEGORY_ICONS[name] || 'fa-bowl-food';
        const grad = UIRenderer._categoryColor(i);
        return `
          <div class="category-card bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200 hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all group" data-category="${name}">
            <div class="flex items-center gap-2.5">
              <div class="text-white w-9 h-9 bg-gradient-to-br ${grad} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-900">${name}</h3>
              </div>
            </div>
          </div>`;
      })
      .join('');
  }

  
  static renderMealCards(container, meals) {
    if (!meals.length) {
      UIRenderer.showEmpty(container, 'No recipes found.', 'Try a different filter or search term.');
      return;
    }
    container.innerHTML = meals
      .map(
        (meal) => `
        <div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-meal-id="${meal.id}">
          <div class="relative h-48 overflow-hidden">
            <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              src="${meal.thumbnail || ''}" alt="${meal.name}" loading="lazy"
              onerror="this.src='https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image'">
            <div class="absolute bottom-3 left-3 flex gap-2">
              ${meal.category ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700">${meal.category}</span>` : ''}
              ${meal.area ? `<span class="px-2 py-1 bg-emerald-500 text-xs font-semibold rounded-full text-white">${meal.area}</span>` : ''}
            </div>
          </div>
          <div class="p-4">
            <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">${meal.name}</h3>
            <p class="text-xs text-gray-600 mb-3 line-clamp-2">${meal.instructions?.[0] || 'Delicious recipe to try!'}</p>
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-gray-900">
                <i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>${meal.category || '—'}
              </span>
              <span class="font-semibold text-gray-500">
                <i class="fa-solid fa-globe text-blue-500 mr-1"></i>${meal.area || '—'}
              </span>
            </div>
          </div>
        </div>`
      )
      .join('');
  }

  
  static renderMealList(container, meals) {
    if (!meals.length) {
      UIRenderer.showEmpty(container, 'No recipes found.', 'Try a different filter or search term.');
      return;
    }
    container.innerHTML = meals
      .map(
        (meal) => `
        <div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group flex gap-4 p-4" data-meal-id="${meal.id}">
          <img class="w-24 h-24 object-cover rounded-xl flex-shrink-0"
            src="${meal.thumbnail || ''}" alt="${meal.name}"
            onerror="this.src='https://placehold.co/96x96/e2e8f0/94a3b8?text=N/A'">
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-1">${meal.name}</h3>
            <p class="text-xs text-gray-600 mt-1 line-clamp-2">${meal.instructions?.[0] || 'Delicious recipe to try!'}</p>
            <div class="flex gap-3 mt-2 text-xs">
              ${meal.category ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">${meal.category}</span>` : ''}
              ${meal.area ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">${meal.area}</span>` : ''}
            </div>
          </div>
        </div>`
      )
      .join('');
  }

  
  static renderMealDetail(container, meal) {
    const heroSection = document.querySelector('#meal-details .relative.h-80');
    if (heroSection) {
      heroSection.querySelector('img').src = meal.thumbnail || '';
      heroSection.querySelector('img').alt = meal.name;
    }

    // badges
    const badgeContainer = document.querySelector('#meal-details .absolute.bottom-0 .flex.items-center.gap-3');
    if (badgeContainer) {
      badgeContainer.innerHTML = `
        ${meal.category ? `<span class="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">${meal.category}</span>` : ''}
        ${meal.area ? `<span class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">${meal.area}</span>` : ''}`;
    }

    // title
    const titleEl = document.querySelector('#meal-details .absolute.bottom-0 h1');
    if (titleEl) titleEl.textContent = meal.name;

    // set log button meal id
    const logBtn = document.getElementById('log-meal-btn');
    if (logBtn) logBtn.dataset.mealId = meal.id;

    // ingredients
    UIRenderer._renderIngredients(meal.ingredients || []);

    // instructions
    UIRenderer._renderInstructions(meal.instructions || []);

    // video
    UIRenderer._renderVideo(meal.youtubeUrl || meal.youtube);
  }

  static _renderIngredients(ingredients) {
    const grid = document.querySelector('#meal-details .grid.grid-cols-1.md\\:grid-cols-2.gap-3');
    if (!grid) return;

    // count
    const countSpan = document.querySelector('#meal-details h2 .ml-auto');
    if (countSpan) countSpan.textContent = `${ingredients.length} items`;

    if (!ingredients.length) {
      grid.innerHTML = '<p class="text-gray-500 col-span-2">No ingredients listed.</p>';
      return;
    }

    grid.innerHTML = ingredients
      .map(
        (ing) => `
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
        <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300">
        <span class="text-gray-700">
          <span class="font-medium text-gray-900">${ing.measure || ''}</span> ${ing.ingredient || ''}
        </span>
      </div>`
      )
      .join('');
  }

  static _renderInstructions(instructions) {
    const box = document.querySelector('#meal-details .space-y-4');
    if (!box) return;

    if (!instructions.length) {
      box.innerHTML = '<p class="text-gray-500">No instructions available.</p>';
      return;
    }

    box.innerHTML = instructions
      .map(
        (step, i) => `
      <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
        <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${i + 1}</div>
        <p class="text-gray-700 leading-relaxed pt-2">${step}</p>
      </div>`
      )
      .join('');
  }

  static _renderVideo(youtubeUrl) {
    const videoSection = document.querySelector('#meal-details .aspect-video');
    if (!videoSection) return;

    if (!youtubeUrl) {
      videoSection.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <i class="fa-solid fa-video-slash text-4xl mb-2"></i>
          <p>No video available for this recipe.</p>
        </div>`;
      return;
    }

    // Extract video ID from various YouTube URL formats
    const videoId = UIRenderer._extractYouTubeId(youtubeUrl);
    if (videoId) {
      videoSection.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${videoId}"
          class="absolute inset-0 w-full h-full" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>`;
    } else {
      videoSection.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <i class="fa-solid fa-video-slash text-4xl mb-2"></i>
          <p>Video unavailable.</p>
        </div>`;
    }
  }

  static _extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
      /youtu\.be\/([^?&]+)/,
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtube\.com\/embed\/([^?&]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  
  static renderNutritionFacts(container, nutrition, servings = 1) {
    const perServing = nutrition.perServing || {};
    const total = nutrition.total || {};

    const cal = perServing.calories ?? total.calories ?? 0;
    const totalCal = total.calories ?? 0;
    const protein = perServing.protein ?? total.protein ?? 0;
    const carbs = perServing.carbs ?? total.carbs ?? 0;
    const fat = perServing.fat ?? total.fat ?? 0;
    const fiber = perServing.fiber ?? total.fiber ?? 0;
    const sugar = perServing.sugar ?? total.sugar ?? 0;

    // update hero calories
    const heroCalEl = document.getElementById('hero-calories');
    if (heroCalEl) heroCalEl.textContent = `${Math.round(cal)} cal/serving`;

    const heroServingsEl = document.getElementById('hero-servings');
    if (heroServingsEl) heroServingsEl.textContent = `${servings || 1} servings`;

    const pct = (val, max) => Math.min(100, Math.round((val / max) * 100)) + '%';

    container.innerHTML = `
      <p class="text-sm text-gray-500 mb-4">Per serving (${servings || 1} servings total)</p>
      <div class="text-center py-4 mb-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
        <p class="text-sm text-gray-600">Calories per serving</p>
        <p class="text-4xl font-bold text-emerald-600">${Math.round(cal)}</p>
        ${totalCal ? `<p class="text-xs text-gray-500 mt-1">Total: ${Math.round(totalCal)} cal</p>` : ''}
      </div>
      <div class="space-y-4">
        ${UIRenderer._nutriRow('Protein', protein, 'g', 'emerald', 50)}
        ${UIRenderer._nutriRow('Carbs', carbs, 'g', 'blue', 300)}
        ${UIRenderer._nutriRow('Fat', fat, 'g', 'purple', 65)}
        ${UIRenderer._nutriRow('Fiber', fiber, 'g', 'orange', 28)}
        ${UIRenderer._nutriRow('Sugar', sugar, 'g', 'pink', 50)}
      </div>`;
  }

  static _nutriRow(label, value, unit, color, max) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return `
      <div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-${color}-500"></div>
            <span class="text-gray-700">${label}</span>
          </div>
          <span class="font-bold text-gray-900">${Number(value).toFixed(1)}${unit}</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2 mt-1">
          <div class="bg-${color}-500 h-2 rounded-full transition-all duration-500" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  static renderNutritionLoading(container) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-gray-500">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
        <p class="text-sm">Analyzing nutrition...</p>
      </div>`;
  }

  static renderNutritionError(container, msg = 'Nutrition data unavailable.') {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <i class="fa-solid fa-triangle-exclamation text-amber-500 text-3xl mb-3"></i>
        <p class="text-gray-700 font-medium">Nutrition unavailable</p>
        <p class="text-gray-500 text-sm mt-1">${msg}</p>
      </div>`;
  }

 
  static NUTRI_COLORS = {
    a: 'bg-green-500',
    b: 'bg-lime-500',
    c: 'bg-yellow-500',
    d: 'bg-orange-500',
    e: 'bg-red-500',
  };

  static renderProductCards(container, products) {
    if (!products.length) {
      UIRenderer.showEmpty(container, 'No products found.', 'Try a different search term or barcode.');
      return;
    }
    container.innerHTML = products
      .map((p) => UIRenderer._productCardHTML(p))
      .join('');
  }

  static _productCardHTML(p) {
    const grade = (p.nutritionGrade || '').toLowerCase();
    const gradeColor = UIRenderer.NUTRI_COLORS[grade] || 'bg-gray-400';
    const n = p.nutrients || {};
    const cal = n.calories ?? '—';
    const protein = n.protein ?? '—';
    const carbs = n.carbs ?? '—';
    const fat = n.fat ?? '—';
    const sugar = n.sugar ?? '—';

    return `
      <div class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-barcode="${p.barcode || ''}">
        <div class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden p-4">
          ${
            p.image
              ? `<img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                src="${p.image}" alt="${p.name}" loading="lazy"
                onerror="this.parentElement.innerHTML='<i class=\'fa-solid fa-box-open text-gray-300 text-5xl\'></i>'">`
              : '<i class="fa-solid fa-box-open text-gray-300 text-5xl"></i>'
          }
          ${grade ? `<div class="absolute top-2 left-2 ${gradeColor} text-white text-xs font-bold px-2 py-1 rounded uppercase">Nutri-Score ${grade.toUpperCase()}</div>` : ''}
        </div>
        <div class="p-4">
          ${p.brand ? `<p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${p.brand}</p>` : ''}
          <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">${p.name || 'Unknown Product'}</h3>
          <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span><i class="fa-solid fa-fire mr-1"></i>${cal !== '—' ? `${Number(cal).toFixed(0)} kcal/100g` : '—'}</span>
          </div>
          <div class="grid grid-cols-4 gap-1 text-center mb-3">
            <div class="bg-emerald-50 rounded p-1.5">
              <p class="text-xs font-bold text-emerald-700">${protein !== '—' ? Number(protein).toFixed(1) + 'g' : '—'}</p>
              <p class="text-[10px] text-gray-500">Protein</p>
            </div>
            <div class="bg-blue-50 rounded p-1.5">
              <p class="text-xs font-bold text-blue-700">${carbs !== '—' ? Number(carbs).toFixed(1) + 'g' : '—'}</p>
              <p class="text-[10px] text-gray-500">Carbs</p>
            </div>
            <div class="bg-purple-50 rounded p-1.5">
              <p class="text-xs font-bold text-purple-700">${fat !== '—' ? Number(fat).toFixed(1) + 'g' : '—'}</p>
              <p class="text-[10px] text-gray-500">Fat</p>
            </div>
            <div class="bg-orange-50 rounded p-1.5">
              <p class="text-xs font-bold text-orange-700">${sugar !== '—' ? Number(sugar).toFixed(1) + 'g' : '—'}</p>
              <p class="text-[10px] text-gray-500">Sugar</p>
            </div>
          </div>
          <button class="add-to-log-btn w-full py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all"
            data-product='${JSON.stringify({ barcode: p.barcode, name: p.name, brand: p.brand, nutrients: p.nutrients, image: p.image })}'>
            <i class="fa-solid fa-plus mr-1"></i> Add to Food Log
          </button>
        </div>
      </div>`;
  }


  static DAILY_GOALS = { calories: 2000, protein: 50, carbs: 250, fat: 65 };

  static renderFoodLogDate() {
    const el = document.getElementById('foodlog-date');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  static renderDailyTotals(totals) {
    const goals = UIRenderer.DAILY_GOALS;
    const metrics = [
      { key: 'calories', label: 'Calories', unit: 'kcal', goal: goals.calories, color: 'emerald', containerId: 'fl-calories' },
      { key: 'protein', label: 'Protein', unit: 'g', goal: goals.protein, color: 'blue', containerId: 'fl-protein' },
      { key: 'carbs', label: 'Carbs', unit: 'g', goal: goals.carbs, color: 'amber', containerId: 'fl-carbs' },
      { key: 'fat', label: 'Fat', unit: 'g', goal: goals.fat, color: 'purple', containerId: 'fl-fat' },
    ];

    metrics.forEach(({ key, label, unit, goal, color, containerId }) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const val = Math.round(totals[key] || 0);
      const pct = Math.min(100, Math.round((val / goal) * 100));
      const overGoal = val > goal;
      container.querySelector('.fl-label').textContent = label;
      container.querySelector('.fl-values').textContent = `${val} / ${goal} ${unit}`;
      const bar = container.querySelector('.fl-bar');
      if (bar) {
        bar.style.width = pct + '%';
        bar.className = `fl-bar h-2.5 rounded-full transition-all duration-500 ${overGoal ? 'bg-red-500' : `bg-${color}-500`}`;
      }
    });
  }

  static renderLoggedItems(entries, onRemove) {
    const list = document.getElementById('logged-items-list');
    const clearBtn = document.getElementById('clear-foodlog');
    const countLabel = document.querySelector('#foodlog-today-section h4');
    if (!list) return;

    if (countLabel) countLabel.textContent = `Logged Items (${entries.length})`;
    if (clearBtn) clearBtn.style.display = entries.length ? 'inline-flex' : 'none';

    if (!entries.length) {
      list.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
          <p class="font-medium">No meals logged today</p>
          <p class="text-sm">Add meals from the Meals page or scan products</p>
        </div>`;
      return;
    }

    list.innerHTML = entries
      .map(
        (e) => `
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-white transition-colors border border-gray-100" data-log-id="${e.id}">
        ${
          e.thumbnail
            ? `<img src="${e.thumbnail}" alt="${e.name}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                onerror="this.parentElement.innerHTML='<div class=\'w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0\'><i class=\'fa-solid fa-utensils text-gray-400\'></i></div>'">`
            : '<div class="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-utensils text-emerald-500"></i></div>'
        }
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 text-sm truncate">${e.name}</p>
          <div class="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
            <span><i class="fa-solid fa-fire text-orange-400 mr-0.5"></i>${Math.round(e.nutrition.calories || 0)} cal</span>
            <span><i class="fa-solid fa-dna text-emerald-400 mr-0.5"></i>${Number(e.nutrition.protein || 0).toFixed(1)}g protein</span>
            <span><i class="fa-solid fa-wheat-awn text-blue-400 mr-0.5"></i>${Number(e.nutrition.carbs || 0).toFixed(1)}g carbs</span>
            <span><i class="fa-solid fa-droplet text-purple-400 mr-0.5"></i>${Number(e.nutrition.fat || 0).toFixed(1)}g fat</span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-xs px-2 py-1 rounded-full font-medium ${e.type === 'meal' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${e.type === 'meal' ? 'Meal' : 'Product'}</span>
          <button class="remove-log-entry text-gray-400 hover:text-red-500 transition-colors p-1" data-id="${e.id}" title="Remove">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      </div>`
      )
      .join('');

    // attach remove handlers
    list.querySelectorAll('.remove-log-entry').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(btn.dataset.id);
      });
    });
  }


  static renderWeeklyChart(weeklyData) {
    const el = document.getElementById('weekly-chart');
    if (!el || typeof Plotly === 'undefined') return;

    const labels = weeklyData.map((d) => {
      const [, , day] = d.date.split('-');
      return new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    });

    const trace = {
      x: labels,
      y: weeklyData.map((d) => Math.round(d.calories)),
      type: 'bar',
      marker: {
        color: weeklyData.map((_, i) =>
          i === weeklyData.length - 1 ? '#059669' : '#6ee7b7'
        ),
        borderRadius: 6,
      },
      hovertemplate: '<b>%{x}</b><br>%{y} kcal<extra></extra>',
    };

    const layout = {
      margin: { t: 10, r: 10, b: 40, l: 40 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'Inter, sans-serif', size: 12, color: '#6b7280' },
      yaxis: { gridcolor: '#f3f4f6', zeroline: false },
      xaxis: { tickfont: { size: 11 } },
      showlegend: false,
    };

    // Nothing logged this week: show the placeholder instead of an empty chart.
    if (weeklyData.every((d) => !d.calories)) {
      try { Plotly.purge(el); } catch (e) { /* not plotted yet */ }
      el.className = 'h-64 bg-gray-50 rounded-xl flex items-center justify-center';
      el.removeAttribute('style');
      el.innerHTML = '<div class="text-center text-gray-400"><i class="fa-solid fa-chart-line text-4xl mb-2"></i><p>Nothing logged yet. Log a meal to see your week.</p></div>';
      return;
    }

    // Remove the static placeholder and the flex centering so the chart fills the panel.
    el.innerHTML = '';
    el.classList.remove('flex', 'items-center', 'justify-center', 'h-64');
    el.style.height = '256px';
    el.style.width = '100%';
    el.style.overflow = 'hidden';
    layout.autosize = true;
    layout.height = 256;

    Plotly.newPlot(el, [trace], layout, { responsive: true, displayModeBar: false }).then(() => {
      requestAnimationFrame(() => Plotly.Plots.resize(el));
    });
  }

 
  static setPageTitle(title, subtitle) {
    const h1 = document.querySelector('#header h1');
    const p = document.querySelector('#header p');
    if (h1) h1.textContent = title;
    if (p) p.textContent = subtitle || '';
  }


  static renderFilterChips(container, items, activeValue, onSelect) {
    container.innerHTML = `
      <button class="filter-chip px-4 py-2 ${!activeValue ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-full font-medium text-sm whitespace-nowrap transition-all" data-value="">
        All Recipes
      </button>
      ${items
        .map(
          (item) => {
            const val = item.name || item;
            const active = activeValue === val;
            return `<button class="filter-chip px-4 py-2 ${active ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-full font-medium text-sm whitespace-nowrap transition-all" data-value="${val}">${val}</button>`;
          }
        )
        .join('')}`;

    container.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => onSelect(btn.dataset.value));
    });
  }

  
  static setActiveNav(page) {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.remove('bg-emerald-50', 'text-emerald-700');
      link.classList.add('text-gray-600');
      link.querySelector('span')?.classList.remove('font-semibold');
      link.querySelector('span')?.classList.add('font-medium');
    });
    const active = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (active) {
      active.classList.add('bg-emerald-50', 'text-emerald-700');
      active.classList.remove('text-gray-600');
      active.querySelector('span')?.classList.add('font-semibold');
      active.querySelector('span')?.classList.remove('font-medium');
    }
  }

  
  static toast(msg, type = 'success') {
    const colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-amber-500',
    };
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      info: 'fa-circle-info',
      warning: 'fa-triangle-exclamation',
    };

    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 ${colors[type] || colors.info} text-white rounded-xl shadow-lg text-sm font-medium transition-all duration-300 translate-y-2 opacity-0`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i>${msg}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  
  static initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const openBtn = document.getElementById('header-menu-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');

    const open = () => {
      sidebar?.classList.add('sidebar-open');
      overlay?.classList.add('active');
    };
    const close = () => {
      sidebar?.classList.remove('sidebar-open');
      overlay?.classList.remove('active');
    };

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
  }
}
