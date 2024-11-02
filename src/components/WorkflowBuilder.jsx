import { useState } from 'react';
import { Trash2, Copy, Plus, Moon, Sun } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { useTheme } from './ThemeContext';
import { MultipleChoice, SubjectiveQuestion, CheckboxQuestion, Instruction } from './QuestionTypes';

const WorkflowBuilder = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [workflowTitle, setWorkflowTitle] = useState('Workflow 1');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [questions, setQuestions] = useState([
    {
      id: '001',
      text: '',
      type: 'Multiple Choice',
      options: [
        { text: 'Option 1', linkTo: null },
        { text: 'Option 2', linkTo: null }
      ],
      answer: '',
      checkboxOptions: [
        { text: 'Option 1', checked: false },
        { text: 'Option 2', checked: false }
      ],
      isRequired: true,
      isLinked: false,
      linkTo: null,
      completed: false
    }
  ]);

  // Question Management Functions
  const addQuestion = () => {
    const newId = String(Number(questions[questions.length - 1]?.id || '000') + 1).padStart(3, '0');
    setQuestions([...questions, {
      id: newId,
      text: '',
      type: 'Multiple Choice',
      options: [
        { text: 'Option 1', linkTo: null },
        { text: 'Option 2', linkTo: null }
      ],
      answer: '',
      checkboxOptions: [
        { text: 'Option 1', checked: false },
        { text: 'Option 2', checked: false }
      ],
      isRequired: true,
      isLinked: false,
      linkTo: null,
      completed: false
    }]);
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const duplicateQuestion = (index) => {
    const questionToDuplicate = { ...questions[index] };
    const newId = String(Number(questions[questions.length - 1].id) + 1).padStart(3, '0');
    questionToDuplicate.id = newId;
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, questionToDuplicate);
    setQuestions(newQuestions);
  };

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

  // Multiple Choice Functions
  const addMultipleChoiceOption = (questionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push({ text: `Option ${newQuestions[questionIndex].options.length + 1}`, linkTo: null });
    setQuestions(newQuestions);
  };

  const updateMultipleChoiceOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex].text = value;
    setQuestions(newQuestions);
  };

  const removeMultipleChoiceOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  const updateLinkTo = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex].linkTo = value;
    setQuestions(newQuestions);
  };

  // Checkbox Functions
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
      checked: false
    });
    setQuestions(newQuestions);
  };

  // Toggle Required
  const toggleRequired = (index) => {
    const newQuestions = [...questions];
    newQuestions[index].isRequired = !newQuestions[index].isRequired;
    setQuestions(newQuestions);
  };

  return (
    <div className={`min-h-screen bg-background ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen w-full p-8 bg-background text-foreground">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6 border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={workflowTitle}
                  onChange={(e) => setWorkflowTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') setIsEditingTitle(false);
                  }}
                  className="text-2xl font-semibold bg-transparent border-b-2 border-primary outline-none"
                  autoFocus
                />
              ) : (
                <CardTitle
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {workflowTitle}
                </CardTitle>
              )}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </CardHeader>
          </Card>

          {questions.map((question, questionIndex) => (
            <Card
              key={question.id}
              className={`mb-4 border ${
                question.isLinked 
                  ? 'border-l-4 border-l-green-500' 
                  : 'border-l-4 border-l-primary'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => updateQuestionText(questionIndex, e.target.value)}
                      placeholder="Enter question text"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    />
                  </div>
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestionType(questionIndex, e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm bg-background"
                  >
                    <option value="Multiple Choice">Multiple Choice</option>
                    <option value="Subjective">Subjective</option>
                    <option value="Checkbox">Checkbox</option>
                    <option value="Instruction">Instruction</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRequired(questionIndex)}
                      className={`px-2 py-1 rounded text-sm ${
                        question.isRequired
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      Required
                    </button>
                    <button
                      onClick={() => duplicateQuestion(questionIndex)}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => removeQuestion(questionIndex)}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {question.type === 'Multiple Choice' && (
                  <MultipleChoice
                    question={question}
                    questionIndex={questionIndex}
                    questions={questions}
                    updateMultipleChoiceOption={updateMultipleChoiceOption}
                    updateLinkTo={updateLinkTo}
                    removeMultipleChoiceOption={removeMultipleChoiceOption}
                    addMultipleChoiceOption={addMultipleChoiceOption}
                  />
                )}

                {question.type === 'Subjective' && (
                  <SubjectiveQuestion
                    question={question}
                    questionIndex={questionIndex}
                    questions={questions}
                    setQuestions={setQuestions}
                  />
                )}

                {question.type === 'Checkbox' && (
                  <CheckboxQuestion
                    question={question}
                    questionIndex={questionIndex}
                    toggleCheckbox={toggleCheckbox}
                    updateCheckboxOption={updateCheckboxOption}
                    addCheckboxOption={addCheckboxOption}
                  />
                )}

                {question.type === 'Instruction' && (
                  <Instruction
                    question={question}
                    questionIndex={questionIndex}
                    questions={questions}
                    setQuestions={setQuestions}
                  />
                )}
              </CardContent>
            </Card>
          ))}

          <button
            onClick={addQuestion}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;