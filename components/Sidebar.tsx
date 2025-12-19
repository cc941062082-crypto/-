import React from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user, onLogout }) => {
  const isAdmin = user?.role === 'admin';
  const perms = user?.permissions || { manageOrders: false, viewDashboard: false, manageSettings: false };

  const menuItems = [
    ...(isAdmin || perms.viewDashboard ? [{ id: 'dashboard', label: '经营概览', icon: '📊' }] : []),
    ...(isAdmin || perms.manageOrders ? [{ id: 'orders', label: '订单管理', icon: '📦' }] : []),
    // Only show Shop Management to Admins
    ...(isAdmin ? [{ id: 'shops', label: '店铺管理', icon: '🏪' }] : []),
    // Aftersales accessible if managing orders or admin
    ...(isAdmin || perms.manageOrders ? [{ id: 'aftersales', label: '售后处理', icon: '🛡️' }] : []),
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 h-screen sticky top-0 border-r border-slate-800">
      <div className="h-20 flex items-center px-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <span className="text-indigo-500 text-2xl">❖</span> Nexus
        </h2>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
              currentView === item.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 translate-x-1'
                : 'hover:bg-slate-800 hover:text-white hover:translate-x-1'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
        
        {/* Settings Divider - Only for Admins or Permitted Users */}
        {(isAdmin || perms.manageSettings) && (
          <div className="pt-4 mt-4 border-t border-slate-800/50">
             <button
              onClick={() => onChangeView('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                currentView === 'settings'
                  ? 'bg-slate-800 text-white translate-x-1'
                  : 'hover:bg-slate-800 hover:text-white hover:translate-x-1'
              }`}
            >
              <span className="text-lg">⚙️</span>
              系统设置
            </button>
          </div>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 mb-3">
           <img 
             src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`} 
             alt="User" 
             className="w-10 h-10 rounded-full border-2 border-slate-700"
           />
           <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 capitalize">{user?.role === 'admin' ? '管理员' : '普通用户'}</div>
           </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
        >
          <span>↪</span> 退出登录
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;