import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";
import Navbar from "./components/Navbar";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
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

import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";

const hideNavbarRoutes = ["/login", "/register", "/forgot-password"];
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

export default function App() {
  const location = useLocation();
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  const navigate = useNavigate();
  const [sessionExpired, setSessionExpired] = useState(false);

  // Authentication & Inactivity Guard
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("student_id") !== null;
    if (!isAuthenticated && !hideNavbarRoutes.includes(location.pathname)) {
      navigate("/login", { replace: true });
      return;
    }

    // Only run activity tracker if authenticated
    if (!isAuthenticated || hideNavbarRoutes.includes(location.pathname)) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.removeItem("student_id");
        localStorage.removeItem("name");
        setSessionExpired(true);
      }, SESSION_TIMEOUT_MS);
    };

    // Initialize timer
    handleActivity();

    // Listen for user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => document.addEventListener(event, handleActivity));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timer = setTimeout(() => {
      window.location.reload();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-[100dvh] bg-white text-gray-800 font-sans selection:bg-green-200 ${showNavbar ? "pb-20" : ""}`}>
      <Outlet />
      {showNavbar && <Navbar />}

      {sessionExpired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2f75ed]">
          <div className="bg-white p-10 w-full max-w-md rounded-lg shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            
            {/* Custom Icon wrapper */}
            <div className="mb-6 relative flex justify-center items-center">
              <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Shadow/Base */}
                <ellipse cx="60" cy="80" rx="35" ry="5" fill="#E8F0FE" />
                {/* Wifi signals */}
                <path d="M32 25 Q 36 21 40 25" stroke="#B3D4FF" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M26 30 Q 34 20 42 30" stroke="#D9E6FB" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Browser Window */}
                <rect x="35" y="32" width="50" height="34" rx="4" stroke="#2B6BDB" strokeWidth="2.5" fill="white" />
                {/* Top Bar Line */}
                <path d="M35 40.5H85" stroke="#2B6BDB" strokeWidth="2.5"/>
                {/* Top Bar Dots */}
                <circle cx="41" cy="36.5" r="1.2" fill="#2B6BDB"/>
                <circle cx="45" cy="36.5" r="1.2" fill="#2B6BDB"/>
                <circle cx="49" cy="36.5" r="1.2" fill="#2B6BDB"/>
                {/* Eyes */}
                <circle cx="48" cy="52" r="1.8" fill="#2B6BDB"/>
                <circle cx="68" cy="52" r="1.8" fill="#2B6BDB"/>
                {/* Smile */}
                <path d="M54 58 Q 58 62 62 58" stroke="#2B6BDB" strokeWidth="2" strokeLinecap="round" />
                {/* Floating Refresh Bubble */}
                <circle cx="85" cy="27" r="11" fill="white" stroke="#2B6BDB" strokeWidth="2"/>
                {/* Refresh Arrow */}
                <path d="M85 21 A 5.5 5.5 0 1 1 79.5 26.5" stroke="#2B6BDB" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <path d="M79.5 26.5 L 82.5 26.5 M79.5 26.5 L 79.5 23" stroke="#2B6BDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>

            <h3 className="text-[22px] font-semibold text-[#3b435c] mb-3">Your session has expired</h3>
            <p className="text-[#8492a6] text-[15px] mb-8 leading-relaxed max-w-[300px]">
              Please refresh the page. Don't worry, we kept all of your filters and breakdowns in place.
            </p>

            <button
              onClick={() => {
                setSessionExpired(false);
                window.location.href = "/login";
              }}
              className="px-10 py-3 bg-[#2f75ed] text-white rounded-full hover:bg-blue-700 transition-colors font-medium text-[15px] shadow-md"
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
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
