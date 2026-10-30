import { useState, useEffect } from 'react';
import { AppContext } from './appContextValue';

export function AppProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <AppContext.Provider value={{ dark, setDark, sidebarOpen, setSidebarOpen }}>
      {children}
    </AppContext.Provider>
  );
}
