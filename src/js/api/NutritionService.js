// Nutrition estimates come from this project's own serverless function
// (/api/nutrition), which calls the official USDA FoodData Central API.
// The USDA key lives only in a server-side environment variable.

export class NutritionService {
  /**
   * @param {string} recipeName
   * @param {string[]} ingredients  - array of strings like "2 tbsp Soy Sauce"
   * @returns {Promise<object>} { servings, totals, perServing, matched, considered }
   */
  static async analyze(recipeName, ingredients) {
    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeName, ingredients }),
    });
    if (!res.ok) {
      const err = new Error(`Nutrition request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    const body = await res.json();
    if (!body.success || !body.data) {
      const err = new Error('Nutrition data unavailable');
      err.status = 502;
      throw err;
    }
    return body.data;
  }
}
