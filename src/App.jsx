import { ThemeProvider } from './components/ThemeContext';
import WorkflowBuilder from './pages/WorkflowBuilder';
import WorkflowCollection from './pages/WorkflowCollection';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useTheme } from './components/ThemeContext';
import PropTypes from 'prop-types';

const Navigation = () => {
  const { darkMode } = useTheme();
  
  return (
    <nav className={`fixed top-0 w-full p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} shadow-md z-50`}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">Workflow Manager</div>
        <div className="space-x-4">
          <Link 
            to="/" 
            className={`px-4 py-2 rounded-md ${darkMode 
              ? 'hover:bg-gray-700' 
              : 'hover:bg-gray-100'} transition-colors`}
          >
            Collection
          </Link>
          <Link 
            to="/builder" 
            className={`px-4 py-2 rounded-md ${darkMode 
              ? 'hover:bg-gray-700' 
              : 'hover:bg-gray-100'} transition-colors`}
          >
            Builder
          </Link>
        </div>
      </div>
    </nav>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="pt-16">
      <Navigation />
      <main className="container p-4 dark:bg-gray-800">
        {children}
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<WorkflowCollection />} />
            <Route path="/builder" element={<WorkflowBuilder />} />
          </Routes>
        </Layout>
      </ThemeProvider>
    </BrowserRouter>
  );
};

// PropTypes for the WorkflowCollection component
WorkflowCollection.propTypes = {
  darkMode: PropTypes.bool,
  toggleDarkMode: PropTypes.func
};

// Default props for the WorkflowCollection component
WorkflowCollection.defaultProps = {
  darkMode: false,
  toggleDarkMode: () => {}
};

// PropTypes for the WorkflowBuilder component
WorkflowBuilder.propTypes = {
  darkMode: PropTypes.bool,
  toggleDarkMode: PropTypes.func
};

// Default props for the WorkflowBuilder component
WorkflowBuilder.defaultProps = {
  darkMode: false,
  toggleDarkMode: () => {}
};

export default App;