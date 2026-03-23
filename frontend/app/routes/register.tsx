import { useState } from 'react';
import {
  User,
  Lock,
  Mail,
  BadgeCheck,
  IdCard,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { API_URL } from '../config';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const isAdminLogggedIn = Boolean(localStorage.getItem('admin_token'));

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Creating your account...');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const name = (formData.get('fullName') as string).trim();
    const student_id = (formData.get('studentId') as string).trim();
    const email = (formData.get('email') as string).trim();
    const password = (formData.get('password') as string).trim();
    const confirmPassword = (formData.get('confirmPassword') as string).trim();

    if (password !== confirmPassword) {
      setStatus('Passwords do not match');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        student_id,
        email,
        password,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.message || data.error);

        if (data.message) {
          setTimeout(() => {
            navigate(isAdminLogggedIn ? '/admin' : '/login');
          }, 1500);
        }
      })
      .catch(() => {
        setStatus('Server error');
      });
  };

  return (
    <div className="min-h-[100dvh] bg-green-50 bg-[radial-gradient(#dcfce7_1px,transparent_1px)] [background-size:16px_16px] py-10 px-6 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto">
        <header className="mb-8 text-center flex items-center justify-center gap-3">
          <BadgeCheck size={32} strokeWidth={3} className="text-green-900" />
          <h1 className="text-3xl font-black text-green-900 uppercase tracking-tighter">
            {isAdminLogggedIn ? "Register New Intern" : "Intern Registration"}
          </h1>
        </header>

        {status && (
          <div className="mb-6 p-4 border-2 border-green-900 bg-green-200 text-green-900 font-bold text-center uppercase tracking-wider text-sm">
            {status}
          </div>
        )}

        <form
          onSubmit={handleRegister}
          className="bg-white p-7 border-2 border-green-900 relative mb-8"
        >
          <div className="absolute inset-0 bg-green-900 -z-10 translate-x-2 translate-y-2"></div>

          <h2 className="font-black text-gray-900 text-xl mb-6 uppercase tracking-wide border-b-2 border-green-900 pb-4">
            Personal Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                Full Name
              </label>
              <div className="relative border-2 border-green-900 flex items-stretch">
                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                  <User size={18} strokeWidth={3} className="text-green-900" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                Student ID
              </label>
              <div className="relative border-2 border-green-900 flex items-stretch">
                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                  <IdCard
                    size={18}
                    strokeWidth={3}
                    className="text-green-900"
                  />
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
              <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                Email Address
              </label>
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
              <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                Create Password
              </label>
              <div className="relative border-2 border-green-900 flex items-stretch">
                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                  <Lock size={18} strokeWidth={3} className="text-green-900" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50 pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-900 hover:scale-110 transition-transform"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                Confirm Password
              </label>
              <div className="relative border-2 border-green-900 flex items-stretch">
                <div className="bg-green-100 px-4 flex items-center border-r-2 border-green-900">
                  <Lock size={18} strokeWidth={3} className="text-green-900" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  placeholder="Re-enter your password"
                  className="w-full p-3 font-bold text-gray-900 focus:outline-none focus:bg-green-50 pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-900 hover:scale-110 transition-transform"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white p-4 border-2 border-green-900 hover:bg-green-800 transition-colors flex items-center justify-center gap-3 font-black text-lg uppercase tracking-widest active:translate-x-1 active:translate-y-1 relative disabled:opacity-70 disabled:active:translate-x-0 disabled:active:translate-y-0"
          >
            <span className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1 hidden"></span>
            {loading ? 'Processing...' : 'Register Account'}
          </button>
        </form>

        <div className="text-center font-bold text-sm text-gray-600 bg-white p-4 border-2 border-green-900 flex items-center justify-center">
          <Link
            to={isAdminLogggedIn ? "/admin" : "/login"}
            className="text-green-700 hover:text-green-900 uppercase tracking-widest underline decoration-2 underline-offset-4 inline-block"
          >
            {isAdminLogggedIn ? "Return to Dashboard" : "Return to Log In"}
          </Link>
        </div>
      </div>
    </div>
  );
}
