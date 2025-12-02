import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatusService } from '../services/statusService';
import { TaskStatus, ColorTheme } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const AVAILABLE_COLORS: { value: ColorTheme; label: string }[] = [
  { value: 'slate', label: 'رمادي' },
  { value: 'red', label: 'أحمر' },
  { value: 'orange', label: 'برتقالي' },
  { value: 'amber', label: 'كهرماني' },
  { value: 'yellow', label: 'أصفر' },
  { value: 'lime', label: 'ليموني' },
  { value: 'green', label: 'أخضر' },
  { value: 'emerald', label: 'زمردي' },
  { value: 'teal', label: 'تركواز' },
  { value: 'cyan', label: 'سماوي' },
  { value: 'sky', label: 'أزرق فاتح' },
  { value: 'blue', label: 'أزرق' },
  { value: 'indigo', label: 'نيلي' },
  { value: 'violet', label: 'بنفسجي' },
  { value: 'purple', label: 'أرجواني' },
  { value: 'fuchsia', label: 'فوشيا' },
  { value: 'pink', label: 'وردي' },
  { value: 'rose', label: 'وردي غامق' },
];

const AVAILABLE_ICONS = [
  'fa-regular fa-clock',
  'fa-solid fa-palette',
  'fa-solid fa-eye',
  'fa-regular fa-comments',
  'fa-regular fa-message-lines',
  'fa-solid fa-hourglass-half',
  'fa-solid fa-hourglass',
  'fa-solid fa-pen',
  'fa-solid fa-edit',
  'fa-solid fa-check-double',
  'fa-solid fa-pen-ruler',
  'fa-solid fa-layer-group',
  'fa-solid fa-layers',
  'fa-solid fa-film',
  'fa-solid fa-check-circle',
  'fa-regular fa-circle-check',
  'fa-solid fa-print',
  'fa-solid fa-printer',
  'fa-solid fa-box-open',
  'fa-solid fa-package',
  'fa-solid fa-pause-circle',
  'fa-regular fa-circle-pause',
  'fa-solid fa-flag-checkered',
  'fa-solid fa-flag',
  'fa-solid fa-ban',
  'fa-solid fa-circle-xmark',
  'fa-solid fa-xmark-circle',
  'fa-solid fa-star',
  'fa-solid fa-fire',
  'fa-solid fa-bolt',
  'fa-solid fa-crown',
];

export const StatusSettings: React.FC = () => {
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    const data = await StatusService.getAll();
    setStatuses(data);
  };

  const handleEdit = (status: TaskStatus) => {
    setEditingStatus({ ...status });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    const newStatus: TaskStatus = {
      id: `status_${Date.now()}`,
      label: '',
      color: 'blue',
      icon: 'fa-solid fa-circle',
      orderIndex: statuses.length,
      isFinished: false,
      allowedNextStatuses: [],
    };
    setEditingStatus(newStatus);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingStatus || !editingStatus.label.trim()) {
      setErrorMessage('يرجى إدخال اسم الحالة');
      return;
    }

    try {
      const existing = statuses.find(s => s.id === editingStatus.id);
      if (existing) {
        await StatusService.update(editingStatus);
      } else {
        await StatusService.add(editingStatus);
      }

      setIsModalOpen(false);
      setEditingStatus(null);
      setErrorMessage('');
      await loadStatuses();
    } catch (error: any) {
      console.error('Error saving status:', error);
      const errMsg = error.message || 'حدث خطأ أثناء حفظ الحالة';
      if (errMsg.includes('موجود مسبقاً') || errMsg.includes('Duplicate') || errMsg.includes('unique') || errMsg.includes('UNIQUE') || errMsg.includes('غير متوقع')) {
        setErrorMessage(`الحالة "${editingStatus.label.trim()}" موجودة مسبقاً. الرجاء استخدام اسم مختلف.`);
      } else {
        setErrorMessage('حدث خطأ أثناء حفظ الحالة');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الحالة؟')) {
      await StatusService.delete(id);
      await loadStatuses();
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newStatuses = [...statuses];
    const draggedIndex = newStatuses.findIndex(s => s.id === draggedId);
    const targetIndex = newStatuses.findIndex(s => s.id === targetId);

    const [removed] = newStatuses.splice(draggedIndex, 1);
    newStatuses.splice(targetIndex, 0, removed);

    setStatuses(newStatuses);
  };

  const handleDragEnd = async () => {
    if (draggedId) {
      await StatusService.reorder(statuses);
      setDraggedId(null);
    }
  };

  const toggleAllowedStatus = (allowedId: string) => {
    if (!editingStatus) return;

    const current = editingStatus.allowedNextStatuses || [];
    const updated = current.includes(allowedId)
      ? current.filter(id => id !== allowedId)
      : [...current, allowedId];

    setEditingStatus({
      ...editingStatus,
      allowedNextStatuses: updated,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">إعدادات الحالات</h1>
          <p className="text-slate-600 mt-1 text-sm">إدارة حالات المهام وتسلسل العمل</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="inline-flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg font-medium transition-all text-sm"
            title="إعادة تعيين للحالات الافتراضية"
          >
            <i className="fa-solid fa-rotate-left text-sm"></i>
            إعادة تعيين
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow"
          >
            <i className="fa-solid fa-plus text-sm"></i>
            إضافة حالة جديدة
          </button>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all"
          >
            <i className="fa-solid fa-arrow-right text-sm"></i>
            رجوع
          </Link>
        </div>
      </div>

      {/* Statuses List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900">الحالات المتاحة ({statuses.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {statuses.map((status, index) => {
            const themeStyles = StatusService.getThemeStyles(status.color);
            const allowedCount = status.allowedNextStatuses?.length || 0;
            
            return (
              <motion.div
                key={status.id}
                layout
                draggable
                onDragStart={() => handleDragStart(status.id)}
                onDragOver={(e) => handleDragOver(e, status.id)}
                onDragEnd={handleDragEnd}
                className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${
                  draggedId === status.id ? 'opacity-40' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="text-slate-300 cursor-grab active:cursor-grabbing">
                  <i className="fa-solid fa-grip-vertical"></i>
                </div>

                {/* Order */}
                <div className="text-sm font-semibold text-slate-400 w-8">
                  {index + 1}
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${themeStyles} min-w-[180px]`}>
                  <i className={`${status.icon} text-sm`}></i>
                  <span className="font-medium text-sm">{status.label}</span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-1">
                  {status.isDefault && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">
                      <i className="fa-solid fa-star text-[10px]"></i> افتراضي
                    </span>
                  )}
                  {status.isFinished && (
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                      <i className="fa-solid fa-flag text-[10px]"></i> نهائي
                    </span>
                  )}
                  {status.isCancelled && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">
                      <i className="fa-solid fa-ban text-[10px]"></i> ملغي
                    </span>
                  )}
                  {!status.isFinished && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                      <i className="fa-solid fa-arrow-left text-[10px]"></i> {allowedCount} حالة تالية
                    </span>
                  )}
                </div>

                {/* Color Circle */}
                <div className="flex items-center gap-2 min-w-[100px]">
                  <div className={`w-6 h-6 rounded-full ${themeStyles.split(' ')[0]}`}></div>
                  <span className="text-xs text-slate-600">
                    {AVAILABLE_COLORS.find(c => c.value === status.color)?.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(status)}
                    className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 p-2 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                  {statuses.length > 1 && index !== 0 && index !== statuses.length - 1 && (
                    <button
                      onClick={() => handleDelete(status.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <i className="fa-regular fa-trash-can"></i>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && editingStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-xl font-semibold text-slate-900">
                  {StatusService.getById(editingStatus.id) ? 'تعديل الحالة' : 'إضافة حالة جديدة'}
                </h2>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                    <i className="fa-solid fa-exclamation-circle mt-0.5"></i>
                    <span className="text-sm">{errorMessage}</span>
                  </div>
                )}
                
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      اسم الحالة <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingStatus.label}
                      onChange={(e) => {
                        setEditingStatus({ ...editingStatus, label: e.target.value });
                        setErrorMessage('');
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="مثال: جاري التصميم"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">اللون</label>
                    <select
                      value={editingStatus.color}
                      onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value as ColorTheme })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    >
                      {AVAILABLE_COLORS.map(color => (
                        <option key={color.value} value={color.value}>{color.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">الأيقونة</label>
                  <div className="grid grid-cols-8 gap-2">
                    {AVAILABLE_ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setEditingStatus({ ...editingStatus, icon })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          editingStatus.icon === icon
                            ? 'border-brand-500 bg-brand-50 text-brand-600'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <i className={icon}></i>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flags */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStatus.isDefault || false}
                      onChange={(e) => setEditingStatus({ ...editingStatus, isDefault: e.target.checked })}
                      className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700">حالة افتراضية (للمهام الجديدة)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStatus.isFinished || false}
                      onChange={(e) => setEditingStatus({ ...editingStatus, isFinished: e.target.checked })}
                      className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700">حالة نهائية (لا يمكن الانتقال منها)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStatus.isCancelled || false}
                      onChange={(e) => setEditingStatus({ ...editingStatus, isCancelled: e.target.checked })}
                      className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700">حالة إلغاء</span>
                  </label>
                </div>

                {/* Allowed Next Statuses */}
                {!editingStatus.isFinished && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      الحالات التالية المسموحة
                      <span className="text-xs text-slate-500 font-normal mr-2">
                        (اترك فارغاً للسماح بجميع الحالات)
                      </span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200">
                      {statuses
                        .filter(s => s.id !== editingStatus.id)
                        .map(status => {
                          const isSelected = editingStatus.allowedNextStatuses?.includes(status.id);
                          const themeStyles = StatusService.getThemeStyles(status.color);
                          
                          return (
                            <label
                              key={status.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                                isSelected ? 'bg-white border-2 border-brand-300' : 'border-2 border-transparent hover:bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAllowedStatus(status.id)}
                                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                              />
                              <div className={`flex items-center gap-2 px-2 py-1 rounded ${themeStyles} flex-1`}>
                                <i className={`${status.icon} text-xs`}></i>
                                <span className="text-xs font-medium">{status.label}</span>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium"
                >
                  <i className="fa-solid fa-check ml-2"></i>
                  حفظ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !isResetting && setIsResetModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600 text-2xl">
                  <i className="fa-solid fa-rotate-left"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">إعادة تعيين الحالات</h3>
                <p className="text-sm text-slate-600 mb-4">
                  هل أنت متأكد من إعادة تعيين جميع الحالات للإعدادات الافتراضية؟
                  <br />
                  <span className="text-orange-600 font-medium">سيتم حذف أي تخصيصات قمت بها.</span>
                </p>
              </div>
              <div className="flex border-t border-slate-100 bg-slate-50 p-4 gap-3 justify-center">
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResetting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    setIsResetting(true);
                    try {
                      await StatusService.resetToDefaults();
                      await loadStatuses();
                      setIsResetModalOpen(false);
                      setTimeout(() => {
                      }, 100);
                    } catch (error) {
                      console.error('Error resetting statuses:', error);
                      alert('❌ حدث خطأ أثناء إعادة التعيين');
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  disabled={isResetting}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      جاري الإعادة...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-rotate-left"></i>
                      إعادة تعيين
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
