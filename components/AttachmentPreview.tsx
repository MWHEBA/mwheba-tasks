import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Attachment } from '../types';

/**
 * Get appropriate icon and color for file type
 */
const getFileTypeIcon = (mimeType: string, fileName: string): { icon: string; color: string } => {
  // Adobe files (check FIRST before image/ to avoid conflicts)
  if (mimeType.includes('photoshop') || fileName.toLowerCase().endsWith('.psd')) {
    return { icon: 'fa-solid fa-layer-group', color: 'text-blue-500' };
  }
  if (mimeType.includes('illustrator') || fileName.toLowerCase().endsWith('.ai')) {
    return { icon: 'fa-solid fa-pen-nib', color: 'text-orange-500' };
  }
  
  // Images
  if (mimeType.startsWith('image/')) {
    return { icon: 'fa-regular fa-image', color: 'text-blue-400' };
  }
  
  // PDF
  if (mimeType === 'application/pdf') {
    return { icon: 'fa-regular fa-file-pdf', color: 'text-red-400' };
  }
  if (mimeType.includes('indesign') || fileName.toLowerCase().endsWith('.indd')) {
    return { icon: 'fa-solid fa-book', color: 'text-pink-500' };
  }
  
  // Documents
  if (mimeType.includes('word') || fileName.toLowerCase().match(/\.(doc|docx)$/)) {
    return { icon: 'fa-regular fa-file-word', color: 'text-blue-600' };
  }
  if (mimeType.includes('excel') || fileName.toLowerCase().match(/\.(xls|xlsx)$/)) {
    return { icon: 'fa-regular fa-file-excel', color: 'text-green-600' };
  }
  if (mimeType.includes('powerpoint') || fileName.toLowerCase().match(/\.(ppt|pptx)$/)) {
    return { icon: 'fa-regular fa-file-powerpoint', color: 'text-orange-600' };
  }
  
  // Archives
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || 
      fileName.toLowerCase().match(/\.(zip|rar|7z|tar|gz)$/)) {
    return { icon: 'fa-regular fa-file-zipper', color: 'text-yellow-600' };
  }
  
  // Video
  if (mimeType.startsWith('video/')) {
    return { icon: 'fa-regular fa-file-video', color: 'text-purple-500' };
  }
  
  // Audio
  if (mimeType.startsWith('audio/')) {
    return { icon: 'fa-regular fa-file-audio', color: 'text-indigo-500' };
  }
  
  // Code
  if (fileName.toLowerCase().match(/\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json|xml)$/)) {
    return { icon: 'fa-regular fa-file-code', color: 'text-green-500' };
  }
  
  // Text
  if (mimeType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt')) {
    return { icon: 'fa-regular fa-file-lines', color: 'text-slate-400' };
  }
  
  // Default
  return { icon: 'fa-regular fa-file', color: 'text-slate-400' };
};

/**
 * Props for AttachmentPreview component
 */
interface AttachmentPreviewProps {
  /** المرفق المراد معاينته (Attachment to preview) */
  attachment: Attachment;
  /** جميع المرفقات للتنقل بينها (All attachments for navigation) */
  allAttachments: Attachment[];
  /** دالة تُستدعى عند الإغلاق (Callback when closing preview) */
  onClose: () => void;
  /** دالة تُستدعى عند حذف مرفق (Callback when deleting attachment) */
  onDelete?: (attachmentId: string) => void;
}

/**
 * AttachmentPreview Component
 * 
 * نافذة منبثقة لمعاينة المرفقات مع أدوات متقدمة
 * Modal for previewing attachments with advanced tools
 * 
 * Features:
 * - Image preview with zoom & pan
 * - PDF preview
 * - Navigation between multiple attachments
 * - Download functionality
 * - Full keyboard support
 * - Thumbnail strip for quick navigation
 * 
 * Keyboard Shortcuts:
 * - ESC: Close preview
 * - ← / →: Navigate between attachments
 * - + / -: Zoom in/out (images only)
 * - 0: Reset zoom
 * 
 * Supported File Types:
 * - Images: Full preview with zoom/pan
 * - PDF: Embedded viewer
 * - Others: Download option
 * 
 * @example
 * <AttachmentPreview 
 *   attachment={selectedAttachment}
 *   allAttachments={task.attachments}
 *   onClose={() => setPreviewOpen(false)}
 * />
 */
export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ 
  attachment, 
  allAttachments, 
  onClose,
  onDelete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });

  // Find current attachment index
  useEffect(() => {
    const index = allAttachments.findIndex(att => att.id === attachment.id);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [attachment.id, allAttachments]);

  // Reset zoom and pan when changing attachments
  useEffect(() => {
    setZoom(1);
    setPanPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const currentAttachment = allAttachments[currentIndex];
  const isImage = currentAttachment?.type.startsWith('image/') && 
                  !currentAttachment?.name.toLowerCase().match(/\.(psd|ai|indd)$/);
  const isPDF = currentAttachment?.type === 'application/pdf';

  // Navigation handlers
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < allAttachments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setStartPanPosition({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setPanPosition({
        x: e.clientX - startPanPosition.x,
        y: e.clientY - startPanPosition.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Download handler
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentAttachment.url;
    link.download = currentAttachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex < allAttachments.length - 1) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowRight' && currentIndex > 0) {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allAttachments.length, onClose, zoom]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="معاينة المرفق"
      >
        {/* Main Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-white">
                <i className={`${isImage ? 'fa-regular fa-image' : 'fa-regular fa-file'} text-lg`}></i>
                <span className="font-medium truncate">{currentAttachment?.name}</span>
              </div>
              <span className="text-slate-400 text-sm">
                {formatFileSize(currentAttachment?.size || 0)}
              </span>
              {allAttachments.length > 1 && (
                <span className="text-slate-400 text-sm">
                  ({currentIndex + 1} / {allAttachments.length})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls (only for images) */}
              {isImage && (
                <>
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/50"
                    title="تصغير (اضغط -)"
                    aria-label="تصغير الصورة"
                    tabIndex={0}
                  >
                    <i className="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i>
                  </button>
                  <span className="text-white text-sm min-w-[3rem] text-center" aria-live="polite" aria-atomic="true">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/50"
                    title="تكبير (اضغط +)"
                    aria-label="تكبير الصورة"
                    tabIndex={0}
                  >
                    <i className="fa-solid fa-magnifying-glass-plus" aria-hidden="true"></i>
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                    title="إعادة تعيين (اضغط 0)"
                    aria-label="إعادة تعيين التكبير"
                    tabIndex={0}
                  >
                    <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
                  </button>
                  <div className="w-px h-6 bg-white/20 mx-1" aria-hidden="true"></div>
                </>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                title="تحميل الملف"
                aria-label="تحميل الملف"
                tabIndex={0}
              >
                <i className="fa-solid fa-download" aria-hidden="true"></i>
              </button>

              {/* Delete Button */}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(currentAttachment.id);
                    onClose();
                  }}
                  className="p-2 text-white hover:bg-red-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  title="حذف المرفق"
                  aria-label="حذف المرفق"
                  tabIndex={0}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                title="إغلاق (اضغط ESC)"
                aria-label="إغلاق المعاينة"
                tabIndex={0}
              >
                <i className="fa-solid fa-times text-xl" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {isImage ? (
              <div
                className={`relative ${zoom > 1 ? 'cursor-move' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <motion.img
                  src={currentAttachment.url}
                  alt={currentAttachment.name}
                  className="max-w-full max-h-[calc(100vh-12rem)] object-contain select-none"
                  style={{
                    transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
                    transition: isPanning ? 'none' : 'transform 0.2s ease-out'
                  }}
                  drag={zoom > 1}
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                />
              </div>
            ) : isPDF ? (
              <iframe
                src={currentAttachment.url}
                className="w-full h-full bg-white rounded-lg"
                title={currentAttachment.name}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-white">
                <i className={`${getFileTypeIcon(currentAttachment.type, currentAttachment.name).icon} text-6xl ${getFileTypeIcon(currentAttachment.type, currentAttachment.name).color}`}></i>
                <div className="text-center">
                  <p className="text-lg font-medium mb-1">{currentAttachment.name}</p>
                  <p className="text-sm text-white/70">لا يمكن معاينة هذا النوع من الملفات</p>
                </div>
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <i className="fa-solid fa-download"></i>
                  تحميل الملف
                </button>
              </div>
            )}
          </div>

          {/* Navigation Arrows */}
          {allAttachments.length > 1 && (
            <>
              {/* Previous Button (Right side in RTL) */}
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                title="المرفق السابق (السهم الأيمن)"
                aria-label="المرفق السابق"
                tabIndex={0}
              >
                <i className="fa-solid fa-chevron-right text-xl" aria-hidden="true"></i>
              </button>

              {/* Next Button (Left side in RTL) */}
              <button
                onClick={handleNext}
                disabled={currentIndex === allAttachments.length - 1}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                title="المرفق التالي (السهم الأيسر)"
                aria-label="المرفق التالي"
                tabIndex={0}
              >
                <i className="fa-solid fa-chevron-left text-xl" aria-hidden="true"></i>
              </button>
            </>
          )}

          {/* Thumbnail Strip (if multiple attachments) */}
          {allAttachments.length > 1 && (
            <div className="p-4 bg-black/50 backdrop-blur-md">
              <div className="flex gap-2 justify-center overflow-x-auto" role="tablist" aria-label="قائمة المرفقات">
                {allAttachments.map((att, index) => (
                  <button
                    key={att.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-white/50 ${
                      index === currentIndex
                        ? 'border-brand-500 ring-2 ring-brand-500/50'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    role="tab"
                    aria-selected={index === currentIndex}
                    aria-label={`المرفق ${index + 1}: ${att.name}`}
                    tabIndex={index === currentIndex ? 0 : -1}
                  >
                    {att.type.startsWith('image/') && !att.name.toLowerCase().match(/\.(psd|ai|indd)$/) ? (
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                        <i className={`${getFileTypeIcon(att.type, att.name).icon} ${getFileTypeIcon(att.type, att.name).color} text-xl`} aria-hidden="true"></i>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
