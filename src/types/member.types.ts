export type UserRole = "member" | "admin" | "superadmin";
export type UserStatus = "active" | "blocked";
export type PaymentStatus = "paid" | "unpaid";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";
export type Gender = "male" | "female" | "other" | "";

export interface NomineeDetails {
  name: string;
  relation: string;
  phone: string;
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
  shopAddress?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  attendanceCount: number;
  paymentStatus: PaymentStatus;
  nomineeDetails?: NomineeDetails;
  createdAt?: Date | { toDate(): Date };
  updatedAt?: Date | { toDate(): Date };
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
  shopAddress?: string;
  nomineeDetails?: NomineeDetails;
  memberId?: string;
  phone?: string;
}

export interface MemberStats {
  total: number;
  active: number;
  blocked: number;
}
