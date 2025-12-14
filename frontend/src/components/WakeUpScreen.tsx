import React, { useState, useEffect } from 'react';
import { Server, Loader, Coffee, Zap } from 'lucide-react';

interface WakeUpScreenProps {
  isVisible: boolean;
}

const WakeUpScreen: React.FC<WakeUpScreenProps> = ({ isVisible }) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Sunucu uyandırılıyor...');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // Progress bar animasyonu (max 60 saniye)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        // Yavaşlayan ilerleme
        const increment = Math.max(0.5, (100 - prev) / 30);
        return Math.min(95, prev + increment);
      });
    }, 500);

    // Mesaj değişimi
    const messages = [
      { time: 0, text: 'Sunucu uyandırılıyor', icon: 'coffee' },
      { time: 5000, text: 'Bağlantı kuruluyor', icon: 'server' },
      { time: 15000, text: 'Servisler başlatılıyor', icon: 'zap' },
      { time: 30000, text: 'Neredeyse hazır', icon: 'loader' },
      { time: 45000, text: 'Biraz daha sabır', icon: 'coffee' },
    ];

    const messageTimers = messages.map(({ time, text }) =>
      setTimeout(() => setMessage(text), time)
    );

    // Animasyonlu noktalar
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(dotsInterval);
      messageTimers.forEach(clearTimeout);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="wakeup-overlay">
      <div className="wakeup-container">
        <div className="wakeup-icon">
          <Coffee size={48} className="coffee-icon" />
          <div className="steam">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <h2 className="wakeup-title">StockAIQ</h2>
        <p className="wakeup-message">{message}{dots}</p>

        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>

        <p className="wakeup-info">
          Ücretsiz sunucu kullanıyoruz. İlk açılış ~30 saniye sürebilir.
        </p>

        <div className="wakeup-tips">
          <Zap size={14} />
          <span>İpucu: Sistem aktif kaldığı sürece hızlı çalışır</span>
        </div>
      </div>

      <style>{`
        .wakeup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .wakeup-container {
          text-align: center;
          padding: 40px;
          max-width: 400px;
        }

        .wakeup-icon {
          position: relative;
          display: inline-block;
          margin-bottom: 24px;
        }

        .coffee-icon {
          color: #667eea;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .steam {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
        }

        .steam span {
          width: 4px;
          height: 20px;
          background: linear-gradient(to top, transparent, rgba(102, 126, 234, 0.6));
          border-radius: 2px;
          animation: steam 1.5s ease-in-out infinite;
        }

        .steam span:nth-child(2) {
          animation-delay: 0.2s;
          height: 25px;
        }

        .steam span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes steam {
          0% { transform: translateY(0) scaleY(1); opacity: 0.6; }
          50% { transform: translateY(-10px) scaleY(1.2); opacity: 0.3; }
          100% { transform: translateY(-20px) scaleY(0.8); opacity: 0; }
        }

        .wakeup-title {
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .wakeup-message {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 24px;
          min-height: 27px;
        }

        .progress-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
          transition: width 0.5s ease;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          min-width: 40px;
        }

        .wakeup-info {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 16px;
        }

        .wakeup-tips {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .wakeup-tips svg {
          color: #f59e0b;
        }
      `}</style>
    </div>
  );
};

export default WakeUpScreen;
