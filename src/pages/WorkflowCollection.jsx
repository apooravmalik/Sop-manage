import { useTheme } from "../components/ThemeContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Moon, Sun } from "lucide-react";

const WorkflowCollection = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  // Sample workflow data - replace with your actual data source
  const workflows = [
    { id: "WF-001", name: "Emergency Response", incident_type: "Critical" },
    { id: "WF-002", name: "Maintenance Request", incident_type: "Regular" },
    { id: "WF-003", name: "Security Alert", incident_type: "High Priority" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800">
      <div className="p-6 dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold dark:text-white">
            Workflow Collection
          </h1>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {darkMode ? (
              <Sun className="h-6 w-6 text-yellow-500" />
            ) : (
              <Moon className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="text-xl">{workflow.name}</span>
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    {workflow.id}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Incident Type:
                  </span>
                  <span
                    className={`
                  ml-2 px-2 py-1 rounded-full text-sm
                  ${
                    workflow.incident_type === "Critical"
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : workflow.incident_type === "High Priority"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  }
                `}
                  >
                    {workflow.incident_type}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowCollection;
