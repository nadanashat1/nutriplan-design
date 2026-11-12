import { ApiService } from './ApiService.js';

// USDA's public demo key (documented at api.data.gov, rate-limited, not a secret).
const USDA_API_KEY = 'DEMO_KEY';


export class NutritionService {
  /**
   * @param {string} recipeName
   * @param {string[]} ingredients  - array of strings like "2 tbsp Soy Sauce"
   * @returns {Promise<object>}
   */
  static async analyze(recipeName, ingredients) {
    const data = await ApiService.post(
      '/nutrition/analyze',
      { recipeName, ingredients },
      { 'x-api-key': USDA_API_KEY }
    );
    return data;
  }
}
