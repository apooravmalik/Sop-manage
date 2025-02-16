import { useState, useEffect } from "react";
import {
  Trash2,
  Copy,
  Plus,
  Moon,
  Sun,
  Pencil,
  Loader2,
  Save,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { useTheme } from "../components/ThemeContext";
import config from "../../config";
import { Toaster, toast } from "sonner";

const WorkflowBuilder = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [workflowTitle, setWorkflowTitle] = useState("Workflow 1");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseQuestionId, setBaseQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([
    {
      id: "001",
      questionId: null, // Will be set after fetching baseQuestionId
      text: "",
      type: "SUBJECTIVE",
      options: [
        { text: "Option 1", linkTo: null },
        { text: "Option 2", linkTo: null },
      ],
      answer: "",
      checkboxOptions: [
        { text: "Option 1", checked: false },
        { text: "Option 2", checked: false },
      ],
      isRequired: true,
      isLinked: false,
      linkTo: null,
      completed: false,
    },
  ]);

  useEffect(() => {
    fetchLastQuestionId();
  }, []);

  // Update question IDs after fetching baseQuestionId
  useEffect(() => {
    if (baseQuestionId !== null) {
      setQuestions((prevQuestions) =>
        prevQuestions.map((question, index) => ({
          ...question,
          questionId: baseQuestionId + index + 1,
        }))
      );
    }
  }, [baseQuestionId]);


  const checkWorkflowNameUnique = async (workflowName) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/api/workflows/check-name?name=${encodeURIComponent(workflowName)}`
      );

      if (!response.ok) {
        throw new Error('Failed to check workflow name');
      }

      const data = await response.json();
      return data.is_unique;
    } catch (error) {
      console.error("Error checking workflow name:", error);
      toast.error("Unable to verify workflow name");
      return false;
    }
  };

  const fetchLastQuestionId = async () => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/api/questions/last-id`
      );
      const data = await response.json();
      setBaseQuestionId(data.last_question_id);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching last question ID:", error);
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newId = String(
      Number(questions[questions.length - 1]?.id || "000") + 1
    ).padStart(3, "0");
    const newQuestionId = baseQuestionId + questions.length + 1;

    setQuestions((prevQuestions) => [
      ...prevQuestions,
      {
        id: newId,
        questionId: newQuestionId,
        text: "",
        type: "SUBJECTIVE",
        options: [
          { text: "Option 1", linkTo: null },
          { text: "Option 2", linkTo: null },
        ],
        checkboxOptions: [],
        isRequired: true,
        isLinked: false,
        linkTo: null,
        completed: false,
      },
    ]);
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const duplicateQuestion = (index) => {
    const questionToDuplicate = { ...questions[index] };

    // Increment `id` for the duplicate question
    const newId = String(
      Number(questions[questions.length - 1].id) + 1
    ).padStart(3, "0");

    // Increment `questionId` for the duplicate question
    const newQuestionId = baseQuestionId + questions.length + 1;

    questionToDuplicate.id = newId;
    questionToDuplicate.questionId = newQuestionId;

    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, questionToDuplicate);

    setQuestions(newQuestions);
  };;

  const updateQuestionText = (index, text) => {
    const newQuestions = [...questions];
    newQuestions[index].text = text;
    setQuestions(newQuestions);
  };

  const updateQuestionType = (index, type) => {
    const newQuestions = [...questions];
    newQuestions[index].type = type;
    setQuestions(newQuestions);
  };

  const toggleRequired = (index) => {
    const newQuestions = [...questions];
    newQuestions[index].isRequired = !newQuestions[index].isRequired;
    setQuestions(newQuestions);
  };

  const addMultipleChoiceOption = (questionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push({
      text: `Option ${newQuestions[questionIndex].options.length + 1}`,
      linkTo: null,
    });
    setQuestions(newQuestions);
  };

  const updateMultipleChoiceOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex].text = value;
    setQuestions(newQuestions);
  };

  const removeMultipleChoiceOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[
      questionIndex
    ].options.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  const updateLinkTo = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex].linkTo = value;
    setQuestions(newQuestions);
  };

  const toggleCheckbox = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].checkboxOptions[optionIndex].checked =
      !newQuestions[questionIndex].checkboxOptions[optionIndex].checked;
    setQuestions(newQuestions);
  };

  const updateCheckboxOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].checkboxOptions[optionIndex].text = value;
    setQuestions(newQuestions);
  };

  const addCheckboxOption = (questionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].checkboxOptions.push({
      text: `Option ${newQuestions[questionIndex].checkboxOptions.length + 1}`,
      checked: false,
    });
    setQuestions(newQuestions);
  };

  const removeCheckboxOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].checkboxOptions = newQuestions[
      questionIndex
    ].checkboxOptions.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  // Add new function for Subjective questions
  const updateSubjectiveAnswer = (questionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answer = value;
    setQuestions(newQuestions);
  };

  // Modify the formatWorkflowData function to handle new question types
  const formatWorkflowData = () => {
    const formattedQuestions = questions.map((question, index) => {
      const baseQuestion = {
        question_text: question.text,
        question_type: question.type,  // Remove .toUpperCase()
        is_required: question.isRequired,
        is_completed: question.completed,
        next_question_id: question.linkTo ? Number(question.linkTo) : null,
        position: index + 1,
      };

      // Update the type checks to match the new enum values
      if (question.type === "MULTIPLE_CHOICE") {
        baseQuestion.options = question.options.map((option) => ({
          option_text: option.text,
          is_completed: false,
          next_question_id: option.linkTo ? Number(option.linkTo) : null,
        }));
      }

      if (question.type === "CHECKBOX") {
        baseQuestion.options = question.checkboxOptions.map((option) => ({
          option_text: option.text,
          is_completed: option.checked,
          next_question_id: null,
        }));
      }

      if (question.type === "SUBJECTIVE") {
        baseQuestion.answer = question.answer;
      }

      if (question.type === "INSTRUCTION") {
        baseQuestion.options = [];
      }

      return baseQuestion;
    });

    return {
      workflow_name: workflowTitle,
      incident_type: "DEFAULT",
      questions: formattedQuestions,
    };
  };


  const validateWorkflow = () => {
    if (!workflowTitle.trim()) {
      return false;
    }

    if (questions.length === 0) {
      return false;
    }

    const hasInvalidQuestions = questions.some(
      (question) => question.isRequired && !question.text.trim()
    );

    return !hasInvalidQuestions;
  };

  const handleSubmit = async () => {
    // Validate workflow first
    if (!validateWorkflow()) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check workflow name uniqueness first
      const isUnique = await checkWorkflowNameUnique(workflowTitle);

      if (!isUnique) {
        toast.error("Workflow name must be unique", {
          description: "Please choose a different workflow name."
        });
        setIsSubmitting(false);
        return;
      }

      const workflowData = formatWorkflowData();

      const response = await fetch(`${config.API_BASE_URL}/api/workflows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Workflow saved successfully:", result);

      // Add success toast
      toast.success("Workflow Saved", {
        description: `Workflow "${workflowTitle}" has been created successfully.`
      });

    } catch (error) {
      console.error("Error saving workflow:", error);

      // Add error toast
      toast.error("Failed to Save Workflow", {
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <div className="min-h-screen w-full p-8 bg-gray-100 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center justify-between space-x-4 w-full">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={workflowTitle}
                    onChange={(e) => setWorkflowTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") setIsEditingTitle(false);
                    }}
                    className="text-2xl font-semibold bg-transparent border-b-2 border-blue-500 outline-none px-2 py-1 w-1/2 dark:text-white"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle
                      onClick={() => setIsEditingTitle(true)}
                      className="cursor-pointer hover:text-blue-500 flex items-center gap-2"
                    >
                      {workflowTitle}
                      <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </CardTitle>
                  </div>
                )}
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </CardHeader>
          </Card>

          {questions.map((question, questionIndex) => (
            <Card
              key={question.id}
              className={`mb-4 border-l-4 rounded-lg ${question.isLinked
                  ? "border-l-green-500 dark:border-l-green-300"
                  : "border-l-blue-500 dark:border-l-blue-300"
                } bg-white dark:bg-gray-800 dark:border-gray-700 shadow-md`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Question ID display with improved styling */}
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <span className="font-medium">Question ID:</span>
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {question.questionId || "Loading..."}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) =>
                        updateQuestionText(questionIndex, e.target.value)
                      }
                      placeholder="Enter question text"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <select
                    value={question.type}
                    onChange={(e) =>
                      updateQuestionType(questionIndex, e.target.value)
                    }
                    className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="SUBJECTIVE">Subjective</option>
                    <option value="CHECKBOX">Checkbox</option>
                    <option value="INSTRUCTION">Instruction</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRequired(questionIndex)}
                      className={`px-2 py-1 rounded text-sm ${question.isRequired
                          ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                    >
                      Required
                    </button>
                    <button
                      onClick={() => duplicateQuestion(questionIndex)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => removeQuestion(questionIndex)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {question.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) =>
                            updateMultipleChoiceOption(
                              questionIndex,
                              optionIndex,
                              e.target.value
                            )
                          }
                          className="flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <select
                          value={option.linkTo || ""}
                          onChange={(e) =>
                            updateLinkTo(
                              questionIndex,
                              optionIndex,
                              e.target.value || null
                            )
                          }
                          className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">No link</option>
                          {questions.map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.questionId
                                ? `Question ${q.questionId}`
                                : "Loading..."}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            removeMultipleChoiceOption(
                              questionIndex,
                              optionIndex
                            )
                          }
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addMultipleChoiceOption(questionIndex)}
                      className="mt-2 px-3 py-1 text-sm dark:text-white bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Add Option
                    </button>
                  </div>
                )}
                {question.type === "SUBJECTIVE" && (
                  <div className="space-y-2">
                    <textarea
                      value={question.answer}
                      onChange={(e) =>
                        updateSubjectiveAnswer(questionIndex, e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="Enter your answer here..."
                      rows={4}
                    />
                  </div>
                )}

                {question.type === "CHECKBOX" && (
                  <div className="space-y-2">
                    {question.checkboxOptions.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={option.checked}
                          onChange={() =>
                            toggleCheckbox(questionIndex, optionIndex)
                          }
                          className="w-4 h-4"
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) =>
                            updateCheckboxOption(
                              questionIndex,
                              optionIndex,
                              e.target.value
                            )
                          }
                          className="flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <button
                          onClick={() =>
                            removeCheckboxOption(questionIndex, optionIndex)
                          }
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addCheckboxOption(questionIndex)}
                      className="mt-2 px-3 py-1 text-sm dark:text-white bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Add Option
                    </button>
                  </div>
                )}

                {question.type === "INSTRUCTION" && (
                  <div className="space-y-2">
                    <textarea
                      value={question.text}
                      onChange={(e) =>
                        updateQuestionText(questionIndex, e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="Enter instruction text here..."
                      rows={4}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !validateWorkflow()}
              className={`flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md transition-colors
                ${isSubmitting || !validateWorkflow()
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-green-700"
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Workflow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
};

export default WorkflowBuilder;
