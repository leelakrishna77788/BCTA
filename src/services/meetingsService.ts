import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Meeting, CreateMeetingInput } from "../types/meeting.types";

/** Fetch all meetings ordered by newest first */
export async function getMeetings(maxLimit = 100): Promise<Meeting[]> {
  const snap = await getDocs(
    query(collection(db, "meetings"), orderBy("createdAt", "desc"), limit(maxLimit))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Meeting));
}

/** Fetch a single meeting by ID */
export async function getMeetingById(id: string): Promise<Meeting | null> {
  const snap = await getDoc(doc(db, "meetings", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Meeting;
}

/** Create a new meeting — returns the new meeting's Firestore document ID */
export async function createMeeting(input: CreateMeetingInput, createdByUID: string): Promise<string> {
  const ref = await addDoc(collection(db, "meetings"), {
    topic: input.topic,
    description: input.description ?? "",
    date: Timestamp.fromDate(new Date(input.date)),
    startTime: input.startTime,
    endTime: input.endTime ?? "",
    location: input.location ?? "",
    gpsLink: input.gpsLink ?? "",
    qrToken: null,
    qrExpiresAt: null,
    qrDuration: input.qrDuration ?? 30,
    status: "upcoming",
    createdBy: createdByUID,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Activate a meeting by setting its QR token and expiry */
export async function startMeetingQR(
  id: string,
  qrToken: string,
  qrExpiresAt: Date
): Promise<void> {
  await updateDoc(doc(db, "meetings", id), {
    status: "active",
    qrToken,
    qrExpiresAt: Timestamp.fromDate(qrExpiresAt),
  });
}

/** Stop (expire) a meeting's QR — clears token and expiry */
export async function stopMeetingQR(id: string): Promise<void> {
  await updateDoc(doc(db, "meetings", id), {
    status: "expired",
    qrToken: null,
    qrExpiresAt: null,
  });
}

/** Rotate the QR token for an already-active meeting */
export async function refreshMeetingQR(id: string, qrToken: string): Promise<void> {
  await updateDoc(doc(db, "meetings", id), { qrToken });
}

/** Delete a meeting document */
export async function deleteMeeting(id: string): Promise<void> {
  await deleteDoc(doc(db, "meetings", id));
}
