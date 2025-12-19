import React, { useEffect, useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DashboardStats, Shop } from '../types';
import { api } from '../services/api';

type MetricType = 'all' | 'orders' | 'sales' | 'cost' | 'profit' | 'refunds';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('');
  
  // State to track which metric is currently focused in the chart
  const [activeMetric, setActiveMetric] = useState<MetricType>('all');
  
  // State for toggling visibility in Combination View
  const [visibleMetrics, setVisibleMetrics] = useState({
    orders: true,
    sales: true,
    cost: true,
    profit: true,
    refunds: true
  });

  const currentUser = api.getCurrentUser();

  useEffect(() => {
    // Fetch available shops for filter
    api.getShops().then(allShops => {
       // Filter shops based on user permission
       if (currentUser && currentUser.role !== 'admin' && currentUser.assignedShopIds) {
           const allowed = allShops.filter(s => currentUser.assignedShopIds!.includes(s.id));
           setShops(allowed);
           // Auto-select first allowed shop if specific shops are assigned
           if (allowed.length > 0 && !selectedShop) {
               setSelectedShop(allowed[0].name);
           }
       } else {
           setShops(allShops);
       }
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedShop]); // Reload data when shop changes

  const loadData = async () => {
    setLoading(true);
    try {
      // Pass the selected shop (if any) to the API
      const data = await api.getDashboardStats(selectedShop || undefined);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMetricClick = (metric: MetricType) => {
    // If clicking the already active metric, toggle back to 'all'
    if (activeMetric === metric) {
      setActiveMetric('all');
    } else {
      setActiveMetric(metric);
    }
  };
  
  const toggleVisibility = (key: keyof typeof visibleMetrics) => {
    setVisibleMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading && !stats) {
    return <div className="p-8 text-center text-slate-500">正在加载看板数据...</div>;
  }

  if (!stats) return null;

  // Format data for Recharts
  const trendData = stats.daily_trend.map(d => ({
    name: d.date.substring(5), // MM-DD
    profit: d.profit,
    sales: d.sales,
    cost: d.cost,
    orders: d.orders,
    refunds: d.refunds
  }));

  const getChartTitle = () => {
    const prefix = selectedShop ? `[${selectedShop}] ` : '';
    const map: Record<string, string> = {
      all: '近30天经营趋势 (组合视图)',
      orders: '近30天订单量趋势',
      sales: '近30天销售额趋势',
      cost: '近30天采购成本趋势',
      profit: '近30天净利润趋势',
      refunds: '近30天售后工单趋势'
    };
    return prefix + map[activeMetric];
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Top Bar: Title, Shop Filter, Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <h2 className="text-2xl font-bold text-slate-800">经营概览</h2>
           
           {/* Shop Filter */}
           <div className="relative">
             <select 
               className="appearance-none bg-white border border-slate-200 text-slate-700 pl-4 pr-10 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 hover:border-indigo-300 transition-all cursor-pointer shadow-sm"
               value={selectedShop}
               onChange={(e) => setSelectedShop(e.target.value)}
             >
               {(!currentUser?.assignedShopIds || currentUser.assignedShopIds.length === 0) && (
                   <option value="">全部店铺数据</option>
               )}
               {shops.map(shop => (
                 <option key={shop.id} value={shop.name}>{shop.name}</option>
               ))}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
           </div>
        </div>
      </div>

      {/* KPI Grid - Order Updated: Overdue is Last */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard 
          label={selectedShop ? "店铺今日订单" : "今日总订单"} 
          subLabel="累计"
          value={`${stats.daily_trend.slice(-1)[0]?.orders || 0}`} 
          subValue={`/ ${stats.kpi.total_orders}`}
          trend={stats.kpi.orders_growth}
          isActive={activeMetric === 'orders'}
          onClick={() => handleMetricClick('orders')}
        />
        <KpiCard 
          label="累计销售额 (GMV)" 
          value={`¥ ${stats.kpi.total_sales.toLocaleString()}`} 
          trend={stats.kpi.sales_growth}
          icon="📈"
          isActive={activeMetric === 'sales'}
          onClick={() => handleMetricClick('sales')}
        />
         <KpiCard 
          label="累计采购额" 
          value={`¥ ${stats.kpi.total_cost.toLocaleString()}`} 
          valueColor="text-slate-700" 
          trend={stats.kpi.cost_growth}
          icon="🛒"
          isActive={activeMetric === 'cost'}
          onClick={() => handleMetricClick('cost')}
        />
        <KpiCard 
          label="累计净利润" 
          value={`¥ ${stats.kpi.net_profit.toLocaleString()}`} 
          valueColor="text-emerald-600" 
          trend={stats.kpi.profit_growth}
          icon="💰"
          isActive={activeMetric === 'profit'}
          onClick={() => handleMetricClick('profit')}
        />
        <KpiCard 
          label="售后率" 
          subLabel="待发货"
          value={`${stats.kpi.refund_rate.toFixed(1)}%`} 
          subValue={`/ ${stats.kpi.pending_ship}`}
          trend={stats.kpi.refund_growth}
          inverseTrend
          icon="🛡️"
          isActive={activeMetric === 'refunds'}
          onClick={() => handleMetricClick('refunds')}
        />
        <KpiCard 
          label="已超时订单" 
          value={`${stats.kpi.overdue_orders}`} 
          valueColor="text-red-600"
          subLabel="即将超时"
          subValue={`${stats.kpi.timeout_risk}`}
          icon="⚠️"
          inverseTrend
          // No metric click
        />
      </div>

      {/* Main Charts Row - Full Width Trend Chart with Dual Axis */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col transition-all">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
             <div className="flex items-center gap-3">
               <h3 className="text-lg font-bold text-slate-800">
                 {getChartTitle()}
               </h3>
               {activeMetric !== 'all' && (
                 <button 
                   onClick={() => setActiveMetric('all')}
                   className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                 >
                   显示全部
                 </button>
               )}
             </div>

             {/* Metric Toggles for Combination View */}
             {activeMetric === 'all' && (
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                   <button 
                      onClick={() => toggleVisibility('orders')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all border ${visibleMetrics.orders ? 'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-200' : 'bg-white text-slate-400 border-slate-200 grayscale opacity-70'}`}
                   >
                      <span className="w-2 h-2 rounded-full bg-violet-500"></span> 订单
                   </button>
                   <button 
                      onClick={() => toggleVisibility('sales')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all border ${visibleMetrics.sales ? 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200' : 'bg-white text-slate-400 border-slate-200 grayscale opacity-70'}`}
                   >
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> 销售额
                   </button>
                   <button 
                      onClick={() => toggleVisibility('cost')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all border ${visibleMetrics.cost ? 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200' : 'bg-white text-slate-400 border-slate-200 grayscale opacity-70'}`}
                   >
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> 采购额
                   </button>
                   <button 
                      onClick={() => toggleVisibility('profit')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all border ${visibleMetrics.profit ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white text-slate-400 border-slate-200 grayscale opacity-70'}`}
                   >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 净利润
                   </button>
                   <button 
                      onClick={() => toggleVisibility('refunds')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all border ${visibleMetrics.refunds ? 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-200' : 'bg-white text-slate-400 border-slate-200 grayscale opacity-70'}`}
                   >
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> 售后
                   </button>
                </div>
             )}
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                
                {/* Left Axis: Currency */}
                <YAxis 
                  yAxisId="left" 
                  tick={{fontSize: 12, fill: '#64748b'}} 
                  axisLine={false} 
                  tickLine={false} 
                  hide={activeMetric === 'orders' || activeMetric === 'refunds' || (activeMetric === 'all' && !visibleMetrics.sales && !visibleMetrics.cost && !visibleMetrics.profit)} 
                />
                
                {/* Right Axis: Counts (Orders & Refunds) */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tick={{fontSize: 12, fill: '#94a3b8'}} 
                  axisLine={false} 
                  tickLine={false}
                  hide={activeMetric !== 'all' && activeMetric !== 'orders' && activeMetric !== 'refunds' || (activeMetric === 'all' && !visibleMetrics.orders && !visibleMetrics.refunds)} 
                />
                
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  labelStyle={{color: '#64748b', marginBottom: '4px'}}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                
                {/* Conditionally Render Chart Layers based on activeMetric */}
                
                <Line 
                  hide={activeMetric === 'all' ? !visibleMetrics.orders : activeMetric !== 'orders'}
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}}
                  activeDot={{r: 6}}
                  name="订单数" 
                />
                
                <Line 
                  hide={activeMetric === 'all' ? !visibleMetrics.refunds : activeMetric !== 'refunds'}
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="refunds" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{r: 3, fill: '#ef4444', strokeWidth: 1, stroke: '#fff'}}
                  activeDot={{r: 5}}
                  name="售后工单" 
                />

                <Area 
                  hide={activeMetric === 'all' ? !visibleMetrics.sales : activeMetric !== 'sales'}
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3b82f6" 
                  fill="url(#colorSales)" 
                  strokeWidth={2} 
                  name="销售额" 
                />

                <Area 
                  hide={activeMetric === 'all' ? !visibleMetrics.cost : activeMetric !== 'cost'}
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#f59e0b" 
                  fill="url(#colorCost)" 
                  strokeWidth={2} 
                  name="采购额" 
                />

                <Area 
                  hide={activeMetric === 'all' ? !visibleMetrics.profit : activeMetric !== 'profit'}
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  fill="url(#colorProfit)" 
                  strokeWidth={2} 
                  name="净利润" 
                />
                
              </ComposedChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* Bottom Grid: Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Best Sellers - Takes 2/3 width */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-800">🔥 {selectedShop ? '本店' : '全店'}热销商品 Top 5</h3>
             <button className="text-xs text-indigo-600 font-medium hover:underline">查看全部</button>
           </div>
           {stats.best_sellers.length === 0 ? (
             <div className="text-center py-10 text-slate-400">该店铺暂无销售数据</div>
           ) : (
             <div className="space-y-4">
              {stats.best_sellers.slice(0, 5).map((product, idx) => (
                <div key={idx} className="flex items-center gap-4 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
                   <div className="relative">
                      <img src={product.img} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                      <div className={`absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white border-2 border-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-400' : 'bg-slate-200 text-slate-500'}`}>
                        {idx + 1}
                      </div>
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm truncate">{product.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">营收: ¥{product.revenue.toLocaleString()}</div>
                   </div>
                   <div className="text-right">
                      <div className="font-bold text-slate-800">{product.sales} 单</div>
                      <div className="text-[10px] flex items-center justify-end gap-1">
                         {product.trend === 'up' && <span className="text-red-500">🔥 热卖</span>}
                         {product.trend === 'down' && <span className="text-blue-500">❄️ 下滑</span>}
                         {product.trend === 'flat' && <span className="text-slate-400">➡️ 持平</span>}
                      </div>
                   </div>
                </div>
              ))}
             </div>
           )}
        </div>

        {/* Shop Info Card or Alert Summary - Takes 1/3 width */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col max-h-[500px]">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
             <span>{selectedShop ? '店铺概况' : '店铺利润排行'}</span>
             {selectedShop && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded">单一视图</span>}
          </h3>
          
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
             
             {/* Show summary stats ONLY when a specific shop is selected */}
             {selectedShop && (
               <>
                 <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 shrink-0">
                    <div className="text-xs text-indigo-600 font-bold uppercase mb-1">店铺利润率</div>
                    <div className="text-2xl font-bold text-indigo-900">
                       {stats.kpi.total_sales > 0 
                         ? ((stats.kpi.net_profit / stats.kpi.total_sales) * 100).toFixed(1) 
                         : 0}%
                    </div>
                 </div>

                 <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 shrink-0">
                    <div className="text-xs text-emerald-600 font-bold uppercase mb-1">累计净利润</div>
                    <div className="text-2xl font-bold text-emerald-900">
                        ¥{stats.kpi.net_profit.toLocaleString()}
                    </div>
                 </div>
                 
                 {/* Single Shop Rank */}
                 {stats.shop_ranking.length > 0 && (
                     <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 shrink-0">
                        <div className="text-xs text-amber-600 font-bold uppercase mb-1">利润贡献排名</div>
                        <div className="text-sm text-amber-900">
                           第 <span className="font-bold text-lg mx-1">{stats.shop_ranking.findIndex(s => s.shopName === selectedShop) + 1}</span> 名
                        </div>
                     </div>
                 )}
               </>
             )}

             {/* All Shops Ranking List (NEW FEATURE) - Show if !selectedShop */}
             {!selectedShop && stats.shop_ranking.length > 0 && (
                 <div className="flex-1 flex flex-col min-h-0">
                    <div className="text-xs text-slate-500 font-bold uppercase mb-2 flex justify-between items-center bg-slate-50 p-2 rounded-t-lg border-b border-slate-200">
                        <span>店铺名称</span>
                        <span>净利润</span>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar pr-1 space-y-2 flex-1">
                        {stats.shop_ranking.map((shop, index) => (
                           <div key={shop.shopName} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg text-sm hover:bg-slate-50 transition-colors group shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                 <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold ${
                                     index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                     index === 1 ? 'bg-slate-200 text-slate-700' :
                                     index === 2 ? 'bg-orange-100 text-orange-700' :
                                     'bg-slate-100 text-slate-500'
                                 }`}>
                                    {index + 1}
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                     <span className="font-medium text-slate-700 truncate" title={shop.shopName}>
                                        {shop.shopName}
                                     </span>
                                     <span className="text-[10px] text-slate-400">{shop.count} 单</span>
                                 </div>
                              </div>
                              <span className="font-bold text-emerald-600 whitespace-nowrap ml-2">
                                 ¥{shop.gross_profit.toLocaleString()}
                              </span>
                           </div>
                        ))}
                    </div>
                 </div>
             )}
             
             {selectedShop && (
                <div className="mt-auto pt-4 border-t border-slate-100 text-xs text-slate-500 shrink-0">
                    <p>数据更新于: {new Date().toLocaleTimeString()}</p>
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

interface KpiProps {
  label: string;
  subLabel?: string;
  value: string;
  subValue?: string;
  valueColor?: string;
  trend?: number; // percentage
  inverseTrend?: boolean; // if true, positive is bad (e.g., refund rate)
  icon?: string;
  isActive?: boolean;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiProps> = ({ 
  label, subLabel, value, subValue, valueColor = 'text-slate-900', trend, inverseTrend, icon, isActive, onClick
}) => {
  const isPositive = trend && trend > 0;
  // If inverseTrend is true (e.g. Refund Rate), Green is negative growth, Red is positive growth.
  // Standard (Profit): Green is positive, Red is negative.
  const isGood = inverseTrend ? !isPositive : isPositive;
  const trendColor = isGood ? 'text-emerald-500' : 'text-red-500';
  const trendBg = isGood ? 'bg-emerald-50' : 'bg-red-50';
  const arrow = isPositive ? '↑' : '↓';

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-5 rounded-xl border shadow-sm transition-all relative overflow-hidden group ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isActive 
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
          : 'border-slate-200 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
         <p className={`text-sm font-medium uppercase tracking-wider ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</p>
         {icon && <span className={`text-xl transition-all ${isActive ? 'opacity-100 grayscale-0' : 'opacity-20 grayscale group-hover:grayscale-0'}`}>{icon}</span>}
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
         <h3 className={`text-2xl font-bold ${valueColor}`}>{value}</h3>
         {subValue && (
            <span className="text-xs text-slate-400 font-mono">
               {subLabel ? `${subLabel} ` : ''}{subValue}
            </span>
         )}
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-2">
           <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex items-center gap-0.5 ${trendBg} ${trendColor}`}>
              {arrow} {Math.abs(trend)}%
           </span>
           <span className="text-xs text-slate-400">较上期</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;