from flask import Blueprint, jsonify, request

def setup_workflow_api(app, wf_builder_service):
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

    app.register_blueprint(workflow_api, url_prefix='/api')