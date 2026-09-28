import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { deleteImage } from "../utils/cloudinary";
import {
  SERVICE_BILL_PAYMENT_STATUSES,
  type SavedServiceBill,
  type ServiceBill,
  type ServiceBillInput,
  type ServiceBillPaymentStatus,
} from "../types/serviceBill.types";

const COLLECTION = "serviceBills";

/**
 * An empty, fully manual bill. Nothing is pre-filled, generated or calculated —
 * the user types or selects every single value.
 */
export const EMPTY_SERVICE_BILL: ServiceBillInput = {
  billNumber: "",
  billDate: "",
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  mobileModel: "",
  imeiNumber: "",
  complaint: "",
  serviceDetails: "",
  partPrice: "",
  labourCharges: "",
  estimatedPrice: "",
  finalPrice: "",
  // Left blank on purpose: the payment status is only ever set by the user
  // actively choosing it in the form. Nothing is preselected for them.
  paymentStatus: "",
  paidDate: "",
  termsConditions: "",
  photoUrl: "",
  photoPublicId: "",
};

/** Guard: the payment status must be an explicit manual choice before saving. */
function assertPaymentStatusSelected(data: ServiceBillInput): void {
  if (!SERVICE_BILL_PAYMENT_STATUSES.includes(data.paymentStatus as ServiceBillPaymentStatus)) {
    throw new Error("Please select a payment status.");
  }
}

function requireAuthUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Not authenticated. Please login again.");
  }
  return uid;
}

function mapBill(id: string, data: Record<string, unknown>): SavedServiceBill {
  return { ...(data as unknown as ServiceBill), id };
}

function scopedQuery(uid: string, isAdmin: boolean) {
  // Admins see every record; members only see the records they created.
  return isAdmin
    ? query(collection(db, COLLECTION), orderBy("createdAt", "desc"))
    : query(collection(db, COLLECTION), where("createdByUID", "==", uid));
}

/**
 * Live list of bill records for the current scope.
 * The same restriction is enforced again by the Firestore security rules.
 */
export function subscribeServiceBills(
  isAdmin: boolean,
  cb: (bills: SavedServiceBill[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    cb([]);
    return () => {};
  }

  return onSnapshot(
    scopedQuery(uid, isAdmin),
    (snap) =>
      cb(snap.docs.map((d) => mapBill(d.id, d.data() as Record<string, unknown>))),
    (err) => {
      console.warn("[serviceBillsService] snapshot error:", err);
      onError?.(err);
    }
  );
}

export async function getServiceBills(isAdmin: boolean): Promise<SavedServiceBill[]> {
  const snap = await getDocs(scopedQuery(requireAuthUid(), isAdmin));
  return snap.docs.map((d) => mapBill(d.id, d.data() as Record<string, unknown>));
}

export async function getServiceBillById(id: string): Promise<SavedServiceBill | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return mapBill(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Save a new manual bill. `createdBy*` audit fields come from the current
 * Firebase session — never from user input. `savedByName` is the caller's
 * already-trusted profile name (the Firebase Auth display name is often empty
 * in this project because names live on the Firestore profile document).
 */
export async function createServiceBill(
  data: ServiceBillInput,
  isAdmin: boolean,
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

/** Update an existing manual bill. Only the manual fields are written. */
export async function updateServiceBill(
  id: string,
  data: ServiceBillInput
): Promise<void> {
  assertPaymentStatusSelected(data);
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Remove a bill record permanently. Admin-only (enforced by security rules). */
export async function deleteServiceBill(id: string, photoPublicId?: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));

  if (photoPublicId) {
    try {
      await deleteImage(photoPublicId);
    } catch (err) {
      console.warn("[serviceBillsService] Cloudinary delete failed:", err);
    }
  }
}
