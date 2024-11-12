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

    app.register_blueprint(workflow_api, url_prefix='/api')