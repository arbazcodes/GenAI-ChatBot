# backend/app/llm_agent.py
import os
import openai
import logging
from .schema_reader import get_schema_context

logger = logging.getLogger(__name__)
openai.api_key = os.getenv("OPENAI_API_KEY")


def get_sql_query(question: str) -> dict:
    try:
        schema = get_schema_context()
        prompt = f"""
You are an AI assistant that generates PostgreSQL SELECT queries using the following database schema:
{schema}

User Question: "{question}"

Generate only a valid SELECT query.
"""
        logger.info("Sending prompt to OpenAI for SQL generation.")
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        sql = response.choices[0].message["content"].strip().replace("```sql", "").replace("```", "")
        logger.info("SQL query generated successfully.")
        return {"status": "success", "sql_query": sql}
    except Exception as e:
        logger.error(f"Error generating SQL query: {e}")
        return {"status": "error", "sql_query": "", "message": str(e)}


def get_generic_response(question: str) -> dict:
    try:
        prompt = f"Friendly response to: {question}"
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )
        return {"status": "success", "response": response.choices[0].message["content"]}
    except Exception as e:
        logger.error(f"Error generating generic response: {e}")
        return {"status": "error", "response": "", "message": str(e)}


def get_detailed_answer(question: str, sql: str, query_data: list) -> dict:
    try:
        data_str = "\n".join([str(row) for row in query_data])
        prompt = f"""
You are a data analyst bot.

SQL Query:
{sql}

Query Result:
{data_str}

Answer the user's question:
"{question}"
"""
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return {
            "status": "success",
            "llm_response": response.choices[0].message["content"].strip()
        }
    except Exception as e:
        logger.error(f"Error generating detailed answer: {e}")
        return {
            "status": "error",
            "llm_response": "Unable to generate a detailed answer at this time.",
            "message": str(e)
        }
