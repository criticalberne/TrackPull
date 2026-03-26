import { describe, it, expect } from "vitest";
import { PORTAL_ORIGINS } from "../src/shared/portalPermissions";

describe("portalPermissions", () => {
  it("exports PORTAL_ORIGINS with two portal domains", () => {
    expect(PORTAL_ORIGINS).toHaveLength(2);
    expect(PORTAL_ORIGINS).toContain("https://api.trackmangolf.com/*");
    expect(PORTAL_ORIGINS).toContain("https://portal.trackmangolf.com/*");
  });

  it("PORTAL_ORIGINS entries match manifest optional_host_permissions", async () => {
    const fs = await import("fs");
    const manifest = JSON.parse(
      fs.readFileSync("src/manifest.json", "utf-8")
    );
    const optional = manifest.optional_host_permissions as string[];
    expect(new Set(PORTAL_ORIGINS)).toEqual(new Set(optional));
  });
});
