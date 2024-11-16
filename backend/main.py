import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from flask import Flask
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.database import engine
from models.SOP_tables import Base
from services.wf_builder_service import WorkflowBuilderService, QuestionManagementService
from api.workflow_api import setup_workflow_api

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {  # Allow all routes
        "origins": [
            "http://localhost:5173",  # Your frontend URL
            "http://127.0.0.1:5173"   # Alternative localhost URL
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Set up the database connection
# engine = create_engine('sqlite:///sop.db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

# Set up the Workflow Builder Service
wf_builder_service = WorkflowBuilderService(Session())

# Set up the Question Management Service
question_management_service = QuestionManagementService(Session())

# Set up the Workflow API
setup_workflow_api(app, wf_builder_service, question_management_service)

if __name__ == '__main__':
    app.run(debug=True)