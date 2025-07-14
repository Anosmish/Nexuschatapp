
import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { UserIdentity } from './types';
import IdentitySetup from './components/IdentitySetup';
import ChatInterface from './components/ChatInterface';
import { SunIcon, MoonIcon } from './components/icons/ThemeIcons';

const App: React.FC = () => {
  const [identity, setIdentity] = useLocalStorage<UserIdentity | null>('user-identity', null);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleIdentityCreated = (newIdentity: UserIdentity) => {
    setIdentity(newIdentity);
  };
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to delete your identity and all data? This cannot be undone.')) {
        localStorage.removeItem('user-identity');
        localStorage.removeItem('peer-identity');
        localStorage.removeItem('chat-messages');
        setIdentity(null);
    }
  };

  return (
    <div className="min-h-screen font-sans text-light-text dark:text-dark-text transition-colors duration-300">
      <header className="absolute top-0 right-0 p-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-light-panel dark:bg-secondary hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
        </button>
      </header>
      <main className="container mx-auto p-4 pt-16">
        {identity ? (
          <ChatInterface identity={identity} onLogout={handleLogout} />
        ) : (
          <IdentitySetup onIdentityCreated={handleIdentityCreated} />
        )}
      </main>
    </div>
  );
};

export default App;
