import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { healthApi } from '../services/api';
import { SystemHealth } from '../types';
import { getHealthEmoji } from '../utils/formatters';

const HealthAlert: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();

    // Her 5 dakikada bir kontrol et
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const healthData = await healthApi.getHealth();
      setHealth(healthData);
      setLoading(false);
    } catch (error) {
      console.error('Health check failed:', error);
      setLoading(false);
    }
  };

  if (loading || !health || dismissed) return null;

  // Eğer sistem sağlıklı ise uyarı gösterme
  if (health.overall === 'healthy') return null;

  const problematicSources = health.dataSources.filter(ds => ds.status !== 'operational');

  return (
    <div className={`alert ${health.overall === 'critical' ? 'critical' : 'warning'}`}>
      <div className="alert-content">
        <AlertTriangle size={20} />
        <div className="alert-text">
          <strong>
            {health.overall === 'critical' ? '⚠️ Kritik Sistem Uyarısı' : '⚠️ Sistem Uyarısı'}
          </strong>
          <p>
            {problematicSources.length} veri kaynağı çalışmıyor. Veriler eksik olabilir.
          </p>
          <div className="sources">
            {problematicSources.map(source => (
              <span key={source.name}>
                {getHealthEmoji(source.status)} {source.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button className="dismiss-btn" onClick={() => setDismissed(true)}>
        <X size={18} />
      </button>

      <style>{`
        .alert {
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 400px;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          animation: slideIn 0.3s ease-out;
        }

        .alert.warning {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }

        .alert.critical {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .alert-content {
          display: flex;
          gap: 12px;
          flex: 1;
        }

        .alert-text {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .alert-text strong {
          font-size: 14px;
          font-weight: 600;
        }

        .alert-text p {
          font-size: 13px;
          opacity: 0.9;
        }

        .sources {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          opacity: 0.8;
        }

        .dismiss-btn {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 4px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .dismiss-btn:hover {
          opacity: 1;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default HealthAlert;
