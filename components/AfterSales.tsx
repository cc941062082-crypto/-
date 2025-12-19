import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { AfterSale, AfterSaleFilters, Shop } from '../types';

const TAG_OPTIONS = [
    { val: '', color: '#e5e7eb', label: '无' },
    { val: 'red', color: '#ef4444', label: '红标' },
    { val: 'orange', color: '#f97316', label: '橙标' },
    { val: 'green', color: '#10b981', label: '绿标' },
    { val: 'blue', color: '#3b82f6', label: '蓝标' },
    { val: 'purple', color: '#a855f7', label: '紫标' },
];

const AfterSales: React.FC = () => {
  const [items, setItems] = useState<AfterSale[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AfterSaleFilters>({
    search: '',
    status: '',
    type: '',
    shopName: '',
    tag: '',
    purchaseStatus: ''
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<AfterSale | null>(null);
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

  // Load shops for filter dropdown (API will filter based on permission)
  useEffect(() => {
    api.getShops().then(setShops);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAfterSales(filters);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (key: keyof AfterSaleFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      type: '',
      shopName: '',
      tag: '',
      purchaseStatus: ''
    });
  };

  const deleteItem = async (id: number) => {
    if (!confirm('确认删除此记录？')) return;
    await api.deleteAfterSale(id);
    loadData();
  };

  const handleComplete = async (item: AfterSale) => {
    if (item.status === '已完成') return;
    
    if (!confirm(`确认将工单 #${item.id} 标记为已完成吗？`)) return;
    
    try {
      await api.saveAfterSale({
        ...item,
        status: '已完成'
      });
      loadData();
    } catch (e) {
      alert("操作失败");
    }
  };

  const handleProcess = (item: AfterSale) => {
    setActiveItem(item);
    const knownReasons = ['质量问题', '拍错/多拍', '缺货/断货', '发错货'];
    const isCustom = !knownReasons.includes(item.reason) && item.reason !== '其他';

    setFormData({
        type: item.type,
        status: item.status,
        // Default to sellPrice if 0 or unset, otherwise use existing refund amount
        amount: item.refund_amount ? item.refund_amount.toString() : (item.sellPrice ? item.sellPrice.toString() : ''),
        reason: isCustom ? '其他' : item.reason,
        customReason: isCustom ? item.reason : '',
        upstreamStatus: item.upstream_status,
        // Default to purchaseCost if 0 or unset, otherwise use existing upstream refund amount
        upstreamAmount: item.upstream_refund_amount ? item.upstream_refund_amount.toString() : (item.purchaseCost ? item.purchaseCost.toString() : ''),
        logisticsCompany: item.logistics_company || '',
        logisticsId: item.logistics_id || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    const finalReason = formData.reason === '其他' ? formData.customReason : formData.reason;
    if (!finalReason) {
        alert("请输入具体原因");
        return;
    }

    try {
        await api.saveAfterSale({
            ...activeItem,
            type: formData.type,
            status: formData.status,
            refund_amount: parseFloat(formData.amount) || 0,
            upstream_refund_amount: parseFloat(formData.upstreamAmount) || 0,
            upstream_status: formData.upstreamStatus,
            reason: finalReason,
            logistics_company: formData.logisticsCompany,
            logistics_id: formData.logisticsId
        });
        setIsModalOpen(false);
        loadData();
    } catch (e) {
        alert("保存失败");
    }
  };

  const handleUpdateTag = async (orderId: string, tag: string) => {
    try {
        await api.updateOrderTag(orderId, tag);
        loadData(); // Reload to refresh data
    } catch (e) {
        alert("标记失败");
    }
  };

  const getStatusColor = (status: string) => {
    if (status === '处理中') return 'bg-indigo-500';
    if (status.includes('退货') || status === '买家退货中') return 'bg-violet-500';
    if (status === '已完成') return 'bg-emerald-500';
    if (status === '已拒绝') return 'bg-red-500';
    return 'bg-amber-500';
  };

  const getTagColor = (tag?: string) => {
    const map: any = { red: '#ef4444', orange: '#f97316', green: '#10b981', blue: '#3b82f6', purple: '#a855f7' };
    return map[tag || ''] || '#e5e7eb';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h2 className="text-2xl font-bold text-slate-800">售后处理</h2>
      </div>
      
      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
         <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="搜索订单号、采购单号、售后原因..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 min-w-[150px]"
          value={filters.shopName}
          onChange={e => handleFilterChange('shopName', e.target.value)}
        >
          <option value="">店铺: {shops.length > 0 ? '全部' : '无权限'}</option>
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
        
        {/* Purchase Status Filter Removed as requested */}

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 min-w-[120px]"
          value={filters.type}
          onChange={e => handleFilterChange('type', e.target.value)}
        >
          <option value="">类型: 全部</option>
          <option value="仅退款">仅退款</option>
          <option value="退货退款">退货退款</option>
          <option value="换货">换货</option>
        </select>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 min-w-[120px]"
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value="">状态: 全部</option>
          <option value="处理中">处理中</option>
          <option value="买家退货中">买家退货中</option>
          <option value="已完成">已完成</option>
          <option value="已拒绝">已拒绝</option>
        </select>

        <button
          onClick={resetFilters}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-1"
          title="重置筛选"
        >
           <span className="text-base leading-none">↺</span> 
           <span className="hidden md:inline">重置</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-10">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500">
           没有找到匹配的售后工单
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const gap = item.refund_amount - item.upstream_refund_amount;
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row p-6 gap-6 hover:shadow-md transition-shadow animate-fade-in" style={{ borderLeft: `6px solid ${getTagColor(item.tag)}` }}>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800">ID: {item.id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                        {item.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${getStatusColor(item.status).replace('bg-', 'bg-').replace('500', '600')}`}>
                        {item.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{item.created_at?.substring(0, 16)}</span>
                  </div>

                  <div className="text-lg font-bold text-slate-800">{item.reason || '未填写原因'}</div>

                  <div className="flex gap-6 text-sm text-slate-500 flex-wrap">
                    <span>📦 订单: <b className="text-slate-800">{item.order_id}</b></span>
                    {item.purchaseId && <span>🛍️ 采购单: <b className="text-slate-800">{item.purchaseId}</b></span>}
                    <span>🏠 {item.shopName || '--'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 mt-2 border-t border-dashed border-slate-100">
                    <div>
                      <div className="text-xs text-slate-400">退款给买家</div>
                      <div className="text-red-500 font-bold">¥ {item.refund_amount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">上游退款 ({item.upstream_status})</div>
                      <div className="text-emerald-500 font-bold">¥ {item.upstream_refund_amount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">差额</div>
                      <div className={`font-bold ${gap > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {gap > 0 ? '-' : '+'}{Math.abs(gap).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                  {/* Tag Actions */}
                  <div className="flex flex-col items-center justify-center gap-1 mb-2 pb-2 md:border-b border-slate-100">
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">标记订单</span>
                     <div className="flex gap-1">
                        {TAG_OPTIONS.map(opt => (
                           <button
                             key={opt.val}
                             title={opt.label}
                             onClick={() => handleUpdateTag(item.order_id, opt.val === item.tag ? '' : opt.val)}
                             className={`w-3 h-3 rounded-full border border-slate-200 hover:scale-125 transition-transform ${item.tag === opt.val ? 'ring-1 ring-offset-1 ring-slate-400' : ''}`}
                             style={{ backgroundColor: opt.color }}
                           />
                        ))}
                     </div>
                  </div>

                  {item.status !== '已完成' && (
                    <button 
                      onClick={() => handleComplete(item)}
                      className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
                    >
                      完成
                    </button>
                  )}

                  <button 
                    onClick={() => handleProcess(item)}
                    className="bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                  >
                    处理
                  </button>
                  
                  <button onClick={() => deleteItem(item.id)} className="bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Process Modal */}
      {isModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up">
            
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-slate-800">编辑售后工单 #{activeItem.id}</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <form id="afterSaleForm" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              
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
                 保存修改
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AfterSales;