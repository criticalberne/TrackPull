(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/prompt_types.ts
  var BUILTIN_PROMPTS;
  var init_prompt_types = __esm({
    "src/shared/prompt_types.ts"() {
      BUILTIN_PROMPTS = [
        {
          id: "session-overview-beginner",
          name: "Session Overview",
          tier: "beginner",
          topic: "overview",
          template: `You are a friendly golf coach reviewing a player's Trackman session. Your job is to encourage them and help them improve.

Here is the tab-separated Trackman golf session data from their session today:

{{DATA}}

Please review this data and give the player a warm, encouraging summary. Include:
- 2 to 3 things they did well today (be specific, mention clubs or metrics if they stand out)
- 1 to 2 things to focus on for next time (keep it simple and actionable)
- A short encouraging closing message

Use simple language. Avoid heavy technical jargon. Speak directly to the player like a supportive coach.`
        },
        {
          id: "club-breakdown-intermediate",
          name: "Club-by-Club Breakdown",
          tier: "intermediate",
          topic: "club-breakdown",
          template: `You are a golf performance analyst reviewing a player's Trackman session data.

Here is the tab-separated Trackman golf session data:

{{DATA}}

Please provide a club-by-club breakdown of this session. For each club represented in the data:
- Summarize average carry distance and ball speed
- Note the player's strengths with that club
- Identify weaknesses or areas for improvement

Then provide an overall summary:
- Which clubs are performing the strongest?
- Where are the biggest distance gaps between clubs? Are those gaps appropriate?
- What 1 to 2 adjustments would most improve overall performance?

Use moderate technical depth. Briefly explain what metrics mean when you reference them.`
        },
        {
          id: "consistency-analysis-advanced",
          name: "Consistency Analysis",
          tier: "advanced",
          topic: "consistency",
          template: `You are a technical golf data analyst. Analyze the following Trackman session data with a numbers-first approach.

Tab-separated Trackman golf session data:

{{DATA}}

Perform a consistency analysis across all shots and clubs:
- Calculate or estimate standard deviation ranges for key metrics (club speed, ball speed, launch angle, spin rate, carry)
- Identify which clubs show the tightest dispersion and which are most variable
- Analyze shot-to-shot repeatability patterns: is the player consistent in face angle, club path, and dynamic loft?
- Identify any outlier shots (significant deviations from the mean) and note which metrics are responsible
- Provide a consistency rating summary per club and overall

Reference specific metric values and numbers throughout. Prioritize data over general advice.`
        },
        {
          id: "launch-spin-intermediate",
          name: "Launch & Spin Optimization",
          tier: "intermediate",
          topic: "launch-spin",
          template: `You are a golf performance analyst specializing in launch conditions and spin optimization.

Here is the tab-separated Trackman golf session data:

{{DATA}}

Analyze the player's launch and spin data:
- Review launch angle and spin rate combinations per club
- Compare them to typical optimal windows for each club type (e.g., driver: ~12-15 deg launch, ~2200-2700 rpm spin)
- Analyze spin axis data to understand curve tendencies (positive = draw/hook, negative = fade/slice)
- Identify which clubs are closest to optimal and which are farthest

For clubs that are outside optimal windows:
- Explain what the current numbers mean in terms of ball flight (too high, too low, too much spin, etc.)
- Suggest specific adjustments to move toward optimal conditions

Use moderate technical depth and explain what metrics mean for players who are learning.`
        },
        {
          id: "distance-gapping-beginner",
          name: "Distance Gapping Report",
          tier: "beginner",
          topic: "distance-gapping",
          template: `You are a friendly golf coach helping a player understand their distance gapping.

Here is the tab-separated Trackman golf session data:

{{DATA}}

Please review the carry and total distances for each club in this session. Then:
- List the average carry distance for each club in a simple, easy-to-read format
- Look at the gaps between consecutive clubs -- are there any big jumps or clubs that overlap?
- Let the player know if their gapping looks good or if there are clubs that might be missing or overlapping
- Give 1 to 2 friendly suggestions for the player's bag setup or club selection

Keep it simple and encouraging. Focus on practical take-aways the player can use on the course.`
        },
        {
          id: "shot-shape-intermediate",
          name: "Shot Shape & Dispersion",
          tier: "intermediate",
          topic: "shot-shape",
          template: `You are a golf performance analyst reviewing a player's shot shape and dispersion patterns.

Here is the tab-separated Trackman golf session data:

{{DATA}}

Analyze the player's shot shape and miss patterns:
- Review face angle, club path, face-to-path, and curve values to characterize their typical shot shape per club
- Identify if they play a consistent shot shape (draw, fade, straight) or if the pattern varies
- Review the Side and CarrySide data to understand lateral dispersion -- how far off-center do shots typically land?
- Identify their most common miss direction and the likely technical cause (face angle, path, or both)

Provide:
- A shot shape profile for each club (e.g., "mild fade", "variable with occasional hook")
- An overall assessment of dispersion consistency
- 1 to 2 actionable suggestions to tighten their pattern

Use moderate technical depth. Briefly explain what each metric means.`
        },
        {
          id: "club-delivery-advanced",
          name: "Club Delivery Analysis",
          tier: "advanced",
          topic: "club-delivery",
          template: `You are a technical golf analyst conducting a detailed club delivery analysis.

Tab-separated Trackman golf session data:

{{DATA}}

Analyze club delivery metrics across all clubs and shots. Focus on:
- Attack Angle: positive (ascending) vs negative (descending) and its effect on spin and launch
- Club Path (in/out vs out/in) and how it correlates to curve and spin axis
- Face Angle at impact and the face-to-path relationship as the primary driver of curvature
- Dynamic Loft per club and how it compares to expected values; note any outlier loft conditions
- Correlation analysis: identify which delivery metrics most strongly predict carry distance, spin rate, and side error for this player

For each major club category (driver, irons, wedges):
- Report average delivery numbers
- Identify the most impactful delivery variable affecting performance
- Flag any delivery patterns that suggest mechanical inefficiency

Prioritize numbers and specific metric values. Provide a ranked list of delivery improvements by expected performance impact.`
        },
        {
          id: "quick-summary-beginner",
          name: "Quick Session Summary",
          tier: "beginner",
          topic: "quick-summary",
          template: `You are a friendly golf coach. Give the player a fast, upbeat summary of their Trackman session.

Here is the tab-separated Trackman golf session data from their session:

{{DATA}}

Provide a very short, friendly summary in 3 to 4 bullet points only. Cover:
- Their best performing club today
- Their longest carry shot (club and distance)
- Their most consistent club (tightest results)
- One quick positive takeaway to leave them feeling good

Keep it brief and encouraging. No heavy analysis needed -- just the headlines.`
        }
      ];
    }
  });

  // src/shared/constants.ts
  var CUSTOM_PROMPT_KEY_PREFIX, CUSTOM_PROMPT_IDS_KEY, STORAGE_KEYS;
  var init_constants = __esm({
    "src/shared/constants.ts"() {
      CUSTOM_PROMPT_KEY_PREFIX = "customPrompt_";
      CUSTOM_PROMPT_IDS_KEY = "customPromptIds";
      STORAGE_KEYS = {
        TRACKMAN_DATA: "trackmanData",
        SPEED_UNIT: "speedUnit",
        DISTANCE_UNIT: "distanceUnit",
        SELECTED_PROMPT_ID: "selectedPromptId",
        AI_SERVICE: "aiService",
        HITTING_SURFACE: "hittingSurface",
        INCLUDE_AVERAGES: "includeAverages",
        SESSION_HISTORY: "sessionHistory",
        IMPORT_STATUS: "importStatus"
      };
    }
  });

  // src/shared/custom_prompts.ts
  async function loadCustomPrompts() {
    const idsResult = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
    const ids = idsResult[CUSTOM_PROMPT_IDS_KEY] ?? [];
    if (ids.length === 0) return [];
    const keys = ids.map((id) => CUSTOM_PROMPT_KEY_PREFIX + id);
    const promptsResult = await chrome.storage.sync.get(keys);
    return ids.map((id) => promptsResult[CUSTOM_PROMPT_KEY_PREFIX + id]).filter((p) => p !== void 0);
  }
  async function saveCustomPrompt(prompt) {
    const key = CUSTOM_PROMPT_KEY_PREFIX + prompt.id;
    const result = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
    const ids = result[CUSTOM_PROMPT_IDS_KEY] ?? [];
    if (!ids.includes(prompt.id)) {
      ids.push(prompt.id);
    }
    await chrome.storage.sync.set({
      [key]: prompt,
      [CUSTOM_PROMPT_IDS_KEY]: ids
    });
  }
  async function deleteCustomPrompt(id) {
    const key = CUSTOM_PROMPT_KEY_PREFIX + id;
    const idsResult = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
    const ids = idsResult[CUSTOM_PROMPT_IDS_KEY] ?? [];
    const newIds = ids.filter((i) => i !== id);
    await chrome.storage.sync.remove(key);
    await chrome.storage.sync.set({ [CUSTOM_PROMPT_IDS_KEY]: newIds });
  }
  var init_custom_prompts = __esm({
    "src/shared/custom_prompts.ts"() {
      init_constants();
    }
  });

  // src/options/options.ts
  var require_options = __commonJS({
    "src/options/options.ts"() {
      init_prompt_types();
      init_custom_prompts();
      init_constants();
      var editingPromptId = null;
      document.addEventListener("DOMContentLoaded", async () => {
        renderBuiltInPrompts();
        await renderCustomPrompts();
        setupNewPromptForm();
        await restoreAiPreference();
      });
      function renderBuiltInPrompts() {
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
      async function renderCustomPrompts() {
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
      function openEditForm(prompt) {
        editingPromptId = prompt.id;
        const nameInput = document.getElementById("prompt-name-input");
        const templateInput = document.getElementById("prompt-template-input");
        const form = document.getElementById("prompt-form");
        const newPromptBtn = document.getElementById("new-prompt-btn");
        if (nameInput) nameInput.value = prompt.name;
        if (templateInput) templateInput.value = prompt.template;
        if (form) form.style.display = "block";
        if (newPromptBtn) newPromptBtn.style.display = "none";
      }
      function setupNewPromptForm() {
        const newPromptBtn = document.getElementById("new-prompt-btn");
        const form = document.getElementById("prompt-form");
        const saveBtn = document.getElementById("save-prompt-btn");
        const cancelBtn = document.getElementById("cancel-prompt-btn");
        const nameInput = document.getElementById("prompt-name-input");
        const templateInput = document.getElementById("prompt-template-input");
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
          const prompt = { id, name: nameValue, template: templateValue };
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
      async function restoreAiPreference() {
        const select = document.getElementById("options-ai-service");
        if (!select) return;
        const result = await chrome.storage.sync.get([STORAGE_KEYS.AI_SERVICE]);
        const savedService = result[STORAGE_KEYS.AI_SERVICE];
        if (savedService) {
          select.value = savedService;
        }
        select.addEventListener("change", () => {
          chrome.storage.sync.set({ [STORAGE_KEYS.AI_SERVICE]: select.value });
        });
      }
      function showToast(message, type) {
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
        const duration = type === "error" ? 5e3 : 3e3;
        setTimeout(() => {
          if (toast.parentNode) {
            toast.classList.add("hiding");
            setTimeout(() => toast.remove(), 300);
          }
        }, duration);
      }
    }
  });
  require_options();
})();
