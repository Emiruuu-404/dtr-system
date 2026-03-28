import { NavLink } from "react-router";
import { LayoutDashboard, Clock, Trophy, MessageSquare, History, FileText, Settings } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors border-t-4 ${isActive ? "text-green-900 border-green-900 bg-green-100" : "text-gray-500 border-transparent hover:text-green-800 hover:bg-green-50"
        }`;

    // Only attach tooltip attributes on non-mobile screens
    const tooltipProps = (content: string) =>
        isMobile ? {} : { "data-tooltip-id": "nav-tooltip", "data-tooltip-content": content };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-900 h-16 flex justify-around items-stretch z-50">
            <NavLink to="/" className={(props) => `${navLinkClass(props)} tour-home`} {...tooltipProps("Dashboard Home")}>
                <LayoutDashboard strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">Home</span>
            </NavLink>
            <NavLink to="/timein" className={(props) => `${navLinkClass(props)} tour-timein`} {...tooltipProps("Submit Accomplishment / Logs")}>
                <Clock strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">Logs</span>
            </NavLink>
            <NavLink to="/leaderboards" className={(props) => `${navLinkClass(props)} tour-leaderboards`} {...tooltipProps("Check Intern Rankings")}>
                <Trophy strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">Rank</span>
            </NavLink>
            <NavLink to="/chat" className={(props) => `${navLinkClass(props)} tour-chat`} {...tooltipProps("Chat with Interns/Admins")}>
                <MessageSquare strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">Chat</span>
            </NavLink>
            <NavLink to="/history" className={(props) => `${navLinkClass(props)} tour-history`} {...tooltipProps("View & Edit History")}>
                <History strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">History</span>
            </NavLink>
            <NavLink to="/reports" className={(props) => `${navLinkClass(props)} tour-reports`} {...tooltipProps("Download DTR Documents")}>
                <FileText strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">DTR</span>
            </NavLink>
            <NavLink to="/settings" className={(props) => `${navLinkClass(props)} tour-settings`} {...tooltipProps("Account Settings")}>
                <Settings strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">More</span>
            </NavLink>
        </div>
    );
}