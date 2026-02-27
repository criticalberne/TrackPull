/**
 * Tests for storage key alignment between background and popup.
 */

import { strict as assert } from "assert";
import { STORAGE_KEYS } from "../src/shared/constants";

// Test that storage keys exist and have correct values
console.log("Testing STORAGE_KEYS constant...\n");

function testStorageKeysExist() {
  console.log("Test: Storage keys should exist...");
  
  assert("TRACKMAN_DATA" in STORAGE_KEYS, "TRACKMAN_DATA key should exist");
  assert(STORAGE_KEYS.TRACKMAN_DATA === "trackmanData", "TRACKMAN_DATA value should be 'trackmanData'");
  
  console.log("✓ Storage keys exist with correct values\n");
}

function testStorageKeysUsageInBackground() {
  console.log("Test: Background service worker should use STORAGE_KEYS...");
  
  // Read the serviceWorker.ts file and verify it uses STORAGE_KEYS
  const fs = require('fs');
  const path = require('path');
  
  const serviceWorkerPath = path.join(__dirname, '../src/background/serviceWorker.ts');
  const content = fs.readFileSync(serviceWorkerPath, 'utf8');
  
  assert(content.includes("STORAGE_KEYS"), "serviceWorker.ts should import and use STORAGE_KEYS");
  assert(content.includes('STORAGE_KEYS.TRACKMAN_DATA'), "serviceWorker.ts should reference TRACKMAN_DATA");
  
  console.log("✓ Background service worker uses aligned storage keys\n");
}

function testStorageKeysUsageInPopup() {
  console.log("Test: Popup should use STORAGE_KEYS...");
  
  const fs = require('fs');
  const path = require('path');
  
  const popupPath = path.join(__dirname, '../src/popup/popup.ts');
  const content = fs.readFileSync(popupPath, 'utf8');
  
  assert(content.includes("STORAGE_KEYS"), "popup.ts should import and use STORAGE_KEYS");
  assert(content.includes('STORAGE_KEYS.TRACKMAN_DATA'), "popup.ts should reference TRACKMAN_DATA");
  
  console.log("✓ Popup uses aligned storage keys\n");
}

function testStorageKeysConsistency() {
  console.log("Test: Storage key consistency between components...");
  
  const fs = require('fs');
  const path = require('path');
  
  // Read both files
  const serviceWorkerPath = path.join(__dirname, '../src/background/serviceWorker.ts');
  const popupPath = path.join(__dirname, '../src/popup/popup.ts');
  
  const serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf8');
  const popupContent = fs.readFileSync(popupPath, 'utf8');
  
// Both should reference the constant (which resolves to 'trackmanData')
  // We check for STORAGE_KEYS usage which is the aligned approach
  
  assert(
    serviceWorkerContent.includes('STORAGE_KEYS'),
    "Background should use STORAGE_KEYS constant instead of hardcoded string"
  );
  assert(
    popupContent.includes('STORAGE_KEYS'),
    "Popup should use STORAGE_KEYS constant"
  );
  
  console.log("✓ Storage keys are consistently used across components\n");
}

// Run all tests
try {
  testStorageKeysExist();
  testStorageKeysUsageInBackground();
  testStorageKeysUsageInPopup();
  testStorageKeysConsistency();
  
  console.log("\n=========================================");
  console.log("All storage key alignment tests passed! ✓");
  console.log("=========================================\n");
} catch (error) {
  console.error("\n❌ Test failed:", error.message);
  process.exit(1);
}
