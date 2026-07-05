# AI Medical Information Chatbot (Nathcorp-med-AI)

An advanced, AI-powered Medical Information Chatbot that provides a safe, strictly controlled conversational interface for general health queries, alongside a local RAG (Retrieval-Augmented Generation) pipeline for querying uploaded medical documents and prescriptions.

> **Disclaimer**: This is an educational project. The chatbot does not provide medical diagnoses, prescriptions, or treatment decisions. Always consult a certified medical professional for health concerns.

---

## ✨ Features

- **Context-Aware Medical AI**: Powered by Google Gemini. The system combines external medical context with its own internal medical knowledge to provide highly concise, accurate, and well-rounded answers.
- **Real-Time Medical API Integration**: General health queries are augmented with real-time data fetched from the **openFDA API** (drug indications, warnings, side effects) and **Wikipedia API** (general disease and condition summaries).
- **Intelligent RAG (Retrieval-Augmented Generation) Pipeline**: Upload medical reports or prescriptions (PDFs). The system extracts text, chunks it, generates vector embeddings locally, and queries them to answer questions specifically about your document while utilizing the LLM's knowledge to explain complex medical terminology.
- **Strict Safety & Emergency Detection**: 
  - **Emergency Filtering**: Built-in middleware scans for emergency keywords (e.g., "chest pain", "can't breathe"). If an emergency is detected, it immediately bypasses the LLM and provides an emergency response.
  - **Output Sanitization**: Outgoing responses are filtered to ensure the LLM never outputs unsafe phrases like diagnoses or dosage instructions.
  - **Automatic Disclaimers**: Proper medical disclaimers are automatically appended to every response.
- **Modern & Responsive UI**: A sleek, user-friendly, responsive frontend interface built with React, Vite, and Tailwind CSS.
- **Rate Limiting & Logging**: Built-in API abuse prevention and comprehensive request logging for backend reliability.

---

## 🌟 Advantages / Why Use This Project?

1. **Safety First**: Unlike standard LLMs which might hallucinate medical advice, this project strictly controls the output, ensuring users receive safe, educational information rather than dangerous diagnoses.
2. **Accurate Grounding**: By pulling data from openFDA and utilizing RAG for user documents, the AI's responses are grounded in real, provided data rather than just relying on pre-trained weights.
3. **Privacy-Focused RAG**: Document embeddings are generated and stored temporarily in-memory using FAISS and local HuggingFace embeddings (`all-MiniLM-L6-v2`), ensuring your uploaded documents aren't stored persistently in a public vector database.
4. **Seamless Full-Stack Architecture**: Clean separation of concerns between the React frontend and FastAPI backend makes it highly extensible for future medical features.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js with Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Framer Motion (for animations), Lucide React (icons)
- **Language**: TypeScript (TSX)

### Backend
- **Framework**: FastAPI (Python)
- **LLM Integration**: Google Gemini API (`gemini-2.5-flash`), `google-generativeai`
- **Orchestration**: LangChain (for RAG prompt chains and document splitting)
- **External Public APIs**: openFDA API, Wikipedia API
- **PDF Processing**: PyMuPDF (`fitz`) for fast text extraction
- **Embeddings**: `sentence-transformers` via HuggingFace (`all-MiniLM-L6-v2`)
- **Vector Store**: FAISS (in-memory)
- **Server**: Uvicorn

---

## 🚀 How to Run Locally

### 1. Backend Setup

1. **Navigate to the Backend directory**:
   ```bash
   cd BACKEND
   ```
2. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Mac/Linux:
   source .venv/bin/activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment Variables**:
   Create or edit the `.env` file inside the `BACKEND` folder and add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
5. **Start the FastAPI Server**:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will start at `http://localhost:8000`. You can access the interactive API docs at `http://localhost:8000/docs`.

### 2. Frontend Setup

1. **Open a new terminal** and ensure you are in the root directory (`Nathcorp-med-AI`).
2. **Install dependencies**:
   This project uses `pnpm` based on the lockfiles, but `npm` also works.
   ```bash
   npm install
   # or
   pnpm install
   ```
3. **Start the Development Server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
   The frontend will be available at the URL provided in the terminal (usually `http://localhost:5173/`).

---

## 📂 Project Structure

```
Nathcorp-med-AI/
│
├── BACKEND/                 # FastAPI Backend Code
│   ├── main.py              # FastAPI entry point
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Backend environment variables
│   ├── config/              # Central configuration (Prompts, Disclaimers, Keys)
│   ├── middleware/          # Rate limiting & request logging
│   ├── routers/             # API Endpoints (Chat, PDF)
│   ├── schema/              # Pydantic models for request/response validation
│   └── services/            # Core logic (LLM, RAG, LangChain, Safety, Emergency detection)
│
├── src/                     # React Frontend Code
│   ├── app/                 # App components and logic (App.tsx)
│   ├── styles/              # Tailwind and custom CSS
│   └── main.tsx             # React application entry point
│
├── index.html               # Vite HTML entry
├── package.json             # Frontend dependencies and scripts
└── vite.config.ts           # Vite configuration
```