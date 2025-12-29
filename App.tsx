import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';

function App() {
  // Check system preference initially
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="antialiased text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
        <Dashboard darkMode={darkMode} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
}

export default App;