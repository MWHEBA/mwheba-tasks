import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusService } from '../../services/statusService';

vi.mock('../../config/api', () => ({
  apiCall: vi.fn(),
  API_URL: 'http://localhost:8000/api',
}));

describe('StatusService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches all statuses', async () => {
      const { apiCall } = await import('../../config/api');
      const mockStatuses = [
        { id: 'Pending', label: 'قيد الانتظار', orderIndex: 0 },
        { id: 'In Design', label: 'جاري التصميم', orderIndex: 1 },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockStatuses);

      const result = await StatusService.getAll();

      expect(result).toEqual(mockStatuses);
    });

    it('returns empty array on error', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Error'));

      const result = await StatusService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns status by id', async () => {
      const { apiCall } = await import('../../config/api');
      const mockStatuses = [
        { id: 'Pending', label: 'قيد الانتظار' },
        { id: 'In Design', label: 'جاري التصميم' },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockStatuses);

      const result = await StatusService.getById('In Design');

      expect(result).toEqual(mockStatuses[1]);
    });
  });

  describe('getDefault', () => {
    it('returns default status', async () => {
      const { apiCall } = await import('../../config/api');
      const mockStatuses = [
        { id: 'Pending', label: 'قيد الانتظار', isDefault: true },
        { id: 'In Design', label: 'جاري التصميم', isDefault: false },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockStatuses);

      const result = await StatusService.getDefault();

      expect(result.isDefault).toBe(true);
    });

    it('returns first status if no default', async () => {
      const { apiCall } = await import('../../config/api');
      const mockStatuses = [
        { id: 'Pending', label: 'قيد الانتظار' },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockStatuses);

      const result = await StatusService.getDefault();

      expect(result).toEqual(mockStatuses[0]);
    });
  });

  describe('add', () => {
    it('adds new status', async () => {
      const { apiCall } = await import('../../config/api');
      const newStatus = {
        id: 'Custom',
        label: 'حالة مخصصة',
        color: 'blue' as const,
        icon: 'fa-star',
        orderIndex: 5,
        isFinished: false,
      };

      vi.mocked(apiCall).mockResolvedValueOnce({});

      await StatusService.add(newStatus);

      expect(apiCall).toHaveBeenCalledWith('/statuses', {
        method: 'POST',
        body: JSON.stringify(newStatus),
      });
    });
  });

  describe('update', () => {
    it('updates status', async () => {
      const { apiCall } = await import('../../config/api');
      const status = {
        id: 'Pending',
        label: 'محدث',
        color: 'green' as const,
        icon: 'fa-check',
        orderIndex: 0,
        isFinished: false,
      };

      vi.mocked(apiCall).mockResolvedValueOnce({});

      await StatusService.update(status);

      expect(apiCall).toHaveBeenCalledWith('/statuses/Pending', {
        method: 'PUT',
        body: JSON.stringify(status),
      });
    });
  });

  describe('delete', () => {
    it('deletes status', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockResolvedValueOnce({});

      await StatusService.delete('Custom');

      expect(apiCall).toHaveBeenCalledWith('/statuses/Custom', {
        method: 'DELETE',
      });
    });
  });

  describe('getThemeStyles', () => {
    it('returns correct theme styles', () => {
      const blueStyles = StatusService.getThemeStyles('blue');
      expect(blueStyles).toContain('bg-blue-50');
      expect(blueStyles).toContain('text-blue-600');

      const redStyles = StatusService.getThemeStyles('red');
      expect(redStyles).toContain('bg-red-50');
    });

    it('returns default slate for unknown theme', () => {
      const styles = StatusService.getThemeStyles('unknown' as any);
      expect(styles).toContain('bg-slate-50');
    });
  });
});
