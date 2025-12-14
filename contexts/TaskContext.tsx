import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Task } from '../types';
import { TaskService } from '../services/taskService';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const refreshTasks = useCallback(async (force = false) => {
    // Check if user is authenticated before making API calls
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      setTasks([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Auto-refresh if data is older than 30 seconds
    const now = Date.now();
    const cacheAge = now - lastFetch;
    
    if (!force && cacheAge < 30000 && tasks.length > 0) {
      // Data is fresh, no need to refresh
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await TaskService.getAll();
      setTasks(fetchedTasks);
      setLastFetch(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل تحميل المهام';
      setError(errorMessage);
      console.error('Error refreshing tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [lastFetch, tasks.length]);

  const updateTask = useCallback(async (task: Task) => {
    try {
      setLoading(true);
      setError(null);
      await TaskService.update(task);
      
      // Optimistic update
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === task.id ? task : t)
      );
      
      // Refresh to get latest data from server
      await refreshTasks();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل تحديث المهمة';
      setError(errorMessage);
      console.error('Error updating task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshTasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await TaskService.delete(id);
      
      // Optimistic update
      setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
      
      // Refresh to ensure consistency
      await refreshTasks();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل حذف المهمة';
      setError(errorMessage);
      console.error('Error deleting task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshTasks]);

  const value: TaskContextType = {
    tasks,
    loading,
    error,
    refreshTasks,
    updateTask,
    deleteTask,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
