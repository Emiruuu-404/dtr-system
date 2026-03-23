import { useState } from "react";
import { Lock, User } from "lucide-react";
import { useNavigate } from "react-router";
import { API_URL } from "../config";

export default function AdminLogin() {
    const [adminId, setAdminId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/api/admin-login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: adminId, password }),
            });
            const data = await res.json();
            
            if (res.ok) {
                // save admin token
                localStorage.setItem("admin_token", data.admin_token);
                localStorage.setItem("admin_id", data.admin_id);
                localStorage.setItem("admin_name", data.name);
                navigate("/admin");
            } else {
                setError(data.error || "Invalid login credentials.");
            }
        } catch (err) {
            setError("Server connection failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-green-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)] p-8">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-green-900 flex items-center justify-center">
                        <Lock className="text-white" size={32} strokeWidth={2.5} />
                    </div>
                </div>
                
                <h2 className="text-3xl font-black text-center text-green-900 uppercase tracking-widest mb-2">Admin Portal</h2>
                <p className="text-center text-green-700 font-bold mb-8">Sign in to manage intern attendance</p>

                {error && (
                    <div className="bg-rose-100 border-2 border-rose-900 text-rose-800 font-bold p-3 mb-6 uppercase tracking-wider text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                            Admin ID or Email
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={adminId}
                                onChange={(e) => setAdminId(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-green-900 focus:outline-none focus:bg-white font-bold text-gray-900"
                                placeholder="Enter Admin ID"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-green-900 focus:outline-none focus:bg-white font-bold text-gray-900"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-900 text-white font-black uppercase tracking-widest py-4 border-2 border-green-900 hover:bg-green-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Authenticating..." : "Login to Dashboard"}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button 
                        onClick={() => navigate("/login")}
                        className="text-sm font-bold text-green-700 hover:underline uppercase tracking-wide"
                    >
                        &larr; Back to Intern Login
                    </button>
                </div>
            </div>
        </div>
    );
}
