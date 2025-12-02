import React, { useState, useEffect } from 'react';
import { ClientService } from '../services/clientService';
import { Client } from '../types';

export type FilterType = 'overdue' | 'urgent' | 'client';

/**
 * Props for QuickFilters component
 */
interface QuickFiltersProps {
  /** دالة تُستدعى عند تغيير الفلتر (Callback when filter changes) */
  onFilterChange: (filter: FilterType | null, clientId?: string) => void;
  /** الفلتر النشط حالياً (Currently active filter) */
  activeFilter: FilterType | null;
  /** معرف العميل النشط (Active client ID if client filter is selected) */
  activeClientId?: string;
}

/**
 * QuickFilters Component
 * 
 * مكون شريط الفلاتر السريعة للوصول الفوري للمهام المهمة
 * Quick filters bar for instant access to important tasks
 * 
 * Available Filters:
 * - المتأخرة (Overdue): Tasks past their deadline
 * - العاجلة (Urgent): Tasks with CRITICAL or URGENT priority
 * - حسب العميل (By Client): Tasks for a specific client
 * 
 * Features:
 * - Full keyboard navigation support
 * - Clear filter button
 * - Client dropdown menu
 * - Visual feedback for active filters
 * 
 * @example
 * <QuickFilters 
 *   onFilterChange={(filter, clientId) => setFilter(filter)}
 *   activeFilter={currentFilter}
 *   activeClientId={selectedClientId}
 * />
 */
export const QuickFilters: React.FC<QuickFiltersProps> = ({ 
  onFilterChange, 
  activeFilter,
  activeClientId 
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientMenu, setShowClientMenu] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const clientsData = await ClientService.getAll();
    setClients(clientsData);
  };

  const handleFilterClick = (filter: FilterType) => {
    if (filter === 'client') {
      setShowClientMenu(!showClientMenu);
    } else {
      if (activeFilter === filter) {
        onFilterChange(null);
      } else {
        onFilterChange(filter);
        setShowClientMenu(false);
      }
    }
  };

  const handleClientSelect = (clientId: string) => {
    if (activeClientId === clientId) {
      onFilterChange(null);
    } else {
      onFilterChange('client', clientId);
    }
    setShowClientMenu(false);
  };

  const handleClearFilter = () => {
    onFilterChange(null);
    setShowClientMenu(false);
  };

  const selectedClient = activeClientId ? clients.find(c => c.id === activeClientId) : null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <i className="fa-solid fa-filter"></i>
          <span>فلاتر سريعة:</span>
        </div>

        {/* Overdue Filter */}
        <button
          onClick={() => handleFilterClick('overdue')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFilterClick('overdue');
            }
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
            activeFilter === 'overdue'
              ? 'bg-red-100 text-red-700 border-red-300 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:bg-red-50'
          }`}
          aria-label="فلترة المهام المتأخرة"
          aria-pressed={activeFilter === 'overdue'}
          role="button"
          tabIndex={0}
        >
          <i className="fa-solid fa-clock" aria-hidden="true"></i>
          المتأخرة
        </button>

        {/* Urgent Filter */}
        <button
          onClick={() => handleFilterClick('urgent')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFilterClick('urgent');
            }
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
            activeFilter === 'urgent'
              ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:bg-orange-50'
          }`}
          aria-label="فلترة المهام العاجلة"
          aria-pressed={activeFilter === 'urgent'}
          role="button"
          tabIndex={0}
        >
          <i className="fa-solid fa-fire" aria-hidden="true"></i>
          العاجلة
        </button>

        {/* Client Filter */}
        <div className="relative">
          <button
            onClick={() => handleFilterClick('client')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFilterClick('client');
              } else if (e.key === 'Escape' && showClientMenu) {
                setShowClientMenu(false);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              activeFilter === 'client'
                ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
            aria-label="فلترة حسب العميل"
            aria-pressed={activeFilter === 'client'}
            aria-expanded={showClientMenu}
            aria-haspopup="true"
            role="button"
            tabIndex={0}
          >
            <i className="fa-solid fa-building" aria-hidden="true"></i>
            {selectedClient ? selectedClient.name : 'حسب العميل'}
            <i className={`fa-solid fa-chevron-down text-xs transition-transform ${showClientMenu ? 'rotate-180' : ''}`} aria-hidden="true"></i>
          </button>

          {/* Client Dropdown Menu */}
          {showClientMenu && (
            <div 
              className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px] max-h-[300px] overflow-y-auto"
              role="menu"
              aria-label="قائمة العملاء"
            >
              {clients.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  لا يوجد عملاء
                </div>
              ) : (
                clients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClientSelect(client.id);
                      } else if (e.key === 'Escape') {
                        setShowClientMenu(false);
                      }
                    }}
                    className={`w-full text-right px-4 py-2 text-sm transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                      activeClientId === client.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    role="menuitem"
                    aria-label={`فلترة مهام العميل ${client.name}`}
                    aria-current={activeClientId === client.id ? 'true' : 'false'}
                    tabIndex={0}
                  >
                    <i className="fa-solid fa-building text-xs" aria-hidden="true"></i>
                    <span className="flex-1">{client.name}</span>
                    {client.number && (
                      <span className="text-xs text-slate-400">{client.number}</span>
                    )}
                    {activeClientId === client.id && (
                      <i className="fa-solid fa-check text-blue-600" aria-hidden="true"></i>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Clear Filter Button */}
        {activeFilter && (
          <button
            onClick={handleClearFilter}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClearFilter();
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-2 mr-auto focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            aria-label="إلغاء الفلتر"
            role="button"
            tabIndex={0}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            إلغاء الفلتر
          </button>
        )}
      </div>
    </div>
  );
};
