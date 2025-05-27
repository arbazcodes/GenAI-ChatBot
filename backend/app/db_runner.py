import re
import pandas as pd
import logging
import json

from sqlalchemy import text
from .schema_reader import init_schema

logger = logging.getLogger(__name__)

# Will be set by configure_database()
engine = None

def configure_database(db_url: str) -> dict:
    """
    Create and test a new SQLAlchemy engine, then reflect schema.
    """
    from sqlalchemy import create_engine
    try:
        new_engine = create_engine(db_url)
        # test connection
        with new_engine.connect():
            pass

        # reflect tables into ORM
        init_schema(new_engine)

        # store for queries
        global engine
        engine = new_engine

        logger.info("Database configured and schema initialized.")
        return {"status": "success", "message": "Database configured."}
    except Exception as e:
        logger.error(f"Error configuring database: {e}")
        return {"status": "error", "message": str(e)}

def is_safe_query(sql: str) -> bool:
    """
    Only allow simple SELECTs without destructive keywords.
    """
    if engine is None:
        return False
    sql_l = sql.strip().lower()
    if not sql_l.startswith("select"):
        return False
    blocked = ["drop", "delete", "update", "insert", "alter", "create"]
    return not any(re.search(rf"\b{kw}\b", sql_l) for kw in blocked)

def run_query(sql: str) -> dict:
    """
    Execute a read-only SQL query against the configured engine.
    """
    if engine is None:
        return {
            "status": "error",
            "data": None,
            "message": "Database not configured. POST /configure-database first."
        }
    if not is_safe_query(sql):
        logger.warning("Blocked unsafe SQL query.")
        return {"status": "error", "data": None, "message": "Unsafe query blocked."}

    try:
        with engine.connect() as conn:
            df = pd.read_sql(text(sql), con=conn)
        # only return first 10 rows
        records = json.loads(df.head(10).to_json(orient="records", date_format="iso"))
        logger.info("Query executed successfully.")
        return {"status": "success", "data": records, "message": "Query executed."}
    except Exception as e:
        logger.error(f"Error executing SQL query: {e}")
        return {"status": "error", "data": None, "message": str(e)}
