import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(true);

useEffect(() => {
   // First, check if the user has a saved preference in localStorage
   const savedDarkMode = localStorage.getItem('darkMode');
   // If saved preference exists, use it, otherwise use the default (true)
   const isDark = savedDarkMode === null ? true : savedDarkMode === 'true';
   setDarkMode(isDark);
   // Apply the 'dark' class to the document root element
   document.documentElement.classList.toggle('dark', isDark);
 }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};