import os
import sys
from dotenv import load_dotenv  # Import dotenv to load .env variables

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from flask import Flask
from flask_cors import CORS
from sqlalchemy.orm import sessionmaker
from config.database import engine, VC_DB_Local  # Ensure VC_DB_Local is correctly imported
from models.SOP_tables import Base, VC_DB_Base  # Make sure these models are defined correctly
from services.wf_builder_service import WorkflowBuilderService, QuestionManagementService, VC_DB_Service
from api.workflow_api import setup_workflow_api

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)

# Get allowed origins from .env
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

# Configure CORS
CORS(app, resources={
    r"/*": {  # Allow all routes
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Set up the database connection
Base.metadata.create_all(engine)  # Ensure Base refers to all necessary models

# Initialize session for main DB and VC_DB
Session = sessionmaker(bind=engine)
vc_db_session = VC_DB_Local()

# Set up the VC DB Service
vc_service = VC_DB_Service(db_session=vc_db_session)

# Set up the Workflow Builder Service
wf_builder_service = WorkflowBuilderService(db_session=Session())

# Set up the Question Management Service
question_management_service = QuestionManagementService(db_session=Session())

# Set up the Workflow API
setup_workflow_api(app, wf_builder_service, question_management_service, vc_service)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
