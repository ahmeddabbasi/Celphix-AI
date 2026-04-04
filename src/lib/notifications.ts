/**
 * Shared types for the in-app notification system and CC access flow.
 * Used by both the Command Center and Pay-As-You-Go interfaces.
 */

export type NotificationType =
  | "info"
  | "access_request"
  | "access_approved"
  | "access_rejected"
  | "call"
  | "milestone";

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  action_type: string | null;
  action_ref_id: number | null;
  /** NULL = action not yet taken. 'approve' | 'reject' once the admin acted. */
  action_taken: "approve" | "reject" | null;
  created_at: string | null;
}

export interface UserProfile {
  user_id: number;
  username: string;
  display_name: string | null;
  is_admin: boolean;
  max_assistants: number;
  role: string;
  command_center_access: boolean;
  cc_request_status: "pending" | "approved" | "rejected" | "revoked" | null;
  auth_provider: string | null;
}
