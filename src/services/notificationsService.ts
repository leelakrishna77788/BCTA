import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Notification, CreateNotificationInput } from "../types/notification.types";

/** Broadcast a new notification to all or role-specific users */
export async function sendNotification(data: CreateNotificationInput): Promise<string> {
  const ref = await addDoc(collection(db, "notifications"), {
    ...data,
    readBy: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Fetch all notifications ordered by newest first */
export async function getNotifications(): Promise<Notification[]> {
  const snap = await getDocs(
    query(collection(db, "notifications"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
}

/**
 * Mark a notification as read by a specific user.
 * Uses arrayUnion so it's safe to call multiple times.
 */
export async function markNotificationRead(notifId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notifId), {
    readBy: arrayUnion(uid),
  });
}

/** Delete a notification (admin only) */
export async function deleteNotification(id: string): Promise<void> {
  await deleteDoc(doc(db, "notifications", id));
}
