

import { MealService } from './api/MealService.js';
import { ProductService } from './api/ProductService.js';
import { NutritionService } from './api/NutritionService.js';
import { FoodLog } from './state/FoodLog.js';
import { UIRenderer } from './ui/UIRenderer.js';
import { Router } from './Router.js';


class App {
  constructor() {
    // State
    this.currentMealId = null;
    this.allMeals = [];
    this.currentFilter = { type: null, value: null }; // type: 'category'|'area'|null
    this.searchDebounce = null;
    this.listView = false;
    this.cachedCategories = null;
    this.cachedAreas = null;
    this.activeProductFilter = '';
    this.allProducts = [];
    this._categoriesPromise = null;
    this._mealRequestId = 0;
    this._lastSearchQuery = null;

    // Router
    this.router = new Router([
      { path: '/', handler: () => this._showPage('meals') },
      { path: /^\/meal\/(.+)$/, handler: (m) => this._showPage('meal-detail', m[1]) },
      { path: '/scanner', handler: () => this._showPage('scanner') },
      { path: '/foodlog', handler: () => this._showPage('foodlog') },
    ]);
  }

  async init() {
    UIRenderer.initSidebar();
    this._bindNav();
    this._bindQuickLogButtons();
    this.router.start();
  }


  _bindNav() {
    const navMeals = document.querySelector('.nav-link[data-page="meals"]');
    const navScanner = document.querySelector('.nav-link[data-page="scanner"]');
    const navFoodlog = document.querySelector('.nav-link[data-page="foodlog"]');

    navMeals?.addEventListener('click', (e) => { e.preventDefault(); this.router.navigate('/'); });
    navScanner?.addEventListener('click', (e) => { e.preventDefault(); this.router.navigate('/scanner'); });
    navFoodlog?.addEventListener('click', (e) => { e.preventDefault(); this.router.navigate('/foodlog'); });

    document.getElementById('back-to-meals-btn')?.addEventListener('click', () => {
      this.router.navigate('/');
    });
  }

  _bindQuickLogButtons() {
    document.querySelectorAll('.quick-log-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        if (i === 0) this.router.navigate('/');
        else if (i === 1) this.router.navigate('/scanner');
      });
    });
  }


  _showPage(page, param = null) {
    // Hide all main sections
    const sections = [
      'search-filters-section',
      'meal-categories-section',
      'all-recipes-section',
      'meal-details',
      'products-section',
      'foodlog-section',
    ];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    UIRenderer.setActiveNav(page);

    if (page === 'meals') {
      UIRenderer.setPageTitle('Meals & Recipes', 'Discover delicious and nutritious recipes tailored for you');
      ['search-filters-section', 'meal-categories-section', 'all-recipes-section'].forEach(
        (id) => { const el = document.getElementById(id); if (el) el.style.display = ''; }
      );
      this._initMealsPage();
    } else if (page === 'meal-detail') {
      UIRenderer.setPageTitle('Meal Details', 'Full recipe, ingredients & nutrition');
      const mealDetailsEl = document.getElementById('meal-details');
      if (mealDetailsEl) mealDetailsEl.style.display = '';
      this._loadMealDetail(param);
    } else if (page === 'scanner') {
      UIRenderer.setPageTitle('Product Scanner', 'Search products by name or barcode');
      const el = document.getElementById('products-section');
      if (el) el.style.display = '';
      this._initScannerPage();
    } else if (page === 'foodlog') {
      UIRenderer.setPageTitle('Daily Food Log', 'Track and monitor your daily nutrition intake');
      const el = document.getElementById('foodlog-section');
      if (el) el.style.display = '';
      this._initFoodLogPage();
    }

    // Close sidebar on mobile
    document.getElementById('sidebar')?.classList.remove('sidebar-open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    window.scrollTo(0, 0);
  }


  async _initMealsPage() {
    // Only load categories once (or wait for in-flight request)
    if (!this.cachedCategories) {
      await this._loadCategories();
    }

    // Bind search (only once)
    if (!this._searchBound) {
      this._bindSearch();
      this._bindViewToggle();
      this._searchBound = true;
    }

    // Load meals only if we haven't yet (or after filter)
    if (!this.allMeals.length) {
      await this._loadMeals();
    } else {
      // Re-render existing data
      const grid = document.getElementById('recipes-grid');
      if (grid) {
        this.listView
          ? UIRenderer.renderMealList(grid, this.allMeals)
          : UIRenderer.renderMealCards(grid, this.allMeals);
        this._bindMealCardClicks();
      }
    }
  }

  async _loadCategories() {
    const catGrid = document.getElementById('categories-grid');
    const filterChipsContainer = document.querySelector('#search-filters-section .flex.items-center.gap-3');
    if (!catGrid) return;

    if (this.cachedCategories && this.cachedAreas) {
      return;
    }

    if (this._categoriesPromise) {
      return this._categoriesPromise;
    }

    this._categoriesPromise = (async () => {
      try {
        const [cats, areas] = await Promise.all([
          MealService.getCategories(),
          MealService.getAreas(),
        ]);

        this.cachedCategories = cats;
        this.cachedAreas = areas;

        UIRenderer.renderCategories(catGrid, cats);

        // bind category card clicks
        catGrid.querySelectorAll('.category-card').forEach((card) => {
          card.addEventListener('click', () => {
            this._applyFilter('category', card.dataset.category);
          });
        });

        // Render filter chips (all areas + "All Recipes")
        if (filterChipsContainer) {
          UIRenderer.renderFilterChips(
            filterChipsContainer,
            areas,
            this.currentFilter.type === 'area' ? this.currentFilter.value : '',
            (value) => {
              if (!value) {
                this._clearFilter();
              } else {
                this._applyFilter('area', value);
              }
            }
          );
        }
      } catch (err) {
        console.error('Failed to load categories/areas:', err);
      } finally {
        this._categoriesPromise = null;
      }
    })();

    return this._categoriesPromise;
  }

  async _loadMeals(filters = {}) {
    const grid = document.getElementById('recipes-grid');
    const countEl = document.getElementById('recipes-count');
    if (!grid) return;

    const requestId = ++this._mealRequestId;
    UIRenderer.showLoading(grid, 'Loading recipes...');

    try {
      const meals = await MealService.getMeals(filters, 25);
      if (requestId !== this._mealRequestId) return;

      this.allMeals = meals;

      if (countEl) countEl.textContent = `Showing ${meals.length} recipe${meals.length !== 1 ? 's' : ''}`;

      if (!meals || meals.length === 0) {
        UIRenderer.showEmpty(grid, 'No recipes found.', 'Try selecting a different filter or search term.');
        return;
      }

      this.listView
        ? UIRenderer.renderMealList(grid, meals)
        : UIRenderer.renderMealCards(grid, meals);

      this._bindMealCardClicks();
    } catch (err) {
      if (requestId !== this._mealRequestId) return;
      console.error('Failed to load meals:', err);
      if (countEl) countEl.textContent = 'Showing 0 recipes';
      let msg = err.message || 'Please try again.';
      if (err.status === 429) {
        msg = 'Too many requests. Please wait a moment and try again.';
      }
      UIRenderer.showError(grid, `Failed to load recipes. ${msg}`);
    }
  }

  _bindMealCardClicks() {
    document.querySelectorAll('.recipe-card[data-meal-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.mealId;
        this.router.navigate(`/meal/${id}`);
      });
    });
  }

  _applyFilter(type, value) {
    if (this.currentFilter.type === type && this.currentFilter.value === value) {
      return;
    }
    this.currentFilter = { type, value };
    this.allMeals = [];
    this._lastSearchQuery = null;

    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value) {
      searchInput.value = '';
    }

    // Highlight active category card
    document.querySelectorAll('.category-card').forEach((c) => {
      c.classList.toggle('border-emerald-400', c.dataset.category === value && type === 'category');
      c.classList.toggle('shadow-md', c.dataset.category === value && type === 'category');
    });

    // Update area filter chips
    const filterChipsContainer = document.querySelector('#search-filters-section .flex.items-center.gap-3');
    if (filterChipsContainer && this.cachedAreas) {
      UIRenderer.renderFilterChips(
        filterChipsContainer,
        this.cachedAreas,
        type === 'area' ? value : '',
        (v) => { if (!v) this._clearFilter(); else this._applyFilter('area', v); }
      );
    }

    this._loadMeals({ [type]: value });
  }

  _clearFilter() {
    const searchInput = document.getElementById('search-input');
    const hasSearchText = searchInput && searchInput.value.trim() !== '';

    if (this.currentFilter.type === null && this.currentFilter.value === null && !hasSearchText && this._lastSearchQuery === null) {
      return;
    }

    this.currentFilter = { type: null, value: null };
    this.allMeals = [];
    this._lastSearchQuery = null;

    if (searchInput) {
      searchInput.value = '';
    }

    document.querySelectorAll('.category-card').forEach((c) => {
      c.classList.remove('border-emerald-400', 'shadow-md');
    });

    const filterChipsContainer = document.querySelector('#search-filters-section .flex.items-center.gap-3');
    if (filterChipsContainer && this.cachedAreas) {
      UIRenderer.renderFilterChips(
        filterChipsContainer,
        this.cachedAreas,
        '',
        (v) => { if (!v) this._clearFilter(); else this._applyFilter('area', v); }
      );
    }

    this._loadMeals();
  }

  _bindSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    input.addEventListener('input', () => {
      clearTimeout(this.searchDebounce);
      const q = input.value.trim();
      if (!q) {
        this._clearFilter();
        return;
      }
      this.searchDebounce = setTimeout(() => this._searchMeals(q), 400);
    });
  }

  async _searchMeals(q) {
    if (this._lastSearchQuery === q) {
      return;
    }
    this._lastSearchQuery = q;

    // Reset current category/area filter UI state
    this.currentFilter = { type: null, value: null };
    document.querySelectorAll('.category-card').forEach((c) => {
      c.classList.remove('border-emerald-400', 'shadow-md');
    });
    const filterChipsContainer = document.querySelector('#search-filters-section .flex.items-center.gap-3');
    if (filterChipsContainer && this.cachedAreas) {
      UIRenderer.renderFilterChips(
        filterChipsContainer,
        this.cachedAreas,
        '',
        (v) => { if (!v) this._clearFilter(); else this._applyFilter('area', v); }
      );
    }

    const grid = document.getElementById('recipes-grid');
    const countEl = document.getElementById('recipes-count');
    if (!grid) return;

    const requestId = ++this._mealRequestId;
    UIRenderer.showLoading(grid, `Searching for "${q}"...`);

    try {
      const meals = await MealService.searchMeals(q);
      if (requestId !== this._mealRequestId) return;

      this.allMeals = meals;
      if (countEl) countEl.textContent = `Found ${meals.length} result${meals.length !== 1 ? 's' : ''}`;

      if (!meals || meals.length === 0) {
        UIRenderer.showEmpty(grid, `No results found for "${q}".`, 'Try a different search term.');
        return;
      }

      this.listView
        ? UIRenderer.renderMealList(grid, meals)
        : UIRenderer.renderMealCards(grid, meals);
      this._bindMealCardClicks();
    } catch (err) {
      if (requestId !== this._mealRequestId) return;
      let msg = err.message || 'Please try again.';
      if (err.status === 429) msg = 'Too many requests. Please wait a moment and try again.';
      UIRenderer.showError(grid, `Search failed. ${msg}`);
    }
  }

  _bindViewToggle() {
    const gridBtn = document.getElementById('grid-view-btn');
    const listBtn = document.getElementById('list-view-btn');
    const recipeGrid = document.getElementById('recipes-grid');

    gridBtn?.addEventListener('click', () => {
      this.listView = false;
      gridBtn.classList.add('bg-white', 'shadow-sm');
      listBtn.classList.remove('bg-white', 'shadow-sm');
      if (recipeGrid) recipeGrid.className = 'grid grid-cols-4 gap-5';
      if (this.allMeals.length) {
        UIRenderer.renderMealCards(recipeGrid, this.allMeals);
        this._bindMealCardClicks();
      }
    });

    listBtn?.addEventListener('click', () => {
      this.listView = true;
      listBtn.classList.add('bg-white', 'shadow-sm');
      gridBtn.classList.remove('bg-white', 'shadow-sm');
      if (recipeGrid) recipeGrid.className = 'flex flex-col gap-3';
      if (this.allMeals.length) {
        UIRenderer.renderMealList(recipeGrid, this.allMeals);
        this._bindMealCardClicks();
      }
    });
  }

  async _loadMealDetail(mealId) {
    this.currentMealId = mealId;

    // Show loading state in hero
    const mealSection = document.getElementById('meal-details');
    const heroImg = mealSection?.querySelector('img');
    if (heroImg) {
      heroImg.src = '';
      heroImg.alt = 'Loading...';
    }

    const nutritionContainer = document.getElementById('nutrition-facts-container');
    if (nutritionContainer) UIRenderer.renderNutritionLoading(nutritionContainer);

    try {
      const meal = await MealService.getMealById(mealId);
      if (!meal) throw new Error('Meal not found');

      UIRenderer.renderMealDetail(mealSection, meal);
      document.title = `${meal.name} — NutriPlan`;

      // Bind Log Meal button
      const logBtn = document.getElementById('log-meal-btn');
      if (logBtn) {
        // Remove old listener
        const newBtn = logBtn.cloneNode(true);
        logBtn.parentNode.replaceChild(newBtn, logBtn);
        newBtn.addEventListener('click', () => this._logMeal(meal));
      }

      // Nutrition analysis (async, non-blocking)
      this._analyzeNutrition(meal, nutritionContainer);
    } catch (err) {
      UIRenderer.showError(
        mealSection || document.getElementById('all-recipes-section'),
        `Failed to load meal details. ${err.message}`
      );
    }
  }

  async _analyzeNutrition(meal, container) {
    if (!meal.ingredients?.length) {
      UIRenderer.renderNutritionError(container, 'No ingredients available for analysis.');
      return;
    }

    this._currentNutrition = null; // never reuse a previous meal's nutrition
    UIRenderer.renderNutritionLoading(container);

    try {
      const ingredientStrings = meal.ingredients.map(
        (ing) => `${ing.measure || ''} ${ing.ingredient || ''}`.trim()
      );

      const result = await NutritionService.analyze(meal.name, ingredientStrings);

      // The service can answer 200 with every value at 0 when the food-data
      // lookup was rate limited or nothing matched. Treat that as unavailable
      // instead of showing 0 calories as if it were real data.
      const per = result.perServing || {};
      const tot = result.totals || result.total || {};
      const hasData = [per.calories, tot.calories, per.protein, tot.protein, per.carbs, tot.carbs]
        .some((v) => Number(v) > 0);
      if (!hasData) {
        UIRenderer.renderNutritionError(container, 'Nutrition data is unavailable right now. Please try again later.');
        const heroCal = document.getElementById('hero-calories'); if (heroCal) heroCal.textContent = 'Calories unavailable';
        this._currentNutrition = null;
        return;
      }

      UIRenderer.renderNutritionFacts(container, result, result.servings);
      if (result.considered) {
        const note = document.createElement('p');
        note.className = 'text-xs text-gray-400 mt-4';
        note.textContent = `Estimate from USDA FoodData Central, based on ${result.matched} of ${result.considered} ingredients (servings assumed).`;
        container.appendChild(note);
      }

      // Store nutrition with current meal for logging
      this._currentNutrition = result;
    } catch (err) {
      let msg = 'Nutrition analysis failed.';
      if (err.status === 401) msg = 'Nutrition API key missing.';
      else if (err.status === 403) msg = 'Nutrition API key invalid.';
      else if (err.status === 400 || err.status === 422) msg = 'Could not estimate nutrition for this recipe.';
      else if (err.status === 429 || err.status >= 500) msg = 'Nutrition data is unavailable right now. Please try again later.';
      UIRenderer.renderNutritionError(container, msg);
      const heroCal = document.getElementById('hero-calories'); if (heroCal) heroCal.textContent = 'Calories unavailable';
      this._currentNutrition = null;
    }
  }

  _logMeal(meal) {
    // Never log a meal with made-up zero values: if nutrition is not available
    // (still loading, failed, or rate limited), do not add it to the log.
    if (!this._currentNutrition) {
      UIRenderer.toast('Nutrition data is not available for this meal right now, so it was not added to your Food Log.', 'warning');
      return;
    }
    const nutrition = this._extractNutritionForLog(this._currentNutrition);
    FoodLog.addEntry({
      type: 'meal',
      name: meal.name,
      thumbnail: meal.thumbnail,
      nutrition,
    });

    this._refreshFoodLogBadge();
    UIRenderer.toast(`"${meal.name}" added to Food Log!`, 'success');
  }

  _extractNutritionForLog(nutritionResult) {
    if (!nutritionResult) return {};
    const src = nutritionResult.perServing || nutritionResult.total || {};
    return {
      calories: src.calories || 0,
      protein: src.protein || 0,
      carbs: src.carbs || 0,
      fat: src.fat || 0,
      fiber: src.fiber || 0,
      sugar: src.sugar || 0,
      saturatedFat: src.saturatedFat || 0,
      cholesterol: src.cholesterol || 0,
      sodium: src.sodium || 0,
    };
  }

  _refreshFoodLogBadge() {
    // Optionally add a badge to the nav link – lightweight
    const totals = FoodLog.getDailyTotals();
    const navFoodlog = document.querySelector('.nav-link[data-page="foodlog"] span');
    if (navFoodlog) {
      const entries = FoodLog.getEntries();
      if (entries.length > 0) navFoodlog.dataset.badge = entries.length;
    }
  }

  _initScannerPage() {
    if (!this._scannerBound) {
      this._bindScannerEvents();
      this._loadProductCategories();
      this._scannerBound = true;
    }
  }

  _bindScannerEvents() {
    const searchBtn = document.getElementById('search-product-btn');
    const searchInput = document.getElementById('product-search-input');
    const barcodeBtn = document.getElementById('lookup-barcode-btn');
    const barcodeInput = document.getElementById('barcode-input');

    searchBtn?.addEventListener('click', () => {
      const q = searchInput?.value.trim();
      if (q) this._searchProducts(q);
    });

    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) this._searchProducts(q);
      }
    });

    barcodeBtn?.addEventListener('click', () => {
      const code = barcodeInput?.value.trim();
      if (!code) {
        UIRenderer.toast('Please enter a barcode number.', 'warning');
        return;
      }
      this._lookupBarcode(code);
    });

    barcodeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const code = barcodeInput.value.trim();
        if (code) this._lookupBarcode(code);
      }
    });

    // Nutri-Score filter
    document.querySelectorAll('.nutri-score-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeProductFilter = btn.dataset.grade;
        document.querySelectorAll('.nutri-score-filter').forEach((b) => {
          b.classList.toggle('bg-emerald-600', !b.dataset.grade && !this.activeProductFilter);
          b.classList.remove('bg-white', 'text-emerald-700', 'ring-2', 'ring-emerald-600');
        });
        btn.classList.add('ring-2', 'ring-emerald-600');
        this._filterAndRenderProducts();
      });
    });
  }

  async _loadProductCategories() {
    const catContainer = document.getElementById('product-categories');
    if (!catContainer) return;

    try {
      const cats = await ProductService.getCategories();
      if (!cats.length) return;

      const catIcons = {
        snacks: 'fa-cookie',
        beverages: 'fa-glass-water',
        breakfast: 'fa-bread-slice',
        desserts: 'fa-ice-cream',
        dairy: 'fa-cheese',
        cereals: 'fa-wheat-awn',
        chocolates: 'fa-candy-bar',
        sauces: 'fa-droplet',
        baby: 'fa-baby',
        organic: 'fa-leaf',
      };

      const catColors = [
        'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
        'bg-blue-100 text-blue-700 hover:bg-blue-200',
        'bg-amber-100 text-amber-700 hover:bg-amber-200',
        'bg-purple-100 text-purple-700 hover:bg-purple-200',
        'bg-rose-100 text-rose-700 hover:bg-rose-200',
        'bg-teal-100 text-teal-700 hover:bg-teal-200',
        'bg-orange-100 text-orange-700 hover:bg-orange-200',
        'bg-lime-100 text-lime-700 hover:bg-lime-200',
      ];

      catContainer.innerHTML = cats
        .slice(0, 8)
        .map((cat, i) => {
          const name = cat.name || cat;
          const slug = name.toLowerCase().replace(/\s+/g, '-');
          const icon = catIcons[slug] || catIcons[name.toLowerCase()] || 'fa-tag';
          const colorClass = catColors[i % catColors.length];
          return `<button class="product-category-btn px-4 py-2 ${colorClass} rounded-lg text-sm font-medium whitespace-nowrap transition-all" data-category="${name}">
            <i class="fa-solid ${icon} mr-1.5"></i>${name}
          </button>`;
        })
        .join('');

      catContainer.querySelectorAll('.product-category-btn').forEach((btn) => {
        btn.addEventListener('click', () => this._searchProductsByCategory(btn.dataset.category));
      });
    } catch {
      // Non-critical, skip
    }
  }

  async _searchProducts(query) {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('products-count');
    if (!grid) return;

    UIRenderer.showLoading(grid, `Searching for "${query}"...`);

    try {
      const products = await ProductService.searchByName(query);
      this.allProducts = products;
      if (countEl) countEl.textContent = `Found ${products.length} product${products.length !== 1 ? 's' : ''}`;
      this._filterAndRenderProducts();
      this._bindAddToLogButtons();
    } catch (err) {
      UIRenderer.showError(grid, 'Product search failed. Please try again.');
    }
  }

  async _lookupBarcode(code) {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('products-count');
    if (!grid) return;

    UIRenderer.showLoading(grid, `Looking up barcode ${code}...`);

    try {
      const product = await ProductService.searchByBarcode(code);
      if (!product || (!product.name && !product.barcode)) {
        UIRenderer.showEmpty(grid, 'Product not found.', 'Check the barcode and try again.');
        if (countEl) countEl.textContent = '0 products found';
        return;
      }
      this.allProducts = [product];
      if (countEl) countEl.textContent = '1 product found';
      this._filterAndRenderProducts();
      this._bindAddToLogButtons();
    } catch (err) {
      if (err.status === 404) {
        UIRenderer.showEmpty(grid, 'Product not found.', 'This barcode is not in our database.');
      } else {
        UIRenderer.showError(grid, 'Barcode lookup failed. Please try again.');
      }
    }
  }

  async _searchProductsByCategory(category) {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('products-count');
    if (!grid) return;

    UIRenderer.showLoading(grid, `Loading ${category}...`);

    try {
      const products = await ProductService.getByCategory(category);
      this.allProducts = products;
      if (countEl) countEl.textContent = `${products.length} product${products.length !== 1 ? 's' : ''} in ${category}`;
      this._filterAndRenderProducts();
      this._bindAddToLogButtons();
    } catch {
      UIRenderer.showError(grid, 'Failed to load products. Please try again.');
    }
  }

  _filterAndRenderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let filtered = this.allProducts;
    if (this.activeProductFilter) {
      filtered = filtered.filter(
        (p) => (p.nutritionGrade || '').toLowerCase() === this.activeProductFilter
      );
    }
    UIRenderer.renderProductCards(grid, filtered);
    this._bindAddToLogButtons();
  }

  _bindAddToLogButtons() {
    document.querySelectorAll('.add-to-log-btn').forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          const product = JSON.parse(newBtn.dataset.product);
          this._logProduct(product);
        } catch {
          UIRenderer.toast('Failed to add product.', 'error');
        }
      });
    });
  }

  _logProduct(product) {
    const n = product.nutrients || {};
    FoodLog.addEntry({
      type: 'product',
      name: product.name || 'Unknown Product',
      thumbnail: product.image || null,
      nutrition: {
        calories: n.calories || 0,
        protein: n.protein || 0,
        carbs: n.carbs || 0,
        fat: n.fat || 0,
        fiber: n.fiber || 0,
        sugar: n.sugar || 0,
      },
    });

    this._refreshFoodLogBadge();
    UIRenderer.toast(`"${product.name || 'Product'}" added to Food Log!`, 'success');
  }


  _initFoodLogPage() {
    UIRenderer.renderFoodLogDate();
    this._renderFoodLog();
    this._renderWeeklyChart();

    const clearBtn = document.getElementById('clear-foodlog');
    if (clearBtn) {
      const newBtn = clearBtn.cloneNode(true);
      clearBtn.parentNode.replaceChild(newBtn, clearBtn);
      newBtn.addEventListener('click', () => {
        if (confirm('Clear all logged items for today?')) {
          FoodLog.clearToday();
          this._renderFoodLog();
          this._renderWeeklyChart();
          UIRenderer.toast('Food log cleared.', 'info');
        }
      });
    }
  }

  _renderFoodLog() {
    const entries = FoodLog.getEntries();
    const totals = FoodLog.getDailyTotals();
    UIRenderer.renderDailyTotals(totals);
    UIRenderer.renderLoggedItems(entries, (id) => {
      FoodLog.removeEntry(id);
      this._renderFoodLog();
      this._renderWeeklyChart();
    });
  }

  _renderWeeklyChart() {
    const weeklyData = FoodLog.getWeeklyData();
    UIRenderer.renderWeeklyChart(weeklyData);
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  // Set nav data-page attributes (they don't have them in the original HTML)
  const navLinks = document.querySelectorAll('.nav-link');
  const pageMap = ['meals', 'scanner', 'foodlog'];
  navLinks.forEach((link, i) => {
    if (pageMap[i]) link.dataset.page = pageMap[i];
  });

  const app = new App();
  await app.init();

  // Hide initial app loading overlay
  const overlay = document.getElementById('app-loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
  }
});
