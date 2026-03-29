import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { API_URL } from "../config";
import { LayoutDashboard, Clock, UserCheck, ChevronRight, MessageSquare } from "lucide-react";
import FastChat from "../components/FastChat";

export default function Home() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        fetch(`${API_URL}/api/dashboard-data/`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error("Unauthorized");
            return res.json();
        })
        .then(d => {
            setData(d);
            setLoading(false);
        })
        .catch(() => {
            localStorage.removeItem("token");
            localStorage.removeItem("session_token");
            localStorage.removeItem("admin_token");
            localStorage.removeItem("student_id");
            navigate("/login");
        });

        // Poll for unread count
        const fetchUnread = async () => {
            const token = localStorage.getItem("token") || localStorage.getItem("session_token");
            if (!token) return;
            try {
                const resp = await fetch(`${API_URL}/api/chat/unread/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const d = await resp.json();
                if (d.unread_count !== undefined) setUnreadCount(d.unread_count);
            } catch (err) {}
        };
        fetchUnread();
        const int = setInterval(fetchUnread, 10000); 

        return () => clearInterval(int);
    }, []);

    if (loading) {
        return (
            <div className="p-6 max-w-md mx-auto space-y-6 pt-10">
                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
            </div>
        );
    }

    const remainingHours = Math.max(0, 486 - data.total_hours);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="p-6 max-w-md mx-auto pb-32 space-y-8 relative">
                <header className="mt-4">
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Intern Dashboard</p>
                    <h1 className="text-3xl font-black text-green-900 uppercase leading-none">
                        Welcome back,<br/> {data.name.split(' ')[0]}!
                    </h1>
                </header>

                {/* Status and Stats Content - keeping same structure */}
                <div className="space-y-6">
                    <div className="bg-green-900 p-5 border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,0.3)] relative overflow-hidden group rounded-2xl">
                         <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="text-green-200 font-bold uppercase tracking-widest text-[10px] mb-1">Current Status</p>
                                <h2 className="text-2xl font-black text-white uppercase">{data.status}</h2>
                            </div>
                            <div className="w-12 h-12 bg-white flex items-center justify-center border-2 border-green-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">
                                <UserCheck className="text-green-900" strokeWidth={3} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 border-2 border-green-900 shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px] mb-1">Total Rendered</p>
                            <div className="text-xl font-black text-green-900">{data.formatted_hours}</div>
                        </div>
                        <div className="bg-white p-4 border-2 border-green-900 shadow-[4px_4px_0px_0px_rgba(20,83,45,1)] text-gray-400">
                             <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mb-1">Remaining</p>
                            <div className="text-xl font-black">{Math.floor(remainingHours)}h</div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={() => navigate('/timein')}
                            className="w-full bg-white border-4 border-green-900 p-4 font-black uppercase tracking-[0.2em] text-green-900 flex items-center justify-between group hover:bg-green-50 transition-colors shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]"
                        >
                            Time In / Out Now
                            <ChevronRight className="group-hover:translate-x-2 transition-transform" strokeWidth={4} />
                        </button>
                    </div>
                </div>
            </div>

            {/* FLOATING CHAT BUTTON - Outside restricted container */}
            <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-8 right-6 w-16 h-16 bg-white border-4 border-green-900 flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(20,83,45,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all z-[9999] rounded-full active:scale-95 overflow-visible"
            >
                <div className="relative pointer-events-none">
                    <MessageSquare size={32} className="text-green-900" strokeWidth={3} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-4 -right-4 bg-red-500 border-2 border-green-900 text-white text-[10px] w-7 h-7 rounded-full flex items-center justify-center font-black animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            {unreadCount}
                        </span>
                    )}
                </div>
            </button>

            <FastChat 
                peerId="admin" 
                peerName="Administrator" 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)} 
            />
        </div>
    );
}
