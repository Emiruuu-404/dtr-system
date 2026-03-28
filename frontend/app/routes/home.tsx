import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { API_URL } from "../config";
import { LayoutDashboard, Clock, UserCheck, MessageSquare, ChevronRight, Users } from "lucide-react";

export default function Home() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
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
            navigate("/login");
        });
    }, []);

    if (loading) {
        return (
            <div className="p-6 max-w-md mx-auto space-y-6 pt-10">
                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-gray-200 animate-pulse rounded-xl border-2 border-gray-100"></div>
                    <div className="h-24 bg-gray-200 animate-pulse rounded-xl border-2 border-gray-100"></div>
                </div>
                <div className="h-40 bg-gray-200 animate-pulse rounded-xl border-2 border-gray-100"></div>
            </div>
        );
    }

    const remainingHours = Math.max(0, 486 - data.total_hours);

    return (
        <div className="p-6 max-w-md mx-auto pb-24 space-y-8">
            <header className="mt-4">
                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Intern Dashboard</p>
                <h1 className="text-3xl font-black text-green-900 uppercase leading-none">
                    Welcome back,<br/> {data.name.split(' ')[0]}!
                </h1>
            </header>

            {/* STATUS CARD */}
            <div className="bg-green-900 p-5 border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,0.3)] relative overflow-hidden group">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-green-200 font-bold uppercase tracking-widest text-[10px] mb-1">Current Status</p>
                        <h2 className="text-2xl font-black text-white uppercase">{data.status}</h2>
                    </div>
                    <div className="w-12 h-12 bg-white flex items-center justify-center border-2 border-green-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">
                        <UserCheck className="text-green-900" strokeWidth={3} />
                    </div>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 border-2 border-green-900 shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px] mb-1">Total Rendered</p>
                    <div className="text-xl font-black text-green-900">{data.formatted_hours}</div>
                </div>
                <div className="bg-white p-4 border-2 border-green-900 shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mb-1">Remaining</p>
                    <div className="text-xl font-black text-gray-400">{Math.floor(remainingHours)}h</div>
                </div>
            </div>

            {/* WHO'S IN / CHAT SECTION (INTERN TO INTERN) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-green-900 uppercase tracking-widest text-sm flex items-center gap-2">
                        <Users size={18} strokeWidth={3} /> Who&apos;s In Now?
                    </h3>
                    <span className="bg-green-100 text-green-900 px-2 py-0.5 text-[10px] font-black border-2 border-green-900">
                        {data.online_interns.length} Active
                    </span>
                </div>

                <div className="space-y-3">
                    {data.online_interns.length === 0 ? (
                        <div className="p-4 border-2 border-dashed border-gray-300 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                            No other interns currently in.
                        </div>
                    ) : (
                        data.online_interns.map((other: any) => (
                            <div key={other.id} className="bg-white p-3 border-2 border-green-900 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(20,83,45,1)] hover:-translate-y-1 transition-transform">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 border-2 border-green-900 shrink-0 overflow-hidden bg-green-50">
                                        {other.profile_picture ? (
                                            <img src={other.profile_picture} alt={other.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full font-black text-green-900 uppercase text-xs">
                                                {other.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 uppercase text-xs tracking-wide">{other.name}</h4>
                                        <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Timed In
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate(`/chat?userId=${other.id}`)}
                                    className="p-2 bg-green-100 text-green-900 border-2 border-green-900 hover:bg-green-900 hover:text-white transition-colors"
                                >
                                    <MessageSquare size={16} strokeWidth={3} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="pt-4 border-t-2 border-gray-100">
                 <button 
                    onClick={() => navigate('/timein')}
                    className="w-full bg-white border-4 border-green-900 p-4 font-black uppercase tracking-[0.2em] text-green-900 flex items-center justify-between group hover:bg-green-50 transition-colors shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]"
                >
                    Time In / Out Now
                    <ChevronRight className="group-hover:translate-x-2 transition-transform" strokeWidth={4} />
                </button>
            </div>
        </div>
    );
}
