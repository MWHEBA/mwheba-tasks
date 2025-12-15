import React, { useEffect, useState, useRef, lazy, Suspense, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { StatusService } from '../services/statusService';
import { Task, Attachment, Comment, PrintingType, Urgency } from '../types';
import { UrgencyBadge } from '../components/UrgencyBadge';
import { StatusBadge } from '../components/StatusBadge';
import { TaskStateStepper } from '../components/TaskStateStepper';
import { ActivityLog } from '../components/ActivityLog';
import { DeadlineBadge } from '../components/DeadlineBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatRelativeDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Permissions } from '../utils/permissions';

const AttachmentPreview = lazy(() => import('../components/AttachmentPreview').then(module => ({ default: module.AttachmentPreview })));

type TabType = 'overview' | 'subtasks' | 'attachments' | 'comments' | 'activity';

// Helper function for file type icons
const getFileTypeIcon = (mimeType: string, fileName: string): { icon: string; color: string } => {
  // Adobe files (check before image/ to avoid conflicts)
  if (mimeType.includes('photoshop') || fileName.toLowerCase().endsWith('.psd')) return { icon: 'fa-solid fa-layer-group', color: 'text-blue-500' };
  if (mimeType.includes('illustrator') || fileName.toLowerCase().endsWith('.ai')) return { icon: 'fa-solid fa-pen-nib', color: 'text-orange-500' };
  
  // Regular images
  if (mimeType.startsWith('image/')) return { icon: 'fa-regular fa-image', color: 'text-blue-400' };
  if (mimeType === 'application/pdf') return { icon: 'fa-regular fa-file-pdf', color: 'text-red-400' };
  if (mimeType.includes('word') || fileName.toLowerCase().match(/\.(doc|docx)$/)) return { icon: 'fa-regular fa-file-word', color: 'text-blue-600' };
  if (mimeType.includes('excel') || fileName.toLowerCase().match(/\.(xls|xlsx)$/)) return { icon: 'fa-regular fa-file-excel', color: 'text-green-600' };
  if (mimeType.includes('zip') || fileName.toLowerCase().match(/\.(zip|rar|7z)$/)) return { icon: 'fa-regular fa-file-zipper', color: 'text-yellow-600' };
  if (mimeType.startsWith('video/')) return { icon: 'fa-regular fa-file-video', color: 'text-purple-500' };
  return { icon: 'fa-regular fa-file', color: 'text-slate-400' };
};

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('subtasks');
  
  // Edit States
  const [isEditMainOpen, setIsEditMainOpen] = useState(false);
  const [isEditSubOpen, setIsEditSubOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    urgency: Urgency.NORMAL,
    printingType: undefined as PrintingType | undefined,
    size: '',
    isVip: false
  });

  const [commentText, setCommentText] = useState<{[key: string]: string}>({});
  const [activeCommentBox, setActiveCommentBox] = useState<string | null>(null);
  const hiddenFileInputs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null); 
  const [replyText, setReplyText] = useState<{[key: string]: string}>({});
  
  // Attachment Preview State
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewAttachments, setPreviewAttachments] = useState<Attachment[]>([]);
  
  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ taskId: string; attachmentId: string } | null>(null);
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null); 

  useEffect(() => {
    if (id) {
        loadTask(id);
    }
  }, [id]);

  // Set default tab based on task type
  useEffect(() => {
    if (task) {
      if (task.parentId) {
        // For subtasks, default to attachments
        setActiveTab('attachments');
      } else {
        // For main tasks, default to subtasks
        setActiveTab('subtasks');
      }
    }
  }, [task]);

  const loadTask = useCallback(async (taskId: string) => {
    setLoading(true);
    const data = await TaskService.getById(taskId);
    setTask(data);
    
    if (data) {
        if (data.parentId) {
            const parent = await TaskService.getById(data.parentId);
            setParentTask(parent);
        } else {
            const all = await TaskService.getAll();
            const subs = all.filter(t => t.parentId === taskId);
            setSubtasks(subs);
        }
    }
    setLoading(false);
  }, []);

  const handleDelete = useCallback(async () => {
    if (confirm("هل أنت متأكد أنك تريد حذف هذه المهمة؟ سيتم حذف المهام الفرعية أيضًا.")) {
        if (task) {
            await TaskService.delete(task.id);
            navigate('/');
        }
    }
  }, [task, navigate]);

  const handleSubtaskUpdate = useCallback(async (subId: string, newStatusId: string) => {
     await TaskService.updateStatus(subId, newStatusId);
     loadTask(id!); 
  }, [id, loadTask]);
  
  const handleSelfUpdate = useCallback(async (newStatusId: string) => {
      if(task) {
          await TaskService.updateStatus(task.id, newStatusId);
          loadTask(task.id);
      }
  }, [task, loadTask]);

  const handleAddComment = useCallback(async (targetTaskId: string) => {
      const text = commentText[targetTaskId];
      if (!text?.trim()) return;

      await TaskService.addComment(targetTaskId, text);
      setCommentText(prev => ({...prev, [targetTaskId]: ''}));
      setActiveCommentBox(null);
      loadTask(id!);
  }, [commentText, id, loadTask]);

  const handleResolveComment = useCallback(async (targetTaskId: string, commentId: string) => {
      await TaskService.resolveComment(targetTaskId, commentId);
      loadTask(id!);
  }, [id, loadTask]);

  const handleReplySubmit = useCallback(async (targetTaskId: string, commentId: string) => {
      const text = replyText[commentId];
      if (!text?.trim()) return;

      await TaskService.addReply(targetTaskId, commentId, text);
      setReplyText(prev => ({...prev, [commentId]: ''}));
      setActiveReplyBox(null);
      loadTask(id!);
  }, [replyText, id, loadTask]);

  const handleUploadClick = useCallback((targetTaskId: string) => {
      hiddenFileInputs.current[targetTaskId]?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, targetTaskId: string) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files);
          
          // Upload all files
          for (const file of files) {
              await TaskService.addAttachment(targetTaskId, file);
          }
          
          // Reload task once after all attachments are added
          loadTask(id!);
      }
  }, [id, loadTask]);

  const handleEditMainClick = useCallback(() => {
      if (task) {
          setEditingTask({ ...task });
          setIsEditMainOpen(true);
      }
  }, [task]);

  const handleEditSubClick = useCallback((subtask: Task) => {
      setEditingTask({ ...subtask });
      setIsEditSubOpen(true);
  }, []);

  const saveMainTask = useCallback(async () => {
      if (editingTask) {
          await TaskService.update(editingTask);
          setIsEditMainOpen(false);
          loadTask(id!);
      }
  }, [editingTask, id, loadTask]);

  const saveSubtask = useCallback(async () => {
      if (editingTask) {
          await TaskService.update(editingTask);
          setIsEditSubOpen(false);
          loadTask(id!);
      }
  }, [editingTask, id, loadTask]);

  const handleAddSubtask = useCallback(async () => {
      if (!task || !newSubtask.title.trim()) {
          alert('يجب إدخال عنوان المهمة الفرعية');
          return;
      }

      try {
          await TaskService.addSubtask(task.id, {
              title: newSubtask.title,
              description: newSubtask.description || '',
              urgency: newSubtask.urgency,
              attachments: [],
              printingType: newSubtask.printingType,
              size: newSubtask.size,
              isVip: newSubtask.isVip
          });

          setIsAddSubtaskOpen(false);
          setNewSubtask({
              title: '',
              description: '',
              urgency: Urgency.NORMAL,
              printingType: undefined,
              size: '',
              isVip: false
          });
          loadTask(id!);
      } catch (error) {
          console.error('Failed to add subtask:', error);
          alert('فشل إضافة المهمة الفرعية');
      }
  }, [task, newSubtask, id, loadTask]);

  const handleAttachmentClick = useCallback((attachment: Attachment, allAttachments: Attachment[]) => {
      setPreviewAttachment(attachment);
      setPreviewAttachments(allAttachments);
  }, []);

  const handleDeleteAttachment = useCallback((taskId: string, attachmentId: string) => {
      setAttachmentToDelete({ taskId, attachmentId });
      setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteAttachment = useCallback(async () => {
      if (!attachmentToDelete) return;
      
      try {
          await TaskService.deleteAttachment(attachmentToDelete.taskId, attachmentToDelete.attachmentId);
          loadTask(id!);
      } catch (error) {
          alert('فشل حذف المرفق');
      }
  }, [attachmentToDelete, id, loadTask]);

  const handleDeleteSubtask = useCallback(async () => {
    if (!subtaskToDelete) return;
    
    try {
      await TaskService.delete(subtaskToDelete);
      setSubtaskToDelete(null);
      loadTask(id!);
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      alert('فشل حذف المهمة الفرعية');
    }
  }, [subtaskToDelete, id, loadTask]);

  // Calculate statistics for main task
  const getTaskStats = () => {
    if (!task || task.parentId) return null;
    
    const total = subtasks.length;
    const completed = subtasks.filter(s => StatusService.getById(s.status)?.isFinished).length;
    const inProgress = subtasks.filter(s => !StatusService.getById(s.status)?.isFinished && s.status !== 'Pending').length;
    const pending = subtasks.filter(s => s.status === 'Pending').length;
    const hasComments = subtasks.filter(s => s.status === 'Has Comments').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, inProgress, pending, hasComments, progress };
  };

  const stats = getTaskStats();

  const renderAttachments = (attachments: Attachment[], compact = false) => {
      if (!attachments || attachments.length === 0) return null;
      
      if (compact) {
        return (
          <div className="flex items-center gap-2 flex-wrap">
              {attachments.slice(0, 3).map(att => (
                  <button
                      key={att.id}
                      onClick={() => handleAttachmentClick(att, attachments)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-200 transition-colors text-xs"
                  >
                      <i className={`${getFileTypeIcon(att.type, att.name).icon} ${getFileTypeIcon(att.type, att.name).color}`}></i>
                      <span className="text-slate-600 max-w-[80px] truncate">{att.name}</span>
                  </button>
              ))}
              {attachments.length > 3 && (
                  <span className="text-xs text-slate-500">+{attachments.length - 3} أخرى</span>
              )}
          </div>
        );
      }
      
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {attachments.map(att => (
                <div
                    key={att.id}
                    className="group relative flex flex-col items-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-300 hover:shadow-md transition-all duration-150 cursor-pointer"
                    onClick={() => handleAttachmentClick(att, attachments)}
                >
                    <div className="h-16 w-16 mb-2 flex items-center justify-center text-slate-400 rounded-lg overflow-hidden bg-white">
                        {att.type.startsWith('image/') && !att.name.toLowerCase().match(/\.(psd|ai|indd)$/) ? (
                            <img src={att.url} className="h-full w-full object-cover" alt={att.name} />
                        ) : (
                            <i className={`${getFileTypeIcon(att.type, att.name).icon} ${getFileTypeIcon(att.type, att.name).color} text-2xl`}></i>
                        )}
                    </div>
                    <span className="text-xs text-slate-700 font-medium truncate w-full text-center">{att.name}</span>
                    <span className="text-[10px] text-slate-400">{(att.size / 1024).toFixed(1)} KB</span>
                    
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAttachmentClick(att, attachments);
                            }}
                            className="bg-brand-600 hover:bg-brand-700 text-white rounded-full p-1 text-[10px] transition-colors"
                            title="معاينة المرفق"
                        >
                            <i className="fa-solid fa-eye"></i>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttachment(task?.id || '', att.id);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1 text-[10px] transition-colors"
                            title="حذف المرفق"
                        >
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            ))}
        </div>
      );
  };

  const renderComments = (taskId: string, comments: Comment[]) => {
      if (!comments || comments.length === 0) return null;
      
      // Backend already filters to return only top-level comments
      const unresolvedCount = comments.filter(c => !c.isResolved).length;
      
      return (
          <div className="space-y-2.5">
              {unresolvedCount > 0 && (
                  <div className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                      <i className="fa-solid fa-exclamation-circle text-[10px]"></i>
                      <span>{unresolvedCount} ملاحظة تحتاج إلى معالجة</span>
                  </div>
              )}
              
              {comments.map(c => (
                  <div 
                    key={c.id} 
                    className={`p-3.5 rounded-lg border transition-all ${
                        c.isResolved 
                            ? 'bg-slate-50 border-slate-200 opacity-70' 
                            : 'bg-white border-red-100'
                    }`}
                  >
                      <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className={`text-sm leading-relaxed ${c.isResolved ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                {c.text}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <i className="fa-regular fa-clock text-[10px]"></i>
                                    {formatRelativeDate(c.createdAt, true)}
                                </div>
                                {!c.isResolved && (
                                    <button 
                                        onClick={() => setActiveReplyBox(activeReplyBox === c.id ? null : c.id)}
                                        className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                                    >
                                        <i className="fa-regular fa-comment text-[10px]"></i>
                                        رد
                                    </button>
                                )}
                            </div>
                          </div>
                          
                          {!c.isResolved ? (
                              <button 
                                onClick={() => handleResolveComment(taskId, c.id)}
                                className="text-slate-400 hover:text-green-600 p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                title="تحديد كمحلولة"
                              >
                                  <i className="fa-regular fa-circle-check text-lg"></i>
                              </button>
                          ) : (
                              <div className="text-green-600 p-1.5 bg-green-50 rounded-lg">
                                  <i className="fa-solid fa-check"></i>
                              </div>
                          )}
                      </div>

                      {c.replies && c.replies.length > 0 && (
                          <div className="mt-3 mr-6 space-y-2 border-r-2 border-brand-100 pr-3">
                              {c.replies.map(r => (
                                  <div key={r.id} className="bg-slate-50 p-2.5 rounded-lg">
                                      <div className="text-sm text-slate-700">{r.text}</div>
                                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                        <i className="fa-regular fa-clock text-[10px]"></i>
                                        {formatRelativeDate(r.createdAt, true)}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}

                      <AnimatePresence>
                        {activeReplyBox === c.id && (
                             <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-3 overflow-hidden"
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyText[c.id] || ''}
                                        onChange={(e) => setReplyText({...replyText, [c.id]: e.target.value})}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReplySubmit(taskId, c.id);
                                          }
                                        }}
                                        placeholder="اكتب رداً..."
                                        className="bg-white flex-1 text-sm border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 border px-3 py-2"
                                        autoFocus
                                    />
                                    <button 
                                        onClick={() => handleReplySubmit(taskId, c.id)}
                                        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 flex items-center gap-2"
                                    >
                                        <i className="fa-solid fa-paper-plane"></i>
                                        إرسال
                                    </button>
                                </div>
                            </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
              ))}
          </div>
      );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" text="جاري تحميل التفاصيل..." />
      </div>
    );
  }
  
  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="fa-solid fa-folder-open text-6xl text-slate-300 mb-4"></i>
          <p className="text-slate-500 text-lg">لم يتم العثور على المهمة</p>
          <Link to="/" className="text-brand-600 hover:underline mt-2 inline-block">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const isFinishedStatus = StatusService.getById(task.status)?.isFinished;
  const isMainTask = !task.parentId;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm py-3 border-b border-slate-100">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors px-2 py-1 rounded hover:bg-slate-50"
            >
              <i className="fa-solid fa-house text-xs"></i>
              <span>الرئيسية</span>
            </Link>
            
            {task.parentId && parentTask && (
              <>
                <i className="fa-solid fa-chevron-left text-slate-300 text-[10px]"></i>
                <Link 
                  to={`/task/${parentTask.id}`}
                  className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors px-2 py-1 rounded hover:bg-slate-50"
                >
                  <i className="fa-solid fa-folder-open text-xs"></i>
                  <span className="max-w-[200px] truncate">{parentTask.title}</span>
                </Link>
              </>
            )}
            
            <i className="fa-solid fa-chevron-left text-slate-300 text-[10px]"></i>
            <span className="text-slate-700 font-medium px-2 py-1 bg-slate-100 rounded flex items-center gap-2">
              {isMainTask ? (
                <i className="fa-solid fa-folder text-brand-600 text-xs"></i>
              ) : (
                <i className="fa-solid fa-file text-brand-600 text-xs"></i>
              )}
              <span className="max-w-[200px] truncate">{task.title}</span>
            </span>
          </nav>

          {/* Header Actions */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-900">{task.title}</h1>
              {isMainTask && (
                <button 
                    onClick={handleEditMainClick}
                    className="text-xs text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                    <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                    تعديل
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
                {isFinishedStatus && Permissions.canDeleteTask() && (
                    <button 
                        onClick={handleDelete}
                        className="text-slate-400 hover:text-red-600 transition-colors p-2 bg-slate-50 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
                        title="حذف المهمة"
                    >
                        <i className="fa-regular fa-trash-can text-sm"></i>
                    </button>
                )}
                
                {task.parentId ? (
                     <TaskStateStepper status={task.status} onUpdate={handleSelfUpdate} isSubtask={true} />
                ) : (
                     <StatusBadge status={task.status} />
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Quick Info Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-slate-200 p-5"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                 <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <i className="fa-regular fa-clock text-xs"></i>
                    <span>تم الإنشاء {formatRelativeDate(task.createdAt, false)}</span>
                 </div>
                 <UrgencyBadge level={task.urgency} />
                 
                 {task.deadline && (
                    <DeadlineBadge deadline={task.deadline} isFinished={isFinishedStatus || false} />
                 )}
                 
                 {task.printingType && (
                    <div className="flex items-center gap-2 text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                        <i className="fa-solid fa-print text-xs"></i>
                        <span className="text-sm">{task.printingType === PrintingType.OFFSET ? 'أوفست' : 'ديجيتال'}</span>
                    </div>
                 )}
                 {task.size && (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg">
                        <i className="fa-solid fa-ruler-combined text-xs"></i>
                        <span className="text-sm">{task.size}</span>
                    </div>
                 )}
                 {task.isVip && (
                     <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                         <i className="fa-solid fa-crown text-xs"></i>
                         <span className="text-sm font-semibold">VIP</span>
                     </div>
                 )}
              </div>
            </motion.div>

            {/* Statistics Card - For Main Tasks Only */}
            {isMainTask && stats && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-lg border border-slate-200 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-chart-pie text-brand-600 text-sm"></i>
                    إحصائيات المشروع
                  </h3>
                  <span className="text-xl font-semibold text-brand-600">{stats.progress}%</span>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.progress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="h-full bg-brand-600 rounded-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xl font-semibold text-slate-900">{stats.total}</div>
                    <div className="text-xs text-slate-600 mt-0.5">إجمالي المهام</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="text-xl font-semibold text-green-600">{stats.completed}</div>
                    <div className="text-xs text-slate-600 mt-0.5">مكتملة</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-xl font-semibold text-blue-600">{stats.inProgress}</div>
                    <div className="text-xs text-slate-600 mt-0.5">قيد التنفيذ</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="text-xl font-semibold text-red-600">{stats.hasComments}</div>
                    <div className="text-xs text-slate-600 mt-0.5">بها ملاحظات</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tabs Navigation */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden"
            >
              <div className="border-b border-slate-200">
                <nav className="flex overflow-x-auto">
                  {isMainTask && (
                    <button
                      onClick={() => setActiveTab('subtasks')}
                      className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors relative ${
                        activeTab === 'subtasks'
                          ? 'text-brand-600 bg-brand-50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <i className="fa-solid fa-list-ul ml-2"></i>
                      المهام الفرعية
                      <span className="mr-1 bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-xs">
                        {subtasks.length}
                      </span>
                      {activeTab === 'subtasks' && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute bottom-0 right-0 left-0 h-0.5 bg-brand-600"
                        />
                      )}
                    </button>
                  )}
                  
                  {task.parentId && (
                    <>
                      <button
                        onClick={() => setActiveTab('attachments')}
                        className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors relative ${
                          activeTab === 'attachments'
                            ? 'text-brand-600 bg-brand-50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <i className="fa-solid fa-paperclip ml-2"></i>
                        المرفقات
                        <span className="mr-1 bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-xs">
                          {task.attachments.length}
                        </span>
                        {activeTab === 'attachments' && (
                          <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 right-0 left-0 h-0.5 bg-brand-600"
                          />
                        )}
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('comments')}
                        className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors relative ${
                          activeTab === 'comments'
                            ? 'text-brand-600 bg-brand-50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <i className="fa-solid fa-comments ml-2"></i>
                        الملاحظات
                        {task.comments.filter(c => !c.isResolved).length > 0 && (
                          <span className="mr-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                            {task.comments.filter(c => !c.isResolved).length}
                          </span>
                        )}
                        {activeTab === 'comments' && (
                          <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 right-0 left-0 h-0.5 bg-brand-600"
                          />
                        )}
                      </button>
                    </>
                  )}
                  
                  {task.activityLog && task.activityLog.length > 0 && (
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors relative ${
                        activeTab === 'activity'
                          ? 'text-brand-600 bg-brand-50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <i className="fa-solid fa-clock-rotate-left ml-2"></i>
                      السجل
                      {activeTab === 'activity' && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute bottom-0 right-0 left-0 h-0.5 bg-brand-600"
                        />
                      )}
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'subtasks' && isMainTask && (
                    <motion.div
                      key="subtasks"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <button
                        onClick={() => setIsAddSubtaskOpen(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                      >
                        <i className="fa-solid fa-plus text-sm"></i>
                        <span className="font-medium">إضافة مهمة فرعية</span>
                      </button>

                      {subtasks.length === 0 && (
                        <div className="text-center py-12">
                          <i className="fa-regular fa-folder-open text-5xl text-slate-300 mb-3"></i>
                          <p className="text-slate-500 mb-2">لا توجد مهام فرعية بعد</p>
                          <button 
                            onClick={() => setIsAddSubtaskOpen(true)}
                            className="text-brand-600 hover:underline text-sm"
                          >
                            أضف أول مهمة فرعية
                          </button>
                        </div>
                      )}

                      {subtasks.map((sub, index) => (
                        <motion.div 
                          key={sub.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: index * 0.02 }}
                          className="relative p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => navigate(`/task/${sub.id}`)}
                        >
                          <div className="flex items-start gap-4 mb-3">
                            <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h3 className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                                      {sub.title}
                                  </h3>
                                  <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditSubClick(sub);
                                      }}
                                      className="text-slate-300 hover:text-brand-600 p-1 hover:bg-brand-50 rounded transition-colors z-10"
                                      title="تعديل"
                                  >
                                      <i className="fa-solid fa-pen text-[10px]"></i>
                                  </button>
                                  
                                  {Permissions.canDeleteTask() && (
                                    <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSubtaskToDelete(sub.id);
                                        }}
                                        className="text-slate-300 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors z-10"
                                        title="حذف المهمة الفرعية"
                                    >
                                        <i className="fa-solid fa-trash text-[10px]"></i>
                                    </button>
                                  )}
                                  
                                  {/* Status Stepper next to title */}
                                  <div onClick={(e) => e.stopPropagation()} className="mr-auto">
                                      <TaskStateStepper 
                                          status={sub.status} 
                                          isSubtask={true}
                                          onUpdate={(s) => handleSubtaskUpdate(sub.id, s)} 
                                      />
                                  </div>
                               </div>
                              {sub.description && (
                                <p className="text-sm text-slate-600 mb-2.5">{sub.description}</p>
                              )}
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                  {sub.printingType && (
                                      <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs border border-blue-100">
                                          <i className="fa-solid fa-print text-[10px]"></i>
                                          {sub.printingType === PrintingType.OFFSET ? 'أوفست' : 'ديجيتال'}
                                      </span>
                                  )}
                                  {sub.size && (
                                      <span className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs border border-orange-100">
                                          <i className="fa-solid fa-ruler-combined text-[10px]"></i>
                                          {sub.size}
                                      </span>
                                  )}
                                  {sub.isVip && (
                                       <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-xs border border-amber-200 font-medium">
                                           <i className="fa-solid fa-crown text-[10px]"></i> VIP
                                       </span>
                                  )}
                                  {sub.attachments.length > 0 && (
                                      <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                                          <i className="fa-solid fa-paperclip text-[10px]"></i>
                                          {sub.attachments.length}
                                      </span>
                                  )}
                                  {sub.comments.filter(c => !c.isResolved).length > 0 && (
                                      <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2 py-0.5 rounded text-xs border border-red-100">
                                          <i className="fa-solid fa-exclamation-circle text-[10px]"></i>
                                          {sub.comments.filter(c => !c.isResolved).length} ملاحظة
                                      </span>
                                  )}
                              </div>
                            </div>
                            <UrgencyBadge level={sub.urgency} />
                          </div>
                          
                          <div className="flex items-center justify-end border-t border-slate-100 pt-3 mt-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1.5">
                                  <input 
                                      type="file" multiple className="hidden" 
                                      ref={el => { hiddenFileInputs.current[sub.id] = el; }}
                                      onChange={(e) => handleFileChange(e, sub.id)}
                                  />
                                  <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUploadClick(sub.id);
                                      }}
                                      className="text-slate-400 hover:text-brand-600 p-2 hover:bg-brand-50 rounded-lg transition-colors z-10"
                                      title="رفع ملفات"
                                  >
                                      <i className="fa-solid fa-paperclip text-sm"></i>
                                  </button>

                                  <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCommentBox(activeCommentBox === sub.id ? null : sub.id);
                                      }}
                                      className={`p-2 rounded-lg transition-colors z-10 ${
                                        activeCommentBox === sub.id 
                                          ? 'bg-red-50 text-red-600' 
                                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                      }`}
                                      title="إضافة ملاحظة"
                                  >
                                      <i className="fa-regular fa-comment-dots text-sm"></i>
                                  </button>
                              </div>
                          </div>

                          {sub.attachments.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                              {renderAttachments(sub.attachments, true)}
                            </div>
                          )}

                          {sub.comments.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                              {renderComments(sub.id, sub.comments)}
                            </div>
                          )}
                          
                          <AnimatePresence>
                              {activeCommentBox === sub.id && (
                                  <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="mt-4 pt-4 border-t border-slate-100 overflow-hidden"
                                  >
                                      <div className="flex gap-2">
                                          <input
                                              type="text"
                                              value={commentText[sub.id] || ''}
                                              onChange={(e) => setCommentText({...commentText, [sub.id]: e.target.value})}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                  e.preventDefault();
                                                  handleAddComment(sub.id);
                                                }
                                              }}
                                              placeholder="أضف ملاحظة (سيتم تغيير الحالة إلى يوجد ملاحظات)..."
                                              className="bg-white flex-1 text-sm border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500 border px-3 py-2"
                                          />
                                          <button 
                                              onClick={() => handleAddComment(sub.id)}
                                              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 flex items-center gap-2"
                                          >
                                              <i className="fa-solid fa-paper-plane"></i>
                                              إرسال
                                          </button>
                                      </div>
                                  </motion.div>
                              )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {activeTab === 'attachments' && task.parentId && (
                    <motion.div
                      key="attachments"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold text-slate-900 uppercase">المرفقات</h3>
                          <button 
                            onClick={() => handleUploadClick(task.id)} 
                            className="text-sm text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                          >
                              <i className="fa-solid fa-plus"></i>
                              إضافة ملف
                          </button>
                          <input 
                             type="file" multiple className="hidden" 
                             ref={el => { hiddenFileInputs.current[task.id] = el; }}
                             onChange={(e) => handleFileChange(e, task.id)}
                          />
                      </div>
                      {task.attachments.length > 0 ? (
                        renderAttachments(task.attachments)
                      ) : (
                        <div className="text-center py-12">
                          <i className="fa-regular fa-folder-open text-5xl text-slate-300 mb-3"></i>
                          <p className="text-slate-500">لا توجد مرفقات بعد</p>
                          <button 
                            onClick={() => handleUploadClick(task.id)}
                            className="mt-3 text-brand-600 hover:underline text-sm"
                          >
                            ارفع أول ملف
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'comments' && task.parentId && (
                    <motion.div
                      key="comments"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <h3 className="text-sm font-bold text-slate-900 uppercase mb-4">الملاحظات</h3>
                      
                      {task.comments.length > 0 ? (
                        renderComments(task.id, task.comments)
                      ) : (
                        <div className="text-center py-12">
                          <i className="fa-regular fa-comment text-5xl text-slate-300 mb-3"></i>
                          <p className="text-slate-500">لا توجد ملاحظات بعد</p>
                        </div>
                      )}
                      
                      <div className="mt-6 pt-6 border-t border-slate-200">
                          <div className="flex gap-2">
                              <input
                                  type="text"
                                  value={commentText[task.id] || ''}
                                  onChange={(e) => setCommentText({...commentText, [task.id]: e.target.value})}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleAddComment(task.id);
                                    }
                                  }}
                                  placeholder="أضف ملاحظة جديدة..."
                                  className="bg-white flex-1 text-sm border-slate-300 rounded-lg shadow-sm px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              />
                              <button 
                                  onClick={() => handleAddComment(task.id)}
                                  className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-red-700 flex items-center gap-2 transition-colors"
                              >
                                  <i className="fa-solid fa-paper-plane"></i>
                                  إرسال
                              </button>
                          </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'activity' && task.activityLog && (
                    <motion.div
                      key="activity"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ActivityLog entries={task.activityLog} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <i className="fa-solid fa-user text-brand-600"></i>
                بيانات العميل
              </h3>
              
              <div className="space-y-4">
                  <div>
                      <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">اسم العميل</label>
                      <p className="text-lg font-medium text-slate-900">{task.client.name}</p>
                  </div>
                  
                  <div>
                      <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">كود العميل</label>
                      <p className="text-base text-slate-700 font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        {task.client.number || 'غير متوفر'}
                      </p>
                  </div>
                  
                  <div>
                      <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">نوع العميل</label>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                        task.client.type === 'New' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                          <i className={`fa-solid ${task.client.type === 'New' ? 'fa-star' : 'fa-handshake'}`}></i>
                          {task.client.type === 'New' ? 'عميل جديد' : 'عميل حالي'}
                      </span>
                  </div>
                  
                  {task.client.notes && (
                      <div className="pt-4 border-t border-slate-200">
                          <label className="text-xs text-slate-500 font-semibold uppercase block mb-2">ملاحظات إضافية</label>
                          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                            {task.client.notes}
                          </p>
                      </div>
                  )}
              </div>
            </motion.div>

            {/* Overview Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <i className="fa-solid fa-info-circle text-brand-600"></i>
                نظرة عامة
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 font-semibold uppercase block mb-2">الوصف</label>
                  <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-line leading-relaxed min-h-[60px] p-4 bg-slate-50 rounded-lg border border-slate-200">
                    {task.description && task.description.trim() ? (
                      task.description
                    ) : (
                      <span className="text-slate-400 italic">لا يوجد وصف للمهمة.</span>
                    )}
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="pt-4 border-t border-slate-200">
                  <label className="text-xs text-slate-500 font-semibold uppercase block mb-3">إجراءات سريعة</label>
                  <div className="space-y-2">
                    {task.parentId && (
                      <>
                        <button 
                          onClick={() => handleUploadClick(task.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-200"
                        >
                          <i className="fa-solid fa-paperclip"></i>
                          <span>رفع مرفقات</span>
                        </button>
                        
                        <button 
                          onClick={() => setActiveTab('comments')}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                        >
                          <i className="fa-solid fa-comment-dots"></i>
                          <span>إضافة ملاحظة</span>
                        </button>
                      </>
                    )}
                    
                    {isMainTask && (
                      <button 
                        onClick={handleEditMainClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-200"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                        <span>تعديل المهمة</span>
                      </button>
                    )}
                    
                    <Link
                      to="/"
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                      <span>العودة للرئيسية</span>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Edit Main Task Modal */}
      <AnimatePresence>
          {isEditMainOpen && editingTask && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
                 >
                     <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-gradient-to-l from-brand-50 to-white">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <i className="fa-solid fa-pen-to-square text-brand-600"></i>
                          تعديل بيانات المهمة الرئيسية
                        </h3>
                        <button 
                          onClick={() => setIsEditMainOpen(false)}
                          className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-times text-xl"></i>
                        </button>
                     </div>
                     
                     <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">عنوان المهمة</label>
                             <input 
                                type="text" 
                                value={editingTask.title}
                                onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                                className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                placeholder="أدخل عنوان المهمة"
                             />
                         </div>
                         
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">الوصف</label>
                             <textarea 
                                rows={5}
                                value={editingTask.description}
                                onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                                className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                placeholder="أدخل وصف تفصيلي للمهمة"
                             />
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-semibold text-slate-700 mb-2">مستوى الأولوية</label>
                                 <select
                                    value={editingTask.urgency}
                                    onChange={e => setEditingTask({...editingTask, urgency: e.target.value as Urgency})}
                                    className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                 >
                                     <option value={Urgency.NORMAL}>عادي</option>
                                     <option value={Urgency.URGENT}>عاجل</option>
                                     <option value={Urgency.CRITICAL}>عاجل جداً</option>
                                 </select>
                             </div>
                             
                             <div>
                                 <label className="block text-sm font-semibold text-slate-700 mb-2">موعد التسليم (اختياري)</label>
                                 <input 
                                    type="date" 
                                    value={editingTask.deadline ? new Date(editingTask.deadline).toISOString().slice(0, 10) : ''}
                                    onChange={e => {
                                        const value = e.target.value;
                                        setEditingTask({
                                            ...editingTask, 
                                            deadline: value ? new Date(value).getTime() : undefined
                                        });
                                    }}
                                    className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                 />
                             </div>
                         </div>
                     </div>
                     
                     <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                        <button 
                          onClick={() => setIsEditMainOpen(false)} 
                          className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                        >
                          إلغاء
                        </button>
                        <button 
                          onClick={saveMainTask} 
                          className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center gap-2 transition-colors"
                        >
                          <i className="fa-solid fa-check"></i>
                          حفظ التعديلات
                        </button>
                     </div>
                 </motion.div>
             </div>
          )}
      </AnimatePresence>

      {/* Edit Subtask Modal */}
      <AnimatePresence>
          {isEditSubOpen && editingTask && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
                 >
                     <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-gradient-to-l from-blue-50 to-white">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <i className="fa-solid fa-pen text-blue-600"></i>
                          تعديل المهمة الفرعية
                        </h3>
                        <button 
                          onClick={() => setIsEditSubOpen(false)}
                          className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-times text-xl"></i>
                        </button>
                     </div>
                     
                     <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">اسم الصنف (العنوان)</label>
                             <input 
                                type="text" 
                                value={editingTask.title}
                                onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                                className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="مثال: بروشور، كارت شخصي، فلاير"
                             />
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">المقاس</label>
                                <input 
                                    type="text" 
                                    value={editingTask.size || ''}
                                    onChange={e => setEditingTask({...editingTask, size: e.target.value})}
                                    className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="مثال: A4، 10x15 سم"
                                />
                             </div>
                             
                             <div>
                                 <label className="block text-sm font-semibold text-slate-700 mb-2">نوع الطباعة</label>
                                 <select
                                    value={editingTask.printingType || PrintingType.OFFSET}
                                    onChange={e => setEditingTask({...editingTask, printingType: e.target.value as PrintingType})}
                                    className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 >
                                     <option value={PrintingType.DIGITAL}>ديجيتال</option>
                                     <option value={PrintingType.OFFSET}>أوفست</option>
                                 </select>
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-semibold text-slate-700 mb-2">مستوى الأولوية</label>
                                 <select
                                    value={editingTask.urgency}
                                    onChange={e => setEditingTask({...editingTask, urgency: e.target.value as Urgency})}
                                    className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 >
                                     <option value={Urgency.NORMAL}>عادي</option>
                                     <option value={Urgency.URGENT}>عاجل</option>
                                     <option value={Urgency.CRITICAL}>عاجل جداً</option>
                                 </select>
                             </div>
                             
                             <div className="flex items-end">
                                 <label className="flex items-center gap-2 cursor-pointer pb-3 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200 w-full hover:bg-amber-100 transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={editingTask.isVip || false}
                                        onChange={e => setEditingTask({...editingTask, isVip: e.target.checked})}
                                        className="rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <i className="fa-solid fa-crown text-amber-600"></i>
                                    <span className="text-sm font-semibold text-amber-900">VIP</span>
                                 </label>
                             </div>
                         </div>

                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">الوصف (اختياري)</label>
                             <textarea 
                                rows={4}
                                value={editingTask.description}
                                onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                                className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="تفاصيل إضافية عن المهمة الفرعية"
                             />
                         </div>
                     </div>

                     <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                        <button 
                          onClick={() => setIsEditSubOpen(false)} 
                          className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                        >
                          إلغاء
                        </button>
                        <button 
                          onClick={saveSubtask} 
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                        >
                          <i className="fa-solid fa-check"></i>
                          حفظ التعديلات
                        </button>
                     </div>
                 </motion.div>
             </div>
          )}
      </AnimatePresence>

      {/* Add Subtask Modal */}
      <AnimatePresence>
          {isAddSubtaskOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                 <motion.div
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                 >
                     <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                         <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                             <i className="fa-solid fa-plus text-brand-600"></i>
                             إضافة مهمة فرعية
                         </h2>
                         <button 
                             onClick={() => setIsAddSubtaskOpen(false)}
                             className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                         >
                             <i className="fa-solid fa-times text-lg"></i>
                         </button>
                     </div>

                     <div className="p-6 space-y-4">
                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">عنوان المهمة الفرعية *</label>
                             <input 
                                 type="text" 
                                 value={newSubtask.title}
                                 onChange={e => setNewSubtask({...newSubtask, title: e.target.value})}
                                 className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                 placeholder="مثال: تصميم الغلاف الأمامي"
                                 autoFocus
                             />
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-semibold text-slate-700 mb-2">الحجم</label>
                                 <input 
                                     type="text" 
                                     value={newSubtask.size}
                                     onChange={e => setNewSubtask({...newSubtask, size: e.target.value})}
                                     className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                     placeholder="مثال: A4، 10x15 سم"
                                 />
                             </div>
                             
                             <div>
                                 <label className="block text-sm font-semibold text-slate-700 mb-2">نوع الطباعة</label>
                                 <select
                                    value={newSubtask.printingType || ''}
                                    onChange={e => setNewSubtask({...newSubtask, printingType: e.target.value as PrintingType || undefined})}
                                    className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                 >
                                     <option value="">بدون</option>
                                     <option value={PrintingType.DIGITAL}>ديجيتال</option>
                                     <option value={PrintingType.OFFSET}>أوفست</option>
                                 </select>
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-semibold text-slate-700 mb-2">مستوى الأولوية</label>
                                 <select
                                    value={newSubtask.urgency}
                                    onChange={e => setNewSubtask({...newSubtask, urgency: e.target.value as Urgency})}
                                    className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                 >
                                     <option value={Urgency.NORMAL}>عادي</option>
                                     <option value={Urgency.URGENT}>عاجل</option>
                                     <option value={Urgency.CRITICAL}>عاجل جداً</option>
                                 </select>
                             </div>
                             
                             <div className="flex items-end">
                                 <label className="flex items-center gap-2 cursor-pointer pb-3 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200 w-full hover:bg-amber-100 transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={newSubtask.isVip}
                                        onChange={e => setNewSubtask({...newSubtask, isVip: e.target.checked})}
                                        className="rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <i className="fa-solid fa-crown text-amber-600"></i>
                                    <span className="text-sm font-semibold text-amber-900">VIP</span>
                                 </label>
                             </div>
                         </div>

                         <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">الوصف (اختياري)</label>
                             <textarea 
                                rows={4}
                                value={newSubtask.description}
                                onChange={e => setNewSubtask({...newSubtask, description: e.target.value})}
                                className="w-full bg-white border-slate-300 rounded-lg text-sm px-4 py-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                placeholder="تفاصيل إضافية عن المهمة الفرعية"
                             />
                         </div>
                     </div>

                     <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                        <button 
                          onClick={() => setIsAddSubtaskOpen(false)} 
                          className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                        >
                          إلغاء
                        </button>
                        <button 
                          onClick={handleAddSubtask} 
                          className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center gap-2 transition-colors"
                        >
                          <i className="fa-solid fa-plus"></i>
                          إضافة المهمة
                        </button>
                     </div>
                 </motion.div>
             </div>
          )}
      </AnimatePresence>

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="text-white text-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              جاري التحميل...
            </div>
          </div>
        }>
          <AttachmentPreview
            attachment={previewAttachment}
            allAttachments={previewAttachments}
            onClose={() => setPreviewAttachment(null)}
            onDelete={(attachmentId) => handleDeleteAttachment(task?.id || '', attachmentId)}
          />
        </Suspense>
      )}

      {/* Delete Subtask Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!subtaskToDelete}
        title="حذف المهمة الفرعية"
        message="هل أنت متأكد من حذف هذه المهمة الفرعية؟ سيتم حذف جميع المرفقات والتعليقات المرتبطة بها. لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={handleDeleteSubtask}
        onCancel={() => setSubtaskToDelete(null)}
      />

      {/* Delete Attachment Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="حذف المرفق"
        message="هل أنت متأكد من حذف هذا المرفق؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        onConfirm={confirmDeleteAttachment}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};
