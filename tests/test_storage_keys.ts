/**
 * Tests for storage key alignment between background and popup.
 */

import { describe, it, expect } from "vitest";
import { STORAGE_KEYS } from "../src/shared/constants";
import * as fs from "fs";
import * as path from "path";

describe("STORAGE_KEYS constant", () => {
  it("has TRACKMAN_DATA key with correct value", () => {
    expect("TRACKMAN_DATA" in STORAGE_KEYS).toBe(true);
    expect(STORAGE_KEYS.TRACKMAN_DATA).toBe("trackmanData");
  });
});

describe("Storage key usage in source files", () => {
  it("background service worker uses STORAGE_KEYS", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "../src/background/serviceWorker.ts"),
      "utf8"
    );

    expect(content).toContain("STORAGE_KEYS");
    expect(content).toContain("STORAGE_KEYS.TRACKMAN_DATA");
  });

  it("popup uses STORAGE_KEYS", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "../src/popup/popup.ts"),
      "utf8"
    );

    expect(content).toContain("STORAGE_KEYS");
    expect(content).toContain("STORAGE_KEYS.TRACKMAN_DATA");
  });

  it("both components use STORAGE_KEYS consistently", () => {
    const swContent = fs.readFileSync(
      path.join(__dirname, "../src/background/serviceWorker.ts"),
      "utf8"
    );
    const popupContent = fs.readFileSync(
      path.join(__dirname, "../src/popup/popup.ts"),
      "utf8"
    );

    expect(swContent).toContain("STORAGE_KEYS");
    expect(popupContent).toContain("STORAGE_KEYS");
  });
});
