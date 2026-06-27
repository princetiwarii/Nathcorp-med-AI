import { useState, useRef, useEffect } from 'react';
import { Send, Upload, AlertTriangle, Bot, User, FileText, X } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isEmergency?: boolean;
  isPdfRelated?: boolean;
}

interface UploadedFile {
  name: string;
  size: number;
  sessionId: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your AI Medical Information Assistant. I can help answer general health questions about common diseases, symptoms, medicines, and precautions. You can also upload medical PDFs like prescriptions or lab reports for information extraction.\n\nPlease note: This chatbot is for educational purposes only and does not provide medical diagnosis, prescriptions, or treatment advice. Always consult a licensed healthcare professional for medical decisions.',
      timestamp: new Date(),
    }
  ]);
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  
  const [inputValue, setInputValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      let endpoint = `${API_BASE_URL}/chat`;
      let payload = {};

      if (uploadedFile?.sessionId) {
        endpoint = `${API_BASE_URL}/ask-pdf`;
        payload = {
          session_id: uploadedFile.sessionId,
          question: userMessage.content
        };
      } else {
        payload = { message: userMessage.content };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.reply + (data.disclaimer ? `\n\n⚠️ Disclaimer: ${data.disclaimer}` : ''),
        timestamp: new Date(),
        isEmergency: data.is_emergency,
        isPdfRelated: !!uploadedFile?.sessionId,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error communicating with the server. Is the backend running on port 8000?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const uploadMessageId = Date.now().toString();
      const uploadMessage: Message = {
        id: uploadMessageId,
        type: 'bot',
        content: `Uploading "${file.name}" to the server...`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, uploadMessage]);
      setIsTyping(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE_URL}/upload-pdf`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        
        setUploadedFile({
          name: file.name,
          size: file.size,
          sessionId: data.session_id
        });

        setMessages(prev => prev.map(msg => 
          msg.id === uploadMessageId 
            ? { ...msg, content: `PDF uploaded successfully! You can now ask questions about "${file.name}".\n\nTry asking:\n- What medicines are mentioned?\n- Summarize this report` }
            : msg
        ));
      } catch (error) {
        setMessages(prev => prev.map(msg => 
          msg.id === uploadMessageId 
            ? { ...msg, content: `Error uploading "${file.name}". Make sure the backend server is running on port 8000.` }
            : msg
        ));
      } finally {
        setIsTyping(false);
      }
    } else {
      alert('Please upload a PDF file');
    }
  };

  const removeUploadedFile = async () => {
    if (uploadedFile?.sessionId) {
      try {
        await fetch(`${API_BASE_URL}/delete-pdf/${uploadedFile.sessionId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error("Failed to delete PDF from server", error);
      }
    }

    setUploadedFile(null);
    const removeMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: 'PDF file removed from the system. You can upload a new document or ask general health questions.',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, removeMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">AI Medical Information Chatbot</h1>
              <p className="text-xs text-gray-500">Educational & Demonstration Purposes Only</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-800">Not a substitute for professional medical advice</span>
          </div>
        </div>
      </header>

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'bot' && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.isEmergency
                    ? 'bg-red-50 border-2 border-red-300 text-gray-900'
                    : message.isPdfRelated
                    ? 'bg-purple-50 border border-purple-200 text-gray-900'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                {message.isEmergency && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-600">Emergency Alert</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>

                <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto p-4">
          {/* Uploaded File Display */}
          {uploadedFile && (
            <div className="mb-3 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-700 flex-1">{uploadedFile.name}</span>
              <span className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
              <button
                onClick={removeUploadedFile}
                className="text-gray-400 hover:text-red-600 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Field */}
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-3 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-colors"
              aria-label="Upload PDF"
              title="Upload medical PDF (prescription, lab report)"
            >
              <Upload className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a health-related question..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="flex-shrink-0 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Try asking:</span>
            {['What is diabetes?', 'Symptoms of dengue?', 'How to prevent malaria?'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputValue(suggestion)}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
