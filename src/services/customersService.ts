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
  and,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import {
  CUSTOMER_PAYMENT_STATUSES,
  type Customer,
  type CreateCustomerInput,
  type CustomerPaymentStatus,
} from "../types/customer.types";
import { deleteImage } from "../utils/cloudinary";

const COLLECTION = "customers";

/** Normalize a phone number to its 10 trailing digits for consistent matching/storage */
export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function requireAuthUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Not authenticated. Please login again.");
  }
  return uid;
}

/** Guard: the payment status must be an explicit manual choice before saving. */
function assertPaymentStatusSelected(data: CreateCustomerInput): void {
  if (!CUSTOMER_PAYMENT_STATUSES.includes(data.paymentStatus as CustomerPaymentStatus)) {
    throw new Error("Please select a payment status.");
  }
}

/**
 * Scope a customer query to the caller's permissions.
 * Admins see every record; members only see the records they created.
 * The same split is enforced again by the Firestore security rules.
 */
function scopedQuery(uid: string, isAdmin: boolean) {
  return isAdmin
    ? query(collection(db, COLLECTION), orderBy("createdAt", "desc"))
    : query(
        collection(db, COLLECTION),
        where("createdByUID", "==", uid),
        orderBy("createdAt", "desc")
      );
}

export async function getCustomers(isAdmin = true): Promise<Customer[]> {
  const snap = await getDocs(scopedQuery(requireAuthUid(), isAdmin));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
}

export function subscribeCustomers(
  cb: (customers: Customer[]) => void,
  isAdmin = true
): () => void {
  return onSnapshot(
    scopedQuery(requireAuthUid(), isAdmin),
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer)),
    (err) => console.warn("[customersService] snapshot error:", err)
  );
}

export function subscribeCustomersByPhone(
  phoneNumber: string,
  cb: (customers: Customer[]) => void,
  isAdmin = true
): () => void {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return () => cb([]);

  const base = collection(db, COLLECTION);
  const q = isAdmin
    ? query(base, where("phoneNumber", "==", normalized))
    : query(
        base,
        and(
          where("phoneNumber", "==", normalized),
          where("createdByUID", "==", requireAuthUid())
        )
      );

  return onSnapshot(
    q,
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer)),
    (err) => console.warn("[customersService] phone search error:", err)
  );
}

export async function searchCustomersByPhone(
  phoneNumber: string,
  isAdmin = true
): Promise<Customer[]> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return [];
  const snap = await getDocs(
    isAdmin
      ? query(collection(db, COLLECTION), where("phoneNumber", "==", normalized))
      : query(
          collection(db, COLLECTION),
          and(
            where("phoneNumber", "==", normalized),
            where("createdByUID", "==", requireAuthUid())
          )
        )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Customer;
}

/**
 * Create a new customer record. `createdBy*` audit fields come from the current
 * Firebase session — never from user input. `savedByName` is the caller's
 * already-trusted profile name (the Firebase Auth display name is often empty
 * in this project because names live on the Firestore profile document).
 */
export async function addCustomer(
  data: CreateCustomerInput,
  isAdmin = true,
  savedByName?: string
): Promise<string> {
  assertPaymentStatusSelected(data);
  const uid = requireAuthUid();
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdByUID: uid,
    createdByName: savedByName?.trim() || auth.currentUser?.displayName || "",
    createdByRole: isAdmin ? "admin" : "member",
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
  if (data.paymentStatus !== undefined) {
    assertPaymentStatusSelected(data as CreateCustomerInput);
  }
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