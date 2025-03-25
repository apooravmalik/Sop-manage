from flask import Blueprint, jsonify, request
from backend.services.wf_builder_service import AnswerService, VC_DB_Service
from datetime import datetime, timezone
from config.database import VC_DB_Local
import pytz

     
def setup_workflow_api(app, wf_builder_service, question_management_service, vc_service):

        
    workflow_api = Blueprint('workflow_api', __name__)
    answer_service = AnswerService(db_session=wf_builder_service.db)
    # Create the session for VC_DB_Service (using VC_DB_Local from database.py)
    with VC_DB_Local() as vc_db_session:
        # Create an instance of VC_DB_Service using the vc_db_session
        vc_service = VC_DB_Service(db_session=vc_db_session)

    @workflow_api.route('/workflows/get_id', methods=['POST'])
    def get_workflow_id():
        """Fetch workflow_id using workflow_name from request body."""
        
        print("API Hit: /api/workflows/get_id")
        data = request.get_json()

        if not data:
            print("No data received or invalid JSON")
            return jsonify({"error": "Invalid or missing JSON"}), 400

        # Check if 'workflow_name' is provided in the request body
        workflow_name = data.get("workflow_name")
        if not workflow_name:
            print("workflow_name is missing from request body")
            return jsonify({"error": "workflow_name is required"}), 400

        print(f"Received workflow_name: {workflow_name}")

        # Fetch workflow_id using the service function
        workflow_id = wf_builder_service.get_workflow_id_by_name(workflow_name)

        if workflow_id is None:
            print(f"No matching workflow found for: {workflow_name}")
            return jsonify({"error": "Workflow not found"}), 404

        print(f"Found workflow_id: {workflow_id}")
        return jsonify({"workflow_id": workflow_id}), 200

    @workflow_api.route('/workflows', methods=['POST'])
    def create_workflow():
        workflow_data = request.get_json()
            
        # Double-check name uniqueness
        workflow_name = workflow_data['workflow_name'].strip().lower()
        if not wf_builder_service.is_workflow_name_unique(workflow_name):
            return jsonify({
                    "error": "Workflow name must be unique",
                    "status": "name_not_unique"
            }), 400

        workflow = wf_builder_service.create_workflow(workflow_data)
        return jsonify({"workflow_id": workflow.workflow_id})

    @workflow_api.route('/workflows/<int:workflow_id>', methods=['GET'])
    def get_workflow(workflow_id):
        workflow_structure = wf_builder_service.get_workflow_structure(workflow_id)
        return jsonify(workflow_structure)
    
    @workflow_api.route('/workflows/<int:workflow_id>', methods=['DELETE'])
    def delete_workflow(workflow_id):
        """Delete a workflow and all its associated data"""
        try:
            success = wf_builder_service.delete_workflow(workflow_id)
            if success:
                return jsonify({
                    "message": f"Workflow {workflow_id} and all associated data successfully deleted"
                }), 200
            else:
                return jsonify({
                    "error": f"Workflow {workflow_id} not found"
                }), 404
        except SQLAlchemyError as e:
            return jsonify({
                "error": f"Database error: {str(e)}"
            }), 500
        except Exception as e:
            return jsonify({
                "error": str(e)
            }), 500
            
    @workflow_api.route('/workflows/<int:workflow_id>', methods=['PATCH'])
    def edit_workflow(workflow_id):
        """Update an existing workflow"""
        try:
            workflow_data = request.get_json()
            workflow = wf_builder_service.update_workflow(workflow_id, workflow_data)
            return jsonify({"workflow_id": workflow.workflow_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @workflow_api.route('/workflows/<int:workflow_id>/questions', methods=['GET'])
    def get_workflow_questions(workflow_id):
        """Get all questions for a specific workflow"""
        try:
            questions = question_management_service.get_workflow_question_ids(workflow_id)
            return jsonify(questions)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @workflow_api.route('/workflows/questions', methods=['GET'])
    def get_all_workflow_questions():
        """Get all workflows with their questions"""
        try:
            workflows = question_management_service.get_all_workflow_questions()
            return jsonify(workflows)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @workflow_api.route('/questions/last-id', methods=['GET'])
    def get_last_question_id():
        """Get the last used question ID"""
        try:
            last_id = question_management_service.get_last_question_id()
            return jsonify({"last_question_id": last_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    @workflow_api.route('/workflows/details', methods=['GET'])
    def get_all_workflow_details():
        """Fetch detailed information of all workflows."""
        try:
            all_workflows = wf_builder_service.get_all_workflow_details()
            return jsonify(all_workflows), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500



    @workflow_api.route('/questions/answer', methods=['POST'])
    def submit_answer():
        """
        Submit an answer to a question and populate the Response table.
        """
        try:
            data = request.get_json()
            question_id = data.get("question_id")
            answer_text = data.get("answer_text")
            incident_number = data.get("incident_number")
            workflow_id = data.get("workflow_id")
            frontend_timestamp = data.get("timestamp")

            if not all([question_id, answer_text, incident_number, workflow_id]):
                return jsonify({
                    "error": "question_id, answer_text, incident_number, and workflow_id are all required."
                }), 400
                
            print(f"Received timestamp: {frontend_timestamp}")
                
            # Convert frontend UTC timestamp to IST
            utc_time = datetime.fromisoformat(frontend_timestamp.rstrip("Z")).replace(tzinfo=pytz.UTC)  # Convert ISO to datetime (remove 'Z')
            ist = pytz.timezone("Asia/Kolkata")
            ist_time = utc_time.astimezone(ist)  # Convert to IST timezone
            # Log both UTC and IST times
            print("Original UTC time:", utc_time)
            print("Converted IST time:", ist_time)
            formatted_ist_time = ist_time.strftime("%Y-%m-%d %H:%M:%S")
            
            print(f"Converted timestamp to IST: {formatted_ist_time}")

            # Fetch workflow_name using workflow_id
            workflow = wf_builder_service.get_workflow_structure(workflow_id)
            if not workflow:
                return jsonify({"error": f"Workflow with ID {workflow_id} not found."}), 404
            workflow_name = workflow.get("workflow_name")

            # Fetch question_text if not provided in the request
            question_text = data.get("question_text")
            if not question_text:
                question_text = answer_service.fetch_question_text(question_id)

            # Fetch existing responses for the given workflow and incident to determine question number
            existing_responses = answer_service.get_responses_with_questions(
                workflow_id=workflow_id,
                incident_number=incident_number
            )
            question_number = len(existing_responses) + 1

            # Call the service to save the answer and response
            result = answer_service.save_answer(
                question_id=question_id,
                answer_text=answer_text,
                incident_number=incident_number
            )

            # Get current timestamp
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

            # Generate the formatted text in the specified format
            #formatted_text = f"""{question_number}. {question_text}{chr(13)}{chr(10)}{answer_text}{chr(13)}{chr(10)}Timestamp: {timestamp}{chr(13)}{chr(10)}"""
            formatted_text = f"""{question_number}. {question_text}{chr(13)}{chr(10)}{answer_text}{chr(13)}{chr(10)}Timestamp: {formatted_ist_time}{chr(13)}{chr(10)}"""

            # Update the temp incident text
            answer_service.update_temp_incident_text(
                incident_number=incident_number,
                new_text=formatted_text
            )

            # Update the incident log details by appending to the inlIncidentDetails_MEM field
            answer_service.update_incidentlog_details(
                incident_number=incident_number,
                new_text=formatted_text,
                workflow_name=workflow_name
            )
            # Check if the current question is the last one
            is_last_question = question_management_service.is_last_question(question_id)
            if is_last_question:
                # If it's the last question, close the connection and return a success message
                answer_service.close_session()
                wf_builder_service.close_session()
                question_management_service.close_session()
                print("Last question reached")
                return jsonify({
                    "message": "Answer saved successfully. This was the last question.",
                    "question_id": question_id,
                    "answer_text": answer_text,
                    "timestamp_in_ist": formatted_ist_time
                }), 200

            return jsonify({
                "message": "Answer and Response saved successfully.",
                "answer_id": result["answer_id"],
                "response_id": result["response_id"]
            }), 201

        except Exception as e:
            answer_service.close_session()
            wf_builder_service.close_session()
            question_management_service.close_session()
            return jsonify({"error": str(e)}), 500



    @workflow_api.route('/workflows/<int:workflow_id>/questions-and-options', methods=['GET'])
    def get_questions_and_options(workflow_id):
        """
        Get all questions and their associated options for a specific workflow.
        """
        try:
            # Call the service to get questions and options
            questions_with_options = wf_builder_service.get_questions_and_options(workflow_id)
            return jsonify(questions_with_options), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @workflow_api.route('/workflows/<int:workflow_id>/responses/<incident_number>', methods=['GET'])
    def get_filled_responses(workflow_id, incident_number):
        """Fetch responses and question texts for a specific workflow and incident."""
        try:
            responses = answer_service.get_responses_with_questions(workflow_id, incident_number)
            if not responses:
                return jsonify({"message": "No responses found"}), 404
            return jsonify(responses), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    @workflow_api.route('/incident-log/check', methods=['GET'])
    def check_incidentlog():
        """
        Check if an IncidentLog with the given primary key exists, is it associated with a workflow and is it open.
        """
        try:
            incidentlog_prk = request.args.get("incidentlog_prk")
            workflow_id = request.args.get("workflow_id")
            if not incidentlog_prk:
                return jsonify({"error": "incidentlog_prk is required"}), 400
            
            # Convert to integer
            try:
                incidentlog_prk = int(incidentlog_prk)
            except ValueError:
                return jsonify({"error": "incident number must be an integer"}), 400
            
            # Fetch incident status
            incident_status = vc_service.get_incident_status(incidentlog_prk)
            if not incident_status:
                return jsonify({"exists": False}), 200

            # Check if incident is closed
            if incident_status["inlStatus_FRK"] == 2:
                return jsonify({"error": "Incident is closed"}), 400
            
            if workflow_id:
            # Validate that incident_prk is linked to the provided workflow_id
                workflow_id = int(workflow_id)
                linked_workflow = vc_service.get_workflow_for_incidentlog(incidentlog_prk)
                if linked_workflow:
                    if linked_workflow != workflow_id: 
                        return jsonify({
                            "error": "Incident number is already associated with another workflow.",
                            "linked_workflow": linked_workflow,
                        }), 400

            # Check existence using vc_db_service
            exists = vc_service.check_incidentlog_exists(incidentlog_prk)
            return jsonify({"exists": exists}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    @workflow_api.route('/incident/category', methods=['GET'])
    def get_incident_category():
        try:
            incident_number = request.args.get("incident_number")
            
            if not incident_number:
                return jsonify({"error": "Incident number is required"}), 400
            
            # Use the method from wf_builder_service to get workflow name
            workflow_name = vc_service.get_workflow_name_by_incident(incident_number)
            
            if workflow_name:
                return jsonify({
                    "workflow_name": workflow_name
                }), 200
            else:
                return jsonify({"error": "No workflow found for this incident"}), 404
        
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        




    app.register_blueprint(workflow_api, url_prefix='/api')