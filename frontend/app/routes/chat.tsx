import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router";
import { API_URL } from "../config";
import { Send, User, Search, MessageSquare, ChevronLeft } from "lucide-react";

interface ChatUser {
  id: number;
  name: string;
  student_id: string;
  is_staff: boolean;
  profile_picture: string | null;
}

interface Message {
  id: number;
  sender: number;
  sender_name: string;
  sender_student_id: string;
  receiver: number | null;
  receiver_name: string | null;
  receiver_student_id: string | null;
  content: string;
  timestamp: string;
  is_read: boolean;
}

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserStudentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
  const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('name') : null;

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/users/?search=${searchTerm}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/messages/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        let allMessages: Message[] = await response.json();

        // Filter based on selected user or general
        const filtered = allMessages.filter(msg => {
          if (!selectedUser) {
            // General chat (receiver is null)
            return msg.receiver === null;
          } else {
            // Private chat with selected user
            return (msg.sender === selectedUser.id || msg.receiver === selectedUser.id) &&
              (msg.sender !== null && msg.receiver !== null);
          }
        });

        setMessages(filtered);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [selectedUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Auto-select user from URL param (e.g. navigating from leaderboards)
  useEffect(() => {
    if (userIdParam && users.length > 0) {
      const found = users.find((u) => u.id.toString() === userIdParam);
      if (found) setSelectedUser(found);
    }
  }, [userIdParam, users]);

  useEffect(() => {
    setIsInitialLoad(true);
    fetchMessages();

    // Set up polling interval that recognizes the current selectedUser
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedUser, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const scrollToBottom = (force = false, smooth = false) => {
    if (!messagesEndRef.current) return;

    const container = messagesEndRef.current.parentElement;
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      if (force || isAtBottom || isInitialLoad) {
        messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
        if (isInitialLoad) setIsInitialLoad(false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/chat/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newMessage,
          receiver: selectedUser?.id || null,
        }),
      });

      if (response.ok) {
        setNewMessage("");
        fetchMessages();
        setTimeout(() => scrollToBottom(true, true), 100); // Force smooth scroll
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-66px)] md:h-[calc(100vh-66px)] bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b-2 border-green-900 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          {selectedUser ? (
            <button
              onClick={() => {
                setSelectedUser(null);
                setSearchParams({}, { replace: true });
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors md:hidden"
            >
              <ChevronLeft size={24} className="text-green-900" />
            </button>
          ) : (
            <MessageSquare size={24} className="text-green-900" />
          )}
          <div>
            <h1 className="text-lg font-bold text-green-900 leading-tight">
              {selectedUser ? selectedUser.name : "Interns Community Chat"}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              {selectedUser ? (selectedUser.is_staff ? "Administrator" : "Intern") : "Group chat for all members"}
            </p>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            Live updates active
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* User Sidebar */}
        <div className={`
          ${selectedUser && showUserList ? 'hidden md:flex' : 'flex'}
          flex-col w-full md:w-80 bg-white border-r border-gray-200 shrink-0
        `}>
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search interns or admins..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && fetchUsers()}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* General Chat Option */}
            <button
              onClick={() => {
                setSelectedUser(null);
                setSearchParams({}, { replace: true });
              }}
              className={`w-full p-4 flex items-center gap-3 transition-colors hover:bg-green-50 border-l-4 ${!selectedUser ? 'bg-green-50 border-green-600' : 'border-transparent'}`}
            >
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white">
                <MessageSquare size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800 text-sm">Community Chat</p>
                <p className="text-xs text-gray-500">Public group message</p>
              </div>
            </button>

            <div className="px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-y border-gray-100">
              Direct Messages
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading users...</div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchParams({ userId: user.id.toString() });
                  }}
                  className={`w-full p-4 flex items-center gap-3 transition-colors hover:bg-gray-50 border-l-4 ${selectedUser?.id === user.id ? 'bg-green-50/50 border-green-600' : 'border-transparent'}`}
                >
                  <div className="relative">
                    {user.profile_picture ? (
                      <img src={user.profile_picture} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 border-2 border-white shadow-sm">
                        <User size={24} />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="font-bold text-gray-800 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.is_staff ? "Administrator" : user.student_id}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">No users found</div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`
          flex-1 flex flex-col bg-white
          ${!selectedUser ? 'hidden md:flex' : 'flex'} 
        `}>
          {/* Scrollable Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.length > 0 ? (
              messages.map((msg, index) => {
                const isMe = msg.sender_student_id === currentUserStudentId;
                const showSenderHeader = !isMe && !selectedUser;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {showSenderHeader && (
                      <span
                        onClick={() => {
                          const found = users.find(u => u.student_id === msg.sender_student_id);
                          if (found) {
                            setSelectedUser(found);
                            setSearchParams({ userId: found.id.toString() });
                          }
                        }}
                        className="text-[10px] font-black text-green-900 uppercase tracking-widest mb-1 cursor-pointer hover:underline"
                      >
                        {msg.sender_name}
                      </span>
                    )}
                    <div className={`max-w-[85%] md:max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe
                      ? 'bg-green-900 text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <div className="bg-gray-100 p-6 rounded-full mb-4">
                  <MessageSquare size={48} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 py-2.5 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full py-2.5 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-green-900 text-white p-3 rounded-full hover:bg-green-800 shadow-md transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
