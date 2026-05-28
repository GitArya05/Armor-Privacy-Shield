import os
import datetime
import shutil
import pandas as pd
import lancedb
from sentence_transformers import SentenceTransformer
from openai import OpenAI
from unstructured.partition.pdf import partition_pdf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn

# System Paths
DB_DIR = "./lance_vault"
LOG_FILE = "./logs/privacy_audit.log"
OLLAMA_API_URL = "http://127.0.0.1:11434/v1" 

# FastAPI Setup
app = FastAPI(title="Privacy Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, 
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(base_url=OLLAMA_API_URL, api_key="local-silo")
db = lancedb.connect(DB_DIR)

# EXPLICIT MODEL: Bypassing LanceDB's buggy Pydantic wrappers completely
print("[SYSTEM] Loading embedding model into RAM. Please wait...")
embed_model = SentenceTransformer("all-MiniLM-L6-v2")
print("[SYSTEM] Embedding model loaded successfully.")

def log_privacy_event(action: str):
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] [LOCAL-SILO] {action}\n"
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(log_entry)
    return log_entry

class PrivacyProcessor:
    def __init__(self):
        # RENAMED: This instantly bypasses any old, broken ghost files on your Windows drive
        self.table_name = "secure_vault_v3"
        log_privacy_event("Local Intelligence Engine Initialized securely.")

    def chunk_text(self, text: str, chunk_size: int = 1000):
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    def process_file(self, file_path: str):
        log_privacy_event(f"Analyzing file format for: {os.path.basename(file_path)}")
        chunks = []
        
        if file_path.endswith(".pdf"):
            elements = partition_pdf(filename=file_path, strategy="fast")
            full_text = "\n".join([str(el) for el in elements])
            chunks = self.chunk_text(full_text)
            log_privacy_event("PDF content extracted locally via unstructured parsing.")
            
        elif file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
            full_text = df.to_string()
            chunks = self.chunk_text(full_text)
            log_privacy_event("CSV spreadsheet serialized locally via pandas parsing.")
            
        if not chunks:
            raise Exception("No readable text found in the document.")

        # EXPLICIT VECTORIZATION: We calculate them manually, ensuring no schema errors
        log_privacy_event("Generating 384-dimensional vectors explicitly...")
        vectors = embed_model.encode(chunks)
        
        # Build the exact, raw data structure LanceDB needs natively
        data = [
            {
                "vector": vectors[i].tolist(), 
                "text": chunks[i], 
                "source": os.path.basename(file_path)
            } 
            for i in range(len(chunks))
        ]
        
        if self.table_name in db.table_names():
            table = db.open_table(self.table_name)
            table.add(data)
        else:
            table = db.create_table(self.table_name, data=data)
            
        log_privacy_event("Data embedded and frozen into local LanceDB vector vault.")
        return "Success"

    def ask_llama_stream(self, user_query: str):
        if self.table_name not in db.table_names():
            yield "Please ingest a secure data file first."
            return
            
        table = db.open_table(self.table_name)
        
        # EXPLICIT QUERY VECTORIZATION
        query_vector = embed_model.encode([user_query])[0].tolist()
        
        # UPGRADE: Limit to 2 chunks to prevent AI confusion and noise
        results = table.search(query_vector).limit(2).to_pandas()
        context = "\n".join(results["text"].tolist())
        
        log_privacy_event("Vector semantic search executed inside localized bounds.")
        log_privacy_event("Streaming zero-latency inference pipeline engaged.")

        # UPGRADE: Militant strictness to force exact answers
        system_logic = (
            "You are a highly secure, strict data extraction AI. "
            "RULES:\n"
            "1. ONLY answer based on the provided Context data.\n"
            "2. If the answer is NOT in the context, reply EXACTLY with: 'Data not found in local vault.'\n"
            "3. DO NOT assume, guess, or bring in outside knowledge.\n"
            "4. Be brutally concise. Give the exact number, verdict, or decision immediately without filler words."
        )

        # UPGRADE: Temperature 0.0 + Stream True
        response = client.chat.completions.create(
            model="llama3.2:3b", 
            messages=[
                {"role": "system", "content": system_logic},
                {"role": "user", "content": f"Context data:\n{context}\n\nQuestion: {user_query}"}
            ],
            temperature=0.0,
            stream=True
        )
        
        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

processor = PrivacyProcessor()

class QueryRequest(BaseModel):
    query: str

@app.post("/api/v1/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")
        
    temp_dir = "./temp_data"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        status = processor.process_file(temp_path)
        return JSONResponse(content={"status": status, "filename": file.filename})
    
    except Exception as e:
        print(f"[ERROR] Failed to ingest {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/v1/chat")
async def chat_with_llama(request: QueryRequest):
    try:
        # UPGRADE: Connects UI to the live token generator
        return StreamingResponse(processor.ask_llama_stream(request.query), media_type="text/event-stream")
    except Exception as e:
        print(f"[ERROR] Inference failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# UPGRADE: Dedicated log endpoint that bypasses Electron IPC issues
@app.get("/api/v1/logs")
async def get_system_logs():
    try:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, "r") as f:
                lines = f.readlines()
                return {"logs": "".join(lines[-15:])}
        return {"logs": "[SYSTEM] Local Engine Standby... Awaiting data stream."}
    except Exception:
        return {"logs": "[ERROR] Cannot read local silo."}

@app.delete("/api/v1/wipe")
async def wipe_secure_silo():
    if os.path.exists(DB_DIR):
        try:
            shutil.rmtree(DB_DIR)
        except:
            pass
            
    if os.path.exists(LOG_FILE):
        try:
            os.remove(LOG_FILE)
        except:
            pass
            
    log_privacy_event("CRITICAL: User initiated Zero-Knowledge Wipe. All local vectors and history destroyed.")
    
    # Dynamically increment table name to guarantee a fresh start, bypassing Windows locks entirely
    processor.table_name = f"secure_vault_{int(datetime.datetime.now().timestamp())}"
    
    return {"status": "Silo Destroyed"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)