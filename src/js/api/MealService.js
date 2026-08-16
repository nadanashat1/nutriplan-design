import { ApiService } from './ApiService.js';

export class MealService {
  static async getCategories(opts = {}) {
    const data = await ApiService.get('/meals/categories', opts);
    return data.results || data.categories || [];
  }

  static async getAreas(opts = {}) {
    const data = await ApiService.get('/meals/areas', opts);
    return data.results || data.areas || [];
  }

  /**
   * @param {object} [filters] - { category, area, ingredient }
   * @param {number} [limit=25]
   * @param {object} [opts]
   */
  static async getMeals(filters = {}, limit = 25, opts = {}) {
    const hasFilter = filters && (filters.category || filters.area || filters.ingredient);
    let path;
    if (hasFilter) {
      const params = new URLSearchParams({ limit });
      if (filters.category) params.set('category', filters.category);
      if (filters.area) params.set('area', filters.area);
      if (filters.ingredient) params.set('ingredient', filters.ingredient);
      path = `/meals/filter?${params}`;
    } else {
      path = `/meals/search?q=&limit=${limit}`;
    }
    const data = await ApiService.get(path, opts);
    return data.results || [];
  }

  /**
   * @param {string} query
   * @param {object} [opts]
   */
  static async searchMeals(query, opts = {}) {
    const q = (query || '').trim();
    if (!q) {
      return this.getMeals({}, 25, opts);
    }
    const data = await ApiService.get(`/meals/search?q=${encodeURIComponent(q)}`, opts);
    return data.results || [];
  }

  /**
   * @param {string} id
   * @param {object} [opts]
   */
  static async getMealById(id, opts = {}) {
    const data = await ApiService.get(`/meals/${id}`, opts);
   
    return data.result || (Array.isArray(data.results) ? data.results[0] : null) || data;
  }
}
