# AI Medical Information Chatbot

An AI-powered Medical Information Chatbot that provides a safe, strictly controlled conversational interface for general health queries, as well as a local RAG (Retrieval-Augmented Generation) pipeline for querying uploaded medical PDFs.

> **Disclaimer**: This is an educational project. The chatbot does not provide medical diagnoses, prescriptions, or treatment decisions. Always consult a certified medical professional for health concerns.

---

## ✨ Features

- **General Health Chatbot**: Ask general health, symptom, and medicine queries. Powered by Google Gemini and augmented with real-time data from the **openFDA API** (drug indications/warnings) and **Wikipedia API** (disease summaries).
- **Context-Aware PDF Q&A (RAG)**: Upload medical reports or prescriptions (PDFs) and ask specific questions. The chatbot extracts text, generates embeddings locally, and answers based *only* on the document context.
- **Safety & Emergency Detection**: Built-in middleware detects emergency situations based on keywords, filters outgoing responses for unsafe language (like diagnosis or dosage instructions), and attaches mandatory medical disclaimers.
- **Modern & Responsive UI**: A sleek, user-friendly frontend interface built with React, Vite, and Tailwind CSS.
- **Rate Limiting & Logging**: Built-in API abuse prevention and comprehensive request logging.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js with Vite
- **Styling**: Tailwind CSS, CSS Modules
- **UI Components**: Radix UI, Framer Motion (for animations), Lucide React (icons)
- **Routing**: React Router
- **Language**: TypeScript

### Backend
- **Framework**: FastAPI (Python)
- **LLM Integration**: Google Gemini API
- **External Public APIs**: openFDA API, Wikipedia API
- **PDF Processing**: PyMuPDF (`fitz`)
- **Embeddings & RAG**: `sentence-transformers` for local vector generation, in-memory vector store
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
   Using `npm` (or `pnpm`/`yarn`):
   ```bash
   npm install
   ```
3. **Start the Development Server**:
   ```bash
   npm run dev
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
│   ├── config/              # Central configuration (Prompts, Disclaimers)
│   ├── middleware/          # Rate limiting & logging
│   ├── routers/             # Chat and PDF API endpoints
│   ├── schema/              # Pydantic models for request/response
│   └── services/            # Core logic (LLM, RAG, Safety, Emergency detection)
│
├── src/                     # React Frontend Code
│   ├── app/                 # App components and logic
│   ├── styles/              # Tailwind and custom CSS
│   └── main.tsx             # React application entry point
│
├── index.html               # Vite HTML entry
├── package.json             # Frontend dependencies and scripts
└── vite.config.ts           # Vite configuration
```