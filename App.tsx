import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Shops from './components/Shops';
import AfterSales from './components/AfterSales';
import Settings from './components/Settings';
import Login from './components/Login';
import { api } from './services/api';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [dbStatus, setDbStatus] = useState<boolean | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Check for existing session
  useEffect(() => {
    const storedUser = api.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setInitializing(false);
  }, []);

  // Simple hash router replacement
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'dashboard';
      setCurrentView(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Init
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const changeView = (view: string) => {
    window.location.hash = view;
  };

  useEffect(() => {
    // Check backend connection
    api.checkConnection().then(setDbStatus);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    // Redirect logic: go to first available view
    if (loggedInUser.role === 'admin' || loggedInUser.permissions?.viewDashboard) {
      changeView('dashboard');
    } else if (loggedInUser.permissions?.manageOrders) {
      changeView('orders');
    } else {
      changeView('dashboard'); // Fallback
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    changeView('');
  };

  // Route Protection Logic
  const renderContent = () => {
    if (!user) return null; // Should be handled by main return

    // Admin has access to everything
    if (user.role === 'admin') {
       switch (currentView) {
        case 'dashboard': return <Dashboard />;
        case 'orders': return <Orders />;
        case 'shops': return <Shops />;
        case 'aftersales': return <AfterSales />;
        case 'settings': return <Settings />;
        default: return <Dashboard />;
      }
    }

    // Standard User Permissions Check
    const perms = user.permissions || { manageOrders: false, viewDashboard: false, manageSettings: false };

    // Prevent access to strictly forbidden pages
    if (currentView === 'shops') {
        setTimeout(() => changeView('dashboard'), 0);
        return null;
    }
    if (currentView === 'settings' && !perms.manageSettings) {
        setTimeout(() => changeView('dashboard'), 0);
        return null;
    }
    if (currentView === 'dashboard' && !perms.viewDashboard) {
        // If they land on dashboard but can't view it, try orders
        if (perms.manageOrders) setTimeout(() => changeView('orders'), 0);
        return <div className="p-10 text-center text-slate-500">无权访问</div>;
    }
    if (currentView === 'orders' && !perms.manageOrders) {
         if (perms.viewDashboard) setTimeout(() => changeView('dashboard'), 0);
         return <div className="p-10 text-center text-slate-500">无权访问</div>;
    }

    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'orders': return <Orders />;
      case 'aftersales': return <AfterSales />; // Usually linked to orders access, keep open for now or restrict same as orders
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  if (initializing) return null; // Or a loading spinner

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={changeView} 
        user={user} 
        onLogout={handleLogout}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-slate-900 flex items-center justify-between px-4 sticky top-0 z-20 shadow-md">
          <span className="text-white font-bold text-lg">❖ Nexus</span>
          <button className="text-slate-400">☰</button>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          
          {/* Status Indicator */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border ${
              dbStatus 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${dbStatus ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></span>
              {dbStatus ? '云端已连接' : '断开连接'}
            </span>
          </div>

          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;