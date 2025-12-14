
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Urgency, ClientType, Client, Attachment, PrintingType } from '../types';
import { TaskService } from '../services/taskService';
import { ClientService } from '../services/clientService';
import { ProductService } from '../services/productService';
import { StatusService } from '../services/statusService'; // Import StatusService
import { motion, AnimatePresence } from 'framer-motion';

export const CreateTask: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtaskFileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  
  const [regularProductsList, setRegularProductsList] = useState<string[]>([]);
  const [vipProductsList, setVipProductsList] = useState<string[]>([]);

  const [isNewClient, setIsNewClient] = useState(false);
  const [clientSearchName, setClientSearchName] = useState('');
  const [clientSearchCode, setClientSearchCode] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.NORMAL);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientNotes, setClientNotes] = useState(''); 
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [deadline, setDeadline] = useState<string>(''); // موعد التسليم
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    deadline?: string;
  }>({});

  const [newClient, setNewClient] = useState({
    name: '',
    type: ClientType.NEW,
    number: '',
    notes: ''
  });

  const [isVIP, setIsVIP] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [customProductName, setCustomProductName] = useState<string>('');

  // Subtask List State
  const [subtasks, setSubtasks] = useState<{
      title: string, 
      description: string, 
      urgency: Urgency,
      printingType: PrintingType,
      size: string,
      attachments: Attachment[],
      isVip: boolean
  }[]>([]);
  
  // New Subtask Form State
  const [newSubtask, setNewSubtask] = useState<{
    description: string;
    urgency: Urgency;
    printingType: PrintingType;
    size: string;
    attachments: Attachment[];
  }>({
    description: '',
    urgency: Urgency.NORMAL,
    printingType: PrintingType.OFFSET, // Default to OFFSET
    size: '',
    attachments: []
  });

  // Editing Subtask State
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null);
  const [editingSubtaskData, setEditingSubtaskData] = useState<any>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Validation functions
  const validateTitle = (value: string): string | undefined => {
    if (!value || value.trim().length === 0) {
      return 'عنوان المهمة مطلوب';
    }
    if (value.length > 200) {
      return 'عنوان المهمة يجب ألا يتجاوز 200 حرف';
    }
    return undefined;
  };

  const validateDeadline = (value: string): string | undefined => {
    if (!value) return undefined; // Deadline is optional
    
    const deadlineTimestamp = new Date(value).getTime();
    if (isNaN(deadlineTimestamp)) {
      return 'تاريخ غير صالح';
    }
    if (deadlineTimestamp < Date.now()) {
      return 'لا يمكن تحديد موعد تسليم في الماضي';
    }
    return undefined;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    
    // Clear error when user starts typing
    if (validationErrors.title) {
      setValidationErrors(prev => ({ ...prev, title: undefined }));
    }
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDeadline(value);
    
    // Clear error when user changes deadline
    if (validationErrors.deadline) {
      setValidationErrors(prev => ({ ...prev, deadline: undefined }));
    }
  };

  useEffect(() => {
    loadClients();
    loadProducts();

    function handleClickOutside(event: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setShowClientDropdown(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const list = isVIP ? vipProductsList : regularProductsList;
    if (list.length > 0) {
        setSelectedProduct(list[0]);
    }
  }, [isVIP, vipProductsList, regularProductsList]);

  const loadClients = async () => {
    const data = await ClientService.getAll();
    setClients(data);
    // Don't auto-select any client - let user choose
  };

  const loadProducts = async () => {
      const products = await ProductService.getAll();
      const regulars = products.filter(p => !p.isVip).map(p => p.name);
      const vips = products.filter(p => p.isVip).map(p => p.name);
      regulars.push('أخرى');
      vips.push('أخرى');
      setRegularProductsList(regulars);
      setVipProductsList(vips);
      if (regulars.length > 0) setSelectedProduct(regulars[0]);
  };

  const selectClient = (client: Client) => {
      setSelectedClientId(client.id);
      setClientSearchName(client.name);
      setClientSearchCode(client.number);
      setClientNotes(client.notes || '');
      setShowClientDropdown(false);
  };

  const handleNameSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setClientSearchName(val);
      setShowClientDropdown(true);
      const match = clients.find(c => c.name.toLowerCase() === val.toLowerCase());
      if (match) {
          setSelectedClientId(match.id);
          setClientSearchCode(match.number);
          setClientNotes(match.notes || '');
      } else {
          setSelectedClientId('');
          setClientNotes('');
      }
  };

  const handleCodeSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setClientSearchCode(val);
      const match = clients.find(c => c.number.toLowerCase() === val.toLowerCase());
      if (match) {
          setSelectedClientId(match.id);
          setClientSearchName(match.name);
          setClientNotes(match.notes || '');
      } else {
          setSelectedClientId('');
          setClientNotes('');
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];
      Array.from(e.target.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (re) => {
            newAttachments.push({
                id: crypto.randomUUID(),
                name: file.name,
                type: file.type,
                size: file.size,
                url: re.target?.result as string
            });
            if (newAttachments.length === e.target.files?.length) {
                setAttachments(prev => [...prev, ...newAttachments]);
            }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubtaskFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newAttachments: Attachment[] = [];
        Array.from(e.target.files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (re) => {
                newAttachments.push({
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    url: re.target?.result as string
                });
                if (newAttachments.length === e.target.files?.length) {
                    setNewSubtask(prev => ({
                        ...prev,
                        attachments: [...prev.attachments, ...newAttachments]
                    }));
                }
            };
            reader.readAsDataURL(file);
        });
    }
  };

  const removeSubtaskDraftAttachment = (id: string) => {
      setNewSubtask(prev => ({
          ...prev,
          attachments: prev.attachments.filter(a => a.id !== id)
      }));
  };

  const handleCreateClient = async () => {
    if (!newClient.name) return;
    const created = await ClientService.create(newClient);
    setClients(prev => [...prev, created]);
    selectClient(created); 
    setIsNewClient(false); 
    setNewClient({ name: '', type: ClientType.NEW, number: '', notes: '' });
  };

  const handleAddSubtask = () => {
      const productName = selectedProduct === 'أخرى' ? customProductName.trim() : selectedProduct;
      if (!productName || !newSubtask.size.trim()) return;

      const finalTitle = `${productName} - ${newSubtask.size}`;

      setSubtasks(prev => [...prev, {
          ...newSubtask,
          title: finalTitle,
          isVip: isVIP
      }]);

      setNewSubtask({ 
          description: '', 
          urgency: Urgency.NORMAL,
          printingType: PrintingType.OFFSET, // Reset to OFFSET
          size: '',
          attachments: []
      });
      
      const list = isVIP ? vipProductsList : regularProductsList;
      setSelectedProduct(list.length > 0 ? list[0] : '');
      setCustomProductName('');
      if(subtaskFileInputRef.current) subtaskFileInputRef.current.value = '';
  };

  const handleSubtaskInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const productName = selectedProduct === 'أخرى' ? customProductName.trim() : selectedProduct;
          if (productName && newSubtask.size.trim()) {
              handleAddSubtask();
          }
      }
  };

  const removeSubtask = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setSubtasks(prev => prev.filter((_, i) => i !== index));
      if (editingSubtaskIndex === index) {
          cancelEdit();
      }
  };

  // --- Inline Editing Functions ---
  const startEditing = (index: number) => {
      setEditingSubtaskIndex(index);
      setEditingSubtaskData({ ...subtasks[index] });
  };

  const cancelEdit = () => {
      setEditingSubtaskIndex(null);
      setEditingSubtaskData(null);
  };

  const saveEdit = () => {
      if (editingSubtaskIndex !== null && editingSubtaskData) {
          const updatedSubtasks = [...subtasks];
          updatedSubtasks[editingSubtaskIndex] = editingSubtaskData;
          setSubtasks(updatedSubtasks);
          cancelEdit();
      }
  };

  const removeEditAttachment = (id: string) => {
      setEditingSubtaskData((prev: any) => ({
          ...prev,
          attachments: prev.attachments.filter((a: Attachment) => a.id !== id)
      }));
  };
  // --------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const titleError = validateTitle(title);
    const deadlineError = validateDeadline(deadline);
    
    // Set all validation errors
    setValidationErrors({
      title: titleError,
      deadline: deadlineError
    });
    
    // If there are any validation errors, stop submission
    if (titleError || deadlineError) {
      return;
    }
    
    if (!selectedClientId) {
        alert("يرجى اختيار عميل أو إنشاء عميل جديد");
        return;
    }

    if (subtasks.length === 0) {
        alert("يجب إضافة مهمة فرعية (صنف) واحدة على الأقل قبل الحفظ.");
        return;
    }

    setIsSubmitting(true);
    
    if (!isNewClient) {
        const originalClient = clients.find(c => c.id === selectedClientId);
        if (originalClient && originalClient.notes !== clientNotes) {
            await ClientService.update({
                ...originalClient,
                notes: clientNotes
            });
        }
    }

    const defaultStatus = await StatusService.getDefault();

    const taskDTO = {
        title,
        description,
        urgency,
        status: defaultStatus.id, 
        clientId: selectedClientId,
        attachments,
        deadline: deadline ? new Date(deadline).getTime() : undefined
    };

    await TaskService.create(taskDTO, subtasks);
    
    setIsSubmitting(false);
    navigate('/');
  };

  const currentProductList = isVIP ? vipProductsList : regularProductsList;
  const inputHeightClass = "h-11";
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearchName.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">إنشاء مهمة جديدة</h1>
        <p className="text-slate-500">تعيين مهمة لعميل وإضافة مهام فرعية.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Client Selection Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">
                    <i className="fa-regular fa-id-card me-2 text-brand-500"></i>
                    بيانات العميل
                </h2>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={isNewClient}
                        onChange={(e) => setIsNewClient(e.target.checked)}
                        className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-slate-700">عميل جديد</span>
                </label>
            </div>

            <AnimatePresence mode="wait">
            {isNewClient ? (
                <motion.div 
                    key="new-client"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-brand-50 p-4 rounded-lg border border-brand-100 overflow-hidden"
                >
                    <h3 className="text-sm font-bold text-brand-800 mb-3">بيانات العميل الجديد</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-medium text-brand-800 mb-1">اسم العميل <span className="text-red-500">*</span></label>
                             <input
                                type="text"
                                placeholder="اسم العميل"
                                className={`bg-white w-full rounded-md border-slate-300 shadow-sm text-sm px-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${inputHeightClass}`}
                                value={newClient.name}
                                onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-brand-800 mb-1">كود العميل</label>
                             <input
                                type="text"
                                placeholder="كود العميل"
                                className={`bg-white w-full rounded-md border-slate-300 shadow-sm text-sm px-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${inputHeightClass}`}
                                value={newClient.number}
                                onChange={(e) => setNewClient({...newClient, number: e.target.value})}
                            />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-xs font-medium text-brand-800 mb-1">بيانات إضافية / ملاحظات</label>
                             <textarea
                                rows={2}
                                placeholder="عنوان، تفاصيل، ملاحظات عامة..."
                                className="bg-white w-full rounded-md border-slate-300 shadow-sm text-sm p-3 border focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                value={newClient.notes}
                                onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                            />
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={handleCreateClient}
                        className={`mt-3 bg-brand-600 text-white px-4 rounded text-xs font-medium hover:bg-brand-700 ${inputHeightClass}`}
                    >
                        حفظ واختيار العميل
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="existing-client"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="relative" ref={wrapperRef}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">اسم العميل</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={clientSearchName}
                                    onChange={handleNameSearchChange}
                                    onFocus={() => setShowClientDropdown(true)}
                                    placeholder="بحث عن عميل..."
                                    className={`bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 border ${inputHeightClass}`}
                                />
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                    <i className="fa-solid fa-chevron-down text-xs"></i>
                                </div>
                            </div>
                            
                            {showClientDropdown && (
                                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                                    {filteredClients.length === 0 ? (
                                        <li className="text-slate-500 cursor-default select-none relative py-2 pl-3 pr-9 text-center">
                                            لا يوجد نتائج
                                        </li>
                                    ) : (
                                        filteredClients.map((client) => (
                                            <li
                                                key={client.id}
                                                onClick={() => selectClient(client)}
                                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-brand-50 ${selectedClientId === client.id ? 'bg-brand-50 text-brand-900' : 'text-slate-900'}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium">{client.name}</span>
                                                    <span className="text-slate-400 text-xs font-mono">{client.number}</span>
                                                </div>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">كود العميل</label>
                            <input
                                type="text"
                                value={clientSearchCode}
                                onChange={handleCodeSearchChange}
                                placeholder="كود العميل (مثال: C-101)"
                                className={`bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 border font-mono text-end ${inputHeightClass}`}
                                dir="ltr"
                            />
                        </div>
                    </div>
                    
                    {selectedClientId && (
                        <div className="mt-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">
                                 ملاحظات العميل 
                                 <span className="text-[10px] text-brand-600 font-normal ms-2 bg-brand-50 px-2 py-0.5 rounded">
                                     <i className="fa-solid fa-arrows-rotate me-1"></i>
                                     يتم تحديث بيانات العميل تلقائياً عند الحفظ
                                 </span>
                             </label>
                             <textarea
                                 rows={2}
                                 value={clientNotes}
                                 onChange={(e) => setClientNotes(e.target.value)}
                                 className="bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 py-2.5 border"
                                 placeholder="ملاحظات العميل..."
                             />
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </div>

        {/* Main Task Details - 2 Columns */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                <i className="fa-solid fa-layer-group me-2 text-brand-500"></i>
                المهمة الرئيسية
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">عنوان المهمة</label>
                        <input
                            required
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            className={`bg-white w-full rounded-md shadow-sm focus:ring-brand-500 sm:text-sm px-3 border ${inputHeightClass} ${
                              validationErrors.title 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-slate-300 focus:border-brand-500'
                            }`}
                            placeholder="مثال: طلبية شهر مارس"
                        />
                        {validationErrors.title && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {validationErrors.title}
                          </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">مستوى الأولوية</label>
                            <select
                                value={urgency}
                                onChange={(e) => setUrgency(e.target.value as Urgency)}
                                className={`bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 border ${inputHeightClass}`}
                            >
                                <option value={Urgency.NORMAL}>عادي</option>
                                <option value={Urgency.URGENT}>عاجل</option>
                                <option value={Urgency.CRITICAL}>عاجل جداً</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">موعد التسليم (اختياري)</label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={handleDeadlineChange}
                                className={`bg-white w-full rounded-md shadow-sm focus:ring-brand-500 sm:text-sm px-3 border ${inputHeightClass} ${
                                  validationErrors.deadline 
                                    ? 'border-red-500 focus:border-red-500' 
                                    : 'border-slate-300 focus:border-brand-500'
                                }`}
                                dir="ltr"
                            />
                            {validationErrors.deadline && (
                              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                <i className="fa-solid fa-circle-exclamation"></i>
                                {validationErrors.deadline}
                              </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-medium text-slate-700">المرفقات</label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs flex items-center gap-1 bg-white border border-slate-300 px-3 rounded hover:bg-slate-50 text-slate-600 transition-colors h-8"
                            >
                                <i className="fa-solid fa-paperclip"></i>
                                إضافة صور / ملفات
                            </button>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        const newAttachments: Attachment[] = [];
                                        Array.from(e.target.files).forEach((file: File) => {
                                            const reader = new FileReader();
                                            reader.onload = (re) => {
                                                newAttachments.push({
                                                    id: crypto.randomUUID(),
                                                    name: file.name,
                                                    type: file.type,
                                                    size: file.size,
                                                    url: re.target?.result as string
                                                });
                                                if (newAttachments.length === e.target.files?.length) {
                                                    setAttachments(prev => [...prev, ...newAttachments]);
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                    }
                                }}
                                className="hidden"
                            />
                        </div>
                        
                        {attachments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map(att => (
                                    <div key={att.id} className="bg-white border border-slate-200 rounded px-2 py-1 flex items-center gap-2 shadow-sm">
                                        <span className="text-[10px] text-slate-600 max-w-[150px] truncate">{att.name}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => removeAttachment(att.id)} 
                                            className="text-slate-400 hover:text-red-500 text-xs"
                                        >
                                            <i className="fa-solid fa-times"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">لا توجد مرفقات.</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col h-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1">الوصف</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 py-2.5 border flex-1"
                        placeholder="تفاصيل عامة عن الطلبية..."
                    />
                </div>

            </div>
        </div>

        {/* Subtasks Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>
                    <i className="fa-solid fa-list-check me-2 text-brand-500"></i>
                    المهام الفرعية (الأصناف)
                </span>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    ترث بيانات العميل
                </span>
            </h2>

            <div className="space-y-3 mb-6">
                <AnimatePresence mode="popLayout">
                {subtasks.map((task, idx) => (
                    <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {editingSubtaskIndex === idx ? (
                             /* Edit Mode Card */
                             <div className="bg-brand-50 p-4 rounded-lg border-2 border-brand-200 shadow-sm">
                                 <div className="flex justify-between items-center mb-3 pb-2 border-b border-brand-100">
                                     <h3 className="text-sm font-bold text-brand-800">تعديل الصنف #{idx + 1}</h3>
                                     <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
                                         <i className="fa-solid fa-times"></i>
                                     </button>
                                 </div>
                                 <div className="space-y-3">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-brand-700 mb-1">العنوان / الصنف</label>
                                            <input 
                                                type="text" 
                                                value={editingSubtaskData.title}
                                                onChange={(e) => setEditingSubtaskData({...editingSubtaskData, title: e.target.value})}
                                                className={`bg-white w-full rounded-md border-brand-200 shadow-sm text-sm px-3 ${inputHeightClass}`}
                                            />
                                        </div>
                                         <div>
                                            <label className="block text-xs font-medium text-brand-700 mb-1">المقاس</label>
                                            <input 
                                                type="text" 
                                                value={editingSubtaskData.size}
                                                onChange={(e) => setEditingSubtaskData({...editingSubtaskData, size: e.target.value})}
                                                className={`bg-white w-full rounded-md border-brand-200 shadow-sm text-sm px-3 ${inputHeightClass}`}
                                            />
                                        </div>
                                     </div>

                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                          <div className="md:col-span-2">
                                             <label className="block text-xs font-medium text-brand-700 mb-1">نوع الطباعة</label>
                                             <div className={`flex bg-white rounded-md border border-brand-200 p-1 ${inputHeightClass}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSubtaskData({...editingSubtaskData, printingType: PrintingType.OFFSET})}
                                                    className={`flex-1 text-xs font-medium rounded transition-colors h-full ${
                                                        editingSubtaskData.printingType === PrintingType.OFFSET
                                                        ? 'bg-brand-600 text-white shadow-sm'
                                                        : 'text-slate-500 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    طباعة أوفست
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSubtaskData({...editingSubtaskData, printingType: PrintingType.DIGITAL})}
                                                    className={`flex-1 text-xs font-medium rounded transition-colors h-full ${
                                                        editingSubtaskData.printingType === PrintingType.DIGITAL
                                                        ? 'bg-brand-600 text-white shadow-sm'
                                                        : 'text-slate-500 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    طباعة ديجيتال
                                                </button>
                                            </div>
                                          </div>
                                          
                                          <div className="flex flex-col gap-2">
                                              <label className="flex items-center gap-1 cursor-pointer bg-white border border-brand-200 rounded-md px-3 py-2">
                                                  <input 
                                                      type="checkbox"
                                                      checked={editingSubtaskData.isVip}
                                                      onChange={(e) => setEditingSubtaskData({...editingSubtaskData, isVip: e.target.checked})}
                                                      className="rounded text-amber-500 focus:ring-amber-500"
                                                  />
                                                  <span className="text-xs font-bold text-amber-600">VIP</span>
                                              </label>
                                              <select
                                                  value={editingSubtaskData.urgency}
                                                  onChange={(e) => setEditingSubtaskData({...editingSubtaskData, urgency: e.target.value as Urgency})}
                                                  className="bg-white w-full rounded-md border-brand-200 shadow-sm text-xs px-2 py-2"
                                              >
                                                  <option value={Urgency.NORMAL}>عادي</option>
                                                  <option value={Urgency.URGENT}>عاجل</option>
                                                  <option value={Urgency.CRITICAL}>عاجل جداً</option>
                                              </select>
                                          </div>
                                     </div>

                                     <div>
                                         <label className="block text-xs font-medium text-brand-700 mb-1">الوصف</label>
                                         <textarea 
                                             rows={2}
                                             value={editingSubtaskData.description}
                                             onChange={(e) => setEditingSubtaskData({...editingSubtaskData, description: e.target.value})}
                                             className="bg-white w-full rounded-md border-brand-200 shadow-sm text-sm p-2"
                                         />
                                     </div>
                                     
                                     {editingSubtaskData.attachments && editingSubtaskData.attachments.length > 0 && (
                                         <div>
                                             <label className="block text-xs font-medium text-brand-700 mb-1">المرفقات الحالية</label>
                                             <div className="flex flex-wrap gap-2">
                                                {editingSubtaskData.attachments.map((att: Attachment) => (
                                                    <div key={att.id} className="bg-white border border-brand-200 rounded px-2 py-1 flex items-center gap-2 shadow-sm">
                                                        <span className="text-[10px] text-slate-600 max-w-[100px] truncate">{att.name}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeEditAttachment(att.id)}
                                                            className="text-slate-400 hover:text-red-500 text-xs"
                                                        >
                                                            <i className="fa-solid fa-times"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                             </div>
                                         </div>
                                     )}
                                     
                                     <div className="flex justify-end gap-2 pt-2">
                                          <button 
                                            type="button" 
                                            onClick={cancelEdit}
                                            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
                                          >
                                              إلغاء
                                          </button>
                                          <button 
                                            type="button" 
                                            onClick={saveEdit}
                                            className="px-4 py-1.5 text-xs bg-brand-600 text-white rounded hover:bg-brand-700 shadow-sm"
                                          >
                                              حفظ التعديلات
                                          </button>
                                     </div>
                                 </div>
                             </div>
                        ) : (
                             /* View Mode Card */
                            <div 
                                onClick={() => startEditing(idx)}
                                className="bg-slate-50 p-4 rounded-lg border border-slate-200 group relative cursor-pointer hover:border-brand-300 hover:bg-white hover:shadow-md transition-all"
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full pointer-events-none">
                                        اضغط للتعديل <i className="fa-solid fa-pen ms-1"></i>
                                    </span>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 pointer-events-none"> {/* Disable pointer events on content to ensure click triggers edit */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-slate-400 text-xs font-mono">#{idx + 1}</span>
                                            <span className="font-bold text-slate-800">{task.title}</span>
                                            
                                            {task.isVip && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-600 font-bold flex items-center gap-1">
                                                    <i className="fa-solid fa-crown text-[8px]"></i> VIP
                                                </span>
                                            )}

                                            {task.urgency === Urgency.CRITICAL && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold">عاجل جداً</span>
                                            )}
                                            {task.urgency === Urgency.URGENT && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 border border-red-200 text-red-600 font-bold">عاجل</span>
                                            )}
                                            
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-600 flex items-center gap-1">
                                                <i className="fa-solid fa-print"></i>
                                                {task.printingType === PrintingType.OFFSET ? 'أوفست' : 'طباعة ديجيتال'}
                                            </span>
                                            {task.attachments.length > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 flex items-center gap-1">
                                                    <i className="fa-solid fa-paperclip"></i>
                                                    {task.attachments.length}
                                                </span>
                                            )}
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                                        )}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={(e) => removeSubtask(idx, e)} 
                                        className="text-slate-400 hover:text-red-500 p-1 z-10 relative" // Ensure delete button is clickable
                                        title="حذف"
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
                </AnimatePresence>
                
                {subtasks.length === 0 && (
                    <div className="text-center text-sm py-2 italic bg-red-50 rounded border border-red-100 text-red-500">
                        يجب إضافة مهمة فرعية (صنف) واحدة على الأقل للاستمرار
                    </div>
                )}
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3">إضافة صنف (مهمة فرعية)</h3>
                <div className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                             <div className="flex justify-between items-end">
                                <label className="block text-xs font-medium text-slate-500">اسم الصنف</label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={isVIP}
                                        onChange={(e) => setIsVIP(e.target.checked)}
                                        className="w-3.5 h-3.5 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                                    />
                                    <span className="text-xs font-bold text-amber-600">VIP</span>
                                </label>
                             </div>
                             <select
                                value={selectedProduct}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                                className={`bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm px-3 border ${inputHeightClass}`}
                            >
                                {currentProductList.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                         {selectedProduct === 'أخرى' && (
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">حدد اسم الصنف</label>
                                <input
                                    type="text"
                                    value={customProductName}
                                    onChange={(e) => setCustomProductName(e.target.value)}
                                    onKeyDown={handleSubtaskInputKeyDown}
                                    placeholder="اكتب اسم الصنف هنا..."
                                    className={`bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm px-3 border ${inputHeightClass}`}
                                />
                             </div>
                        )}
                        
                        <div className={selectedProduct === 'أخرى' ? 'md:col-span-2' : ''}>
                             <label className="block text-xs font-medium text-slate-500 mb-1">المقاس</label>
                             <input
                                type="text"
                                value={newSubtask.size}
                                onChange={(e) => setNewSubtask({...newSubtask, size: e.target.value})}
                                onKeyDown={handleSubtaskInputKeyDown}
                                placeholder="المقاس (مثال: A4, 10x15)"
                                className={`bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm px-3 border ${inputHeightClass}`}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="md:col-span-2">
                             <label className="block text-xs font-medium text-slate-500 mb-1">نوع الطباعة</label>
                             <div className={`flex bg-white rounded-md border border-slate-300 p-1 ${inputHeightClass}`}>
                                <button
                                    type="button"
                                    onClick={() => setNewSubtask({...newSubtask, printingType: PrintingType.OFFSET})}
                                    className={`flex-1 text-xs font-medium rounded transition-colors h-full ${
                                        newSubtask.printingType === PrintingType.OFFSET
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    طباعة أوفست
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewSubtask({...newSubtask, printingType: PrintingType.DIGITAL})}
                                    className={`flex-1 text-xs font-medium rounded transition-colors h-full ${
                                        newSubtask.printingType === PrintingType.DIGITAL
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    طباعة ديجيتال
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">الأولوية</label>
                            <select
                                value={newSubtask.urgency}
                                onChange={(e) => setNewSubtask({...newSubtask, urgency: e.target.value as Urgency})}
                                className={`bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm px-3 border ${inputHeightClass}`}
                            >
                                <option value={Urgency.NORMAL}>عادي</option>
                                <option value={Urgency.URGENT}>عاجل</option>
                                <option value={Urgency.CRITICAL}>عاجل جداً</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">ملاحظات / وصف (اختياري)</label>
                        <textarea
                            rows={2}
                            value={newSubtask.description}
                            onChange={(e) => setNewSubtask({...newSubtask, description: e.target.value})}
                            placeholder="أي تفاصيل إضافية..."
                            className="bg-white w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 py-2.5 border"
                        />
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => subtaskFileInputRef.current?.click()}
                                className="text-xs flex items-center gap-1 bg-white border border-slate-300 px-3 rounded hover:bg-slate-50 text-slate-600 transition-colors h-8"
                            >
                                <i className="fa-solid fa-paperclip"></i>
                                إضافة صور / ملفات
                            </button>
                            <input
                                type="file"
                                multiple
                                ref={subtaskFileInputRef}
                                onChange={handleSubtaskFileChange}
                                className="hidden"
                            />
                        </div>
                        
                        {newSubtask.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {newSubtask.attachments.map(att => (
                                    <div key={att.id} className="bg-white border border-slate-200 rounded px-2 py-1 flex items-center gap-2 shadow-sm">
                                        <span className="text-[10px] text-slate-600 max-w-[100px] truncate">{att.name}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => removeSubtaskDraftAttachment(att.id)}
                                            className="text-slate-400 hover:text-red-500 text-xs"
                                        >
                                            <i className="fa-solid fa-times"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        type="button" 
                        onClick={handleAddSubtask}
                        disabled={!newSubtask.size.trim() || (selectedProduct === 'أخرى' && !customProductName.trim())}
                        className={`w-full bg-slate-800 text-white px-4 rounded-md hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium ${inputHeightClass}`}
                    >
                        <i className="fa-solid fa-plus ms-1"></i>
                        إضافة للقائمة
                    </button>
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-4">
            <button
                type="button"
                onClick={() => navigate('/')}
                className={`me-3 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 ${inputHeightClass}`}
            >
                إلغاء
            </button>
            {subtasks.length > 0 && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex justify-center items-center px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 ${inputHeightClass}`}
                >
                    {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء جميع المهام'}
                </motion.button>
            )}
        </div>
      </form>
    </div>
  );
};
