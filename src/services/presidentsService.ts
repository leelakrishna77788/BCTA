import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

import type {
  President,
  CreatePresidentInput,
} from "../types/president.types";

const COLLECTION = "presidents";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadPresidentImage(
  file: File
): Promise<{ url: string; publicId: string }> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary env vars missing: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET"
    );
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "presidents");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    throw new Error(
      body?.error?.message ??
        `Cloudinary upload failed (${res.status})`
    );
  }

  const data = await res.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
}

export async function getPresidents(): Promise<President[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), orderBy("createdAt", "desc"))
  );

  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
      }) as President
  );
}

export function subscribePresidents(
  cb: (presidents: President[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy("createdAt", "desc")),

    (snap) =>
      cb(
        snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            }) as President
        )
      ),

    (err) =>
      console.warn("[presidentsService] snapshot error:", err)
  );
}

export async function getPresidentById(
  id: string
): Promise<President | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as President;
}

export async function addPresident(
  data: CreatePresidentInput
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Date.now(),
  });

  return ref.id;
}

export async function updatePresident(
  id: string,
  data: Partial<CreatePresidentInput>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deletePresident(
  id: string,
  imagePublicId: string
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));

  if (imagePublicId) {
    try {
      const res = await fetch(
        "http://localhost:5000/api/delete-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicId: imagePublicId,
          }),
        }
      );

      const data = await res.json();

      console.log(
        "[presidentsService] Cloudinary delete result:",
        data
      );
    } catch (error) {
      console.warn(
        "[presidentsService] Cloudinary delete failed:",
        error
      );
    }
  }
}