
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { StatusService } from '../services/statusService';
import { Task, Urgency } from '../types';
import { UrgencyBadge } from '../components/UrgencyBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatRelativeDate } from '../utils/dateUtils';
import { motion } from 'framer-motion';

export const FinishedTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'All' | 'Urgent' | 'Normal'>('All');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const allTasks = await TaskService.getAll();
    const allStatuses = StatusService.getAll();
    
    // Find all IDs that mark a status as finished
    const finishedIds = allStatuses.filter(s => s.isFinished).map(s => s.id);
    
    // Filter root tasks that have a "Finished" type status
    const finished = allTasks.filter(t => !t.parentId && finishedIds.includes(t.status));
    
    finished.sort((a, b) => {
        // Priority 1: Urgency (Urgent first)
        if (a.urgency === Urgency.URGENT && b.urgency !== Urgency.URGENT) return -1;
        if (a.urgency !== Urgency.URGENT && b.urgency === Urgency.URGENT) return 1;

        // Priority 2: Newest first
        return b.createdAt - a.createdAt;
    });

    setTasks(finished);
    setLoading(false);
  };

  const filteredTasks = tasks.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClient = clientFilter 
        ? task.client.name.includes(clientFilter) 
        : true;
        
      const matchesUrgency = urgencyFilter === 'All' 
        ? true 
        : task.urgency === urgencyFilter;

      return matchesSearch && matchesClient && matchesUrgency;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" text="جاري التحميل..." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6 text-slate-500 text-sm">
            <Link to="/" className="hover:text-brand-600">الرئيسية</Link>
            <i className="fa-solid fa-chevron-left text-xs"></i>
            <span>الأرشيف</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-box-archive text-brand-500"></i>
                أرشيف المهام المنتهية
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-sm font-bold">
                  {filteredTasks.length}
                </span>
            </h1>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <i className="fa-solid fa-magnifying-glass absolute right-3 top-3 text-slate-400"></i>
                <input
                    type="text"
                    placeholder="بحث في العنوان أو الوصف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
            </div>
            <div className="w-full md:w-48 relative">
                <i className="fa-regular fa-user absolute right-3 top-3 text-slate-400"></i>
                <input
                    type="text"
                    placeholder="تصفية حسب العميل..."
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
            </div>
            <div className="w-full md:w-40">
                <select 
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                    <option value="All">كل الأهمية</option>
                    <option value="Urgent">عاجل</option>
                    <option value="Normal">عادي</option>
                </select>
            </div>
        </div>

        <div className="space-y-3">
            {filteredTasks.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">
                        {tasks.length === 0 ? "لا توجد مهام منتهية حتى الآن." : "لا توجد نتائج مطابقة للبحث."}
                    </p>
                </div>
            ) : (
                filteredTasks.map((task, index) => (
                    <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                    >
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        
                        <div className="flex-1">
                            <Link to={`/task/${task.id}`} className="font-bold text-slate-800 hover:text-brand-600 text-lg">
                                {task.title}
                            </Link>
                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                <span><i className="fa-regular fa-building ms-1"></i> {task.client.name}</span>
                                <span><i className="fa-regular fa-calendar ms-1"></i> {formatRelativeDate(task.createdAt, false)}</span>
                            </div>
                        </div>

                        <UrgencyBadge level={task.urgency} />
                        <StatusBadge status={task.status} />
                    </motion.div>
                ))
            )}
        </div>
    </div>
  );
};
