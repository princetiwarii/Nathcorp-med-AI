import os
import gc
import torch
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from config.settings import SYSTEM_PROMPT_PDF

# Initialize embeddings model ONCE at startup — not per request.
# Loading SentenceTransformer is expensive (~200MB); doing it per-upload causes OOM on Render.
embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},       # Force CPU — no GPU on Render
    encode_kwargs={"batch_size": 8},      # Small batches = lower peak memory per encode call
)

# In-memory store of FAISS indexes per session
# Structure: { "session_id": FAISS_VectorStore_Instance }
VECTOR_STORES = {}

def store_document(session_id: str, text: str):
    """
    Chunks the text, calculates embeddings using Langchain,
    and stores them in a new FAISS vector store mapped to the session_id.
    """
    if not text or not text.strip():
        VECTOR_STORES[session_id] = None
        return

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
    )
    chunks = text_splitter.split_text(text)

    # torch.no_grad() prevents PyTorch from keeping gradient graphs in memory.
    # This is pure inference — we never train — so gradients are pure waste.
    with torch.no_grad():
        vector_store = FAISS.from_texts(chunks, embeddings)

    VECTOR_STORES[session_id] = vector_store

    # Explicitly free the chunks list and trigger GC to reclaim memory immediately.
    # Without this, Python's GC may delay cleanup, causing memory to stay elevated.
    del chunks
    gc.collect()


def query_document(session_id: str, question: str, top_k: int = 3) -> str:
    """
    Searches the stored FAISS document for relevant chunks and asks 
    Gemini via Langchain to answer.
    """
    if session_id not in VECTOR_STORES:
        return "Error: Document session not found. Please upload the PDF again."
        
    vector_store = VECTOR_STORES[session_id]
    if vector_store is None:
        return "The uploaded document contains no readable text."

    # Retrieve top K most similar chunks
    with torch.no_grad():
        docs = vector_store.similarity_search(question, k=top_k)

    context = "\n\n---\n\n".join([doc.page_content for doc in docs])

    # Construct the chain for Gemini
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "Error: Gemini API is not configured. Please set GEMINI_API_KEY in your .env file."
            
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.1,
            google_api_key=api_key
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT_PDF),
            ("human", "Context Information:\n{context}\n\nQuestion: {question}")
        ])
        
        chain = prompt | llm
        
        response = chain.invoke({"context": context, "question": question})
        return response.content
    except Exception as e:
        print(f"Error calling Gemini API via Langchain: {e}")
        return "Sorry, I encountered an error while trying to generate the answer."

def delete_document(session_id: str) -> bool:
    """
    Deletes the FAISS vector store associated with the session_id from memory.
    """
    if session_id in VECTOR_STORES:
        del VECTOR_STORES[session_id]
        gc.collect()
        return True
    return False
