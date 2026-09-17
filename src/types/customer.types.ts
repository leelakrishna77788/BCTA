export const CUSTOMER_COMPLAINTS = [
  "Display",
  "Battery",
  "Camera",
  "Motherboard",
  "Buttons",
] as const;

export type CustomerComplaint = (typeof CUSTOMER_COMPLAINTS)[number];

export const CUSTOMER_PAYMENT_STATUSES = ["Paid", "Unpaid"] as const;

export type CustomerPaymentStatus = (typeof CUSTOMER_PAYMENT_STATUSES)[number];

export interface Customer {
  id?: string;
  name: string;
  phoneNumber: string;
  complaint: CustomerComplaint;
  description: string;
  photoUrl?: string;
  photoPublicId?: string;
  paymentStatus: CustomerPaymentStatus;
  createdAt?: Date | { toDate(): Date };
  updatedAt?: Date | { toDate(): Date };
}

export type CreateCustomerInput = {
  name: string;
  phoneNumber: string;
  complaint: CustomerComplaint;
  description: string;
  paymentStatus: CustomerPaymentStatus;
  photoUrl?: string;
  photoPublicId?: string;
};