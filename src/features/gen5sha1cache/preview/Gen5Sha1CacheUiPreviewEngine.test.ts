import { describe, expect, it, vi } from "vitest";
import { parseGen5IvCache, type Gen5Sha1CacheRequest } from "../domain";
import { Gen5Sha1CacheUiPreviewEngine } from "./Gen5Sha1CacheUiPreviewEngine";

function request(): Gen5Sha1CacheRequest {
  const buffer = new ArrayBuffer((3 + 9) * 4);
  const view = new DataView(buffer);
  view.setUint32(0, 0xd08c_b7c0, true);
  return {
    profile: {
      version: "black",
      language: "english",
      dsType: "ds",
      mac: "0",
      vcount: 0x60,
      timer0Min: 0xc7f,
      timer0Max: 0xc7f,
      gxstat: 6,
      vframe: 8,
    },
    startDate: "2000-01-01",
    endDate: "2000-01-01",
    seeds: parseGen5IvCache(buffer, "black"),
  };
}

describe("Gen5Sha1CacheUiPreviewEngine", () => {
  it("returns a deterministic cache and complete progress", async () => {
    const onProgress = vi.fn();
    const result = await new Gen5Sha1CacheUiPreviewEngine().search(request(), {
      onProgress,
    });
    expect(result.cancelled).toBe(false);
    expect(result.resultCount).toBe(1);
    expect(result.cache.normal).toHaveLength(1);
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ percent: 100, resultCount: 1 }),
    );
  });
});
