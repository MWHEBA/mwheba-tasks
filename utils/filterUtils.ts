/**
 * Filter utility functions for MWHEBA Tasks
 * Provides helper functions for filtering and sorting tasks
 */

import { Task, Urgency, TaskStatus } from '../types';
import { isOverdue } from './dateUtils';
import { AuthService } from '../services/authService';

/**
 * Filter type for quick filters
 */
export type FilterType = 'overdue' | 'urgent' | 'client' | null;

/**
 * Sort type for task sorting
 */
export type SortType = 'deadline' | 'priority' | 'status' | 'createdAt' | 'orderIndex';

/**
 * Filter tasks that are overdue
 * @param tasks - Array of tasks to filter
 * @param statuses - Array of available task statuses
 * @returns Array of overdue tasks
 */
export const filterOverdueTasks = (tasks: Task[], statuses: TaskStatus[]): Task[] => {
  return tasks.filter(task => {
    if (!task.deadline) return false;
    
    const status = statuses.find(s => s.id === task.status);
    const isFinished = status?.isFinished === true;
    
    return isOverdue(task.deadline) && !isFinished;
  });
};

/**
 * Filter tasks that are urgent (CRITICAL or URGENT priority)
 * @param tasks - Array of tasks to filter
 * @returns Array of urgent tasks
 */
export const filterUrgentTasks = (tasks: Task[]): Task[] => {
  return tasks.filter(task => 
    task.urgency === Urgency.CRITICAL || task.urgency === Urgency.URGENT
  );
};

/**
 * Filter tasks by client ID
 * @param tasks - Array of tasks to filter
 * @param clientId - Client ID to filter by
 * @returns Array of tasks for the specified client
 */
export const filterTasksByClient = (tasks: Task[], clientId: string): Task[] => {
  return tasks.filter(task => task.clientId === clientId);
};

/**
 * Filter tasks by status
 * @param tasks - Array of tasks to filter
 * @param statusId - Status ID to filter by
 * @returns Array of tasks with the specified status
 */
export const filterTasksByStatus = (tasks: Task[], statusId: string): Task[] => {
  return tasks.filter(task => task.status === statusId);
};

/**
 * Filter tasks for designer role - show main tasks that have relevant subtasks or are in relevant statuses
 * Designer can see:
 * 1. Main tasks in designer-relevant statuses
 * 2. Main tasks that have subtasks in designer-relevant statuses (even if main task is in different status)
 * 
 * Designer-relevant statuses:
 * - قيد الانتظار (pending)
 * - جاري التصميم (in_design) 
 * - ملحوظات العميل (has_comments)
 * - ملحوظات المصمم (designer_notes)
 * - في انتظار رد العميل (awaiting_client_response)
 * - جاهز للمونتاج (ready_for_montage)
 * - تم المونتاج (montage_completed)
 * 
 * @param tasks - Array of all tasks (main and subtasks)
 * @returns Array of main tasks that designer should see
 */
export const filterTasksForDesigner = (tasks: Task[]): Task[] => {
  // الحالات المسموح للمصمم برؤيتها
  const designerAllowedStatuses = [
    'pending',                    // قيد الانتظار
    'in_design',                  // جاري التصميم
    'has_comments',               // ملحوظات العميل
    'designer_notes',             // ملحوظات المصمم
    'awaiting_client_response',   // في انتظار رد العميل
    'ready_for_montage',          // جاهز للمونتاج
    'montage_completed'           // تم المونتاج
  ];

  const mainTasks = tasks.filter(task => !task.parentId);
  
  return mainTasks.filter(mainTask => {
    // إذا كانت المهمة الرئيسية نفسها في حالة مسموحة للمصمم
    if (designerAllowedStatuses.includes(mainTask.status)) {
      return true;
    }
    
    // إذا كان فيه مهام فرعية في حالات مسموحة للمصمم
    const subtasks = tasks.filter(task => task.parentId === mainTask.id);
    const hasRelevantSubtasks = subtasks.some(subtask => 
      designerAllowedStatuses.includes(subtask.status)
    );
    
    return hasRelevantSubtasks;
  });
};

/**
 * Filter main tasks (tasks without parent)
 * @param tasks - Array of tasks to filter
 * @returns Array of main tasks
 */
export const filterMainTasks = (tasks: Task[]): Task[] => {
  return tasks.filter(task => !task.parentId);
};

/**
 * Filter subtasks for a specific parent task
 * @param tasks - Array of tasks to filter
 * @param parentId - Parent task ID
 * @returns Array of subtasks
 */
export const filterSubtasks = (tasks: Task[], parentId: string): Task[] => {
  return tasks.filter(task => task.parentId === parentId);
};

/**
 * Sort tasks by deadline (earliest first)
 * @param tasks - Array of tasks to sort
 * @returns Sorted array of tasks
 */
export const sortByDeadline = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    // Tasks without deadline go to the end
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    
    return a.deadline - b.deadline;
  });
};

/**
 * Sort tasks by priority (CRITICAL > URGENT > NORMAL)
 * @param tasks - Array of tasks to sort
 * @returns Sorted array of tasks
 */
export const sortByPriority = (tasks: Task[]): Task[] => {
  const priorityOrder = {
    [Urgency.CRITICAL]: 0,
    [Urgency.URGENT]: 1,
    [Urgency.NORMAL]: 2
  };
  
  return [...tasks].sort((a, b) => {
    return priorityOrder[a.urgency] - priorityOrder[b.urgency];
  });
};

/**
 * Sort tasks by status order
 * @param tasks - Array of tasks to sort
 * @param statuses - Array of available task statuses
 * @returns Sorted array of tasks
 */
export const sortByStatus = (tasks: Task[], statuses: TaskStatus[]): Task[] => {
  return [...tasks].sort((a, b) => {
    const statusA = statuses.find(s => s.id === a.status);
    const statusB = statuses.find(s => s.id === b.status);
    
    if (!statusA || !statusB) return 0;
    
    return statusA.orderIndex - statusB.orderIndex;
  });
};

/**
 * Sort tasks by creation date (newest first)
 * @param tasks - Array of tasks to sort
 * @returns Sorted array of tasks
 */
export const sortByCreatedAt = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Sort tasks by order index
 * @param tasks - Array of tasks to sort
 * @returns Sorted array of tasks
 */
export const sortByOrderIndex = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => a.orderIndex - b.orderIndex);
};

/**
 * Apply multiple filters to tasks
 * @param tasks - Array of tasks to filter
 * @param filters - Object containing filter criteria
 * @param statuses - Array of available task statuses
 * @returns Filtered array of tasks
 */
export const applyFilters = (
  tasks: Task[],
  filters: {
    overdue?: boolean;
    urgent?: boolean;
    clientId?: string;
    statusId?: string;
    mainTasksOnly?: boolean;
    parentId?: string;
    designerOnly?: boolean;
  },
  statuses: TaskStatus[]
): Task[] => {
  let filtered = [...tasks];
  
  // Apply designer filter first if user is designer
  if (filters.designerOnly || AuthService.isDesigner()) {
    filtered = filterTasksForDesigner(filtered);
  }
  
  if (filters.overdue) {
    filtered = filterOverdueTasks(filtered, statuses);
  }
  
  if (filters.urgent) {
    filtered = filterUrgentTasks(filtered);
  }
  
  if (filters.clientId) {
    filtered = filterTasksByClient(filtered, filters.clientId);
  }
  
  if (filters.statusId) {
    filtered = filterTasksByStatus(filtered, filters.statusId);
  }
  
  if (filters.mainTasksOnly) {
    filtered = filterMainTasks(filtered);
  }
  
  if (filters.parentId) {
    filtered = filterSubtasks(filtered, filters.parentId);
  }
  
  return filtered;
};

/**
 * Apply sorting to tasks
 * @param tasks - Array of tasks to sort
 * @param sortBy - Sort type
 * @param statuses - Array of available task statuses (required for status sorting)
 * @returns Sorted array of tasks
 */
export const applySorting = (
  tasks: Task[],
  sortBy: SortType,
  statuses?: TaskStatus[]
): Task[] => {
  switch (sortBy) {
    case 'deadline':
      return sortByDeadline(tasks);
    case 'priority':
      return sortByPriority(tasks);
    case 'status':
      return statuses ? sortByStatus(tasks, statuses) : tasks;
    case 'createdAt':
      return sortByCreatedAt(tasks);
    case 'orderIndex':
      return sortByOrderIndex(tasks);
    default:
      return tasks;
  }
};

/**
 * Search tasks by text (searches in title and description)
 * @param tasks - Array of tasks to search
 * @param searchText - Text to search for
 * @returns Array of matching tasks
 */
export const searchTasks = (tasks: Task[], searchText: string): Task[] => {
  if (!searchText.trim()) return tasks;
  
  const lowerSearch = searchText.toLowerCase();
  
  return tasks.filter(task => 
    task.title.toLowerCase().includes(lowerSearch) ||
    task.description.toLowerCase().includes(lowerSearch)
  );
};

/**
 * Get task statistics
 * @param tasks - Array of tasks
 * @param statuses - Array of available task statuses
 * @returns Object containing task statistics
 */
export const getTaskStatistics = (tasks: Task[], statuses: TaskStatus[]) => {
  const total = tasks.length;
  const mainTasks = filterMainTasks(tasks).length;
  const subtasks = total - mainTasks;
  
  const completed = tasks.filter(task => {
    const status = statuses.find(s => s.id === task.status);
    return status?.isFinished === true;
  }).length;
  
  const overdue = filterOverdueTasks(tasks, statuses).length;
  const urgent = filterUrgentTasks(tasks).length;
  
  const byUrgency = {
    critical: tasks.filter(t => t.urgency === Urgency.CRITICAL).length,
    urgent: tasks.filter(t => t.urgency === Urgency.URGENT).length,
    normal: tasks.filter(t => t.urgency === Urgency.NORMAL).length
  };
  
  const byStatus = statuses.map(status => ({
    statusId: status.id,
    label: status.label,
    count: tasks.filter(t => t.status === status.id).length
  }));
  
  return {
    total,
    mainTasks,
    subtasks,
    completed,
    overdue,
    urgent,
    byUrgency,
    byStatus
  };
};
