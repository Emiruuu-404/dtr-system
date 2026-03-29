import { useState, useEffect } from "react";
import { Trophy, Medal, Star } from "lucide-react";
import { API_URL } from "../config";
import { useNavigate } from "react-router";

export default function Leaderboards() {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${API_URL}/api/leaderboards/`)
            .then(res => res.json())
            .then((data) => {
                if (data.leaderboard) {
                    setLeaderboard(data.leaderboard);
                }
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    return (
        <div className="p-6 max-w-md mx-auto pb-24">
            <header className="mb-8 mt-4 text-center border-b-2 border-green-900 pb-6">
                <div className="w-20 h-20 bg-green-200 border-2 border-green-900 flex items-center justify-center mx-auto mb-5 relative hover:-translate-y-2 transition-transform shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                    <Trophy size={36} strokeWidth={3} className="text-green-900" />
                </div>
                <h1 className="text-3xl font-black text-green-900 mb-2 uppercase tracking-tight">Leaderboards</h1>
                <p className="text-green-800 font-bold uppercase tracking-widest text-xs">Top OJT Hours Rankings</p>
            </header>

            <div className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-4 border-2 border-green-900 flex items-center justify-between bg-white shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="w-10 h-10 border-2 border-green-900 bg-gray-200 animate-pulse shadow-[2px_2px_0px_0px_rgba(20,83,45,1)] shrink-0"></div>
                                    <div className="flex flex-col gap-2 w-full max-w-[150px]">
                                        <div className="h-5 bg-gray-200 animate-pulse w-full"></div>
                                        <div className="h-3 bg-gray-200 animate-pulse w-2/3"></div>
                                    </div>
                                </div>
                                <div className="w-16 h-8 bg-gray-200 animate-pulse shrink-0"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    leaderboard.map((user, index) => {
                        const isTop3 = index < 3;
                        let Icon = Star;
                        let iconColor = "text-gray-500";
                        let bgColor = "bg-white";

                        if (index === 0) {
                            Icon = Trophy;
                            iconColor = "text-yellow-600";
                            bgColor = "bg-yellow-100";
                        } else if (index === 1) {
                            Icon = Medal;
                            iconColor = "text-gray-600";
                            bgColor = "bg-gray-200";
                        } else if (index === 2) {
                            Icon = Medal;
                            iconColor = "text-amber-700";
                            bgColor = "bg-amber-100";
                        }

                        return (
                            <div key={user.id} className={`p-4 border-2 border-green-900 flex items-center justify-between ${bgColor} shadow-[4px_4px_0px_0px_rgba(20,83,45,1)] transition-transform hover:-translate-y-1`}>
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 border-2 border-green-900 bg-white flex items-center justify-center font-black text-green-900 shadow-[2px_2px_0px_0px_rgba(20,83,45,1)] shrink-0 overflow-hidden">
                                        {user.profile_picture ? (
                                            <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>#{user.rank}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-black text-gray-900 uppercase tracking-wide truncate text-sm sm:text-base flex items-center gap-2">
                                            {user.name}
                                            {user.profile_picture && <span className="text-[10px] bg-green-900 text-white px-1 font-bold">#{user.rank}</span>}
                                        </h3>
                                        <p className="font-bold text-gray-600 text-[10px] tracking-widest uppercase">Hours Rendered</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                    <div className="flex flex-col items-end">
                                        <div className="font-black text-base text-green-900 whitespace-nowrap text-right">{user.formatted_hours || user.hours}</div>
                                        <div className="flex gap-1 items-center">
                                            {isTop3 && <Icon size={14} strokeWidth={3} className={`${iconColor} shrink-0`} />}
                                            <span className="text-[10px] font-black uppercase text-gray-400">Hours</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
