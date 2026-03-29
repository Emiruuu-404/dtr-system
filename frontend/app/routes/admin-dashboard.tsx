import { useState, useEffect } from "react";
import { Users, UserX, UserCheck, Clock, Search, AlertCircle, CheckCircle } from "lucide-react";
import { API_URL } from "../config";
import { useNavigate } from "react-router";

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIntern, setSelectedIntern] = useState<any>(null);
    const [internHistory, setInternHistory] = useState<any>(null);
    const [internReports, setInternReports] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("history");
    const [actionLoading, setActionLoading] = useState(false);
    
    // For custom action modals
    const [actionModal, setActionModal] = useState<string | null>(null);
    const [actionInput, setActionInput] = useState("");
    
    // For inline editing
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [editForm, setEditForm] = useState({ am_in: "", am_out: "", pm_in: "", pm_out: "" });
    
    // Admin Settings
    const [showAdminPwModal, setShowAdminPwModal] = useState(false);
    const [adminPwForm, setAdminPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });

    // Global Feedback
    const [feedbackModal, setFeedbackModal] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' });

    const navigate = useNavigate();

    useEffect(() => {
        const adminToken = localStorage.getItem("admin_token");
        if (!adminToken) {
            navigate("/admin/login");
            return;
        }

        Promise.all([
            fetch(`${API_URL}/api/admin-dashboard/`, {
                headers: {
                    "Authorization": `Bearer ${adminToken}`
                }
            }).then(res => {
                if (!res.ok) {
                    throw new Error("Unauthorized");
                }
                return res.json();
            }),
            new Promise(resolve => setTimeout(resolve, 800))
        ])
            .then(([data]) => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch admin data", err);
                localStorage.removeItem("admin_token");
                navigate("/admin/login");
            });
    }, []);

    if (loading) {
        return (
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                <header className="mb-8 mt-4 flex items-start justify-between">
                    <div>
                        <div className="h-10 w-72 bg-gray-200 animate-pulse mb-3"></div>
                        <div className="h-5 w-96 bg-gray-200 animate-pulse"></div>
                    </div>
                    <div className="flex gap-3 mt-1 object-right">
                        <div className="h-10 w-24 bg-gray-200 animate-pulse border-2 border-gray-100"></div>
                        <div className="h-10 w-32 bg-gray-200 animate-pulse border-2 border-gray-100"></div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={`bg-white p-6 border-4 ${i === 2 ? 'border-rose-100 shadow-[8px_8px_0px_0px_#ffe4e6]' : 'border-green-100 shadow-[8px_8px_0px_0px_#dcfce3]'}`}>
                            <div className="flex items-center justify-between">
                                <div className="w-full">
                                    <div className="h-4 w-32 bg-gray-200 animate-pulse mb-3"></div>
                                    <div className="h-12 w-16 bg-gray-200 animate-pulse"></div>
                                </div>
                                <div className={`w-14 h-14 flex items-center justify-center shrink-0 border-2 ${i === 2 ? 'bg-rose-50 border-rose-100' : 'bg-green-50 border-green-100'}`}>
                                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white border-4 border-gray-100 mt-8 overflow-hidden">
                    <div className="p-4 border-b-4 border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
                        <div className="h-7 w-48 bg-gray-200 animate-pulse"></div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-28 bg-gray-200 animate-pulse border-2 border-gray-100"></div>
                            <div className="h-10 w-28 bg-gray-200 animate-pulse border-2 border-gray-100"></div>
                            <div className="h-10 w-56 bg-gray-200 animate-pulse border-2 border-gray-100"></div>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="flex border-b-4 border-gray-100 pb-4 mb-4">
                            <div className="w-1/3 h-4 bg-gray-200 animate-pulse"></div>
                            <div className="w-1/6 h-4 bg-gray-200 animate-pulse"></div>
                            <div className="w-1/6 h-4 bg-gray-200 animate-pulse"></div>
                            <div className="w-1/3 h-4 bg-gray-200 animate-pulse"></div>
                        </div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center py-3 border-b-2 border-gray-50 last:border-0">
                                <div className="flex gap-4 w-1/3">
                                    <div className="w-full">
                                        <div className="h-5 w-3/4 bg-gray-200 animate-pulse mb-2"></div>
                                        <div className="h-3 w-1/2 bg-gray-200 animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="w-1/6">
                                    <div className="h-6 w-24 bg-gray-200 animate-pulse border-2 border-gray-100"></div>
                                </div>
                                <div className="w-1/6 font-black">
                                    <div className="h-6 w-12 bg-gray-200 animate-pulse"></div>
                                </div>
                                <div className="w-1/3">
                                    <div className="h-4 w-full bg-gray-200 animate-pulse mb-1 border-2 border-gray-100"></div>
                                    <div className="h-2 w-16 bg-gray-200 animate-pulse ml-auto mt-2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    if (!data) return <div className="p-6 text-center mt-20 font-bold text-red-500">Failed to load data</div>;

    const filteredInterns = data.interns.filter((intern: any) => 
        intern.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        intern.student_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLogout = () => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_id");
        localStorage.removeItem("admin_name");
        navigate("/admin/login");
    };

    const handleAdminPwChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adminPwForm.new_password !== adminPwForm.confirm_password) return setFeedbackModal({ show: true, type: 'error', message: "New passwords do not match" });
        if (adminPwForm.new_password.length < 8) return setFeedbackModal({ show: true, type: 'error', message: "New password must be at least 8 characters" });
        
        setActionLoading(true);
        const adminId = localStorage.getItem("admin_id") || "admin";
        try {
            const res = await fetch(`${API_URL}/api/change-password/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: adminId,
                    current_password: adminPwForm.current_password,
                    new_password: adminPwForm.new_password
                })
            });
            const d = await res.json();
            if (res.ok) {
                setFeedbackModal({ show: true, type: 'success', message: "Admin password changed successfully." });
                setShowAdminPwModal(false);
                setAdminPwForm({ current_password: "", new_password: "", confirm_password: "" });
            } else {
                setFeedbackModal({ show: true, type: 'error', message: d.error || "Failed to change admin password" });
            }
        } catch (err) {
            setFeedbackModal({ show: true, type: 'error', message: "An error occurred" });
        }
        setActionLoading(false);
    };

    const handleExportCSV = async () => {
        try {
            const adminToken = localStorage.getItem("admin_token");
            const res = await fetch(`${API_URL}/api/admin-export/`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "intern_master_roster.csv";
            a.click();
        } catch (e) {
            setFeedbackModal({ show: true, type: 'error', message: "Failed to export CSV" });
        }
    };

    const loadInternData = async (intern: any) => {
        setSelectedIntern(intern);
        setInternHistory(null);
        setInternReports(null);
        setActiveTab("history");
        
        try {
            const resHist = await fetch(`${API_URL}/api/history/?student_id=${intern.student_id}`);
            const dataHist = await resHist.json();
            setInternHistory(dataHist.records || []);

            const resRep = await fetch(`${API_URL}/api/reports/?student_id=${intern.student_id}`);
            const dataRep = await resRep.json();
            setInternReports(dataRep.reports || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAdminAction = async (action: string, extraData: any = {}) => {
        if (!selectedIntern) return;
        
        setActionLoading(true);
        try {
            const adminToken = localStorage.getItem("admin_token");
            const res = await fetch(`${API_URL}/api/admin-actions/`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    student_id: selectedIntern.student_id,
                    action: action,
                    ...extraData
                })
            });
            const d = await res.json();
            if (res.ok) {
                setFeedbackModal({ show: true, type: 'success', message: d.message || "Action successful" });
                if (action === "toggle_active") {
                    setSelectedIntern({...selectedIntern, is_active: d.is_active});
                    setData({...data, interns: data.interns.map((i:any) => i.student_id === selectedIntern.student_id ? {...i, is_active: d.is_active} : i)});
                } else if (action === "delete_intern") {
                    setSelectedIntern(null);
                    setData({...data, interns: data.interns.filter((i:any) => i.student_id !== selectedIntern.student_id)});
                }
            } else {
                setFeedbackModal({ show: true, type: 'error', message: d.error || "Action failed." });
            }
        } catch (e) {
            setFeedbackModal({ show: true, type: 'error', message: "Action failed." });
        }
        setActionLoading(false);
    };

    const handleDownloadDTR = async (period: string) => {
        try {
            const adminToken = localStorage.getItem("admin_token");
            const res = await fetch(`${API_URL}/api/download-dtr/?period=${period}&admin_student_id=${selectedIntern.student_id}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DTR_${selectedIntern.name.replace(/\s+/g, '_')}_${period}.pdf`;
            a.click();
        } catch (e) {
            setFeedbackModal({ show: true, type: 'error', message: "Failed to download DTR" });
        }
    };

    const startEditing = (record: any) => {
        setEditingRecord(record);
        setEditForm({
            am_in: record.am_in !== "--:--" ? record.am_in : "",
            am_out: record.am_out !== "--:--" ? record.am_out : "",
            pm_in: record.pm_in !== "--:--" ? record.pm_in : "",
            pm_out: record.pm_out !== "--:--" ? record.pm_out : "",
        });
    };

    const saveEditRecord = async () => {
        if (!editingRecord) return;
        try {
            const adminToken = localStorage.getItem("admin_token");
            const res = await fetch(`${API_URL}/api/edit-record/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    student_id: selectedIntern.student_id,
                    record_id: editingRecord.id,
                    ...editForm
                })
            });
            const d = await res.json();
            if (res.ok) {
                setFeedbackModal({ show: true, type: 'success', message: "Record updated successfully" });
                setEditingRecord(null);
                loadInternData(selectedIntern); // refresh data
            } else {
                setFeedbackModal({ show: true, type: 'error', message: d.error || "Failed to edit record" });
            }
        } catch (err) {
            setFeedbackModal({ show: true, type: 'error', message: "Network error." });
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <header className="mb-8 mt-4 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black text-green-900 mb-1 uppercase tracking-wider">
                        Admin Dashboard
                    </h1>
                    <p className="text-green-800 font-bold">Real-time attendance monitoring and intern progress</p>
                </div>
                <div className="flex gap-3 mt-1 object-right">

                    <button 
                        onClick={() => setShowAdminPwModal(true)}
                        className="bg-white border-2 border-green-900 px-4 py-2 text-xs font-black uppercase text-green-900 tracking-widest hover:bg-green-50 transition-colors"
                    >
                        Settings
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="bg-rose-100 text-rose-800 border-2 border-rose-900 px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-rose-200 transition-colors"
                    >
                        Logout Admin
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-widest">Total Interns</p>
                            <h2 className="text-4xl font-black text-green-900">{data.stats.total_interns}</h2>
                        </div>
                        <div className="w-14 h-14 bg-green-100 flex items-center justify-center border-2 border-green-900 shrink-0">
                            <Users className="text-green-800" strokeWidth={2.5} size={28} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-widest">Present Today</p>
                            <h2 className="text-4xl font-black text-green-700">{data.stats.present_today}</h2>
                        </div>
                        <div className="w-14 h-14 bg-green-100 flex items-center justify-center border-2 border-green-900 shrink-0">
                            <UserCheck className="text-green-700" strokeWidth={2.5} size={28} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 border-4 border-rose-900 shadow-[8px_8px_0px_0px_rgba(136,19,55,1)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-widest">Absent / No Entry</p>
                            <h2 className="text-4xl font-black text-rose-800">{data.stats.absent_today}</h2>
                        </div>
                        <div className="w-14 h-14 bg-rose-100 flex items-center justify-center border-2 border-rose-900 shrink-0">
                            <UserX className="text-rose-800" strokeWidth={2.5} size={28} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Interns Table */}
            <div className="bg-white border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)] mt-8 overflow-hidden">
                <div className="p-4 border-b-4 border-green-900 bg-green-50 flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-xl font-black text-green-900 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={20} /> Master Roster
                    </h2>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate("/register")}
                            className="bg-green-100 text-green-900 px-4 py-2 border-2 border-green-900 font-bold uppercase tracking-wide hover:bg-green-200 transition-colors text-xs"
                        >
                            + Add Intern
                        </button>
                        <button 
                            onClick={handleExportCSV}
                            className="bg-green-800 text-white px-4 py-2 border-2 border-green-900 font-bold uppercase tracking-wide hover:bg-green-900 transition-colors text-xs"
                        >
                            Export CSV
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search intern..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border-2 border-green-900 font-bold focus:outline-none focus:bg-white bg-white"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-green-100 text-green-900 font-black tracking-wider border-b-4 border-green-900">
                            <tr>
                                <th className="px-6 py-4">Student ID / Name</th>
                                <th className="px-6 py-4">Status Today</th>
                                <th className="px-6 py-4">Hours Rendered</th>
                                <th className="px-6 py-4">Progress (486 Total)</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold border-green-900">
                            {filteredInterns.map((intern: any, index: number) => {
                                const progress = Math.min(100, Math.max(0, (intern.total_hours / 486) * 100));
                                
                                return (
                                    <tr key={index} onClick={() => loadInternData(intern)} className="border-b-2 border-green-900/20 hover:bg-green-100 cursor-pointer transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-gray-900 text-base flex items-center gap-2">
                                                {intern.name}
                                                {!intern.is_active && <span className="bg-rose-100 text-rose-800 border-2 border-rose-900 px-2 py-0.5 text-[10px] uppercase tracking-widest flex items-center shrink-0 w-fit">Deactivated</span>}
                                            </div>
                                            <div className="text-green-700 text-xs tracking-widest">{intern.student_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs uppercase tracking-widest border-2 ${
                                                intern.status_today.includes("IN") && intern.status_today !== "Not Timed In" 
                                                ? "bg-green-100 text-green-800 border-green-800" 
                                                : intern.status_today === "Not Timed In"
                                                ? "bg-gray-100 text-gray-500 border-gray-400"
                                                : "bg-rose-100 text-rose-800 border-rose-800"
                                            }`}>
                                                {intern.status_today}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-green-900 font-black text-lg shrink-0 w-fit">
                                            {intern.formatted_total_hours || intern.total_hours}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-full bg-gray-200 h-4 border-2 border-green-900">
                                                <div 
                                                    className="bg-green-600 h-full transition-all duration-500" 
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            <div className="mt-1 text-right text-[10px] text-gray-500 uppercase tracking-widest">
                                                {progress.toFixed(1)}% Completed
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {filteredInterns.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 uppercase tracking-widest font-bold">
                                        No interns found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedIntern && (
                <div className="fixed inset-0 bg-green-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white max-w-5xl w-full max-h-[90vh] flex flex-col border-4 border-green-900 shadow-[12px_12px_0px_0px_rgba(6,78,59,1)] relative">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b-4 border-green-900 bg-green-50 shrink-0 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-green-900 uppercase tracking-widest flex items-center gap-3">
                                    {selectedIntern.name}
                                    {!selectedIntern.is_active && <span className="bg-rose-100 text-rose-800 border-2 border-rose-900 px-2 py-0.5 text-xs">OFFLINE</span>}
                                </h2>
                                <p className="text-green-700 font-bold uppercase tracking-widest text-sm mt-1">{selectedIntern.student_id} • {selectedIntern.formatted_total_hours || selectedIntern.total_hours} Rendered</p>
                            </div>
                            <button 
                                onClick={() => setSelectedIntern(null)}
                                className="bg-gray-200 border-2 border-gray-400 font-black px-4 py-2 hover:bg-gray-300 uppercase text-gray-700 tracking-widest text-xs"
                            >
                                Close X
                            </button>
                        </div>
                        
                        {/* Modal Body / Scrollable Content */}
                        <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-6">
                            
                            {/* Actions Panel */}
                            <div className="bg-white p-4 border-2 border-green-900 flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <p className="text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">DTR Generators</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDownloadDTR('1st_half')} className="flex-1 bg-green-100 border-2 border-green-900 text-green-900 font-bold px-3 py-2 text-xs uppercase tracking-wider hover:bg-green-200">1st Half DTR</button>
                                        <button onClick={() => handleDownloadDTR('2nd_half')} className="flex-1 bg-green-100 border-2 border-green-900 text-green-900 font-bold px-3 py-2 text-xs uppercase tracking-wider hover:bg-green-200">2nd Half DTR</button>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-[300px]">
                                    <p className="text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Account Management</p>
                                    <div className="flex gap-2">

                                        <button 
                                            onClick={() => { setActionModal('reset_password'); setActionInput(''); }}
                                            disabled={actionLoading}
                                            className="flex-1 bg-white border-2 border-gray-400 text-gray-700 font-bold px-3 py-2 text-xs uppercase tracking-wider hover:bg-gray-100 disabled:opacity-50"
                                        >
                                            Reset PW
                                        </button>
                                        <button 
                                            onClick={() => setActionModal('toggle_active')}
                                            disabled={actionLoading}
                                            className={`flex-1 border-2 font-bold px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-50 ${selectedIntern.is_active ? 'bg-rose-100 border-rose-900 text-rose-900 hover:bg-rose-200' : 'bg-green-100 border-green-900 text-green-900 hover:bg-green-200'}`}
                                        >
                                            {selectedIntern.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button 
                                            onClick={() => setActionModal('delete_intern')}
                                            disabled={actionLoading}
                                            className="bg-rose-600 border-2 border-rose-900 text-white font-bold px-3 py-2 text-[10px] uppercase tracking-wider hover:bg-rose-700 disabled:opacity-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* TABS */}
                            <div className="flex gap-4 border-b-2 border-gray-300">
                                <button 
                                    onClick={() => setActiveTab('history')}
                                    className={`px-4 py-2 font-black uppercase tracking-widest text-sm border-b-4 ${activeTab === 'history' ? 'border-green-900 text-green-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Attendance & Edits
                                </button>
                                <button 
                                    onClick={() => setActiveTab('reports')}
                                    className={`px-4 py-2 font-black uppercase tracking-widest text-sm border-b-4 ${activeTab === 'reports' ? 'border-green-900 text-green-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Accomplishment Reports
                                </button>
                            </div>
                            
                            {/* TAB CONTENT: HISTORY & EDITS */}
                            {activeTab === 'history' && (
                                <div className="bg-white border-2 border-green-900">
                                    <div className="max-h-[350px] overflow-y-auto">
                                        <table className="w-full text-left text-sm text-gray-800">
                                            <thead className="bg-gray-100 text-xs uppercase font-bold sticky top-0 border-b-2 border-gray-300 z-10">
                                                <tr>
                                                    <th className="p-3">Date</th>
                                                    <th className="p-3">AM Shift</th>
                                                    <th className="p-3">PM Shift</th>
                                                    <th className="p-3 text-right">Hours</th>
                                                    <th className="p-3 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {internHistory === null ? (
                                                    <tr><td colSpan={5} className="p-4 text-center font-bold text-gray-500">Loading history...</td></tr>
                                                ) : internHistory.length === 0 ? (
                                                    <tr><td colSpan={5} className="p-4 text-center font-bold text-gray-500">No attendance data found.</td></tr>
                                                ) : (
                                                    internHistory.map((h: any, i: number) => {
                                                        const isEditing = editingRecord?.id === h.id;
                                                        
                                                        return (
                                                        <tr key={i} className={`hover:bg-green-50/50 ${isEditing ? 'bg-green-100' : ''}`}>
                                                            <td className="p-3 font-bold text-gray-900">{h.date}</td>
                                                            
                                                            {/* AM Shift Column */}
                                                            <td className="p-3 text-xs font-bold font-mono text-gray-600">
                                                                {isEditing ? (
                                                                    <div className="flex gap-1 items-center">
                                                                        <input type="time" value={editForm.am_in} onChange={e => setEditForm({...editForm, am_in: e.target.value})} className="border p-1 text-xs w-[100px]"/> - 
                                                                        <input type="time" value={editForm.am_out} onChange={e => setEditForm({...editForm, am_out: e.target.value})} className="border p-1 text-xs w-[100px]"/>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {h.am_in !== "--:--" ? <span className="text-green-700">{h.am_in}</span> : <span className="text-gray-300">--:--</span>}
                                                                        <span className="mx-1 text-gray-300">-</span> 
                                                                        {h.am_out !== "--:--" ? <span className="text-rose-700">{h.am_out}</span> : <span className="text-gray-300">--:--</span>}
                                                                    </>
                                                                )}
                                                            </td>
                                                            
                                                            {/* PM Shift Column */}
                                                            <td className="p-3 text-xs font-bold font-mono text-gray-600">
                                                                {isEditing ? (
                                                                     <div className="flex gap-1 items-center">
                                                                        <input type="time" value={editForm.pm_in} onChange={e => setEditForm({...editForm, pm_in: e.target.value})} className="border p-1 text-xs w-[100px]"/> - 
                                                                        <input type="time" value={editForm.pm_out} onChange={e => setEditForm({...editForm, pm_out: e.target.value})} className="border p-1 text-xs w-[100px]"/>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                    {h.pm_in !== "--:--" ? <span className="text-green-700">{h.pm_in}</span> : <span className="text-gray-300">--:--</span>}
                                                                    <span className="mx-1 text-gray-300">-</span> 
                                                                    {h.pm_out !== "--:--" ? <span className="text-rose-700">{h.pm_out}</span> : <span className="text-gray-300">--:--</span>}
                                                                    </>
                                                                )}
                                                            </td>
                                                            
                                                            <td className="p-3 font-black text-green-900 text-right tracking-widest">{isEditing ? "-" : h.hours}</td>
                                                            <td className="p-3 text-center">
                                                                {isEditing ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <button onClick={saveEditRecord} className="bg-green-700 text-white text-[10px] uppercase font-bold px-2 py-1 hover:bg-green-800">Save</button>
                                                                        <button onClick={() => setEditingRecord(null)} className="bg-gray-400 text-white text-[10px] uppercase font-bold px-2 py-1 hover:bg-gray-500">Cancel</button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => startEditing(h)} className="text-green-700 font-bold text-xs uppercase hover:underline">Edit</button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB CONTENT: REPORTS */}
                            {activeTab === 'reports' && (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {internReports === null ? (
                                        <div className="p-6 text-center font-bold text-gray-500 bg-gray-100">Loading reports...</div>
                                    ) : internReports.length === 0 ? (
                                        <div className="p-6 text-center font-bold text-gray-500 bg-gray-100 border-2 border-dashed border-gray-300">
                                            No accomplishment reports submitted yet.
                                        </div>
                                    ) : (
                                        internReports.map((report: any, i: number) => (
                                            <div key={i} className="bg-white p-5 border-2 border-green-900">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-black text-green-900 uppercase tracking-widest">{report.date}</h4>
                                                        <p className="text-xs font-bold text-gray-500">Submitted at {report.time}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-green-50 p-4 border-l-4 border-green-900 text-gray-800 font-medium text-sm whitespace-pre-wrap">
                                                    {report.notes}
                                                </div>
                                                
                                                {report.image_urls && report.image_urls.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Attached Evidences ({report.images})</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {report.image_urls.map((url: string, index: number) => (
                                                                <a key={index} href={url} target="_blank" rel="noreferrer" className="block border-2 border-gray-200 hover:border-green-600 transition-colors">
                                                                    <img src={url} alt="Accomplishment" className="h-24 w-auto object-cover" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* ACTION MODAL OVERLAY */}
                    {actionModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)] p-6 max-w-sm w-full relative">
                                <h3 className="text-xl font-black text-green-900 uppercase tracking-widest mb-4">
                                    {actionModal === 'reset_password' ? 'Reset Password' : 
                                     actionModal === 'toggle_active' ? (selectedIntern.is_active ? 'Deactivate Intern' : 'Activate Intern') : 
                                     'Delete Intern'}
                                </h3>
                                
                                {actionModal === 'reset_password' && (
                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">New Password (Min 6 chars)</label>
                                        <input 
                                            type="password" 
                                            value={actionInput} 
                                            onChange={e => setActionInput(e.target.value)} 
                                            className="w-full border-2 border-gray-400 p-2 font-bold focus:border-green-900 focus:outline-none"
                                            autoFocus
                                        />
                                    </div>
                                )}
                                
                                {actionModal === 'toggle_active' && (
                                    <p className="font-bold text-gray-700 mb-6 leading-relaxed">
                                        Are you sure you want to {selectedIntern.is_active ? <span className="text-rose-600">deactivate</span> : <span className="text-green-600">activate</span>} <strong>{selectedIntern.name}</strong>?
                                        {!selectedIntern.is_active && " They will be able to log in and punch their time again."}
                                    </p>
                                )}

                                {actionModal === 'delete_intern' && (
                                    <div className="mb-6">
                                        <p className="font-bold text-rose-700 mb-2 uppercase tracking-wide">Warning! Irreversible Action.</p>
                                        <p className="text-sm font-medium text-gray-600 leading-relaxed">Are you absolutely sure you want to permanently delete <strong className="text-gray-900">{selectedIntern.name}</strong> and all their historical attendance data? This cannot be undone.</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => {
                                            if (actionModal === 'reset_password') {
                                                if (actionInput.length < 6) return setFeedbackModal({ show: true, type: 'error', message: "Password must be at least 6 characters." });
                                                handleAdminAction('reset_password', { new_password: actionInput });
                                            } else {
                                                handleAdminAction(actionModal);
                                            }
                                            setActionModal(null);
                                        }}
                                        disabled={actionLoading}
                                        className={`flex-1 font-black px-4 py-2 uppercase text-xs tracking-widest border-2 disabled:opacity-50 ${
                                            actionModal === 'delete_intern' ? 'bg-rose-600 text-white border-rose-900 hover:bg-rose-700' : 'bg-green-100 text-green-900 border-green-900 hover:bg-green-200'
                                        }`}
                                    >
                                        Proceed
                                    </button>
                                    <button 
                                        onClick={() => setActionModal(null)}
                                        disabled={actionLoading}
                                        className="flex-1 bg-white border-2 border-gray-400 font-black px-4 py-2 hover:bg-gray-100 uppercase text-gray-700 tracking-widest text-xs disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ADMIN SETTINGS MODAL */}
            {showAdminPwModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <form onSubmit={handleAdminPwChange} className="bg-white border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)] p-6 max-w-sm w-full relative">
                        <h3 className="text-2xl font-black text-green-900 uppercase tracking-widest mb-6 border-b-2 border-gray-200 pb-2">
                            Admin Settings
                        </h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Current Password</label>
                                <input 
                                    type="password" 
                                    value={adminPwForm.current_password} 
                                    onChange={e => setAdminPwForm({...adminPwForm, current_password: e.target.value})} 
                                    className="w-full border-2 border-gray-400 p-2 font-bold focus:border-green-900 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">New Password (Min 8 chars)</label>
                                <input 
                                    type="password" 
                                    value={adminPwForm.new_password} 
                                    onChange={e => setAdminPwForm({...adminPwForm, new_password: e.target.value})} 
                                    className="w-full border-2 border-gray-400 p-2 font-bold focus:border-green-900 focus:outline-none"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Confirm New Password</label>
                                <input 
                                    type="password" 
                                    value={adminPwForm.confirm_password} 
                                    onChange={e => setAdminPwForm({...adminPwForm, confirm_password: e.target.value})} 
                                    className="w-full border-2 border-gray-400 p-2 font-bold focus:border-green-900 focus:outline-none"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                type="submit"
                                disabled={actionLoading}
                                className="flex-1 font-black px-4 py-3 uppercase text-xs tracking-widest border-2 bg-green-900 text-white border-green-900 hover:bg-green-800 disabled:opacity-50"
                            >
                                Save Password
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowAdminPwModal(false);
                                    setAdminPwForm({ current_password: "", new_password: "", confirm_password: "" });
                                }}
                                disabled={actionLoading}
                                className="bg-white border-2 border-gray-400 font-black px-4 py-3 hover:bg-gray-100 uppercase text-gray-700 tracking-widest text-xs disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* FEEDBACK MODAL */}
            {feedbackModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white p-6 w-full max-w-sm border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)] relative animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            {feedbackModal.type === 'error' ? (
                                <AlertCircle size={56} strokeWidth={2.5} className="text-rose-600 mb-4" />
                            ) : (
                                <CheckCircle size={56} strokeWidth={2.5} className="text-green-600 mb-4" />
                            )}
                            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-wide">
                                {feedbackModal.type === 'error' ? 'Error' : 'Success'}
                            </h3>
                            <p className="text-gray-700 font-bold mb-8 uppercase tracking-wide text-sm">
                                {feedbackModal.message}
                            </p>
                            <button
                                onClick={() => setFeedbackModal({ show: false, type: 'success', message: '' })}
                                className={`w-full text-white p-4 border-2 transition-colors font-black uppercase tracking-widest text-lg ${
                                    feedbackModal.type === 'error' 
                                    ? 'bg-rose-700 border-rose-900 hover:bg-rose-800' 
                                    : 'bg-green-700 border-green-900 hover:bg-green-800'
                                }`}
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
