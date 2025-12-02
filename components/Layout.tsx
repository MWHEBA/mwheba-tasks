
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthService } from '../services/authService';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = AuthService.getStoredUser();

  useEffect(() => {
    if (showUserMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [showUserMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && 
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const isActive = (path: string) => location.pathname === path;
  const navClass = (path: string) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive(path) 
      ? 'bg-brand-50 text-brand-700' 
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  }`;

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans" dir="rtl">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <motion.img 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                src="/Logo.png" 
                alt="MWHEBA Creative Agency" 
                className="h-12 w-auto object-contain"
              />
            </Link>
          </div>
          <nav className="flex items-center gap-2 overflow-x-auto">
            <Link to="/" className={`${navClass('/')} hidden md:flex`}>
              لوحة المهام
            </Link>
            <Link to="/clients" className={`${navClass('/clients')} hidden md:flex`}>
              العملاء
            </Link>
             <Link to="/products" className={`${navClass('/products')} hidden md:flex`}>
              الأصناف
            </Link>
            <Link to="/new" className={`${navClass('/new')} hidden md:flex`}>
              مهمة جديدة
            </Link>
            
            {/* User Menu */}
            {user && (
              <>
                <button
                  ref={buttonRef}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white font-medium">
                    {(user.first_name || user.username).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">
                    {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
                  </span>
                  <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}></i>
                </button>
                
                {showUserMenu && createPortal(
                  <motion.div 
                    ref={menuRef}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="fixed w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[9999]"
                    style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                  >
                    {/* Header */}
                    <div className="bg-brand-600 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-600 font-bold text-lg">
                          {(user.first_name || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">
                            {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
                          </p>
                          <p className="text-brand-100 text-xs flex items-center gap-1.5 mt-0.5">
                            <i className="fa-solid fa-circle text-[6px]"></i>
                            {user.role === 'admin' ? 'مدير النظام' : user.role === 'designer' ? 'مصمم' : 'مدير الطباعة'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* Mobile Only Links */}
                      <div className="md:hidden">
                        <Link
                          to="/clients"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                            <i className="fa-solid fa-user-tie text-sm"></i>
                          </div>
                          <span className="font-medium">العملاء</span>
                        </Link>
                        
                        <Link
                          to="/products"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                            <i className="fa-solid fa-box text-sm"></i>
                          </div>
                          <span className="font-medium">الأصناف</span>
                        </Link>
                        
                        <div className="h-px bg-slate-100 my-2 mx-3"></div>
                      </div>
                      
                      {user.role === 'admin' && (
                        <>
                          <Link
                            to="/users"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                              <i className="fa-solid fa-users text-sm"></i>
                            </div>
                            <span className="font-medium">إدارة المستخدمين</span>
                          </Link>
                          
                          <Link
                            to="/status-settings"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                              <i className="fa-solid fa-list-check text-sm"></i>
                            </div>
                            <span className="font-medium">إدارة الحالات</span>
                          </Link>
                        </>
                      )}
                      
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                          <i className="fa-solid fa-gear text-sm"></i>
                        </div>
                        <span className="font-medium">إعدادات الإشعارات</span>
                      </Link>

                      <div className="h-px bg-slate-100 my-2 mx-3"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                          <i className="fa-solid fa-right-from-bracket text-sm"></i>
                        </div>
                        <span className="font-medium">تسجيل الخروج</span>
                      </button>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 text-center">
                        MWHEBA Tasks 2025
                      </p>
                    </div>
                  </motion.div>,
                  document.body
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          جميع الحقوق محفوظة &copy; {new Date().getFullYear()} <span className="font-bold text-brand-700">مؤسسة موهبة للحلول الدعائية MWHEBA Agency</span>
        </div>
      </footer>
    </div>
  );
};
