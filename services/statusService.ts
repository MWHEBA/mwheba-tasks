import { TaskStatus, ColorTheme } from '../types';
import { apiCall } from '../config/api';

// Initial Seed Data - used only for first-time setup
const INITIAL_STATUSES: TaskStatus[] = [
  { id: 'pending', label: 'قيد الانتظار', color: 'slate', icon: 'fa-regular fa-clock', orderIndex: 0, isFinished: false, isDefault: true, allowedNextStatuses: ['in_design', 'on_hold', 'cancelled'] },
  { id: 'in_design', label: 'جاري التصميم', color: 'blue', icon: 'fa-solid fa-palette', orderIndex: 1, isFinished: false, allowedNextStatuses: ['has_comments', 'awaiting_client_response', 'on_hold', 'cancelled'] },
  { id: 'has_comments', label: 'يوجد ملاحظات', color: 'rose', icon: 'fa-regular fa-comments', orderIndex: 2, isFinished: false, allowedNextStatuses: ['in_design', 'awaiting_client_response', 'on_hold', 'cancelled'] },
  { id: 'awaiting_client_response', label: 'في انتظار رد العميل', color: 'orange', icon: 'fa-solid fa-hourglass-half', orderIndex: 3, isFinished: false, allowedNextStatuses: ['in_design', 'has_comments', 'ready_for_montage', 'on_hold', 'cancelled'] },
  { id: 'ready_for_montage', label: 'جاهز للمونتاج', color: 'cyan', icon: 'fa-solid fa-layer-group', orderIndex: 4, isFinished: false, allowedNextStatuses: ['montage_completed', 'has_comments', 'on_hold', 'cancelled'] },
  { id: 'montage_completed', label: 'تم المونتاج', color: 'purple', icon: 'fa-solid fa-check-circle', orderIndex: 5, isFinished: false, allowedNextStatuses: ['ready_for_printing', 'has_comments', 'on_hold', 'cancelled'] },
  { id: 'ready_for_printing', label: 'جاهز للطباعة', color: 'green', icon: 'fa-solid fa-box-open', orderIndex: 6, isFinished: false, allowedNextStatuses: ['in_printing', 'on_hold', 'cancelled'] },
  { id: 'in_printing', label: 'جاري الطباعة', color: 'teal', icon: 'fa-solid fa-print', orderIndex: 7, isFinished: false, allowedNextStatuses: ['ready_for_delivery', 'on_hold', 'cancelled'] },
  { id: 'ready_for_delivery', label: 'جاهز للتسليم', color: 'lime', icon: 'fa-solid fa-truck', orderIndex: 8, isFinished: false, allowedNextStatuses: ['delivered', 'on_hold', 'cancelled'] },
  { id: 'on_hold', label: 'معلق', color: 'slate', icon: 'fa-solid fa-pause-circle', orderIndex: 9, isFinished: false, allowedNextStatuses: [] },
  { id: 'delivered', label: 'تم التسليم', color: 'emerald', icon: 'fa-solid fa-flag-checkered', orderIndex: 10, isFinished: true, allowedNextStatuses: [] },
  { id: 'cancelled', label: 'ملغي', color: 'red', icon: 'fa-solid fa-ban', orderIndex: 11, isFinished: true, isCancelled: true, allowedNextStatuses: [] },
];

export const StatusService = {
  getAll: async (): Promise<TaskStatus[]> => {
    try {
      let allStatuses: TaskStatus[] = [];
      let url = '/statuses';
      
      // Fetch all pages
      while (url) {
        const response = await apiCall<{ results: TaskStatus[]; next: string | null } | TaskStatus[]>(url);
        
        if (Array.isArray(response)) {
          allStatuses = response;
          break;
        } else {
          allStatuses = [...allStatuses, ...response.results];
          if (response.next) {
            const match = response.next.match(/\/api\/(.+)/);
            url = match ? `/${match[1].replace(/\/$/, '')}` : '';
          } else {
            url = '';
          }
        }
      }
      
      return allStatuses;
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<TaskStatus | undefined> => {
    try {
      return await apiCall<TaskStatus>(`/statuses/${encodeURIComponent(id)}`);
    } catch (error) {
      console.error(`Failed to fetch status ${id}:`, error);
      return undefined;
    }
  },

  getDefault: async (): Promise<TaskStatus> => {
    const all = await StatusService.getAll();
    return all.find(s => s.isDefault) || all[0];
  },

  getFinished: async (): Promise<TaskStatus> => {
    const all = await StatusService.getAll();
    return all.find(s => s.isFinished) || all[all.length - 1];
  },

  add: async (status: TaskStatus): Promise<void> => {
    await apiCall('/statuses', {
      method: 'POST',
      body: JSON.stringify(status),
    });
  },

  update: async (status: TaskStatus): Promise<void> => {
    await apiCall(`/statuses/${encodeURIComponent(status.id)}`, {
      method: 'PUT',
      body: JSON.stringify(status),
    });
  },

  delete: async (id: string): Promise<void> => {
    await apiCall(`/statuses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  reorder: async (newOrder: TaskStatus[]): Promise<void> => {
    const updated = newOrder.map((s, idx) => ({ ...s, orderIndex: idx }));
    for (const status of updated) {
      await StatusService.update(status);
    }
  },

  getThemeStyles: (theme: ColorTheme): string => {
    const map: Record<ColorTheme, string> = {
      slate: 'bg-slate-50 text-slate-600 border-slate-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      amber: 'bg-amber-50 text-amber-600 border-amber-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      lime: 'bg-lime-50 text-lime-600 border-lime-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      teal: 'bg-teal-50 text-teal-600 border-teal-200',
      cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      sky: 'bg-sky-50 text-sky-600 border-sky-200',
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      violet: 'bg-violet-50 text-violet-600 border-violet-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      fuchsia: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
      pink: 'bg-pink-50 text-pink-600 border-pink-200',
      rose: 'bg-rose-50 text-rose-600 border-rose-200',
    };
    return map[theme] || map.slate;
  },

  getAllowedNextStatuses: async (statusId: string): Promise<TaskStatus[]> => {
    const status = await StatusService.getById(statusId);
    if (!status) return [];

    const allStatuses = await StatusService.getAll();

    if (statusId === 'on_hold') {
      return allStatuses.filter(s => !s.isFinished && s.id !== 'on_hold');
    }

    if (!status.allowedNextStatuses || status.allowedNextStatuses.length === 0) {
      return allStatuses.filter(s => !s.isFinished && s.id !== statusId);
    }

    return allStatuses.filter(s => status.allowedNextStatuses!.includes(s.id));
  },

  updateAllowedNextStatuses: async (statusId: string, allowedIds: string[]): Promise<void> => {
    const status = await StatusService.getById(statusId);
    if (status) {
      status.allowedNextStatuses = allowedIds;
      await StatusService.update(status);
    }
  },

  // Initialize database with default statuses (call once)
  initializeDefaults: async (): Promise<void> => {
    const existing = await StatusService.getAll();
    if (existing.length === 0) {
      for (const status of INITIAL_STATUSES) {
        await StatusService.add(status);
      }
      console.log('✅ Default statuses initialized');
    }
  },

  // Reset all statuses to defaults
  resetToDefaults: async (): Promise<void> => {
    try {
      await apiCall('/statuses/reset-to-defaults', {
        method: 'POST',
      });
      console.log('✅ Statuses reset to defaults');
    } catch (error) {
      console.error('Failed to reset statuses:', error);
      throw error;
    }
  },
};
