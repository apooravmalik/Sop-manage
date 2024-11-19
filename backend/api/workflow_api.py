from flask import Blueprint, jsonify, request

def setup_workflow_api(app, wf_builder_service, question_management_service):
    workflow_api = Blueprint('workflow_api', __name__)

    @workflow_api.route('/workflows', methods=['POST'])
    def create_workflow():
        workflow_data = request.get_json()
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
    @workflow_api.route('/workflows/<int:workflow_id>/questions', methods=['GET'])
    def get_questions_for_workflow(workflow_id):
        """Fetch questions for a specific workflow."""
        try:
            questions = question_management_service.get_workflow_question_ids(workflow_id)
            return jsonify(questions), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @workflow_api.route('/answers', methods=['POST'])
    def submit_answer():
        """Submit answers for questions."""
        try:
            answer_data = request.get_json()
            workflow_id = answer_data.get('workflow_id')
            answers = answer_data.get('answers')

            if not workflow_id or not answers:
                return jsonify({"error": "workflow_id and answers are required"}), 400

            for answer in answers:
                question_id = answer['question_id']
                answer_text = answer['answer_text']
                answer_instance = question_management_service.submit_answer(
                    workflow_id=workflow_id,
                    question_id=question_id,
                    answer_text=answer_text
                )

            return jsonify({"message": "Answers submitted successfully"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        

    app.register_blueprint(workflow_api, url_prefix='/api')