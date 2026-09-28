export const CUSTOMER_COMPLAINTS = [
  "Display",
  "Battery",
  "Camera",
  "Motherboard",
  "Buttons",
] as const;

/**
 * The complaint is free text so it can be typed exactly as the customer
 * reports it. The constants above are kept as suggestions only — they are
 * pre-populated as datalist hints, never written automatically.
 */
export type CustomerComplaint = string;

export type CustomerComplaintSuggestion = (typeof CUSTOMER_COMPLAINTS)[number];

export const CUSTOMER_PAYMENT_STATUSES = ["Unpaid", "Partial", "Paid"] as const;

export type CustomerPaymentStatus = (typeof CUSTOMER_PAYMENT_STATUSES)[number];

export interface Customer {
  id?: string;
  name: string;
  phoneNumber: string;

  // ── Bill identity (manual) ────────────────────────────────────────────
  billNumber: string;
  billDate: string;

  // ── Customer details (manual) ─────────────────────────────────────────
  customerAddress: string;

  // ── Device details (manual) ───────────────────────────────────────────
  mobileModel: string;
  imeiNumber: string;

  // ── Service details (manual) ──────────────────────────────────────────
  complaint: CustomerComplaint;
  description: string;
  serviceDetails: string;

  // ── Pricing (manual — never summed or derived) ────────────────────────
  /** All money values are stored as raw strings exactly as the user typed. */
  partPrice: string;
  labourCharges: string;
  estimatedPrice: string;
  finalPrice: string;

  // ── Payment (manual selection) ────────────────────────────────────────
  paymentStatus: CustomerPaymentStatus;
  paidDate: string;

  // ── Terms (manual) ────────────────────────────────────────────────────
  termsConditions: string;

  // ── Photo (uploaded by the user) ──────────────────────────────────────
  photoUrl?: string;
  photoPublicId?: string;

  // ── Audit metadata (written by the service layer) ─────────────────────
  createdByUID?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: Date | { toDate(): Date };
  updatedAt?: Date | { toDate(): Date };
}

/**
 * Payload accepted by addCustomer. `paymentStatus` may be EMPTY while the form
 * is being filled in — the user must choose it explicitly, nothing is defaulted.
 */
export type CreateCustomerInput = Omit<
  Customer,
  | "id"
  | "createdByUID"
  | "createdByName"
  | "createdByRole"
  | "createdAt"
  | "updatedAt"
  | "paymentStatus"
> & {
  paymentStatus: CustomerPaymentStatus | "";
};