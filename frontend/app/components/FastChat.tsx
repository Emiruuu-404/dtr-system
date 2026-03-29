import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { API_URL } from '../config';

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  is_own: boolean;
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
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);


  const fetchMessages = async () => {
    const token = localStorage.getItem("session_token") || localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const resp = await fetch(`${API_URL}/api/chat/history/?peer_id=${peerId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Chat fetch error:", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    const token = localStorage.getItem("session_token") || localStorage.getItem("admin_token");
    setLoading(true);

    try {
      const resp = await fetch(`${API_URL}/api/chat/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: peerId,
          message: newMessage.trim()
        })
      });

      if (resp.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      pollInterval.current = setInterval(fetchMessages, 3000); // 3s polling when open
    } else {
      if (pollInterval.current) clearInterval(pollInterval.current);
    }
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [isOpen, peerId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col h-[500px] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              {peerName.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold">{peerName}</h3>
              <p className="text-xs text-indigo-100 italic">Direct Message</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-800/50"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <MessageSquare size={48} className="mb-2" />
              <p>No messages yet. Say hi!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${
                  msg.is_own 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                }`}>
                  {msg.content}
                   <div className={`text-[10px] mt-1 opacity-70 ${msg.is_own ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FastChat;
