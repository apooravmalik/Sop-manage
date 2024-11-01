import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.models.SOP_tables import Workflow, Question, Option, QuestionType


from datetime import datetime
from typing import List, Dict, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from enum import Enum

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "MultipleChoice"
    CHECKBOX = "CheckBox"
    SUBJECTIVE = "Subjective"
    INSTRUCTION = "Instruction"

class WorkflowBuilderService:
    def __init__(self, db_session: Session):
        self.db = db_session

    def create_workflow(self, workflow_data: Dict) -> Workflow:
        """Create a new workflow with all its questions and options"""
        workflow = Workflow(
            workflow_name=workflow_data["workflow_name"],
            incident_type=workflow_data["incident_type"]
        )
        self.db.add(workflow)
        self.db.flush()  # Get workflow_id without committing

        # Add all questions
        for question_data in workflow_data["questions"]:
            question = self.add_question(
                workflow_id=workflow.workflow_id,
                question_text=question_data["question_text"],
                question_type=QuestionType(question_data["question_type"]),
                is_required=question_data.get("is_required", True),
                next_question_id=question_data.get("next_question_id"),
                is_completed=question_data.get("is_completed", False)
            )
            
            # Add options if present
            if "options" in question_data:
                for option_data in question_data["options"]:
                    self.add_option(
                        question_id=question.question_id,
                        option_text=option_data["option_text"],
                        next_question_id=option_data.get("next_question_id"),
                        is_completed=option_data.get("is_completed", False)
                    )

        self.db.commit()
        return workflow

    def add_question(
        self,
        workflow_id: int,
        question_text: str,
        question_type: QuestionType,
        is_required: bool = True,
        next_question_id: Optional[int] = None,
        is_completed: bool = False
    ) -> Question:
        """Add a question to the workflow"""
        question = Question(
            workflow_id=workflow_id,
            question_text=question_text,
            question_type=question_type,
            is_required=is_required,
            next_question_id=next_question_id,
            is_completed=is_completed
        )
        self.db.add(question)
        self.db.flush()
        return question

    def add_option(
        self,
        question_id: int,
        option_text: str,
        next_question_id: Optional[int] = None,
        is_completed: bool = False
    ) -> Option:
        """Add an option to a question"""
        option = Option(
            question_id=question_id,
            option_text=option_text,
            next_question_id=next_question_id,
            is_completed=is_completed
        )
        self.db.add(option)
        self.db.flush()
        return option

    def get_workflow_structure(self, workflow_id: int) -> Dict:
        """Get the complete workflow structure with questions and options"""
        workflow = self.db.query(Workflow).filter(
            Workflow.workflow_id == workflow_id
        ).first()
        
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        questions = []
        for question in workflow.questions:
            question_data = {
                "question_text": question.question_text,
                "question_type": question.question_type.value,
                "is_required": question.is_required,
            }

            # Add next_question_id for subjective questions and instructions
            if question.question_type in [QuestionType.SUBJECTIVE, QuestionType.INSTRUCTION]:
                question_data["next_question_id"] = question.next_question_id
            
            # Add is_completed for instructions
            if question.question_type == QuestionType.INSTRUCTION:
                question_data["is_completed"] = question.is_completed

            # Add options for multiple choice and checkbox questions
            if question.question_type in [QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOX]:
                options = []
                for option in question.options:
                    options.append({
                        "option_text": option.option_text,
                        "next_question_id": option.next_question_id,
                        "is_completed": option.is_completed
                    })
                question_data["options"] = options

            questions.append(question_data)

        return {
            "workflow_name": workflow.workflow_name,
            "incident_type": workflow.incident_type,
            "questions": questions
        }