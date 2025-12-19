import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { Order, OrderFilters, AfterSale, Shop, DashboardStats, AppSettings } from '../types';

const CopyBtn = ({ text, label, className = "" }: { text: string, label?: string, className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      type="button"
      onClick={handleCopy}
      className={className}
      title="点击复制"
    >
      {copied ? (
        <span className="text-emerald-500 font-bold">✓</span>
      ) : (
        label || <span className="text-base">⎘</span>
      )}
    </button>
  );
};

const ActionBtn = ({ icon, label, onClick, color }: { icon: string, label: string, onClick: (e: any) => void, color: string }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium w-full lg:w-auto ${color}`}
    title={label}
  >
    <span className="text-sm">{icon}</span>
    {label}
  </button>
);

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  
  // Get Current User Role
  const currentUser = api.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  
  // Stats for Fulfillment Monitor
  const [monitorStats, setMonitorStats] = useState<DashboardStats['kpi'] | null>(null);

  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    pageSize: 20,
    status: '',
    search: '',
    deepSearch: true,
    tag: '',
    purchaseStatus: '',
    startDate: '',
    endDate: '',
    shopName: '',
    timeFilter: ''
  });

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State for After Sales
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal State for Edit Order
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Edit Order Form Data
  const [editFormData, setEditFormData] = useState({
    contact: '',
    phone: '',
    address: '',
    status: '',
    tag: '',
    purchaseId: '',
    purchaseCost: '',
    purchasePlatform: '拼多多',
    purchaseLogisticsId: '',
    purchaseStatus: 'normal',
    purchaseErrorReason: '无货', // New field for the secondary dropdown
    purchaseDiff: '',
    purchaseNote: ''
  });
  
  // After Sales Form Data
  const [formData, setFormData] = useState({
    type: '仅退款',
    status: '处理中',
    amount: '',
    reason: '质量问题',
    customReason: '',
    upstreamStatus: '待处理',
    upstreamAmount: '',
    logisticsCompany: '',
    logisticsId: ''
  });

  // Load shops and settings for filter
  useEffect(() => {
    api.getShops().then(setShops);
    api.getSettings().then(setAppSettings);
    // Load initial stats for monitoring
    api.getDashboardStats().then(stats => setMonitorStats(stats.kpi));
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getOrders(filters);
      setOrders(data.items);
      setSelectedIds(new Set()); // Reset selection when filters/page changes
      
      // Update monitor stats when shop filter changes (optional, keeps data consistent)
      if (filters.shopName) {
        const stats = await api.getDashboardStats(filters.shopName);
        setMonitorStats(stats.kpi);
      } else {
         const stats = await api.getDashboardStats();
         setMonitorStats(stats.kpi);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value, 
      page: 1,
      // If manually changing filters, we might want to reset specific monitor filters like timeFilter
      // unless specifically setting them. For simplicity, we keep as is.
      // But if user changes Status dropdown, we should probably clear timeFilter to avoid confusion.
      ...(key === 'status' ? { timeFilter: '' } : {}) 
    }));
  };

  const handleMonitorClick = (type: 'pending' | 'risk' | 'overdue' | 'unpurchased') => {
    const baseFilters = {
      page: 1,
      pageSize: 20,
      search: '',
      tag: '',
      startDate: '',
      endDate: '',
      shopName: filters.shopName, // Keep current shop context
      status: '待发货', // All monitor items are based on pending orders
      purchaseStatus: '',
      timeFilter: ''
    };

    switch (type) {
        case 'pending':
            setFilters(baseFilters);
            break;
        case 'risk':
            setFilters({ ...baseFilters, timeFilter: 'risk' });
            break;
        case 'overdue':
            setFilters({ ...baseFilters, timeFilter: 'overdue' });
            break;
        case 'unpurchased':
            setFilters({ ...baseFilters, purchaseStatus: 'not_purchased' });
            break;
    }
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      status: '',
      search: '',
      tag: '',
      purchaseStatus: '',
      startDate: '',
      endDate: '',
      shopName: '',
      timeFilter: ''
    });
  };

  const deleteOrder = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('确认删除此订单吗? 删除后无法恢复。')) return;
    await api.deleteOrder(id);
    loadOrders(); 
  };

  // --- BATCH ACTIONS ---
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length && orders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (!isAdmin) return;
    if (selectedIds.size === 0) return;
    if (!confirm(`确认批量删除选中的 ${selectedIds.size} 个订单吗? 此操作无法撤销。`)) return;

    setLoading(true);
    try {
      // In a real app, you might want a batch delete API endpoint
      await Promise.all(Array.from(selectedIds).map(id => api.deleteOrder(id)));
      setSelectedIds(new Set());
      loadOrders();
      // alert('批量删除成功');
    } catch (e) {
      alert('批量删除部分或全部失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const isAllSelected = orders.length > 0 && selectedIds.size === orders.length;

  // --- EDIT ORDER LOGIC ---
  const handleOpenEdit = (order: Order) => {
    setActiveOrder(order);
    setShowContactInfo(false);
    setEditFormData({
        contact: order.contact,
        phone: order.phone,
        address: order.address,
        status: order.status,
        tag: order.tag || '',
        purchaseId: order.purchaseId || '',
        purchaseCost: order.purchaseCost ? order.purchaseCost.toString() : '',
        purchasePlatform: order.purchasePlatform || (appSettings?.defaultPurchasePlatform || '拼多多'),
        purchaseLogisticsId: order.purchaseLogisticsId || '',
        purchaseStatus: order.purchaseStatus || 'normal',
        purchaseErrorReason: '无货', // Default
        purchaseDiff: order.purchaseDiff ? order.purchaseDiff.toString() : '',
        purchaseNote: order.purchaseNote || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    
    // If not purchased, append the error reason to the note for storage/display if needed, 
    // or you'd save it to a dedicated field if the backend supported it.
    // For now, we keep logic simple.
    let finalNote = editFormData.purchaseNote;
    if (editFormData.purchaseStatus === 'not_purchased' && editFormData.purchaseErrorReason) {
         // Logic optional: Prepend reason to note if needed, or just rely on the UI state
         // finalNote = `[${editFormData.purchaseErrorReason}] ${finalNote}`;
    }

    try {
        await api.saveOrder({
            id: activeOrder.id,
            contact: editFormData.contact,
            phone: editFormData.phone,
            address: editFormData.address,
            status: editFormData.status,
            tag: editFormData.tag,
            purchaseId: editFormData.purchaseId,
            purchaseCost: parseFloat(editFormData.purchaseCost) || 0,
            purchasePlatform: editFormData.purchasePlatform,
            purchaseLogisticsId: editFormData.purchaseLogisticsId,
            purchaseStatus: editFormData.purchaseStatus,
            purchaseDiff: parseFloat(editFormData.purchaseDiff) || 0,
            purchaseNote: finalNote
        });
        setIsEditModalOpen(false);
        loadOrders(); 
        // 简单提示，实际项目中可以使用 Toast
        // alert("订单修改成功！"); 
    } catch (e) {
        alert("修改失败，请重试");
    }
  };


  // --- AFTER SALES LOGIC ---
  const handleOpenAfterSale = (order: Order) => {
    setActiveOrder(order);
    setFormData({
      type: '仅退款',
      status: '处理中',
      amount: order.sellPrice.toString(),
      reason: '质量问题',
      customReason: '',
      upstreamStatus: '待处理',
      upstreamAmount: order.purchaseCost ? order.purchaseCost.toString() : '', // Defaults to Purchase Cost
      logisticsCompany: '',
      logisticsId: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitAfterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const finalReason = formData.reason === '其他' ? formData.customReason : formData.reason;
    if (!finalReason) {
      alert("请输入具体原因");
      return;
    }

    const payload: Partial<AfterSale> = {
      order_id: activeOrder.id,
      purchaseId: activeOrder.purchaseId,
      type: formData.type,
      status: formData.status,
      refund_amount: parseFloat(formData.amount) || 0,
      upstream_refund_amount: parseFloat(formData.upstreamAmount) || 0,
      upstream_status: formData.upstreamStatus,
      reason: finalReason,
      logistics_company: formData.logisticsCompany,
      logistics_id: formData.logisticsId,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      shopName: activeOrder.shopName,
      sellPrice: activeOrder.sellPrice,
      purchaseCost: activeOrder.purchaseCost
    };

    try {
      await api.saveAfterSale(payload);
      setIsModalOpen(false);
    } catch (error) {
      alert("保存工单失败，请重试。");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case '待发货': return 'bg-amber-100 text-amber-800';
      case '已发货': return 'bg-emerald-100 text-emerald-800';
      case '售后中': return 'bg-red-100 text-red-800';
      case '已完成': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getTagColor = (tag?: string) => {
    const map: any = { red: '#ef4444', orange: '#f97316', green: '#10b981', blue: '#3b82f6', purple: '#a855f7' };
    return map[tag || ''] || '#e5e7eb';
  };

  // --- TIMEOUT WARNING LOGIC ---
  const getTimeoutBadge = (orderTime: string, status: string) => {
    // Only check timeout for Pending Shipment status
    if (status !== '待发货' || !appSettings) return null;
    
    // Handle date string compatibility (replace space with T for ISO format)
    const orderDate = new Date(orderTime.replace(' ', 'T'));
    const now = new Date();
    
    // Calculate difference in hours
    const diffMs = now.getTime() - orderDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Timeout Threshold
    if (diffHours > appSettings.overdueHours) {
        const hoursOver = Math.floor(diffHours - appSettings.overdueHours);
        return (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse ml-2" title={`下单时间: ${orderTime}`}>
                ⚠️ 发货超时 ({hoursOver}h)
            </span>
        );
    } 
    // Warning Threshold
    else if (diffHours > appSettings.riskHours) {
        const hoursLeft = Math.floor(appSettings.overdueHours - diffHours);
        return (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100 ml-2" title={`下单时间: ${orderTime}`}>
                ⚡ 即将超时 (剩{hoursLeft}h)
            </span>
        );
    }

    return null;
  };

  const getPurchaseStatusElement = (order: Order) => {
    // Check if explicitly marked as not purchased
    if (order.purchaseStatus === 'not_purchased') {
        return <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">⚠️ 未采购</span>;
    }
    
    // Check specific statuses
    if (order.purchaseStatus === 'increase') {
        return <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1">↗ 涨价</span>;
    }
    if (order.purchaseStatus === 'decrease') {
        return <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">↘ 降价</span>;
    }

    // Default to Purchased if status is normal OR if there is a purchase ID (legacy compatibility)
    if (order.purchaseStatus === 'normal' || (order.purchaseId && String(order.purchaseId).trim().length > 0)) {
        return <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">✔ 已采购</span>;
    }

    // Fallback: No ID and no status implies not purchased
    return <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">⚠️ 未采购</span>;
  };

  // Helper to manage multi-input fields
  const MultiInput = ({ 
    value, 
    onChange, 
    placeholder 
  }: { 
    value: string, 
    onChange: (val: string) => void, 
    placeholder: string 
  }) => {
    // Split by comma, ensure at least one empty string
    const values = value ? value.split(',') : [''];
    if (values.length === 0) values.push('');

    const handleChange = (idx: number, newVal: string) => {
      const newValues = [...values];
      newValues[idx] = newVal;
      onChange(newValues.join(','));
    };

    const handleAdd = () => {
      onChange([...values, ''].join(','));
    };

    const handleRemove = (idx: number) => {
      const newValues = values.filter((_, i) => i !== idx);
      onChange(newValues.length ? newValues.join(',') : '');
    };

    return (
      <div className="space-y-2">
        {values.map((val, idx) => (
          <div key={idx} className="flex gap-2 items-center group">
            <input 
              type="text" 
              className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
              placeholder={placeholder}
              value={val}
              onChange={e => handleChange(idx, e.target.value)}
            />
            {/* Show Add button only on the last item, or Delete button if multiple items exist */}
            {idx === values.length - 1 ? (
              <button 
                type="button"
                onClick={handleAdd}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                title="添加一项"
              >
                <span className="text-lg leading-none font-bold">+</span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => handleRemove(idx)}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-transparent text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                title="删除"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const TAG_OPTIONS = [
    { val: '', color: '#e5e7eb', label: '无' },
    { val: 'red', color: '#ef4444', label: '红标' },
    { val: 'orange', color: '#f97316', label: '橙标' },
    { val: 'green', color: '#10b981', label: '绿标' },
    { val: 'blue', color: '#3b82f6', label: '蓝标' },
    { val: 'purple', color: '#a855f7', label: '紫标' },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Fulfillment Monitor Center */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
         <div className="flex items-center gap-2 mb-4">
             <span className="text-xl">📊</span>
             <h3 className="font-bold text-slate-800">订单履约监控</h3>
             <span className="text-xs text-slate-400 ml-auto">点击卡片筛选订单</span>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {/* Pending Ship Card */}
             <div 
               onClick={() => handleMonitorClick('pending')}
               className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md transition-all cursor-pointer group active:scale-95"
             >
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1 group-hover:underline">待发货总量</span>
                <span className="text-2xl font-bold text-indigo-900">{monitorStats ? monitorStats.pending_ship : '-'}</span>
             </div>

             {/* Unpurchased Card */}
             <div 
               onClick={() => handleMonitorClick('unpurchased')}
               className="bg-cyan-50 border border-cyan-100 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md transition-all cursor-pointer group active:scale-95"
             >
                <span className="text-xs font-bold text-cyan-600 uppercase tracking-wide mb-1 group-hover:underline">🛒 待采购</span>
                <span className="text-2xl font-bold text-cyan-900">{monitorStats ? monitorStats.unpurchased_orders : '-'}</span>
             </div>

             {/* Risk Card */}
             <div 
               onClick={() => handleMonitorClick('risk')}
               className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md transition-all relative overflow-hidden cursor-pointer active:scale-95"
             >
                <div className="absolute top-0 right-0 p-1 opacity-10 text-orange-600 text-4xl font-bold">!</div>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                   ⚡ 即将超时
                </span>
                <span className="text-2xl font-bold text-orange-900">{monitorStats ? monitorStats.timeout_risk : '-'}</span>
                <span className="text-[10px] text-orange-400 mt-1">24h ~ 48h</span>
             </div>

             {/* Timeout Card */}
             <div 
               onClick={() => handleMonitorClick('overdue')}
               className="bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col items-center justify-center hover:shadow-md transition-all relative overflow-hidden cursor-pointer active:scale-95"
             >
                <div className="absolute top-0 right-0 p-1 opacity-10 text-red-600 text-4xl font-bold">⚠️</div>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                   ⚠️ 已超时
                </span>
                <span className="text-2xl font-bold text-red-900">{monitorStats ? monitorStats.overdue_orders : '-'}</span>
                <span className="text-[10px] text-red-400 mt-1">&gt; 48h</span>
             </div>
         </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        
        {/* Batch Actions Group */}
        <div className="flex items-center gap-3 border-r border-slate-200 pr-4 mr-2">
           <label className="flex items-center gap-2 cursor-pointer select-none">
             <input 
               type="checkbox" 
               className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
               checked={isAllSelected}
               onChange={toggleSelectAll}
             />
             <span className="text-sm text-slate-600 font-medium">全选</span>
           </label>
           
           {isAdmin && selectedIds.size > 0 && (
             <button 
               onClick={handleBatchDelete} 
               className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1 animate-fade-in border border-red-100"
             >
                <span className="text-lg leading-none">🗑</span> 
                批量删除 ({selectedIds.size})
             </button>
           )}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="搜索订单/买家/地址/商品/采购/物流（深度检索默认开启）..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            checked={!!filters.deepSearch}
            onChange={(e) => handleFilterChange('deepSearch', e.target.checked)}
          />
          <span>深度检索</span>
        </label>

        {/* Shop Filter */}
        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 min-w-[150px]"
          value={filters.shopName}
          onChange={e => handleFilterChange('shopName', e.target.value)}
        >
          <option value="">店铺: 全部</option>
          {shops.map(shop => (
             <option key={shop.id} value={shop.name}>{shop.name}</option>
          ))}
        </select>

        {/* Tag Filter */}
        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 min-w-[120px]"
          value={filters.tag}
          onChange={e => handleFilterChange('tag', e.target.value)}
        >
          <option value="">标记: 全部</option>
          <option value="red">红标</option>
          <option value="orange">橙标</option>
          <option value="green">绿标</option>
          <option value="blue">蓝标</option>
          <option value="purple">紫标</option>
        </select>

        {/* Purchase Status Filter */}
        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 min-w-[120px]"
          value={filters.purchaseStatus}
          onChange={e => handleFilterChange('purchaseStatus', e.target.value)}
        >
          <option value="">采购: 全部</option>
          <option value="normal">正常已买</option>
          <option value="increase">涨价</option>
          <option value="decrease">降价</option>
          <option value="not_purchased">未购买/异常</option>
        </select>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value="">状态: 全部</option>
          <option value="待发货">待发货</option>
          <option value="已发货">已发货</option>
          <option value="售后中">售后中</option>
        </select>
        <div className="flex items-center gap-2">
           <input 
             type="date" 
             className="px-3 py-2 border border-slate-200 rounded-lg text-sm" 
             value={filters.startDate}
             onChange={e => handleFilterChange('startDate', e.target.value)} 
           />
           <span className="text-slate-400">-</span>
           <input 
             type="date" 
             className="px-3 py-2 border border-slate-200 rounded-lg text-sm" 
             value={filters.endDate}
             onChange={e => handleFilterChange('endDate', e.target.value)} 
           />
        </div>

        <button
          onClick={resetFilters}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-1"
          title="重置筛选"
        >
           <span className="text-base leading-none">↺</span> 
           <span className="hidden md:inline">重置</span>
        </button>
      </div>

      {/* Order List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500">正在加载订单...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500">暂无订单</div>
        ) : (
          orders.map(order => {
            const now = new Date();
            let profit = order.sellPrice - (order.purchaseCost || 0);
            
            // Deduct estimated shipping cost from settings
            const estimatedShipping = appSettings?.defaultShippingCost || 0;
            profit -= estimatedShipping;

            // Check Overdue logic for profit deduction visual based on SETTINGS
            let isOverdue = false;
            let penaltyAmount = appSettings?.overduePenalty || 0; // Use settings
            const overdueHours = appSettings?.overdueHours || 48; // Use settings

            if (order.status === '待发货') {
                const orderDate = new Date(order.orderTime.replace(' ', 'T'));
                const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
                if (diffHours > overdueHours) {
                    isOverdue = true;
                    profit -= penaltyAmount;
                }
            }

            return (
              <div 
                key={order.id} 
                className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col ${selectedIds.has(order.id) ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'}`}
                style={{ borderLeftWidth: '6px', borderLeftColor: getTagColor(order.tag) }}
              >
                {/* Header */}
                <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    {/* Row Selection Checkbox */}
                    <input 
                       type="checkbox" 
                       className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mr-1"
                       checked={selectedIds.has(order.id)}
                       onChange={(e) => { e.stopPropagation(); toggleSelect(order.id); }}
                    />
                    
                    {order.shopName && <span className="font-semibold text-slate-700">🏠 {order.shopName}</span>}
                    <span className="font-mono font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">#{order.id}</span>
                    
                    {/* TIMEOUT BADGE INSERTION */}
                    {getTimeoutBadge(order.orderTime, order.status)}
                  </div>
                  <span className="text-slate-400 text-xs font-mono">{order.orderTime?.substring(0, 16)}</span>
                </div>

                {/* Body Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr_1fr_80px] divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-[120px]">
                  
                  {/* Items */}
                  <div className="p-0">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <img 
                          src={item.img || 'https://picsum.photos/60/60'} 
                          alt="Product" 
                          className="w-14 h-14 rounded-lg object-cover border border-slate-200 shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm line-clamp-2 mb-1">{item.name}</p>
                          <div className="flex justify-between items-center text-xs text-slate-500">
                             <span className="bg-slate-100 px-2 py-0.5 rounded truncate max-w-[150px]">{item.spec}</span>
                             <span className="font-semibold text-slate-700">¥{item.price} x{item.qty}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Info with Copy Button */}
                  <div className="p-4 flex flex-col justify-center gap-2 text-sm text-slate-600 bg-slate-50/30">
                    <p className="text-xs leading-relaxed text-slate-700" title={order.address}>{order.address}</p>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">{order.contact}</span>
                        <span className="font-mono text-xs text-slate-500">{order.phone}</span>
                        <CopyBtn 
                           text={`${order.contact} ${order.phone} ${order.address}`} 
                           label="复制"
                           className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] text-slate-600 hover:text-indigo-600 hover:border-indigo-500 hover:shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                        />
                    </div>
                  </div>

                  {/* Financials & Status */}
                  <div className="p-4 flex flex-col justify-center gap-2 text-sm bg-slate-50/30">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">实付款</span>
                      <span className="font-bold text-slate-800">¥{order.sellPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">利润</span>
                      <div className="flex flex-col items-end">
                          <span className={`font-bold ${profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            ¥{profit.toFixed(2)}
                          </span>
                          {isOverdue && (
                              <span className="text-[10px] text-red-400">已扣除超时费 ¥{penaltyAmount}</span>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-200/50">
                        {/* Purchase Status Indicator */}
                        {getPurchaseStatusElement(order)}
                        
                        {/* Order Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-transparent ${getStatusColor(order.status)}`}>
                            {order.status}
                        </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2 flex lg:flex-col items-center justify-center gap-2 bg-slate-50/50">
                    <ActionBtn icon="✎" label="编辑" onClick={() => handleOpenEdit(order)} color="text-indigo-600 hover:bg-indigo-50" />
                    <ActionBtn icon="🛡️" label="售后" onClick={() => handleOpenAfterSale(order)} color="text-amber-600 hover:bg-amber-50" />
                    {isAdmin && (
                        <ActionBtn icon="🗑" label="删除" onClick={() => deleteOrder(order.id)} color="text-red-600 hover:bg-red-50" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REDESIGNED EDIT ORDER MODAL */}
      {isEditModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
             
             {/* Header */}
             <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-slate-800">编辑订单</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <form id="editOrderForm" onSubmit={handleSubmitEdit} className="p-6 overflow-y-auto custom-scrollbar">
               
               {/* 1. Product List (Top) */}
               <div className="mb-6">
                 <div className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-indigo-500 pl-2">商品清单</div>
                 <div className="space-y-3">
                    {activeOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                         <img 
                           src={item.img || 'https://picsum.photos/80/80'} 
                           alt="Product" 
                           className="w-20 h-20 rounded-md object-cover border border-slate-200 bg-white"
                         />
                         <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div className="font-medium text-sm text-slate-800 line-clamp-2" title={item.name}>{item.name}</div>
                            <div className="text-xs text-slate-500">
                               <div className="flex items-baseline gap-1 mb-1">
                                  <span className="text-indigo-600 font-bold">¥{item.price}</span> 
                                  <span>x {item.qty}</span>
                               </div>
                               <div className="truncate text-slate-400">规格: {item.spec}</div>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="mt-3 pt-3 border-t border-dashed border-slate-200 text-right text-sm text-slate-700">
                    <span className="font-semibold mr-2">实付款:</span>
                    <span className="font-bold text-red-500 text-lg">¥{activeOrder.sellPrice.toFixed(2)}</span>
                 </div>
               </div>

               {/* 2. Purchase Info (Middle) */}
               <div className="mb-6">
                  <div className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-indigo-500 pl-2">采购信息</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Purchase ID - Multi Input */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-sm font-medium text-slate-700">采购单号</label>
                      <MultiInput 
                        value={editFormData.purchaseId}
                        onChange={(val) => setEditFormData({...editFormData, purchaseId: val})}
                        placeholder="输入采购单号..."
                      />
                    </div>

                    {/* Cost & Platform */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">采购成本 (¥)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={editFormData.purchaseCost}
                        onChange={e => setEditFormData({...editFormData, purchaseCost: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">下单平台</label>
                      <select 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={editFormData.purchasePlatform}
                        onChange={e => setEditFormData({...editFormData, purchasePlatform: e.target.value})}
                      >
                         <option value="拼多多">拼多多 (默认)</option>
                         <option value="淘宝">淘宝</option>
                         <option value="抖音">抖音</option>
                         <option value="1688">1688</option>
                      </select>
                    </div>

                    {/* Logistics - Multi Input */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-sm font-medium text-slate-700">运单号 <span className="text-xs text-slate-400 font-normal">(填入后自动发货)</span></label>
                      <MultiInput 
                        value={editFormData.purchaseLogisticsId}
                        onChange={(val) => setEditFormData({...editFormData, purchaseLogisticsId: val})}
                        placeholder="输入运单号..."
                      />
                    </div>

                    {/* Purchase Status & Error Reason / Diff Amount */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-sm font-medium text-slate-700">采购情况</label>
                           <select 
                             className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                             value={editFormData.purchaseStatus}
                             onChange={e => setEditFormData({...editFormData, purchaseStatus: e.target.value})}
                           >
                              <option value="normal">正常已买</option>
                              <option value="increase">涨价</option>
                              <option value="decrease">降价</option>
                              <option value="not_purchased">未购买/异常</option>
                           </select>
                        </div>
                        
                        {/* Right Side: Conditional Inputs aligned with Status */}
                        {editFormData.purchaseStatus === 'not_purchased' && (
                           <div className="space-y-1 animate-fade-in">
                              <label className="text-sm font-medium text-slate-700">异常原因</label>
                              <select 
                                className="w-full px-3 py-2 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm focus:ring-2 focus:ring-red-100 outline-none"
                                value={editFormData.purchaseErrorReason}
                                onChange={e => setEditFormData({...editFormData, purchaseErrorReason: e.target.value})}
                              >
                                 <option value="无货">无货</option>
                                 <option value="超出预算">超出预算</option>
                                 <option value="其他">其他</option>
                              </select>
                           </div>
                        )}

                        {(editFormData.purchaseStatus === 'increase' || editFormData.purchaseStatus === 'decrease') && (
                          <div className="space-y-1 animate-fade-in">
                            <label className="text-sm font-medium text-slate-700">
                                {editFormData.purchaseStatus === 'increase' ? '涨价金额 (¥)' : '降价金额 (¥)'}
                            </label>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                              placeholder="0.00"
                              value={editFormData.purchaseDiff}
                              onChange={e => setEditFormData({...editFormData, purchaseDiff: e.target.value})}
                            />
                          </div>
                        )}
                        
                        {/* Placeholder div to keep grid layout if neither of the above */}
                        {editFormData.purchaseStatus === 'normal' && <div />}
                    </div>
                    
                    {/* Note is now ALWAYS visible */}
                    <div className="md:col-span-2 space-y-1">
                       <label className="text-sm font-medium text-slate-700">备注说明</label>
                       <input 
                         type="text" 
                         className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                         placeholder="填写备注..."
                         value={editFormData.purchaseNote}
                         onChange={e => setEditFormData({...editFormData, purchaseNote: e.target.value})}
                       />
                    </div>

                  </div>
               </div>

               {/* 3. Order Info (Bottom) */}
               <div className="mb-2">
                  <div className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-indigo-500 pl-2">订单详情</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">订单状态</label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                          value={editFormData.status}
                          onChange={e => setEditFormData({...editFormData, status: e.target.value})}
                        >
                           <option value="待发货">待发货</option>
                           <option value="已发货">已发货</option>
                           {/* Removed "售后中" from edit dropdown */}
                           <option value="已完成">已完成</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">订单标记</label>
                        <div className="flex gap-3 items-center h-[38px]">
                           {TAG_OPTIONS.map((opt) => (
                             <button
                               key={opt.val}
                               type="button"
                               title={opt.label}
                               onClick={() => setEditFormData({...editFormData, tag: opt.val})}
                               className={`w-6 h-6 rounded-full border border-slate-200 transition-all ${editFormData.tag === opt.val ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-sm' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                               style={{ backgroundColor: opt.color }}
                             />
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
               
               {/* Contact Info Toggler */}
               <div className="mt-6 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowContactInfo(!showContactInfo)}
                    className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    {showContactInfo ? '▼ 收起收货人信息' : '▶ 展开收货人信息 (不建议修改)'}
                  </button>
                  
                  {showContactInfo && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg animate-fade-in">
                       <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">收件人</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none"
                            value={editFormData.contact}
                            onChange={e => setEditFormData({...editFormData, contact: e.target.value})}
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">手机号</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none"
                            value={editFormData.phone}
                            onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                          />
                       </div>
                       <div className="md:col-span-2 space-y-1">
                          <label className="text-xs font-medium text-slate-500">收货地址</label>
                          <textarea 
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none"
                            rows={2}
                            value={editFormData.address}
                            onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                          />
                       </div>
                    </div>
                  )}
               </div>

            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
               <button 
                 type="button" 
                 onClick={() => setIsEditModalOpen(false)} 
                 className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
               >
                 取消
               </button>
               <button 
                 onClick={() => document.getElementById('editOrderForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200"
               >
                 保存修改
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive AfterSale Modal */}
      {isModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-slate-800">售后工单处理</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            
            {/* Modal Body - Scrollable */}
            <form id="afterSaleForm" onSubmit={handleSubmitAfterSale} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">关联信息</label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                   {/* Shop Name */}
                   <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-16 shrink-0">店铺</span>
                      <span className="font-medium text-slate-800 truncate">{activeOrder.shopName || '--'}</span>
                   </div>
                   
                   {/* Order ID */}
                   <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-16 shrink-0">订单号</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                         <span className="font-mono text-slate-700 truncate" title={activeOrder.id}>{activeOrder.id}</span>
                         <CopyBtn text={activeOrder.id} className="text-slate-400 hover:text-indigo-600 cursor-pointer" />
                      </div>
                   </div>

                   {/* Purchase ID */}
                   <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-16 shrink-0">采购单号</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                         <span className="font-mono text-slate-700 truncate" title={activeOrder.purchaseId || '未填写'}>
                            {activeOrder.purchaseId || '未填写'}
                         </span>
                         {activeOrder.purchaseId && (
                           <CopyBtn text={activeOrder.purchaseId} className="text-slate-400 hover:text-indigo-600 cursor-pointer" />
                         )}
                      </div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    售后类型 <span className="text-red-500">*</span>
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="仅退款">仅退款</option>
                    <option value="退货退款">退货退款</option>
                    <option value="换货">换货</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    售后状态 <span className="text-red-500">*</span>
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    required
                  >
                    <option value="处理中">处理中</option>
                    <option value="买家退货中">买家退货中</option>
                    <option value="已完成">已完成</option>
                    <option value="已拒绝">已拒绝</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  给买家退款金额（元）<span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  placeholder="请输入退款金额"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  售后原因 <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  required
                >
                  <option value="质量问题">质量问题</option>
                  <option value="拍错/多拍">拍错/多拍</option>
                  <option value="缺货/断货">缺货/断货</option>
                  <option value="发错货">发错货</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              {formData.reason === '其他' && (
                <div className="space-y-1 animate-fade-in">
                  <label className="block text-sm font-medium text-slate-700">
                    其他原因说明 <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                    placeholder="请详细说明售后原因"
                    value={formData.customReason}
                    onChange={e => setFormData({...formData, customReason: e.target.value})}
                    required
                  />
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 pt-4">
                 <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">上游供应商信息</h4>
                 
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-700">上游退款状态</label>
                      <select 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                        value={formData.upstreamStatus}
                        onChange={e => setFormData({...formData, upstreamStatus: e.target.value})}
                      >
                        <option value="待处理">待处理</option>
                        <option value="已退款">已退款</option>
                        <option value="无法退款">无法退款</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-700">上游退款金额（元）</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                        placeholder="0.00"
                        value={formData.upstreamAmount}
                        onChange={e => setFormData({...formData, upstreamAmount: e.target.value})}
                      />
                    </div>
                 </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">物流信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">退货物流公司</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                      placeholder="如：顺丰、中通"
                      value={formData.logisticsCompany}
                      onChange={e => setFormData({...formData, logisticsCompany: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">退货物流单号</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                      placeholder="物流单号"
                      value={formData.logisticsId}
                      onChange={e => setFormData({...formData, logisticsId: e.target.value})}
                    />
                  </div>
                </div>
              </div>

            </form>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
               <button 
                 type="button" 
                 onClick={() => setIsModalOpen(false)}
                 className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
               >
                 取消
               </button>
               <button 
                 onClick={() => document.getElementById('afterSaleForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
               >
                 保存
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;