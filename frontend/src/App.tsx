import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { TrendingUp, Settings as SettingsIcon, LogOut, Shield, PieChart } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
import AdminPanel from './pages/AdminPanel';
import HealthAlert from './components/HealthAlert';
import ServerStatus from './components/ServerStatus';
import WakeUpScreen from './components/WakeUpScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#fff' }}>Yükleniyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Onaylanmamış kullanıcıları pending sayfasına yönlendir
  if (!user.approved) {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
};

// Admin Route wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#fff' }}>Yükleniyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const [isServerWaking, setIsServerWaking] = useState(false);

  return (
    <div className="app">
      {/* Sunucu uyanma ekranı */}
      <WakeUpScreen isVisible={isServerWaking} />

      {/* Sunucu durumu göstergesi */}
      <ServerStatus onWaking={setIsServerWaking} />

      {!isAuthPage && (
        <>
          <HealthAlert />
          <Navbar />
        </>
      )}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending" element={<PendingApproval />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
            Arial, sans-serif;
          background: #0a0e27;
          color: #ffffff;
          line-height: 1.6;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main-content {
          flex: 1;
        }

        input,
        button {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <TrendingUp size={28} />
          <span>StockAIQ</span>
        </div>

        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <TrendingUp size={18} />
            Piyasa
          </Link>
          <Link
            to="/portfolio"
            className={`nav-link ${location.pathname === '/portfolio' ? 'active' : ''}`}
          >
            <PieChart size={18} />
            Portfoy
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              <Shield size={18} />
              Admin
            </Link>
          )}
          <Link
            to="/settings"
            className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
          >
            <SettingsIcon size={18} />
            Ayarlar
          </Link>
          {user && (
            <button onClick={logout} className="nav-link logout-btn">
              <LogOut size={18} />
              Çıkış
            </button>
          )}
        </div>
      </div>

      <style>{`
        .navbar {
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .navbar-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-links {
          display: flex;
          gap: 12px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .nav-link.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        .logout-btn {
          background: none;
          border: none;
          font-size: inherit;
        }

        .logout-btn:hover {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }

        @media (max-width: 768px) {
          .navbar-container {
            flex-direction: column;
            gap: 16px;
          }

          .nav-links {
            width: 100%;
            justify-content: center;
          }

          .nav-link {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </nav>
  );
};

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">
          © {currentYear} StockAIQ v1.1. Developed by <span className="developer-name">A. Rıdvan Elitez</span>
        </p>
      </div>

      <style>{`
        .footer {
          background: rgba(255, 255, 255, 0.03);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px 0;
          margin-top: auto;
        }

        .footer-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 20px;
          text-align: center;
        }

        .footer-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .developer-name {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </footer>
  );
};

export default App;
