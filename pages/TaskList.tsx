import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { StatusService } from '../services/statusService';
import { Task, TaskStatus, Urgency, PrintingType } from '../types';
import { UrgencyBadge } from '../components/UrgencyBadge';
import { StatusBadge } from '../components/StatusBadge';
import { DeadlineBadge } from '../components/DeadlineBadge';
import { ProgressBar } from '../components/ProgressBar';
import { QuickFilters, FilterType } from '../components/QuickFilters';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatRelativeDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskContext } from '../contexts/TaskContext';
import { Permissions } from '../utils/permissions';
import { ConfirmDialog } from '../components/ConfirmDialog';

type SortOption = 'default' | 'deadline' | 'urgency';
type ViewMode = 'list' | 'compact';

export const TaskList: React.FC = () => {
  const { tasks: contextTasks, loading: contextLoading, refreshTasks, deleteTask, updateTaskStatus } = useTaskContext();
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [taskProgress, setTaskProgress] = useState<Record<string, { completed: number; total: number; percentage: number }>>({});
  const [activeQuickFilter, setActiveQuickFilter] = useState<FilterType | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    await refreshTasks();
    const statusesData = await StatusService.getAll();
    setStatuses(statusesData);
    
    const progressData: Record<string, { completed: number; total: number; percentage: number }> = {};
    const parentTasks = contextTasks.filter(t => !t.parentId);
    
    for (const parentTask of parentTasks) {
      const progress = await TaskService.calculateProgress(parentTask.id);
      if (progress.total > 0) {
        progressData[parentTask.id] = progress;
      }
    }
    
    setTaskProgress(progressData);
  }, [refreshTasks, contextTasks]);

  // Calculate Dashboard Stats
  const dashboardStats = useMemo(() => {
    const allRootTasks = contextTasks.filter(t => !t.parentId);
    const now = Date.now();
    
    const total = allRootTasks.length;
    const active = allRootTasks.filter(t => {
      const status = statuses.find(s => s.id === t.status);
      return !status?.isFinished;
    }).length;
    
    const overdue = allRootTasks.filter(t => {
      if (!t.deadline) return false;
      const status = statuses.find(s => s.id === t.status);
      return t.deadline < now && !status?.isFinished;
    }).length;
    
    const completed = allRootTasks.filter(t => {
      const status = statuses.find(s => s.id === t.status);
      return status?.isFinished;
    }).length;
    
    const urgent = allRootTasks.filter(t => 
      t.urgency === Urgency.CRITICAL || t.urgency === Urgency.URGENT
    ).length;
    
    return { total, active, overdue, completed, urgent };
  }, [contextTasks, statuses]);

  const onDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const draggedTask = contextTasks.find(t => t.id === draggedTaskId);
    const targetTask = contextTasks.find(t => t.id === targetTaskId);

    if (draggedTask && targetTask && !draggedTask.parentId && !targetTask.parentId) {
        // Reordering will be handled on drag end
    }
  }, [draggedTaskId, contextTasks]);

  const onDragEnd = useCallback(async () => {
    setDraggedTaskId(null);
    await TaskService.reorder(contextTasks);
    await refreshTasks();
  }, [contextTasks, refreshTasks]);

  // Apply search filter
  const searchFiltered = useMemo(() => {
    const allRootTasks = contextTasks.filter(t => !t.parentId);
    
    if (!searchQuery.trim()) return allRootTasks;
    
    const query = searchQuery.toLowerCase();
    return allRootTasks.filter(task => 
      task.title.toLowerCase().includes(query) ||
      task.client.name.toLowerCase().includes(query) ||
      task.client.number?.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query)
    );
  }, [contextTasks, searchQuery]);

  // Apply quick filters
  const filteredByQuickFilter = useMemo(() => {
    if (!activeQuickFilter) return searchFiltered;
    
    const now = Date.now();
    
    switch (activeQuickFilter) {
      case 'overdue':
        return searchFiltered.filter(task => {
          if (!task.deadline) return false;
          const status = statuses.find(s => s.id === task.status);
          return task.deadline < now && !status?.isFinished;
        });
      
      case 'urgent':
        return searchFiltered.filter(task => 
          task.urgency === Urgency.CRITICAL || task.urgency === Urgency.URGENT
        );
      
      case 'client':
        if (!activeClientId) return searchFiltered;
        return searchFiltered.filter(task => task.clientId === activeClientId);
      
      default:
        return searchFiltered;
    }
  }, [searchFiltered, activeQuickFilter, activeClientId, statuses]);
  
  const rootTasks = filteredByQuickFilter;

  const getTasksByStatus = useCallback((statusId: string) => {
     let filtered = rootTasks.filter(t => t.status === statusId);
     const statusConfig = statuses.find(s => s.id === statusId);
     
     filtered.sort((a, b) => {
        if (sortOption === 'deadline') {
          const aDeadline = a.deadline || Infinity;
          const bDeadline = b.deadline || Infinity;
          if (aDeadline !== bDeadline) return aDeadline - bDeadline;
        } else if (sortOption === 'urgency') {
          const urgencyOrder = { [Urgency.CRITICAL]: 0, [Urgency.URGENT]: 1, [Urgency.NORMAL]: 2 };
          const aOrder = urgencyOrder[a.urgency];
          const bOrder = urgencyOrder[b.urgency];
          if (aOrder !== bOrder) return aOrder - bOrder;
        }
        
        const urgencyOrder = { [Urgency.CRITICAL]: 0, [Urgency.URGENT]: 1, [Urgency.NORMAL]: 2 };
        const aUrgencyOrder = urgencyOrder[a.urgency];
        const bUrgencyOrder = urgencyOrder[b.urgency];
        
        if (aUrgencyOrder !== bUrgencyOrder) {
          return aUrgencyOrder - bUrgencyOrder;
        }

        if (statusConfig?.isFinished) {
            return b.createdAt - a.createdAt;
        } else {
            return a.orderIndex - b.orderIndex;
        }
     });

     return filtered;
  }, [rootTasks, statuses, sortOption]);

  const tasksByStatusCount = useMemo(() => {
    const counts: Record<string, number> = {};
    statuses.forEach(s => {
      counts[s.id] = getTasksByStatus(s.id).length;
    });
    return counts;
  }, [statuses, getTasksByStatus]);

  const activeStatuses = useMemo(() => 
    statuses.filter(s => tasksByStatusCount[s.id] > 0),
    [statuses, tasksByStatusCount]
  );

  const handleQuickFilterChange = useCallback((filter: FilterType | null, clientId?: string) => {
    setActiveQuickFilter(filter);
    setActiveClientId(clientId);
  }, []);

  const handleDeleteClick = useCallback((task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTaskToDelete(task);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!taskToDelete) return;
    
    try {
      await deleteTask(taskToDelete.id);
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('فشل حذف المهمة');
    }
  }, [taskToDelete, deleteTask]);

  const handleStatusChange = useCallback(async (taskId: string, newStatusId: string) => {
    try {
      await updateTaskStatus(taskId, newStatusId);
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('فشل تحديث حالة المهمة');
    }
  }, [updateTaskStatus]);

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" text="جاري التحميل..." />
      </div>
    );
  }

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const renderTaskCard = (task: Task) => {
      const subtasks = contextTasks.filter(t => t.parentId === task.id).sort((a,b) => a.orderIndex - b.orderIndex);
      const progress = taskProgress[task.id];
      const statusConfig = statuses.find(s => s.id === task.status);
      const isFinished = statusConfig?.isFinished || false;
      const isExpanded = expandedTasks.has(task.id);
      
      // Calculate time indicators
      const now = Date.now();
      const createdTime = formatRelativeDate(task.createdAt, false);
      const hasUpdates = task.activityLog && task.activityLog.length > 0;
      const lastUpdate = hasUpdates ? task.activityLog[task.activityLog.length - 1].timestamp : task.createdAt;
      const isRecentlyUpdated = lastUpdate !== task.createdAt;
      const lastUpdateTime = isRecentlyUpdated ? formatRelativeDate(lastUpdate, false) : null;
      
      // Deadline countdown
      let deadlineCountdown = null;
      if (task.deadline && !isFinished) {
        const timeLeft = task.deadline - now;
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0) {
          deadlineCountdown = daysLeft === 0 ? 'اليوم' : daysLeft === 1 ? 'غداً' : `${daysLeft} يوم`;
        }
      }
      
      // Comments analysis
      const totalComments = task.comments?.length || 0;
      const unresolvedComments = task.comments?.filter(c => !c.isResolved).length || 0;
      const resolvedComments = task.comments?.filter(c => c.isResolved).length || 0;
      const commentsWithReplies = task.comments?.filter(c => c.replies && c.replies.length > 0).length || 0;
      
      if (viewMode === 'compact') {
        return (
          <motion.div 
            key={task.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            draggable
            onDragStart={(e) => onDragStart(e as any, task.id)}
            onDragOver={(e) => onDragOver(e as any, task.id)}
            onDragEnd={onDragEnd}
            className={`bg-white border rounded-lg transition-all group relative
                ${draggedTaskId === task.id 
                    ? 'opacity-40 border-brand-300 bg-brand-50' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }
            `}
          >
            <Link to={`/task/${task.id}`} className="p-3 flex items-center gap-3">
              <div className="text-slate-300 cursor-grab active:cursor-grabbing">
                <i className="fa-solid fa-grip-vertical text-sm"></i>
              </div>
              
              <div className="h-8 w-8 flex-shrink-0 rounded bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden text-slate-400 text-sm">
                  {task.attachments.length > 0 && task.attachments[0].type.startsWith('image/') ? (
                      <img src={task.attachments[0].url} className="h-full w-full object-cover" alt="" />
                  ) : (
                      <i className="fa-solid fa-layer-group"></i>
                  )}
              </div>

              <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 truncate text-sm">{task.client.name} {task.client.number ? `- ${task.client.number}` : ''}</span>
                      <UrgencyBadge level={task.urgency} />
                      {task.deadline && <DeadlineBadge deadline={task.deadline} isFinished={isFinished} size="small" />}
                      {deadlineCountdown && !isFinished && (
                        <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200">
                          <i className="fa-solid fa-hourglass-half"></i> {deadlineCountdown}
                        </span>
                      )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="truncate">{task.title}</span>
                      {progress && progress.total > 0 && (
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {progress.completed}/{progress.total}
                        </span>
                      )}
                      {task.attachments.length > 0 && (
                        <span className="text-[10px] text-slate-400">
                          <i className="fa-solid fa-paperclip"></i> {task.attachments.length}
                        </span>
                      )}
                      {totalComments > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          unresolvedComments > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          <i className="fa-solid fa-comment"></i> {unresolvedComments > 0 ? unresolvedComments : resolvedComments}
                        </span>
                      )}
                  </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge 
                  status={task.status} 
                  size="small" 
                  clickable={true}
                  onStatusChange={(newStatusId) => handleStatusChange(task.id, newStatusId)}
                  taskId={task.id}
                />
                {Permissions.canDeleteTask() && (
                  <button
                    onClick={(e) => handleDeleteClick(task, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all p-1.5 hover:bg-red-50 rounded"
                    title="حذف المهمة"
                  >
                    <i className="fa-regular fa-trash-can text-xs"></i>
                  </button>
                )}
              </div>
            </Link>
          </motion.div>
        );
      }
      
      return (
        <motion.div 
          key={task.id}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          draggable
          onDragStart={(e) => onDragStart(e as any, task.id)}
          onDragOver={(e) => onDragOver(e as any, task.id)}
          onDragEnd={onDragEnd}
          className={`bg-white border rounded-xl transition-all duration-150 group relative
              ${draggedTaskId === task.id 
                  ? 'opacity-40 border-brand-400 bg-brand-50' 
                  : 'border-slate-100 hover:border-brand-200 hover:shadow-md'
              }
          `}
        >
          <div className="p-4 flex flex-wrap items-center gap-4">
              <div className="text-slate-300 cursor-grab active:cursor-grabbing p-1 hover:text-slate-400 transition-colors">
                  <i className="fa-solid fa-grip-vertical text-sm"></i>
              </div>
              
              <div className="h-10 w-10 flex-shrink-0 rounded bg-slate-50 flex items-center justify-center border border-slate-200 overflow-hidden text-slate-400">
                  {task.attachments.length > 0 && task.attachments[0].type.startsWith('image/') ? (
                      <img src={task.attachments[0].url} className="h-full w-full object-cover" alt="" />
                  ) : (
                      <i className="fa-solid fa-layer-group text-sm"></i>
                  )}
              </div>

              <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/task/${task.id}`} className="font-medium text-slate-900 hover:text-brand-600 truncate transition-colors">
                          {task.client.name} {task.client.number ? `- ${task.client.number}` : ''}
                      </Link>
                      <UrgencyBadge level={task.urgency} />
                      {task.deadline && <DeadlineBadge deadline={task.deadline} isFinished={isFinished} size="small" />}
                      {deadlineCountdown && !isFinished && (
                        <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-200">
                          <i className="fa-solid fa-hourglass-half"></i> باقي {deadlineCountdown}
                        </span>
                      )}
                  </div>
                  
                  <div className="text-sm text-slate-600 flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-layer-group text-xs text-slate-400"></i>
                        {task.title}
                      </span>
                      
                      {task.attachments.length > 0 && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                              <i className="fa-solid fa-paperclip text-[10px]"></i>
                              {task.attachments.length}
                          </span>
                      )}
                      
                      {totalComments > 0 && (
                          <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
                            unresolvedComments > 0 
                              ? 'bg-red-50 text-red-600 border border-red-100' 
                              : 'bg-green-50 text-green-600 border border-green-100'
                          }`}>
                              <i className={unresolvedComments > 0 ? 'fa-solid fa-comment-dots text-[10px]' : 'fa-solid fa-comment-check text-[10px]'}></i>
                              {unresolvedComments > 0 ? `${unresolvedComments} غير محلولة` : `${resolvedComments} محلولة`}
                              {commentsWithReplies > 0 && (
                                <span className="text-[10px]">• {commentsWithReplies} بردود</span>
                              )}
                          </span>
                      )}
                  </div>
                  
                  {/* Hover Details - Description only */}
                  {task.description && (
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {task.description}
                      </p>
                    </div>
                  )}
                  
                  {progress && progress.total > 0 && (
                    <div className="mt-2">
                      <ProgressBar completed={progress.completed} total={progress.total} size="small" />
                    </div>
                  )}
              </div>

              <div className="flex flex-col items-center gap-2">
                <StatusBadge 
                  status={task.status} 
                  clickable={true}
                  onStatusChange={(newStatusId) => handleStatusChange(task.id, newStatusId)}
                  taskId={task.id}
                />
                
                {/* Time Indicators */}
                <div className="flex flex-col items-center gap-1 text-[10px] text-slate-400 text-center">
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-clock"></i>
                    {createdTime}
                  </span>
                </div>
                
                {Permissions.canDeleteTask() && (
                  <button
                    onClick={(e) => handleDeleteClick(task, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all p-2 hover:bg-red-50 rounded-lg"
                    title="حذف المهمة"
                  >
                    <i className="fa-regular fa-trash-can text-sm"></i>
                  </button>
                )}
              </div>
          </div>

          {subtasks.length > 0 && (
              <div className="bg-slate-50 border-t border-slate-200 p-3 rounded-b-lg space-y-2">
                  {(isExpanded ? subtasks : subtasks.slice(0, 3)).map(sub => (
                      <Link 
                        key={sub.id} 
                        to={`/task/${sub.id}`}
                        className="flex flex-wrap items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg transition-colors hover:border-slate-300 cursor-pointer"
                      >
                          <div className="flex-1 text-sm font-medium text-slate-800 flex items-center gap-2 min-w-[150px]">
                              <i className="fa-solid fa-turn-up text-slate-300 text-[10px] ms-1"></i>
                              <span className="hover:text-brand-600 transition-colors">{sub.title}</span>
                              
                              {sub.isVip && <i className="fa-solid fa-crown text-amber-500 text-[10px]" title="VIP"></i>}
                              {sub.urgency === Urgency.URGENT && <i className="fa-solid fa-fire text-red-500 text-[10px]" title="عاجل"></i>}
                              {sub.printingType && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                      sub.printingType === PrintingType.OFFSET 
                                      ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                      : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                  }`}>
                                      {sub.printingType === PrintingType.OFFSET ? 'أوفست' : 'ديجيتال'}
                                  </span>
                              )}
                              {sub.comments && sub.comments.length > 0 && (
                                <span className={`text-[9px] px-1 py-0.5 rounded ${
                                  sub.comments.filter(c => !c.isResolved).length > 0
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-green-50 text-green-600'
                                }`}>
                                  <i className="fa-solid fa-comment"></i>
                                </span>
                              )}
                          </div>
                          <StatusBadge 
                            status={sub.status} 
                            size="small" 
                            clickable={true}
                            onStatusChange={(newStatusId) => handleStatusChange(sub.id, newStatusId)}
                            taskId={sub.id}
                          />
                      </Link>
                  ))}
                  
                  {subtasks.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleTaskExpansion(task.id);
                      }}
                      className="w-full text-center text-xs text-brand-600 hover:text-brand-700 font-medium py-2 hover:bg-white rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <i className="fa-solid fa-chevron-up ml-1 text-[10px]"></i>
                          إخفاء
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-chevron-down ml-1 text-[10px]"></i>
                          عرض {subtasks.length - 3} أخرى
                        </>
                      )}
                    </button>
                  )}
              </div>
          )}
        </motion.div>
      );
  };

  const renderSection = (status: TaskStatus, showMore = false) => {
      const taskList = getTasksByStatus(status.id);
      if (taskList.length === 0) return null;
      
      const themeStyles = StatusService.getThemeStyles(status.color);
      const borderColor = themeStyles.match(/border-([a-z]+)-(\d+)/)?.[0] || 'border-slate-300';
      const textColor = themeStyles.match(/text-([a-z]+)-(\d+)/)?.[0] || 'text-slate-600';

      return (
        <div className="mb-6" key={status.id}>
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${borderColor} ${textColor}`}>
                <i className={`${status.icon} text-base`}></i>
                <h2 className="text-base font-semibold text-slate-900">{status.label}</h2>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">{taskList.length}</span>
                
                {showMore && (
                    <Link to="/finished" className="mr-auto text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                        عرض الكل <i className="fa-solid fa-arrow-left ms-1 text-xs"></i>
                    </Link>
                )}
            </div>
            <div className={viewMode === 'compact' ? 'space-y-2' : 'space-y-2.5'}>
                {showMore ? taskList.slice(0, 5).map(renderTaskCard) : taskList.map(renderTaskCard)}
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-semibold text-slate-900">لوحة المهام</h1>
            <p className="text-slate-600 mt-1 text-sm">تتبع سير العمل من التصميم إلى التسليم</p>
        </div>
        <Link 
            to="/new" 
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow"
        >
            <i className="fa-solid fa-plus text-sm"></i>
            مهمة جديدة
        </Link>
      </div>

      {/* Dashboard Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
              <i className="fa-solid fa-layer-group text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-semibold text-slate-900">{dashboardStats.total}</div>
              <div className="text-xs text-slate-500 mt-0.5">إجمالي المهام</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-200 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <i className="fa-solid fa-clock text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-semibold text-blue-600">{dashboardStats.active}</div>
              <div className="text-xs text-slate-500 mt-0.5">قيد التنفيذ</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-red-200 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
              <i className="fa-solid fa-exclamation-triangle text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-semibold text-red-500">{dashboardStats.overdue}</div>
              <div className="text-xs text-slate-500 mt-0.5">متأخرة</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-green-200 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
              <i className="fa-solid fa-check-circle text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-semibold text-green-600">{dashboardStats.completed}</div>
              <div className="text-xs text-slate-500 mt-0.5">مكتملة</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-orange-200 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
              <i className="fa-solid fa-fire text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-semibold text-orange-500">{dashboardStats.urgent}</div>
              <div className="text-xs text-slate-500 mt-0.5">عاجلة</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Quick Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="bg-white p-4 rounded-lg border border-slate-200"
      >
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
              <i className="fa-solid fa-search text-slate-400 text-sm"></i>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مهمة، عميل، أو وصف..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="fa-solid fa-times text-sm"></i>
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleQuickFilterChange(activeQuickFilter === 'overdue' ? null : 'overdue')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 ${
                activeQuickFilter === 'overdue'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-red-200 hover:bg-red-50'
              }`}
            >
              <i className="fa-solid fa-clock text-xs"></i>
              المتأخرة
            </button>

            <button
              onClick={() => handleQuickFilterChange(activeQuickFilter === 'urgent' ? null : 'urgent')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 ${
                activeQuickFilter === 'urgent'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-orange-200 hover:bg-orange-50'
              }`}
            >
              <i className="fa-solid fa-fire text-xs"></i>
              العاجلة
            </button>

            {(activeQuickFilter || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  handleQuickFilterChange(null);
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
                مسح
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filter & View Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filters */}
        <div className="flex-1 flex flex-wrap items-center gap-2 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
          <div className="text-sm font-medium text-slate-400 ps-1 border-e border-slate-200 pe-3">
              <i className="fa-solid fa-filter me-2 text-xs"></i>
          </div>
          
          <button
            onClick={() => setActiveStatusFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-2 ${
                activeStatusFilter === null
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            الكل
            <span className={`px-1.5 rounded-full text-[10px] ${activeStatusFilter === null ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {rootTasks.length}
            </span>
          </button>

          {activeStatuses.map(status => {
               const style = StatusService.getThemeStyles(status.color);
               return (
                  <button
                    key={status.id}
                    onClick={() => setActiveStatusFilter(activeStatusFilter === status.id ? null : status.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-2 ${
                        activeStatusFilter === status.id
                        ? 'ring-1 ring-brand-500/30 ' + style
                        : 'opacity-70 hover:opacity-100 ' + style
                    }`}
                  >
                    {status.label}
                    <span className="bg-white/60 px-1.5 rounded-full text-[10px] border border-black/5">
                        {tasksByStatusCount[status.id]}
                    </span>
                  </button>
               )
          })}
        </div>

        {/* View & Sort Controls */}
        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
          {/* View Mode */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                ? 'bg-brand-50 text-brand-600'
                : 'text-slate-500 hover:bg-slate-50'
              }`}
              title="عرض قائمة"
            >
              <i className="fa-solid fa-list text-sm"></i>
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'compact'
                ? 'bg-brand-50 text-brand-600'
                : 'text-slate-500 hover:bg-slate-50'
              }`}
              title="عرض مدمج"
            >
              <i className="fa-solid fa-bars text-sm"></i>
            </button>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSortOption('default')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortOption === 'default'
                ? 'bg-brand-50 text-brand-600 border border-brand-200'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
              title="ترتيب افتراضي"
            >
              افتراضي
            </button>
            <button
              onClick={() => setSortOption('deadline')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortOption === 'deadline'
                ? 'bg-brand-50 text-brand-600 border border-brand-200'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
              title="ترتيب حسب الموعد"
            >
              <i className="fa-solid fa-calendar-days text-xs"></i>
            </button>
            <button
              onClick={() => setSortOption('urgency')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortOption === 'urgency'
                ? 'bg-brand-50 text-brand-600 border border-brand-200'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
              title="ترتيب حسب الأولوية"
            >
              <i className="fa-solid fa-fire text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-5">
          {rootTasks.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-300"
              >
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-xl">
                      <i className="fa-solid fa-clipboard-list"></i>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    {searchQuery ? 'لا توجد نتائج' : 'لا توجد مهام حالياً'}
                  </h3>
                  <p className="text-slate-600 text-sm mb-6">
                    {searchQuery 
                      ? 'جرب البحث بكلمات مختلفة أو امسح الفلاتر'
                      : 'ابدأ بإضافة عملاء ومهام جديدة لتنظيم عملك'
                    }
                  </p>
                  {!searchQuery && (
                    <Link 
                      to="/new" 
                      className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow"
                    >
                      <i className="fa-solid fa-plus text-sm"></i>
                      مهمة جديدة
                    </Link>
                  )}
              </motion.div>
          )}

          {statuses.map(status => {
              if (activeStatusFilter && activeStatusFilter !== status.id) return null;
              return renderSection(status, status.isFinished);
          })}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف المهمة "${taskToDelete?.title}"؟ ${taskToDelete && !taskToDelete.parentId ? 'سيتم حذف جميع المهام الفرعية أيضاً.' : ''}`}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
};
