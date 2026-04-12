import { auth } from "../firebase/firebaseConfig";

export interface CreateAdminInput {
  name: string;
  email: string;
  password?: string;
}

/**
 * Service for privileged administrative actions via the serverless Admin API.
 * This prevents session displacement by avoiding the client-side Auth SDK for user creation.
 */
export const adminApi = {
  /**
   * Creates a new administrator account.
   * Logic: calls /api/admin serverless function which uses Admin SDK.
   */
  createAdmin: async (input: CreateAdminInput) => {
    if (!auth.currentUser) {
      throw new Error("You must be logged in as an administrator to perform this action.");
    }

    const idToken = await auth.currentUser.getIdToken();

    const profileData = {
      name: input.name,
      email: input.email.trim(),
      role: "admin",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const response = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        action: "createUser",
        email: input.email.trim(),
        password: input.password,
        profile: profileData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Deletes a user (Auth + Firestore) via Admin API.
   */
  deleteUser: async (uid: string) => {
    if (!auth.currentUser) throw new Error("Authentication required");
    
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ action: "deleteUser", uid }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to delete user");
    }

    return await response.json();
  }
};
