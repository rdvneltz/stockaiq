import React, { useState } from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { healthApi } from '../services/api';
import { getHealthEmoji } from '../utils/formatters';

const Settings: React.FC = () => {
  const [finnetApiKey, setFinnetApiKey] = useState('');
  const [matriksApiKey, setMatriksApiKey] = useState('');
  const [bistApiKey, setBistApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const handleSave = () => {
    // API anahtarlarını localStorage'a kaydet (geliştirme amaçlı)
    // Gerçek implementasyonda backend'e gönderilmeli
    localStorage.setItem('api_keys', JSON.stringify({
      finnet: finnetApiKey,
      matriks: matriksApiKey,
      bist: bistApiKey,
    }));

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleHealthCheck = async () => {
    setChecking(true);
    try {
      const health = await healthApi.checkHealth();
      setHealthStatus(health);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  React.useEffect(() => {
    // Kaydedilmiş API anahtarlarını yükle
    const saved = localStorage.getItem('api_keys');
    if (saved) {
      const keys = JSON.parse(saved);
      setFinnetApiKey(keys.finnet || '');
      setMatriksApiKey(keys.matriks || '');
      setBistApiKey(keys.bist || '');
    }

    // Başlangıçta health check yap
    handleHealthCheck();
  }, []);

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>⚙️ Ayarlar</h1>

        {/* Sistem Durumu */}
        <div className="section">
          <h2>🏥 Sistem Durumu</h2>
          <div className="health-section">
            <button onClick={handleHealthCheck} disabled={checking} className="check-btn">
              <RefreshCw size={18} className={checking ? 'spinning' : ''} />
              {checking ? 'Kontrol ediliyor...' : 'Durumu Kontrol Et'}
            </button>

            {healthStatus && (
              <div className="health-results">
                <div className={`overall-status ${healthStatus.overall}`}>
                  {getHealthEmoji(healthStatus.overall)} Genel Durum: {healthStatus.overall.toUpperCase()}
                </div>

                <div className="sources-list">
                  {healthStatus.dataSources.map((source: any) => (
                    <div key={source.name} className={`source-item ${source.status}`}>
                      <span className="source-name">
                        {getHealthEmoji(source.status)} {source.name}
                      </span>
                      <span className="source-status">{source.status}</span>
                      {source.responseTime && (
                        <span className="response-time">{source.responseTime}ms</span>
                      )}
                      {source.errorMessage && (
                        <div className="error-msg">
                          <AlertCircle size={14} />
                          {source.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Ayarları */}
        <div className="section">
          <h2>🔑 Ücretli API Entegrasyonları</h2>
          <p className="section-description">
            Gelişmiş özelliklere erişim için ücretli API anahtarlarınızı buradan ekleyebilirsiniz.
            Bu anahtarlar şimdilik kullanılmamaktadır ancak gelecekte aktif hale getirilebilir.
          </p>

          <div className="api-keys-form">
            <div className="form-group">
              <label htmlFor="finnet">Finnet API Key</label>
              <input
                type="password"
                id="finnet"
                placeholder="Finnet API anahtarınızı girin"
                value={finnetApiKey}
                onChange={(e) => setFinnetApiKey(e.target.value)}
              />
              <small>Finnet veri servisi için gerekli (opsiyonel)</small>
            </div>

            <div className="form-group">
              <label htmlFor="matriks">Matriks API Key</label>
              <input
                type="password"
                id="matriks"
                placeholder="Matriks API anahtarınızı girin"
                value={matriksApiKey}
                onChange={(e) => setMatriksApiKey(e.target.value)}
              />
              <small>Matriks veri servisi için gerekli (opsiyonel)</small>
            </div>

            <div className="form-group">
              <label htmlFor="bist">BIST API Key</label>
              <input
                type="password"
                id="bist"
                placeholder="BIST API anahtarınızı girin"
                value={bistApiKey}
                onChange={(e) => setBistApiKey(e.target.value)}
              />
              <small>BIST resmi API için gerekli (opsiyonel)</small>
            </div>

            <button onClick={handleSave} className="save-btn">
              <Save size={18} />
              {saved ? 'Kaydedildi ✓' : 'Kaydet'}
            </button>
          </div>
        </div>

        {/* Bilgilendirme */}
        <div className="info-box">
          <AlertCircle size={20} />
          <div>
            <strong>Not:</strong> Şu anda sistem ücretsiz veri kaynaklarını (Yahoo Finance, KAP,
            Investing.com) kullanmaktadır. Ücretli API entegrasyonları gelecekte aktif hale
            getirilebilir.
          </div>
        </div>
      </div>

      <style>{`
        .settings-page {
          min-height: 100vh;
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .settings-container h1 {
          font-size: 32px;
          margin-bottom: 30px;
        }

        .section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .section h2 {
          font-size: 20px;
          margin-bottom: 16px;
        }

        .section-description {
          font-size: 14px;
          opacity: 0.7;
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .health-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .check-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
          width: fit-content;
        }

        .check-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .check-btn:disabled {
          opacity: 0.6;
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

        .health-results {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .overall-status {
          padding: 16px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
        }

        .overall-status.healthy {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .overall-status.degraded {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        }

        .overall-status.critical {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .sources-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .source-item {
          padding: 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .source-name {
          flex: 1;
          font-weight: 600;
        }

        .source-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
        }

        .response-time {
          font-size: 12px;
          opacity: 0.7;
        }

        .error-msg {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #ef4444;
          opacity: 0.9;
        }

        .api-keys-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          font-size: 14px;
        }

        .form-group input {
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group small {
          font-size: 12px;
          opacity: 0.6;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
          width: fit-content;
        }

        .save-btn:hover {
          transform: translateY(-2px);
        }

        .info-box {
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
          padding: 16px;
          border-radius: 8px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .info-box strong {
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .settings-page {
            padding: 12px;
          }

          .settings-container h1 {
            font-size: 24px;
          }

          .section {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
