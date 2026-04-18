import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  updateDoc,
  runTransaction,
  setDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { getMeetingById } from "./meetingsService";
import { getMemberById, incrementAttendanceCount } from "./membersService";
import type { AttendanceRecord } from "../types/attendance.types";

/** Response status for attendance operations */
export type AttendanceResult = 
  | "SUCCESS" 
  | "ALREADY_MARKED" 
  | "EXPIRED" 
  | "INVALID_TOKEN" 
  | "BLOCKED" 
  | "OFFLINE"
  | "MEETING_NOT_FOUND"
  | "MEETING_NOT_ACTIVE";

/** Member scans the meeting QR code to mark their own attendance */
export async function recordAttendance(
  meetingId: string,
  token: string,
  memberUID: string
): Promise<AttendanceResult> {
  console.log(`[Attendance] Initiating scan for meeting: ${meetingId}, user: ${memberUID}`);
  
  if (!navigator.onLine) return "OFFLINE";

  // 1. Validate meeting + token
  const meeting = await getMeetingById(meetingId);
  if (!meeting) {
    console.error("[Attendance] Meeting not found:", meetingId);
    return "MEETING_NOT_FOUND";
  }
  
  if (meeting.status !== "active") {
    console.warn("[Attendance] Meeting status is:", meeting.status);
    return "MEETING_NOT_ACTIVE";
  }

  if (meeting.qrToken !== token) {
    console.warn("[Attendance] Token mismatch");
    return "INVALID_TOKEN";
  }

  // 2. Check QR expiry
  if (meeting.qrExpiresAt) {
    const expiresAt =
      typeof (meeting.qrExpiresAt as { toDate?: () => Date }).toDate === "function"
        ? (meeting.qrExpiresAt as { toDate: () => Date }).toDate()
        : new Date(meeting.qrExpiresAt as unknown as string);
    if (new Date() > expiresAt) {
      console.warn("[Attendance] QR Expired");
      return "EXPIRED";
    }
  }

  // 3. Validate member
  const member = await getMemberById(memberUID);
  if (!member) {
    console.error("[Attendance] User doc not found for UID:", memberUID);
    throw new Error("User profile not found in database");
  }

  if (member.status === "blocked") return "BLOCKED";

  // 4. Atomic write with idempotent ID
  const attendanceDocId = `${meetingId}_${memberUID}`;
  const attendanceRef = doc(db, "attendance", attendanceDocId);
  const meetingRef = doc(db, "meetings", meetingId);
  const userRef = doc(db, "users", memberUID);

  try {
    return await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(attendanceRef);
      if (docSnap.exists()) return "ALREADY_MARKED";

      // Write attendance record
      transaction.set(attendanceRef, {
        meetingId,
        memberId: member.memberId || "N/A",
        memberUID,
        memberName: `${member.name} ${member.surname}`.trim(),
        status: "present",
        markedBy: "self",
        scannedAt: serverTimestamp(),
        method: "qr_scan"
      });

      // Increment counters atomically
      transaction.update(meetingRef, { attendanceCount: increment(1) });
      transaction.update(userRef, { attendanceCount: increment(1) });

      console.log("[Attendance] Transaction successful");
      return "SUCCESS";
    });
  } catch (err: any) {
    console.error("[Attendance] Transaction failed:", err);
    throw err; // Re-throw to be handled by UI catch block
  }
}

/**
 * Admin marks attendance for a specific member by scanning their personal QR.
 * Returns the member's full name on success.
 */
export async function recordAttendanceByAdmin(
  meetingId: string,
  memberUID: string
): Promise<{ status: AttendanceResult; name?: string }> {
  console.log(`[AttendanceAdmin] Marking user ${memberUID} for meeting ${meetingId}`);

  // 1. Validate member
  const member = await getMemberById(memberUID);
  if (!member) return { status: "MEETING_NOT_FOUND" }; // Reuse status if member not found
  if (member.status === "blocked") return { status: "BLOCKED" };

  // 2. Atomic write with idempotent ID
  const attendanceDocId = `${meetingId}_${memberUID}`;
  const attendanceRef = doc(db, "attendance", attendanceDocId);
  const meetingRef = doc(db, "meetings", meetingId);
  const userRef = doc(db, "users", memberUID);

  try {
    const resultStatus = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(attendanceRef);
      if (docSnap.exists()) return "ALREADY_MARKED";

      // Write attendance
      transaction.set(attendanceRef, {
        meetingId,
        memberId: member.memberId || "N/A",
        memberUID,
        memberName: `${member.name} ${member.surname}`.trim(),
        status: "present",
        markedBy: "admin",
        scannedAt: serverTimestamp(),
        method: "admin_scan"
      });

      // Increment counter
      transaction.update(meetingRef, { attendanceCount: increment(1) });
      transaction.update(userRef, { attendanceCount: increment(1) });

      return "SUCCESS" as AttendanceResult;
    });

    return { 
      status: resultStatus, 
      name: `${member.name} ${member.surname}`.trim() 
    };
  } catch (err: any) {
    console.error("[AttendanceAdmin] Failed:", err);
    throw err;
  }
}

/** Get all attendance records for a specific meeting */
export async function getMeetingAttendance(meetingId: string): Promise<AttendanceRecord[]> {
  const snap = await getDocs(
    query(collection(db, "attendance"), where("meetingId", "==", meetingId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord));
}

/** Get all attendance records for a specific member */
export async function getMemberAttendance(memberUID: string): Promise<AttendanceRecord[]> {
  const snap = await getDocs(
    query(collection(db, "attendance"), where("memberUID", "==", memberUID))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord));
}

/** Get the global attendance matrix (all meetings × all members) — used by admin dashboard */
export async function getGlobalAttendance(maxLimit = 1000): Promise<{
  attendance: AttendanceRecord[];
}> {
  const snap = await getDocs(
    query(collection(db, "attendance"), orderBy("scannedAt", "desc"), limit(maxLimit))
  );
  return {
    attendance: snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord)),
  };
}
