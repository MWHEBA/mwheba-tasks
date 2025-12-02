import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from '../../services/taskService';
import { Urgency, ActivityType } from '../../types';

vi.mock('../../config/api', () => ({
  apiCall: vi.fn(),
  API_URL: 'http://localhost:8000/api',
}));

vi.mock('../../services/clientService', () => ({
  ClientService: {
    getById: vi.fn(),
  },
}));

vi.mock('../../services/statusService', () => ({
  StatusService: {
    getDefault: vi.fn(),
    getAll: vi.fn(),
  },
}));

describe('TaskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches all tasks and sorts by orderIndex', async () => {
      const { apiCall } = await import('../../config/api');
      const mockTasks = [
        { id: '1', title: 'Task 1', orderIndex: 2 },
        { id: '2', title: 'Task 2', orderIndex: 0 },
        { id: '3', title: 'Task 3', orderIndex: 1 },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockTasks);

      const result = await TaskService.getAll();

      expect(result).toHaveLength(3);
      expect(result[0].orderIndex).toBe(0);
      expect(result[2].orderIndex).toBe(2);
    });

    it('handles paginated response', async () => {
      const { apiCall } = await import('../../config/api');
      
      vi.mocked(apiCall)
        .mockResolvedValueOnce({
          results: [{ id: '1', orderIndex: 0 }],
          next: 'http://localhost:8000/api/tasks?page=2',
        })
        .mockResolvedValueOnce({
          results: [{ id: '2', orderIndex: 1 }],
          next: null,
        });

      const result = await TaskService.getAll();

      expect(result).toHaveLength(2);
      expect(apiCall).toHaveBeenCalledTimes(2);
    });

    it('returns empty array on error', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Network error'));

      const result = await TaskService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns task by id', async () => {
      const { apiCall } = await import('../../config/api');
      const mockTasks = [
        { id: '1', title: 'Task 1', orderIndex: 0 },
        { id: '2', title: 'Task 2', orderIndex: 1 },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockTasks);

      const result = await TaskService.getById('2');

      expect(result).toEqual(mockTasks[1]);
    });

    it('returns null if task not found', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockResolvedValueOnce([]);

      const result = await TaskService.getById('999');

      expect(result).toBeNull();
    });
  });

  describe('getMainTasks', () => {
    it('returns only tasks without parentId', async () => {
      const { apiCall } = await import('../../config/api');
      const mockTasks = [
        { id: '1', title: 'Main Task', parentId: null, orderIndex: 0 },
        { id: '2', title: 'Subtask', parentId: '1', orderIndex: 0 },
        { id: '3', title: 'Another Main', parentId: null, orderIndex: 1 },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockTasks);

      const result = await TaskService.getMainTasks();

      expect(result).toHaveLength(2);
      expect(result.every(t => !t.parentId)).toBe(true);
    });
  });

  describe('getSubtasks', () => {
    it('returns subtasks for given parent', async () => {
      const { apiCall } = await import('../../config/api');
      const mockTasks = [
        { id: '1', title: 'Main', parentId: null, orderIndex: 0 },
        { id: '2', title: 'Sub 1', parentId: '1', orderIndex: 1 },
        { id: '3', title: 'Sub 2', parentId: '1', orderIndex: 0 },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockTasks);

      const result = await TaskService.getSubtasks('1');

      expect(result).toHaveLength(2);
      expect(result[0].orderIndex).toBe(0);
      expect(result[1].orderIndex).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('updates task status', async () => {
      const { apiCall } = await import('../../config/api');
      const mockTask = { id: '1', title: 'Task', status: 'pending', orderIndex: 0 };

      vi.mocked(apiCall)
        .mockResolvedValueOnce([mockTask])
        .mockResolvedValueOnce({});

      await TaskService.updateStatus('1', 'completed');

      expect(apiCall).toHaveBeenCalledWith('/tasks/1/update_status', expect.any(Object));
    });
  });

  describe('delete', () => {
    it('deletes task', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockResolvedValueOnce({});

      await TaskService.delete('1');

      expect(apiCall).toHaveBeenCalledWith('/tasks/1', {
        method: 'DELETE',
      });
    });
  });

  describe('calculateProgress', () => {
    it('returns progress data', async () => {
      const { apiCall } = await import('../../config/api');
      const mockProgress = { completed: 3, total: 5, percentage: 60 };

      vi.mocked(apiCall).mockResolvedValueOnce(mockProgress);

      const result = await TaskService.calculateProgress('1');

      expect(result).toEqual(mockProgress);
    });

    it('returns zero progress on error', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Error'));

      const result = await TaskService.calculateProgress('1');

      expect(result).toEqual({ completed: 0, total: 0, percentage: 0 });
    });
  });
});
