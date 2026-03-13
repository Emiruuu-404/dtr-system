import { useState, useEffect } from "react";
import { Camera, UserCheck, Image as ImageIcon, CalendarDays, Clock, Pencil, Trash2, Save, X } from "lucide-react";
import { API_URL } from "../config";

export default function TimeIn() {
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
    const [history, setHistory] = useState<any[]>([]);
    const [fetchingHistory, setFetchingHistory] = useState(false);
    const [editingReportId, setEditingReportId] = useState<number | null>(null);
    const [editingNotes, setEditingNotes] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    const student_id = typeof window !== 'undefined' ? localStorage.getItem("student_id") : null;

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchHistory = () => {
        if (!student_id) return;
        setFetchingHistory(true);
        fetch(`${API_URL}/api/reports/?student_id=${student_id}`)
            .then(res => res.json())
            .then(data => {
                if (data.reports) {
                    setHistory(data.reports);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setFetchingHistory(false));
    };

    const startEdit = (report: any) => {
        setEditingReportId(report.id);
        setEditingNotes(report.notes || "");
    };

    const cancelEdit = () => {
        setEditingReportId(null);
        setEditingNotes("");
    };

    const saveEdit = async (reportId: number) => {
        if (!student_id) {
            setStatus("User not identified. Please log in again.");
            return;
        }

        const trimmedNotes = editingNotes.trim();
        if (!trimmedNotes) {
            setStatus("Notes cannot be empty.");
            return;
        }

        setActionLoadingId(reportId);
        try {
            const res = await fetch(`${API_URL}/api/edit-report/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id,
                    report_id: reportId,
                    notes: trimmedNotes,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setStatus(data.error || "Failed to update report.");
                return;
            }

            setStatus("Report updated successfully!");
            cancelEdit();
            fetchHistory();
        } catch {
            setStatus("A network error occurred.");
        } finally {
            setActionLoadingId(null);
            setTimeout(() => setStatus(null), 3000);
        }
    };

    const removeReport = async (reportId: number) => {
        if (!student_id) {
            setStatus("User not identified. Please log in again.");
            return;
        }

        if (!window.confirm("Delete this report? This cannot be undone.")) {
            return;
        }

        setActionLoadingId(reportId);
        try {
            const res = await fetch(`${API_URL}/api/delete-report/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id, report_id: reportId }),
            });
            const data = await res.json();

            if (!res.ok) {
                setStatus(data.error || "Failed to delete report.");
                return;
            }

            setStatus("Report deleted successfully!");
            if (editingReportId === reportId) {
                cancelEdit();
            }
            fetchHistory();
        } catch {
            setStatus("A network error occurred.");
        } finally {
            setActionLoadingId(null);
            setTimeout(() => setStatus(null), 3000);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0) {
            setStatus("Please upload at least one photo.");
            setTimeout(() => setStatus(null), 3000);
            return;
        }

        if (!student_id) {
            setStatus("User not identified. Please log in again.");
            return;
        }

        const form = e.target as HTMLFormElement;
        const notes = (form.elements.namedItem("notes") as HTMLTextAreaElement).value;

        setLoading(true);
        setStatus("Submitting report...");

        const formData = new FormData();
        formData.append("student_id", student_id);
        formData.append("notes", notes);
        files.forEach(file => {
            formData.append("images", file);
        });

        fetch(`${API_URL}/api/submit-report/`, {
            method: "POST",
            body: formData,
        })
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                setStatus("Accomplishment report submitted successfully!");
                form.reset();
                setFiles([]);
            } else {
                setStatus(data.error || "Failed to submit report.");
            }
        })
        .catch(() => {
            setStatus("A network error occurred.");
        })
        .finally(() => {
            setLoading(false);
            setTimeout(() => setStatus(null), 3000);
        });
    };

    return (
        <div className="p-6 max-w-md mx-auto pb-24">
            <header className="mb-6 mt-4 text-center border-b-2 border-green-900 pb-6">
                <h1 className="text-3xl font-black text-green-900 mb-2 uppercase tracking-tight">Accomplishment</h1>
                <p className="text-green-800 font-bold uppercase tracking-widest text-xs">Submit today's documentation</p>
            </header>

            {/* TABS */}
            <div className="flex bg-white p-1 border-2 border-green-900 mb-6 relative">
                <div className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1 hidden"></div>
                <button 
                    onClick={() => setActiveTab('submit')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest text-center transition-colors ${activeTab === 'submit' ? 'bg-green-900 text-white' : 'text-green-900 hover:bg-green-100'}`}
                >
                    Submit Report
                </button>
                <div className="w-[2px] bg-green-900"></div>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest text-center transition-colors ${activeTab === 'history' ? 'bg-green-900 text-white' : 'text-green-900 hover:bg-green-100'}`}
                >
                    My Reports
                </button>
            </div>

            {status && (
                <div className="mb-6 p-4 border-2 border-green-900 bg-green-100 text-green-900 font-bold text-center uppercase tracking-wider text-sm shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                    {status}
                </div>
            )}

            {activeTab === 'submit' ? (
                <form 
                    onSubmit={handleSubmit} 
                    className="bg-white p-6 border-2 border-green-900 relative mb-6 transition-all"
                >
                    <div className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1"></div>
                    
                    <div className="space-y-6">
                        {/* File Upload for Documentation */}
                        <div>
                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                                Documentation (Photos)
                            </label>
                            <div className="relative">
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setFiles(Array.from(e.target.files));
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                />
                                <div className={`w-full border-2 border-dashed border-green-900 p-6 flex flex-col items-center justify-center text-center transition-colors ${files.length > 0 ? 'bg-green-200 border-solid' : 'bg-green-50 hover:bg-green-100'}`}>
                                    <Camera size={32} strokeWidth={2.5} className="text-green-800 mb-2" />
                                    <span className="font-bold text-green-900 uppercase tracking-widest text-xs">
                                        {files.length > 0 ? `${files.length} photo${files.length > 1 ? 's' : ''} selected` : "Tap to upload photos"}
                                    </span>
                                    <span className="text-[9px] font-bold text-green-700 uppercase tracking-widest mt-1">You can select multiple photos</span>
                                </div>
                            </div>
                            
                            {/* Selected Files Preview List */}
                            {files.length > 0 && (
                                <div className="mt-3 space-y-1 bg-gray-50 p-2 border-2 border-green-900 max-h-32 overflow-y-auto">
                                    {files.map((f, i) => (
                                        <div key={i} className="bg-white p-2 text-[10px] font-bold text-green-900 flex items-center justify-between border-b-2 border-green-100 last:border-0 uppercase tracking-wide">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <ImageIcon size={14} className="min-w-fit text-green-700" />
                                                <span className="truncate">{f.name}</span>
                                            </div>
                                            <span className="text-gray-400 min-w-fit ml-2 font-black">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes / Accomplishment Report Textarea */}
                        <div>
                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2 mt-2">
                                Accomplishment Notes
                            </label>
                            <textarea 
                                name="notes"
                                required
                                placeholder="What did you work on today?"
                                rows={5}
                                className="w-full p-3 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 resize-none text-sm placeholder:font-normal leading-relaxed"
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || files.length === 0}
                            className="w-full bg-green-700 text-white p-4 border-2 border-green-900 hover:bg-green-800 transition-colors font-black uppercase tracking-widest flex items-center justify-center gap-2 active:translate-x-1 active:translate-y-1 relative disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0"
                        >
                            <div className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1 hidden"></div>
                            <UserCheck size={18} strokeWidth={3} />
                            {loading ? "Submitting..." : "Submit Report"}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    {fetchingHistory ? (
                        <div className="text-center py-6 font-bold text-green-900 border-2 border-green-900 bg-white">
                            Loading your reports...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-6 font-bold text-green-900 border-2 border-green-900 bg-white">
                            No accomplishment reports found.
                        </div>
                    ) : (
                        history.map((report) => {
                            const isEditing = editingReportId === report.id;
                            const isBusy = actionLoadingId === report.id;

                            return (
                            <div key={report.id} className="bg-white border-2 border-green-900 relative">
                                <div className="bg-green-100 border-b-2 border-green-900 p-3 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-green-900">
                                        <CalendarDays size={16} strokeWidth={2.5} />
                                        <span className="font-black text-xs uppercase tracking-widest">{report.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-green-800 font-bold bg-green-200 px-2 py-1 border border-green-900 text-[10px] uppercase">
                                        <Clock size={12} strokeWidth={3} /> {report.time}
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editingNotes}
                                                onChange={(e) => setEditingNotes(e.target.value)}
                                                rows={4}
                                                className="w-full p-3 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-green-50 resize-none text-sm leading-relaxed"
                                            ></textarea>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => saveEdit(report.id)}
                                                    disabled={isBusy}
                                                    className="px-3 py-2 bg-green-700 text-white border-2 border-green-900 font-black text-[10px] uppercase tracking-widest hover:bg-green-800 disabled:opacity-60 flex items-center gap-1"
                                                >
                                                    <Save size={12} strokeWidth={3} />
                                                    {isBusy ? "Saving..." : "Save"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelEdit}
                                                    disabled={isBusy}
                                                    className="px-3 py-2 bg-white text-green-900 border-2 border-green-900 font-black text-[10px] uppercase tracking-widest hover:bg-green-100 disabled:opacity-60 flex items-center gap-1"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-bold text-gray-700 leading-relaxed border-l-4 border-green-500 pl-3 whitespace-pre-wrap">
                                            "{report.notes}"
                                        </p>
                                    )}
                                    <div className="pt-2 flex items-center justify-between gap-2">
                                        <div className="bg-green-50 border-2 border-green-900 px-3 py-1.5 flex items-center gap-2 w-max text-xs font-black text-green-900 uppercase tracking-widest">
                                            <ImageIcon size={14} strokeWidth={2.5} />
                                            {report.images} Photos Attached
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => startEdit(report)}
                                                disabled={isEditing || isBusy}
                                                className="px-2 py-1 bg-white text-green-900 border-2 border-green-900 font-black text-[10px] uppercase tracking-widest hover:bg-green-100 disabled:opacity-50 flex items-center gap-1"
                                            >
                                                <Pencil size={12} strokeWidth={3} /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeReport(report.id)}
                                                disabled={isBusy}
                                                className="px-2 py-1 bg-white text-rose-700 border-2 border-rose-900 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 disabled:opacity-50 flex items-center gap-1"
                                            >
                                                <Trash2 size={12} strokeWidth={3} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                    {report.image_urls && report.image_urls.length > 0 && (
                                        <div className="flex gap-4 overflow-x-auto pb-4 mt-4 custom-scrollbar">
                                            {report.image_urls.map((url: string, idx: number) => (
                                                <div key={idx} className="relative group shrink-0">
                                                    <img 
                                                        src={url} 
                                                        alt="documentation" 
                                                        className="w-24 h-24 object-cover border-2 border-green-900" 
                                                    />
                                                    <a 
                                                        href={url} 
                                                        download={`accomplishment-${report.id}-${idx + 1}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="absolute inset-0 bg-green-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <div className="bg-white text-green-900 p-1.5 border-2 border-green-900 font-bold text-[10px] uppercase tracking-wider">
                                                            Download
                                                        </div>
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )})
                    )}
                </div>
            )}
        </div>
    );
}