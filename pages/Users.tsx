import React, { useEffect, useState } from 'react';
import { User, UserService, CreateUserDTO, UpdateUserDTO } from '../services/userService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { Permissions } from '../utils/permissions';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'designer' as 'admin' | 'designer' | 'print_manager',
    phone_number: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadUsers = async () => {
    const data = await UserService.getAll();
    setUsers(data);
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
    setEditingUser(null);
    setErrorMessage('');
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'designer',
      phone_number: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setErrorMessage('');
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      phone_number: user.phone_number || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      if (editingUser) {
        // Update
        const updateData: UpdateUserDTO = {
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          phone_number: formData.phone_number
        };
        
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        await UserService.update(editingUser.id, updateData);
      } else {
        // Create
        if (!formData.password) {
          setErrorMessage('كلمة المرور مطلوبة عند إنشاء مستخدم جديد');
          setIsSubmitting(false);
          return;
        }
        
        const createData: CreateUserDTO = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          phone_number: formData.phone_number
        };
        
        await UserService.create(createData);
      }

      setIsModalOpen(false);
      setIsSubmitting(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      const errMsg = error.message || 'حدث خطأ أثناء حفظ المستخدم';
      if (errMsg.includes('موجود') || errMsg.includes('exists') || errMsg.includes('unique') || errMsg.includes('UNIQUE')) {
        setErrorMessage('اسم المستخدم موجود مسبقاً. الرجاء استخدام اسم مختلف.');
      } else {
        setErrorMessage('حدث خطأ أثناء حفظ المستخدم');
      }
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await UserService.delete(deleteId);
        await loadUsers();
        setDeleteId(null);
      } catch (error: any) {
        alert(error.message || 'حدث خطأ أثناء حذف المستخدم');
        setDeleteId(null);
      }
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await UserService.toggleActive(user.id);
      await loadUsers();
    } catch (error: any) {
      alert(error.message || 'حدث خطأ أثناء تغيير حالة المستخدم');
    }
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(search) ||
      user.first_name.toLowerCase().includes(search) ||
      user.last_name.toLowerCase().includes(search) ||
      (user.email && user.email.toLowerCase().includes(search))
    );
  }).sort((a, b) => new Date(b.date_joined).getTime() - new Date(a.date_joined).getTime());

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'designer': return 'مصمم';
      case 'print_manager': return 'مدير طباعة';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'designer': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'print_manager': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة المستخدمين</h1>
          <p className="text-slate-500 mt-1">عرض وتعديل بيانات المستخدمين والصلاحيات.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
          </div>

          {Permissions.canManageUsers() && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm text-sm whitespace-nowrap"
            >
              <i className="fa-solid fa-user-plus"></i>
              إضافة مستخدم
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white rounded-lg border border-dashed border-slate-300 text-slate-500">
              {searchTerm ? 'لا توجد نتائج مطابقة للبحث.' : 'لا يوجد مستخدمين مضافين.'}
            </div>
          ) : (
            <AnimatePresence>
              {paginatedUsers.map((user) => (
                <motion.div
                  key={user.id}
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
                    {Permissions.canManageUsers() && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-slate-300 hover:text-brand-600 p-2 rounded hover:bg-brand-50 transition-colors"
                          title="تعديل"
                        >
                          <i className="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, user.id)}
                          className="text-slate-300 hover:text-red-500 p-2 rounded hover:bg-red-50 transition-colors"
                          title="حذف"
                        >
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-lg text-slate-800 mb-1">
                    {user.first_name} {user.last_name}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <i className="fa-solid fa-at text-slate-400 w-4"></i>
                      <span className="font-mono" dir="ltr">{user.username}</span>
                    </div>
                    
                    {user.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <i className="fa-solid fa-envelope text-slate-400 w-4"></i>
                        <span className="text-xs" dir="ltr">{user.email}</span>
                      </div>
                    )}
                    
                    {user.phone_number && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <i className="fa-solid fa-phone text-slate-400 w-4"></i>
                        <span dir="ltr">{user.phone_number}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                      
                      {Permissions.canManageUsers() ? (
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
                            user.is_active
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={user.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        >
                          {user.is_active ? (
                            <><i className="fa-solid fa-check me-1"></i>نشط</>
                          ) : (
                            <><i className="fa-solid fa-ban me-1"></i>معطل</>
                          )}
                        </button>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                          user.is_active
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {user.is_active ? (
                            <><i className="fa-solid fa-check me-1"></i>نشط</>
                          ) : (
                            <><i className="fa-solid fa-ban me-1"></i>معطل</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredUsers.length > itemsPerPage && (
        <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-sm text-slate-600">
            عرض {startIndex + 1} - {Math.min(endIndex, filteredUsers.length)} من {filteredUsers.length} مستخدم
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
                  {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الأول <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الأخير <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => {
                      setFormData({...formData, username: e.target.value});
                      setErrorMessage('');
                    }}
                    className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    كلمة المرور {!editingUser && <span className="text-red-500">*</span>}
                    {editingUser && <span className="text-slate-400 text-xs">(اتركها فارغة للإبقاء على القديمة)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    dir="ltr"
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الصلاحية <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="bg-white w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="designer">مصمم</option>
                    <option value="print_manager">مدير طباعة</option>
                    <option value="admin">مدير</option>
                  </select>
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
                <p className="text-sm text-slate-500">هل أنت متأكد من رغبتك في حذف هذا المستخدم؟ سيتم تعطيل الحساب.</p>
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
