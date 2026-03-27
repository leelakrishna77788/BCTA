import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Payment, CreatePaymentInput } from "../types/payment.types";

/** Fetch all payments (admin view) ordered by newest first */
export async function getPayments(): Promise<Payment[]> {
  const snap = await getDocs(
    query(collection(db, "payments"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
}

/** Fetch payments for a specific member, sorted by year */
export async function getMemberPayments(memberUID: string): Promise<Payment[]> {
  const snap = await getDocs(
    query(
      collection(db, "payments"),
      where("memberUID", "==", memberUID),
      orderBy("year", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
}

/** Record a new payment */
export async function createPayment(data: CreatePaymentInput): Promise<string> {
  const ref = await addDoc(collection(db, "payments"), {
    ...data,
    paidAt: data.status === "paid" ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update a payment's status (e.g. pending → paid) */
export async function updatePaymentStatus(
  id: string,
  status: Payment["status"]
): Promise<void> {
  await updateDoc(doc(db, "payments", id), {
    status,
    paidAt: status === "paid" ? serverTimestamp() : null,
  });
}

/** Get payment stats for a given year */
export async function getYearlyPaymentStats(year: number): Promise<{
  total: number;
  paid: number;
  pending: number;
  overdue: number;
}> {
  const snap = await getDocs(
    query(collection(db, "payments"), where("year", "==", year))
  );
  let paid = 0, pending = 0, overdue = 0;
  snap.forEach((d) => {
    const p = d.data() as Payment;
    if (p.status === "paid") paid++;
    else if (p.status === "pending") pending++;
    else if (p.status === "overdue") overdue++;
  });
  return { total: snap.size, paid, pending, overdue };
}
