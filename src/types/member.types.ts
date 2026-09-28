export type UserRole = "member" | "admin" | "superadmin";
export type UserStatus = "active" | "blocked" | "pending";
export type PaymentStatus = "paid" | "unpaid";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";
export type Gender = "male" | "female" | "other" | "";
export type Location = "town1" | "town2" | "rural" | "";

export interface NomineeDetails {
  name: string;
  relation: string;
  phone: string;
}

/** Metadata written when a member is soft deleted (archived) by an admin. */
export interface SoftDeleteMeta {
  isDeleted?: boolean;
  deletedAt?: Date | { toDate(): Date };
  deletedBy?: string;
  deletedByName?: string;
}

export interface Member {
  uid: string;
  memberId: string;
  name: string;
  surname: string;
  email: string;
  phone?: string;
  age?: number | null;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  aadhaarLast4?: string;
  shopName?: string;
  shopAddress?: string;
  location?: Location;
  place?: string;
  photoURL?: string;
  imageUrl?: string;
  imagePublicId?: string;
  role: UserRole;
  status: UserStatus;
  attendanceCount: number;
  paymentStatus: PaymentStatus;
  nomineeDetails?: NomineeDetails;
  createdAt?: Date | { toDate(): Date };
  updatedAt?: Date | { toDate(): Date };
  /** Soft delete flag. Absent/false means the member is active. */
  isDeleted?: boolean;
  deletedAt?: Date | { toDate(): Date };
  deletedBy?: string;
  deletedByName?: string;
}

export interface CreateMemberInput {
  email: string;
  password: string;
  name: string;
  surname?: string;
  age?: number;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  aadhaarLast4?: string;
  shopName?: string;
  shopAddress?: string;
  location?: Location;
  place?: string;
  nomineeDetails?: NomineeDetails;
  memberId?: string;
  phone?: string;
  imageUrl?: string;
  imagePublicId?: string;
}

export interface MemberStats {
  total: number;
  active: number;
  blocked: number;
  /** Soft deleted (archived) members — kept in the database but hidden from active lists. */
  deleted: number;
}
