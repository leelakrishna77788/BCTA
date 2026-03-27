export type AttendanceMarker = "self" | "admin";

export interface AttendanceRecord {
  id?: string;
  meetingId: string;
  memberUID: string;
  memberId: string;
  memberName: string;
  status: "present";
  markedBy: AttendanceMarker;
  scannedAt?: Date | { toDate(): Date };
}
