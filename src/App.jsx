import { useEffect } from "react";
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
  useParams
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
      className={`min-h-screen ${isQuizPage ? "bg-black" : "pt-16 bg-black"}`}
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

const IncidentNumberHandler = () => {
  const { incident_number } = useParams();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch workflow_id after getting workflow_name
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
        return data.workflow_id;
      } else {
        throw new Error("Workflow not found");
      }
    } catch (error) {
      console.error("Error fetching workflow_id:", error);
      setErrorMessage("Unable to fetch workflow. Please try again.");
      return null;
    }
  };

  useEffect(() => {
    const fetchWorkflowDetails = async () => {
      if (!incident_number) {
        setErrorMessage("No incident number provided");
        return;
      }

      try {
        console.log(`Fetching workflow name for incident ${incident_number}...`);

        // Step 1: Fetch workflow_name using incident_number
        const categoryResponse = await fetch(
          `${config.API_BASE_URL}/api/incident/category?incident_number=${incident_number}`
        );

        const categoryData = await categoryResponse.json();

        if (categoryResponse.ok && categoryData.workflow_name) {
          const workflowName = categoryData.workflow_name;
          console.log(`Fetched workflow name: ${workflowName}`);

          // Step 2: Fetch workflow_id using workflow_name
          const workflowId = await getWorkflowId(workflowName);

          if (workflowId) {
            console.log(`Workflow is ready. Navigating to SOP...`);

            // Step 3: Navigate to SOP page
            navigate(`/workflow/${workflowName}/${incident_number}`);
          }
        } else {
          setErrorMessage(
            categoryData.error || "Failed to fetch workflow name. Please try again."
          );
        }
      } catch (error) {
        setErrorMessage(
          "An error occurred while fetching the workflow name. Please try again."
        );
        console.error("Error occurred:", error);
      }
    };

    fetchWorkflowDetails();
  }, [incident_number, navigate]);

  // Render error message if needed
  if (errorMessage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-gray-800 text-white rounded-lg p-6 w-11/12 sm:w-1/3 md:w-1/4 shadow-lg">
          <p className="text-red-500 text-sm">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return null;
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<WorkflowCollection />} />
            <Route path="/workflow-list" element={<WorkflowList />} />
            
            {/* route to handle incident number */}
            <Route path="/workflow/:incident_number" element={<IncidentNumberHandler />} />
            
            <Route
              path="/workflow/:workflow_name/:incident_number"
              element={<WorkflowQuiz />}
            />
            <Route path="/builder" element={<WorkflowBuilder />} />
            <Route
              path="/workflow-view/:workflow_name"
              element={<WorkflowView />}
            />
          </Routes>
        </Layout>
      </ThemeProvider>
    </BrowserRouter>
  );
};


export default App;
