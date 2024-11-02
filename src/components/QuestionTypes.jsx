import { X } from 'lucide-react';
import PropTypes from 'prop-types';

export const MultipleChoice = ({ 
  question, 
  questionIndex, 
  questions,
  updateMultipleChoiceOption,
  updateLinkTo,
  removeMultipleChoiceOption,
  addMultipleChoiceOption 
}) => {
  return (
    <div className="space-y-2">
      {question.options.map((option, optionIndex) => (
        <div key={optionIndex} className="flex items-center gap-2">
          <input
            type="radio"
            name={`question-${question.id}`}
            className="w-4 h-4"
          />
          <input
            type="text"
            value={option.text}
            onChange={(e) => updateMultipleChoiceOption(questionIndex, optionIndex, e.target.value)}
            className="flex-1 px-2 py-1 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <select
            value={option.linkTo || ''}
            onChange={(e) => updateLinkTo(questionIndex, optionIndex, e.target.value)}
            className="px-2 py-1 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Link to</option>
            {questions.map(q => (
              <option key={q.id} value={q.id}>Q_{q.id}</option>
            ))}
          </select>
          {question.options.length > 1 && (
            <button
              onClick={() => removeMultipleChoiceOption(questionIndex, optionIndex)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => addMultipleChoiceOption(questionIndex)}
        className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
      >
        + Add Option
      </button>
    </div>
  );
};


MultipleChoice.propTypes = {
  question: PropTypes.object.isRequired,
  questionIndex: PropTypes.number.isRequired,
  questions: PropTypes.array.isRequired,
  updateMultipleChoiceOption: PropTypes.func.isRequired,
  updateLinkTo: PropTypes.func.isRequired,
  removeMultipleChoiceOption: PropTypes.func.isRequired,
  addMultipleChoiceOption: PropTypes.func.isRequired
};


export const SubjectiveQuestion = ({
  question,
  questionIndex,
  questions,
  setQuestions
}) => {
  return (
    <div className="space-y-2">
      <textarea
        placeholder="Enter answer"
        value={question.answer}
        onChange={(e) => {
          const newQuestions = [...questions];
          newQuestions[questionIndex].answer = e.target.value;
          setQuestions(newQuestions);
        }}
        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        rows={3}
      />
      <div className="flex items-center gap-2">
        <span className="text-gray-700 dark:text-gray-300">Link to:</span>
        <select
          value={question.linkTo || ''}
          onChange={(e) => {
            const newQuestions = [...questions];
            newQuestions[questionIndex].linkTo = e.target.value;
            newQuestions[questionIndex].isLinked = !!e.target.value;
            setQuestions(newQuestions);
          }}
          className="px-2 py-1 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Select question</option>
          {questions.map(q => (
            <option key={q.id} value={q.id}>Q_{q.id}</option>
          ))}
        </select>
      </div>
    </div>
  );
};


SubjectiveQuestion.propTypes = {    
  question: PropTypes.object.isRequired,
  questionIndex: PropTypes.number.isRequired,
  questions: PropTypes.array.isRequired,    
  setQuestions: PropTypes.func.isRequired
};

export const CheckboxQuestion = ({
  question,
  questionIndex,
  toggleCheckbox,
  updateCheckboxOption,
  addCheckboxOption
}) => {
  return (
    <div className="space-y-2">
      {question.checkboxOptions.map((option, optionIndex) => (
        <div key={optionIndex} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={option.checked}
            onChange={() => toggleCheckbox(questionIndex, optionIndex)}
            className="w-4 h-4"
          />
          <input
            type="text"
            value={option.text}
            onChange={(e) => updateCheckboxOption(questionIndex, optionIndex, e.target.value)}
            className="flex-1 px-2 py-1 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      ))}
      <button
        onClick={() => addCheckboxOption(questionIndex)}
        className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
      >
        + Add Option
      </button>
    </div>
  );
};

CheckboxQuestion.propTypes = {
  question: PropTypes.object.isRequired,
  questionIndex: PropTypes.number.isRequired,
  toggleCheckbox: PropTypes.func.isRequired,
  updateCheckboxOption: PropTypes.func.isRequired,
  addCheckboxOption: PropTypes.func.isRequired
};

export const Instruction = ({
  question,
  questionIndex,
  questions,
  setQuestions
}) => {
  return (
    <div className="mt-2">
      <button
        onClick={() => {
          const newQuestions = [...questions];
          newQuestions[questionIndex].completed = !newQuestions[questionIndex].completed;
          setQuestions(newQuestions);
        }}
        className={`px-4 py-2 rounded-md ${
          question.completed
            ? 'bg-green-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
      >
        {question.completed ? 'Completed' : 'Mark as Completed'}
      </button>
    </div>
  );
};


Instruction.propTypes = {
  question: PropTypes.object.isRequired,
  questionIndex: PropTypes.number.isRequired,
  questions: PropTypes.array.isRequired,
  setQuestions: PropTypes.func.isRequired
};