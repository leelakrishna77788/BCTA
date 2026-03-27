export type NotificationType = "info" | "warning" | "urgent";
export type NotificationTarget = "all" | "member" | "admin";

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: NotificationType;
  sentByUID: string;
  targetRole: NotificationTarget;
  readBy: string[];
  createdAt?: Date | { toDate(): Date };
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type: NotificationType;
  sentByUID: string;
  targetRole: NotificationTarget;
}
