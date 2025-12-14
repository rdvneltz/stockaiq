import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, AlertCircle, CheckCircle, RefreshCw, Database, Trash2, Clock, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi, DatabaseStats } from '../services/api';

interface PendingUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

type TabType = 'users' | 'database';

const AdminPanel: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database state
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

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

  const fetchDbStats = async () => {
    if (!token) return;
    setDbLoading(true);
    try {
      const stats = await adminApi.getStats(token);
      setDbStats(stats);
    } catch (error) {
      showMessage('error', 'Veritabanı istatistikleri alınamadı');
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'database') {
      fetchDbStats();
    }
  }, [activeTab]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
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

  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'SIL') {
      showMessage('error', 'Onay için "SIL" yazmanız gerekiyor');
      return;
    }

    if (!token) return;

    setIsResetting(true);
    try {
      const result = await adminApi.resetDatabase(token);
      showMessage('success', `Veritabanı sıfırlandı! ${result.deletedCount} hisse silindi.`);
      setResetConfirmText('');
      fetchDbStats();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Veritabanı sıfırlanamadı');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetTimestamps = async (category: 'all' | 'quarterly' | 'daily') => {
    if (!token) return;

    const categoryNames: Record<string, string> = {
      all: 'tüm kategoriler',
      quarterly: 'bilanço/finansal veriler',
      daily: 'günlük veriler',
    };

    if (!confirm(`${categoryNames[category]} için güncelleme zamanları sıfırlanacak. Bu işlem verilerin yeniden çekilmesini zorunlu kılar. Devam etmek istiyor musunuz?`)) {
      return;
    }

    try {
      const result = await adminApi.resetTimestamps(token, category);
      showMessage('success', `${result.modifiedCount} hisse için güncelleme zamanları sıfırlandı`);
      fetchDbStats();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Güncelleme zamanları sıfırlanamadı');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-content">
            <Database size={32} />
            <div>
              <h1>Admin Panel</h1>
              <p>Sistem yönetimi</p>
            </div>
          </div>
          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} />
              Kullanıcılar
            </button>
            <button
              className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
            >
              <Database size={18} />
              Veritabanı
            </button>
          </div>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="section-header">
              <h2><UserCheck size={24} /> Kullanıcı Onay Yönetimi</h2>
              <button onClick={fetchPendingUsers} className="refresh-btn" disabled={loading}>
                <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                Yenile
              </button>
            </div>

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
          </>
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
          <>
            <div className="section-header">
              <h2><Database size={24} /> Veritabanı Yönetimi</h2>
              <button onClick={fetchDbStats} className="refresh-btn" disabled={dbLoading}>
                <RefreshCw size={18} className={dbLoading ? 'spinning' : ''} />
                Yenile
              </button>
            </div>

            {/* Stats Section */}
            <div className="db-section">
              <h3>İstatistikler</h3>
              {dbLoading ? (
                <div className="loading-state small">
                  <RefreshCw size={24} className="spinning" />
                  <p>Yükleniyor...</p>
                </div>
              ) : dbStats ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{dbStats.totalStocks}</div>
                    <div className="stat-label">Toplam Hisse</div>
                  </div>
                  <div className="stat-card warning">
                    <div className="stat-value">{dbStats.stocksWithoutPrice}</div>
                    <div className="stat-label">Fiyatsız Hisse</div>
                  </div>
                  <div className="stat-card warning">
                    <div className="stat-value">{dbStats.stocksWithoutFinancials}</div>
                    <div className="stat-label">Finansal Verisi Olmayan</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value small">
                      {dbStats.oldestUpdate
                        ? new Date(dbStats.oldestUpdate).toLocaleDateString('tr-TR')
                        : '-'}
                    </div>
                    <div className="stat-label">En Eski Güncelleme ({dbStats.oldestSymbol || '-'})</div>
                  </div>
                </div>
              ) : (
                <p className="no-data">İstatistik verisi yok</p>
              )}
            </div>

            {/* Reset Timestamps Section */}
            <div className="db-section">
              <h3><Clock size={20} /> Güncelleme Zamanlarını Sıfırla</h3>
              <p className="section-desc">
                Bu işlem verileri silmez, sadece güncelleme zamanlarını sıfırlar.
                Böylece sistem tüm verileri yeniden çeker.
              </p>
              <div className="action-buttons">
                <button
                  onClick={() => handleResetTimestamps('quarterly')}
                  className="action-btn warning"
                >
                  <RotateCcw size={18} />
                  Bilanço/Finansal (30 günlük)
                </button>
                <button
                  onClick={() => handleResetTimestamps('daily')}
                  className="action-btn warning"
                >
                  <RotateCcw size={18} />
                  Günlük Veriler (24 saatlik)
                </button>
                <button
                  onClick={() => handleResetTimestamps('all')}
                  className="action-btn warning"
                >
                  <RotateCcw size={18} />
                  Tüm Zamanları Sıfırla
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="db-section danger-zone">
              <h3><Trash2 size={20} /> Tehlikeli Bölge</h3>
              <p className="section-desc danger">
                Bu işlemler geri alınamaz! Dikkatli olun.
              </p>

              <div className="danger-action">
                <div className="danger-info">
                  <h4>Veritabanını Sıfırla</h4>
                  <p>Tüm hisse verilerini siler. Sistem tüm verileri sıfırdan çekecektir.</p>
                </div>
                <div className="danger-confirm">
                  <input
                    type="text"
                    placeholder='Onaylamak için "SIL" yazın'
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                    className="confirm-input"
                  />
                  <button
                    onClick={handleResetDatabase}
                    className="action-btn danger"
                    disabled={resetConfirmText !== 'SIL' || isResetting}
                  >
                    {isResetting ? (
                      <>
                        <RefreshCw size={18} className="spinning" />
                        Siliniyor...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Veritabanını Sil
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
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

        .tab-buttons {
          display: flex;
          gap: 8px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border-color: transparent;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-header h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 600;
          color: #fff;
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
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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

        .loading-state.small {
          padding: 32px 20px;
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

        /* Database Section Styles */
        .db-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .db-section h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 16px;
        }

        .section-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .section-desc.danger {
          color: #ef4444;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }

        .stat-card.warning {
          border-color: rgba(251, 191, 36, 0.3);
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }

        .stat-value.small {
          font-size: 18px;
        }

        .stat-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.warning {
          background: rgba(251, 191, 36, 0.1);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .action-btn.warning:hover {
          background: rgba(251, 191, 36, 0.2);
          transform: translateY(-2px);
        }

        .action-btn.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .action-btn.danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-2px);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .danger-zone {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }

        .danger-action {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .danger-info h4 {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }

        .danger-info p {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .danger-confirm {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .confirm-input {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          width: 180px;
        }

        .confirm-input:focus {
          outline: none;
          border-color: #ef4444;
        }

        .confirm-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .no-data {
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
        }

        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .tab-buttons {
            width: 100%;
          }

          .tab-btn {
            flex: 1;
            justify-content: center;
          }

          .users-grid {
            grid-template-columns: 1fr;
          }

          .danger-action {
            flex-direction: column;
            align-items: stretch;
          }

          .danger-confirm {
            flex-direction: column;
          }

          .confirm-input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;
