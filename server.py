import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from groq import AsyncGroq

app = FastAPI()

# Enable CORS so the frontend (script.js) can communicate with the backend
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# Get absolute paths for the frontend directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "Frontend"))

print(f"--- SERVER CONFIGURATION ---")
print(f"Looking for Frontend in: {FRONTEND_DIR}")
print(f"Frontend folder found: {os.path.exists(FRONTEND_DIR)}")
print(f"----------------------------")

# =====================================================================
# 🚨 API KEYS SETUP 
# =====================================================================
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "api_key")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "Api_key")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "api_key")
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "api_key")

# Initialize Async Groq Client
groq_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Pydantic models to handle dynamic chat history from frontend
class Message(BaseModel):
    role: str
    content: str

class ChatInput(BaseModel):
    message: str 
    history: list[Message] = []  # 🌟 Dynamic conversation history array

# =====================================================================
# 🚀 MULTI-API ROUTING ENGINE (The Fallback Mechanism)
# =====================================================================

async def call_groq(messages):
    """Primary Route: Blazing fast inference via Groq."""
    if not groq_client:
        raise ValueError("Groq client not initialized.")
    chat_completion = await groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.7,
        max_tokens=1024
    )
    return chat_completion.choices[0].message.content

def call_gemini(messages):
    """Route 2: Native Google Gemini API."""
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API key is missing.")
        
    gemini_messages = []
    system_instruction = None
    
    # Map messages to Gemini's specific JSON structure
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = {"role": "system", "parts": [{"text": msg["content"]}]}
        else:
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_messages.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
            
    payload = {"contents": gemini_messages}
    if system_instruction:
        payload["systemInstruction"] = system_instruction
        
    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=15
    )
    response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]

def call_openrouter(messages):
    """Route 3: OpenRouter Gateway."""
    if not OPENROUTER_API_KEY:
        raise ValueError("OpenRouter API key is missing.")
        
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "google/gemini-pro",
            "messages": messages
        },
        timeout=15
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

def call_mistral(messages):
    """Route 4: Mistral AI (Final Fallback)"""
    if not MISTRAL_API_KEY:
        raise ValueError("Mistral API key is missing.")
        
    response = requests.post(
        url="https://api.mistral.ai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "mistral-small-latest",
            "messages": messages
        },
        timeout=15
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

# =====================================================================
# 🧠 THE CORE CHAT ENDPOINT WITH CASCADE ROUTING
# =====================================================================

@app.post("/chat")
async def chat(data: ChatInput):
    user_message = data.message 

    # --- Static trigger condition ---
    user_message_lower = user_message.lower().strip()
    if "who created you" in user_message_lower or "who made you" in user_message_lower:
        return {"reply": "I am created by Surya and Sayak (Cyberistic Hawks)."} 

    # Construct the System Instruction and append the chat flow history
    system_prompt = {
        "role": "system", 
        "content": "You are a helpful, empathetic, and smart human assistant named Skarl AI, created by Surya and Sayak. Respond naturally and conversationally, strictly following the flow of the history provided."
    }
    
    api_messages = [system_prompt]
    for msg in data.history:
        api_messages.append({"role": msg.role, "content": msg.content})
    api_messages.append({"role": "user", "content": user_message})

    # The Cascade Try-Except Block
    try:
        # Step 1: Try Groq
        print("🤖 Attempting Route 1: Groq")
        ai_reply = await call_groq(api_messages)
        print("🟢 Success: Served via Groq")
        return {"reply": ai_reply}
    except Exception as e1:
        print(f"🔴 Groq Route Failed: {e1}. Switching to Native Gemini...")
        
        try:
            # Step 2: Try Gemini
            print("🤖 Attempting Route 2: Gemini")
            ai_reply = call_gemini(api_messages)
            print("🟢 Success: Served via Gemini")
            return {"reply": ai_reply}
        except Exception as e2:
            print(f"🔴 Gemini Route Failed: {e2}. Switching to OpenRouter...")
            
            try:
                # Step 3: Try OpenRouter
                print("🤖 Attempting Route 3: OpenRouter")
                ai_reply = call_openrouter(api_messages)
                print("🟢 Success: Served via OpenRouter")
                return {"reply": ai_reply}
            except Exception as e3:
                print(f"🔴 OpenRouter Route Failed: {e3}. Switching to Mistral...")
                
                try:
                    # Step 4: Try Mistral
                    print("🤖 Attempting Route 4: Mistral")
                    ai_reply = call_mistral(api_messages)
                    print("🟢 Success: Served via Mistral")
                    return {"reply": ai_reply}
                except Exception as e4:
                    # Final Catchall Error
                    print(f"❌ Critical Failure: All routing channels exhausted. Final Log: {e4}")
                    return {"reply": "Skarl AI is currently experiencing unprecedented routing delays across all backup engines. Please try again in a moment."}

# Serve static assets
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static") 

@app.get("/")
async def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html") 
    if os.path.exists(index_path): 
        return FileResponse(index_path) 
    return {"message": "Skarl AI API is running successfully!"} 

if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static_root") 

if __name__ == "__main__":
    try: 
        print("\n🚀 Skarl AI Multi-Router Gateway is launching!") 
        print("👉 Access the app at: http://0.0.0.0:7860") 
        uvicorn.run(app, host="0.0.0.0", port=7860, log_level="info") 
    except Exception as e: 
        print(f"ERROR: Could not start the server: {e}")
