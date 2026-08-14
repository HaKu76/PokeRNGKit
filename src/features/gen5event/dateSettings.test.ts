import { describe, expect, it, vi } from "vitest";
import {
  defaultGen5EventDates,
  loadGen5EventDates,
  saveGen5EventDates,
} from "./dateSettings";

describe("Gen 5 Event date settings", () => {
  const now = new Date(2026, 7, 14, 23, 30);

  it("uses the local calendar date and clamps the supported year", () => {
    expect(defaultGen5EventDates(now)).toEqual({
      startDate: "2026-08-14",
      endDate: "2026-08-14",
    });
    expect(defaultGen5EventDates(new Date(2200, 0, 2))).toEqual({
      startDate: "2099-01-02",
      endDate: "2099-01-02",
    });
  });

  it("loads a valid stored range", () => {
    const storage = {
      getItem: vi.fn(() =>
        JSON.stringify({
          startDate: "2026-08-01",
          endDate: "2026-08-14",
        }),
      ),
      setItem: vi.fn(),
    };
    expect(loadGen5EventDates(storage, now)).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-14",
    });
  });

  it("rejects malformed or impossible stored dates", () => {
    const storage = {
      getItem: vi.fn(() =>
        JSON.stringify({
          startDate: "2026-02-30",
          endDate: "2100-01-01",
        }),
      ),
      setItem: vi.fn(),
    };
    expect(loadGen5EventDates(storage, now)).toEqual({
      startDate: "2026-08-14",
      endDate: "2026-08-14",
    });
  });

  it("falls back when storage is unavailable and ignores write failures", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };
    expect(loadGen5EventDates(storage, now)).toEqual({
      startDate: "2026-08-14",
      endDate: "2026-08-14",
    });
    expect(() =>
      saveGen5EventDates(storage, {
        startDate: "2026-08-01",
        endDate: "2026-08-14",
      }),
    ).not.toThrow();
  });

  it("writes the validated search range", () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    saveGen5EventDates(storage, {
      startDate: "2026-08-01",
      endDate: "2026-08-14",
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      "pokerngkit.gen5event.dates.v1",
      '{"startDate":"2026-08-01","endDate":"2026-08-14"}',
    );
  });
});
