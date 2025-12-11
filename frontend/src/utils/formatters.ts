/**
 * Sayıyı Türk Lirası formatında gösterir
 */
export const formatCurrency = (value: number | null, decimals: number = 2): string => {
  if (value === null || value === undefined) return '-';

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Sayıyı kısaltılmış formatta gösterir (1M, 1B, etc.)
 */
export const formatCompact = (value: number | null): string => {
  if (value === null || value === undefined) return '-';

  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  } else if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }

  return value.toFixed(2);
};

/**
 * Yüzde formatı
 */
export const formatPercent = (value: number | null, decimals: number = 2): string => {
  if (value === null || value === undefined) return '-';

  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * Sayı formatı (binlik ayracı ile)
 */
export const formatNumber = (value: number | null, decimals: number = 0): string => {
  if (value === null || value === undefined) return '-';

  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Tarih formatı
 */
export const formatDate = (date: Date | string | null): string => {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

/**
 * Değişim değerine göre renk döndürür
 */
export const getChangeColor = (value: number | null): string => {
  if (value === null || value === undefined) return '#6b7280';
  if (value > 0) return '#10b981'; // Yeşil
  if (value < 0) return '#ef4444'; // Kırmızı
  return '#6b7280'; // Gri
};

/**
 * F/K oranına göre renk döndürür
 */
export const getPERatioColor = (pe: number | null): string => {
  if (pe === null || pe === undefined) return '#6b7280';
  if (pe < 0) return '#ef4444'; // Negatif - Kırmızı
  if (pe < 10) return '#10b981'; // Düşük - Yeşil
  if (pe < 20) return '#f59e0b'; // Orta - Sarı
  return '#ef4444'; // Yüksek - Kırmızı
};

/**
 * Karlılık oranına göre renk döndürür
 */
export const getProfitabilityColor = (profitability: number | null): string => {
  if (profitability === null || profitability === undefined) return '#6b7280';
  if (profitability < 0) return '#ef4444'; // Zarar - Kırmızı
  if (profitability < 10) return '#f59e0b'; // Düşük - Sarı
  return '#10b981'; // İyi - Yeşil
};

/**
 * Sağlık durumu emoji
 */
export const getHealthEmoji = (status: string): string => {
  switch (status) {
    case 'operational':
    case 'healthy':
      return '🟢';
    case 'degraded':
      return '🟡';
    case 'down':
    case 'critical':
      return '🔴';
    default:
      return '⚪';
  }
};

/**
 * Tarih farkını "X dakika/saat/gün önce" formatında gösterir
 */
export const formatTimeAgo = (date: Date | string | null): string => {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Az önce';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} dk önce`;
  } else if (diffHours < 24) {
    return `${diffHours} sa önce`;
  } else if (diffDays < 7) {
    return `${diffDays} gün önce`;
  } else {
    return formatDate(d);
  }
};
