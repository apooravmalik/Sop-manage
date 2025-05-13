/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import config from "../../config";

const WorkflowQuiz = () => {
  const { workflow_name, incident_number } = useParams();
  const navigate = useNavigate();
  const [workflowId, setWorkflowId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedUsers, setSelectedUsers] = useState({});
  const [completedQuestions, setCompletedQuestions] = useState({});
  const [completedAnswers, setCompletedAnswers] = useState({});
  const [isWorkflowFilled, setIsWorkflowFilled] = useState(false);
  const [loadingWorkflowId, setLoadingWorkflowId] = useState(true);
  const [lastFilledQuestionId, setLastFilledQuestionId] = useState(null);
  const forceNavigationRef = useRef(null);

  // Function to create a storage key based on workflow and incident
  const getStorageKey = useCallback(() => {
    return `workflow_progress_${workflow_name}_${incident_number}`;
  }, [workflow_name, incident_number]);

  // Function to save progress to localStorage
  const saveProgress = useCallback(
    (questionId, answers) => {
      if (!workflowId || !incident_number) return;

      const storageKey = getStorageKey();
      const progressData = {
        workflowId,
        incident_number,
        lastFilledQuestionId: questionId,
        completedQuestions: Object.keys(completedQuestions),
        completedAnswers,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(progressData));
      console.log(`Progress saved for question ${questionId}`);
    },
    [
      workflowId,
      incident_number,
      completedQuestions,
      getStorageKey,
      completedAnswers,
    ]
  );

  // Function to load progress from localStorage
  const loadProgress = useCallback(() => {
    if (!workflow_name || !incident_number) return null;

    const storageKey = getStorageKey();
    const savedProgress = localStorage.getItem(storageKey);

    if (savedProgress) {
      try {
        const progressData = JSON.parse(savedProgress);
        console.log("Found saved progress:", progressData);
        return progressData;
      } catch (err) {
        console.error("Error parsing saved progress:", err);
        return null;
      }
    }
    return null;
  }, [workflow_name, incident_number, getStorageKey]);

  // Check if workflow is complete
  const checkWorkflowComplete = useCallback((lastQuestionId, allQuestions) => {
    if (!allQuestions || allQuestions.length === 0) return false;

    // Find the last question in the workflow
    const lastQuestion = allQuestions[allQuestions.length - 1];

    // If the last filled question matches the last question in the workflow, consider it complete
    return lastQuestionId === lastQuestion.question_id;
  }, []);

  const getWorkflowId = useCallback(async () => {
    try {
      console.log("Fetching workflow_id...");
      console.log("workflow_name:", workflow_name);
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
    } finally {
      setLoadingWorkflowId(false);
    }
  }, [workflow_name]);

  const fetchPreviousResponses = useCallback(
    async (id) => {
      try {
        console.log(
          `Fetching responses for workflow_id: ${id} and incident_number: ${incident_number}`
        );
        const response = await fetch(
          `${config.API_BASE_URL}/api/workflows/${id}/responses/${incident_number}`
        );

        if (response.status === 404) {
          // No previous responses found, workflow needs to be filled
          setIsWorkflowFilled(false);
          return;
        }

        if (!response.ok) throw new Error("Failed to fetch previous responses");

        const previousResponses = await response.json();

        // Mark all questions as completed and store their answers
        const completedQs = {};
        const completedAns = {};
        let lastAnsweredQuestionId = null;

        previousResponses.forEach((response) => {
          completedQs[response.question_id] = true;
          completedAns[response.question_id] = {
            answer: response.answer_text,
            timestamp: new Date().toISOString(),
            incident_number: incident_number,
            workflow_id: workflowId,
          };

          // Track the last answered question ID
          lastAnsweredQuestionId = response.question_id;
        });

        setCompletedQuestions(completedQs);
        setCompletedAnswers(completedAns);

        if (lastAnsweredQuestionId) {
          setLastFilledQuestionId(lastAnsweredQuestionId);
        }

        // Don't set isWorkflowFilled here - we should check if it's actually complete first
        // We'll determine this after fetching questions
      } catch (err) {
        console.error("Error fetching previous responses:", err);
        // If there's an error, we'll assume the workflow needs to be filled
        setIsWorkflowFilled(false);
      }
    },
    [incident_number, workflowId]
  );

  const fetchQuestions = useCallback(
    async (id) => {
      try {
        setLoading(true);
        const response = await fetch(
          `${config.API_BASE_URL}/api/workflows/${id}/questions-and-options`
        );
        if (!response.ok) throw new Error("Failed to fetch questions");
        const data = await response.json();

        const normalizedData = data.map((question) => ({
          ...question,
          question_type: question.question_type.toLowerCase().replace(/_/g, ""),
        }));

        setQuestions(normalizedData);

        // After fetching questions, check for previous responses
        await fetchPreviousResponses(id);

        // Now that we have both questions and previous responses, check if workflow is complete
        if (lastFilledQuestionId) {
          const isComplete = checkWorkflowComplete(
            lastFilledQuestionId,
            normalizedData
          );
          setIsWorkflowFilled(isComplete);
        }

        // Try to load progress from localStorage
        const savedProgress = loadProgress();
        if (savedProgress) {
          // Check if the workflow is complete based on saved progress
          const isComplete = checkWorkflowComplete(
            savedProgress.lastFilledQuestionId,
            normalizedData
          );

          if (isComplete) {
            setIsWorkflowFilled(true);
          } else {
            setIsWorkflowFilled(false);
            // Restore completed questions and answers...
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [
      fetchPreviousResponses,
      loadProgress,
      checkWorkflowComplete,
      lastFilledQuestionId,
    ]
  );

  useEffect(() => {
    const fetchWorkflowAndQuestions = async () => {
      await getWorkflowId(); // Get workflow_id first
    };
    fetchWorkflowAndQuestions();
  }, [getWorkflowId]);

  useEffect(() => {
    if (workflowId) {
      fetchQuestions(workflowId);
    }
  }, [workflowId, fetchQuestions]);

  useEffect(() => {
    if (questions.length > 0) {
      // Don't auto-navigate if we're in the middle of explicit navigation
      if (forceNavigationRef.current) return;

      const nextUnansweredIndex = questions.findIndex(
        (question) => !completedQuestions[question.question_id]
      );
      if (nextUnansweredIndex !== -1) {
        setCurrentQuestionIndex(nextUnansweredIndex);
      }
    }
  }, [questions, completedQuestions]);

  useEffect(() => {
    if (!loadingWorkflowId && (!workflowId || !incident_number)) {
      setError("Both workflow ID and incident number are required");
    }
  }, [workflowId, incident_number, loadingWorkflowId]);

  const advanceToNextQuestion = (nextQuestionId = null) => {
    console.log("Advancing to next question:", {
      currentQuestionId: questions[currentQuestionIndex]?.question_id,
      nextQuestionId,
    });

    if (!questions[currentQuestionIndex]) {
      console.warn("No current question found, stopping navigation.");
      return;
    }

    // Store the next question ID in a ref for later use
    if (nextQuestionId) {
      forceNavigationRef.current = nextQuestionId;
    } else {
      forceNavigationRef.current = null;
    }

    // Mark current question as completed
    const currentQuestionId = questions[currentQuestionIndex].question_id;
    setCompletedQuestions((prev) => ({
      ...prev,
      [currentQuestionId]: true,
    }));

    // Save this as the last filled question
    setLastFilledQuestionId(currentQuestionId);

    // Save progress to localStorage
    saveProgress(currentQuestionId, completedAnswers);

    // Use setTimeout to ensure state updates have processed
    setTimeout(() => {
      if (forceNavigationRef.current) {
        console.log("Force navigating to:", forceNavigationRef.current);
        const nextIndex = questions.findIndex(
          (q) => Number(q.question_id) === Number(forceNavigationRef.current)
        );

        if (nextIndex !== -1) {
          console.log(`Force navigation to index: ${nextIndex}`);
          setCurrentQuestionIndex(nextIndex);
        }
      } else {
        moveToNextUnanswered();
      }

      // Reset input states
      setTextInput("");
      setSelectedOptions({});
      setSelectedUsers({});
    }, 0);
  };

  const moveToNextUnanswered = () => {
    const nextUnansweredIndex = questions.findIndex(
      (q, idx) =>
        idx > currentQuestionIndex && !completedQuestions[q.question_id]
    );

    if (nextUnansweredIndex !== -1) {
      console.log(
        `Navigating to next unanswered question: ${questions[nextUnansweredIndex].question_id}`
      );
      setCurrentQuestionIndex(nextUnansweredIndex);
    } else {
      console.log("No more unanswered questions.");
    }
  };

  // Enhanced submitAnswer function
  const submitAnswer = async (
    questionId,
    answerText,
    nextQuestionId = null,
    isSkipped = false
  ) => {
    try {
      // Validate inputs
      if (!incident_number) {
        throw new Error("Incident number is missing");
      }

      // Find the current question
      const currentQuestion = questions.find(
        (q) => q.question_id === questionId
      );

      if (!currentQuestion) {
        throw new Error(`Question with ID ${questionId} not found`);
      }

      // Determine next question ID based on question type and available information
      let finalNextQuestionId = nextQuestionId;

      switch (currentQuestion.question_type) {
        case "multiplechoice": {
          // For multiple choice, use the next_question_id from the selected option
          if (!finalNextQuestionId) {
            const selectedOption = currentQuestion.options.find(
              (option) => option.option_text === answerText
            );
            finalNextQuestionId = selectedOption?.next_question_id;
          }
          break;
        }

        case "subjective": {
          // For subjective questions, find next sequential question if not specified
          if (!finalNextQuestionId) {
            const currentIndex = questions.findIndex(
              (q) => q.question_id === questionId
            );
            finalNextQuestionId =
              currentIndex < questions.length - 1
                ? questions[currentIndex + 1].question_id
                : null;
          }
          break;
        }

        case "checkbox": {
          // For checkbox questions, find next sequential question if not specified
          if (!finalNextQuestionId) {
            const currentIndex = questions.findIndex(
              (q) => q.question_id === questionId
            );
            finalNextQuestionId =
              currentIndex < questions.length - 1
                ? questions[currentIndex + 1].question_id
                : null;
          }
          break;
        }

        case "instruction": {
          // For instruction questions, find next sequential question
          if (!finalNextQuestionId) {
            const currentIndex = questions.findIndex(
              (q) => q.question_id === questionId
            );
            finalNextQuestionId =
              currentIndex < questions.length - 1
                ? questions[currentIndex + 1].question_id
                : null;
          }
          break;
        }

        default: {
          // Fallback to sequential navigation
          const currentIndex = questions.findIndex(
            (q) => q.question_id === questionId
          );
          finalNextQuestionId =
            currentIndex < questions.length - 1
              ? questions[currentIndex + 1].question_id
              : null;
        }
      }

      console.log("Submitting Answer with Next Question:", {
        questionId,
        answerText,
        finalNextQuestionId,
        isSkipped,
      });

      const timestamp = new Date().toISOString(); // Get current timestamp
      console.log("Frontend Timestamp (UTC):", timestamp); // Log timestamp

      // Prepare answer submission payload
      const submissionPayload = {
        question_id: questionId,
        answer_text: isSkipped ? "SKIPPED" : answerText,
        is_skipped: isSkipped,
        incident_number: incident_number,
        workflow_id: workflowId,
        timestamp: timestamp, // Include timestamp in submission payload
      };

      console.log("Submission Payload:", submissionPayload);

      // Send answer to backend
      const response = await fetch(
        `${config.API_BASE_URL}/api/questions/answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submissionPayload),
        }
      );

      // Handle response
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit answer");
      }

      // Update completed answers
      const answerMetadata = {
        answer: isSkipped ? "SKIPPED" : answerText,
        selectedOptions: selectedOptions[questionId] || {},
        selectedUsers: selectedUsers[questionId] || {},
        incident_number: incident_number,
        workflow_id: workflowId,
        timestamp: new Date().toISOString(),
      };

      // Update state
      const updatedCompletedAnswers = {
        ...completedAnswers,
        [questionId]: answerMetadata,
      };

      setCompletedAnswers(updatedCompletedAnswers);

      setAnswers((prev) => ({
        ...prev,
        [questionId]: isSkipped ? "SKIPPED" : answerText,
      }));

      // Mark question as completed
      setCompletedQuestions((prev) => ({
        ...prev,
        [questionId]: true,
      }));

      // Update last filled question ID
      setLastFilledQuestionId(questionId);

      // Save progress to localStorage
      saveProgress(questionId, updatedCompletedAnswers);

      // Clear any existing errors
      setError(null);

      // Check if this is the last question
      const isLastQuestion =
        questions.findIndex((q) => q.question_id === questionId) ===
        questions.length - 1;
      if (isLastQuestion) {
        // If this is the last question, mark the workflow as completed
        setIsWorkflowFilled(true);
      }

      // Advance to next question
      advanceToNextQuestion(finalNextQuestionId);
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError(err.message);
    }
  };

  // Clear progress function (for debugging or reset functionality)
  const clearProgress = () => {
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
    console.log("Progress cleared");
  };

  const handleCheckboxChange = (questionId, optionText, isChecked) => {
    setSelectedOptions((prevSelectedOptions) => {
      return {
        ...prevSelectedOptions,
        [questionId]: {
          ...(prevSelectedOptions[questionId] || {}),
          [optionText]: isChecked,
        },
      };
    });
  };

  const handleUserCheckboxChange = (
    questionId,
    userId,
    userName,
    isChecked
  ) => {
    setSelectedUsers((prevSelectedUsers) => {
      const currentSelections = prevSelectedUsers[questionId] || {};

      // Create a new selection object
      const newSelections = isChecked
        ? { ...currentSelections, [userId]: userName }
        : Object.fromEntries(
            Object.entries(currentSelections).filter(([id]) => id !== userId)
          );

      return {
        ...prevSelectedUsers,
        [questionId]: newSelections,
      };
    });
  };

  const submitMultipleChoices = (questionId, options) => {
    // Find the first (and only) selected option
    const selectedOption = Object.entries(options).find(
      ([_, isChecked]) => isChecked
    )?.[0];

    if (!selectedOption) return;

    // Find the current question
    const currentQuestion = questions[currentQuestionIndex];

    // Find the selected option object
    const selectedOptionObj = currentQuestion.options.find(
      (option) => option.option_text === selectedOption
    );

    // Log for debugging
    console.log("Selected option:", selectedOption);
    console.log("Selected option object:", selectedOptionObj);
    console.log(
      "Next question ID from option:",
      selectedOptionObj?.next_question_id
    );

    // Use the next_question_id from the selected option
    const nextQuestionId = selectedOptionObj?.next_question_id;

    // Submit the answer with the explicitly defined next question
    submitAnswer(questionId, selectedOption, nextQuestionId);
  };

  const submitSubjectiveAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];

    // Find the next question (if any)
    const currentIndex = questions.findIndex(
      (q) => q.question_id === currentQuestion.question_id
    );

    const nextQuestionId =
      currentIndex < questions.length - 1
        ? questions[currentIndex + 1].question_id
        : null;

    submitAnswer(currentQuestion.question_id, textInput, nextQuestionId);
  };

  const submitSelectedUsers = (questionId) => {
    const selectedUserNames = Object.values(selectedUsers[questionId] || {});

    // Join selected user names with a delimiter
    const answerText = selectedUserNames.join("|");

    submitAnswer(questionId, answerText);
  };

  const renderFilledWorkflow = () => {
    return (
      <div className="dark">
        <div className="lg:max-w-full container py-8 bg-black min-h-screen">
          <div className="text-center text-2xl font-bold text-gray-300 mb-8">
            Workflow - Completed Workflow
          </div>
          <div className="space-y-6">
            {questions.map((question, index) => (
              <Card
                key={question.question_id}
                className="max-w-2xl mx-auto bg-[#1e2736]"
              >
                <CardHeader>
                  <CardTitle className="text-white">
                    Step {index + 1} of {questions.length}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="font-medium text-lg text-white">
                      {question.question_text}
                    </div>
                    <div className="p-4 bg-black rounded-lg border border-gray-700">
                      <div className="font-medium text-gray-400">Answer:</div>
                      <div className="mt-2 text-gray-200">
                        {completedAnswers[question.question_id]?.answer ||
                          "No answer provided"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="max-w-2xl mx-auto mt-6 text-center">
            {/* <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 text-lg transition-colors"
            >
              Return Home
            </button> */}
          </div>
        </div>
      </div>
    );
  };

  const renderCompletedQuestionContent = (question, completedAnswer) => {
    switch (question.question_type) {
      case "multiplechoice":
        return (
          <div className="dark">
            <div className="space-y-2 text-gray-100">
              {question.options.map((option) => (
                <div
                  key={option.option_id}
                  className={`flex items-center space-x-2 ${
                    completedAnswer.selectedOptions?.[option.option_text]
                      ? "bg-gray-500 font-semibold"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    id={option.option_id}
                    checked={
                      completedAnswer.selectedOptions?.[option.option_text] ||
                      false
                    }
                    readOnly
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                  />
                  <label
                    htmlFor={option.option_id}
                    className="flex-1 p-3 rounded cursor-default"
                  >
                    {option.option_text}
                  </label>
                </div>
              ))}
              <div className="text-sm italic">
                Answer: {completedAnswer.answer}
              </div>
            </div>
          </div>
        );

      case "checkbox":
        return (
          <div className="dark">
            <div className="space-y-2 text-gray-500">
              {question.options.map((option) => (
                <div
                  key={option.option_id}
                  className={`flex items-center space-x-2 ${
                    completedAnswer.selectedUsers?.[option.option_id]
                      ? "bg-gray-600 font-semibold"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    id={option.option_id}
                    checked={
                      completedAnswer.selectedUsers?.[option.option_id] !==
                      undefined
                    }
                    readOnly
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                  />
                  <label
                    htmlFor={option.option_id}
                    className="flex-1 p-3 rounded cursor-default"
                  >
                    {option.option_text}
                  </label>
                </div>
              ))}
              <div className="text-sm italic">
                Answer: {completedAnswer.answer}
              </div>
            </div>
          </div>
        );

      case "subjective":
        return (
          <div className="dark">
            <div className="space-y-2 text-gray-500">
              <div className="p-3 bg-gray-100 rounded">
                {completedAnswer.answer}
              </div>
            </div>
          </div>
        );

      case "instruction":
        return (
          <div className="dark">
            <div className="text-gray-500 p-4 bg-gray-100 rounded">
              Instruction Confirmed
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderQuestionContent = () => {
    const currentQuestion = questions[currentQuestionIndex];

    switch (currentQuestion.question_type) {
      case "multiplechoice":
        return (
          <div className="dark">
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <div
                  key={option.option_id}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="radio"
                    id={option.option_id}
                    name={`question-${currentQuestion.question_id}`}
                    value={option.option_text}
                    checked={
                      selectedOptions[currentQuestion.question_id]?.[
                        option.option_text
                      ] || false
                    }
                    onChange={(e) =>
                      handleCheckboxChange(
                        currentQuestion.question_id,
                        option.option_text,
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                  />
                  <label
                    htmlFor={option.option_id}
                    className="flex-1 p-3 border rounded hover:bg-grey-80 cursor-pointer"
                  >
                    {option.option_text}
                  </label>
                </div>
              ))}

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() =>
                    submitMultipleChoices(
                      currentQuestion.question_id,
                      selectedOptions[currentQuestion.question_id] || {}
                    )
                  }
                  disabled={
                    !Object.values(
                      selectedOptions[currentQuestion.question_id] || {}
                    ).some(Boolean)
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  Submit Selected Option
                </button>

                {/* <button
                  onClick={() => navigate("/")}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                  Home
                </button> */}

                {!currentQuestion.is_required && (
                  <button
                    onClick={() =>
                      submitAnswer(currentQuestion.question_id, "", null, true)
                    }
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Skip Step
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case "checkbox":
        return (
          <div className="dark">
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <div
                  key={option.option_id}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    id={option.option_id}
                    name={`question-${currentQuestion.question_id}`}
                    value={option.option_text}
                    checked={
                      selectedUsers[currentQuestion.question_id]?.[
                        option.option_id
                      ] !== undefined
                    }
                    onChange={(e) =>
                      handleUserCheckboxChange(
                        currentQuestion.question_id,
                        option.option_id,
                        option.option_text,
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                  />
                  <label
                    htmlFor={option.option_id}
                    className="flex-1 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  >
                    {option.option_text}
                  </label>
                </div>
              ))}

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() =>
                    submitSelectedUsers(currentQuestion.question_id)
                  }
                  disabled={
                    !Object.keys(
                      selectedUsers[currentQuestion.question_id] || {}
                    ).length
                  }
                  className="flex-1 px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  Submit Selected Users
                </button>

                {/* <button
                  onClick={() => navigate("/")}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                  Home
                </button> */}

                {!currentQuestion.is_required && (
                  <button
                    onClick={() =>
                      submitAnswer(currentQuestion.question_id, "", null, true)
                    }
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Skip Step
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case "subjective":
        return (
          <div className="dark">
            <div className="space-y-4">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full bg-slate-600 text-white p-3 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Enter your answer..."
              />
              <div className="flex space-x-2">
                <button
                  onClick={submitSubjectiveAnswer}
                  disabled={!textInput.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>

                {/* <button
                  onClick={() => navigate("/")}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                  Home
                </button> */}

                {!currentQuestion.is_required && (
                  <button
                    onClick={() =>
                      submitAnswer(currentQuestion.question_id, "", null, true)
                    }
                    className="flex-1 px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 disabled:bg-gray-700 disabled:cursor-not-allowed"
                  >
                    Skip Step
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case "instruction":
        return (
          <div className="dark">
            <div className="space-y-4">
              <div className="p-4 bg-gray-800 rounded">
                {currentQuestion.question_text}
              </div>
              <button
                onClick={() =>
                  submitAnswer(currentQuestion.question_id, "Confirmed")
                }
                className="flex-1 px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 disabled:bg-gray-700 disabled:cursor-not-allowed"
              >
                Confirm and Continue
              </button>
              {/* <button
                onClick={() => navigate("/")}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
              >
                Home
              </button> */}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (loadingWorkflowId) {
    return (
      <div className="dark">
        <div className="container lg:max-w-full mx-auto px-4 py-8 bg-black min-h-screen">
          <div className="text-center text-2xl font-bold text-gray-300 mb-8">
            Workflow - Incident Number {incident_number}
          </div>
          <Card className="max-w-2xl mx-auto mt-8 bg-[#1e2736]">
            <CardContent className="flex justify-center items-center h-40">
              <div className="text-gray-400">Loading workflow...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  // Loading state
  if (loading) {
    return (
      <div className="dark">
        <div className="container lg:max-w-full mx-auto px-4 py-8 bg-black min-h-screen">
          <div className="text-center text-2xl font-bold text-gray-300 mb-8">
            Workflow - Incident Number {incident_number}
          </div>
          <Card className="max-w-2xl mx-auto mt-8 bg-[#1e2736]">
            <CardContent className="flex justify-center items-center h-40">
              <div className="text-gray-400">Loading workflow...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dark">
        <div className="container lg:max-w-full mx-auto px-4 py-8 bg-black min-h-screen">
          <div className="text-center text-2xl font-bold text-gray-300 mb-8">
            Workflow - Incident Number {incident_number}
          </div>
          <Card className="max-w-2xl mx-auto mt-8 bg-red-900 bg-opacity-30">
            <CardContent className="text-red-300">Error: {error}</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isWorkflowFilled) {
    return renderFilledWorkflow();
  }

  // Check if all questions are completed
  const isQuizComplete =
    Object.keys(completedQuestions).length === questions.length;

  if (isQuizComplete) {
    return (
      <div className="dark">
        <div className="container lg:max-w-full mx-auto px-4 py-8 bg-black min-h-screen">
          <div className="text-center text-2xl font-bold text-gray-300 mb-8">
            Workflow - Incident Number {incident_number}
          </div>
          <Card className="max-w-2xl mx-auto bg-[#1e2736]">
            <CardContent className="text-center">
              <h3 className="text-xl font-semibold mb-4 text-white">
                Workflow Complete!
              </h3>
              {/* <button
                onClick={() => navigate(`/`)}
                className="px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 text-lg transition-colors"
              >
                Return Home
              </button> */}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="dark">
      <div className="container lg:max-w-full py-8 bg-black min-h-screen text-white">
        <div className="text-center text-2xl font-bold text-gray-300 mb-8">
          Workflow - Incident Number {incident_number}
        </div>
        <div className="space-y-6">
          {questions.map((question, index) => {
            // Only show if it's completed or the current active question
            const isCompleted = completedQuestions[question.question_id];
            const isCurrent =
              question.question_id ===
              questions[currentQuestionIndex]?.question_id;

            if (!isCompleted && !isCurrent) {
              return null; // Don't render this question
            }

            return (
              <Card
                key={question.question_id}
                className={`max-w-2xl mx-auto ${
                  isCompleted
                    ? "bg-[#1e2736] text-gray-400"
                    : isCurrent
                    ? "border-blue-800 border-2"
                    : "bg-[#1e2736]"
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-white">
                    Step {index + 1} of {questions.length}
                    {!question.is_required && (
                      <span className="text-sm text-gray-500 ml-2">
                        (Optional)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isCompleted ? (
                    // Show completed answers only
                    <div className="space-y-4 mt-4">
                      {question.question_type !== "instruction" && (
                        <div className="font-medium text-lg text-gray-400">
                          {question.question_text}
                        </div>
                      )}
                      {renderCompletedQuestionContent(
                        question,
                        completedAnswers[question.question_id]
                      )}
                    </div>
                  ) : isCurrent ? (
                    // Show the active question for input
                    <div className="space-y-4">
                      {question.question_type !== "instruction" && (
                        <div className="font-medium text-lg text-white">
                          {question.question_text}
                        </div>
                      )}
                      {renderQuestionContent()}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Check if all questions are completed */}
        {Object.keys(completedQuestions).length === questions.length && (
          <div className="max-w-2xl mx-auto mt-6 text-center">
            <button
              onClick={() => navigate(`/`)}
              className="px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 text-lg transition-colors"
            >
              Quiz Completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowQuiz;
