import { useState, useEffect } from "react";
import { Trophy, Medal, Star, X, Mail, GraduationCap, MapPin, Loader2, Clock } from "lucide-react";
import { API_URL } from "../config";
import { useNavigate } from "react-router";

export default function Leaderboards() {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
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

    const viewProfile = (user: any) => {
        setSelectedUser(user);
        setProfileLoading(true);
        setProfileData(null);
        
        fetch(`${API_URL}/api/profile/?student_id=${user.student_id}`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setProfileData(data);
                }
                setProfileLoading(false);
            })
            .catch(() => setProfileLoading(false));
    };

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
                            <div 
                                key={user.id} 
                                onClick={() => viewProfile(user)}
                                className={`p-4 border-2 border-green-900 flex items-center justify-between ${bgColor} shadow-[4px_4px_0px_0px_rgba(20,83,45,1)] transition-transform hover:-translate-y-1 cursor-pointer active:translate-x-1 active:translate-y-1 active:shadow-none`}
                            >
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

            {/* Profile Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm border-4 border-green-900 shadow-[10px_10px_0px_0px_rgba(20,83,45,1)] relative overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header/Profile Cover */}
                        <div className="h-24 bg-green-900 relative">
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-3 right-3 bg-white text-green-900 p-1.5 border-2 border-green-900 hover:bg-green-100 transition-colors z-10"
                            >
                                <X size={18} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Profile Info Body */}
                        <div className="px-6 pb-6 pt-12 relative">
                            {/* Avatar */}
                            <div className="absolute -top-12 left-6 w-24 h-24 border-4 border-green-900 bg-white shadow-[4px_4px_0px_0px_rgba(20,83,45,1)] overflow-hidden">
                                {selectedUser.profile_picture ? (
                                    <img src={selectedUser.profile_picture} alt={selectedUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-green-100 flex items-center justify-center font-black text-3xl text-green-900">
                                        {selectedUser.name.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {profileLoading ? (
                                <div className="space-y-4 mt-2">
                                    <div className="h-6 w-3/4 bg-gray-200 animate-pulse"></div>
                                    <div className="h-4 w-1/2 bg-gray-200 animate-pulse"></div>
                                    <div className="space-y-2 py-4 border-y-2 border-gray-100">
                                        <div className="h-4 w-full bg-gray-100 animate-pulse"></div>
                                        <div className="h-4 w-full bg-gray-100 animate-pulse"></div>
                                    </div>
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="animate-spin text-green-900" size={32} />
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2">
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">
                                        {profileData?.name || selectedUser.name}
                                    </h2>
                                    <div className="flex items-center gap-2 text-green-800 font-bold text-xs uppercase tracking-widest mb-6">
                                        <span className="bg-green-100 px-2 py-0.5 border border-green-900">Rank #{selectedUser.rank}</span>
                                        <span className="text-gray-400">•</span>
                                        <span>{profileData?.student_id || selectedUser.student_id}</span>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 border border-green-900 text-green-900">
                                                <GraduationCap size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Course</p>
                                                <p className="font-bold text-gray-800 text-sm">{profileData?.course || "Not specified"}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 border border-green-900 text-green-900">
                                                <MapPin size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">School</p>
                                                <p className="font-bold text-gray-800 text-sm">{profileData?.school || "Not specified"}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 border border-green-900 text-green-900">
                                                <Mail size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Email</p>
                                                <p className="font-bold text-gray-800 text-sm truncate max-w-[200px]">{profileData?.email || "--"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-px bg-green-900 border-2 border-green-900 shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
                                        <div className="bg-white p-4">
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1">
                                                <Clock size={10} strokeWidth={3} className="text-green-600" /> TOTAL HOURS
                                            </p>
                                            <p className="text-xl font-black text-green-900 leading-none">
                                                {profileData?.formatted_total_hours?.split(' ')[0] || selectedUser.hours}
                                                <span className="text-xs ml-1">HRS</span>
                                            </p>
                                        </div>
                                        <div className="bg-white p-4">
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1">
                                                <Medal size={10} strokeWidth={3} className="text-yellow-600" /> PROGRESS
                                            </p>
                                            <p className="text-xl font-black text-green-900 leading-none">
                                                {(((profileData?.total_hours || selectedUser.hours) / 486) * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-green-50 border-t-2 border-green-900 p-4">
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="w-full bg-green-900 text-white font-black uppercase tracking-[0.2em] py-3 border-2 border-green-900 hover:bg-green-800 transition-colors shadow-[4px_4px_0px_0px_rgba(20,83,45,0.2)] active:shadow-none active:translate-x-1 active:translate-y-1"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

