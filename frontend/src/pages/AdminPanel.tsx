import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PendingUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

const AdminPanel: React.FC = () => {
  const { token } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPendingUsers(data.data.users);
      } else {
        showMessage('error', data.message);
      }
    } catch (error) {
      showMessage('error', 'Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleApprove = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/admin/approve/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Kullanıcı onaylandı');
        fetchPendingUsers();
      } else {
        showMessage('error', data.message);
      }
    } catch (error) {
      showMessage('error', 'Kullanıcı onaylanırken hata oluştu');
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı reddetmek ve silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/admin/reject/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Kullanıcı reddedildi');
        fetchPendingUsers();
      } else {
        showMessage('error', data.message);
      }
    } catch (error) {
      showMessage('error', 'Kullanıcı reddedilirken hata oluştu');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-content">
            <Users size={32} />
            <div>
              <h1>Admin Panel</h1>
              <p>Kullanıcı onay yönetimi</p>
            </div>
          </div>
          <button onClick={fetchPendingUsers} className="refresh-btn" disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            Yenile
          </button>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Yükleniyor...</p>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={48} />
            <h3>Onay bekleyen kullanıcı yok</h3>
            <p>Tüm kullanıcılar onaylanmış durumda</p>
          </div>
        ) : (
          <div className="users-grid">
            {pendingUsers.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <div className="user-avatar">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <h3>{user.username}</h3>
                    <p className="user-email">{user.email}</p>
                    <p className="user-date">
                      Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="user-actions">
                  <button
                    onClick={() => handleApprove(user.id)}
                    className="approve-btn"
                    title="Kullanıcıyı onayla"
                  >
                    <UserCheck size={18} />
                    Onayla
                  </button>
                  <button
                    onClick={() => handleReject(user.id)}
                    className="reject-btn"
                    title="Kullanıcıyı reddet"
                  >
                    <UserX size={18} />
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .admin-panel {
          min-height: calc(100vh - 200px);
          padding: 32px 20px;
        }

        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #fff;
        }

        .header-content h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .header-content p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 500;
        }

        .message.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .loading-state {
          text-align: center;
          padding: 64px 20px;
          color: rgba(255, 255, 255, 0.6);
        }

        .loading-state p {
          margin-top: 16px;
          font-size: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 64px 20px;
          color: rgba(255, 255, 255, 0.6);
        }

        .empty-state h3 {
          margin-top: 24px;
          font-size: 20px;
          font-weight: 600;
          color: #fff;
        }

        .empty-state p {
          margin-top: 8px;
          font-size: 14px;
        }

        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 20px;
        }

        .user-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .user-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .user-info {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }

        .user-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }

        .user-details {
          flex: 1;
        }

        .user-details h3 {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }

        .user-email {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 4px;
        }

        .user-date {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
        }

        .user-actions {
          display: flex;
          gap: 12px;
        }

        .user-actions button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .approve-btn {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .approve-btn:hover {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.5);
          transform: translateY(-2px);
        }

        .reject-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .reject-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .users-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;
