import { apiCall } from '../config/api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  role: 'admin' | 'designer' | 'print_manager';
  phone_number?: string;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'designer' | 'print_manager';
  phone_number?: string;
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'designer' | 'print_manager';
  phone_number?: string;
  is_active?: boolean;
}

export const UserService = {
  /**
   * جلب جميع المستخدمين
   */
  getAll: async (): Promise<User[]> => {
    try {
      let allUsers: User[] = [];
      let url = '/users';
      
      while (url) {
        const response = await apiCall<{ results: User[]; next: string | null } | User[]>(url);
        
        if (Array.isArray(response)) {
          allUsers = response;
          break;
        } else {
          allUsers = [...allUsers, ...response.results];
          if (response.next) {
            const match = response.next.match(/\/api\/(.+)/);
            url = match ? `/${match[1].replace(/\/$/, '')}` : '';
          } else {
            url = '';
          }
        }
      }
      
      return allUsers;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  },

  /**
   * جلب مستخدم بواسطة المعرف
   */
  getById: async (id: number): Promise<User | undefined> => {
    try {
      return await apiCall<User>(`/users/${id}`);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return undefined;
    }
  },

  /**
   * إنشاء مستخدم جديد
   */
  create: async (data: CreateUserDTO): Promise<User> => {
    return await apiCall<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * تحديث بيانات مستخدم
   */
  update: async (id: number, data: UpdateUserDTO): Promise<User> => {
    return await apiCall<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * حذف مستخدم (soft delete)
   */
  delete: async (id: number): Promise<void> => {
    await apiCall(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * تفعيل/تعطيل مستخدم
   */
  toggleActive: async (id: number): Promise<User> => {
    return await apiCall<User>(`/users/${id}/toggle_active`, {
      method: 'POST',
    });
  },
};
