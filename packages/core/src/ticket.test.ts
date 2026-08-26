import { describe, expect, it } from "vitest";
import { canTransition, fallbackRef, formatTicketRef, isSlaPaused, nextStatuses, parseLegacyRef, parseSubjectTag, priorityFromMatrix, refPrefix } from "./ticket";

describe("status machine", () => {
  it("allows documented transitions", () => {
    expect(canTransition("open", "in_progress")).toBe(true);
    expect(canTransition("resolved", "closed")).toBe(true);
    expect(canTransition("closed", "open")).toBe(true);
  });
  it("refuses skipping to closed", () => {
    expect(canTransition("open", "closed")).toBe(false);
    expect(nextStatuses("closed")).toEqual(["open"]);
  });
  it("knows paused statuses", () => {
    expect(isSlaPaused("pending")).toBe(true);
    expect(isSlaPaused("on_hold")).toBe(true);
    expect(isSlaPaused("open")).toBe(false);
  });
});

describe("priority matrix", () => {
  it("maps impact × urgency", () => {
    expect(priorityFromMatrix("high", "high")).toBe("urgent");
    expect(priorityFromMatrix("high", "medium")).toBe("high");
    expect(priorityFromMatrix("medium", "medium")).toBe("medium");
    expect(priorityFromMatrix("low", "low")).toBe("low");
    expect(priorityFromMatrix("low", "medium")).toBe("low");
  });
});

describe("references", () => {
  it("parses legacy refs from any text", () => {
    expect(parseLegacyRef("Re: [#INC-12345] printer")).toEqual({ prefix: "INC", number: 12345, ref: "INC-12345" });
    expect(parseLegacyRef("/fs/sr-9")).toEqual({ prefix: "SR", number: 9, ref: "SR-9" });
    expect(parseLegacyRef("nothing here")).toBeNull();
  });
  it("continues the Freshservice INC-/SR- scheme", () => {
    expect(refPrefix("incident")).toBe("INC");
    expect(refPrefix("request")).toBe("SR");
    expect(refPrefix("onboarding")).toBe("SR");
    expect(refPrefix("change")).toBe("CHG");
    expect(formatTicketRef("incident", 229190)).toBe("INC-229190");
    expect(fallbackRef(42)).toBe("#42");
  });
  it("adds the new board states to the machine", () => {
    expect(canTransition("open", "pending_approval")).toBe(true);
    expect(canTransition("pending_approval", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "transferred")).toBe(true);
    expect(canTransition("cancelled", "open")).toBe(true);
    expect(canTransition("resolved", "cancelled")).toBe(false);
    expect(isSlaPaused("pending_approval")).toBe(true);
  });
  it("parses subject tags for threading", () => {
    expect(parseSubjectTag("RE: [#tf-000042] VPN")).toBe("TF-000042");
    expect(parseSubjectTag("RE: [#INC-7] VPN")).toBe("INC-7");
    expect(parseSubjectTag("Request for X : thing #SR-229189")).toBe("SR-229189");
    expect(parseSubjectTag("no tag")).toBeNull();
  });
});
