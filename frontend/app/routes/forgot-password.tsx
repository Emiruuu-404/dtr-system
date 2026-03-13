import { useState } from "react";
import { KeyRound, IdCard, Mail, Lock, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { API_URL } from "../config";

export default function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setStatus("Verifying your identity...");

        const formData = new FormData(e.currentTarget);
        const student_id = (formData.get("studentId") as string).trim();
        const email = (formData.get("email") as string).trim();
        const new_password = (formData.get("newPassword") as string).trim();
        const confirm_password = (formData.get("confirmPassword") as string).trim();

        if (new_password !== confirm_password) {
            setStatus("Passwords do not match");
            setLoading(false);
            return;
        }

        if (new_password.length < 8) {
            setStatus("Password must be at least 8 characters");
            setLoading(false);
            return;
        }

        fetch(`${API_URL}/api/forgot-password/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id, email, new_password })
        })
            .then(res => res.json())
            .then(data => {
                if (data.message) {
                    setStatus("Password reset successfully!");
                    setSuccess(true);
                    setTimeout(() => navigate("/login"), 2000);
                } else {
                    setStatus(data.error || "Reset failed");
                }
                setLoading(false);
            })
            .catch(() => {
                setStatus("Server error");
                setLoading(false);
            });
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-white">
            <div className="w-full max-w-md">
                <header className="mb-8 text-center">
                    <div className="w-20 h-20 bg-green-200 border-2 border-green-900 flex items-center justify-center mx-auto mb-5 relative hover:-translate-y-2 transition-transform shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                        <KeyRound size={36} strokeWidth={3} className="text-green-900" />
                    </div>
                    <h1 className="text-3xl font-black text-green-900 mb-2 uppercase tracking-tighter">Reset Password</h1>
                    <p className="text-green-800 font-bold uppercase tracking-widest text-xs">Verify your identity</p>
                </header>

                {status && (
                    <div className={`mb-6 p-4 border-2 border-green-900 ${success ? 'bg-green-200' : 'bg-yellow-100'} text-green-900 font-bold text-center uppercase tracking-wider text-sm`}>
                        {status}
                    </div>
                )}

                <form onSubmit={handleReset} className="bg-white p-7 border-2 border-green-900 relative mb-6">
                    <div className="absolute inset-0 bg-green-900 -z-10 translate-x-2 translate-y-2"></div>

                    <h2 className="font-black text-gray-900 text-2xl mb-6 uppercase tracking-tight">Identity Verification</h2>

                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Student ID</label>
                            <div className="relative border-2 border-green-900 flex items-stretch">
                                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                    <IdCard size={18} strokeWidth={3} className="text-green-900" />
                                </div>
                                <input
                                    type="text"
                                    name="studentId"
                                    required
                                    placeholder="e.g. 23-1234"
                                    className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Registered Email</label>
                            <div className="relative border-2 border-green-900 flex items-stretch">
                                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                    <Mail size={18} strokeWidth={3} className="text-green-900" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="student@school.edu"
                                    className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">New Password</label>
                            <div className="relative border-2 border-green-900 flex items-stretch">
                                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                    <Lock size={18} strokeWidth={3} className="text-green-900" />
                                </div>
                                <input
                                    type="password"
                                    name="newPassword"
                                    required
                                    placeholder="Minimum 8 characters"
                                    className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">Confirm New Password</label>
                            <div className="relative border-2 border-green-900 flex items-stretch">
                                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                                    <Lock size={18} strokeWidth={3} className="text-green-900" />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    required
                                    placeholder="Re-enter new password"
                                    className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-700 text-white p-4 border-2 border-green-900 hover:bg-green-800 transition-colors flex items-center justify-center gap-3 font-black text-lg uppercase tracking-widest active:translate-x-1 active:translate-y-1 relative disabled:opacity-70"
                    >
                        {loading ? 'Processing...' : 'Reset Password'}
                    </button>
                </form>

                <div className="text-center">
                    <Link to="/login" className="font-bold text-sm text-green-700 hover:text-green-900 uppercase tracking-widest underline decoration-2 underline-offset-4 inline-flex items-center gap-2">
                        <ArrowLeft size={16} strokeWidth={3} />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
