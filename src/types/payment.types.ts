export type PaymentType = "monthly_fee" | "annual_fee" | "fine" | "other";
export type PaymentRecordStatus = "paid" | "pending" | "overdue";

export interface Payment {
  id?: string;
  memberUID: string;
  memberId: string;
  memberName: string;
  amount: number;
  type: PaymentType;
  status: PaymentRecordStatus;
  year: number;
  month?: number; // Added to track which month this payment relates to
  receiptNumber?: string;
  collectedByUID?: string | null;
  paidAt?: Date | { toDate(): Date } | null;
  createdAt?: Date | { toDate(): Date };
}

export interface CreatePaymentInput {
  memberUID: string;
  memberId: string;
  memberName: string;
  amount: number;
  type: PaymentType;
  status: PaymentRecordStatus;
  year: number;
  month?: number;
  receiptNumber?: string;
  collectedByUID?: string | null;
}
