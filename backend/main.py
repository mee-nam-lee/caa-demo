import os
from dotenv import load_dotenv
load_dotenv()
os.environ["GOOGLE_API_USE_MTLS_ENDPOINT"] = "never"
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from bigquery_client import bq_client
import pandas as pd
from google.cloud import geminidataanalytics
from google.protobuf.json_format import MessageToDict
import json
import asyncio
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_AGENT_ID = os.getenv("DATA_AGENT_ID")
BILLING_PROJECT = os.getenv("BILLING_PROJECT")
LOCATION = os.getenv("LOCATION")
DASHBOARD_TABS_RAW = os.getenv("DASHBOARD_TABS", "[]")
DASHBOARD_BASELINES_RAW = os.getenv("DASHBOARD_BASELINES", "{}")

class LoginRequest(BaseModel):
    password: str

@app.post("/api/login")
async def login(req: LoginRequest):
    correct_password = os.getenv("DASHBOARD_PASSWORD", "")
    if correct_password and req.password == correct_password:
        return {"success": True}
    return {"success": False, "message": "Invalid password"}

@app.get("/api/config")
async def get_config():
    try:
        # Resolve the JSON strings from env
        def parse_env_json(raw_str, default):
            s = raw_str.strip()
            if s.startswith("'") and s.endswith("'"):
                s = s[1:-1]
            return json.loads(s) if s else default

        tabs = parse_env_json(DASHBOARD_TABS_RAW, [])
        baselines = parse_env_json(DASHBOARD_BASELINES_RAW, {})
        
        return {
            "tabs": tabs,
            "baselines": baselines
        }
    except Exception as e:
        print(f"DEBUG: Config Error: {e}", flush=True)
        return {"tabs": [], "baselines": {}}

@app.post("/api/chat/conversation/create")
async def create_conversation(conversation_id: str = Query("thelook-ecommerce")):
    try:
        client = geminidataanalytics.DataChatServiceAsyncClient()
        
        # 1. Try to get existing conversation first
        conversation_name = f"projects/{BILLING_PROJECT}/locations/{LOCATION}/conversations/{conversation_id}"
        try:
            response = await client.get_conversation(name=conversation_name)
            return {"conversation_name": response.name}
        except Exception:
            # If not found or error, proceed to create
            pass

        # 2. Create if not exists
        conversation = geminidataanalytics.Conversation()
        conversation.agents = [f'projects/{BILLING_PROJECT}/locations/{LOCATION}/dataAgents/{DATA_AGENT_ID}']
        
        parent = f"projects/{BILLING_PROJECT}/locations/{LOCATION}"
        request = geminidataanalytics.CreateConversationRequest(
            parent=parent,
            conversation=conversation,
            conversation_id=conversation_id
        )
        response = await client.create_conversation(request=request)
        return {"conversation_name": response.name}
    except Exception as e:
        print(f"DEBUG: Create/Get Conversation Error: {e}", flush=True)
        return {"error": str(e)}


@app.post("/api/chat")
async def chat(request_data: dict):
    # request_data should contain 'messages' (list of message dicts)
    messages_raw = request_data.get('messages', [])
    conversation_name = request_data.get('conversation')
    
    async def event_generator():
        try:
            client = geminidataanalytics.DataChatServiceAsyncClient()
            
            # Convert raw messages to proto Messages
            conversation_messages = []
            for msg in messages_raw:
                try:
                    message = geminidataanalytics.Message()
                    if 'userMessage' in msg:
                        user_msg = msg['userMessage']
                        text = ""
                        if isinstance(user_msg, dict):
                            text = user_msg.get('text', '')
                        elif isinstance(user_msg, str):
                            # Handle cases where it might be a stringified dict
                            if user_msg.strip().startswith('{'):
                                try:
                                    import ast
                                    parsed = ast.literal_eval(user_msg)
                                    if isinstance(parsed, dict):
                                        text = parsed.get('text', user_msg)
                                    else:
                                        text = user_msg
                                except:
                                    text = user_msg
                            else:
                                text = user_msg
                        else:
                            text = str(user_msg)
                        
                        message.user_message.text = str(text)
                    elif 'systemMessage' in msg:
                        # SystemMessage text is a TextMessage field (expects parts list)
                        if isinstance(msg['systemMessage'], dict) and 'text' in msg['systemMessage']:
                            message.system_message.text.parts = [str(msg['systemMessage']['text'])]
                    conversation_messages.append(message)
                except Exception:
                    continue

            # Data Agent Context
            data_agent_context = geminidataanalytics.DataAgentContext()
            data_agent_context.data_agent = f"projects/{BILLING_PROJECT}/locations/{LOCATION}/dataAgents/{DATA_AGENT_ID}"

            chat_request = geminidataanalytics.ChatRequest(
                parent=f"projects/{BILLING_PROJECT}/locations/{LOCATION}",
                messages=conversation_messages,
                conversation_reference={"conversation": conversation_name} if conversation_name else None,
                data_agent_context=data_agent_context,
            )
            
            import time
            start_time = time.time()
            print(f"[PERF] Sending request to Google Cloud Data Agent...", flush=True)
            
            stream = await client.chat(request=chat_request)
            
            first_chunk = True
            async for response in stream:
                if first_chunk:
                    ttfb = time.time() - start_time
                    print(f"[PERF] Backend (Vertex AI) Time To First Byte (TTFB): {ttfb:.2f} seconds", flush=True)
                    first_chunk = False
                
                resp_dict = MessageToDict(response._pb)
                yield f"data: {json.dumps(resp_dict)}\n\n"
            
            total_time = time.time() - start_time
            print(f"[PERF] Backend Total Streaming Time: {total_time:.2f} seconds", flush=True)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/dashboard/executive")
async def get_executive_summary():
    return bq_client.get_executive_summary()

@app.get("/api/dashboard/marketing")
async def get_marketing_analytics():
    return bq_client.get_marketing_analytics()

@app.get("/api/dashboard/web-analytics")
async def get_web_analytics():
    return bq_client.get_web_analytics()

@app.get("/api/dashboard/sales")
async def get_sales_performance():
    return bq_client.get_sales_performance()

@app.get("/api/dashboard/logistics")
async def get_logistics_status():
    return bq_client.get_logistics_status()

@app.get("/api/cache/clear")
async def clear_cache():
    try:
        bq_client.clear_cache()
        return {"status": "success", "message": "Cache cleared"}
    except Exception as e:
        return {"error": str(e)}

# Production Static File Serving
# Mount the built frontend static files
# In a Cloud Run environment, the frontend is built into the 'static' directory
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

# Catch-all route to serve index.html for React routing
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html", headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return {"error": "Frontend not found"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    
    print(f"Server starting on port {port}...")
    if os.path.exists("static"):
        print("Mode: Unified (API + Static Frontend) - Matches Cloud Run deployment.")
    else:
        print("Mode: API-only (Standard Dev) - Use frontend dev server for UI.")
        
    uvicorn.run(app, host="0.0.0.0", port=port)
