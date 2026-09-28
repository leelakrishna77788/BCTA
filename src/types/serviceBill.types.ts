/**
 * Manual bill / service detail records.
 *
 * IMPORTANT: every business field below is entered or selected MANUALLY by the
 * user and stored exactly as typed. Nothing here is generated, auto-filled or
 * auto-calculated (no bill numbers, no dates, no totals, no derived payment
 * status). `createdByUID` / `createdByName` are audit metadata written by the
 * service layer and are never user editable.
 */

export const SERVICE_BILL_PAYMENT_STATUSES = [
  "Unpaid",
  "Partial",
  "Paid",
] as const;

export type ServiceBillPaymentStatus =
  (typeof SERVICE_BILL_PAYMENT_STATUSES)[number];

/** All money values are stored as raw strings exactly as the user typed them. */
export type ManualAmount = string;

export interface ServiceBill {
  id?: string;

  // ── Bill identity (manual) ────────────────────────────────────────────
  billNumber: string;
  billDate: string;

  // ── Customer details (manual) ─────────────────────────────────────────
  customerName: string;
  customerPhone: string;
  customerAddress: string;

  // ── Device details (manual) ──────────────────────────────────────────
  mobileModel: string;
  imeiNumber: string;

  // ── Service details (manual) ─────────────────────────────────────────
  complaint: string;
  serviceDetails: string;

  // ── Pricing (manual — never summed or derived) ────────────────────────
  partPrice: ManualAmount;
  labourCharges: ManualAmount;
  estimatedPrice: ManualAmount;
  finalPrice: ManualAmount;

  // ── Payment (manual selection) ───────────────────────────────────────
  paymentStatus: ServiceBillPaymentStatus;
  paidDate: string;

  // ── Terms (manual) ───────────────────────────────────────────────────
  termsConditions: string;

  // ── Photo (uploaded by the user) ──────────────────────────────────────
  photoUrl?: string;
  photoPublicId?: string;

  // ── Audit metadata (written by the service layer) ────────────────────
  createdByUID?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: Date | { toDate(): Date };
  updatedAt?: Date | { toDate(): Date };
}

/**
 * Payment status while a record is being filled in: EMPTY until the user
 * manually picks one. A saved record always stores one of the real statuses —
 * the status is never defaulted on the user's behalf.
 */
export type ServiceBillPaymentSelection = ServiceBillPaymentStatus | "";

/** Payload accepted by the create/update service functions (audit fields excluded). */
export type ServiceBillInput = Omit<
  ServiceBill,
  | "id"
  | "createdByUID"
  | "createdByName"
  | "createdByRole"
  | "createdAt"
  | "updatedAt"
  | "paymentStatus"
> & {
  paymentStatus: ServiceBillPaymentSelection;
};

/** A bill record that is guaranteed to have an id (returned by the service layer). */
export type SavedServiceBill = ServiceBill & { id: string };
