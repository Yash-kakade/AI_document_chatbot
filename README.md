# DocuMind AI — RAG Document Chatbot

DocuMind AI is a full-stack Retrieval-Augmented Generation (RAG) Document Chat application. It allows users to upload PDF documents and ask questions about their content in real-time. 

The system extracts text, chunks it, creates embeddings, stores them in a local FAISS vector store, and uses the **Groq Llama 3.3 70B** LLM to provide highly accurate answers grounded entirely in the uploaded document.

## 🌟 Features
- **Modern Premium UI**: Built with Next.js, featuring dark mode, glassmorphism, responsive design, and smooth animations.
- **Drag-and-Drop Upload**: Seamlessly upload PDF files.
- **Interactive Chat**: Ask unlimited questions with a clean chat interface, typing indicators, and suggested questions.
- **Fast Local Retrieval**: Uses HuggingFace `all-MiniLM-L6-v2` for fast, free local embeddings stored in a lightweight FAISS index.
- **Lightning Fast LLM**: Powered by Groq and the Llama 3.3 70B Versatile model for blazingly fast inference.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (React)
- **Styling**: Vanilla CSS (Custom dark theme with glassmorphism)

### Backend
- **Framework**: FastAPI + Uvicorn
- **AI Orchestration**: LangChain & LangChain Expression Language (LCEL)
- **Vector Database**: FAISS (in-memory)
- **Embeddings**: `sentence-transformers` (HuggingFace: all-MiniLM-L6-v2)
- **LLM**: Groq API (`llama-3.3-70b-versatile`)
- **PDF Parsing**: PyPDF2

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js 18+
- [Groq API Key](https://console.groq.com/keys)

### 1. Clone the Repository
```bash
git clone https://github.com/Yash-kakade/AI_document_chatbot.git
cd AI_document_chatbot
```

### 2. Configure the Backend
Navigate to the backend directory, set up a virtual environment, and install dependencies.
```bash
cd backend
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Start the Backend Server
```bash
# Ensure your virtual environment is activated
uvicorn main:app --reload --port 8000
```
The FastAPI server will be running at `http://localhost:8000`.

### 4. Configure & Start the Frontend
Open a new terminal window, navigate to the frontend directory, install dependencies, and start the development server.
```bash
cd frontend
npm install
npm run dev
```
The Next.js application will launch at `http://localhost:3000`.

---

## 💡 Usage
1. Open your browser and navigate to `http://localhost:3000`.
2. Check the top right corner to ensure the status indicator shows **"Connected"** (green dot).
3. Drag and drop a `.pdf` file into the upload zone on the left panel.
4. Wait for the processing to finish (text extraction and embedding generation).
5. Once processed, use the chat panel on the right to read document stats or ask questions about the document content.

## 🏗️ Architecture Flow
1. **Upload**: User drops/selects a PDF → Backend extracts text using PyPDF2.
2. **Chunk**: Text is split into 1000-character overlapping chunks via LangChain's `RecursiveCharacterTextSplitter`.
3. **Embed**: Chunks are converted to dense vectors locally using the HuggingFace `all-MiniLM-L6-v2` model.
4. **Store**: Vectors are stored in a FAISS index for high-speed similarity search.
5. **Query**: User asks a question → Top 4 relevant chunks are retrieved → Groq's Llama 3.3 generates a natural language answer grounded completely in the document context.
