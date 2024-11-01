import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from flask import Flask
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.SOP_tables import Base
from services.wf_builder_service import WorkflowBuilderService
from api.workflow_api import setup_workflow_api

app = Flask(__name__)

# Set up the database connection
engine = create_engine('sqlite:///sop.db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

# Set up the Workflow Builder Service
wf_builder_service = WorkflowBuilderService(Session())

# Set up the Workflow API
setup_workflow_api(app, wf_builder_service)

if __name__ == '__main__':
    app.run(debug=True)