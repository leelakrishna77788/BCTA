import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Customer, CreateCustomerInput } from "../types/customer.types";
import { deleteImage } from "../utils/cloudinary";

const COLLECTION = "customers";

/** Normalize a phone number to its 10 trailing digits for consistent matching/storage */
export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export async function getCustomers(): Promise<Customer[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
}

export function subscribeCustomers(
  cb: (customers: Customer[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy("createdAt", "desc")),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer)),
    (err) => console.warn("[customersService] snapshot error:", err)
  );
}

export function subscribeCustomersByPhone(
  phoneNumber: string,
  cb: (customers: Customer[]) => void
): () => void {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return () => cb([]);

  return onSnapshot(
    query(collection(db, COLLECTION), where("phoneNumber", "==", normalized)),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer)),
    (err) => console.warn("[customersService] phone search error:", err)
  );
}

export async function searchCustomersByPhone(
  phoneNumber: string
): Promise<Customer[]> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("phoneNumber", "==", normalized))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Customer;
}

/** Create a new customer record (admin only, enforced by security rules) */
export async function addCustomer(data: CreateCustomerInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update an existing customer record without creating a duplicate */
export async function updateCustomer(
  id: string,
  data: Partial<CreateCustomerInput>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a customer record and clean up its Cloudinary image */
export async function deleteCustomer(
  id: string,
  photoPublicId?: string
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));

  if (photoPublicId) {
    try {
      await deleteImage(photoPublicId);
    } catch (err) {
      console.warn("[customersService] Cloudinary delete failed:", err);
    }
  }
}