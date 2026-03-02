/**
 * Tests for toast error handling in capture and export operations.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Interceptor error handling", () => {
  const content = fs.readFileSync(
    path.join(__dirname, "../src/content/interceptor.ts"),
    "utf8"
  );

  it("has try/catch error handling", () => {
    expect(content).toContain("catch");
  });
});

describe("Popup toast functionality", () => {
  const popupContent = fs.readFileSync(
    path.join(__dirname, "../src/popup/popup.ts"),
    "utf8"
  );

  it("defines showToast function", () => {
    expect(popupContent).toContain("function showToast");
  });

  it("supports both error and success types", () => {
    expect(popupContent).toContain('"error"');
    expect(popupContent).toContain('"success"');
  });

  it("appends toasts to toast-container", () => {
    expect(popupContent).toContain("toast-container");
  });

  it("calls showToast with error type for failures", () => {
    expect(popupContent).toMatch(/showToast\([^)]+"error"\)/);
  });

  it("shows meaningful error messages for failures", () => {
    expect(popupContent).toContain("Export failed");
  });
});

describe("Toast styling in popup.html", () => {
  const htmlContent = fs.readFileSync(
    path.join(__dirname, "../src/popup/popup.html"),
    "utf8"
  );

  it("defines slideIn animation", () => {
    expect(htmlContent).toContain("@keyframes slideIn");
  });

  it("defines slideOut animation", () => {
    expect(htmlContent).toContain("@keyframes slideOut");
  });

  it("handles toast hiding state", () => {
    expect(htmlContent).toContain(".toast.hiding");
  });

  it("has distinct error styling", () => {
    expect(htmlContent).toContain(".toast.error");
    const hasRedColor = htmlContent.includes("#d32f2f") || htmlContent.includes("red");
    expect(hasRedColor).toBe(true);
  });

  it("has distinct success styling", () => {
    expect(htmlContent).toContain(".toast.success");
    const hasGreenColor = htmlContent.includes("#388e3c") || htmlContent.includes("green");
    expect(hasGreenColor).toBe(true);
  });
});
