import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientService } from '../../services/clientService';
import { ClientType } from '../../types';

vi.mock('../../config/api', () => ({
  apiCall: vi.fn(),
  API_URL: 'http://localhost:8000/api',
}));

describe('ClientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches all clients', async () => {
      const { apiCall } = await import('../../config/api');
      const mockClients = [
        { id: '1', name: 'Client 1', type: ClientType.EXISTING },
        { id: '2', name: 'Client 2', type: ClientType.NEW },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockClients);

      const result = await ClientService.getAll();

      expect(result).toEqual(mockClients);
      expect(apiCall).toHaveBeenCalledWith('/clients');
    });

    it('handles paginated response', async () => {
      const { apiCall } = await import('../../config/api');
      
      vi.mocked(apiCall)
        .mockResolvedValueOnce({
          results: [{ id: '1', name: 'Client 1' }],
          next: 'http://localhost:8000/api/clients?page=2',
        })
        .mockResolvedValueOnce({
          results: [{ id: '2', name: 'Client 2' }],
          next: null,
        });

      const result = await ClientService.getAll();

      expect(result).toHaveLength(2);
    });

    it('returns empty array on error', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Network error'));

      const result = await ClientService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns client by id', async () => {
      const { apiCall } = await import('../../config/api');
      const mockClients = [
        { id: '1', name: 'Client 1', type: ClientType.EXISTING },
        { id: '2', name: 'Client 2', type: ClientType.NEW },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockClients);

      const result = await ClientService.getById('2');

      expect(result).toEqual(mockClients[1]);
    });

    it('returns undefined if not found', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockResolvedValueOnce([]);

      const result = await ClientService.getById('999');

      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('creates new client', async () => {
      const { apiCall } = await import('../../config/api');
      const newClient = {
        name: 'New Client',
        type: ClientType.NEW,
        number: 'C-001',
        notes: 'Test notes',
      };

      const createdClient = { id: '1', ...newClient };
      vi.mocked(apiCall).mockResolvedValueOnce(createdClient);

      const result = await ClientService.create(newClient);

      expect(result).toEqual(createdClient);
      expect(apiCall).toHaveBeenCalledWith('/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
      });
    });
  });

  describe('update', () => {
    it('updates existing client', async () => {
      const { apiCall } = await import('../../config/api');
      const client = {
        id: '1',
        name: 'Updated Client',
        type: ClientType.EXISTING,
        number: 'C-001',
        notes: '',
      };

      vi.mocked(apiCall).mockResolvedValueOnce(client);

      const result = await ClientService.update(client);

      expect(result).toEqual(client);
      expect(apiCall).toHaveBeenCalledWith('/clients/1', {
        method: 'PUT',
        body: JSON.stringify(client),
      });
    });
  });

  describe('delete', () => {
    it('deletes client', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockResolvedValueOnce({});

      await ClientService.delete('1');

      expect(apiCall).toHaveBeenCalledWith('/clients/1', {
        method: 'DELETE',
      });
    });
  });

  describe('searchByName', () => {
    it('searches clients by name', async () => {
      const { apiCall } = await import('../../config/api');
      const mockClients = [
        { id: '1', name: 'شركة القمة', type: ClientType.EXISTING },
        { id: '2', name: 'مقهى المزاج', type: ClientType.NEW },
        { id: '3', name: 'شركة النجاح', type: ClientType.EXISTING },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockClients);

      const result = await ClientService.searchByName('شركة');

      expect(result).toHaveLength(2);
      expect(result.every(c => c.name.includes('شركة'))).toBe(true);
    });
  });

  describe('getByType', () => {
    it('filters clients by type', async () => {
      const { apiCall } = await import('../../config/api');
      const mockClients = [
        { id: '1', name: 'Client 1', type: ClientType.EXISTING },
        { id: '2', name: 'Client 2', type: ClientType.NEW },
        { id: '3', name: 'Client 3', type: ClientType.EXISTING },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockClients);

      const result = await ClientService.getByType(ClientType.EXISTING);

      expect(result).toHaveLength(2);
      expect(result.every(c => c.type === ClientType.EXISTING)).toBe(true);
    });
  });

  describe('isNumberExists', () => {
    it('checks if client number exists', async () => {
      const { apiCall } = await import('../../config/api');
      const mockClients = [
        { id: '1', name: 'Client 1', number: 'C-001' },
        { id: '2', name: 'Client 2', number: 'C-002' },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockClients);

      const exists = await ClientService.isNumberExists('C-001');

      expect(exists).toBe(true);
    });

    it('excludes specific id when checking', async () => {
      const { apiCall } = await import('../../config/api');
      const mockClients = [
        { id: '1', name: 'Client 1', number: 'C-001' },
      ];

      vi.mocked(apiCall).mockResolvedValueOnce(mockClients);

      const exists = await ClientService.isNumberExists('C-001', '1');

      expect(exists).toBe(false);
    });
  });
});
