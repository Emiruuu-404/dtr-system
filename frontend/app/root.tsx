import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import AppTour from './components/AppTour';
import type { Route } from './+types/root';
import stylesheet from './app.css?url';
import Navbar from './components/Navbar';
import FastChat from './components/FastChat';
import { MessageSquare, X } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  { rel: 'stylesheet', href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>OJT DTR - Internship Attendance System</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

import { useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { API_URL } from './config';

const hideNavbarRoutes = ['/login', '/register', '/forgot-password', '/admin/login', '/admin'];
const isAdminRoute = (path: string) => path.startsWith('/admin');
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

if (typeof window !== 'undefined' && !(window as any).__fetch_patched) {
  (window as any).__fetch_patched = true;
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    const token = localStorage.getItem('session_token');
    if (token && typeof resource === 'string' && resource.includes(API_URL)) {
      config = config || {};
      const headers = new Headers(config.headers);
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      config.headers = headers;
    }
    return originalFetch(resource, config);
  };
}

export default function App() {
  const location = useLocation();
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  const navigate = useNavigate();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread count (Intern side only)
  useEffect(() => {
    if (!showNavbar) return;
    
    const fetchUnread = async () => {
      const token = localStorage.getItem('session_token') || localStorage.getItem('token');
      if (!token) return;
      try {
        const resp = await fetch(`${API_URL}/api/chat/unread/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const d = await resp.json();
          if (d.unread_count !== undefined) setUnreadCount(d.unread_count);
        }
      } catch (err) {
        console.error("Unread fetch error:", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [showNavbar]);

  useEffect(() => {
    const firstVisit = localStorage.getItem('tour_done');

    if (!firstVisit) {
      setRunTour(true);
      localStorage.setItem('tour_done', 'true');
    }
  }, []);

    // Authentication & Inactivity Guard
    useEffect(() => {
        // Skip intern guard for admin routes
        if (isAdminRoute(location.pathname)) return;

        if (localStorage.getItem('no_remember') === 'true') {
            if (!sessionStorage.getItem('session_active')) {
                localStorage.removeItem('student_id');
                localStorage.removeItem('name');
                localStorage.removeItem('session_token');
                localStorage.removeItem('admin_token');
                localStorage.removeItem('no_remember');
            }
        }
        sessionStorage.setItem('session_active', 'true');

        const student_id = localStorage.getItem('student_id');
        const token = localStorage.getItem('session_token');
        const isAuthenticated = student_id !== null && token !== null;
        
        if (!isAuthenticated && !hideNavbarRoutes.includes(location.pathname)) {
            localStorage.removeItem('student_id');
            localStorage.removeItem('name');
            localStorage.removeItem('session_token');
            localStorage.removeItem('admin_token');
            navigate('/login', { replace: true });
            return;
        }
    
    // Check Single Active Session
    const checkSession = () => {
      if (student_id && token && !hideNavbarRoutes.includes(location.pathname)) {
        fetch(`${API_URL}/api/verify-session/?student_id=${student_id}&token=${token}`)
          .then(res => res.json())
          .then(data => {
            if (data.valid === false || data.error) {
               localStorage.removeItem('student_id');
               localStorage.removeItem('name');
               localStorage.removeItem('session_token');
               // Avoid alerting if already on login page
               if (!window.location.pathname.includes('/login')) {
                 alert("Your session has expired. Please log in again.");
                 navigate('/login', { replace: true });
               }
            }
          })
          .catch(() => {});
      }
    };

    checkSession();
    const intervalId = setInterval(checkSession, 10000);

    // Only run activity tracker if authenticated
    if (!isAuthenticated || hideNavbarRoutes.includes(location.pathname)) {
      return () => clearInterval(intervalId);
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.removeItem('student_id');
        localStorage.removeItem('name');
        setSessionExpired(true);
      }, SESSION_TIMEOUT_MS);
    };

    // Initialize timer
    handleActivity();

    // Listen for user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
    ];
    activityEvents.forEach((event) =>
      document.addEventListener(event, handleActivity)
    );

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      activityEvents.forEach((event) =>
        document.removeEventListener(event, handleActivity)
      );
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timer = setTimeout(() => {
      window.location.reload();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`min-h-[100dvh] bg-white text-gray-800 font-sans selection:bg-green-200 ${showNavbar ? 'pb-20' : ''}`}
    >
      <AppTour run={runTour} setRun={setRunTour} />
      <Tooltip id="nav-tooltip" place="top" style={{ zIndex: 100, backgroundColor: '#14532D', fontWeight: 'bold' }} />

      <Outlet />
      {showNavbar && <Navbar />}

      {/* GLOBAL CHAT (Intern side only - hidden for admin dashboard) */}
      {showNavbar && !location.pathname.includes('/admin') && (
        <>
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-20 right-6 w-14 h-14 bg-white border-[3px] border-green-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(20,83,45,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all z-[9999] rounded-2xl active:scale-90"
          >
            <div className="relative pointer-events-none">
              <MessageSquare size={28} className="text-green-900" strokeWidth={2.5} />
              {(unreadCount || 0) > 0 && (
                <span className="absolute -top-4 -right-4 bg-red-600 border-2 border-green-900 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black animate-bounce shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>

          <FastChat 
            peerId="admin" 
            peerName="Administrator" 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
          />
        </>
      )}

      {sessionExpired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-green-900/90">
          <div className="bg-white p-10 w-full max-w-md rounded-lg shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            {/* Custom Icon wrapper */}
            <div className="mb-6 relative flex justify-center items-center">
              <svg
                width="120"
                height="90"
                viewBox="0 0 120 90"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Shadow/Base */}
                <ellipse cx="60" cy="80" rx="35" ry="5" fill="#DCFCE7" />
                {/* Wifi signals */}
                <path
                  d="M32 25 Q 36 21 40 25"
                  stroke="#86EFAC"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M26 30 Q 34 20 42 30"
                  stroke="#BBF7D0"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Browser Window */}
                <rect
                  x="35"
                  y="32"
                  width="50"
                  height="34"
                  rx="4"
                  stroke="#166534"
                  strokeWidth="2.5"
                  fill="white"
                />
                {/* Top Bar Line */}
                <path d="M35 40.5H85" stroke="#166534" strokeWidth="2.5" />
                {/* Top Bar Dots */}
                <circle cx="41" cy="36.5" r="1.2" fill="#166534" />
                <circle cx="45" cy="36.5" r="1.2" fill="#166534" />
                <circle cx="49" cy="36.5" r="1.2" fill="#166534" />
                {/* Eyes */}
                <circle cx="48" cy="52" r="1.8" fill="#166534" />
                <circle cx="68" cy="52" r="1.8" fill="#166534" />
                {/* Smile */}
                <path
                  d="M54 58 Q 58 62 62 58"
                  stroke="#166534"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Floating Refresh Bubble */}
                <circle
                  cx="85"
                  cy="27"
                  r="11"
                  fill="white"
                  stroke="#166534"
                  strokeWidth="2"
                />
                {/* Refresh Arrow */}
                <path
                  d="M85 21 A 5.5 5.5 0 1 1 79.5 26.5"
                  stroke="#166534"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M79.5 26.5 L 82.5 26.5 M79.5 26.5 L 79.5 23"
                  stroke="#166534"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>

            <h3 className="text-[22px] font-semibold text-[#3b435c] mb-3">
              Your session has expired
            </h3>
            <p className="text-[#8492a6] text-[15px] mb-8 leading-relaxed max-w-[300px]">
              Please refresh the page. Don't worry, we kept all of your filters
              and breakdowns in place.
            </p>

            <button
              onClick={() => {
                setSessionExpired(false);
                window.location.href = '/login';
              }}
              className="px-10 py-3 bg-green-700 text-white rounded-full hover:bg-green-800 transition-colors font-medium text-[15px] shadow-md"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-24 p-6 container mx-auto text-center min-h-[50vh] flex flex-col items-center justify-center">
      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 border-[3px] border-red-100 animate-bounce">
        <X size={40} strokeWidth={3} />
      </div>
      <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">{message}</h1>
      <p className="text-lg text-gray-500 font-medium mb-8 max-w-md mx-auto">{details}</p>
      
      {stack && (
        <div className="w-full max-w-3xl bg-gray-900 rounded-3xl p-6 text-left overflow-hidden shadow-2xl border-4 border-gray-800">
           <div className="flex items-center gap-2 mb-4">
             <div className="w-3 h-3 rounded-full bg-red-500" />
             <div className="w-3 h-3 rounded-full bg-amber-500" />
             <div className="w-3 h-3 rounded-full bg-emerald-500" />
             <span className="ml-2 text-[10px] font-black text-white/40 uppercase tracking-widest">Debug Console</span>
           </div>
           <pre className="w-full overflow-x-auto text-xs text-red-400 font-mono custom-scrollbar">
             <code>{stack}</code>
           </pre>
        </div>
      )}

      <button 
        onClick={() => window.location.href = '/'}
        className="mt-10 px-8 py-4 bg-green-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(20,83,45,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95"
      >
        Back to Dashboard
      </button>
    </main>
  );
}

export function HydrateFallback() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[10000]">
      <div className="relative group">
        {/* Shimmering circle background */}
        <div className="absolute -inset-8 bg-green-50 rounded-full blur-3xl group-hover:bg-green-100 transition-all duration-1000 animate-pulse" />
        
        {/* App Logo/Icon Container */}
        <div className="relative w-32 h-32 bg-white border-[6px] border-green-900 rounded-[2.5rem] flex items-center justify-center shadow-[12px_12px_0px_0px_rgba(20,83,45,1)] animate-in zoom-in-50 duration-500">
          <svg
            width="60"
            height="60"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-green-900"
          >
            <path
              d="M10 30H110V100C110 105.523 105.523 110 100 110H20C14.4772 110 10 105.523 10 100V30Z"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinejoin="round"
            />
            <path
              d="M10 30L60 10L110 30"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="60" cy="65" r="15" fill="currentColor" />
          </svg>
        </div>
      </div>
      
      <div className="mt-16 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-300">
        <h2 className="text-2xl font-black text-green-900 uppercase tracking-[0.2em]">OJT DTR System</h2>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-900 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-3 h-3 bg-green-900 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-3 h-3 bg-green-900 rounded-full animate-bounce" />
        </div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Initializing Application</p>
      </div>
    </div>
  );
}
