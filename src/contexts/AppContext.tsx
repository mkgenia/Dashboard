import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AppContextType {
  initialCaptacionId: number | null;
  setInitialCaptacionId: (id: number | null) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  notification: { message: string; type: 'success' | 'error' } | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [initialCaptacionId, setInitialCaptacionId] = useState<number | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <AppContext.Provider value={{
      initialCaptacionId,
      setInitialCaptacionId,
      activeChatId,
      setActiveChatId,
      showNotification,
      notification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
