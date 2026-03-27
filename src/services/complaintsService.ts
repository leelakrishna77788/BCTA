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
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Complaint, CreateComplaintInput } from "../types/complaint.types";

/** Submit a new complaint */
export async function submitComplaint(data: CreateComplaintInput): Promise<string> {
  const ref = await addDoc(collection(db, "complaints"), {
    ...data,
    status: "open",
    resolution: "",
    resolvedByUID: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Fetch all complaints ordered by newest first (admin view) */
export async function getComplaints(): Promise<Complaint[]> {
  const snap = await getDocs(
    query(collection(db, "complaints"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Complaint));
}

/** Resolve a complaint with a resolution message */
export async function resolveComplaint(
  id: string,
  resolution: string,
  resolvedByUID: string
): Promise<void> {
  await updateDoc(doc(db, "complaints", id), {
    status: "resolved",
    resolution,
    resolvedByUID,
    resolvedAt: serverTimestamp(),
  });
}

/** Update complaint status (e.g. open → in-progress) */
export async function updateComplaintStatus(
  id: string,
  status: Complaint["status"]
): Promise<void> {
  await updateDoc(doc(db, "complaints", id), { status });
}

/** Delete a complaint (admin only, enforced by security rules) */
export async function deleteComplaint(id: string): Promise<void> {
  await deleteDoc(doc(db, "complaints", id));
}
