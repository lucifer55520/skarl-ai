import os
from fastapi import FastAPI, Request
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

class ChatInput(BaseModel):
    message: str 

# =====================================================================
# 🚨 PASTE YOUR BRAND NEW GROQ API KEY INSIDE THE QUOTES BELOW 🚨
# =====================================================================
GROQ_API_KEY = "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"

client = None
if GROQ_API_KEY:
    try: 
        # The client now pulls directly from the variable above 
        client = AsyncGroq(api_key=GROQ_API_KEY) 
        print("✅ Groq client initialized successfully.") 
    except Exception as e: 
        print(f"❌ ERROR: Groq Client Initialization Failed: {e}") 
else:
    print("❌ WARNING: You forgot to paste your new Groq API Key into the GROQ_API_KEY variable!") 

@app.post("/chat")
async def chat(data: ChatInput):
    """ Endpoint to process user messages using the Groq API (Llama 3 model). """ 
    user_message = data.message 

    # --- আপনার এআই এর নামের কন্ডিশন ---
    user_message_lower = user_message.lower().strip()
    if "who created you" in user_message_lower or "who made you" in user_message_lower:
        return {"reply": "I am created by Surya and Sayak (Cyberistic Hawks)."} 
    # -----------------------------------

    if not client:
        return {"reply": "Server Configuration Error: Groq API key is missing or invalid. Please check server.py."} 
        
    try: 
        # Calling the Groq API using the Llama 3 model 
        chat_completion = await client.chat.completions.create( 
            messages=[ 
                {"role": "system", "content": "You are a helpful, empathetic, and smart human assistant. Respond naturally and conversationally."}, 
                {"role": "user", "content": user_message}, 
            ], 
            model="llama-3.3-70b-versatile", 
            max_tokens=1024 
        ) 
        # Extract the text response from the API result 
        ai_reply = chat_completion.choices[0].message.content 
    except Exception as e: 
        print(f"Groq API Error: {e}") 
        ai_reply = "Sorry, I am having trouble connecting to the AI server. Please check your internet connection or API Key." 
        
    return {"reply": ai_reply} 

# Serve static assets (js, css)
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static") 

@app.get("/")
async def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html") 
    if os.path.exists(index_path): 
        return FileResponse(index_path) 
    return {"message": "Sky AI API is running successfully!"} 

# Serve other static assets (js, css) at the root level
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static_root") 

if __name__ == "__main__":
    try: 
        print("\n🚀 Sky AI is launching!") 
        print("👉 Access the app at: http://0.0.0.0:7860") 
        uvicorn.run(app, host="0.0.0.0", port=7860, log_level="info") 
    except Exception as e: 
        print(f"ERROR: Could not start the server: {e}")
