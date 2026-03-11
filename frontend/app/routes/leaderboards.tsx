import { useState, useEffect } from "react";
import { Trophy, Medal, Star } from "lucide-react";
import { API_URL } from "../config";

export default function Leaderboards() {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/leaderboards/`)
            .then(res => res.json())
            .then(data => {
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
                    <div className="flex justify-center p-12">
                        <div className="w-12 h-12 border-4 border-green-900 border-t-transparent rounded-full animate-spin"></div>
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
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 border-2 border-green-900 bg-white flex items-center justify-center font-black text-green-900 shadow-[2px_2px_0px_0px_rgba(20,83,45,1)]">
                                        #{user.rank}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900 uppercase tracking-wide">{user.name}</h3>
                                        <p className="font-bold text-gray-600 text-[10px] tracking-widest uppercase">Hours Rendered</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="font-black text-xl text-green-900">{user.hours}</div>
                                    {isTop3 && <Icon size={24} strokeWidth={3} className={iconColor} />}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
