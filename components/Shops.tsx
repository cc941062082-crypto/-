import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Shop, User, UserPermissions } from '../types';

const Shops: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Shop Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [shopFormData, setShopFormData] = useState({
    name: '',
    companyName: '',
    shopPassword: '',
    note: ''
  });

  // Account Management Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [activeShopForAccounts, setActiveShopForAccounts] = useState<Shop | null>(null);
  const [shopUsers, setShopUsers] = useState<User[]>([]);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    name: '',
    permissions: {
      manageOrders: true,
      viewDashboard: true,
      manageSettings: false,
      viewAllShops: false
    } as UserPermissions
  });

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const data = await api.getShops();
      setShops(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Shop Operations ---
  const deleteShop = async (id: number) => {
    if (!confirm('确认删除此店铺？')) return;
    await api.deleteShop(id);
    loadShops();
  };

  const openShopModal = (shop?: Shop) => {
    if (shop) {
      setEditingShop(shop);
      setShopFormData({
        name: shop.name,
        companyName: shop.companyName || '',
        shopPassword: shop.shopPassword || '',
        note: shop.note || ''
      });
    } else {
      setEditingShop(null);
      setShopFormData({
        name: '',
        companyName: '',
        shopPassword: '',
        note: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveShop({
        id: editingShop?.id,
        ...shopFormData
      });
      setIsModalOpen(false);
      loadShops();
    } catch (e) {
      alert('操作失败');
    }
  };

  // --- Account Operations ---
  const openAccountModal = async (shop: Shop) => {
    setActiveShopForAccounts(shop);
    // Reset form
    setNewUserForm({
        username: '',
        password: '',
        name: '',
        permissions: { manageOrders: true, viewDashboard: true, manageSettings: false, viewAllShops: false }
    });
    // Load existing users for this shop
    const users = await api.getUsersByShop(shop.id);
    setShopUsers(users);
    setIsAccountModalOpen(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopForAccounts) return;

    if (!newUserForm.username || !newUserForm.password || !newUserForm.name) {
        alert("请填写完整信息");
        return;
    }

    const newUser: User = {
        username: newUserForm.username,
        password: newUserForm.password,
        name: newUserForm.name,
        role: 'user',
        assignedShopIds: [activeShopForAccounts.id],
        permissions: newUserForm.permissions
    };

    try {
        await api.saveUser(newUser);
        // Reload users list
        const users = await api.getUsersByShop(activeShopForAccounts.id);
        setShopUsers(users);
        // Reset form but keep permissions default
        setNewUserForm({ ...newUserForm, username: '', password: '', name: '' });
        alert("账号添加成功");
    } catch (e) {
        alert("添加失败");
    }
  };

  const handleDeleteUser = async (username: string) => {
      if(!confirm("确定删除该账号吗?")) return;
      await api.deleteUser(username);
      if (activeShopForAccounts) {
          const users = await api.getUsersByShop(activeShopForAccounts.id);
          setShopUsers(users);
      }
  };

  const handlePermissionChange = (key: keyof UserPermissions) => {
      setNewUserForm(prev => ({
          ...prev,
          permissions: {
              ...prev.permissions,
              [key]: !prev.permissions[key]
          }
      }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">店铺管理</h2>
        <button 
          onClick={() => openShopModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:bg-indigo-700 transition-colors"
        >
          + 添加店铺
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500">加载店铺中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shops.map(shop => (
            <div key={shop.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative group overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-800 truncate pr-2" title={shop.name}>{shop.name}</h3>
                <span className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-lg">🏪</span>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="w-5 text-center text-slate-400" title="公司主体">🏢</span>
                  <span className="truncate">{shop.companyName || '未设置公司'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="w-5 text-center text-slate-400" title="登录密码">🔑</span>
                  <span className="truncate font-mono">
                      {shop.shopPassword ? '•'.repeat(8) : '未设置密码'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="w-5 text-center text-slate-400" title="备注">📝</span>
                  <span className="truncate">{shop.note || '无备注'}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => openAccountModal(shop)}
                  className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors w-full mb-1"
                >
                  管理子账号
                </button>
                <div className="flex gap-2 w-full justify-end">
                    <button 
                    onClick={() => openShopModal(shop)}
                    className="text-xs font-medium text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded hover:bg-slate-100 transition-colors flex-1 text-center border border-slate-100"
                    >
                    编辑
                    </button>
                    <button 
                    onClick={() => deleteShop(shop.id)}
                    className="text-xs font-medium text-red-400 hover:text-red-600 px-3 py-1.5 rounded hover:bg-red-50 transition-colors flex-1 text-center border border-slate-100"
                    >
                    删除
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shop Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-lg text-slate-800">{editingShop ? '编辑店铺' : '添加店铺'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <form onSubmit={handleShopSubmit} className="p-6 space-y-4">
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">店铺名称 <span className="text-red-500">*</span></label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={shopFormData.name}
                      onChange={e => setShopFormData({...shopFormData, name: e.target.value})}
                    />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">公司名称 (主体)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={shopFormData.companyName}
                      onChange={e => setShopFormData({...shopFormData, companyName: e.target.value})}
                      placeholder="例如：Nexus Tech LLC"
                    />
                 </div>

                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">店铺登录密码</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none font-mono"
                      value={shopFormData.shopPassword}
                      onChange={e => setShopFormData({...shopFormData, shopPassword: e.target.value})}
                      placeholder="设置店铺登录密码"
                    />
                 </div>

                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">备注</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                      rows={2}
                      value={shopFormData.note}
                      onChange={e => setShopFormData({...shopFormData, note: e.target.value})}
                    />
                 </div>
                 <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">取消</button>
                    <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                       {editingShop ? '保存修改' : '立即创建'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Accounts Management Modal */}
      {isAccountModalOpen && activeShopForAccounts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">账号管理</h3>
                        <p className="text-xs text-slate-500">所属店铺: {activeShopForAccounts.name}</p>
                    </div>
                    <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Add New User Form */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <span>➕</span> 添加新账号
                        </h4>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <input 
                                    type="text" 
                                    placeholder="登录账号 (Username)" 
                                    className="px-3 py-2 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500"
                                    value={newUserForm.username}
                                    onChange={e => setNewUserForm({...newUserForm, username: e.target.value})}
                                />
                                <input 
                                    type="password" 
                                    placeholder="登录密码" 
                                    className="px-3 py-2 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500"
                                    value={newUserForm.password}
                                    onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                                />
                                <input 
                                    type="text" 
                                    placeholder="员工姓名/昵称" 
                                    className="px-3 py-2 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500"
                                    value={newUserForm.name}
                                    onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                                />
                            </div>
                            
                            <div className="border-t border-slate-200 pt-3">
                                <label className="text-xs font-bold text-slate-500 block mb-2">分配权限</label>
                                <div className="grid grid-cols-2 gap-y-3">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={newUserForm.permissions.manageOrders} 
                                            onChange={() => handlePermissionChange('manageOrders')}
                                            className="w-4 h-4 rounded text-indigo-600"
                                        />
                                        <span>店铺订单管理</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={newUserForm.permissions.viewDashboard}
                                            onChange={() => handlePermissionChange('viewDashboard')}
                                            className="w-4 h-4 rounded text-indigo-600"
                                        />
                                        <span>店铺经营概况</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={newUserForm.permissions.manageSettings}
                                            onChange={() => handlePermissionChange('manageSettings')}
                                            className="w-4 h-4 rounded text-indigo-600"
                                        />
                                        <span>订单履约规则 (设置)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none text-indigo-700 font-medium">
                                        <input 
                                            type="checkbox" 
                                            checked={newUserForm.permissions.viewAllShops}
                                            onChange={() => handlePermissionChange('viewAllShops')}
                                            className="w-4 h-4 rounded text-indigo-600"
                                        />
                                        <span>🔍 查看所有店铺数据</span>
                                    </label>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 shadow-sm mt-2">
                                确认添加
                            </button>
                        </form>
                    </div>

                    {/* User List */}
                    <h4 className="text-sm font-bold text-slate-700 mb-3">现有账号列表</h4>
                    {shopUsers.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm bg-white border border-dashed border-slate-200 rounded-lg">
                            暂无分配给该店铺的子账号
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {shopUsers.map(u => (
                                <div key={u.username} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                            {u.name.substring(0, 1)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-800">{u.name} <span className="text-slate-400 font-normal">({u.username})</span></div>
                                            <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mt-1">
                                                {u.permissions?.manageOrders && <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">订单</span>}
                                                {u.permissions?.viewDashboard && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">概况</span>}
                                                {u.permissions?.manageSettings && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">规则</span>}
                                                {u.permissions?.viewAllShops && <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">全店可见</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteUser(u.username)}
                                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                                    >
                                        删除
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Shops;