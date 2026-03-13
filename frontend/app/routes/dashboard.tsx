import { useState, useEffect } from "react";
import { Calendar, Clock as ClockIcon, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { API_URL } from "../config";

export default function Dashboard() {
    const [statusData, setStatusData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<{ show: boolean, type: string, message: string }>({ show: false, type: '', message: '' });

    const fetchStatus = () => {
        const student_id = localStorage.getItem("student_id");
        if (!student_id) return;

        fetch(`${API_URL}/api/status/?student_id=${student_id}`)
            .then(res => res.json())
            .then(data => {
                setStatusData(data);
            });
    };
    const formatTimeForInput = (timeStr: string) => {
        if (!timeStr || timeStr === "--:--") return "";
        const match = timeStr.match(/(\d{2}):(\d{2})\s*(AM|PM)/i);
        if (match) {
            let [_, hours, mins, period] = match;
            let h = parseInt(hours, 10);
            if (period.toUpperCase() === "PM" && h < 12) h += 12;
            if (period.toUpperCase() === "AM" && h === 12) h = 0;
            return `${h.toString().padStart(2, "0")}:${mins}`;
        }
        return timeStr;
    };
    const [fallbackName, setFallbackName] = useState("Intern");
    const [studentId, setStudentId] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const id = localStorage.getItem("student_id");
        if (!id) {
            navigate("/login");
            return;
        }
        setStudentId(id);
        const savedName = localStorage.getItem("name");
        if (savedName) setFallbackName(savedName);

        fetchStatus();
    }, []);

    // Use name from API if loaded, otherwise use fallbackName (which updates securely after hydration)
    const userName = statusData?.name || fallbackName;

    return (
        <div className="p-6 max-w-md mx-auto">
            <header className="mb-8 mt-4">
                <h1 className="text-3xl font-bold text-green-900 mb-1">
                    Hello, {userName}
                </h1>
                <p className="text-green-800">Here's your OJT summary today.</p>
            </header>

            <div className="grid gap-4">
                <div className="bg-white p-6 border-2 border-green-900 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-widest">Total OJT Hours</p>
                            <h2 className="text-4xl font-black text-green-700">{statusData?.total_hours ?? 0} <span className="text-xl font-bold text-gray-400">/ {statusData?.total_required ?? 486}</span></h2>
                        </div>
                        <div className="w-14 h-14 bg-green-100 flex items-center justify-center border-2 border-green-900 shrink-0">
                            <Calendar className="text-green-800" strokeWidth={2.5} size={28} />
                        </div>
                    </div>
                    {statusData?.est_end_date && (
                        <div className="bg-green-50 border-2 border-green-900 p-3 mt-1">
                            <p className="text-[10px] font-black text-green-800 uppercase tracking-widest mb-1">Estimated End Date</p>
                            <p className="text-green-900 font-bold text-sm tracking-wide">{statusData.est_end_date}</p>
                            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest mt-1 opacity-80">*Excludes weekends (Sat & Sun)</p>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 border-2 border-green-900">
                    <div className="flex items-center gap-3 mb-4">
                        <ClockIcon className="text-green-800" strokeWidth={2.5} size={22} />
                        <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wide">Today's Status</h3>
                    </div>
                    {statusData?.status?.includes("IN") && statusData.status !== "Not Timed In" ? (
                        <div className="flex items-center gap-2 text-green-700 bg-green-100 border-2 border-green-900 w-fit px-4 py-2 text-sm font-bold tracking-wide uppercase">
                            <CheckCircle size={18} strokeWidth={2.5} />
                            {statusData.status}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-rose-700 bg-rose-100 border-2 border-rose-900 w-fit px-4 py-2 text-sm font-bold tracking-wide uppercase">
                            <AlertCircle size={18} strokeWidth={2.5} />
                            {statusData?.status || "Not Timed In"}
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 border-2 border-green-900">
                    <p className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">Today's Punches</p>

                    {statusData?.today_logs?.length > 0 ? (
                        <div className="space-y-3">
                            {statusData.today_logs.map((log: any, index: number) => (
                                <div key={index} className="flex items-center justify-between border-b-2 border-gray-100 pb-2 last:border-0 last:pb-0">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{log.in_label || 'Time In'}</span>
                                        <span className="font-black text-green-800 text-lg">{log.in}</span>
                                    </div>
                                    <div className="w-8 h-[2px] bg-gray-200"></div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{log.out_label || 'Time Out'}</span>
                                        <span className="font-black text-rose-800 text-lg">{log.out}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <h2 className="text-lg font-bold text-gray-400 text-center py-2">No records today</h2>
                    )}
                </div>

                {statusData && (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (loading) return;
                        setLoading(true);
                        const formData = new FormData(e.currentTarget);
                        const am_in = formData.get("am_in") as string;
                        const am_out = formData.get("am_out") as string;
                        const pm_in = formData.get("pm_in") as string;
                        const pm_out = formData.get("pm_out") as string;
                        const student_id = localStorage.getItem("student_id");

                        fetch(`${API_URL}/api/save-today-record/`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ student_id, am_in, am_out, pm_in, pm_out })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.message) {
                                    setModal({ show: true, type: 'success', message: data.message });
                                    fetchStatus();
                                } else {
                                    setModal({ show: true, type: 'error', message: data.error });
                                }
                                setLoading(false);
                            })
                            .catch(() => {
                                setLoading(false);
                            });
                    }} className="bg-white p-6 border-2 border-green-900 mt-2">
                        <p className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                            Manual Time Entry
                        </p>
                        
                        {(() => {
                            const isFullyRecorded = statusData?.today_logs?.length === 2 && statusData.today_logs.every((l: any) => l.in && l.in !== "--:--" && l.out && l.out !== "--:--");
                            
                            return (
                                <>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div>
                                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Morning In</label>
                                            <input type="time" name="am_in" max="12:00" disabled={isFullyRecorded} defaultValue={formatTimeForInput(statusData.today_logs?.[0]?.in)} className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm disabled:opacity-50" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Morning Out</label>
                                            <input type="time" name="am_out" max="13:00" disabled={isFullyRecorded} defaultValue={formatTimeForInput(statusData.today_logs?.[0]?.out)} className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm disabled:opacity-50" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Afternoon In</label>
                                            <input type="time" name="pm_in" min="12:01" disabled={isFullyRecorded} defaultValue={formatTimeForInput(statusData.today_logs?.[1]?.in)} className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm disabled:opacity-50" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Afternoon Out</label>
                                            <input type="time" name="pm_out" min="12:01" disabled={isFullyRecorded} defaultValue={formatTimeForInput(statusData.today_logs?.[1]?.out)} className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm disabled:opacity-50" />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || isFullyRecorded}
                                        className="bg-green-700 w-full text-white p-4 border-2 border-green-900 hover:bg-green-800 transition-colors flex items-center justify-center font-black text-sm uppercase tracking-widest active:translate-x-1 active:translate-y-1 relative disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:hover:bg-green-700 disabled:cursor-not-allowed"
                                    >
                                        <span className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1 hidden"></span>
                                        {isFullyRecorded ? "ALL PUNCHES RECORDED" : "RECORD TIME"}
                                    </button>
                                </>
                            );
                        })()}
                    </form>
                )}
            </div>
            {modal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 w-full max-w-sm border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
                        <div className="flex flex-col items-center text-center">
                            {modal.type === 'error' ? (
                                <AlertCircle size={56} strokeWidth={2.5} className="text-rose-600 mb-4" />
                            ) : (
                                <CheckCircle size={56} strokeWidth={2.5} className="text-green-600 mb-4" />
                            )}
                            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-wide">
                                {modal.type === 'error' ? 'Error' : 'Success'}
                            </h3>
                            <p className="text-gray-700 font-bold mb-8 uppercase tracking-wide text-sm">
                                {modal.message}
                            </p>
                            <button
                                onClick={() => setModal({ show: false, type: '', message: '' })}
                                className="w-full bg-green-700 text-white p-4 border-2 border-green-900 hover:bg-green-800 transition-colors font-black uppercase tracking-widest text-lg"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}   