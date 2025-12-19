import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AppSettings } from '../types';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof AppSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.saveSettings(settings);
      setSuccessMsg('设置保存成功！');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-slate-500">加载设置中...</div>;
  if (!settings) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">系统设置</h2>
        {successMsg && (
            <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium animate-fade-in">
                {successMsg}
            </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Order Config Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
             <span className="text-xl">⚙️</span>
             <h3 className="font-bold text-slate-800">订单履约规则</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                   预估运费成本 (¥/单)
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                      value={settings.defaultShippingCost}
                      onChange={e => handleChange('defaultShippingCost', parseFloat(e.target.value))}
                    />
                </div>
                <p className="text-xs text-slate-400">利润计算时会自动扣除此金额，且不在订单卡片中显示运费详情。</p>
             </div>

             <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                   超时罚款金额 (¥)
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                      value={settings.overduePenalty}
                      onChange={e => handleChange('overduePenalty', parseFloat(e.target.value))}
                    />
                </div>
                <p className="text-xs text-slate-400">订单发货超时后，将在利润计算中自动扣除此金额。</p>
             </div>

             <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                   默认采购平台
                </label>
                <select 
                   className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                   value={settings.defaultPurchasePlatform}
                   onChange={e => handleChange('defaultPurchasePlatform', e.target.value)}
                >
                   <option value="拼多多">拼多多</option>
                   <option value="淘宝">淘宝</option>
                   <option value="1688">1688</option>
                   <option value="抖音">抖音</option>
                </select>
                <p className="text-xs text-slate-400">编辑订单时默认选中的采购平台。</p>
             </div>

             <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                   即将超时阈值 (小时)
                </label>
                <input 
                  type="number"
                  min="1"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  value={settings.riskHours}
                  onChange={e => handleChange('riskHours', parseInt(e.target.value))}
                />
                <p className="text-xs text-slate-400">超过此时间未发货将标记为“风险订单”。</p>
             </div>

             <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                   已超时阈值 (小时)
                </label>
                <input 
                  type="number"
                  min="1"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  value={settings.overdueHours}
                  onChange={e => handleChange('overdueHours', parseInt(e.target.value))}
                />
                <p className="text-xs text-slate-400">超过此时间未发货将标记为“已超时”并触发罚款。</p>
             </div>
          </div>
        </div>

        {/* System Info Section (Read Only) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
           <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
             <span className="text-xl">🖥️</span>
             <h3 className="font-bold text-slate-800">系统信息</h3>
          </div>
          <div className="space-y-4 text-sm text-slate-600">
             <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                <span>系统版本</span>
                <span className="font-mono">v2.5.0</span>
             </div>
             <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                <span>API 状态</span>
                <span className="text-emerald-600 font-bold">● 在线 (模拟模式)</span>
             </div>
             <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                <span>数据库</span>
                <span>Local Memory / Mock</span>
             </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
           <button 
             type="submit" 
             disabled={saving}
             className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-95"
           >
             {saving ? '保存中...' : '保存设置'}
           </button>
        </div>

      </form>
    </div>
  );
};

export default Settings;