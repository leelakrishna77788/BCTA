import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UserCheck, UserX, Users } from "lucide-react";
import { meetingsApi } from "../../../services/api";

const AttendanceDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [attended, setAttended] = useState([]);
    const [allMembers, setAllMembers] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await meetingsApi.getAttendance(id);
                setMeeting(data.meeting);
                const attendedUIDs = data.attended.map(a => a.memberUID);
                setAttended(data.allMembers.filter(m => attendedUIDs.includes(m.id)));
                setAllMembers(data.allMembers);
            } catch (err) {
                console.error("Failed to fetch attendance:", err);
            }
        };
        fetchData();
    }, [id]);

    const notAttended = allMembers.filter(m => !attended.find(a => a.id === m.id));
    const rate = allMembers.length > 0 ? Math.round((attended.length / allMembers.length) * 100) : 0;

    if (!meeting) return (
        <div className="flex justify-center h-64 items-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="page-title mb-0">Attendance Dashboard</h1>
                    <p className="text-slate-500 text-sm">{meeting?.topic}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Members", value: allMembers.length, color: "bg-blue-600", icon: Users },
                    { label: "Attended", value: attended.length, color: "bg-emerald-500", icon: UserCheck },
                    { label: "Not Attended", value: notAttended.length, color: "bg-red-500", icon: UserX },
                    { label: "Attendance Rate", value: `${rate}%`, color: "bg-violet-500", icon: Users },
                ].map(s => (
                    <div key={s.label} className="stat-card flex-col items-start gap-2 p-4">
                        <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center`}>
                            <s.icon size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-800">{s.value}</p>
                            <p className="text-xs text-slate-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Progress bar */}
            <div className="card">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">Attendance Rate</p>
                    <p className="text-sm text-blue-600 font-bold">{rate}%</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Attended */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                        <UserCheck size={16} /> Attended ({attended.length})
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {attended.map(m => (
                            <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-emerald-50">
                                <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold">
                                    {m.name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{m.name} {m.surname}</p>
                                    <p className="text-xs text-slate-400 font-mono">{m.memberId}</p>
                                </div>
                                <span className="ml-auto badge-active text-xs">✓ Present</span>
                            </div>
                        ))}
                        {attended.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No one has scanned yet</p>}
                    </div>
                </div>

                {/* Not Attended */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                        <UserX size={16} /> Not Attended ({notAttended.length})
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {notAttended.map(m => (
                            <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-red-50">
                                <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-red-700 text-xs font-bold">
                                    {m.name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{m.name} {m.surname}</p>
                                    <p className="text-xs text-slate-400 font-mono">{m.memberId}</p>
                                </div>
                                <span className="ml-auto badge-blocked text-xs">Absent</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDashboard;
