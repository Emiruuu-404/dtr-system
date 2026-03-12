import { CalendarDays, Clock, Loader2, Trash2, ChevronDown, Info, Edit2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { API_URL } from "../config";
export default function History() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingPastRecord, setIsAddingPastRecord] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    
    // Custom Confirmation Modals
    const [confirmAction, setConfirmAction] = useState<{type: 'SAVE' | 'UPDATE', payload: any} | null>(null);

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

    const getMonthYear = (dateStr: string) => {
        if (!dateStr || dateStr === "Unknown") return "UNKNOWN";
        const match = dateStr.match(/([a-zA-Z]+)\s+\d+,\s+(\d{4})/);
        if (match) {
            return `${match[1].toUpperCase()} ${match[2]}`;
        }
        return dateStr.toUpperCase();
    };

    const months = useMemo(() => {
        const unique = Array.from(new Set(records.map(r => getMonthYear(r.date))));
        // Sort descending
        return unique.sort((a, b) => {
            if (a === "UNKNOWN") return 1;
            if (b === "UNKNOWN") return -1;
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateB.getTime() - dateA.getTime();
        });
    }, [records]);

    useEffect(() => {
        if (months.length > 0 && (!selectedMonth || !months.includes(selectedMonth))) {
            const now = new Date();
            const currentMonthYear = `${now.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${now.getFullYear()}`;
            if (months.includes(currentMonthYear)) {
                setSelectedMonth(currentMonthYear);
            } else {
                setSelectedMonth(months[0]);
            }
        }
    }, [months, selectedMonth]);

    const filteredRecords = records.filter(r => getMonthYear(r.date) === selectedMonth);

    const groupedByWeek = useMemo(() => {
        const groups: { [week: string]: any[] } = {};
        filteredRecords.forEach(r => {
            const d = new Date(r.date);
            if (isNaN(d.getTime())) {
                const key = "Unknown";
                if (!groups[key]) groups[key] = [];
                groups[key].push(r);
            } else {
                const weekNum = Math.ceil(d.getDate() / 7);
                const key = `Week ${weekNum}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(r);
            }
        });
        return groups;
    }, [filteredRecords]);

    const handleDelete = (record_id: number) => {
        if (!confirm("Are you sure you want to delete this record?")) return;

        setDeletingId(record_id);
        const student_id = localStorage.getItem("student_id");

        fetch(`${API_URL}/api/delete-record/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id, record_id })
        })
            .then(res => res.json())
            .then(data => {
                setDeletingId(null);
                if (data.message) {
                    fetchRecords();
                } else {
                    alert(data.error);
                }
            })
            .catch(() => setDeletingId(null));
    };

    const fetchRecords = () => {
        const student_id = localStorage.getItem("student_id");
        if (!student_id) {
            setLoading(false);
            return;
        }

        fetch(`${API_URL}/api/history/?student_id=${student_id}`)
            .then(res => res.json())
            .then(data => {
                if (data.records) {
                    setRecords(data.records);
                }
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    return (
        <div className="p-6 max-w-md mx-auto">
            <header className="mb-8 mt-4 border-b-2 border-green-900 pb-4 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-green-900 mb-2 uppercase tracking-tight">History</h1>
                    <p className="text-green-800 font-bold uppercase tracking-widest text-xs">Your recent attendance</p>
                </div>
                <button
                    onClick={() => setIsAddingPastRecord(true)}
                    className="bg-green-100 text-green-900 border-2 border-green-900 px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-green-200 active:translate-y-1 transition-transform"
                >
                    + ADD PAST
                </button>
            </header>

            <div className="space-y-4">
                {months.length > 0 && !loading && (
                    <div className="mb-6">
                        <div className="relative">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full appearance-none p-4 font-black text-green-900 bg-white border-[3px] border-green-900 focus:outline-none focus:bg-green-50 tracking-widest text-lg shadow-[6px_6px_0px_0px_rgba(20,83,45,1)] transition-colors cursor-pointer"
                            >
                                {months.map(m => (
                                    <option key={m} value={m} className="font-bold text-gray-900 bg-white text-base">
                                        {m}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-green-900 pointer-events-none bg-white/50 backdrop-blur-sm px-1 py-1 rounded" size={32} strokeWidth={3} />
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-green-900" size={32} />
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="bg-white border-2 border-green-900 p-8 text-center">
                        <p className="font-bold text-gray-500 uppercase tracking-widest">{records.length === 0 ? "No attendance records found." : `No records for ${selectedMonth}.`}</p>
                    </div>
                ) : (
                    Object.keys(groupedByWeek)
                        .sort((a, b) => b.localeCompare(a)) // Sort weeks descending (e.g., Week 4 -> Week 1)
                        .map((weekKey) => (
                            <div key={weekKey} className="mb-6">
                                <h2 className="bg-green-900 text-white font-black text-sm uppercase tracking-widest px-4 py-2 border-2 border-green-900 mb-3 w-max select-none shadow-[2px_2px_0px_0px_rgba(34,197,94,1)]">
                                    {weekKey}
                                </h2>
                                <div className="space-y-4">
                                    {groupedByWeek[weekKey].map((r: any, i: number) => (
                                        <div key={r.id || i} className="bg-white border-2 border-green-900 p-0 relative transition-all">

                                            <div
                                                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                                className="flex justify-between items-stretch border-b-2 border-green-900 bg-green-100 cursor-pointer hover:bg-green-200 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 font-black text-green-900 text-sm px-4 py-3 uppercase tracking-wide">
                                                    <CalendarDays size={18} strokeWidth={2.5} />
                                                    {r.date}
                                                    <Info className={`ml-2 transition-transform duration-300 ${expandedId === r.id ? "rotate-180 text-green-900" : "text-green-900/40"}`} size={16} strokeWidth={3} />
                                                </div>
                                                <div className={`flex items-center px-4 border-l-2 border-green-900 ${r.status === 'Completed' ? 'bg-green-300' : 'bg-green-200'}`} onClick={(e) => e.stopPropagation()}>
                                                    <span className={`text-xs font-black tracking-widest uppercase text-green-900`}>
                                                        {r.status}
                                                    </span>
                                                    <button
                                                        onClick={() => setEditingRecord(r)}
                                                        className="ml-3 hover:scale-110 active:scale-95 transition-transform"
                                                        title="Edit Record"
                                                    >
                                                        <Edit2 size={16} strokeWidth={2.5} className="text-blue-900" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(r.id)}
                                                        disabled={deletingId === r.id}
                                                        className="ml-3 hover:scale-110 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                                                        title="Delete Record"
                                                    >
                                                        {deletingId === r.id ?
                                                            <Loader2 size={16} className="animate-spin text-green-900" /> :
                                                            <Trash2 size={16} strokeWidth={2.5} className={r.status === 'Completed' ? 'text-emerald-900' : 'text-yellow-900'} />
                                                        }
                                                    </button>
                                                </div>
                                            </div>

                                            {expandedId === r.id && (
                                                <div className="bg-gray-50 border-b-2 border-green-900 p-4 space-y-3">
                                                    <div className="flex items-center justify-between border-b-2 border-green-900 pb-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase font-bold text-gray-500">AM IN</span>
                                                            <span className="font-black text-green-800 text-lg">{r.am_in || '--:--'}</span>
                                                        </div>
                                                        <div className="w-8 h-[2px] bg-green-900"></div>
                                                        <div className="flex flex-col text-right">
                                                            <span className="text-[10px] uppercase font-bold text-gray-500">AM OUT</span>
                                                            <span className="font-black text-rose-800 text-lg">{r.am_out || '--:--'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pb-1">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase font-bold text-gray-500">PM IN</span>
                                                            <span className="font-black text-green-800 text-lg">{r.pm_in || '--:--'}</span>
                                                        </div>
                                                        <div className="w-8 h-[2px] bg-green-900"></div>
                                                        <div className="flex flex-col text-right">
                                                            <span className="text-[10px] uppercase font-bold text-gray-500">PM OUT</span>
                                                            <span className="font-black text-rose-800 text-lg">{r.pm_out || '--:--'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-stretch justify-between text-sm bg-white p-0">
                                                <div className="flex flex-col p-4 flex-1">
                                                    <p className="text-[10px] font-black text-gray-500 mb-1 tracking-widest uppercase flex items-center gap-1">
                                                        <Clock size={12} strokeWidth={3} className="text-green-600" /> TIME IN
                                                    </p>
                                                    <p className="font-black text-gray-900 text-xl">{r.in}</p>
                                                </div>
                                                <div className="w-[2px] bg-green-900"></div>
                                                <div className="flex flex-col p-4 flex-1 items-end text-right">
                                                    <p className="text-[10px] font-black text-gray-500 mb-1 tracking-widest uppercase flex items-center justify-end gap-1">
                                                        TIME OUT <Clock size={12} strokeWidth={3} className="text-rose-600" />
                                                    </p>
                                                    <p className="font-black text-gray-900 text-xl">{r.out}</p>
                                                </div>
                                            </div>

                                            {r.hours !== undefined && r.hours > 0 && (
                                                <div className="bg-green-50 px-4 py-3 border-t-2 border-green-900 flex justify-between items-center">
                                                    <span className="text-xs font-black uppercase tracking-widest text-green-900">Total Hours</span>
                                                    <span className="font-black text-lg text-green-800 uppercase">{r.formatted_hours || `${r.hours} HRS`}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                )}
            </div>

            {isAddingPastRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 w-full max-w-sm border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
                        <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-wide border-b-2 border-green-900 pb-2">Add Past Record</h3>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const payload = Object.fromEntries(formData.entries());
                            payload.student_id = localStorage.getItem("student_id") || "";
                            setConfirmAction({type: 'SAVE', payload});
                        }} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        name="date"
                                        required
                                        onClick={(e) => { try { e.currentTarget.showPicker(); } catch { } }}
                                        className="w-full p-3 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 cursor-pointer appearance-none"
                                    />
                                    <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 text-green-900 pointer-events-none" size={20} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Morning In</label>
                                    <input type="time" name="am_in" max="12:00" defaultValue="08:00" className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Morning Out</label>
                                    <input type="time" name="am_out" max="13:00" defaultValue="12:00" className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Afternoon In</label>
                                    <input type="time" name="pm_in" min="12:01" defaultValue="13:00" className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Afternoon Out</label>
                                    <input type="time" name="pm_out" min="12:01" defaultValue="17:00" className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddingPastRecord(false)} className="bg-rose-100 text-rose-700 p-3 border-2 border-rose-900 hover:bg-rose-200 font-black uppercase">Cancel</button>
                                <button type="submit" className="bg-green-700 text-white p-3 border-2 border-green-900 hover:bg-green-800 font-black uppercase">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {editingRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 w-full max-w-sm border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
                        <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-wide border-b-2 border-green-900 pb-2">Edit Record</h3>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const payload = Object.fromEntries(formData.entries());
                            payload.student_id = localStorage.getItem("student_id") || "";
                            setConfirmAction({type: 'UPDATE', payload});
                        }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Morning In</label>
                                    <input type="time" name="am_in" max="12:00" defaultValue={formatTimeForInput(editingRecord.am_in)} className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Morning Out</label>
                                    <input type="time" name="am_out" max="13:00" defaultValue={formatTimeForInput(editingRecord.am_out)} className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Afternoon In</label>
                                    <input type="time" name="pm_in" min="12:01" defaultValue={formatTimeForInput(editingRecord.pm_in)} className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Afternoon Out</label>
                                    <input type="time" name="pm_out" min="12:01" defaultValue={formatTimeForInput(editingRecord.pm_out)} className="w-full p-2 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button type="button" onClick={() => setEditingRecord(null)} className="bg-rose-100 text-rose-700 p-3 border-2 border-rose-900 hover:bg-rose-200 font-black uppercase">Cancel</button>
                                <button type="submit" className="bg-green-700 text-white p-3 border-2 border-green-900 hover:bg-green-800 font-black uppercase">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Global Custom Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white p-6 w-full max-w-sm border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="bg-yellow-100 p-3 rounded-full border-2 border-yellow-500">
                                <Info size={32} strokeWidth={2.5} className="text-yellow-600" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Confirmation</h3>
                            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-2">
                                {confirmAction.type === 'SAVE' ? "Are you sure you want to save this record?" : "Are you sure you want to update this record?"}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3 pt-4 w-full">
                                <button 
                                    type="button" 
                                    onClick={() => setConfirmAction(null)} 
                                    className="bg-gray-100 text-gray-700 p-3 border-2 border-gray-900 hover:bg-gray-200 font-black uppercase text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const type = confirmAction.type;
                                        const payload = confirmAction.payload;
                                        setConfirmAction(null);

                                        if (type === 'SAVE') {
                                            fetch(`${API_URL}/api/add-past-record/`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify(payload)
                                            })
                                            .then(res => res.json())
                                            .then(data => {
                                                setIsAddingPastRecord(false);
                                                if (data.message) fetchRecords();
                                                else alert(data.error);
                                            });
                                        } else {
                                            payload.record_id = editingRecord.id;
                                            fetch(`${API_URL}/api/edit-record/`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify(payload)
                                            })
                                            .then(res => res.json())
                                            .then(data => {
                                                setEditingRecord(null);
                                                if (data.message) fetchRecords();
                                                else alert(data.error);
                                            });
                                        }
                                    }} 
                                    className="bg-green-700 text-white p-3 border-2 border-green-900 hover:bg-green-800 font-black uppercase text-sm"
                                >
                                    Yes, {confirmAction.type === 'SAVE' ? 'Save' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}