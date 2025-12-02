
import React, { useEffect, useState, useRef } from 'react';
import { Client, ClientType, CreateClientDTO } from '../types';
import { ClientService } from '../services/clientService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { Permissions } from '../utils/permissions';

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null); // State for delete confirmation
  
  // Form State
  const [formData, setFormData] = useState({
      name: '',
      number: '',
      notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadClients();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadClients = async () => {
    const data = await ClientService.getAll();
    setClients(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" text="جاري التحميل..." />
      </div>
    );
  }

  const openAddModal = () => {
      setEditingClient(null);
      setErrorMessage('');
      setFormData({
          name: '',
          number: '',
          notes: ''
      });
      setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
      setEditingClient(client);
      setFormData({
          name: client.name,
          number: client.number,
          notes: client.notes || ''
      });
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    
    try {
      if (editingClient) {
          // Update
          const updated: Client = {
              ...editingClient,
              name: formData.name,
              number: formData.number,
              notes: formData.notes
              // Preserve existing type
          };
          await ClientService.update(updated);
      } else {
          // Create
          const newClient = await ClientService.create({ 
              name: formData.name, 
              number: formData.number, 
              type: ClientType.EXISTING, // Default when adding from Client Board
              notes: formData.notes
          });
          console.log('Client created:', newClient);
      }

      setIsModalOpen(false);
      setIsSubmitting(false);
      
      // Reload clients after modal closes
      const updatedClients = await ClientService.getAll();
      console.log('Clients after reload:', updatedClients.length);
      setClients(updatedClients);
    } catch (error: any) {
      console.error('Error saving client:', error);
      const errMsg = error.message || 'حدث خطأ أثناء حفظ العميل';
      if (errMsg.includes('موجود مسبقاً') || errMsg.includes('Duplicate') || errMsg.includes('unique') || errMsg.includes('UNIQUE')) {
        setErrorMessage('كود العميل موجود مسبقاً. الرجاء استخدام كود مختلف.');
      } else {
        setErrorMessage('حدث خطأ أثناء حفظ العميل');
      }
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await ClientService.delete(deleteId);
          await loadClients();
          setDeleteId(null);
      }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          let text = event.target?.result as string;
          if (!text) return;
          
          // Remove BOM if present (fixes issues with some UTF-8 files)
          if (text.charCodeAt(0) === 0xFEFF) {
              text = text.slice(1);
          }
          
          const lines = text.split(/\r?\n/);
          const newClients: CreateClientDTO[] = [];
          
          // Default column mapping (Legacy: Name, Code)
          let nameIndex = 0;
          let codeIndex = 1;
          let startIndex = 0;

          // Analyze Header to detect column order
          if (lines.length > 0) {
              const headerLine = lines[0];
              // Split by comma but handle quotes if present in header
              const headerParts = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
              
              const hasName = headerParts.some(h => h.includes('الاسم') || h.toLowerCase().includes('name'));
              const hasCode = headerParts.some(h => h.includes('الكود') || h.toLowerCase().includes('code'));
              
              if (hasName || hasCode) {
                  startIndex = 1; // Skip header row
                  const foundNameIdx = headerParts.findIndex(h => h.includes('الاسم') || h.toLowerCase().includes('name'));
                  const foundCodeIdx = headerParts.findIndex(h => h.includes('الكود') || h.toLowerCase().includes('code'));
                  
                  if (foundNameIdx !== -1) nameIndex = foundNameIdx;
                  if (foundCodeIdx !== -1) codeIndex = foundCodeIdx;
              }
          }

          for (let i = startIndex; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              // Robust CSV Split: Split by comma only if not inside quotes
              const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
              
              if (parts.length > Math.max(nameIndex, codeIndex)) {
                  let name = parts[nameIndex]?.trim() || '';
                  let number = parts[codeIndex]?.trim() || '';
                  
                  // Clean quotes around values
                  name = name.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
                  number = number.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
                  
                  if (name) {
                      newClients.push({
                          name,
                          number,
                          type: ClientType.EXISTING,
                          notes: ''
                      });
                  }
              }
          }

          if (newClients.length > 0) {
              setLoading(true);
              try {
                  const result = await ClientService.importBulk(newClients);
                  await loadClients();
                  
                  let message = result.message || `تم استيراد ${result.count} عميل بنجاح`;
                  if (result.errors && result.errors.length > 0) {
                      message += `\n\nتحذير: ${result.errors.length} عميل لم يتم استيراده بسبب أخطاء في البيانات.`;
                  }
                  alert(message);
              } catch (error: any) {
                  console.error('Import error:', error);
                  alert('حدث خطأ أثناء استيراد العملاء. الرجاء المحاولة مرة أخرى.');
              } finally {
                  setLoading(false);
              }
          } else {
              alert('لم يتم العثور على بيانات صالحة في الملف.');
          }
           
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      
      reader.readAsText(file);
  };

  // Filter Logic & Sorting
  const filteredClients = clients.filter(client => {
      const search = searchTerm.toLowerCase();
      return (
          client.name.toLowerCase().includes(search) ||
          (client.number && client.number.toLowerCase().includes(search))
      );
  }).sort((a, b) => {
      // Sort Descending (Largest to Smallest) based on Code
      // Use numeric: true to handle "1, 2, 10" correctly instead of "1, 10, 2"
      const codeA = a.number || '';
      const codeB = b.number || '';
      return codeB.localeCompare(codeA, undefined, { numeric: true });
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">إدارة العملاء</h1>
            <p className="text-slate-500 mt-1">عرض وتعديل بيانات العملاء.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
                <input
                    type="text"
                    placeholder="بحث بالاسم أو الكود..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <i className="fa-solid fa-magnifying-glass"></i>
                </div>
            </div>

            <div className="flex gap-2">
                {Permissions.canCreateClient() && (
                  <>
                    {/* Import Button */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".csv" 
                        className="hidden" 
                    />
                    <button
                        onClick={handleImportClick}
                        className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm text-sm"
                        title="استيراد ملف CSV"
                    >
                        <i className="fa-solid fa-file-import"></i>
                        استيراد
                    </button>

                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm text-sm whitespace-nowrap"
                    >
                        <i className="fa-solid fa-user-plus"></i>
                        إضافة عميل
                    </button>
                  </>
                )}
            </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white rounded-lg border border-dashed border-slate-300 text-slate-500">
              {searchTerm ? 'لا توجد نتائج مطابقة للبحث.' : 'لا يوجد عملاء مضافين.'}
            </div>
          ) : (
            <AnimatePresence>
              {paginatedClients.map((client) => (
                <motion.div
                  key={client.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xl">
                      <i className="fa-regular fa-user"></i>
                    </div>
                    {Permissions.canEditClient() && (
                      <div className="flex gap-1">
                          <button
                              onClick={() => openEditModal(client)}
                              className="text-slate-300 hover:text-brand-600 p-2 rounded hover:bg-brand-50 transition-colors"
                              title="تعديل"
                          >
                              <i className="fa-regular fa-pen-to-square"></i>
                          </button>
                          <button
                              onClick={(e) => handleDeleteClick(e, client.id)}
                              className="text-slate-300 hover:text-red-500 p-2 rounded hover:bg-red-50 transition-colors"
                              title="حذف"
                          >
                              <i className="fa-regular fa-trash-can"></i>
                          </button>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-lg text-slate-800 mb-1">{client.name}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <i className="fa-solid fa-barcode text-slate-400 w-4"></i>
                        <span className="font-mono" dir="ltr">{client.number || '---'}</span>
                    </div>
                    {client.notes && (
                        <div className="flex items-start gap-2 text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                            <i className="fa-regular fa-note-sticky text-slate-400 mt-0.5 w-4"></i>
                            <p className="line-clamp-2 text-xs">{client.notes}</p>
                        </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredClients.length > itemsPerPage && (
        <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-sm text-slate-600">
            عرض {startIndex + 1} - {Math.min(endIndex, filteredClients.length)} من {filteredClients.length} عميل
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Show first, last, current, and adjacent pages
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <span key={page} className="px-2 text-slate-400">...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
                >
                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">
                            {editingClient ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <i className="fa-solid fa-times text-lg"></i>
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                         {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                                <i className="fa-solid fa-exclamation-circle mt-0.5"></i>
                                <span className="text-sm">{errorMessage}</span>
                            </div>
                         )}
                         
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">اسم العميل <span className="text-red-500">*</span></label>
                            <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="اسم العميل الرباعي / اسم الشركة"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">كود العميل</label>
                            <input
                            type="text"
                            value={formData.number}
                            onChange={(e) => setFormData({...formData, number: e.target.value})}
                            className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="C-000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">بيانات إضافية / ملاحظات</label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                placeholder="عنوان، تفاصيل، ملاحظات عامة..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 shadow-sm disabled:opacity-70"
                            >
                                {isSubmitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
                >
                     <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 text-2xl">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">تأكيد الحذف</h3>
                        <p className="text-sm text-slate-500">هل أنت متأكد من رغبتك في حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.</p>
                    </div>
                    <div className="flex border-t border-slate-100 bg-slate-50 p-4 gap-3 justify-center">
                        <button
                            onClick={() => setDeleteId(null)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
                        >
                            حذف نهائي
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
