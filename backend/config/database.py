import os
import urllib
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Detect if running inside Docker
RUNNING_IN_DOCKER = os.getenv("RUNNING_IN_DOCKER", "false").lower() == "true"

# Select correct server address
DB_SERVER = "host.docker.internal" if RUNNING_IN_DOCKER else os.getenv('DB_SERVER', '127.0.0.1')

# Database configuration for sop-manage
DB_CONFIG = {
    'driver': os.getenv('DB_DRIVER', 'ODBC Driver 17 for SQL Server'),
    'server': os.getenv('DB_SERVER', 'APOORAV_MALIK'),
    'database': os.getenv('DB_DATABASE', 'sop-manage'),
    'username': os.getenv('DB_USERNAME', 'sa'),
    'password': os.getenv('DB_PASSWORD', ''),
    'trust_cert': os.getenv('DB_TRUST_CERT', 'yes'),
}

# Database configuration for TEST database
DB_VC_CONFIG = {
    'driver': os.getenv('DB_DRIVER', 'ODBC Driver 17 for SQL Server'),
    'server': os.getenv('DB_SERVER', 'APOORAV_MALIK'),
    'database': os.getenv('DB_DATABASE_VC', 'TEST'),  # Ensure correct DB name for TEST
    'username': os.getenv('DB_USERNAME', 'sa'),
    'password': os.getenv('DB_PASSWORD', ''),
    'trust_cert': os.getenv('DB_TRUST_CERT', 'yes'),
}

DB_SCHEMA = "dbo"

# Function to create connection string for sop-manage
def create_connection_string():
    """Create a properly formatted connection string for MS SQL Server"""
    params = urllib.parse.quote_plus(
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        f"TrustServerCertificate={'yes' if DB_CONFIG['trust_cert'].lower() == 'yes' else 'no'};"
        f"Timeout=60;"
    )
    return f"mssql+pyodbc:///?odbc_connect={params}"

# Function to create connection string for TEST database
def create_VC_db_connection_string():
    """Create a properly formatted connection string for MS SQL Server"""
    params = urllib.parse.quote_plus(
        f"DRIVER={{{DB_VC_CONFIG['driver']}}};"
        f"SERVER={DB_VC_CONFIG['server']};"
        f"DATABASE={DB_VC_CONFIG['database']};"
        f"UID={DB_VC_CONFIG['username']};"
        f"PWD={DB_VC_CONFIG['password']};"
        f"TrustServerCertificate={'yes' if DB_VC_CONFIG['trust_cert'].lower() == 'yes' else 'no'};"
        f"Timeout=60;"
    )
    return f"mssql+pyodbc:///?odbc_connect={params}"

# Create engine for sop-manage
engine = create_engine(
    create_connection_string(),
    echo=True,  # Set to False in production
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600,
)

# Create engine for TEST database
vc_db_engine = create_engine(
    create_VC_db_connection_string(),
    echo=True,  # Set to False in production
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600,
)

# Event listener to create schema if it doesn't exist for sop-manage
@event.listens_for(engine, 'connect')
def create_schema(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute(f"""
            IF NOT EXISTS (
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name = '{DB_SCHEMA}'
            )
            BEGIN
                EXEC('CREATE SCHEMA {DB_SCHEMA}')
            END
        """)
        cursor.close()
        dbapi_connection.commit()
    except Exception as e:
        logger.error(f"Error creating schema: {e}")

# Session factory for sop-manage
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

# Session factory for TEST database
VC_DB_Local = sessionmaker(
    bind=vc_db_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

# Dependency function for sop-manage database session
def get_db():
    """Database session dependency for sop-manage"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency function for TEST database session
def get_vc_db():
    """Database session dependency for TEST database"""
    db = VC_DB_Local()
    try:
        yield db
    finally:
        db.close()

# Test connection for sop-manage database
def test_connection_sop_manage():
    """Test connection to sop-manage database"""
    try:
        with engine.connect() as connection:
            logger.info("Successfully connected to sop-manage database!")
            return True
    except Exception as e:
        logger.error(f"Error connecting to sop-manage database: {e}")
        return False

# Test connection for TEST database
def test_connection_test_db():
    """Test connection to TEST database"""
    try:
        # Query the sop-manage database
        with engine.connect() as connection:
            result = connection.execute(text("SELECT TOP 1 * FROM [sop-manage].[dbo].[workflow]"))
            for row in result:
                print(row)

        # Query the TEST database
        with vc_db_engine.connect() as connection:
            result = connection.execute(text("SELECT TOP 1 * FROM [dbo].[IncidentLog_TBL]"))
            for row in result:
                print(row)

        logger.info("Successfully connected to TEST database!")
    except Exception as e:
        logger.error(f"Error connecting to TEST database: {e}")
        return False

test_connection_test_db()