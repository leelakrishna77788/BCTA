export type MeetingStatus = "upcoming" | "active" | "expired";

export interface Meeting {
  id?: string;
  topic: string;
  description: string;
  date: Date | { toDate(): Date } | string;
  startTime: string;
  endTime?: string;
  location?: string;
  gpsLink?: string;
  status: MeetingStatus;
  qrToken?: string | null;
  qrExpiresAt?: Date | { toDate(): Date } | null;
  qrDuration?: number;
  createdBy?: string;
  createdAt?: Date | { toDate(): Date };
}

export interface CreateMeetingInput {
  topic: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  gpsLink?: string;
  qrDuration?: number;
}
