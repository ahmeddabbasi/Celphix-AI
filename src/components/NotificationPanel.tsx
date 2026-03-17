/**
 * NotificationPanel — shared notifications popover for TopBar and PaygTopBar.
 *
 * Features:
 *  - Unread / read distinction with dot indicator
 *  - Mark single or all as read
 *  - Dismiss (delete) a single notification
 *  - Clear all read notifications
 *  - Admin: inline Approve / Reject for access_request type
 *    → buttons hidden once action_taken is set (prevents duplicate actions)
 *    → optimistic UI — buttons disappear immediately on click
 *  - Proper timestamps via date-fns
 */

import {
  Bell, X, CheckCircle, XCircle, Shield, Info, Phone, Activity, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import type { AppNotification } from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";

// ── Helpers ───────────────────────────────────────────────────────────────────

function notifIcon(type: AppNotification["type"]) {
  if (type === "call")            return <Phone       className="h-3.5 w-3.5" />;
  if (type === "milestone")       return <Activity    className="h-3.5 w-3.5" />;
  if (type === "access_approved") return <CheckCircle className="h-3.5 w-3.5" />;
  if (type === "access_rejected") return <XCircle     className="h-3.5 w-3.5" />;
  if (type === "access_request")  return <Shield      className="h-3.5 w-3.5" />;
  return                                 <Info        className="h-3.5 w-3.5" />;
}

function notifColorClass(type: AppNotification["type"], accent: "primary" | "amber") {
  if (type === "access_approved") return "bg-primary/10 text-primary";
  if (type === "access_rejected") return "bg-destructive/10 text-destructive";
  if (type === "access_request")
    return accent === "amber"
      ? "bg-accent/10 text-accent-foreground"
      : "bg-primary/10   text-primary";
  if (type === "call")  return "bg-primary/10 text-primary";
  if (type === "milestone")
    return accent === "amber"
      ? "bg-accent/10 text-accent-foreground"
      : "bg-primary/10   text-primary";
  return "bg-muted text-muted-foreground";
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }
  catch { return ""; }
}

// ── Action-taken badge shown instead of buttons once reviewed ─────────────────

function ActionTakenBadge({ action }: { action: "approve" | "reject" }) {
  if (action === "approve")
    return (
      <Badge
        variant="outline"
        className="mt-2 gap-1 border-primary/40 text-primary text-[10px] font-medium"
      >
        <CheckCircle className="h-2.5 w-2.5" /> Approved
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="mt-2 gap-1 border-red-500/40 text-red-600 text-[10px] font-medium"
    >
      <XCircle className="h-2.5 w-2.5" /> Rejected
    </Badge>
  );
}

// ── Single notification row ───────────────────────────────────────────────────

interface NotifRowProps {
  n: AppNotification;
  isAdmin: boolean;
  accent: "primary" | "amber";
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
  onApprove: (reqId: number, notifId: number) => void;
  onReject: (reqId: number, notifId: number) => void;
  isReviewing: boolean;
}

function NotifRow({
  n, isAdmin, accent,
  onMarkRead, onDelete, onApprove, onReject, isReviewing,
}: NotifRowProps) {
  const isPendingAction =
    isAdmin &&
    n.type === "access_request" &&
    n.action_ref_id != null &&
    n.action_taken == null;

  return (
    <div
      onClick={() => { if (!n.read) onMarkRead(n.id); }}
      className={
        "group relative flex items-start gap-3 px-4 py-3 transition-colors " +
        "hover:bg-muted/40 cursor-pointer " +
        (!n.read
          ? accent === "amber"
            ? "bg-accent/[0.03]"
            : "bg-primary/[0.03]"
          : "")
      }
    >
      {/* Type icon */}
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${notifColorClass(n.type, accent)}`}
      >
        {notifIcon(n.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p
            className={`text-xs font-medium leading-tight ${
              !n.read ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {n.title}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {timeAgo(n.created_at)}
          </span>
        </div>

        {n.body && (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            {n.body}
          </p>
        )}

        {/* Admin action area */}
        {isAdmin && n.type === "access_request" && n.action_ref_id != null && (
          <>
            {isPendingAction ? (
              // Buttons visible — action not yet taken
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px] border-primary/40 text-primary hover:bg-primary/10"
                  disabled={isReviewing}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(n.action_ref_id!, n.id);
                  }}
                >
                  <CheckCircle className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px] border-red-500/40 text-red-600 hover:bg-red-500/10"
                  disabled={isReviewing}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(n.action_ref_id!, n.id);
                  }}
                >
                  <XCircle className="h-3 w-3 mr-1" /> Reject
                </Button>
              </div>
            ) : (
              // Badge — show what action was taken
              n.action_taken && <ActionTakenBadge action={n.action_taken} />
            )}
          </>
        )}
      </div>

      {/* Dismiss button — always available on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(n.id);
        }}
        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        title="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Unread dot */}
      {!n.read && (
        <div
          className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
            accent === "amber" ? "bg-accent" : "bg-primary"
          }`}
        />
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  /** "primary" for Command Center, "amber" for Pay-As-You-Go */
  accent?: "primary" | "amber";
  isAdmin: boolean;
  /** Optional override for the trigger <Button> (e.g., PAYG yellow trigger) */
  triggerClassName?: string;
  /** Optional override for the bell icon inside the trigger */
  triggerIconClassName?: string;
}

export function NotificationPanel({
  accent = "primary",
  isAdmin,
  triggerClassName,
  triggerIconClassName,
}: NotificationPanelProps) {
  const [open, setOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    readCount,
    isLoading,
    markRead,
    markAllRead,
    deleteNotification,
    clearReadNotifications,
    reviewAccessRequest,
    isReviewing,
  } = useNotifications();

  const badgeColor =
    accent === "amber"
      ? "bg-accent text-accent-foreground"
      : "bg-primary text-primary-foreground";

  const headerMarkReadColor =
    accent === "amber" ? "text-primary hover:underline" : "text-primary hover:underline";

  const handleApprove = async (reqId: number, notifId: number) => {
    await reviewAccessRequest(reqId, "approve");
    markRead(notifId);
  };

  const handleReject = async (reqId: number, notifId: number) => {
    await reviewAccessRequest(reqId, "reject");
    markRead(notifId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={"relative " + (triggerClassName ?? "")}>
          <Bell className={"h-4 w-4 " + (triggerIconClassName ?? "text-muted-foreground")} />
          {unreadCount > 0 && (
            <span
              className={`absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${badgeColor}`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 shadow-lg">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-foreground" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeColor}`}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className={`text-xs ${headerMarkReadColor}`}
              >
                Mark all read
              </button>
            )}
            {readCount > 0 && (
              <button
                onClick={() => clearReadNotifications()}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                title="Clear all read notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── List ───────────────────────────────────────────────────────── */}
        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Bell className="h-6 w-6 opacity-30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotifRow
                  key={n.id}
                  n={n}
                  isAdmin={isAdmin}
                  accent={accent}
                  onMarkRead={markRead}
                  onDelete={deleteNotification}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isReviewing={isReviewing}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
