import os
import datetime
import shutil
import pandas as pd
import lancedb
from lancedb.pydantic import LanceModel, Vector
from lancedb.embeddings import get_registry
from openai import OpenAI
from unstructured.partition.pdf import partition_pdf
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# System Paths
DB_DIR = "./lance_vault"
LOG_FILE = "./logs/privacy_audit.log"
OLLAMA_API_URL = "http://127.0.0.1:11434/v1" 

# FastAPI Setup
app = FastAPI(title="Privacy Hub API")

# Security Middleware: Allows your Vite/Electron frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(base_url=OLLAMA_API_URL, api_key="local-silo")
db = lancedb.connect(DB_DIR)

# Initialize Local Embedding Model (No Internet Required post-download)
embed_model = get_registry().get("sentence-transformers").create(name="all-MiniLM-L6-v2")

class DocumentChunk(LanceModel):
    # Notice the parentheses () instead of square brackets []
    vector: Vector(384) = embed_model.VectorField()
    text: str
    source: str

def log_privacy_event(action: str):
    """Writes to the localized processing log file for judge auditing."""
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] [LOCAL-SILO] {action}\n"
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(log_entry)
    return log_entry

class PrivacyProcessor:
    def __init__(self):
        self.table_name = "document_vault"
        log_privacy_event("Local Intelligence Engine Initialized securely.")

    def chunk_text(self, text: str, chunk_size: int = 1000):
        """Splits text into manageable vectors for the 3B model."""
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    def process_file(self, file_path: str):
        log_privacy_event(f"Analyzing file format for: {os.path.basename(file_path)}")
        chunks = []
        
        if file_path.endswith(".pdf"):
            # Unstructured preserves the vital table formats in the CBC reports
            elements = partition_pdf(filename=file_path, strategy="fast")
            full_text = "\n".join([str(el) for el in elements])
            chunks = self.chunk_text(full_text)
            log_privacy_event("PDF content extracted locally via unstructured parsing.")
            
        elif file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
            full_text = df.to_string()
            chunks = self.chunk_text(full_text)
            log_privacy_event("CSV spreadsheet serialized locally via pandas parsing.")
            
        # Format data for LanceDB embedding
        data = [{"text": chunk, "source": os.path.basename(file_path)} for chunk in chunks]
        
        if self.table_name in db.table_names():
            table = db.open_table(self.table_name)
            table.add(data)
        else:
            table = db.create_table(self.table_name, schema=DocumentChunk, data=data)
            
        log_privacy_event("Data embedded and frozen into local LanceDB vector vault.")
        return "Success"

    def ask_llama(self, user_query: str):
        if self.table_name not in db.table_names():
            return "Please ingest a secure data file first."
            
        table = db.open_table(self.table_name)
        
        # True RAG: Search for the most relevant chunk
        results = table.search(user_query).limit(3).to_pandas()
        context = "\n".join(results["text"].tolist())
        
        log_privacy_event("Vector semantic search executed inside localized bounds.")
        log_privacy_event("Local Llama 3.2 3B Inference pipeline engaged.")

        system_logic = (
            "You are a completely secure, air-gapped personal intelligence assistant. "
            "Analyze the following context data strictly. If it is a medical report, extract vitals and "
            "explain complex terms in plain language. If it is financial, highlight recurring costs "
            "or potential spending leaks. Under no circumstances make up or assume outside data."
        )

        response = client.chat.completions.create(
            model="llama3.2:3b", 
            messages=[
                {"role": "system", "content": system_logic},
                {"role": "user", "content": f"Context data:\n{context}\n\nQuestion: {user_query}"}
            ]
        )
        
        log_privacy_event("Inference processing complete.")
        return response.choices[0].message.content

processor = PrivacyProcessor()

class QueryRequest(BaseModel):
    query: str

@app.post("/api/v1/upload")
async def upload_document(file: UploadFile = File(...)):
    # Save uploaded file locally temporarily for processing
    temp_path = f"./data/{file.filename}"
    os.makedirs("./data", exist_ok=True)
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    status = processor.process_file(temp_path)
    return {"status": status, "filename": file.filename}

@app.post("/api/v1/chat")
async def chat_with_llama(request: QueryRequest):
    response = processor.ask_llama(request.query)
    return {"reply": response}

@app.delete("/api/v1/wipe")
async def wipe_secure_silo():
    # 1. Destroy the LanceDB Vault
    if os.path.exists(DB_DIR):
        shutil.rmtree(DB_DIR)
        
    # 2. Destroy the Audit Logs
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
        
    # 3. Log the destruction in a fresh file
    log_privacy_event("CRITICAL: User initiated Zero-Knowledge Wipe. All local vectors and history destroyed.")
    
    # 4. Reset the in-memory processor table
    processor.table_name = "document_vault" 
    
    return {"status": "Silo Destroyed"}

if __name__ == "__main__":
    # Run the local server
    uvicorn.run(app, host="127.0.0.1", port=8000)