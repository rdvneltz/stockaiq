// OneSignal will be initialized via script tag in production
export const initOneSignal = async () => {
  try {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

    if (!appId || typeof window === 'undefined') {
      console.warn('OneSignal App ID not configured or running on server');
      return;
    }

    // Wait for OneSignal to load
    if (!(window as any).OneSignal) {
      console.warn('OneSignal SDK not loaded yet');
      return;
    }

    // Initialize OneSignal
    await (window as any).OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
    });

    console.log('OneSignal initialized successfully');
  } catch (error) {
    console.error('OneSignal initialization failed:', error);
  }
};

export const subscribeToNotifications = async () => {
  try {
    if (typeof window !== 'undefined' && (window as any).OneSignal) {
      await (window as any).OneSignal.Slidedown.promptPush();
    }
  } catch (error) {
    console.error('Failed to show notification prompt:', error);
  }
};

export const setUserTags = async (userId: string, preferences: any) => {
  try {
    if (typeof window !== 'undefined' && (window as any).OneSignal) {
      await (window as any).OneSignal.User.addTags({
        user_id: userId,
        trading_signals: preferences.tradingSignals ? 'true' : 'false',
        price_alerts: preferences.priceAlerts ? 'true' : 'false',
        news: preferences.news ? 'true' : 'false',
      });
      console.log('User tags set successfully');
    }
  } catch (error) {
    console.error('Failed to set user tags:', error);
  }
};

export const getNotificationPermission = (): boolean => {
  try {
    if (typeof window !== 'undefined' && (window as any).OneSignal) {
      return (window as any).OneSignal.Notifications.permission;
    }
    return false;
  } catch (error) {
    console.error('Failed to get notification permission:', error);
    return false;
  }
};
