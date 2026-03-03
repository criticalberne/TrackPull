/**
 * Options page UI logic for TrackPull Extension.
 * Handles CRUD operations for custom prompts and AI service preference.
 */

import { BUILTIN_PROMPTS } from "../shared/prompt_types";
import type { CustomPrompt } from "../shared/prompt_types";
import { loadCustomPrompts, saveCustomPrompt, deleteCustomPrompt } from "../shared/custom_prompts";
import { STORAGE_KEYS } from "../shared/constants";

/** Tracks which custom prompt is being edited (null = creating new) */
let editingPromptId: string | null = null;

document.addEventListener("DOMContentLoaded", async () => {
  renderBuiltInPrompts();
  await renderCustomPrompts();
  setupNewPromptForm();
  await restoreAiPreference();
});

/** Renders all built-in prompts as read-only items. */
function renderBuiltInPrompts(): void {
  const container = document.getElementById("builtin-prompts-list");
  if (!container) return;

  container.innerHTML = "";

  for (const prompt of BUILTIN_PROMPTS) {
    const item = document.createElement("div");
    item.className = "builtin-prompt-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "prompt-name";
    nameSpan.textContent = prompt.name;

    const tierBadge = document.createElement("span");
    tierBadge.className = `tier-badge ${prompt.tier}`;
    tierBadge.textContent = prompt.tier.charAt(0).toUpperCase() + prompt.tier.slice(1);

    item.appendChild(nameSpan);
    item.appendChild(tierBadge);
    container.appendChild(item);
  }
}

/** Renders all custom prompts with edit and delete buttons. */
async function renderCustomPrompts(): Promise<void> {
  const container = document.getElementById("custom-prompts-list");
  if (!container) return;

  container.innerHTML = "";

  const prompts = await loadCustomPrompts();

  if (prompts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "no-custom-prompts";
    empty.textContent = "No custom prompts yet.";
    container.appendChild(empty);
    return;
  }

  for (const prompt of prompts) {
    const item = document.createElement("div");
    item.className = "custom-prompt-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "custom-prompt-name";
    nameSpan.textContent = prompt.name;

    const actions = document.createElement("div");
    actions.className = "custom-prompt-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-action";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditForm(prompt));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-action delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      if (!window.confirm("Delete this prompt?")) return;
      try {
        await deleteCustomPrompt(prompt.id);
        await renderCustomPrompts();
        showToast("Prompt deleted.", "success");
      } catch {
        showToast("Failed to delete prompt.", "error");
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(nameSpan);
    item.appendChild(actions);
    container.appendChild(item);
  }
}

/** Pre-fills and shows the prompt form for editing an existing prompt. */
function openEditForm(prompt: CustomPrompt): void {
  editingPromptId = prompt.id;

  const nameInput = document.getElementById("prompt-name-input") as HTMLInputElement | null;
  const templateInput = document.getElementById("prompt-template-input") as HTMLTextAreaElement | null;
  const form = document.getElementById("prompt-form");
  const newPromptBtn = document.getElementById("new-prompt-btn");

  if (nameInput) nameInput.value = prompt.name;
  if (templateInput) templateInput.value = prompt.template;
  if (form) form.style.display = "block";
  if (newPromptBtn) newPromptBtn.style.display = "none";
}

/** Sets up the new prompt form event listeners. */
function setupNewPromptForm(): void {
  const newPromptBtn = document.getElementById("new-prompt-btn");
  const form = document.getElementById("prompt-form");
  const saveBtn = document.getElementById("save-prompt-btn");
  const cancelBtn = document.getElementById("cancel-prompt-btn");
  const nameInput = document.getElementById("prompt-name-input") as HTMLInputElement | null;
  const templateInput = document.getElementById("prompt-template-input") as HTMLTextAreaElement | null;

  if (!newPromptBtn || !form || !saveBtn || !cancelBtn || !nameInput || !templateInput) return;

  newPromptBtn.addEventListener("click", () => {
    editingPromptId = null;
    nameInput.value = "";
    templateInput.value = "";
    form.style.display = "block";
    newPromptBtn.style.display = "none";
    nameInput.focus();
  });

  cancelBtn.addEventListener("click", () => {
    editingPromptId = null;
    nameInput.value = "";
    templateInput.value = "";
    form.style.display = "none";
    newPromptBtn.style.display = "inline-flex";
  });

  saveBtn.addEventListener("click", async () => {
    const nameValue = nameInput.value.trim();
    const templateValue = templateInput.value.trim();

    if (!nameValue) {
      showToast("Prompt name is required.", "error");
      nameInput.focus();
      return;
    }

    if (!templateValue) {
      showToast("Template is required.", "error");
      templateInput.focus();
      return;
    }

    const id = editingPromptId ?? crypto.randomUUID();
    const prompt: CustomPrompt = { id, name: nameValue, template: templateValue };

    try {
      await saveCustomPrompt(prompt);
      showToast(editingPromptId ? "Prompt updated." : "Prompt saved.", "success");
      editingPromptId = null;
      nameInput.value = "";
      templateInput.value = "";
      form.style.display = "none";
      newPromptBtn.style.display = "inline-flex";
      await renderCustomPrompts();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("QUOTA_BYTES")) {
        showToast("Storage full. Delete prompts to save new ones.", "error");
      } else {
        showToast("Failed to save prompt. Please try again.", "error");
      }
    }
  });
}

/** Restores the AI service preference from chrome.storage.sync. */
async function restoreAiPreference(): Promise<void> {
  const select = document.getElementById("options-ai-service") as HTMLSelectElement | null;
  if (!select) return;

  const result = await chrome.storage.sync.get([STORAGE_KEYS.AI_SERVICE]);
  const savedService = result[STORAGE_KEYS.AI_SERVICE] as string | undefined;
  if (savedService) {
    select.value = savedService;
  }

  select.addEventListener("change", () => {
    chrome.storage.sync.set({ [STORAGE_KEYS.AI_SERVICE]: select.value });
  });
}

/** Displays a temporary toast notification. */
function showToast(message: string, type: "success" | "error"): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const existingToast = container.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute("role", type === "error" ? "alert" : "status");

  container.appendChild(toast);

  const duration = type === "error" ? 5000 : 3000;
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("hiding");
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}
