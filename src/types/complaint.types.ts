export type ComplaintStatus = "open" | "in-progress" | "resolved";

export interface Complaint {
  id?: string;
  title: string;
  description: string;
  category: string;
  submittedByUID: string;
  submittedByName: string;
  status: ComplaintStatus;
  resolution?: string;
  resolvedByUID?: string | null;
  createdAt?: Date | { toDate(): Date };
  resolvedAt?: Date | { toDate(): Date } | null;
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  category: string;
  submittedByUID: string;
  submittedByName: string;
}
