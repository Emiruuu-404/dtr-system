import { NavLink } from "react-router";
import { LayoutDashboard, Clock, Trophy, History, FileText, Settings } from "lucide-react";

export default function Navbar() {
    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors border-t-4 ${isActive ? "text-green-900 border-green-900 bg-green-100" : "text-gray-500 border-transparent hover:text-green-800 hover:bg-green-50"
        }`;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-900 h-16 flex justify-around items-stretch z-50">
            <NavLink to="/" className={navLinkClass}>
                <LayoutDashboard strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">Home</span>
            </NavLink>
            <NavLink to="/timein" className={navLinkClass}>
                <Clock strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">Logs</span>
            </NavLink>
            <NavLink to="/leaderboards" className={navLinkClass}>
                <Trophy strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">Rank</span>
            </NavLink>
            <NavLink to="/history" className={navLinkClass}>
                <History strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">History</span>
            </NavLink>
            <NavLink to="/reports" className={navLinkClass}>
                <FileText strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">DTR</span>
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
                <Settings strokeWidth={3} size={18} />
                <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">More</span>
            </NavLink>
        </div>
    );
}