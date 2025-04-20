# backend/app/db_runner.py
import os
import re
import pandas as pd
from sqlalchemy import create_engine, text
import logging

logger = logging.getLogger(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def is_safe_query(sql: str) -> bool:
    sql_lower = sql.strip().lower()
    if not sql_lower.startswith("select"):
        return False
    disallowed_keywords = ["drop", "delete", "update", "insert", "alter", "create"]
    return not any(re.search(rf"\b{kw}\b", sql_lower) for kw in disallowed_keywords)

def run_query(sql: str) -> dict:
    if not is_safe_query(sql):
        logger.warning("Blocked unsafe SQL query attempt.")
        return {
            "status": "error",
            "data": None,
            "message": "Unsafe query blocked."
        }

    try:
        with engine.connect() as conn:
            df = pd.read_sql(text(sql), con=conn)
        result = df.head(10).to_dict(orient="records")
        logger.info("SQL query executed successfully.")
        return {
            "status": "success",
            "data": result,
            "message": "Query executed."
        }
    except Exception as e:
        logger.error(f"Error executing SQL query: {e}")
        return {
            "status": "error",
            "data": None,
            "message": f"Error executing query: {e}"
        }
