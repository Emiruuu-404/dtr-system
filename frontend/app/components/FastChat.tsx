import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Loader2 } from 'lucide-react';
import { API_URL } from '../config';

interface Message {
  id: number | string;
  sender: string;
  content: string;
  timestamp: string;
  is_own: boolean;
  is_pending?: boolean;
}

interface FastChatProps {
  peerId: string; // "admin" for intern, student_id for admin
  peerName: string;
  isOpen: boolean;
  onClose: () => void;
}

const FastChat: React.FC<FastChatProps> = ({ peerId, peerName, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Robust token retrieval with context sensitivity
  const getToken = () => {
    // Check which environment we're in to prioritize the right token
    const isAdminPath = typeof window !== 'undefined' && window.location.pathname.includes('/admin');
    
    if (isAdminPath) {
      // Admin dashboard should prioritize admin_token
      return localStorage.getItem("admin_token") || 
             localStorage.getItem("token") || 
             localStorage.getItem("session_token");
    } else {
      // Intern dashboard should prioritize session_token/token
      return localStorage.getItem("session_token") || 
             localStorage.getItem("token") || 
             localStorage.getItem("admin_token");
    }
  };

  const fetchMessages = async (silent = false) => {
    const token = getToken();
    if (!token) return;

    try {
      const resp = await fetch(`${API_URL}/api/chat/history/?peer_id=${peerId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!resp.ok) return;
      
      const contentType = resp.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await resp.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      if (!silent) console.error("Chat fetch error:", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || sending) return;

    const token = getToken();
    if (!token) return;

    // Optimistic Update
    const tempId = Date.now().toString();
    const optimisticMsg: Message = {
      id: tempId,
      sender: "me",
      content: content,
      timestamp: new Date().toISOString(),
      is_own: true,
      is_pending: true
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");
    setSending(true);

    try {
      const resp = await fetch(`${API_URL}/api/chat/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: peerId,
          message: content
        })
      });

      if (resp.ok) {
        // Refetch to get actual IDs and sync
        await fetchMessages(true);
      } else {
        // Handle error: remove optimistic message
        setMessages(prev => prev.filter(m => m.id !== tempId));
        alert("Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Send error:", err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMessages([]); // Clear previous messages when switching users
      fetchMessages();
      pollInterval.current = setInterval(() => fetchMessages(true), 4000); 
    } else {
      if (pollInterval.current) clearInterval(pollInterval.current);
      setMessages([]); // Clear when closed
    }
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [isOpen, peerId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col h-[550px] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl shadow-inner border border-white/10">
              {peerName.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight">{peerName}</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <p className="text-[10px] text-indigo-100 uppercase tracking-[0.15em] font-black">Online Now</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        {/* Messages Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-800/40 custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 grayscale">
              <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                 <MessageSquare size={32} />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.is_own ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[85%] px-5 py-3 rounded-[1.5rem] shadow-sm text-sm font-medium ${
                  msg.is_own 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200 dark:shadow-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                } ${msg.is_pending ? 'opacity-70 italic' : ''}`}>
                  {msg.content}
                </div>
                <div className={`text-[9px] mt-1.5 font-bold uppercase tracking-widest opacity-40 px-2`}>
                   {msg.is_pending ? 'Sending...' : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={sendMessage} className="relative group">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="w-full pl-6 pr-14 py-4 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl text-sm font-medium transition-all dark:text-white outline-none placeholder:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/50"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-90 shadow-md group-hover:shadow-indigo-200 dark:shadow-none"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
          <p className="text-[9px] text-center mt-3 text-slate-400 font-bold uppercase tracking-[0.2em]">Press Enter to Send</p>
        </div>
      </div>
    </div>
  );
};

export default FastChat;
