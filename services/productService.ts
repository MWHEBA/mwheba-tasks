import { Product } from '../types';
import { apiCall } from '../config/api';

const INITIAL_REGULAR = [
  "نتيجة حائط", "نتيجة مكتب", "بلوك نوت", "مج بورسلين",
  "قلم بلاستيك", "قلم معدن", "كوستر خشب", "كوستر اكريليك",
  "أجندة", "شنطة قماش", "شنطة كرتون", "ماديلية بلاستيك", "ماوس باد"
];

const INITIAL_VIP = [
  "مج VIP", "نوت بوك VIP", "ماديلية VIP", "كراتة VIP",
  "كابل شاحن", "باور بنك", "قلم VIP"
];

export const ProductService = {
  /**
   * جلب جميع الأصناف
   * Fetches all products from the API
   */
  getAll: async (): Promise<Product[]> => {
    try {
      let allProducts: Product[] = [];
      let url = '/products';
      
      // Fetch all pages
      while (url) {
        const response = await apiCall<{ results: Product[]; next: string | null } | Product[]>(url);
        
        if (Array.isArray(response)) {
          allProducts = response;
          break;
        } else {
          allProducts = [...allProducts, ...response.results];
          if (response.next) {
            const match = response.next.match(/\/api\/(.+)/);
            url = match ? `/${match[1].replace(/\/$/, '')}` : '';
          } else {
            url = '';
          }
        }
      }
      
      return allProducts;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      return [];
    }
  },

  /**
   * إضافة صنف جديد
   * Adds a new product
   */
  add: async (name: string, isVip: boolean): Promise<Product> => {
    return await apiCall<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({ name, isVip }),
    });
  },

  /**
   * تحديث صنف
   * Updates an existing product
   */
  update: async (product: Product): Promise<Product> => {
    return await apiCall<Product>(`/products/${product.id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  /**
   * حذف صنف
   * Deletes a product
   */
  delete: async (id: string): Promise<void> => {
    await apiCall(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * تهيئة الأصناف الافتراضية (للاستخدام مرة واحدة)
   * Initializes default products (one-time use)
   */
  initializeDefaults: async (): Promise<void> => {
    const existing = await ProductService.getAll();
    if (existing.length === 0) {
      // Add regular products
      for (const name of INITIAL_REGULAR) {
        await ProductService.add(name, false);
      }
      
      // Add VIP products
      for (const name of INITIAL_VIP) {
        await ProductService.add(name, true);
      }
      
      console.log('✅ Default products initialized');
    }
  },

  /**
   * جلب الأصناف العادية فقط
   * Gets only regular (non-VIP) products
   */
  getRegular: async (): Promise<Product[]> => {
    const products = await ProductService.getAll();
    return products.filter(p => !p.isVip);
  },

  /**
   * جلب الأصناف VIP فقط
   * Gets only VIP products
   */
  getVip: async (): Promise<Product[]> => {
    const products = await ProductService.getAll();
    return products.filter(p => p.isVip);
  },

  /**
   * البحث عن أصناف بالاسم
   * Searches products by name
   */
  searchByName: async (query: string): Promise<Product[]> => {
    const products = await ProductService.getAll();
    const lowerQuery = query.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lowerQuery));
  },

  /**
   * التحقق من وجود اسم صنف
   * Checks if a product name already exists
   */
  isNameExists: async (name: string, excludeId?: string): Promise<boolean> => {
    const products = await ProductService.getAll();
    return products.some(p => 
      p.name.toLowerCase() === name.toLowerCase() && p.id !== excludeId
    );
  },

  /**
   * استيراد عدة أصناف دفعة واحدة
   * Imports multiple products in bulk
   */
  importBulk: async (productsData: { name: string; isVip: boolean }[]): Promise<void> => {
    for (const data of productsData) {
      await ProductService.add(data.name, data.isVip);
    }
  }
};
