import os
import tempfile
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

app = FastAPI(title="RAG Document Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global State ──────────────────────────────────────────────────────────────
vector_store = None
document_name = None
chunk_count = 0
embeddings_model = None


# ── Models ────────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    answer: str
    sources: int


class UploadResponse(BaseModel):
    message: str
    filename: str
    pages: int
    chunks: int


# ── Helpers ───────────────────────────────────────────────────────────────────
def get_embeddings():
    """Get or create the HuggingFace embeddings model (runs locally, no API key needed)."""
    global embeddings_model
    if embeddings_model is None:
        embeddings_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return embeddings_model


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


def get_text_chunks(text: str) -> list:
    """Split text into overlapping chunks for better retrieval."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def get_conversational_chain():
    """Create a QA chain using LangChain Expression Language (LCEL)."""
    prompt_template = """You are an intelligent document assistant. Answer the question as detailed as possible 
using the provided context. If the answer is not available in the context, say 
"I couldn't find this information in the uploaded document." 
Do not make up answers.

Context:
{context}

Question:
{question}

Answer:"""

    model = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        groq_api_key=os.getenv("GROQ_API_KEY"),
    )

    prompt = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )

    return prompt | model | StrOutputParser()


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok", "document_loaded": vector_store is not None}


@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF, extract text, chunk it, and store embeddings in FAISS."""
    global vector_store, document_name, chunk_count

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        raise HTTPException(
            status_code=500,
            detail="Groq API Key not configured. Please set GROQ_API_KEY in .env",
        )

    # Save uploaded file temporarily
    tmp_dir = tempfile.mkdtemp()
    tmp_path = os.path.join(tmp_dir, file.filename)

    try:
        with open(tmp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Extract text
        reader = PdfReader(tmp_path)
        num_pages = len(reader.pages)
        raw_text = extract_text_from_pdf(tmp_path)

        if not raw_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from this PDF. It may be scanned/image-based.",
            )

        # Chunk text
        chunks = get_text_chunks(raw_text)
        chunk_count = len(chunks)

        # Create embeddings and vector store (local HuggingFace model)
        embeddings = get_embeddings()
        vector_store = FAISS.from_texts(chunks, embedding=embeddings)
        document_name = file.filename

        return UploadResponse(
            message="Document processed successfully!",
            filename=file.filename,
            pages=num_pages,
            chunks=chunk_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """Answer a question using the uploaded document as context."""
    global vector_store

    if vector_store is None:
        raise HTTPException(
            status_code=400, detail="No document uploaded yet. Please upload a PDF first."
        )

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        # Retrieve relevant chunks
        docs = vector_store.similarity_search(request.question, k=4)
        context_text = "\n\n".join([doc.page_content for doc in docs])

        # Run QA chain
        chain = get_conversational_chain()
        response = chain.invoke(
            {"context": context_text, "question": request.question}
        )

        return QueryResponse(
            answer=response,
            sources=len(docs),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
