import React, { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, Loader2, Lock } from 'lucide-react';
import ChatPopup from './components/ChatPopup';
import ExecutiveSummary from './components/ExecutiveSummary';
import MarketingAnalytics from './components/MarketingAnalytics';
import WebAnalytics from './components/WebAnalytics';
import SalesPerformance from './components/SalesPerformance';
import './App.css';

const TABS = [
  { id: 'executive', label: 'Executive Summary' },
  { id: 'marketing', label: 'Customer & Marketing' },
  { id: 'web', label: 'Web Analytics' },
  { id: 'sales', label: 'Sales & Product' }
];

const App = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('dashboard_auth') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!isAuthenticated) {
          setLoading(false);
          return;
        }

        // Just quick verification of auth token/config API although tabs are hardcoded now
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');
        
        // Handle initial active tab
        const savedId = localStorage.getItem('activeTabId');
        const initialTab = TABS.find(t => t.id === savedId) || TABS[0];
        setActiveTab(initialTab);
      } catch (err) {
        console.error('Failed to initialize application:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initializeApp();
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await resp.json();
      
      if (data.success) {
        sessionStorage.setItem('dashboard_auth', 'true');
        setIsAuthenticated(true);
        setLoading(true);
      } else {
        setLoginError('Invalid Password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Server connection error.');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('activeTabId', tab.id);
  };

  const handleRefresh = async () => {
    try {
      await fetch('/api/cache/clear');
      window.location.reload();
    } catch (err) {
      console.error('Failed to clear cache:', err);
      window.location.reload();
    }
  };

  const renderActiveView = () => {
    switch (activeTab.id) {
      case 'executive': return <ExecutiveSummary />;
      case 'marketing': return <MarketingAnalytics />;
      case 'web': return <WebAnalytics />;
      case 'sales': return <SalesPerformance />;
      default: return <ExecutiveSummary />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-glass-darker z-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-muted font-medium text-lg">Loading The Look Ecommerce...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-glass-darker z-50">
        <div className="login-box">
          <div style={{ width: 80, height: 80, background: 'rgba(165,0,52,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
            <Lock className="text-primary" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight" style={{ margin: 0 }}>Login Required</h2>
          <p className="text-muted text-sm" style={{ marginTop: '-8px', marginBottom: '16px' }}>대시보드 접속을 위해 비밀번호를 입력해주세요.</p>
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setLoginError('');
            }}
              placeholder="비밀번호"
              className="login-input"
            />
            {loginError && <span className="text-red-400 text-sm text-left pl-1">{loginError}</span>}
            <button type="submit" className="login-btn">
              접속하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container relative">
      <button 
        onClick={handleRefresh}
        className="absolute top-4 right-4 px-3 py-1.5 z-100 flex items-center gap-2 rounded-md shadow-lg transition-all"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: 'rgba(255, 255, 255, 0.7)', 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          fontWeight: '500',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.color = 'white';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
        }}
        title="Clear Cache & Refresh Data"
      >
        <RefreshCw size={12} />
        Refresh All
      </button>

      <header className="header flex justify-between items-center p-6 border-b border-glass shadow-lg">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">The Look Ecommerce Sales Dashboard</h1>
          <p className="text-xs text-muted">Powered by BigQuery thelook_ecommerce dataset</p>
        </div>

        <nav className="flex space-x-1 bg-glass-darker p-1 rounded-xl">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab?.id === tab.id
                  ? 'bg-red-700 text-white shadow-md'
                  : 'text-muted hover:bg-glass hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-6">
        {renderActiveView()}
      </main>

      <button 
        className="chat-button"
        onClick={() => setIsChatOpen(!isChatOpen)}
        title="Chat with AI"
      >
        <MessageSquare size={24} />
      </button>

      {isChatOpen && <ChatPopup onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default App;
