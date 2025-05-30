from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from starlette.websockets import WebSocketState
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

            try:
                if mode == "company":
                    # generate SQL
                    sql_res = get_sql_query(msg)
                    if sql_res["status"] != "success":
                        raise Exception(sql_res.get("message", "SQL generation failed"))
                    sql = sql_res["sql_query"]

                    # run against DB
                    qr = run_query(sql)
                    if qr["status"] != "success":
                        raise Exception(qr.get("message", "Query execution failed"))

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

                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_text(json.dumps({
                        "status": "success",
                        "data": response,
                        "error": None
                    }))

            except Exception as inner_e:
                logger.error(f"Processing error: {inner_e}")
                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_text(json.dumps({
                        "status": "error",
                        "data": response,
                        "error": str(inner_e)
                    }))

    except WebSocketDisconnect as disconnect_e:
        logger.info(f"WebSocket disconnected: {disconnect_e.code}")

    except Exception as outer_e:
        logger.error(f"Unexpected WebSocket error: {outer_e}")

    finally:
        if websocket.application_state != WebSocketState.DISCONNECTED:
            await websocket.close()
