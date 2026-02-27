/**
 * Service Worker for Trackman Scraper Chrome Extension
 */

import { STORAGE_KEYS } from "../shared/constants";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Trackman Scraper extension installed");
});

interface ExportCsvRequest {
  type: 'EXPORT_CSV';
  csvContent: string;
  filename: string;
}

interface GetDataRequest {
  type: 'GET_DATA';
}

type RequestMessage = ExportCsvRequest | GetDataRequest;

chrome.runtime.onMessage.addListener((message: RequestMessage, sender, sendResponse) => {
  if (message.type === "GET_DATA") {
    chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], (result) => {
      sendResponse(result[STORAGE_KEYS.TRACKMAN_DATA] || null);
    });
    return true;
  }

  if (message.type === 'EXPORT_CSV') {
    chrome.downloads.download(
      {
        url: `data:text/csv;charset=utf-8,${encodeURIComponent(message.csvContent)}`,
        filename: message.filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Trackman Scraper: Download failed:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log(`Trackman Scraper: CSV exported with download ID ${downloadId}`);
          sendResponse({ success: true, downloadId });
        }
      }
    );
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes[STORAGE_KEYS.TRACKMAN_DATA]) {
    const newValue = changes[STORAGE_KEYS.TRACKMAN_DATA].newValue;
    chrome.runtime.sendMessage({ type: 'DATA_UPDATED', data: newValue });
  }
});
