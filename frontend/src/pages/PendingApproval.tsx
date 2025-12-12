import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PendingApproval: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="pending-container">
      <div className="pending-card">
        <div className="pending-icon">
          <Clock size={64} />
        </div>

        <h1>Hesap Onayı Bekleniyor</h1>

        <p className="pending-message">
          Merhaba <strong>{user?.username}</strong>,
        </p>

        <p className="pending-info">
          Hesabınız başarıyla oluşturuldu ancak sistem yöneticisi tarafından henüz onaylanmadı.
          Lütfen onay sürecinin tamamlanmasını bekleyin.
        </p>

        <p className="pending-detail">
          Email adresiniz: <strong>{user?.email}</strong>
        </p>

        <div className="pending-actions">
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>

        <p className="pending-note">
          Hesabınız onaylandığında giriş yapabileceksiniz.
        </p>
      </div>

      <style>{`
        .pending-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .pending-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 48px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .pending-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
          color: #f59e0b;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        .pending-card h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 24px;
        }

        .pending-message {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 16px;
        }

        .pending-info {
          font-size: 15px;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .pending-detail {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 32px;
          padding: 12px 16px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
        }

        .pending-detail strong {
          color: #667eea;
        }

        .pending-actions {
          margin-bottom: 24px;
        }

        .logout-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
          border: 2px solid rgba(220, 38, 38, 0.3);
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-button:hover {
          background: rgba(220, 38, 38, 0.2);
          border-color: rgba(220, 38, 38, 0.5);
          transform: translateY(-2px);
        }

        .pending-note {
          font-size: 13px;
          color: #9ca3af;
          font-style: italic;
        }

        @media (max-width: 640px) {
          .pending-card {
            padding: 32px 24px;
          }

          .pending-card h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default PendingApproval;
