import { useState, useEffect } from 'react';
import { useTheme } from "../components/ThemeContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Moon, Sun } from "lucide-react";
import config from "../../config";

const WorkflowCollection = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/api/workflows/details`);
        if (!response.ok) {
          throw new Error('Failed to fetch workflows');
        }
        const data = await response.json();
        setWorkflows(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  if (loading) {
    return (
      <div className="bg-black min-h-screen">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-6 dark:text-white">
            Loading workflows...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black min-h-screen">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-6 text-red-500 dark:text-white">
            Error: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <Card className="w-full max-w-6xl mx-auto flex flex-col dark:bg-black text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Workflow Collection</CardTitle>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-700"
          >
            {darkMode ? (
              <Moon className="h-6 w-6 text-white" />
            ) : (
              <Sun className="h-6 w-6 text-yellow-500" />
            )}
          </button>
        </CardHeader>
        <CardContent className="grid gap-2 flex-grow px-4">
          {workflows.map((workflow) => (
            <Card
              key={workflow.workflow_id}
              className="dark:bg-[#1e2736] border border-gray-700 rounded-lg"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <a
                    href={`/workflow/${workflow.workflow_id}`}
                    className="text-lg text-black font-semibold dark:text-white hover:underline"
                  >
                    {workflow.workflow_name}
                  </a>
                  <span className="text-sm text-gray-400">
                    ID: {workflow.workflow_id}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-400">
                      Incident Type:
                    </span>
                    <span className="text-sm ml-2 text-black dark:text-white">
                      {workflow.incident_type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Created: {new Date(workflow.created_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowCollection;