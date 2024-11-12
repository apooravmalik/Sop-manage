import os
import sys
from datetime import datetime
from typing import List, Dict, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Append the backend path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from backend.models.SOP_tables import Workflow, Question, Option, QuestionType, Response, Answer

class QuestionManagementService:
    def __init__(self, db_session: Session):
        self.db = db_session
    
    def get_last_question_id(self) -> int:
        """Get the last used question ID from the database"""
        last_question = self.db.query(func.max(Question.question_id)).scalar()
        return last_question if last_question else 0
    
    def get_workflow_question_ids(self, workflow_id: int) -> List[Dict]:
        """Get all questions with their IDs for a specific workflow"""
        questions = self.db.query(Question).filter(
            Question.workflow_id == workflow_id
        ).order_by(Question.question_id).all()
        
        return [
            {
                "question_id": q.question_id,
                "question_text": q.question_text,
                "question_type": q.question_type
            }
            for q in questions
        ]
    
    def get_all_workflow_questions(self) -> Dict[int, List[Dict]]:
        """Get all workflows with their question IDs"""
        workflows = self.db.query(Workflow).all()
        result = {}
        
        for workflow in workflows:
            result[workflow.workflow_id] = {
                "workflow_name": workflow.workflow_name,
                "questions": [
                    {
                        "question_id": q.question_id,
                        "question_text": q.question_text,
                        "question_type": q.question_type.value
                    }
                    for q in workflow.questions
                ]
            }
        return result

class WorkflowBuilderService:
    def __init__(self, db_session: Session):
        self.db = db_session

    def create_workflow(self, workflow_data: Dict) -> Workflow:
        """Create a new workflow with all its questions and options"""
        try:
            # Create workflow
            workflow = Workflow(
                workflow_name=workflow_data["workflow_name"],
                incident_type=workflow_data["incident_type"]
            )
            self.db.add(workflow)
            
            try:
                self.db.flush()
                logger.debug(f"Workflow created with ID: {workflow.workflow_id}")
            except SQLAlchemyError as e:
                logger.error(f"Error flushing workflow: {str(e)}")
                raise

            # Keep track of question positions and their actual IDs
            position_to_question: Dict[int, Question] = {}
            option_updates: List[tuple] = []  # Store (option, next_position) pairs
            
            # First pass: Create all questions without next_question_id
            for position, question_data in enumerate(workflow_data["questions"], start=1):
                try:
                    question = self.add_question(
                        workflow_id=workflow.workflow_id,
                        question_text=question_data["question_text"],
                        question_type=question_data["question_type"],
                        is_required=question_data.get("is_required", True),
                        is_completed=question_data.get("is_completed", False)
                    )
                    position_to_question[position] = question
                    
                    # Create options without next_question_id
                    if "options" in question_data:
                        for option_data in question_data["options"]:
                            option = self.add_option(
                                question_id=question.question_id,
                                option_text=option_data["option_text"],
                                is_completed=option_data.get("is_completed", False)
                            )
                            # Store the option and its target question position for later update
                            if "next_question_id" in option_data:
                                option_updates.append((option, option_data["next_question_id"]))
                                
                except SQLAlchemyError as e:
                    logger.error(f"Error adding question or options: {str(e)}")
                    raise

            # Second pass: Update next_question_id references
            for question_position, question_data in enumerate(workflow_data["questions"], start=1):
                current_question = position_to_question[question_position]
                
                # Update question's next_question_id if present
                if "next_question_id" in question_data:
                    next_position = question_data["next_question_id"]
                    if next_position in position_to_question:
                        current_question.next_question_id = position_to_question[next_position].question_id

            # Update option next_question_id references
            for option, next_position in option_updates:
                if next_position in position_to_question:
                    option.next_question_id = position_to_question[next_position].question_id

            self.db.commit()
            logger.debug("Workflow creation completed successfully")
            return workflow

        except Exception as e:
            logger.error(f"Error in create_workflow: {str(e)}")
            self.db.rollback()
            raise
        
        
    def delete_workflow(self, workflow_id: int) -> bool:
        try:
            # First check if workflow exists
            workflow = self.db.query(Workflow).filter(
                Workflow.workflow_id == workflow_id
            ).first()
            
            if not workflow:
                logger.warning(f"Attempted to delete non-existent workflow with ID: {workflow_id}")
                return False
            
            # Delete associated responses first to avoid FK constraint issues
            self.db.query(Response).filter(
                Response.workflow_id == workflow_id
            ).delete(synchronize_session=False)
            
            # The workflow deletion will cascade to questions, which will cascade to:
            # - options (via cascade="all, delete-orphan")
            # - answers (via cascade="all, delete-orphan")
            self.db.delete(workflow)
            
            self.db.commit()
            logger.info(f"Successfully deleted workflow {workflow_id} and all associated data")
            return True
            
        except SQLAlchemyError as e:
            logger.error(f"Error deleting workflow {workflow_id}: {str(e)}")
            self.db.rollback()
            raise
    
    def update_workflow(self, workflow_id: int, workflow_data: Dict) -> Workflow:
        try:
            workflow = self.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
            if not workflow:
                raise ValueError(f"Workflow {workflow_id} not found")

            # Update workflow-level fields
            workflow.workflow_name = workflow_data["workflow_name"]
            workflow.incident_type = workflow_data["incident_type"]

            # Update questions
            existing_questions = {q.question_id: q for q in workflow.questions}
            new_questions = []
            for question_data in workflow_data["questions"]:
                question_id = question_data.get("question_id")
                if question_id and question_id in existing_questions:
                    # Update existing question
                    question = existing_questions[question_id]
                    question.question_text = question_data["question_text"]
                    question.question_type = question_data["question_type"]
                    question.is_required = question_data.get("is_required", True)
                    question.is_completed = question_data.get("is_completed", False)
                    question.next_question_id = question_data.get("next_question_id")
                else:
                    # Create new question
                    question = self.add_question(
                        workflow_id=workflow.workflow_id,
                        question_text=question_data["question_text"],
                        question_type=question_data["question_type"],
                        is_required=question_data.get("is_required", True),
                        is_completed=question_data.get("is_completed", False),
                        next_question_id=question_data.get("next_question_id")
                    )
                    new_questions.append(question)

            # Update options
            for question in new_questions + list(existing_questions.values()):
                existing_options = {o.option_id: o for o in question.options}
                for option_data in question_data.get("options", []):
                    option_id = option_data.get("option_id")
                    if option_id and option_id in existing_options:
                        # Update existing option
                        option = existing_options[option_id]
                        option.option_text = option_data["option_text"]
                        option.next_question_id = option_data.get("next_question_id")
                        option.is_completed = option_data.get("is_completed", False)
                    else:
                        # Create new option
                        option = self.add_option(
                            question_id=question.question_id,
                            option_text=option_data["option_text"],
                            next_question_id=option_data.get("next_question_id"),
                            is_completed=option_data.get("is_completed", False)
                        )

            self.db.commit()
            return workflow

        except Exception as e:
            self.db.rollback()
            raise

    def add_question(
        self,
        workflow_id: int,
        question_text: str,
        question_type: str,
        is_required: bool = True,
        next_question_id: Optional[int] = None,
        is_completed: bool = False
    ) -> Question:
        """Add a question to the workflow."""
        try:
            question_type_enum = QuestionType(question_type)
        except ValueError:
            raise ValueError(f"Invalid question type: {question_type}")

        question = Question(
            workflow_id=workflow_id,
            question_text=question_text,
            question_type=question_type_enum.value,
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
        """Add an option to a question."""
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
        """Get the complete workflow structure with questions and options."""
        workflow = self.db.query(Workflow).filter(
            Workflow.workflow_id == workflow_id
        ).first()
        
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        questions = []
        for question in workflow.questions:
            question_data = {
                "question_id": question.question_id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "is_required": question.is_required,
            }

            # Add next_question_id for subjective questions and instructions
            if question.question_type in [QuestionType.SUBJECTIVE, QuestionType.INSTRUCTION]:
                question_data["next_question_id"] = question.next_question_id
            
            # Add is_completed only for instruction questions
            if question.question_type == QuestionType.INSTRUCTION:
                question_data["is_completed"] = question.is_completed

            # Add options for multiple choice and checkbox questions
            if question.question_type in [QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOX]:
                options = []
                for option in question.options:
                    options.append({
                        "option_id": option.option_id,
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