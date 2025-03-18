// src/pages/WorkflowView.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import config from "../../config";

const WorkflowView = () => {
  const { workflow_name } = useParams();
  const [workflowData, setWorkflowData] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch workflow_id based on workflow_name
  const getWorkflowId = async () => {
    try {
      console.log("API URL:", `${config.API_BASE_URL}/api/workflows/get_id`);
      const response = await fetch(
        `${config.API_BASE_URL}/api/workflows/get_id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workflow_name }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching workflow_id: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.workflow_id) {
        console.log(`Fetched workflow_id: ${data.workflow_id}`);
        setWorkflowId(data.workflow_id);
      } else {
        throw new Error("Workflow not found");
      }
    } catch (error) {
      console.error("Error getting workflow_id:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  // Fetch workflow data based on workflow_id
  const fetchWorkflowData = async (id) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/api/workflows/${id}`
      );
      if (!response.ok) {
        throw new Error(`Error fetching workflow: ${response.statusText}`);
      }
      const data = await response.json();
      setWorkflowData(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch workflow_id first, then load workflow data
    const loadWorkflow = async () => {
      await getWorkflowId();
    };

    loadWorkflow();
  }, [workflow_name]);

  // Fetch workflow data after workflow_id is set
  useEffect(() => {
    if (workflowId) {
      fetchWorkflowData(workflowId);
    }
  }, [workflowId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="dark">
      <div className="container lg:max-w-full py-8 bg-black min-h-screen text-white">
        {workflowData && (
          <>
            <div className="text-center text-2xl font-bold text-gray-300 mb-8">
              Veracity Global - Workflow {workflowData.workflow_name} (ID:{" "}
              {workflowId})
            </div>
            <div className="space-y-6">
              {workflowData.questions.map((question, index) => (
                <Card
                  key={question.question_id}
                  className={`max-w-2xl mx-auto ${
                    index === 0
                      ? "border-blue-800 border-2"
                      : "bg-[#1e2736] text-gray-400"
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="text-white">
                      Question {index + 1} (ID: {question.question_id}) of{" "}
                      {workflowData.questions.length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-medium text-lg text-white">
                      {question.question_text}
                    </div>
                    <ul className="list-disc pl-5 mt-4 text-gray-300">
                      {Array.isArray(question.options) &&
                      question.options.length > 0 ? (
                        question.options.map((option) => (
                          <li key={option.option_id}>
                            {option.option_text} (ID: {option.option_id})
                          </li>
                        ))
                      ) : (
                        <li>Question Type: {question.question_type}</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowView;