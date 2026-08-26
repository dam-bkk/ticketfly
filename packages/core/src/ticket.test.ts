import { describe, expect, it } from "vitest";
import { canTransition, formatTicketRef, isSlaPaused, nextStatuses, parseLegacyRef, parseSubjectTag, priorityFromMatrix } from "./ticket";

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
  it("formats TicketFly refs", () => {
    expect(formatTicketRef(42)).toBe("TF-000042");
    expect(formatTicketRef(1234567)).toBe("TF-1234567");
  });
  it("parses subject tags for threading", () => {
    expect(parseSubjectTag("RE: [#tf-000042] VPN")).toBe("TF-000042");
    expect(parseSubjectTag("RE: [#INC-7] VPN")).toBe("INC-7");
    expect(parseSubjectTag("no tag")).toBeNull();
  });
});
