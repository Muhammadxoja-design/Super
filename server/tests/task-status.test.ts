import { describe, expect, it } from "vitest";
import { mapLegacyStatus, parseTaskStatusCallback } from "../task-status";

describe("task status mapping", () => {
  it("maps legacy statuses to canonical", () => {
    expect(mapLegacyStatus("active")).toBe("ACTIVE");
    expect(mapLegacyStatus("new")).toBe("ACTIVE");
    expect(mapLegacyStatus("pending")).toBe("ACTIVE");
    expect(mapLegacyStatus("done")).toBe("DONE");
    expect(mapLegacyStatus("completed")).toBe("DONE");
    expect(mapLegacyStatus("rejected")).toBe("CANNOT_DO");
    expect(mapLegacyStatus(null)).toBe("ACTIVE");
    expect(mapLegacyStatus("unknown")).toBe("ACTIVE");
  });
});

describe("task status callback parser", () => {
  it("parses valid callback", () => {
    const parsed = parseTaskStatusCallback("task_status:12:DONE");
    expect(parsed).toEqual({ assignmentId: 12, status: "DONE" });
  });

  it("rejects invalid callback", () => {
    expect(parseTaskStatusCallback("task_status:foo:DONE")).toBeNull();
    expect(parseTaskStatusCallback("task_status:1:bad")).toBeNull();
    expect(parseTaskStatusCallback("other:1:DONE")).toBeNull();
  });
});
