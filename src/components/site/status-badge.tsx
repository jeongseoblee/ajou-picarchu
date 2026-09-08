import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL, STATUS_LABEL, type MemberRole, type MemberStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: MemberStatus }) {
  const variant = status === "approved" ? "default" : status === "pending" ? "secondary" : "destructive";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}
export function RoleBadge({ role }: { role: MemberRole }) {
  return <Badge variant={role === "admin" ? "default" : "outline"}>{ROLE_LABEL[role]}</Badge>;
}
