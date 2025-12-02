import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../../services/productService';

vi.mock('../../config/api', () => ({
  apiCall: vi.fn(),
  API_URL: 'http://localhost:8000/api',
}));

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches all products', async () => {
      const { apiCall } = await import('../../config/api');
      const mockProducts = [
        { id: '1', name: 'مج', isVip: false },
        { id: '2', name: 'قلم VIP', isVip: true },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockProducts);

      const result = await ProductService.getAll();

      expect(result).toEqual(mockProducts);
    });

    it('returns empty array on error', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Error'));

      const result = await ProductService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('add', () => {
    it('adds new product', async () => {
      const { apiCall } = await import('../../config/api');
      const newProduct = { id: '1', name: 'منتج جديد', isVip: false };

      vi.mocked(apiCall).mockResolvedValueOnce(newProduct);

      const result = await ProductService.add('منتج جديد', false);

      expect(result).toEqual(newProduct);
      expect(apiCall).toHaveBeenCalledWith('/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'منتج جديد', isVip: false }),
      });
    });
  });

  describe('update', () => {
    it('updates product', async () => {
      const { apiCall } = await import('../../config/api');
      const product = { id: '1', name: 'محدث', isVip: true };

      vi.mocked(apiCall).mockResolvedValueOnce(product);

      const result = await ProductService.update(product);

      expect(result).toEqual(product);
    });
  });

  describe('delete', () => {
    it('deletes product', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockResolvedValueOnce({});

      await ProductService.delete('1');

      expect(apiCall).toHaveBeenCalledWith('/products/1', {
        method: 'DELETE',
      });
    });
  });

  describe('getRegular', () => {
    it('returns only non-VIP products', async () => {
      const { apiCall } = await import('../../config/api');
      const mockProducts = [
        { id: '1', name: 'مج', isVip: false },
        { id: '2', name: 'قلم VIP', isVip: true },
        { id: '3', name: 'نوت', isVip: false },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockProducts);

      const result = await ProductService.getRegular();

      expect(result).toHaveLength(2);
      expect(result.every(p => !p.isVip)).toBe(true);
    });
  });

  describe('getVip', () => {
    it('returns only VIP products', async () => {
      const { apiCall } = await import('../../config/api');
      const mockProducts = [
        { id: '1', name: 'مج', isVip: false },
        { id: '2', name: 'قلم VIP', isVip: true },
        { id: '3', name: 'باور بنك', isVip: true },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockProducts);

      const result = await ProductService.getVip();

      expect(result).toHaveLength(2);
      expect(result.every(p => p.isVip)).toBe(true);
    });
  });

  describe('searchByName', () => {
    it('searches products by name', async () => {
      const { apiCall } = await import('../../config/api');
      const mockProducts = [
        { id: '1', name: 'مج بورسلين', isVip: false },
        { id: '2', name: 'قلم معدن', isVip: false },
        { id: '3', name: 'مج VIP', isVip: true },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockProducts);

      const result = await ProductService.searchByName('مج');

      expect(result).toHaveLength(2);
      expect(result.every(p => p.name.includes('مج'))).toBe(true);
    });
  });

  describe('isNameExists', () => {
    it('checks if product name exists', async () => {
      const { apiCall } = await import('../../config/api');
      const mockProducts = [
        { id: '1', name: 'مج', isVip: false },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockProducts);

      const exists = await ProductService.isNameExists('مج');

      expect(exists).toBe(true);
    });

    it('excludes specific id when checking', async () => {
      const { apiCall } = await import('../../config/api');
      const mockProducts = [
        { id: '1', name: 'مج', isVip: false },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockProducts);

      const exists = await ProductService.isNameExists('مج', '1');

      expect(exists).toBe(false);
    });
  });
});
