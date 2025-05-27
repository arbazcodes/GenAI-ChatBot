from fastapi import FastAPI, WebSocket, HTTPException
from pydantic import BaseModel
import json
import logging

from .llm_agent import get_sql_query, get_generic_response, get_detailed_answer
from .db_runner import run_query, configure_database

app = FastAPI()
logger = logging.getLogger(__name__)

class DBConfig(BaseModel):
    database_url: str

@app.post("/configure-database")
def configure_db(config: DBConfig):
    """
    Accepts JSON {"database_url": "..."} to spin up engine + reflect.
    """
    result = configure_database(config.database_url)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return {"status": "success", "message": result["message"]}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_text()
            data = json.loads(payload)
            msg = data.get("message")
            mode = data.get("mode", "general")

            response = {
                "message": msg,
                "mode": mode,
                "sql_query": None,
                "query_result": None,
                "llm_response": None
            }

            if mode == "company":
                # generate SQL
                sql_res = get_sql_query(msg)
                if sql_res["status"] != "success":
                    raise Exception(sql_res.get("message", "SQL gen failed"))
                sql = sql_res["sql_query"]

                # run against DB
                qr = run_query(sql)
                if qr["status"] != "success":
                    raise Exception(qr.get("message", "Query failed"))

                # ask LLM to summarize
                det = get_detailed_answer(msg, sql, qr["data"])
                response.update({
                    "sql_query": sql,
                    "query_result": qr["data"],
                    "llm_response": det.get("llm_response", "")
                })
            else:
                # general chat
                gen = get_generic_response(msg)
                response["llm_response"] = gen.get("response", "")

            await websocket.send_text(json.dumps({
                "status": "success",
                "data": response,
                "error": None
            }))
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "status": "error",
            "data": response,
            "error": str(e)
        }))
    finally:
        await websocket.close()
