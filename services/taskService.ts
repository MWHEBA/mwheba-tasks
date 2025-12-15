import { Task, CreateTaskDTO, Urgency, ActivityLogEntry, ActivityType } from '../types';
import { ClientService } from './clientService';
import { StatusService } from './statusService';
import { apiCall, API_URL } from '../config/api';

export const TaskService = {
  getAll: async (): Promise<Task[]> => {
    try {
      let allTasks: Task[] = [];
      let url = '/tasks/';
      
      // Fetch all pages
      while (url) {
        const response = await apiCall<{ results: Task[]; next: string | null } | Task[]>(url);
        
        if (Array.isArray(response)) {
          allTasks = response;
          break;
        } else {
          allTasks = [...allTasks, ...response.results];
          if (response.next) {
            const match = response.next.match(/\/api\/(.+)/);
            url = match ? `/${match[1]}` : '';
          } else {
            url = '';
          }
        }
      }
      
      return allTasks.sort((a, b) => a.orderIndex - b.orderIndex);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Task | null> => {
    const tasks = await TaskService.getAll();
    return tasks.find(t => t.id === id) || null;
  },

  getMainTasks: async (): Promise<Task[]> => {
    const allTasks = await TaskService.getAll();
    return allTasks.filter(t => !t.parentId);
  },

  getSubtasks: async (parentId: string): Promise<Task[]> => {
    const allTasks = await TaskService.getAll();
    return allTasks.filter(t => t.parentId === parentId).sort((a, b) => a.orderIndex - b.orderIndex);
  },

  create: async (data: CreateTaskDTO, subtasks: Partial<CreateTaskDTO>[] = []): Promise<Task> => {
    const client = await ClientService.getById(data.clientId);
    const defaultStatus = await StatusService.getDefault();
    
    if (!client) throw new Error("العميل غير موجود");

    const mainTaskId = crypto.randomUUID();
    const allTasks = await TaskService.getAll();
    const mainTasks = allTasks.filter(t => !t.parentId);
    
    const mainTask: any = {
      ...data,
      id: mainTaskId,
      status: defaultStatus.id,
      clientId: client.id,
      comments: [],
      orderIndex: mainTasks.length,
      createdAt: Date.now(),
      activityLog: [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: ActivityType.TASK_CREATED,
        description: 'تم إنشاء المهمة'
      }]
    };

    // Create main task
    await apiCall('/tasks', {
      method: 'POST',
      body: JSON.stringify(mainTask),
    });

    // Create subtasks
    for (let idx = 0; idx < subtasks.length; idx++) {
      const sub = subtasks[idx];
      const subtask: any = {
        id: crypto.randomUUID(),
        title: sub.title || 'مهمة فرعية بدون عنوان',
        description: sub.description || '',
        urgency: sub.urgency || Urgency.NORMAL,
        status: defaultStatus.id,
        clientId: client.id,
        parentId: mainTaskId,
        attachments: sub.attachments || [],
        comments: [],
        orderIndex: idx,
        createdAt: Date.now() + idx,
        printingType: sub.printingType,
        size: sub.size,
        isVip: sub.isVip,
        activityLog: [{
          id: crypto.randomUUID(),
          timestamp: Date.now() + idx,
          type: ActivityType.TASK_CREATED,
          description: 'تم إنشاء المهمة الفرعية'
        }]
      };
      
      await apiCall('/tasks', {
        method: 'POST',
        body: JSON.stringify(subtask),
      });
    }
    
    // Notification is now handled by Backend signal handlers
    const fullMainTask: Task = {
      ...mainTask,
      client: client,
    };

    return fullMainTask;
  },

  update: async (updatedTask: Task): Promise<void> => {
    const oldTask = await TaskService.getById(updatedTask.id);
    
    await apiCall(`/tasks/${updatedTask.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTask),
    });

    // Notifications are now handled by Backend signal handlers
  },

  addComment: async (taskId: string, text: string): Promise<void> => {
    const task = await TaskService.getById(taskId);
    if (!task) return;

    // Backend already creates activity log entry and sends notifications
    await apiCall(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        parentCommentId: null
      }),
    });

    // تحديث حالة التاسك الفرعية لـ "يوجد ملاحظات" عند إضافة كومنت
    const allStatuses = await StatusService.getAll();
    const hasCommentsStatus = allStatuses.find(s => s.id === 'has_comments');
    
    if (hasCommentsStatus && task.status !== hasCommentsStatus.id) {
      await TaskService.updateStatus(taskId, hasCommentsStatus.id);
    }
  },

  addReply: async (taskId: string, commentId: string, text: string): Promise<void> => {
    const task = await TaskService.getById(taskId);
    if (!task) return;

    await apiCall(`/tasks/${taskId}/add_reply`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        parentCommentId: commentId
      }),
    });

    // تحديث حالة التاسك الفرعية لـ "يوجد ملاحظات" عند إضافة رد
    const allStatuses = await StatusService.getAll();
    const hasCommentsStatus = allStatuses.find(s => s.id === 'has_comments');
    
    if (hasCommentsStatus && task.status !== hasCommentsStatus.id) {
      await TaskService.updateStatus(taskId, hasCommentsStatus.id);
    }

    // Notifications are now handled by Backend signal handlers
  },

  resolveComment: async (taskId: string, commentId: string): Promise<void> => {
    const task = await TaskService.getById(taskId);
    if (!task || !task.comments) return;

    const comment = task.comments.find(c => c.id === commentId);
    if (!comment) return;

    await apiCall(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: comment.id,
        task: taskId,
        parentComment: comment.parentCommentId || null,
        text: comment.text,
        isResolved: true,
        createdAt: comment.createdAt
      }),
    });

    // Notifications are now handled by Backend signal handlers

    // انتظار قصير عشان نتأكد إن البيانات اتحدثت في الداتابيس
    await new Promise(resolve => setTimeout(resolve, 500));

    // Refresh task to check all comments
    const updatedTask = await TaskService.getById(taskId);
    if (!updatedTask || !updatedTask.comments) return;

    const allResolved = updatedTask.comments.every(c => c.isResolved);
    
    const allStatuses = await StatusService.getAll();
    const hasCommentsStatus = allStatuses.find(s => s.id === 'has_comments');
    const awaitingClientFeedbackStatus = allStatuses.find(s => s.id === 'awaiting_client_feedback');

    console.log('Debug resolveComment:', {
      taskId,
      commentId,
      allResolved,
      currentStatus: updatedTask.status,
      hasCommentsStatusId: hasCommentsStatus?.id,
      awaitingClientFeedbackStatusId: awaitingClientFeedbackStatus?.id,
      totalComments: updatedTask.comments.length,
      resolvedComments: updatedTask.comments.filter(c => c.isResolved).length
    });

    // لما كل الكومنتات تكون محلولة، تحويل التاسك لـ "في انتظار رد العميل"
    if (allResolved && updatedTask.status === hasCommentsStatus?.id && awaitingClientFeedbackStatus) {
      console.log('Changing status to awaiting client feedback');
      await TaskService.updateStatus(taskId, awaitingClientFeedbackStatus.id);
    }
  },

  addAttachment: async (taskId: string, file: File): Promise<void> => {
    try {
      // Get fresh task data
      const task = await TaskService.getById(taskId);
      if (!task) return;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('id', crypto.randomUUID());

      // Get access token
      const accessToken = localStorage.getItem('access_token');
      
      // Add attachment via dedicated endpoint
      const response = await fetch(`${API_URL}/tasks/${taskId}/add_attachment/`, {
        method: 'POST',
        headers: {
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('فشل رفع الملف');
      }

      const attachment = await response.json();
      
      // Notifications are now handled by Backend signal handlers
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  },

  deleteAttachment: async (taskId: string, attachmentId: string): Promise<void> => {
    try {
      // Get access token
      const accessToken = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_URL}/tasks/${taskId}/delete_attachment/${attachmentId}/`, {
        method: 'DELETE',
        headers: {
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
      });

      if (!response.ok) {
        throw new Error('فشل حذف الملف');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  },

  updateStatus: async (id: string, statusId: string): Promise<void> => {
    const task = await TaskService.getById(id);
    if (!task) return;

    // Use the new update_status endpoint that creates activity log automatically
    await apiCall(`/tasks/${id}/update_status`, {
      method: 'POST',
      body: JSON.stringify({ statusId }),
    });
    
    // Notifications are now handled by Backend signal handlers
    
    // Parent Inheritance Logic
    if (task.parentId) {
      const allTasks = await TaskService.getAll();
      const parent = allTasks.find(t => t.id === task.parentId);
      
      if (parent) {
        const siblings = allTasks.filter(t => t.parentId === task.parentId);
        const allStatuses = await StatusService.getAll();
        const hasCommentsStatus = allStatuses.find(s => s.id === 'Has Comments');

        if (hasCommentsStatus && siblings.some(t => t.status === hasCommentsStatus.id)) {
          parent.status = hasCommentsStatus.id;
        } else {
          let minOrderIndex = 9999;
          let minStatusId = allStatuses[0].id;

          siblings.forEach(sub => {
            const subStatus = allStatuses.find(s => s.id === sub.status);
            if (subStatus && subStatus.orderIndex < minOrderIndex) {
              minOrderIndex = subStatus.orderIndex;
              minStatusId = subStatus.id;
            }
          });

          parent.status = minStatusId;
        }
        
        await TaskService.update(parent);
      }
    }
  },

  updateUrgency: async (id: string, urgency: Urgency): Promise<void> => {
    const task = await TaskService.getById(id);
    if (!task) return;
    
    task.urgency = urgency;
    await TaskService.update(task);
  },

  reorder: async (orderedTasks: Task[]): Promise<void> => {
    const allTasks = await TaskService.getAll();
    
    for (let index = 0; index < orderedTasks.length; index++) {
      const orderedTask = orderedTasks[index];
      const dbTask = allTasks.find(t => t.id === orderedTask.id);
      
      if (dbTask && dbTask.orderIndex !== index) {
        dbTask.orderIndex = index;
        await TaskService.update(dbTask);
      }
    }
  },
  
  delete: async (id: string): Promise<void> => {
    await apiCall(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * تحديد موعد تسليم لمهمة
   */
  setDeadline: async (taskId: string, deadline: number): Promise<void> => {
    const task = await TaskService.getById(taskId);
    if (!task) throw new Error('المهمة غير موجودة');
    
    const hadDeadline = task.deadline !== undefined;
    task.deadline = deadline;
    
    await TaskService.update(task);
    
    // Add to activity log
    await TaskService.addActivityLog(taskId, {
      type: hadDeadline ? ActivityType.DEADLINE_CHANGED : ActivityType.DEADLINE_SET,
      description: hadDeadline ? 'تم تغيير موعد التسليم' : 'تم تحديد موعد التسليم',
      details: { deadline }
    });
  },

  /**
   * إضافة إدخال لسجل نشاط المهمة
   */
  addActivityLog: async (taskId: string, entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): Promise<void> => {
    await apiCall(`/tasks/${taskId}/add_activity`, {
      method: 'POST',
      body: JSON.stringify({
        type: entry.type,
        description: entry.description,
        details: entry.details
      }),
    });
  },

  /**
   * حساب تقدم المهام الفرعية
   */
  calculateProgress: async (taskId: string): Promise<{ completed: number; total: number; percentage: number }> => {
    try {
      return await apiCall<{ completed: number; total: number; percentage: number }>(`/tasks/${taskId}/progress`);
    } catch (error) {
      console.error('Failed to calculate progress:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  },

  /**
   * الحصول على المهام المتأخرة
   */
  getOverdueTasks: async (): Promise<Task[]> => {
    try {
      return await apiCall<Task[]>('/tasks/overdue');
    } catch (error) {
      console.error('Failed to fetch overdue tasks:', error);
      return [];
    }
  },

  /**
   * الحصول على المهام العاجلة
   */
  getUrgentTasks: async (): Promise<Task[]> => {
    try {
      return await apiCall<Task[]>('/tasks/urgent');
    } catch (error) {
      console.error('Failed to fetch urgent tasks:', error);
      return [];
    }
  },

  /**
   * الحصول على مهام عميل معين
   */
  getTasksByClient: async (clientId: string): Promise<Task[]> => {
    const tasks = await TaskService.getAll();
    return tasks.filter(task => task.clientId === clientId);
  },

  /**
   * إضافة مهمة فرعية لمهمة موجودة
   */
  addSubtask: async (parentTaskId: string, subtaskData: Partial<CreateTaskDTO>): Promise<Task> => {
    const parentTask = await TaskService.getById(parentTaskId);
    if (!parentTask) throw new Error("المهمة الأساسية غير موجودة");

    // التأكد من وجود clientId في المهمة الأساسية
    const clientId = parentTask.clientId || (parentTask.client && parentTask.client.id);
    if (!clientId) throw new Error("لا يمكن العثور على معرف العميل في المهمة الأساسية");

    const defaultStatus = await StatusService.getDefault();
    const allTasks = await TaskService.getAll();
    const existingSubtasks = allTasks.filter(t => t.parentId === parentTaskId);
    
    const subtask: any = {
      id: crypto.randomUUID(),
      title: subtaskData.title || 'مهمة فرعية بدون عنوان',
      description: subtaskData.description || '',
      urgency: subtaskData.urgency || Urgency.NORMAL,
      status: defaultStatus.id,
      clientId: clientId, // استخدام clientId من المهمة الأساسية
      parentId: parentTaskId,
      attachments: subtaskData.attachments || [],
      comments: [],
      orderIndex: existingSubtasks.length,
      createdAt: Date.now(),
      printingType: subtaskData.printingType,
      size: subtaskData.size,
      isVip: subtaskData.isVip || false,
      activityLog: [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: ActivityType.TASK_CREATED,
        description: 'تم إنشاء المهمة الفرعية'
      }]
    };
    
    await apiCall('/tasks', {
      method: 'POST',
      body: JSON.stringify(subtask),
    });

    // إرجاع المهمة الفرعية مع بيانات العميل
    const fullSubtask: Task = {
      ...subtask,
      client: parentTask.client,
    };

    return fullSubtask;
  }
};
