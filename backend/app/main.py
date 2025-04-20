# backend/app/main.py
from fastapi import FastAPI, WebSocket, HTTPException
from pydantic import BaseModel
import json
import logging

from .llm_agent import get_sql_query, get_generic_response, get_detailed_answer
from .db_runner import run_query

app = FastAPI()
logger = logging.getLogger(__name__)

class QueryRequest(BaseModel):
    message: str
    mode: str  # 'general' or 'company'

@app.post("/api/message")
async def chat_endpoint(query: QueryRequest):
    try:
        if query.mode == "company":
            sql_result = get_sql_query(query.message)
            if sql_result["status"] == "error":
                return {"status": "error", "message": sql_result["message"]}

            query_result = run_query(sql_result["sql_query"])
            if query_result["status"] == "error":
                return {"status": "error", "message": query_result["message"]}

            detailed = get_detailed_answer(
                query.message,
                sql_result["sql_query"],
                query_result["data"]
            )
            return {
                "status": "success",
                "sql_query": sql_result["sql_query"],
                "query_result": query_result["data"],
                "llm_response": detailed["llm_response"]
            }
        else:
            response = get_generic_response(query.message)
            return response
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                data = await websocket.receive_text()
                data_json = json.loads(data)
                message = data_json.get("message")
                mode = data_json.get("mode", "general")

                if mode == "company":
                    sql_result = get_sql_query(message)
                    if sql_result["status"] == "error":
                        raise Exception(sql_result["message"])

                    query_result = run_query(sql_result["sql_query"])
                    if query_result["status"] == "error":
                        raise Exception(query_result["message"])

                    detailed = get_detailed_answer(
                        message,
                        sql_result["sql_query"],
                        query_result["data"]
                    )
                    await websocket.send_text(json.dumps({
                        "status": "success",
                        "sql_query": sql_result["sql_query"],
                        "query_result": query_result["data"],
                        "llm_response": detailed["llm_response"]
                    }))
                else:
                    response = get_generic_response(message)
                    await websocket.send_text(json.dumps(response))

            except Exception as e:
                logger.error(f"WebSocket request error: {e}")
                await websocket.send_text(json.dumps({
                    "status": "error",
                    "message": str(e)
                }))
    finally:
        await websocket.close()
