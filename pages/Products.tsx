
import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { ProductService } from '../services/productService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Error State
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await ProductService.getAll();
    setProducts(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" text="جاري التحميل..." />
      </div>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      await ProductService.add(newName.trim(), isVip);
      setNewName('');
      await loadProducts();
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('Error adding product:', error);
      const errMsg = error.message || 'حدث خطأ أثناء إضافة الصنف';
      // Check if it's a duplicate error (500 error with duplicate message or 400 with unique constraint)
      if (errMsg.includes('موجود مسبقاً') || errMsg.includes('Duplicate') || errMsg.includes('unique') || errMsg.includes('UNIQUE') || errMsg.includes('غير متوقع')) {
        setErrorMessage(`الصنف "${newName.trim()}" موجود مسبقاً في قائمة الأصناف ${isVip ? 'VIP' : 'العادية'}. الرجاء استخدام اسم مختلف.`);
      } else {
        setErrorMessage('حدث خطأ أثناء إضافة الصنف');
      }
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Stop event bubbling
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
        await ProductService.delete(deleteId);
        await loadProducts();
        setDeleteId(null);
    }
  };

  const regularProducts = products.filter(p => !p.isVip);
  const vipProducts = products.filter(p => p.isVip);

  const renderList = (title: string, items: Product[], icon: string, colorClass: string, emptyMsg: string) => (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className={`font-bold text-lg flex items-center gap-2 ${colorClass}`}>
                  <i className={icon}></i>
                  {title}
              </h2>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full text-xs font-bold text-slate-500">
                  {items.length}
              </span>
          </div>
          <div className="p-2 overflow-y-auto max-h-[500px]">
              {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">{emptyMsg}</div>
              ) : (
                  <AnimatePresence>
                      {items.map(p => (
                          <motion.div 
                            key={p.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg group"
                          >
                              <span className="font-medium text-slate-700">{p.name}</span>
                              <button 
                                onClick={(e) => handleDeleteClick(e, p.id)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded hover:bg-red-50"
                                title="حذف"
                              >
                                  <i className="fa-regular fa-trash-can"></i>
                              </button>
                          </motion.div>
                      ))}
                  </AnimatePresence>
              )}
          </div>
      </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">إدارة الأصناف</h1>
            <p className="text-slate-500 mt-1">إضافة وحذف المنتجات والأصناف المتاحة في النظام.</p>
        </div>

        {/* Add Product Form */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
            <h3 className="text-base font-bold text-slate-800 mb-4">إضافة صنف جديد</h3>
            
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 mb-4">
                    <i className="fa-solid fa-exclamation-circle mt-0.5"></i>
                    <span className="text-sm">{errorMessage}</span>
                </div>
            )}
            
            <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم الصنف</label>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => {
                            setNewName(e.target.value);
                            setErrorMessage('');
                        }}
                        placeholder="مثال: فلاير A5"
                        className="bg-white w-full h-11 rounded-md border-slate-300 shadow-sm px-3 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                </div>
                
                <div className="w-full md:w-auto pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-md px-4 h-11 hover:bg-slate-100 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={isVip}
                            onChange={(e) => setIsVip(e.target.checked)}
                            className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                        />
                        <span className={`text-sm font-bold ${isVip ? 'text-amber-600' : 'text-slate-600'}`}>
                            {isVip ? <><i className="fa-solid fa-crown text-xs me-1"></i> صنف VIP</> : 'صنف عادي'}
                        </span>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !newName.trim()}
                    className="w-full md:w-auto h-11 px-6 bg-brand-600 text-white rounded-md font-medium hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-70 whitespace-nowrap"
                >
                    <i className="fa-solid fa-plus me-2"></i>
                    إضافة
                </button>
            </form>
        </div>

        {loading ? (
             <div className="text-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderList('الأصناف العادية', regularProducts, 'fa-solid fa-layer-group', 'text-brand-600', 'لا توجد أصناف عادية.')}
                {renderList('أصناف VIP', vipProducts, 'fa-solid fa-crown', 'text-amber-600', 'لا توجد أصناف VIP.')}
            </div>
        )}

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
                            <p className="text-sm text-slate-500">هل أنت متأكد من حذف هذا الصنف؟</p>
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
