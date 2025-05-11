from fastapi import FastAPI, WebSocket
from pydantic import BaseModel
import json
import logging

from .llm_agent import get_sql_query, get_generic_response, get_detailed_answer
from .db_runner import run_query

app = FastAPI()
logger = logging.getLogger(__name__)

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

                response_data = {
                    "message": message,
                    "mode": mode,
                    "sql_query": None,
                    "query_result": None,
                    "llm_response": None
                }

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

                    response_data.update({
                        "sql_query": sql_result["sql_query"],
                        "query_result": query_result["data"],
                        "llm_response": detailed["llm_response"]
                    })

                    await websocket.send_text(json.dumps({
                        "status": "success",
                        "data": response_data,
                        "error": None
                    }))
                else:
                    generic_response = get_generic_response(message)
                    response_data["llm_response"] = generic_response.get("llm_response", "")
                    await websocket.send_text(json.dumps({
                        "status": "success",
                        "data": response_data,
                        "error": None
                    }))

            except Exception as e:
                logger.error(f"WebSocket request error: {e}")
                await websocket.send_text(json.dumps({
                    "status": "error",
                    "data": {
                        "message": message if 'message' in locals() else "",
                        "mode": mode if 'mode' in locals() else "general",
                        "sql_query": None,
                        "query_result": None,
                        "llm_response": None
                    },
                    "error": str(e)
                }))
    finally:
        await websocket.close()
