import { Client, CreateClientDTO, ClientType } from '../types';
import { apiCall } from '../config/api';

const INITIAL_CLIENTS: CreateClientDTO[] = [
  {
    name: 'شركة القمة',
    type: ClientType.EXISTING,
    number: 'C-101',
    notes: 'عميل مميز يطلب طباعة أوفست دائماً'
  },
  {
    name: 'مقهى المزاج',
    type: ClientType.NEW,
    number: 'C-102',
    notes: ''
  }
];

export const ClientService = {
  /**
   * جلب جميع العملاء
   * Fetches all clients from the API
   */
  getAll: async (): Promise<Client[]> => {
    try {
      let allClients: Client[] = [];
      let url = '/clients';
      
      // Fetch all pages
      while (url) {
        const response = await apiCall<{ results: Client[]; next: string | null } | Client[]>(url);
        
        if (Array.isArray(response)) {
          allClients = response;
          break;
        } else {
          allClients = [...allClients, ...response.results];
          // Get next page URL (extract path after /api/)
          if (response.next) {
            const match = response.next.match(/\/api\/(.+)/);
            url = match ? `/${match[1].replace(/\/$/, '')}` : '';
          } else {
            url = '';
          }
        }
      }
      
      return allClients;
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      return [];
    }
  },

  /**
   * جلب عميل بواسطة المعرف
   * Fetches a single client by ID
   */
  getById: async (id: string): Promise<Client | undefined> => {
    const clients = await ClientService.getAll();
    return clients.find(c => c.id === id);
  },

  /**
   * إنشاء عميل جديد
   * Creates a new client
   */
  create: async (data: CreateClientDTO): Promise<Client> => {
    return await apiCall<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * استيراد عدة عملاء دفعة واحدة
   * Imports multiple clients in bulk using a single API call
   */
  importBulk: async (clientsData: CreateClientDTO[]): Promise<{ 
    count: number; 
    created: number; 
    updated: number; 
    message: string;
    errors?: any[];
  }> => {
    return await apiCall('/clients/bulk-import', {
      method: 'POST',
      body: JSON.stringify(clientsData),
    });
  },

  /**
   * تحديث بيانات عميل
   * Updates an existing client
   */
  update: async (client: Client): Promise<Client> => {
    return await apiCall<Client>(`/clients/${client.id}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    });
  },

  /**
   * حذف عميل
   * Deletes a client
   */
  delete: async (id: string): Promise<void> => {
    await apiCall(`/clients/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * تهيئة العملاء الافتراضيين (للاستخدام مرة واحدة)
   * Initializes default clients (one-time use)
   */
  initializeDefaults: async (): Promise<void> => {
    const existing = await ClientService.getAll();
    if (existing.length === 0) {
      for (const clientData of INITIAL_CLIENTS) {
        await ClientService.create(clientData);
      }
      console.log('✅ Default clients initialized');
    }
  },

  /**
   * البحث عن عملاء بالاسم
   * Searches clients by name
   */
  searchByName: async (query: string): Promise<Client[]> => {
    const clients = await ClientService.getAll();
    const lowerQuery = query.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(lowerQuery));
  },

  /**
   * جلب العملاء حسب النوع
   * Gets clients by type (New/Existing)
   */
  getByType: async (type: ClientType): Promise<Client[]> => {
    const clients = await ClientService.getAll();
    return clients.filter(c => c.type === type);
  },

  /**
   * التحقق من وجود رقم عميل
   * Checks if a client number already exists
   */
  isNumberExists: async (number: string, excludeId?: string): Promise<boolean> => {
    const clients = await ClientService.getAll();
    return clients.some(c => c.number === number && c.id !== excludeId);
  }
};
