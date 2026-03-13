import { TASK_STATUSES, TASK_STATUS_LABELS } from "@shared/schema";

export type TaskStatus = (typeof TASK_STATUSES)[number];

export function mapLegacyStatus(status?: string | null): TaskStatus {
  if (!status) return "ACTIVE";
  const normalized = status.toLowerCase();
  if (["active", "new", "pending", "accepted", "in_progress"].includes(normalized)) {
    return "ACTIVE";
  }
  if (["done", "completed"].includes(normalized)) {
    return "DONE";
  }
  if (["rejected"].includes(normalized)) {
    return "CANNOT_DO";
  }
  return "ACTIVE";
}

export function getStatusLabel(status: TaskStatus) {
  return TASK_STATUS_LABELS[status] || status;
}

export function parseTaskStatusCallback(data?: string | null): {
  assignmentId: number;
  status: TaskStatus;
} | null {
  if (!data || !data.startsWith("task_status:")) return null;
  const [, assignmentIdRaw, statusRaw] = data.split(":");
  const assignmentId = Number(assignmentIdRaw);
  if (!Number.isFinite(assignmentId)) return null;
  if (!TASK_STATUSES.includes(statusRaw as TaskStatus)) return null;
  return {
    assignmentId,
    status: statusRaw as TaskStatus,
  };
}
