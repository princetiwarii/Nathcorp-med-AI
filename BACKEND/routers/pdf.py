import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from schema.common import PDFUploadResponse, PDFQuestionRequest, PDFAnswerResponse
from services.pdf_parser import extract_text_from_pdf
from services.rag import store_document, query_document, delete_document
from services.emergency import detect_emergency
from services.safety import build_chat_response

router = APIRouter()

@router.post("/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Receives a PDF file, extracts text, generates embeddings,
    and stores them in memory mapped to a unique session_id.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    try:
        # Read the file bytes
        file_bytes = await file.read()
        
        # Extract text using PyMuPDF
        text = extract_text_from_pdf(file_bytes)
        
        if not text:
            raise HTTPException(status_code=400, detail="No readable text found in PDF.")
            
        # Generate a unique session ID
        session_id = str(uuid.uuid4())
        
        # Store the document in our in-memory RAG store
        store_document(session_id, text)
        
        return PDFUploadResponse(
            session_id=session_id,
            message="PDF successfully uploaded and processed. You can now ask questions about it."
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@router.post("/ask-pdf", response_model=PDFAnswerResponse)
def ask_pdf(request: PDFQuestionRequest):
    """
    Queries an uploaded PDF document based on the session_id.
    Validates safety and emergency status before returning the answer.
    """
    question = request.question.strip()
    session_id = request.session_id
    
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    # Step 1: Emergency check
    if detect_emergency(question):
        response_dict = build_chat_response(reply="", is_emergency=True, source="pdf")
        return PDFAnswerResponse(**response_dict)
        
    # Step 2: Query the RAG system
    raw_reply = query_document(session_id, question)
    
    # Step 3: Pass reply through safety filter and attach PDF disclaimer
    response_dict = build_chat_response(reply=raw_reply, is_emergency=False, source="pdf")
    
    return PDFAnswerResponse(**response_dict)

@router.delete("/delete-pdf/{session_id}")
def delete_pdf(session_id: str):
    """
    Deletes the uploaded PDF document from memory based on the session_id.
    """
    if delete_document(session_id):
        return {"message": "Document deleted successfully."}
    else:
        raise HTTPException(status_code=404, detail="Document not found.")
