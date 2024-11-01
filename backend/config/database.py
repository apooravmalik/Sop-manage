import os
import urllib
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration using environment variables
DB_CONFIG = {
    'driver': os.getenv('DB_DRIVER'),
    'server': os.getenv('DB_SERVER'),
    'database': os.getenv('DB_DATABASE'),
    'username': os.getenv('DB_USERNAME'),
    'password': os.getenv('DB_PASSWORD'),
    'trust_cert': os.getenv('DB_TRUST_CERT')
}

def create_connection_string():
    """Create a properly formatted connection string"""
    conn_str = (
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        f"TrustServerCertificate={DB_CONFIG['trust_cert']};"
        "Encrypt=yes;"
        "Connection Timeout=30"
    )
    return urllib.parse.quote_plus(conn_str)

# Create engine with proper configuration
engine = create_engine(
    f"mssql+pyodbc:///?odbc_connect={create_connection_string()}",
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600,
)

# Create session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

def getdb():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_connection():
    """Test database connection and return status"""
    try:
        with engine.connect() as connection:
            logger.info("Successfully connected to the database!")
            return True
    except Exception as e:
        logger.error(f"Error connecting to the database: {e}")
        return False

if __name__ == "__main__":
    test_connection()
