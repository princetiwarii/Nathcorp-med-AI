import { useState, useRef, useEffect } from 'react';
import { Send, Upload, AlertTriangle, Bot, User, FileText, X, Mic, MicOff, Volume2, VolumeX, Menu, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const DEFAULT_MESSAGE: Message = {
  id: '1',
  type: 'bot',
  content: 'Hello! I\'m Med-AI, your advanced medical information assistant. I can help answer general health questions about common diseases, symptoms, medicines, and precautions. You can also upload medical PDFs like prescriptions or lab reports for information extraction.\n\nPlease note: This chatbot is for educational purposes only and does not provide medical diagnosis, prescriptions, or treatment advice. Always consult a licensed healthcare professional for medical decisions.',
  timestamp: new Date(),
};

export default function App() {
  const { theme, setTheme } = useTheme();
  
  // Sidebar & Sessions State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('med_chat_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.forEach((session: ChatSession) => {
          session.messages.forEach(msg => {
            msg.timestamp = new Date(msg.timestamp);
          });
        });
        setChatSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        } else {
          createNewChat();
        }
      } catch (e) {
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  // Save to local storage whenever sessions change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('med_chat_sessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  const currentSession = chatSessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [DEFAULT_MESSAGE];

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Consultation',
      messages: [DEFAULT_MESSAGE],
      updatedAt: Date.now(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (updated.length === 0) {
        setTimeout(createNewChat, 0); 
      } else if (id === currentSessionId) {
        setCurrentSessionId(updated[0].id);
      }
      return updated;
    });
  };

  const updateCurrentSessionMessages = (newMessages: Message[]) => {
    setChatSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        let newTitle = session.title;
        if (session.messages.length === 1 && newMessages.length > 1) {
          const firstUserMsg = newMessages.find(m => m.type === 'user');
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        return { ...session, messages: newMessages, title: newTitle, updatedAt: Date.now() };
      }
      return session;
    }).sort((a, b) => b.updatedAt - a.updatedAt));
  };
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  
  const [inputValue, setInputValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Voice Assistant Functions ---
  const speakText = (text: string) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support the Web Speech API. Please try Google Chrome or Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };
  // ---------------------------------

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    updateCurrentSessionMessages([...messages, userMessage]);
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

      updateCurrentSessionMessages([...messages, userMessage, botMessage]);
      
      if (isVoiceEnabled) {
        speakText(data.reply);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error communicating with the server. Is the backend running on port 8000?',
        timestamp: new Date(),
      };
      updateCurrentSessionMessages([...messages, userMessage, errorMessage]);
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
      updateCurrentSessionMessages([...messages, uploadMessage]);
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

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `PDF uploaded successfully! You can now ask questions about "${file.name}".\n\nTry asking:\n- What medicines are mentioned?\n- Summarize this report`,
          timestamp: new Date()
        };
        updateCurrentSessionMessages([...messages, successMessage]);
      } catch (error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `Error uploading "${file.name}". Make sure the backend server is running on port 8000.`,
          timestamp: new Date()
        };
        updateCurrentSessionMessages([...messages, errorMessage]);
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
    updateCurrentSessionMessages([...messages, removeMessage]);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`absolute md:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden'}`}>
        <div className="p-4 flex items-center gap-2">
          <button 
            onClick={createNewChat}
            className="flex-1 flex items-center gap-2 justify-center py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all duration-300 shadow-sm shadow-teal-600/20 hover:shadow-teal-600/40 font-medium hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" />
            New Consultation
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="hidden md:flex p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 pb-4 whitespace-nowrap w-72 custom-scrollbar">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">Recent Consultations</h2>
          <div className="space-y-1">
            {chatSessions.map(session => (
              <div 
                key={session.id}
                onClick={() => {
                  setCurrentSessionId(session.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${currentSessionId === session.id ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.id ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="text-sm truncate font-medium">{session.title}</span>
                </div>
                <button 
                  onClick={(e) => deleteChat(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition-all"
                  title="Delete chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex-shrink-0 z-10 transition-colors duration-300">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Open sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5 hidden md:block" />
                  <Menu className="w-5 h-5 md:hidden" />
                </button>
              )}
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-2 rounded-xl hidden sm:block shadow-sm shadow-teal-500/20">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="truncate">
                <h1 className="font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2">
                  Med-AI
                  <span className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider hidden sm:inline-block">Assistant</span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/50 hidden lg:flex">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs text-rose-800 dark:text-rose-300 font-medium">Not a substitute for medical advice</span>
              </div>
              
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Dark Mode"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button 
                onClick={() => {
                  setIsVoiceEnabled(!isVoiceEnabled);
                  if (isVoiceEnabled) window.speechSynthesis.cancel();
                }}
                className={`p-2 rounded-xl transition-colors ${isVoiceEnabled ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                title={isVoiceEnabled ? "Mute Voice Assistant" : "Enable Voice Assistant"}
              >
                {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Chat Messages Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {message.type === 'bot' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mt-1 shadow-sm shadow-teal-500/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    message.type === 'user'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 rounded-tr-sm'
                      : message.isEmergency
                      ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-slate-900 dark:text-slate-100 rounded-tl-sm'
                      : message.isPdfRelated
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-slate-900 dark:text-slate-100 rounded-tl-sm'
                      : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm rounded-tl-sm'
                  }`}
                >
                  {message.isEmergency && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-rose-200 dark:border-rose-900/50">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                      <span className="font-semibold text-rose-700 dark:text-rose-400">Emergency Alert</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {message.content}
                  </div>

                  <div className={`text-[11px] mt-3 font-medium ${message.type === 'user' ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center mt-1">
                    <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mt-1 shadow-sm shadow-teal-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center h-[52px]">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        </main>

        {/* Input Area */}
        <footer className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex-shrink-0 z-10 relative transition-colors duration-300">
          <div className="max-w-3xl mx-auto p-4">
            {/* Uploaded File Display */}
            {uploadedFile && (
              <div className="mb-3 flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl px-4 py-2.5 animate-in fade-in slide-in-from-bottom-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate font-medium">{uploadedFile.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                <button
                  onClick={removeUploadedFile}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Field */}
            <div className="flex gap-2 items-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 p-3.5 mb-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors shadow-sm"
                aria-label="Upload PDF"
                title="Upload medical PDF (prescription, lab report)"
              >
                <Upload className="w-5 h-5" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask Med-AI a health-related question..."
                  className="w-full px-5 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 dark:focus:ring-teal-500/30 focus:border-teal-500 transition-all resize-none overflow-hidden min-h-[52px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm"
                  style={{ height: '52px' }}
                  rows={1}
                />
              </div>

              <button
                onClick={toggleListening}
                className="flex-shrink-0 p-3.5 mb-0.5 rounded-xl transition-all shadow-sm bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 text-teal-600 dark:text-teal-400 group"
                aria-label="Start Voice Input"
                title="Speak your question"
              >
                <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() && !isTyping}
                className="flex-shrink-0 px-6 py-3.5 mb-0.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline font-medium tracking-wide">Send</span>
              </button>
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 1 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {['What is diabetes?', 'Symptoms of dengue?', 'How to prevent malaria?'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="text-xs px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:border-teal-400 hover:text-teal-600 dark:hover:border-teal-600 dark:hover:text-teal-400 transition-colors shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </footer>
      </div>
      {/* Active Voice Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
          <div className="relative flex items-center justify-center">
            {/* Ripples */}
            <div className="absolute w-32 h-32 bg-teal-500/20 dark:bg-teal-400/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute w-48 h-48 bg-teal-500/10 dark:bg-teal-400/10 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
            <div className="absolute w-64 h-64 bg-teal-500/5 dark:bg-teal-400/5 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }}></div>
            
            {/* Center Mic */}
            <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center shadow-2xl shadow-teal-500/40">
              <Mic className="w-12 h-12 text-white animate-pulse" />
            </div>
          </div>
          
          <h2 className="mt-16 text-3xl font-bold text-slate-800 dark:text-white tracking-tight">I'm listening...</h2>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">Speak your medical question clearly</p>
          
          <button 
            onClick={toggleListening}
            className="mt-16 px-8 py-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors shadow-sm flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
