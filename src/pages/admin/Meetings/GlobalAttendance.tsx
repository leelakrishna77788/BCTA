import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Calendar,
  Check,
  X,
  AlertCircle,
  Download,
  TrendingUp,
  BarChart3,
  Award,
} from "lucide-react";
import { db } from "../../../firebase/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import toast from "react-hot-toast";

interface Meeting {
  id: string;
  topic?: string;
  date?: any;
  displayDate?: string;
  [key: string]: any;
}

interface Member {
  id: string;
  name?: string;
  memberId?: string;
  role?: string;
  [key: string]: any;
}

const GlobalAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    avgAttendance: "0",
    totalPresent: 0,
    topMember: "",
  });

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        setLoading(true);
        // 1. Get Meetings
        const mSnap = await getDocs(collection(db, "meetings"));
        let mList = mSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Meeting,
        );

        // Safe date sorting
        mList.sort((a, b) => {
          const dateA = a.date?.toDate
            ? a.date.toDate()
            : new Date(a.date || 0);
          const dateB = b.date?.toDate
            ? b.date.toDate()
            : new Date(b.date || 0);
          return dateB.getTime() - dateA.getTime();
        });

        mList = mList
          .map((m) => ({
            ...m,
            displayDate: m.date?.toDate
              ? m.date.toDate().toLocaleDateString()
              : typeof m.date === "string"
                ? m.date
                : "No Date",
          }))
          .slice(0, 20); // Show more meetings now that it's structurable
        setMeetings(mList);

        // 2. Get Members
        const uSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "member")),
        );
        const uList = uSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Member,
        );
        uList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setMembers(uList);

        // 3. Get Attendance
        const aSnap = await getDocs(collection(db, "attendance"));
        const aMap: Record<string, Record<string, boolean>> = {};
        let totalPresentCount = 0;
        const memberPresences: Record<string, number> = {};

        aSnap.docs.forEach((doc) => {
          const data = doc.data();
          const uid = data?.memberUID || data?.memberId;
          const mapId = data?.meetingId;
          
          if (uid && mapId) {
            if (!aMap[uid]) aMap[uid] = {};
            // Make sure we only increment logic ONCE per member/meeting combo
            if (!aMap[uid][mapId]) {
               aMap[uid][mapId] = true;
               totalPresentCount++;
               memberPresences[uid] = (memberPresences[uid] || 0) + 1;
            }
          }
        });
        setAttendanceMap(aMap);

        // Calculate Stats
        const avg =
          mList.length > 0
            ? (totalPresentCount / mList.length).toFixed(1)
            : "0";
        let topM = "N/A";
        let maxP = -1;
        uList.forEach((m) => {
          if ((memberPresences[m.id] || 0) > maxP) {
            maxP = memberPresences[m.id] || 0;
            topM = m.name || "Unknown";
          }
        });

        setStats({
          avgAttendance: avg,
          totalPresent: totalPresentCount,
          topMember: topM,
        });

        setLoading(false);
      } catch (err: any) {
        console.error("Global Attendance Error:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchGlobalData();
  }, []);

  const handleDownloadExcel = () => {
    try {
      // 1. Prepare Headers
      const staticHeaders = ["Member Name", "Member ID", "Total Presence"];
      const meetingHeaders = meetings.map(
        (m) => `${m.displayDate} - ${m.topic || "Meeting"}`,
      );
      const headers = [...staticHeaders, ...meetingHeaders];

      // 2. Prepare Rows
      const rows = members.map((member) => {
        const attendedCount = Object.keys(
          attendanceMap[member.id] || {},
        ).length;
        
        // Ensure we're using the human-readable BCTA-ID, not the long Firestore UID
        const row = [member.name || "Unknown", member.memberId || "Pending", attendedCount];

        meetings.forEach((m) => {
          row.push(attendanceMap[member.id]?.[m.id] ? "Present" : "Absent");
        });

        return row;
      });

      // 3. Convert to CSV String (Structured with title spacing)
      const reportTitle = `"Global Attendance Report - Generated on: ${new Date().toLocaleDateString()}"`;
      
      const csvContent = [
        reportTitle, // Custom title for visual spacing in excel
        "", // Blank line for spacing
        headers.map(h => `"${h}"`).join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      // 4. Trigger Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `BCTA_Attendance_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Attendance report structured and downloaded!");
    } catch (err) {
      console.error("CSV Export Error:", err);
      toast.error("Failed to generate report");
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 bg-slate-50/50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-black text-xl tracking-tight mb-1">
            Generating Global Matrix
          </p>
          <p className="text-slate-400 text-sm font-medium">
            Please wait while we compile the attendance records...
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="card border-rose-100 bg-rose-50/50 p-10 text-center max-w-xl w-full shadow-2xl shadow-rose-100/50 rounded-[40px] border">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-rose-900 font-black text-2xl mb-3 tracking-tight">
            Report Generation Failed
          </h2>
          <p className="text-rose-700/70 mb-8 font-medium leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-[0.98]"
          >
            Retry Generation
          </button>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20 px-1 sm:px-0">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-5">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-sm hover:shadow-xl hover:border-slate-300 hover:text-[#4f46e5] transition-all active:scale-90"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tighter">
              Attendance Report
            </h1>
            <p className="text-slate-500 font-medium text-[10px] sm:text-sm mt-1 uppercase sm:normal-case tracking-wider sm:tracking-normal">
              Cross-meeting attendance matrix
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadExcel}
          className="flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 bg-[#4f46e5] text-white rounded-2xl font-bold text-xs sm:text-base shadow-2xl shadow-slate-200 hover:bg-[#4338ca] transition-all active:scale-95 group w-full sm:w-auto"
        >
          <Download
            size={18}
            className="group-hover:-translate-y-0.5 transition-transform"
          />
          <span>Download Report</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Total Members"
          value={members.length}
          color="blue"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="Processed Meetings"
          value={meetings.length}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Avg. Attendance"
          value={stats.avgAttendance}
          color="emerald"
          suffix="per mtg"
        />
        <StatCard
          icon={<Award size={20} />}
          label="Top Attendee"
          value={stats.topMember}
          color="amber"
          subValue="Most Consistent"
        />
      </div>

      {/* Matrix / Card View */}
      <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden relative">
        {/* Desktop Matrix View */}
        <div className="hidden md:block overflow-x-auto ">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-slate-50/90 backdrop-blur-xl border-b border-slate-200">
                <th className="p-6 font-black text-slate-900 min-w-[260px] sticky left-0 bg-slate-50 z-40 border-r border-slate-200 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-[#4f46e5] rounded-full animate-pulse"></div>
                    <span className="tracking-tight uppercase text-xs text-slate-500">
                      Member Directory
                    </span>
                  </div>
                </th>
                {meetings.map((m) => (
                  <th
                    key={m.id}
                    className="p-6 text-center border-r border-slate-100 last:border-r-0 min-w-[160px]"
                  >
                    <div className="text-[10px] text-[#4f46e5] font-black uppercase tracking-widest mb-1 opacity-70">
                      {m.displayDate}
                    </div>
                    <div
                      className="text-[14px] font-black text-slate-900 truncate mx-auto leading-none"
                      style={{ maxWidth: "120px" }}
                      title={m.topic}
                    >
                      {m.topic || "Meeting"}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => {
                const attendedCount = Object.keys(
                  attendanceMap[member.id] || {},
                ).length;
                const attendancePercent =
                  meetings.length > 0
                    ? Math.round((attendedCount / meetings.length) * 100)
                    : 0;

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="p-5 sticky left-0 bg-white group-hover:bg-slate-50/50 z-20 border-r border-slate-200 shadow-[5px_0_15px_rgba(0,0,0,0.01)]">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-11 h-11 rounded-[1.25rem] bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-black text-sm shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            {(member.name?.[0] || "U").toUpperCase()}
                          </div>
                          <div
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${attendancePercent > 70 ? "bg-emerald-500" : "bg-slate-400"}`}
                          >
                            {attendancePercent}%
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-[15px] truncate tracking-tight leading-tight">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
                            {member.memberId || "PENDING"}
                          </p>
                        </div>
                      </div>
                    </td>
                    {meetings.map((m) => {
                      const isPresent = attendanceMap[member.id]?.[m.id];
                      return (
                        <td
                          key={m.id}
                          className="p-4 text-center border-r border-slate-50/50 last:border-r-0"
                        >
                          <div className="flex justify-center transition-all duration-300 group-hover:scale-105">
                            {isPresent ? (
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-inner border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <Check size={22} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-red-100 text-red-700 rounded-[1.25rem] flex items-center justify-center border border-red-200 group-hover:bg-red-200 group-hover:text-red-800 transition-all">
                                <X size={16} />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4  bg-slate-50/30">
          {members.map((member) => {
            const attendedCount = Object.keys(
              attendanceMap[member.id] || {},
            ).length;
            const attendancePercent =
              meetings.length > 0
                ? Math.round((attendedCount / meetings.length) * 100)
                : 0;

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                      {(member.name?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm leading-tight">
                        {member.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {member.memberId || "PENDING"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-black px-2.5 py-1 rounded-lg ${attendancePercent > 70 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                    >
                      {attendancePercent}%
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      {attendedCount}/{meetings.length} Met
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {meetings.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                          attendanceMap[member.id]?.[m.id]
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                            : "bg-red-50 border-red-100 text-red-500"
                        }`}
                      >
                        {attendanceMap[member.id]?.[m.id] ? (
                          <Check size={14} strokeWidth={3} />
                        ) : (
                          <X size={12} />
                        )}
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        {m.displayDate?.split("/")[0]}/
                        {m.displayDate?.split("/")[1]}
                      </span>
                    </div>
                  ))}
                  {meetings.length > 5 && (
                    <div className="flex flex-col items-center gap-1 opacity-50">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <span className="text-[10px] font-black">
                          +{meetings.length - 5}
                        </span>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        More
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && !loading && (
          <div className="p-32 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-6 border border-slate-100">
              <Users size={40} className="text-slate-200" />
            </div>
            <h3 className="text-slate-900 font-black text-2xl tracking-tight">
              No Members Found
            </h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 font-medium">
              Only users with the active "member" role will appear in this
              compiled report.
            </p>
          </div>
        )}
      </div>

      <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f8fafc;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "purple" | "emerald" | "amber";
  suffix?: string;
  subValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  color,
  suffix,
  subValue,
}) => {
  const colorMap = {
    blue: "bg-indigo-50/50 text-indigo-600 border-indigo-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${colorMap[color]}`}
      >
        {icon}
      </div>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
          {value}
        </h3>
        {suffix && (
          <span className="text-xs font-bold text-slate-400 lowercase">
            {suffix}
          </span>
        )}
      </div>
      {subValue && (
        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
          {subValue}
        </p>
      )}
    </div>
  );
};

export default GlobalAttendance;
