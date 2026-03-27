import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  increment,
  type DocumentSnapshot,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase/firebaseConfig";
import type { Member, CreateMemberInput, MemberStats } from "../types/member.types";

const MEMBERS_PER_PAGE = 20;

/** Fetch paginated list of members (role == "member") */
export async function getMembers(lastDoc?: DocumentSnapshot): Promise<{ members: Member[]; lastVisible: DocumentSnapshot | null }> {
  let q = query(
    collection(db, "users"),
    where("role", "==", "member"),
    orderBy("createdAt", "desc"),
    limit(MEMBERS_PER_PAGE)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  const members = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Member));
  const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { members, lastVisible };
}

/** Fetch ALL members (admin use — for stats, dropdowns, full lists) */
export async function getAllMembers(): Promise<Member[]> {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "member"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Member));
}

/** Get a single member by UID */
export async function getMemberById(uid: string): Promise<Member | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as Member;
}

/**
 * Create a new member.
 * NOTE: createUserWithEmailAndPassword signs in as the new user.
 * For admin-driven creation, prefer calling /api/admin (Vercel function).
 */
export async function createMember(input: CreateMemberInput): Promise<Member> {
  const memberId =
    input.memberId || `BCTA-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;

  const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);

  const memberData: Omit<Member, "uid"> = {
    memberId,
    name: input.name,
    surname: input.surname ?? "",
    email: input.email.trim(),
    phone: input.phone ?? "",
    age: input.age ?? null,
    gender: input.gender ?? "",
    bloodGroup: input.bloodGroup ?? "",
    aadhaarLast4: input.aadhaarLast4 ?? "",
    shopAddress: input.shopAddress ?? "",
    photoURL: "",
    role: "member",
    status: "active",
    attendanceCount: 0,
    paymentStatus: "unpaid",
    nomineeDetails: input.nomineeDetails ?? { name: "", relation: "", phone: "" },
    createdAt: serverTimestamp() as unknown as Date,
  };

  await setDoc(doc(db, "users", cred.user.uid), memberData);
  return { uid: cred.user.uid, ...memberData };
}

/** Update member Firestore profile (does NOT affect Auth; use /api/admin for Auth ops) */
export async function updateMember(uid: string, data: Partial<Omit<Member, "uid">>): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update member status in Firestore. Token revocation must be done via /api/admin */
export async function updateMemberStatus(uid: string, status: "active" | "blocked"): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Delete member's Firestore doc. Auth deletion must be done via /api/admin */
export async function deleteMemberDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

/** Get aggregated member stats without loading all member documents */
export async function getMemberStats(): Promise<MemberStats> {
  const q = query(collection(db, "users"), where("role", "==", "member"));
  const snap = await getDocs(q);
  let active = 0;
  let blocked = 0;
  snap.forEach((d) => {
    const m = d.data() as Member;
    if (m.status === "active") active++;
    else blocked++;
  });
  return { total: snap.size, active, blocked };
}

/** Bulk update member status using a batched write */
export async function bulkUpdateMemberStatus(
  uids: string[],
  status: "active" | "blocked"
): Promise<void> {
  const batch = writeBatch(db);
  uids.forEach((uid) => {
    batch.update(doc(db, "users", uid), { status, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

/** Increment a member's attendance count atomically */
export async function incrementAttendanceCount(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { attendanceCount: increment(1) });
}

/** 
 * Call the Vercel serverless privileged admin API securely.
 * Used for deleting a user entirely from Auth + Firestore.
 */
export const membersApi = {
  create: async (input: CreateMemberInput) => {
    console.log("[membersApi.create] Creating member:", input.email);
    
    const memberId = input.memberId || `BCTA-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;

    if (import.meta.env.VITE_USE_SERVER_API && auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "createUser",
          userData: {
            email: input.email.trim(),
            password: input.password,
            displayName: `${input.name} ${input.surname || ""}`.trim(),
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Failed to create user via admin API";
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Server returned ${res.status}: ${text.slice(0, 100)}`;
        }
        throw new Error(errorMsg);
      }

      const { uid } = await res.json();

      await setDoc(doc(db, "users", uid), {
        memberId,
        name: input.name,
        surname: input.surname ?? "",
        email: input.email.trim(),
        phone: input.phone ?? "",
        age: input.age ?? null,
        gender: input.gender ?? "",
        bloodGroup: input.bloodGroup ?? "",
        aadhaarLast4: input.aadhaarLast4 ?? "",
        shopAddress: input.shopAddress ?? "",
        photoURL: "",
        role: "member",
        status: "active",
        attendanceCount: 0,
        paymentStatus: "unpaid",
        nomineeDetails: input.nomineeDetails ?? { name: "", relation: "", phone: "" },
        createdAt: serverTimestamp(),
      });

      return { member: { uid, memberId } };
    }

    // Local development: use client SDK directly
    if (!auth.currentUser) throw new Error("Not authenticated. Please login again.");

    const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);

    await setDoc(doc(db, "users", cred.user.uid), {
      memberId,
      name: input.name,
      surname: input.surname ?? "",
      email: input.email.trim(),
      phone: input.phone ?? "",
      age: input.age ?? null,
      gender: input.gender ?? "",
      bloodGroup: input.bloodGroup ?? "",
      aadhaarLast4: input.aadhaarLast4 ?? "",
      shopAddress: input.shopAddress ?? "",
      photoURL: "",
      role: "member",
      status: "active",
      attendanceCount: 0,
      paymentStatus: "unpaid",
      nomineeDetails: input.nomineeDetails ?? { name: "", relation: "", phone: "" },
      createdAt: serverTimestamp(),
    });

    console.log("[membersApi.create] Member created successfully:", cred.user.uid);
    return { member: { uid: cred.user.uid, memberId } };
  },

  delete: async (uid: string) => {
    console.log("[membersApi.delete] Attempting to delete:", uid);
    
    // Use serverless API if deployed (FIREBASE_SERVICE_ACCOUNT set means we're in Vercel env)
    if (import.meta.env.VITE_USE_SERVER_API && auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "deleteUser", uid }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Failed to delete user via admin API";
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Server returned ${res.status}: ${text.slice(0, 100)}`;
        }
        throw new Error(errorMsg);
      }

      return res.json();
    }

    // Local development fallback: delete Firestore doc
    if (!auth.currentUser) {
      console.error("[membersApi.delete] No authenticated user");
      throw new Error("Not authenticated. Please login again.");
    }
    
    console.log("[membersApi.delete] Using local fallback, deleting Firestore doc for:", uid);
    try {
      await deleteDoc(doc(db, "users", uid));
      console.log("[membersApi.delete] Successfully deleted:", uid);
      return { message: "Document deleted successfully" };
    } catch (err: any) {
      console.error("[membersApi.delete] Firestore delete error:", err);
      throw err;
    }
  },

  revokeTokens: async (uid: string) => {
    if (import.meta.env.VITE_USE_SERVER_API && auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "revokeTokens", uid }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Failed to revoke sessions via admin API";
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Server returned ${res.status}: ${text.slice(0, 100)}`;
        }
        throw new Error(errorMsg);
      }

      return res.json();
    }

    // Local fallback: just sign out (limited client-side option)
    if (!auth.currentUser) throw new Error("No authenticated admin user");
    console.warn("[membersApi] Token revocation requires server-side API in production");
    return { message: "Token revocation skipped in local mode" };
  },

  bulkDelete: async (uids: string[]) => {
    console.log("[membersApi.bulkDelete] Attempting to delete multiple users:", uids.length);
    
    if (import.meta.env.VITE_USE_SERVER_API && auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "bulkDeleteUsers", uids }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Failed to bulk delete users via admin API";
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Server returned ${res.status}: ${text.slice(0, 100)}`;
        }
        throw new Error(errorMsg);
      }

      return res.json();
    }

    // Local fallback: batch delete Firestore docs
    if (!auth.currentUser) throw new Error("No authenticated admin user");
    
    const batch = writeBatch(db);
    uids.forEach(uid => {
      batch.delete(doc(db, "users", uid));
    });
    await batch.commit();
    return { message: "Firestore documents deleted (Auth records remain in local mode)" };
  },

  deleteAll: async () => {
    const allMembers = await getAllMembers();
    const uids = allMembers.map(m => m.uid).filter((uid): uid is string => !!uid);
    
    if (uids.length === 0) return { message: "No members to delete" };
    if (!auth.currentUser) throw new Error("No authenticated admin user");

    return await membersApi.bulkDelete(uids);
  }
};
