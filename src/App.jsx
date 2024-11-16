import { ThemeProvider } from './components/ThemeContext';
import WorkflowBuilder from './pages/WorkflowBuilder';

const App = () => {
  return (
    <ThemeProvider>
      <WorkflowBuilder />
    </ThemeProvider>
  );
};

export default App;