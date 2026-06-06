# Privacy Shield Hub: Data Intelligence

Privacy Shield Hub is an enterprise grade, local-first desktop intelligence system built from scratch for macOS. This software bridges the gap between high utility artificial intelligence and total data sovereignty by processing sensitive financial ledger files and dense medical archives without a single packet of data leaving the physical hardware container.

This system was explicitly designed, built, and audited to fulfill the core security and engineering constraints outlined in **Track 3 | The Privacy Shield**. It features an intuitive, ultra-modern dashboard interface that operates flawlessly under a zero-connectivity, air-gapped network state.

---

##  Integrated Core Tech Stack

Our decentralized architecture removes third-party cloud infrastructure entirely, binding all data engineering, vector indexing, and model inference operations directly to local machine components:

- **Host Shell Platform:** Electron.js (Provides a strictly sandboxed native desktop container environment).
- **User Interface:** React 19 + Vite + Tailwind CSS (Modern slate/emerald theme).
- **Vector Database Engine:** LanceDB (Local-first, disk-backed, zero-latency vector table indexing).
- **Data Partitioning & Embedding:** Unstructured.io & `sentence-transformers` (Local extraction and explicit 384-dimensional vector generation).
- **Local LLM Engine:** Ollama Service Container running the **Llama 3.2 (3B)** quantized model.
- **Inference Pipeline:** FastAPI via Python (Implementing zero-latency Server-Sent Events (SSE) token streaming, conversational memory, and a strict 0.0-temperature factual prompt layer).

---

##  Architecture Blueprint

```text
ARMOR/
├── package.json                     # Unified dependency and module build routing
├── frontend/                        # Application frontend container
│   ├── index.html                   # Document root entry with strict Content-Security-Policy
│   ├── src/
│   │   ├── main.ts                  # Core Electron main process & crash trap
│   │   ├── preload.ts               # Sandboxed local security context bridge
│   │   ├── renderer.tsx             # React rendering target wrapper
│   │   └── PrivacyHubDashboard.tsx  # Responsive RAG analytics interface
└── backend/                         # Offline data processing environment
    ├── processor.py                 # FastAPI server, LanceDB vector logic, and SSE streaming
    ├── lance_vault/                 # Isolated physical vector storage location (Generated)
    ├── temp_data/                   # Volatile memory for Unstructured parsing
    └── logs/                        # Localized privacy audit logs

```
## Step-by-Step Installation & Setup

Follow these setup phases to deploy the entire secure architecture locally on your hardware.

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.11 or v3.12)
- **Ollama Intelligence Engine** (Ensure the desktop daemon is installed and active via [ollama.com](https://ollama.com))

### Step 1: Clone and Configure the Application Repository

Open your terminal and navigate to your chosen project workspace directory:

```bash
git clone [https://github.com/GitArya05/Armor-Privacy-Shield.git](https://github.com/GitArya05/Armor-Privacy-Shield.git)
cd Armor-Privacy-Shield/frontend
npm install
```


### Step 2: Set Up the Isolated Python Environment

Initialize the local Python virtual environment inside the backend directory to isolate data science packages:


```bash
cd ../backend
python -m venv venv

# Activate the environment:
# For Windows (PowerShell):
.\venv\Scripts\activate
# For macOS/Linux:
source venv/bin/activate

# Install core local-processing libraries
pip install fastapi uvicorn lancedb pydantic "unstructured[pdf]" sentence-transformers pandas openai
```

### Step 3: Initialize the Local Llama Intelligence Core

Ensure the Ollama background service is running on your local machine, then execute the following command in a separate terminal window to download and containerize the designated reasoning model manifest directly onto your local storage:

```bash
ollama pull llama3.2:3b
```

---

## Runtime Operations

To launch the secure workspace concurrently, run the following commands across separate, active terminal panes:

### Pane A: Start the Production FastAPI Server

Ensure your virtual environment is active before starting the local server thread so that all required data science dependencies are fully available:

- **Step 1:** Open a terminal window and navigate directly into the backend directory:

````bash
    cd backend
````

*   **Step 2:** Activate your isolated virtual environment container:
*   *For macOS/Linux:*
```bash
        source venv/bin/activate
```

*   *For Windows (PowerShell):*
```powershell
        .\venv\Scripts\activate
```
*   **Step 3:** Launch the ASGI server runner with automatic code reload enabled:
```bash
    uvicorn main:app --reload
```

*The local API microservice container will bind securely to `http://127.0.0.1:8000`. You can verify active endpoint mapping routes by visiting `http://127.0.0.1:8000/docs` in your browser.*

---

### Pane B: Compile Frontend Assets and Launch Electron
Open a completely separate terminal pane pointing directly to the root project workspace to launch the standalone desktop application interface:

*   **Step 1:** Open a new terminal window or pane and ensure you are sitting at the root workspace folder:
```bash
    cd ..
````
*   **Step 2:** Execute the integrated startup script sequence:
```bash
    npm start
````

*Vite will instantly bundle your modern TypeScript components and layout files into production static targets. The native standalone **Privacy Shield Hub** desktop frame will snap open automatically over your screen, immediately establishing its sandboxed security bridge with your active Python backend node.*

`````
`````

## Track Validation Checklist
To confirm the application meets all the evaluation metrics specified in **Track 3 | The Privacy Shield**:

### 1. Total Data Sovereignty (40% Weight)
* **Air-Gap Isolation:** Toggle your machine's Wi-Fi network interface completely OFF or unplug your Ethernet cable.
* **Security Context Bridge:** Verify that the status badge at the top right of the application interface automatically updates to reflect **"AIR-GAP STATUS: SECURE"** using the sandboxed preload bridge.
* **Zero-Leakage Guarantee:** Confirm that the entire analytical pipeline functions flawlessly with zero internet connectivity, ensuring no outbound data packets leave the local device container.

### 2. Document Pipeline Ingestion
* **Local File Ingestion:** Upload an anonymized financial transaction ledger (`.csv`) or a comprehensive lab diagnostic summary (`.pdf`) into the drag-and-drop vault interface.
* **Offline Document Splitting:** Verify via your FastAPI console logs that the local data state manager successfully processes and partitions the file using `Unstructured.io`.
* **Vector Engine Commit:** Confirm that the extracted document contents are immediately indexed and written silently into your physical, disk-backed local `LanceDB` storage collection.

### 3. Insight Depth Reasoning (30% Weight)
* **Contextual RAG Execution:** Submit a complex analysis request, such as identifying hidden subscription cost leakage, detecting silent price hikes across financial cycles, or interpreting physiological trend markers over time.
* **Advanced Local Inference:** Verify that the local engine executes a deep context look-up across your database tables, injecting the file text directly into your local **Llama 3.2 3B** prompt template to deliver tailored reasoning rather than basic keyword matching.

### 4. Performance & UX Verification (30% Weight)
* **Clean Markdown Parsing:** Confirm that raw LLM output text strings automatically transform into beautifully formatted blocks, presenting major headers, clean paragraphs, and indented list elements clearly.
* **Inference Latency Metric:** Monitor your active backend console window to verify that the INT4 model quantisation paths are maintaining high tokens-per-second (TPS) execution speeds on standard consumer laptop hardware.

````

