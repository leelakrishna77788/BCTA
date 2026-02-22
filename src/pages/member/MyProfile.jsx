import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Droplet, MapPin, User, Phone, CreditCard } from "lucide-react";

const MyProfile = () => {
    const { userProfile } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!currentUser) return;
        getDocs(query(collection(db, "attendance"), where("memberUID", "==", currentUser.uid)))
            .then(snap => setAttendance(snap.docs.map(d => d.data())));
    }, [currentUser]);

    if (!userProfile) return null;

    return (
        <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
            <h1 className="page-title mb-0">My Profile</h1>

            {/* Profile Card */}
            <div className="card text-center">
                {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-blue-100 mx-auto" />
                ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold mx-auto">
                        {userProfile.name?.[0]}
                    </div>
                )}
                <h2 className="text-xl font-bold text-slate-800 mt-3">{userProfile.name} {userProfile.surname}</h2>
                <p className="font-mono text-blue-600 text-sm">{userProfile.memberId}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${userProfile.status === "active" ? "badge-active" : "badge-blocked"}`}>
                        {userProfile.status}
                    </span>
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Droplet size={10} /> {userProfile.bloodGroup}
                    </span>
                </div>
            </div>

            {/* Details */}
            <div className="card">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Personal Details</h3>
                <dl className="space-y-3">
                    {[
                        { label: "Full Name", value: `${userProfile.surname} ${userProfile.name}` },
                        { label: "Age", value: `${userProfile.age} years` },
                        { label: "Gender", value: userProfile.gender },
                        { label: "Blood Group", value: userProfile.bloodGroup },
                        { label: "Email", value: userProfile.email },
                        { label: "Aadhaar", value: `XXXX-XXXX-XXXX-${userProfile.aadhaarLast4}` },
                    ].map(d => (
                        <div key={d.label} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
                            <dt className="text-xs text-slate-500">{d.label}</dt>
                            <dd className="text-sm font-medium text-slate-800">{d.value || "—"}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            {/* Shop & Nominee */}
            <div className="card">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <MapPin size={14} /> Shop & Nominee
                </h3>
                <p className="text-sm text-slate-600 mb-2">{userProfile.shopAddress || "No address on file"}</p>
                {userProfile.nomineeDetails?.name && (
                    <div className="p-3 bg-slate-50 rounded-xl text-sm">
                        <p className="font-medium text-slate-700">{userProfile.nomineeDetails.name}</p>
                        <p className="text-xs text-slate-500">{userProfile.nomineeDetails.relation} • {userProfile.nomineeDetails.phone}</p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="card text-center p-4">
                    <p className="text-2xl font-bold text-blue-600">{attendance.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Meetings Attended</p>
                </div>
                <div className="card text-center p-4">
                    <p className={`text-2xl font-bold ${userProfile.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-500"}`}>
                        {userProfile.paymentStatus}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Payment Status</p>
                </div>
                <div className="card text-center p-4">
                    <p className="text-2xl font-bold text-violet-600">{new Date().getFullYear()}</p>
                    <p className="text-xs text-slate-500 mt-1">Member Since</p>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;
