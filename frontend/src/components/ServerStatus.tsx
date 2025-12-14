import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Loader } from 'lucide-react';

type ServerState = 'online' | 'offline' | 'waking' | 'checking';

interface ServerStatusProps {
  onWaking?: (isWaking: boolean) => void;
}

const ServerStatus: React.FC<ServerStatusProps> = ({ onWaking }) => {
  const [status, setStatus] = useState<ServerState>('checking');
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [wakeStartTime, setWakeStartTime] = useState<Date | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const PING_INTERVAL = 2 * 60 * 1000; // 2 dakika
  const WAKE_TIMEOUT = 60 * 1000; // 60 saniye max bekleme

  const pingServer = useCallback(async () => {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        setStatus('online');
        setLastPing(new Date());
        setWakeStartTime(null);
        onWaking?.(false);
        console.log(`Server online (${responseTime}ms)`);
      } else {
        throw new Error('Server returned error');
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;

      // İlk hata veya kısa sürede cevap gelmedi - uyandırma moduna geç
      if (elapsed < 5000 && status !== 'waking') {
        setStatus('waking');
        if (!wakeStartTime) {
          setWakeStartTime(new Date());
        }
        onWaking?.(true);
        console.log('Server waking up...');

        // 3 saniye sonra tekrar dene
        setTimeout(pingServer, 3000);
      } else if (wakeStartTime && (Date.now() - wakeStartTime.getTime()) > WAKE_TIMEOUT) {
        // Çok uzun süredir uyanmıyor - offline
        setStatus('offline');
        onWaking?.(false);
        console.log('Server appears to be offline');
      } else if (status === 'waking') {
        // Hala uyandırılıyor, tekrar dene
        setTimeout(pingServer, 3000);
      } else {
        setStatus('offline');
        onWaking?.(false);
      }
    }
  }, [API_URL, status, wakeStartTime, onWaking]);

  useEffect(() => {
    // İlk ping
    pingServer();

    // Periyodik ping
    const interval = setInterval(pingServer, PING_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Manuel ping için
  const handleClick = () => {
    if (status !== 'waking' && status !== 'checking') {
      setStatus('checking');
      pingServer();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'offline': return '#ef4444';
      case 'waking': return '#f59e0b';
      case 'checking': return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online': return 'Sunucu aktif';
      case 'offline': return 'Sunucu çevrimdışı';
      case 'waking': return 'Sunucu uyanıyor...';
      case 'checking': return 'Kontrol ediliyor...';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'online': return <Wifi size={14} />;
      case 'offline': return <WifiOff size={14} />;
      case 'waking':
      case 'checking': return <Loader size={14} className="spin" />;
    }
  };

  return (
    <>
      <div
        className="server-status"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ '--status-color': getStatusColor() } as React.CSSProperties}
      >
        <div className="status-dot" />
        {getIcon()}

        {showTooltip && (
          <div className="status-tooltip">
            <div className="tooltip-title">{getStatusText()}</div>
            {lastPing && status === 'online' && (
              <div className="tooltip-info">
                Son ping: {lastPing.toLocaleTimeString('tr-TR')}
              </div>
            )}
            {status === 'waking' && wakeStartTime && (
              <div className="tooltip-info">
                Uyandırma başladı: {Math.round((Date.now() - wakeStartTime.getTime()) / 1000)}s
              </div>
            )}
            <div className="tooltip-hint">Tıkla: Manuel kontrol</div>
          </div>
        )}
      </div>

      <style>{`
        .server-status {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          cursor: pointer;
          z-index: 1000;
          transition: all 0.3s ease;
          color: var(--status-color);
        }

        .server-status:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(1.05);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--status-color);
          box-shadow: 0 0 8px var(--status-color);
          animation: ${status === 'online' ? 'pulse' : 'none'} 2s infinite;
        }

        .status-tooltip {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          white-space: nowrap;
          color: #fff;
          font-size: 12px;
        }

        .tooltip-title {
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--status-color);
        }

        .tooltip-info {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 2px;
        }

        .tooltip-hint {
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
          margin-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 6px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default ServerStatus;
