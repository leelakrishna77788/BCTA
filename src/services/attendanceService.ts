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

/** Member scans the meeting QR code to mark their own attendance */
export async function recordAttendance(
  meetingId: string,
  token: string,
  memberUID: string
): Promise<void> {
  // 1. Validate meeting + token
  const meeting = await getMeetingById(meetingId);
  if (!meeting) throw new Error("Meeting not found");
  if (meeting.qrToken !== token) throw new Error("Invalid or expired QR token");

  // 2. Check QR expiry
  if (meeting.qrExpiresAt) {
    const expiresAt =
      typeof (meeting.qrExpiresAt as { toDate?: () => Date }).toDate === "function"
        ? (meeting.qrExpiresAt as { toDate: () => Date }).toDate()
        : new Date(meeting.qrExpiresAt as unknown as string);
    if (new Date() > expiresAt) throw new Error("Meeting QR has expired");
  }

  // 3. Validate member
  const member = await getMemberById(memberUID);
  if (!member) throw new Error("User not found");
  if (member.status === "blocked") throw new Error("Your account is blocked from attending meetings");

  // 4. Atomic write with idempotent ID
  const attendanceDocId = `${meetingId}_${memberUID}`;
  const attendanceRef = doc(db, "attendance", attendanceDocId);
  const meetingRef = doc(db, "meetings", meetingId);
  const userRef = doc(db, "users", memberUID);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(attendanceRef);
    if (docSnap.exists()) {
      const err = new Error("Attendance already marked");
      (err as any).alreadyScanned = true;
      throw err;
    }

    // Write attendance record
    transaction.set(attendanceRef, {
      meetingId,
      memberId: member.memberId,
      memberUID,
      memberName: `${member.name} ${member.surname}`.trim(),
      status: "present",
      markedBy: "self",
      scannedAt: serverTimestamp(),
    });

    // Increment counters atomically
    transaction.update(meetingRef, { attendanceCount: increment(1) });
    transaction.update(userRef, { attendanceCount: increment(1) });
  });
}

/**
 * Admin marks attendance for a specific member by scanning their personal QR.
 * Returns the member's full name on success.
 */
export async function recordAttendanceByAdmin(
  meetingId: string,
  memberUID: string
): Promise<string> {
  // 1. Validate member
  const member = await getMemberById(memberUID);
  if (!member) throw new Error("Member not found");
  if (member.status === "blocked")
    throw new Error("This member is blocked and cannot be marked present");

  // 2. Atomic write with idempotent ID
  const attendanceDocId = `${meetingId}_${memberUID}`;
  const attendanceRef = doc(db, "attendance", attendanceDocId);
  const meetingRef = doc(db, "meetings", meetingId);
  const userRef = doc(db, "users", memberUID);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(attendanceRef);
    if (docSnap.exists()) {
      const err = new Error("Attendance already marked");
      (err as any).alreadyScanned = true;
      throw err;
    }

    // Write attendance
    transaction.set(attendanceRef, {
      meetingId,
      memberId: member.memberId,
      memberUID,
      memberName: `${member.name} ${member.surname}`.trim(),
      status: "present",
      markedBy: "admin",
      scannedAt: serverTimestamp(),
    });

    // Increment counter
    transaction.update(meetingRef, { attendanceCount: increment(1) });
    transaction.update(userRef, { attendanceCount: increment(1) });
  });

  return `${member.name} ${member.surname}`.trim();
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
