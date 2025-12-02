import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsService } from '../../services/settingsService';
import { WhatsAppType } from '../../types';

vi.mock('../../config/api', () => ({
  apiCall: vi.fn(),
  API_URL: 'http://localhost:8000/api',
}));

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('fetches settings', async () => {
      const { apiCall } = await import('../../config/api');
      const mockSettings = {
        whatsappNumbers: [
          {
            id: '1',
            name: 'Admin',
            type: WhatsAppType.MANAGEMENT,
            number: '123456',
            apiKey: 'key123',
            enabled: true,
          },
        ],
        notificationsEnabled: true,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockSettings);

      const result = await SettingsService.get();

      expect(result.whatsappNumbers).toHaveLength(1);
      expect(result.notificationsEnabled).toBe(true);
    });

    it('returns default settings on error', async () => {
      const { apiCall } = await import('../../config/api');
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Error'));

      const result = await SettingsService.get();

      expect(result.whatsappNumbers).toBeDefined();
      expect(result.notificationsEnabled).toBe(true);
    });
  });

  describe('save', () => {
    it('saves settings', async () => {
      const { apiCall } = await import('../../config/api');
      const settings = {
        whatsappNumbers: [],
        notificationsEnabled: true,
      };

      vi.mocked(apiCall).mockResolvedValueOnce({});

      await SettingsService.save(settings);

      expect(apiCall).toHaveBeenCalledWith('/settings/1', {
        method: 'PUT',
        body: expect.any(String),
      });
    });
  });

  describe('addWhatsAppNumber', () => {
    it('adds new WhatsApp number', async () => {
      const { apiCall } = await import('../../config/api');
      const mockSettings = {
        whatsappNumbers: [],
        notificationsEnabled: true,
      };

      vi.mocked(apiCall)
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce({});

      const newNumber = {
        name: 'Test',
        type: WhatsAppType.DESIGNER,
        number: '123',
        apiKey: 'key',
        enabled: true,
      };

      const result = await SettingsService.addWhatsAppNumber(newNumber);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test');
    });
  });

  describe('deleteWhatsAppNumber', () => {
    it('deletes WhatsApp number', async () => {
      const { apiCall } = await import('../../config/api');
      const mockSettings = {
        whatsappNumbers: [
          {
            id: '1',
            name: 'Test',
            type: WhatsAppType.DESIGNER,
            number: '123',
            apiKey: 'key',
            enabled: true,
          },
        ],
        notificationsEnabled: true,
      };

      vi.mocked(apiCall)
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce({});

      await SettingsService.deleteWhatsAppNumber('1');

      expect(apiCall).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEnabledWhatsAppNumbers', () => {
    it('returns only enabled numbers', async () => {
      const { apiCall } = await import('../../config/api');
      const mockSettings = {
        whatsappNumbers: [
          {
            id: '1',
            name: 'Enabled',
            type: WhatsAppType.DESIGNER,
            number: '123',
            apiKey: 'key',
            enabled: true,
          },
          {
            id: '2',
            name: 'Disabled',
            type: WhatsAppType.DESIGNER,
            number: '456',
            apiKey: 'key2',
            enabled: false,
          },
        ],
        notificationsEnabled: true,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockSettings);

      const result = await SettingsService.getEnabledWhatsAppNumbers();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Enabled');
    });
  });
});
