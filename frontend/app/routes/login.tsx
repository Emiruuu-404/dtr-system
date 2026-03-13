import { useState } from "react";
import { User, Lock, Briefcase } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { API_URL } from "../config";
import AuthLoadingOverlay from "../components/AuthLoadingOverlay";

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setStatus("Verifying credentials...");

        const formData = new FormData(e.currentTarget);
        const student_id = (formData.get("studentId") as string).trim();
        const password = (formData.get("password") as string).trim();

        try {
            const response = await fetch(`${API_URL}/api/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id, password })
            });

            const contentType = response.headers.get("content-type") || "";
            const isJson = contentType.includes("application/json");
            const payload = isJson ? await response.json() : null;

            if (response.ok && payload?.message === "Login successful") {
                setStatus("Login successful!");
                localStorage.setItem("student_id", payload.student_id);
                localStorage.setItem("name", payload.name);
                navigate("/", { replace: true });
                return;
            }

            if (isJson && payload?.error) {
                setStatus(payload.error);
            } else {
                setStatus(`Backend error (${response.status}). Check API_URL: ${API_URL}`);
            }
        } catch {
            setStatus(`Cannot reach backend. Check API_URL: ${API_URL}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-white">
            <AuthLoadingOverlay
                open={loading}
                title="Logging In"
                subtitle="Verifying your credentials"
            />
            <div className="w-full max-w-md">
                <header className="mb-8 text-center">
                    <div className="w-20 h-20 bg-green-200 border-2 border-green-900 flex items-center justify-center mx-auto mb-5 rotate-3 relative hover:rotate-0 transition-transform">
                        <div className="absolute inset-0 bg-green-400 -z-10 translate-x-1 translate-y-1 border-2 border-green-900"></div>
                        <Briefcase size={36} strokeWidth={3} className="text-green-900" />
                    </div>
                    <h1 className="text-4xl font-black text-green-900 mb-2 uppercase tracking-tighter">OJT DTR</h1>
                    <p className="text-green-800 font-bold uppercase tracking-widest text-xs">Internship Attendance System</p>
                </header>

                {status && (
                    <div className="mb-6 p-4 border-2 border-green-900 bg-green-100 text-green-900 font-bold text-center uppercase tracking-wider text-sm">
                        {status}
                    </div>
                )}

                <form onSubmit={handleLogin} className="bg-white p-7 border-2 border-green-900 relative mb-6">
                    <div className="absolute inset-0 bg-green-900 -z-10 translate-x-2 translate-y-2"></div>

                    <h2 className="font-black text-gray-900 text-2xl mb-6 uppercase tracking-tight">Log In</h2>

                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Student ID or Email</label>
                            <div className="relative border-2 border-green-900 flex items-stretch">
                                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                    <User size={18} strokeWidth={3} className="text-green-900" />
                                </div>
                                <input
                                    type="text"
                                    name="studentId"
                                    required
                                    placeholder="Enter Student ID or Email"
                                    className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Password</label>
                            <div className="relative border-2 border-green-900 flex items-stretch">
                                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                    <Lock size={18} strokeWidth={3} className="text-green-900" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    placeholder="Enter your password"
                                    className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-700 text-white p-4 border-2 border-green-900 hover:bg-green-800 transition-colors flex items-center justify-center gap-3 font-black text-lg uppercase tracking-widest active:translate-x-1 active:translate-y-1 relative disabled:opacity-70 disabled:active:translate-x-0 disabled:active:translate-y-0"
                    >
                        <span className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1 hidden"></span>
                        {loading ? 'Authenticating...' : 'Log In'}
                    </button>

                    <div className="mt-4 text-center">
                        <Link to="/forgot-password" className="text-xs font-bold text-green-700 hover:text-green-900 uppercase tracking-widest underline decoration-2 underline-offset-4">Forgot Password?</Link>
                    </div>
                </form>

                <div className="text-center font-bold text-sm text-gray-600">
                    <span className="uppercase tracking-widest">New intern?</span>{' '}
                    <Link to="/register" className="text-green-700 hover:text-green-900 uppercase tracking-widest underline decoration-2 underline-offset-4">
                        Register here
                    </Link>
                </div>
            </div>
        </div>
    );
}
