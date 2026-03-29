import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { API_URL } from "../config";
import { LayoutDashboard, Clock, UserCheck, ChevronRight } from "lucide-react";

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
