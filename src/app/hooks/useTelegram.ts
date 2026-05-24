import { useEffect, useState } from 'react';

type TelegramWebApp = {
  colorScheme?: string;
  initDataUnsafe?: {
    user?: unknown;
  };
  ready?: () => void;
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const telegramWebApp = (window as TelegramWindow).Telegram?.WebApp ?? null;

    setWebApp(telegramWebApp);
    setIsReady(true);

    telegramWebApp?.ready?.();
  }, []);

  return { isReady, webApp };
}