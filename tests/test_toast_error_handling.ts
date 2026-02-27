/**
 * Tests for toast error handling in capture and export operations.
 */

import { strict as assert } from "assert";
import * as fs from "fs";
import * as path from "path";

console.log("Testing toast error handling...\n");

function testInterceptorHasCaptureErrorHandling() {
  console.log("Test: Interceptor should handle capture errors...");
  
  const interceptorPath = path.join(__dirname, '../src/content/interceptor.ts');
  const content = fs.readFileSync(interceptorPath, 'utf8');
  
  assert(
    content.includes('catch (error)'),
    "interceptor.ts should have error handling in intercept method"
  );
  assert(
    content.includes('sendMessage'),
    "interceptor.ts should send error message to background when capture fails"
  );
  assert(
    content.includes('CAPTURE_ERROR'),
    "interceptor.ts should send CAPTURE_ERROR type message"
  );
  
  console.log("✓ Interceptor has proper error handling for capture failures\n");
}

function testCsvWriterHasErrorHandling() {
  console.log("Test: CSV writer should handle export errors...");
  
  const csvWriterPath = path.join(__dirname, '../src/shared/csv_writer.ts');
  const content = fs.readFileSync(csvWriterPath, 'utf8');
  
  assert(
    content.includes('catch (error)'),
    "csv_writer.ts should have error handling in writeCsv function"
  );
  assert(
    content.includes('toast-container'),
    "csv_writer.ts should create toast notification for errors"
  );
  assert(
    content.includes('toast error'),
    "csv_writer.ts should use error styling for toast notifications"
  );
  
  console.log("✓ CSV writer has proper error handling for export failures\n");
}

function testPopupHasToastFunction() {
  console.log("Test: Popup should have showToast function...");
  
  const popupPath = path.join(__dirname, '../src/popup/popup.ts');
  const content = fs.readFileSync(popupPath, 'utf8');
  
  assert(
    content.includes('function showToast'),
    "popup.ts should define showToast function"
  );
  assert(
    content.includes('"error"') && content.includes('"success"'),
    "showToast should support both error and success types"
  );
  assert(
    content.includes('toast-container'),
    "showToast should append toasts to toast-container"
  );
  
  console.log("✓ Popup has showToast function for displaying notifications\n");
}

function testPopupUsesToastForErrors() {
  console.log("Test: Popup should use showToast for error cases...");
  
  const popupPath = path.join(__dirname, '../src/popup/popup.ts');
  const content = fs.readFileSync(popupPath, 'utf8');
  
  assert(
    content.match(/showToast\([^)]+"error"\)/),
    "popup should call showToast with error type for failures"
  );
  assert(
    content.includes('No data to export') || content.includes('No valid data'),
    "popup should show meaningful error messages when no data available"
  );
  
  console.log("✓ Popup uses showToast for displaying errors\n");
}

function testToastAnimationExists() {
  console.log("Test: Toast notifications should have animations...");
  
  const popupHtmlPath = path.join(__dirname, '../src/popup/popup.html');
  const content = fs.readFileSync(popupHtmlPath, 'utf8');
  
  assert(
    content.includes('@keyframes slideIn'),
    "popup.html should define slideIn animation for toasts"
  );
  assert(
    content.includes('@keyframes slideOut'),
    "popup.html should define slideOut animation for toasts"
  );
  assert(
    content.includes('.toast.hiding'),
    "popup.html should handle toast hiding state"
  );
  
  console.log("✓ Toast notifications have proper animations\n");
}

function testToastStylingForErrorAndSuccess() {
  console.log("Test: Toast should have distinct styling for error and success...");
  
  const popupHtmlPath = path.join(__dirname, '../src/popup/popup.html');
  const content = fs.readFileSync(popupHtmlPath, 'utf8');
  
  assert(
    content.includes('.toast.error'),
    "popup.html should have .toast.error styling"
  );
  assert(
    content.includes('.toast.success'),
    "popup.html should have .toast.success styling"
  );
  assert(
    content.includes('#d32f2f') || content.includes('red'),
    "error toast should use red color scheme"
  );
  assert(
    content.includes('#388e3c') || content.includes('green'),
    "success toast should use green color scheme"
  );
  
  console.log("✓ Toast has distinct styling for error and success states\n");
}

// Run all tests
try {
  testInterceptorHasCaptureErrorHandling();
  testCsvWriterHasErrorHandling();
  testPopupHasToastFunction();
  testPopupUsesToastForErrors();
  testToastAnimationExists();
  testToastStylingForErrorAndSuccess();
  
  console.log("\n=========================================");
  console.log("All toast error handling tests passed! ✓");
  console.log("=========================================\n");
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("\n❌ Test failed:", errorMessage);
  process.exit(1);
}
