import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Mail, Lock, LogOut, Save, IdCard } from "lucide-react";
import { useNavigate } from "react-router";
import { API_URL } from "../config";
import AuthLoadingOverlay from "../components/AuthLoadingOverlay";

export default function Settings() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string | null>(null);
    const [statusType, setStatusType] = useState<"success" | "error">("success");
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    // Profile form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    // Password form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        const student_id = localStorage.getItem("student_id");
        if (!student_id) {
            navigate("/login");
            return;
        }

        fetch(`${API_URL}/api/profile/?student_id=${student_id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    navigate("/login");
                    return;
                }
                setProfile(data);
                setName(data.name);
                setEmail(data.email);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    const showStatus = (msg: string, type: "success" | "error") => {
        setStatus(msg);
        setStatusType(type);
        setTimeout(() => setStatus(null), 3000);
    };

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        const student_id = localStorage.getItem("student_id");

        fetch(`${API_URL}/api/update-profile/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id, name, email })
        })
            .then(res => res.json())
            .then(data => {
                if (data.message) {
                    showStatus("Profile updated!", "success");
                    localStorage.setItem("name", data.name);
                } else {
                    showStatus(data.error, "error");
                }
            })
            .catch(() => showStatus("Server error", "error"));
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showStatus("Passwords do not match", "error");
            return;
        }
        if (newPassword.length < 8) {
            showStatus("Password must be at least 8 characters", "error");
            return;
        }

        const student_id = localStorage.getItem("student_id");

        fetch(`${API_URL}/api/change-password/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id, current_password: currentPassword, new_password: newPassword })
        })
            .then(res => res.json())
            .then(data => {
                if (data.message) {
                    showStatus("Password changed!", "success");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                } else {
                    showStatus(data.error, "error");
                }
            })
            .catch(() => showStatus("Server error", "error"));
    };

    const handleLogout = async () => {
        setShowLogoutConfirm(false);
        setLogoutLoading(true);

        // Small delay to let users perceive action feedback while keeping navigation responsive.
        await new Promise((resolve) => setTimeout(resolve, 320));

        localStorage.removeItem("student_id");
        localStorage.removeItem("name");
        navigate("/login", { replace: true });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[100dvh]">
                <div className="w-12 h-12 border-4 border-green-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-md mx-auto pb-24">
            <AuthLoadingOverlay
                open={logoutLoading}
                title="Logging Out"
                subtitle="Securing your session"
            />
            <header className="mb-8 mt-4 text-center border-b-2 border-green-900 pb-6">
                <div className="w-20 h-20 bg-green-200 border-2 border-green-900 flex items-center justify-center mx-auto mb-5 relative hover:-translate-y-2 transition-transform shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                    <SettingsIcon size={36} strokeWidth={3} className="text-green-900" />
                </div>
                <h1 className="text-3xl font-black text-green-900 mb-2 uppercase tracking-tight">Settings</h1>
                <p className="text-green-800 font-bold uppercase tracking-widest text-xs">Account Management</p>
            </header>

            {status && (
                <div className={`mb-4 p-4 border-2 border-green-900 ${statusType === "success" ? "bg-green-100" : "bg-red-100"} text-green-900 font-bold text-center uppercase tracking-wider text-sm`}>
                    {status}
                </div>
            )}

            {/* Profile Info Card */}
            <div className="bg-green-50 p-5 border-2 border-green-900 mb-6 relative">
                <div className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1"></div>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-200 border-2 border-green-900 flex items-center justify-center font-black text-green-900 text-xl shadow-[2px_2px_0px_0px_rgba(20,83,45,1)]">
                        {name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-black text-green-900 text-lg uppercase">{name}</h3>
                        <p className="font-bold text-green-700 text-xs uppercase tracking-widest flex items-center gap-1">
                            <IdCard size={12} strokeWidth={3} /> {profile?.student_id}
                        </p>
                    </div>
                </div>
            </div>

            {/* Update Profile */}
            <form onSubmit={handleUpdateProfile} className="bg-white p-6 border-2 border-green-900 relative mb-6">
                <div className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1"></div>
                <h2 className="font-black text-gray-900 text-lg mb-5 uppercase tracking-wide border-b-2 border-green-900 pb-3 flex items-center gap-2">
                    <User size={20} strokeWidth={3} className="text-green-700" />
                    Edit Profile
                </h2>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Full Name</label>
                        <div className="border-2 border-green-900 flex items-stretch">
                            <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                <User size={16} strokeWidth={3} className="text-green-900" />
                            </div>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Email</label>
                        <div className="border-2 border-green-900 flex items-stretch">
                            <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                <Mail size={16} strokeWidth={3} className="text-green-900" />
                            </div>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50" />
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full bg-green-700 text-white p-3 border-2 border-green-900 hover:bg-green-800 transition-colors font-black uppercase tracking-widest flex items-center justify-center gap-2 active:translate-x-1 active:translate-y-1">
                    <Save size={18} strokeWidth={3} /> Save Changes
                </button>
            </form>

            {/* Change Password */}
            <form onSubmit={handleChangePassword} className="bg-white p-6 border-2 border-green-900 relative mb-6">
                <div className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1"></div>
                <h2 className="font-black text-gray-900 text-lg mb-5 uppercase tracking-wide border-b-2 border-green-900 pb-3 flex items-center gap-2">
                    <Lock size={20} strokeWidth={3} className="text-green-700" />
                    Change Password
                </h2>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Current Password</label>
                        <div className="border-2 border-green-900 flex items-stretch">
                            <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                <Lock size={16} strokeWidth={3} className="text-green-900" />
                            </div>
                            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required placeholder="Enter current password" className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">New Password</label>
                        <div className="border-2 border-green-900 flex items-stretch">
                            <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                <Lock size={16} strokeWidth={3} className="text-green-900" />
                            </div>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Minimum 8 characters" className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Confirm New Password</label>
                        <div className="border-2 border-green-900 flex items-stretch">
                            <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                <Lock size={16} strokeWidth={3} className="text-green-900" />
                            </div>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Re-enter new password" className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50" />
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full bg-green-700 text-white p-3 border-2 border-green-900 hover:bg-green-800 transition-colors font-black uppercase tracking-widest flex items-center justify-center gap-2 active:translate-x-1 active:translate-y-1">
                    <Lock size={18} strokeWidth={3} /> Update Password
                </button>
            </form>

            {/* Logout */}
            <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full bg-red-600 text-white p-4 border-2 border-red-900 hover:bg-red-700 transition-colors font-black uppercase tracking-widest flex items-center justify-center gap-3 active:translate-x-1 active:translate-y-1 relative"
            >
                <div className="absolute inset-0 bg-red-900 -z-10 translate-x-1 translate-y-1"></div>
                <LogOut size={22} strokeWidth={3} /> Log Out
            </button>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-7 border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)] max-w-sm w-full">
                        <h3 className="font-black text-xl text-gray-900 uppercase tracking-wide mb-4 text-center">Confirm Logout</h3>
                        <p className="text-gray-600 font-bold text-center mb-6 uppercase tracking-wider text-sm">Are you sure you want to log out?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 bg-white text-green-900 p-3 border-2 border-green-900 hover:bg-green-50 font-black uppercase tracking-widest text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 bg-red-600 text-white p-3 border-2 border-red-900 hover:bg-red-700 font-black uppercase tracking-widest text-sm"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
