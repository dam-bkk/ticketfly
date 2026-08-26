import { describe, expect, it } from "vitest";
import { alertKey, alertPriority, isDuplicateAlert, pendingAction, pickAssignee, shouldAutoClose } from "./automation";

const d = (s: string) => new Date(s);

describe("shouldAutoClose", () => {
  it("closes resolved tickets after 3 days without a requester reply", () => {
    expect(shouldAutoClose(d("2026-08-20"), null, d("2026-08-23T00:00:01Z"))).toBe(true);
    expect(shouldAutoClose(d("2026-08-20"), null, d("2026-08-22T00:00:00Z"))).toBe(false);
  });
  it("never closes unresolved or re-opened-by-reply tickets", () => {
    expect(shouldAutoClose(null, null, d("2026-08-30"))).toBe(false);
    expect(shouldAutoClose(d("2026-08-20"), d("2026-08-21"), d("2026-08-30"))).toBe(false);
  });
  it("honours a custom window", () => {
    expect(shouldAutoClose(d("2026-08-20"), null, d("2026-08-21"), 1)).toBe(true);
  });
});

describe("pickAssignee", () => {
  const agents = [{ id: 1, open: 3 }, { id: 2, open: 1 }, { id: 3, open: 1 }];
  it("picks the least loaded", () => expect(pickAssignee(agents)!.id).toBe(2));
  it("round-robins among ties", () => {
    expect(pickAssignee(agents, 2)!.id).toBe(3);
    expect(pickAssignee(agents, 3)!.id).toBe(2);
  });
  it("returns null for no agents", () => expect(pickAssignee([])).toBeNull());
  it("ignores lastPicked when only one candidate", () => expect(pickAssignee([{ id: 9, open: 0 }, { id: 1, open: 5 }], 9)!.id).toBe(9));
});

describe("pendingAction", () => {
  it("reminds at 2 days and closes at 7", () => {
    expect(pendingAction(d("2026-08-20"), d("2026-08-21"))).toBe("none");
    expect(pendingAction(d("2026-08-20"), d("2026-08-22"))).toBe("remind");
    expect(pendingAction(d("2026-08-20"), d("2026-08-27"))).toBe("close");
    expect(pendingAction(null, d("2026-08-27"))).toBe("none");
  });
});

describe("alerts", () => {
  it("maps severity and source to priority", () => {
    expect(alertPriority("high", "defender")).toBe("urgent");
    expect(alertPriority("high", "azure_monitor")).toBe("high");
    expect(alertPriority("medium", "intune")).toBe("high");
    expect(alertPriority("low", "intune")).toBe("medium");
  });
  it("builds a stable key ignoring numbers", () => {
    expect(alertKey({ source: "azure_monitor", resource: "HK-DC-FS01", title: "Disk 92% on D:" })).toBe("azure_monitor::hk-dc-fs01::disk #% on d:");
    expect(alertKey({ source: "x", title: "y" })).toBe("x::::y");
  });
  it("detects duplicates inside the window only", () => {
    const k = alertKey({ source: "s", title: "t", resource: "r" });
    expect(isDuplicateAlert([{ key: k, firedAt: d("2026-08-26T01:00") }], { key: k, firedAt: d("2026-08-26T05:00") })).toBe(true);
    expect(isDuplicateAlert([{ key: k, firedAt: d("2026-08-24T01:00") }], { key: k, firedAt: d("2026-08-26T05:00") })).toBe(false);
    expect(isDuplicateAlert([], { key: k, firedAt: d("2026-08-26T05:00") })).toBe(false);
  });
});
