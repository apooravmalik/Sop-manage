import { ThemeProvider } from './components/ThemeContext';
import WorkflowBuilder from './components/WorkflowBuilder';

const App = () => {
  return (
    <ThemeProvider>
      <WorkflowBuilder />
    </ThemeProvider>
  );
};

export default App;