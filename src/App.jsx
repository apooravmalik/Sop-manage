import { ThemeProvider } from "./components/ThemeContext";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import WorkflowCollection from "./pages/WorkflowCollection";
import WorkflowQuiz from "./pages/WorkflowShowcase";
import WorkflowView from "./pages/WorkflowView";
import WorkflowList from "./pages/WorkflowList";
// import VeracityLogo from "./assets/Veracity_logo.png";
import config from "../config";

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
// import { useTheme } from "./components/ThemeContext";
import PropTypes from "prop-types";
import { useState } from "react";

// const Navigation = () => {
//   const { darkMode } = useTheme();
//   const location = useLocation();

//   if (location.pathname.includes("/workflow/")) {
//     return null;
//   }

//   return (
//     <nav
//       className={`fixed top-0 w-full p-1 ${
//         darkMode ? "bg-black text-white" : "bg-white text-gray-800"
//       } shadow-md z-50`}
//     >
//       <div className="container mx-auto lg:max-w-full flex justify-between items-center">
//         <div className="text-xl font-bold">
//           <img src={VeracityLogo} className="h-14 w-14" alt="Logo" />
//         </div>
//         <div className="space-x-4">
//           <Link
//             to="/"
//             className={`px-4 py-2 rounded-md ${
//               darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
//             } transition-colors`}
//           >
//             Collection
//           </Link>
//           <Link
//             to="/builder"
//             className={`px-4 py-2 rounded-md ${
//               darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
//             } transition-colors`}
//           >
//             Builder
//           </Link>
//         </div>
//       </div>
//     </nav>
//   );
// };

const Layout = ({ children }) => {
  const location = useLocation();
  const isQuizPage = location.pathname.includes("/workflow/");

  return (
    <div
      className={`min-h-screen ${
        isQuizPage ? "bg-black" : "pt-16 bg-black"
      }`}
    >
      {/* Navbar has been removed */}
      <main
        className={`container w-full dark:bg-gray-800 lg:max-w-full ${
          isQuizPage ? "max-w-full mx-auto" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

const WorkflowModalWrapper = ({ children }) => {
  const navigate = useNavigate();
  const [incidentNumber, setIncidentNumber] = useState("");
  const [showModal, setShowModal] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [workflowId, setWorkflowId] = useState(null);
  const [workflowName, setWorkflowName] = useState(""); // Store workflowName

  // Fetch workflow_id from workflow_name
  const getWorkflowId = async (workflowName) => {
    try {
      console.log(`Fetching workflow_id for ${workflowName}...`);
      const response = await fetch(
        `${config.API_BASE_URL}/api/workflows/get_id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workflow_name: workflowName }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch workflow_id");
      }

      const data = await response.json();
      if (data.workflow_id) {
        console.log(`Fetched workflow_id: ${data.workflow_id}`);
        setWorkflowId(data.workflow_id);
        setWorkflowName(workflowName); // Set workflowName in state
      } else {
        throw new Error("Workflow not found");
      }
    } catch (error) {
      console.error("Error fetching workflow_id:", error);
      setErrorMessage("Unable to fetch workflow. Please try again.");
    }
  };

  // Extract workflow_name from URL and fetch workflow_id
  useState(() => {
    const workflowName = window.location.pathname.split("/")[2];
    if (workflowName) {
      getWorkflowId(workflowName);
    }
  }, []);

  const handleSubmit = async () => {
    if (!workflowId) {
      setErrorMessage("Workflow is not ready. Please try again.");
      return;
    }

    if (incidentNumber.trim()) {
      try {
        console.log(`Validating incident ${incidentNumber}...`);
        const response = await fetch(
          `${config.API_BASE_URL}/api/incident-log/check?incidentlog_prk=${incidentNumber}&workflow_id=${workflowId}`
        );

        const data = await response.json();

        if (response.ok && data.exists) {
          setShowModal(false);
          //Navigate using workflowName instead of workflowId
          navigate(`/workflow/${workflowName}/${incidentNumber}`);
        } else if (data.error) {
          if (data.error === "Incident is closed") {
            setErrorMessage("This incident is closed and cannot be accessed.");
          } else {
            setErrorMessage(data.error);
          }
        } else {
          setErrorMessage("Incident number is incorrect.");
        }
      } catch (error) {
        setErrorMessage(
          "An error occurred while validating the incident number."
        );
        console.error("Error occurred:", error);
      }
    } else {
      setErrorMessage("Incident number is required.");
    }
  };

  return (
    <div>
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 text-white rounded-lg p-6 w-11/12 sm:w-1/3 md:w-1/4 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">
              Enter Incident Number
            </h2>
            <input
              type="text"
              value={incidentNumber}
              onChange={(e) => setIncidentNumber(e.target.value)}
              placeholder="Enter incident number"
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-black text-white"
            />
            {errorMessage && (
              <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
            )}
            <button
              onClick={handleSubmit}
              className={`w-full py-2 px-4 rounded-lg transition ${
                workflowId
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
              disabled={!workflowId}
            >
              {workflowId ? "Submit" : "Loading Workflow..."}
            </button>
          </div>
        </div>
      )}
      {!showModal && children}
    </div>
  );
};

WorkflowModalWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<WorkflowList />} />
            <Route path="/workflow-collection" element={<WorkflowCollection />} />
            <Route path="/builder" element={<WorkflowBuilder />} />
            <Route
              path="/workflow/:workflow_name"
              element={
                <WorkflowModalWrapper>
                  <WorkflowQuiz />
                </WorkflowModalWrapper>
              }
            />
            <Route
              path="/workflow/:workflow_name/:incident_number"
              element={<WorkflowQuiz />}
            />
            <Route path="/workflow-view/:workflow_name" element={<WorkflowView />} />
          </Routes>
        </Layout>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
