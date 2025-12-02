import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../services/userService';

vi.mock('../../config/api', () => ({
  apiCall: vi.fn(),
  API_URL: 'http://localhost:8000/api',
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches all users', async () => {
      const { apiCall } = await import('../../config/api');
      const mockUsers = [
        { id: 1, username: 'user1', role: 'designer' },
        { id: 2, username: 'user2', role: 'admin' },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockUsers);

      const result = await UserService.getAll();

      expect(result).toEqual(mockUsers);
    });

    it('returns empty array on error', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Error'));

      const result = await UserService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('fetches user by id', async () => {
      const { apiCall } = await import('../../config/api');
      const mockUser = { id: 1, username: 'testuser', role: 'designer' };

      vi.mocked(apiCall).mockResolvedValueOnce(mockUser);

      const result = await UserService.getById(1);

      expect(result).toEqual(mockUser);
      expect(apiCall).toHaveBeenCalledWith('/users/1');
    });

    it('returns undefined on error', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Not found'));

      const result = await UserService.getById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('creates new user', async () => {
      const { apiCall } = await import('../../config/api');
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
        role: 'designer' as const,
      };

      const createdUser = { id: 1, ...newUser };
      vi.mocked(apiCall).mockResolvedValueOnce(createdUser);

      const result = await UserService.create(newUser);

      expect(result).toEqual(createdUser);
      expect(apiCall).toHaveBeenCalledWith('/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
    });
  });

  describe('update', () => {
    it('updates user data', async () => {
      const { apiCall } = await import('../../config/api');
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
      };

      const updatedUser = { id: 1, username: 'user', ...updateData };
      vi.mocked(apiCall).mockResolvedValueOnce(updatedUser);

      const result = await UserService.update(1, updateData);

      expect(result).toEqual(updatedUser);
      expect(apiCall).toHaveBeenCalledWith('/users/1', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
    });
  });

  describe('delete', () => {
    it('deletes user', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockResolvedValueOnce({});

      await UserService.delete(1);

      expect(apiCall).toHaveBeenCalledWith('/users/1', {
        method: 'DELETE',
      });
    });
  });

  describe('toggleActive', () => {
    it('toggles user active status', async () => {
      const { apiCall } = await import('../../config/api');
      const mockUser = { id: 1, username: 'user', is_active: false };

      vi.mocked(apiCall).mockResolvedValueOnce(mockUser);

      const result = await UserService.toggleActive(1);

      expect(result).toEqual(mockUser);
      expect(apiCall).toHaveBeenCalledWith('/users/1/toggle_active', {
        method: 'POST',
      });
    });
  });
});
