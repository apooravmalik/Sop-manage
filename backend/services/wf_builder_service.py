import os
import sys
from datetime import datetime, timezone
from typing import List, Dict, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, text
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Append the backend path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from backend.models.SOP_tables import Workflow, Question, Option, QuestionType, Response, Answer, TempIncident, IncidentLog

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
    
    def is_last_question(self, question_id: int) -> bool:
        """Check if the given question is the last question in its workflow."""
        try:
            # Fetch the question based on the provided question_id
            question = self.db.query(Question).filter(Question.question_id == question_id).first()
            if not question:
                raise ValueError(f"Question with ID {question_id} not found.")

            # Get the maximum question ID for the workflow associated with the question
            max_question_id = self.db.query(func.max(Question.question_id)).filter(
                Question.workflow_id == question.workflow_id
            ).scalar()

            # Return True if the current question ID is the maximum question ID
            return question_id == max_question_id

        except Exception as e:
            logger.error(f"Error checking if question {question_id} is the last: {str(e)}")
            raise
        
    def close_session(self):
        """Safely close the database session if it exists."""
        if self.db:
            try:
                self.db.close()
            except Exception as e:
                logger.error(f"Error closing database session: {str(e)}")


class WorkflowBuilderService:
    def __init__(self, db_session: Session):
        self.db = db_session
        
    def is_workflow_name_unique(self, workflow_name):
        """
        Check if a workflow name is unique in a case-insensitive manner.
        
        Args:
            workflow_name (str): The name of the workflow to check
        
        Returns:
            bool: True if the workflow name is unique, False otherwise
        """
        # Ensure the name is stripped and lowercase for consistent comparison
        workflow_name = workflow_name.strip().lower()
        
        # Use SQLAlchemy to query for existing workflows with the same name
        existing_workflow = self.db.query(Workflow).filter(
            func.lower(Workflow.workflow_name) == workflow_name
        ).first()
        
        # Return True if no existing workflow is found, False otherwise
        return existing_workflow is None

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
        
    def get_all_workflow_details(self) -> List[Dict]:
        """Fetch detailed information of all workflows."""
        workflows = self.db.query(Workflow).all()

        if not workflows:
            return []

        return [
            {
                "workflow_id": workflow.workflow_id,
                "workflow_name": workflow.workflow_name,
                "incident_type": workflow.incident_type,
                "created_at": workflow.created_at.isoformat()
            }
            for workflow in workflows
        ]
        
        
    def get_questions_and_options(self, workflow_id: int) -> List[Dict]:
        """
        Fetch all questions and their associated options for a specific workflow.
        """
        try:
            # Fetch all questions for the workflow
            questions = self.db.query(Question).filter(Question.workflow_id == workflow_id).all()

            if not questions:
                raise ValueError(f"No questions found for workflow_id: {workflow_id}")

            # Prepare the response
            questions_with_options = []
            for question in questions:
                options = [
                    {
                        "option_id": option.option_id,
                        "option_text": option.option_text,
                        "next_question_id": option.next_question_id,
                        "is_completed": option.is_completed,
                    }
                    for option in question.options
                ]
                questions_with_options.append({
                    "question_id": question.question_id,
                    "question_text": question.question_text,
                    "question_type": question.question_type,
                    "is_required": question.is_required,
                    "options": options
                })

            return questions_with_options

        except Exception as e:
            logger.error(f"Error fetching questions and options for workflow_id {workflow_id}: {str(e)}")
            raise
        
    def get_workflow_id_by_name(self, workflow_name: str):
        """
        Fetch workflow_id using workflow_name (case-insensitive).
        
        Args:
            workflow_name (str): Name of the workflow to search.
        
        Returns:
            int or None: The workflow_id if found, otherwise None.
        """
        try:
            # Strip and convert to lowercase for case-insensitive comparison
            workflow_name = workflow_name.strip().lower()

            # Query to find the workflow_id
            workflow = self.db.query(Workflow).filter(
                func.lower(Workflow.workflow_name) == workflow_name
            ).first()

            if workflow:
                return workflow.workflow_id
            return None

        except Exception as e:
            print(f"Error fetching workflow_id: {str(e)}")
            return None
        
    def close_session(self):
        """Safely close the database session if it exists."""
        if self.db:
            try:
                self.db.close()
            except Exception as e:
                logger.error(f"Error closing database session: {str(e)}")

    
class AnswerService:
    def __init__(self, db_session):
        self.db = db_session
        self.vc_service = VC_DB_Service(db_session)

    def _get_workflow_id(self, question_id: int) -> int:
        """
        Helper function to retrieve the workflow_id for a given question_id.
        """
        question = self.db.query(Question).filter(Question.question_id == question_id).first()
        if not question:
            raise ValueError(f"Invalid question_id: {question_id} does not exist.")
        
        return question.workflow_id
    
    def save_answer(self, question_id: int, answer_text: str, incident_number: str) -> dict:
        """
        Save an answer for a specific question and populate the Response table.
        """
        try:
            # Fetch workflow_id
            workflow_id = self._get_workflow_id(question_id)

            # Create and save the Answer object
            answer = Answer(
                question_id=question_id,
                answer_text=answer_text,
                rendered_at=datetime.utcnow(),
                submitted_at=datetime.utcnow()
            )
            self.db.add(answer)
            self.db.flush()  # Get answer_id after flush

            # Check if incident_number exists in TempIncident
            temp_incident = self.db.query(TempIncident).filter_by(incident_number=incident_number).first()
            if not temp_incident:
                timestamp = datetime.now(timezone.utc)
                # Create a new TempIncident if it doesn't exist
                temp_incident = TempIncident(
                    incident_number=incident_number,
                    text_mme=f"*Start SOP* {timestamp}{chr(13)}{chr(10)}{chr(13)}{chr(10)}",  # Initialize with empty text
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                self.db.add(temp_incident)

            # Create and save the Response object
            response = Response(
                incident_number=incident_number,
                workflow_id=workflow_id,
                question_id=question_id,
                answer_id=answer.answer_id
            )
            self.db.add(response)
            self.db.commit()

            return {"answer_id": answer.answer_id, "response_id": response.id}

        except Exception as e:
            self.db.rollback()
            raise
    
    def update_incidentlog_details(self, incident_number: str, new_text: str, workflow_name: str):
        """
        Append new text (question, answer, timestamp) to the iinlActionTaken_MEM field in the IncidentLog_TBL.
        With the person details of that current incident_Category (as of 18/06/25)

        Args:
            incident_number (str): The incident number to update.
            new_text (str): The text to append to the iinlActionTaken_MEM field.
            workflow_name (str): The name of the workflow to include in the SOP heading.

        Flow:
            1. Use workflow_name to get incident_category_prk
            2. Use incident_category_prk to get person details
            3. Add to the static heading
            4. Construct the SQL query to update iinlActionTaken_MEM
        
        Returns:
            None
        """
        incident_category_prk = self.vc_service.get_incident_category_prk_by_wf_name(workflow_name)
        person_details = self.vc_service.get_persons_by_incident_category(incident_category_prk)
        try:
            # Dynamically format the heading with the workflow_name
            static_heading = f"======SOP - {workflow_name} ======"
            
            if person_details:
                static_heading += "\n\nRelated Persons:\n"
                for p in person_details:
                    static_heading += (
                        f"- {p['prsFirstName_txt']} {p['prsLastName_txt']} | "
                        f"{p['prsEmailAddress_txt']} | Mobile: {p['prsMobileNum_txt']}\n"
        )

            # Construct the SQL query to update iinlActionTaken_MEM
            query = text("""
            UPDATE [TEST].[dbo].[IncidentLog_TBL]
            SET inlActionTaken_MEM = 
            ISNULL(CAST(inlActionTaken_MEM AS NVARCHAR(MAX)), '') + 
            CASE 
                WHEN ISNULL(CAST(inlActionTaken_MEM AS NVARCHAR(MAX)), '') = '' 
                THEN :static_heading + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) 
                ELSE CHAR(13) + CHAR(10) 
            END + 
            :new_text
            WHERE incidentlog_prk = :incident_number
            """)

            # Execute the query with parameters
            self.db.execute(query, {
                "static_heading": static_heading,
                "new_text": new_text,
                "incident_number": incident_number
            })
            self.db.commit()

        except SQLAlchemyError as e:
            self.db.rollback()
            raise RuntimeError(f"Database error while updating IncidentLog_TBL: {str(e)}")



    def update_temp_incident_text(self, incident_number: str, new_text: str):
        """
        Update the text_mme field in the TempIncident table by appending new Q&A text.
        If the record does not exist, create a new one.

        Args:
            incident_number (str): The incident number to update.
            new_text (str): The text to append to the text_mme field.

        Returns:
            None
        """
        try:
            # Fetch the existing TempIncident record
            temp_incident = self.db.query(TempIncident).filter_by(incident_number=incident_number).first()

            if temp_incident:
                # Append to existing text_mme
                temp_incident.text_mme = f"{temp_incident.text_mme}\n{new_text}" if temp_incident.text_mme else new_text
                temp_incident.updated_at = datetime.now(timezone.utc)
            else:
                # Create a new TempIncident record
                temp_incident = TempIncident(
                    incident_number=incident_number,
                    text_mme=new_text,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                self.db.add(temp_incident)

            # Commit changes
            self.db.commit()

        except SQLAlchemyError as e:
            self.db.rollback()
            raise RuntimeError(f"Database error while updating TempIncident: {str(e)}")
        
        
    def fetch_question_text(self, question_id: int) -> str:
        """
        Fetch the text of a question based on its ID.

        Args:
            question_id (int): The ID of the question.

        Returns:
            str: The question text.

        Raises:
            ValueError: If the question is not found.
        """
        try:
            question = self.db.query(Question).filter_by(question_id=question_id).first()
            if not question:
                raise ValueError(f"Question with ID {question_id} not found.")
            return question.question_text
        except SQLAlchemyError as e:
            raise RuntimeError(f"Database error while fetching question text: {str(e)}")
        
    def get_responses_with_questions(self, workflow_id: int, incident_number: str) -> List[Dict]:
        """
        Fetch all responses for a specific workflow and incident, including question texts.
        """
        try:
            responses = (
                self.db.query(Response)
                .join(Question, Response.question_id == Question.question_id)
                .filter(Response.workflow_id == workflow_id, Response.incident_number == incident_number)
                .all()
            )
            
            return [
                {
                    "question_id": r.question_id,
                    "question_text": r.question.question_text,
                    "answer_text": r.answer.answer_text,
                }
                for r in responses
            ]
        except Exception as e:
            logger.error(f"Error fetching responses with questions: {str(e)}")
            raise
        
    def close_session(self):
        """Safely close the database session if it exists."""
        if self.db:
            try:
                self.db.close()
            except Exception as e:
                logger.error(f"Error closing database session: {str(e)}")

class VC_DB_Service:
    def __init__(self, db_session: Session):
        self.db = db_session

    def check_incidentlog_exists(self, incidentlog_prk: int) -> bool:
        """
        Check if an incident with the given primary key exists using a raw SQL query.
        
        Args:
            incidentlog_prk (int): The primary key of the incident log.

        Returns:
            bool: True if the incident exists, False otherwise.
        """
        try:
            # Define the SQL query using text() from SQLAlchemy
            query = text("""
                SELECT TOP 100 1
                FROM [dbo].[incidentlog_tbl]
                WHERE incidentlog_prk = :incidentlog_prk
            """)
            
            # Execute the query with the parameter
            result = self.db.execute(query, {"incidentlog_prk": incidentlog_prk}).fetchone()
            
            # If a result is returned, the incident log exists
            return result is not None

        except SQLAlchemyError as e:
            logger.error(f"Database error: {str(e)}")
            raise RuntimeError(f"Database error: {str(e)}")
        
    def get_workflow_for_incidentlog(self, incidentlog_prk: int) -> int:
        """
        Get the workflow_id associated with the given incidentlog_prk.
        
        Args:
            incidentlog_prk (int): The primary key of the incident log.
        
        Returns:
            int: The workflow_id if found, otherwise None.
        """
        try:
            query = text("""
                SELECT  distinct workflow_id
                FROM [sop-manage].[dbo].[response]
                WHERE incident_number = :incidentlog_prk
            """)
            result = self.db.execute(query, {"incidentlog_prk": incidentlog_prk}).fetchone()
            return result[0] if result else None
        except SQLAlchemyError as e:
            logger.error(f"Database error: {str(e)}")
            raise RuntimeError(f"Database error: {str(e)}")

        
    def get_incident_status(self, incidentlog_prk: int) -> dict:
        """
        Fetch status of an incident from IncidentLog_TBL.

        Args:
            incidentlog_prk (int): The primary key of the incident log.

        Returns:
            dict: A dictionary with incident details including `inlStatus_FRK`.
        """
        try:
            query = text("""
                SELECT inlStatus_FRK
                FROM [dbo].[IncidentLog_TBL]
                WHERE incidentlog_prk = :incidentlog_prk
            """)
            result = self.db.execute(query, {"incidentlog_prk": incidentlog_prk}).fetchone()
            if result:
                return {"inlStatus_FRK": result[0]}
            return None
        except SQLAlchemyError as e:
            logger.error(f"Database error: {str(e)}")
            raise RuntimeError(f"Database error: {str(e)}")
        
        
    def get_workflow_name_by_incident(self, incident_number):
        """
        Fetch workflow name based on incident number.
        
        1. Query the database to get the incident category name
        2. Convert the incident category name to a workflow name
        
        Args:
            incident_number (int): The primary key of the incident log
        
        Returns:
            str: Workflow name derived from incident category
            None: If no incident is found
        """
        try:
            # Construct the SQL query to fetch incident category
            query = text("""
                SELECT 
                    incName_TXT, 
                    inlCategory_FRk,
                    IncidentLog_PRK
                FROM 
                    [dbo].IncidentCategory_TBL
                INNER JOIN 
                    [dbo].IncidentLog_TBL 
                ON 
                    IncidentCategory_TBL.IncidentCategory_PRK = IncidentLog_TBL.inlCategory_FRK
                WHERE 
                    IncidentLog_TBL.IncidentLog_PRK = :incident_number
            """)
            
            # Execute the query
            result = self.db.execute(query, {"incident_number": incident_number}).fetchone()
            
            if result:
                # Convert incident category name to workflow name
                # Remove extra spaces and replace spaces with underscores
                workflow_name = '_'.join(result.incName_TXT.split())
                
                return workflow_name
            else:
                return None
        
        except Exception as e:
            logger.error(f"Error fetching workflow name from incident category: {str(e)}")
            print(f"Error fetching workflow name for incident {incident_number}: {e}")
            return None
        
        
    def get_incident_category_prk_by_wf_name(self, workflow_name):
        """
        Reverse engineer workflow_name to get the corresponding IncidentCategory_PRK.

        Args:
            workflow_name (str): The name of the workflow (e.g., 'Fire_Alarm')

        Returns:
            int: IncidentCategory_PRK if found
            None: If no matching record found
        """
        try:
            # Reverse transformation: Replace underscores with spaces
            incident_name = ' '.join(workflow_name.split('_'))

            query = text("""
                SELECT 
                    IncidentCategory_PRK
                FROM 
                    [TEST].[dbo].IncidentCategory_TBL
                WHERE 
                    incName_TXT = :incident_name
            """)

            result = self.db.execute(query, {"incident_name": incident_name}).fetchone()

            if result:
                return result.IncidentCategory_PRK
            else:
                return None

        except Exception as e:
            logger.error(f"Error fetching IncidentCategory_PRK from workflow_name: {str(e)}")
            print(f"Error fetching IncidentCategory_PRK from workflow_name {workflow_name}: {e}")
            return None

    def get_persons_by_incident_category(self, incident_category_id):
        """
        Fetch distinct person details for a given IncidentCategory_PRK.

        Args:
            incident_category_id (int): IncidentCategory_PRK

        Returns:
            list of dicts: Person details
        """
        try:
            query = text("""
                WITH AllData AS (
                    SELECT  
                        p.person_prk,
                        p.prsFirstName_txt,
                        p.prsLastName_txt,
                        p.prsTelnum_txt,
                        p.prsMobileNum_txt,
                        p.prsEmailAddress_txt
                    FROM [TEST].[dbo].Building_TBL   AS b
                    LEFT JOIN  [TEST].[dbo].Device_TBL     AS d  ON d.dvcBuilding_FRK = b.Building_prk
                    LEFT JOIN  [TEST].[dbo].NVR_TBL        AS n  ON n.nvrAlias_TXT = d.dvcName_txt
                    LEFT JOIN  [TEST].[dbo].ProEvent_TBL   AS pe ON pe.pevBuilding_frk = b.Building_prk
                    LEFT JOIN  [TEST].[dbo].BuildingKeyLink_TBL AS bk ON bk.bklbuilding_FRK = b.Building_PRK
                    LEFT JOIN  [TEST].[dbo].Person_TBL     AS p  ON p.person_prk = bk.bklKeyHolder_FRK
                    WHERE pe.pevIncidentCategory_frk = :incident_category_id
                )
                SELECT DISTINCT 
                    person_prk,
                    prsFirstName_txt,
                    prsLastName_txt,
                    prsTelnum_txt,
                    prsMobileNum_txt,
                    prsEmailAddress_txt
                FROM AllData;
            """)

            result = self.db.execute(query, {"incident_category_id": incident_category_id}).fetchall()

            if result:
                return [dict(row._mapping) for row in result]
            else:
                return []

        except Exception as e:
            logger.error(f"Error fetching person details: {str(e)}")
            print(f"Error: {e}")
            return []

    