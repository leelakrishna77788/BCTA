import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Shop, CreateShopInput, ShopStats } from "../types/shop.types";

/** Fetch all shops */
export async function getShops(): Promise<Shop[]> {
  const snap = await getDocs(query(collection(db, "shops"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
}

/** Fetch a single shop by ID */
export async function getShopById(id: string): Promise<Shop | null> {
  const snap = await getDoc(doc(db, "shops", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Shop;
}

/** Create a new shop entry */
export async function createShop(input: CreateShopInput): Promise<string> {
  const ref = await addDoc(collection(db, "shops"), {
    ...input,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update a shop's details */
export async function updateShop(id: string, data: Partial<Omit<Shop, "id">>): Promise<void> {
  await updateDoc(doc(db, "shops", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Toggle a shop's active/inactive status */
export async function updateShopStatus(id: string, status: Shop["status"]): Promise<void> {
  await updateDoc(doc(db, "shops", id), { status, updatedAt: serverTimestamp() });
}

/** Get shop statistics */
export async function getShopStats(): Promise<ShopStats> {
  const snap = await getDocs(collection(db, "shops"));
  let active = 0, inactive = 0;
  snap.forEach((d) => {
    if ((d.data() as Shop).status === "active") active++;
    else inactive++;
  });
  return { total: snap.size, active, inactive };
}
