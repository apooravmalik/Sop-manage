from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship, validates, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class QuestionType(enum.Enum):
    MultipleChoice = "MultipleChoice"
    Subjective = "Subjective"
    CheckBox = "CheckBox"
    Instruction = "Instruction"

class Workflow(Base):
    __tablename__ = "workflow"

    workflow_id = Column(Integer, primary_key=True, index=True)
    workflow_name = Column(String(255), nullable=False)
    incident_type = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    questions = relationship("Question", back_populates="workflow")
    responses = relationship("Response", back_populates="workflow")

class Question(Base):
    __tablename__ = "question"

    question_id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflow.workflow_id"))
    question_text = Column(String(1000), nullable=False)
    question_type = Column(SQLEnum(QuestionType))
    is_required = Column(Boolean, default=True)
    next_question_id = Column(Integer, nullable=True)  # For Subjective
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workflow = relationship("Workflow", back_populates="questions")
    options = relationship("Option", back_populates="question")
    responses = relationship("Response", back_populates="question")
    answers = relationship("Answer", back_populates="question")

class Option(Base):
    __tablename__ = "option"

    option_id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("question.question_id"))
    option_text = Column(String(500), nullable=False)
    next_question_id = Column(Integer, ForeignKey("question.question_id"), nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="options", foreign_keys=[question_id])
    next_question = relationship("Question", foreign_keys=[next_question_id])

class Response(Base):
    __tablename__ = "response"

    incident_number = Column(String(50), primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflow.workflow_id"))
    question_id = Column(Integer, ForeignKey("question.question_id"))
    answer_id = Column(Integer, ForeignKey("answer.answer_id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    workflow = relationship("Workflow", back_populates="responses")
    question = relationship("Question", back_populates="responses")
    answer = relationship("Answer", back_populates="responses")

class Answer(Base):
    __tablename__ = "answer"

    answer_id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("question.question_id"))
    answer_text = Column(Text)  # Will store:
                               # - Single option_id for MultipleChoice
                               # - Comma-separated option_ids for CheckBox
                               # - Text for Subjective
                               # - "completed" for Instruction
    rendered_at = Column(DateTime)
    submitted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="answers")
    responses = relationship("Response", back_populates="answer")

    @validates('answer_text')
    def validate_answer_text(self, key, value):
        if not self.question:
            return value
        
        # For Multiple Choice, verify the option exists
        if self.question.question_type == QuestionType.MultipleChoice:
            try:
                option_id = int(value)
                valid_options = [opt.option_id for opt in self.question.options]
                if option_id not in valid_options:
                    raise ValueError(f"Invalid option ID {option_id} for question {self.question_id}")
            except ValueError as e:
                raise ValueError(f"Multiple choice answer must be a valid option ID: {str(e)}")
        
        # For CheckBox, verify all options exist
        elif self.question.question_type == QuestionType.CheckBox:
            try:
                option_ids = [int(x.strip()) for x in value.split(',')]
                valid_options = [opt.option_id for opt in self.question.options]
                invalid_options = [opt_id for opt_id in option_ids if opt_id not in valid_options]
                if invalid_options:
                    raise ValueError(f"Invalid option IDs {invalid_options} for question {self.question_id}")
            except ValueError as e:
                raise ValueError(f"Checkbox answer must be comma-separated option IDs: {str(e)}")
        
        # For Instruction, verify it's "completed"
        elif self.question.question_type == QuestionType.Instruction:
            if value.lower() != "completed":
                raise ValueError("Instruction answer must be 'completed'")
        
        return value