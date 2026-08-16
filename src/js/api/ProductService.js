import { ApiService } from './ApiService.js';


export class ProductService {
  /**
   * @param {string} query
   */
  static async searchByName(query) {
    const data = await ApiService.get(`/products/search?q=${encodeURIComponent(query)}`);
    return data.results || [];
  }

  /**
   * @param {string} barcode
   */
  static async searchByBarcode(barcode) {
    const data = await ApiService.get(`/products/barcode/${encodeURIComponent(barcode)}`);
    
    return data.result || data.product || data;
  }

  static async getCategories() {
    const data = await ApiService.get('/products/categories');
    return data.results || data.categories || [];
  }

  /**
   * @param {string} category
   */
  static async getByCategory(category) {
    const data = await ApiService.get(`/products/category/${encodeURIComponent(category)}`);
    return data.results || [];
  }
}
