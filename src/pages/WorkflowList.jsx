import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import config from "../../config";

const WorkflowList = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/api/workflows/details`);
        if (!response.ok) {
          throw new Error("Failed to fetch workflows");
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
      <Card className="w-full max-w-6xl mx-auto flex flex-col !bg-black text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Workflow List</CardTitle>
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
                    href={`/workflow/${workflow.workflow_name}`}
                    className="text-lg text-black font-semibold dark:text-white hover:underline"
                  >
                    {workflow.workflow_name}
                  </a>
                  <span className="text-sm text-gray-400">
                    ID: {workflow.workflow_id}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowList;
