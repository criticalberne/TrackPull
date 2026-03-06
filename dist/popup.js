(() => {
  // src/shared/constants.ts
  var METRIC_DISPLAY_NAMES = {
    ClubSpeed: "Club Speed",
    BallSpeed: "Ball Speed",
    SmashFactor: "Smash Factor",
    AttackAngle: "Attack Angle",
    ClubPath: "Club Path",
    FaceAngle: "Face Angle",
    FaceToPath: "Face To Path",
    SwingDirection: "Swing Direction",
    DynamicLoft: "Dynamic Loft",
    SpinRate: "Spin Rate",
    SpinAxis: "Spin Axis",
    SpinLoft: "Spin Loft",
    LaunchAngle: "Launch Angle",
    LaunchDirection: "Launch Direction",
    Carry: "Carry",
    Total: "Total",
    Side: "Side",
    SideTotal: "Side Total",
    CarrySide: "Carry Side",
    TotalSide: "Total Side",
    Height: "Height",
    MaxHeight: "Max Height",
    Curve: "Curve",
    LandingAngle: "Landing Angle",
    HangTime: "Hang Time",
    LowPointDistance: "Low Point",
    ImpactHeight: "Impact Height",
    ImpactOffset: "Impact Offset",
    Tempo: "Tempo"
  };
  var CUSTOM_PROMPT_KEY_PREFIX = "customPrompt_";
  var CUSTOM_PROMPT_IDS_KEY = "customPromptIds";
  var STORAGE_KEYS = {
    TRACKMAN_DATA: "trackmanData",
    SPEED_UNIT: "speedUnit",
    DISTANCE_UNIT: "distanceUnit",
    SELECTED_PROMPT_ID: "selectedPromptId",
    AI_SERVICE: "aiService",
    HITTING_SURFACE: "hittingSurface",
    INCLUDE_AVERAGES: "includeAverages",
    SESSION_HISTORY: "sessionHistory"
  };

  // src/shared/unit_normalization.ts
  var DEFAULT_UNIT_CHOICE = { speed: "mph", distance: "yards" };
  var UNIT_SYSTEMS = {
    // Imperial (yards, degrees) - most common
    "789012": {
      id: "789012",
      name: "Imperial",
      distanceUnit: "yards",
      angleUnit: "degrees",
      speedUnit: "mph"
    },
    // Metric (meters, radians)
    "789013": {
      id: "789013",
      name: "Metric (rad)",
      distanceUnit: "meters",
      angleUnit: "radians",
      speedUnit: "km/h"
    },
    // Metric (meters, degrees) - less common
    "789014": {
      id: "789014",
      name: "Metric (deg)",
      distanceUnit: "meters",
      angleUnit: "degrees",
      speedUnit: "km/h"
    }
  };
  var DISTANCE_METRICS = /* @__PURE__ */ new Set([
    "Carry",
    "Total",
    "Side",
    "SideTotal",
    "CarrySide",
    "TotalSide",
    "Height",
    "MaxHeight",
    "Curve"
  ]);
  var SMALL_DISTANCE_METRICS = /* @__PURE__ */ new Set([
    "LowPointDistance"
  ]);
  var ANGLE_METRICS = /* @__PURE__ */ new Set([
    "AttackAngle",
    "ClubPath",
    "FaceAngle",
    "FaceToPath",
    "DynamicLoft",
    "LaunchAngle",
    "LaunchDirection",
    "LandingAngle"
  ]);
  var SPEED_METRICS = /* @__PURE__ */ new Set([
    "ClubSpeed",
    "BallSpeed",
    "Tempo"
  ]);
  var DEFAULT_UNIT_SYSTEM = UNIT_SYSTEMS["789012"];
  var SPEED_LABELS = {
    "mph": "mph",
    "m/s": "m/s"
  };
  var DISTANCE_LABELS = {
    "yards": "yds",
    "meters": "m"
  };
  var SMALL_DISTANCE_LABELS = {
    "inches": "in",
    "cm": "cm"
  };
  function migrateLegacyPref(stored) {
    switch (stored) {
      case "metric":
        return { speed: "m/s", distance: "meters" };
      case "hybrid":
        return { speed: "mph", distance: "meters" };
      case "imperial":
      default:
        return { speed: "mph", distance: "yards" };
    }
  }
  var FIXED_UNIT_LABELS = {
    SpinRate: "rpm",
    HangTime: "s"
  };
  function extractUnitParams(metadataParams) {
    const result = {};
    for (const [key, value] of Object.entries(metadataParams)) {
      const match = key.match(/^nd_([a-z0-9]+)$/i);
      if (match) {
        const groupKey = match[1].toLowerCase();
        result[groupKey] = value;
      }
    }
    return result;
  }
  function getUnitSystemId(metadataParams) {
    const unitParams = extractUnitParams(metadataParams);
    return unitParams["001"] || "789012";
  }
  function getUnitSystem(metadataParams) {
    const id = getUnitSystemId(metadataParams);
    return UNIT_SYSTEMS[id] || DEFAULT_UNIT_SYSTEM;
  }
  function getApiSourceUnitSystem(metadataParams) {
    const reportSystem = getUnitSystem(metadataParams);
    return {
      id: "api",
      name: "API Source",
      distanceUnit: "meters",
      angleUnit: reportSystem.angleUnit,
      speedUnit: "m/s"
    };
  }
  function getMetricUnitLabel(metricName, unitChoice = DEFAULT_UNIT_CHOICE) {
    if (metricName in FIXED_UNIT_LABELS) return FIXED_UNIT_LABELS[metricName];
    if (SPEED_METRICS.has(metricName)) return SPEED_LABELS[unitChoice.speed];
    if (SMALL_DISTANCE_METRICS.has(metricName)) return SMALL_DISTANCE_LABELS[getSmallDistanceUnit(unitChoice)];
    if (DISTANCE_METRICS.has(metricName)) return DISTANCE_LABELS[unitChoice.distance];
    if (ANGLE_METRICS.has(metricName)) return "\xB0";
    return "";
  }
  function convertDistance(value, fromUnit, toUnit) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    if (fromUnit === toUnit) return numValue;
    const inMeters = fromUnit === "yards" ? numValue * 0.9144 : numValue;
    return toUnit === "yards" ? inMeters / 0.9144 : inMeters;
  }
  function convertAngle(value, fromUnit, toUnit) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    if (fromUnit === toUnit) return numValue;
    const inDegrees = fromUnit === "degrees" ? numValue : numValue * 180 / Math.PI;
    return toUnit === "degrees" ? inDegrees : inDegrees * Math.PI / 180;
  }
  function convertSpeed(value, fromUnit, toUnit) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    if (fromUnit === toUnit) return numValue;
    let inMph;
    if (fromUnit === "mph") inMph = numValue;
    else if (fromUnit === "km/h") inMph = numValue / 1.609344;
    else inMph = numValue * 2.23694;
    if (toUnit === "mph") return inMph;
    if (toUnit === "km/h") return inMph * 1.609344;
    return inMph / 2.23694;
  }
  function getSmallDistanceUnit(unitChoice = DEFAULT_UNIT_CHOICE) {
    return unitChoice.distance === "yards" ? "inches" : "cm";
  }
  function convertSmallDistance(value, toSmallUnit) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    return toSmallUnit === "inches" ? numValue * 39.3701 : numValue * 100;
  }
  function normalizeMetricValue(value, metricName, reportUnitSystem, unitChoice = DEFAULT_UNIT_CHOICE) {
    const numValue = parseNumericValue(value);
    if (numValue === null) return value;
    let converted;
    if (SMALL_DISTANCE_METRICS.has(metricName)) {
      converted = convertSmallDistance(
        numValue,
        getSmallDistanceUnit(unitChoice)
      );
    } else if (DISTANCE_METRICS.has(metricName)) {
      converted = convertDistance(
        numValue,
        reportUnitSystem.distanceUnit,
        unitChoice.distance
      );
    } else if (ANGLE_METRICS.has(metricName)) {
      converted = convertAngle(
        numValue,
        reportUnitSystem.angleUnit,
        "degrees"
      );
    } else if (SPEED_METRICS.has(metricName)) {
      converted = convertSpeed(
        numValue,
        reportUnitSystem.speedUnit,
        unitChoice.speed
      );
    } else {
      converted = numValue;
    }
    if (metricName === "SpinRate") return Math.round(converted);
    return Math.round(converted * 10) / 10;
  }
  function parseNumericValue(value) {
    if (value === null || value === "") return null;
    if (typeof value === "number") return isNaN(value) ? null : value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  // src/shared/tsv_writer.ts
  var METRIC_COLUMN_ORDER = [
    // Speed & Efficiency
    "ClubSpeed",
    "BallSpeed",
    "SmashFactor",
    // Club Delivery
    "AttackAngle",
    "ClubPath",
    "FaceAngle",
    "FaceToPath",
    "SwingDirection",
    "DynamicLoft",
    // Launch & Spin
    "LaunchAngle",
    "LaunchDirection",
    "SpinRate",
    "SpinAxis",
    "SpinLoft",
    // Distance
    "Carry",
    "Total",
    // Dispersion
    "Side",
    "SideTotal",
    "CarrySide",
    "TotalSide",
    "Curve",
    // Ball Flight
    "Height",
    "MaxHeight",
    "LandingAngle",
    "HangTime",
    // Impact
    "LowPointDistance",
    "ImpactHeight",
    "ImpactOffset",
    // Other
    "Tempo"
  ];
  function escapeTsvField(value) {
    return value.replace(/\t/g, " ").replace(/[\n\r]/g, " ");
  }
  function getDisplayName(metric) {
    return METRIC_DISPLAY_NAMES[metric] ?? metric;
  }
  function getColumnName(metric, unitChoice) {
    const displayName = getDisplayName(metric);
    const unitLabel = getMetricUnitLabel(metric, unitChoice);
    return unitLabel ? `${displayName} (${unitLabel})` : displayName;
  }
  function orderMetricsByPriority(allMetrics, priorityOrder) {
    const result = [];
    const seen = /* @__PURE__ */ new Set();
    for (const metric of priorityOrder) {
      if (allMetrics.includes(metric) && !seen.has(metric)) {
        result.push(metric);
        seen.add(metric);
      }
    }
    for (const metric of allMetrics) {
      if (!seen.has(metric)) {
        result.push(metric);
      }
    }
    return result;
  }
  function writeTsv(session, unitChoice = DEFAULT_UNIT_CHOICE, hittingSurface) {
    const orderedMetrics = orderMetricsByPriority(
      session.metric_names,
      METRIC_COLUMN_ORDER
    );
    const headerFields = ["Date", "Club", "Shot #"];
    for (const metric of orderedMetrics) {
      headerFields.push(getColumnName(metric, unitChoice));
    }
    const unitSystem = getApiSourceUnitSystem(session.metadata_params);
    const rows = [];
    for (const club of session.club_groups) {
      for (const shot of club.shots) {
        const fields = [
          session.date,
          club.club_name,
          String(shot.shot_number + 1)
        ];
        for (const metric of orderedMetrics) {
          const rawValue = shot.metrics[metric] ?? "";
          let fieldValue;
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            fieldValue = String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice));
          } else {
            fieldValue = "";
          }
          fields.push(escapeTsvField(fieldValue));
        }
        const escapedRow = [
          escapeTsvField(fields[0]),
          escapeTsvField(fields[1]),
          escapeTsvField(fields[2]),
          ...fields.slice(3)
        ];
        rows.push(escapedRow.join("	"));
      }
    }
    const headerRow = headerFields.map(escapeTsvField).join("	");
    const parts = [];
    if (hittingSurface !== void 0) {
      parts.push(`Hitting Surface: ${hittingSurface}`);
    }
    parts.push(headerRow, ...rows);
    return parts.join("\n");
  }

  // src/shared/prompt_types.ts
  var BUILTIN_PROMPTS = [
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

  // src/shared/prompt_builder.ts
  function assemblePrompt(prompt, tsvData, metadata) {
    let dataBlock;
    if (metadata !== void 0) {
      let contextHeader = `Session: ${metadata.date} | ${metadata.shotCount} shots | Units: ${metadata.unitLabel}`;
      if (metadata.hittingSurface !== void 0) {
        contextHeader += ` | Surface: ${metadata.hittingSurface}`;
      }
      dataBlock = contextHeader + "\n\n" + tsvData;
    } else {
      dataBlock = tsvData;
    }
    return prompt.template.replace("{{DATA}}", dataBlock);
  }
  function buildUnitLabel(unitChoice) {
    return `${unitChoice.speed} + ${unitChoice.distance}`;
  }
  function countSessionShots(session) {
    return session.club_groups.reduce((total, club) => total + club.shots.length, 0);
  }

  // src/shared/custom_prompts.ts
  async function loadCustomPrompts() {
    const idsResult = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
    const ids = idsResult[CUSTOM_PROMPT_IDS_KEY] ?? [];
    if (ids.length === 0) return [];
    const keys = ids.map((id) => CUSTOM_PROMPT_KEY_PREFIX + id);
    const promptsResult = await chrome.storage.sync.get(keys);
    return ids.map((id) => promptsResult[CUSTOM_PROMPT_KEY_PREFIX + id]).filter((p) => p !== void 0);
  }

  // src/popup/popup.ts
  function computeClubAverage(shots, metricName) {
    const values = shots.map((s) => s.metrics[metricName]).filter((v) => v !== void 0 && v !== "").map((v) => parseFloat(String(v)));
    const numericValues = values.filter((v) => !isNaN(v));
    if (numericValues.length === 0) return null;
    const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    return Math.round(avg * 10) / 10;
  }
  var cachedData = null;
  var cachedUnitChoice = DEFAULT_UNIT_CHOICE;
  var cachedSurface = "Mat";
  var cachedCustomPrompts = [];
  var AI_URLS = {
    "ChatGPT": "https://chatgpt.com",
    "Claude": "https://claude.ai",
    "Gemini": "https://gemini.google.com"
  };
  function renderStatCard() {
    const container = document.getElementById("stat-card");
    if (!container) return;
    const hasData = cachedData?.club_groups && cachedData.club_groups.length > 0;
    container.style.display = hasData ? "" : "none";
    if (!hasData) return;
    const unitSystem = getApiSourceUnitSystem(cachedData.metadata_params);
    const contentEl = document.getElementById("stat-card-content");
    const carryHeader = `Carry(${DISTANCE_LABELS[cachedUnitChoice.distance]})`;
    const speedHeader = `Speed(${SPEED_LABELS[cachedUnitChoice.speed]})`;
    let html = `<div class="stat-card-row stat-card-header">
    <span>Club</span>
    <span>Shots</span>
    <span>${carryHeader}</span>
    <span>${speedHeader}</span>
  </div>`;
    for (const club of cachedData.club_groups) {
      const shotCount = club.shots.length;
      const rawCarry = computeClubAverage(club.shots, "Carry");
      const rawSpeed = computeClubAverage(club.shots, "ClubSpeed");
      const carry = rawCarry !== null ? String(normalizeMetricValue(rawCarry, "Carry", unitSystem, cachedUnitChoice)) : "\u2014";
      const speed = rawSpeed !== null ? String(normalizeMetricValue(rawSpeed, "ClubSpeed", unitSystem, cachedUnitChoice)) : "\u2014";
      html += `<div class="stat-card-row">
      <span class="stat-card-club">${club.club_name}</span>
      <span class="stat-card-value">${shotCount}</span>
      <span class="stat-card-value">${carry}</span>
      <span class="stat-card-value">${speed}</span>
    </div>`;
    }
    contentEl.innerHTML = html;
  }
  async function renderPromptSelect(select) {
    const customPrompts = await loadCustomPrompts();
    cachedCustomPrompts = customPrompts;
    select.innerHTML = "";
    if (customPrompts.length > 0) {
      const myGroup = document.createElement("optgroup");
      myGroup.label = "My Prompts";
      for (const cp of customPrompts) {
        const opt = document.createElement("option");
        opt.value = cp.id;
        opt.textContent = cp.name;
        myGroup.appendChild(opt);
      }
      select.appendChild(myGroup);
    }
    const tiers = [
      { label: "Beginner", value: "beginner" },
      { label: "Intermediate", value: "intermediate" },
      { label: "Advanced", value: "advanced" }
    ];
    for (const tier of tiers) {
      const group = document.createElement("optgroup");
      group.label = tier.label;
      for (const p of BUILTIN_PROMPTS.filter((b) => b.tier === tier.value)) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        group.appendChild(opt);
      }
      select.appendChild(group);
    }
  }
  function findPromptById(id) {
    const builtIn = BUILTIN_PROMPTS.find((p) => p.id === id);
    if (builtIn) return builtIn;
    return cachedCustomPrompts.find((p) => p.id === id);
  }
  function updatePreview() {
    const previewEl = document.getElementById("prompt-preview-content");
    const promptSelect = document.getElementById("prompt-select");
    if (!previewEl || !promptSelect) return;
    if (!cachedData) {
      previewEl.textContent = "(No shot data captured yet)";
      return;
    }
    const prompt = findPromptById(promptSelect.value);
    if (!prompt) {
      previewEl.textContent = "";
      return;
    }
    const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
    const metadata = {
      date: cachedData.date,
      shotCount: countSessionShots(cachedData),
      unitLabel: buildUnitLabel(cachedUnitChoice),
      hittingSurface: cachedSurface
    };
    previewEl.textContent = assemblePrompt(prompt, tsvData, metadata);
  }
  document.addEventListener("DOMContentLoaded", async () => {
    console.log("TrackPull popup initialized");
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], resolve);
      });
      const data = result[STORAGE_KEYS.TRACKMAN_DATA];
      console.log("Popup loaded data:", data ? "has data" : "no data");
      cachedData = data ?? null;
      updateShotCount(data);
      updateExportButtonVisibility(data);
      const unitResult = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, STORAGE_KEYS.HITTING_SURFACE, STORAGE_KEYS.INCLUDE_AVERAGES, "unitPreference"], resolve);
      });
      let speedUnit = unitResult[STORAGE_KEYS.SPEED_UNIT];
      let distanceUnit = unitResult[STORAGE_KEYS.DISTANCE_UNIT];
      if (!speedUnit || !distanceUnit) {
        const migrated = migrateLegacyPref(unitResult["unitPreference"]);
        speedUnit = migrated.speed;
        distanceUnit = migrated.distance;
        chrome.storage.local.set({
          [STORAGE_KEYS.SPEED_UNIT]: speedUnit,
          [STORAGE_KEYS.DISTANCE_UNIT]: distanceUnit
        });
        chrome.storage.local.remove("unitPreference");
      }
      cachedUnitChoice = {
        speed: speedUnit,
        distance: distanceUnit
      };
      const surface = unitResult[STORAGE_KEYS.HITTING_SURFACE] ?? "Mat";
      cachedSurface = surface;
      const speedSelect = document.getElementById("speed-unit");
      const distanceSelect = document.getElementById("distance-unit");
      if (speedSelect) {
        speedSelect.value = speedUnit;
        speedSelect.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.SPEED_UNIT]: speedSelect.value });
          cachedUnitChoice = { ...cachedUnitChoice, speed: speedSelect.value };
          renderStatCard();
        });
      }
      if (distanceSelect) {
        distanceSelect.value = distanceUnit;
        distanceSelect.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.DISTANCE_UNIT]: distanceSelect.value });
          cachedUnitChoice = { ...cachedUnitChoice, distance: distanceSelect.value };
          renderStatCard();
        });
      }
      const surfaceSelect = document.getElementById("surface-select");
      if (surfaceSelect) {
        surfaceSelect.value = surface;
        surfaceSelect.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.HITTING_SURFACE]: surfaceSelect.value });
          cachedSurface = surfaceSelect.value;
        });
      }
      const includeAveragesCheckbox = document.getElementById("include-averages-checkbox");
      if (includeAveragesCheckbox) {
        const stored = unitResult[STORAGE_KEYS.INCLUDE_AVERAGES];
        includeAveragesCheckbox.checked = stored === void 0 ? true : Boolean(stored);
        includeAveragesCheckbox.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.INCLUDE_AVERAGES]: includeAveragesCheckbox.checked });
        });
      }
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "DATA_UPDATED") {
          cachedData = message.data ?? null;
          updateShotCount(message.data);
          updateExportButtonVisibility(message.data);
          updatePreview();
          renderStatCard();
        }
        if (message.type === "HISTORY_ERROR") {
          showToast(message.error, "error");
        }
        return true;
      });
      const exportBtn = document.getElementById("export-btn");
      if (exportBtn) {
        exportBtn.addEventListener("click", handleExportClick);
      }
      const clearBtn = document.getElementById("clear-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", handleClearClick);
      }
      const settingsBtn = document.getElementById("settings-btn");
      if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
          chrome.runtime.openOptionsPage();
        });
      }
      const promptSelect = document.getElementById("prompt-select");
      if (promptSelect) {
        await renderPromptSelect(promptSelect);
        const promptResult = await new Promise((resolve) => {
          chrome.storage.local.get([STORAGE_KEYS.SELECTED_PROMPT_ID], resolve);
        });
        const savedPromptId = promptResult[STORAGE_KEYS.SELECTED_PROMPT_ID];
        if (savedPromptId) {
          promptSelect.value = savedPromptId;
          if (promptSelect.value !== savedPromptId) {
            promptSelect.value = "quick-summary-beginner";
            chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: "quick-summary-beginner" });
          }
        }
        promptSelect.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: promptSelect.value });
          updatePreview();
        });
      }
      const aiServiceSelect = document.getElementById("ai-service-select");
      if (aiServiceSelect) {
        const syncResult = await new Promise((resolve) => {
          chrome.storage.sync.get([STORAGE_KEYS.AI_SERVICE], resolve);
        });
        const savedService = syncResult[STORAGE_KEYS.AI_SERVICE];
        if (savedService) {
          aiServiceSelect.value = savedService;
        }
        aiServiceSelect.addEventListener("change", () => {
          chrome.storage.sync.set({ [STORAGE_KEYS.AI_SERVICE]: aiServiceSelect.value });
          updatePreview();
        });
      }
      updatePreview();
      renderStatCard();
      const copyTsvBtn = document.getElementById("copy-tsv-btn");
      if (copyTsvBtn) {
        copyTsvBtn.addEventListener("click", async () => {
          if (!cachedData) return;
          const tsvText = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
          try {
            await navigator.clipboard.writeText(tsvText);
            showToast("Shot data copied!", "success");
          } catch (err) {
            console.error("Clipboard write failed:", err);
            showToast("Failed to copy data", "error");
          }
        });
      }
      const openAiBtn = document.getElementById("open-ai-btn");
      if (openAiBtn) {
        openAiBtn.addEventListener("click", async () => {
          if (!cachedData || !promptSelect || !aiServiceSelect) return;
          const selectedPromptId = promptSelect.value;
          const selectedService = aiServiceSelect.value;
          const prompt = findPromptById(selectedPromptId);
          if (!prompt) return;
          const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
          const metadata = {
            date: cachedData.date,
            shotCount: countSessionShots(cachedData),
            unitLabel: buildUnitLabel(cachedUnitChoice),
            hittingSurface: cachedSurface
          };
          const assembled = assemblePrompt(prompt, tsvData, metadata);
          try {
            await navigator.clipboard.writeText(assembled);
            chrome.tabs.create({ url: AI_URLS[selectedService] });
            showToast(`Prompt + data copied \u2014 paste into ${selectedService}`, "success");
          } catch (err) {
            console.error("AI launch failed:", err);
            showToast("Failed to copy prompt", "error");
          }
        });
      }
      const copyPromptBtn = document.getElementById("copy-prompt-btn");
      if (copyPromptBtn) {
        copyPromptBtn.addEventListener("click", async () => {
          if (!cachedData || !promptSelect) return;
          const selectedPromptId = promptSelect.value;
          const prompt = findPromptById(selectedPromptId);
          if (!prompt) return;
          const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
          const metadata = {
            date: cachedData.date,
            shotCount: countSessionShots(cachedData),
            unitLabel: buildUnitLabel(cachedUnitChoice),
            hittingSurface: cachedSurface
          };
          const assembled = assemblePrompt(prompt, tsvData, metadata);
          try {
            await navigator.clipboard.writeText(assembled);
            showToast("Prompt + data copied!", "success");
          } catch (err) {
            console.error("Clipboard write failed:", err);
            showToast("Failed to copy prompt", "error");
          }
        });
      }
    } catch (error) {
      console.error("Error loading popup data:", error);
      showToast("Error loading shot count", "error");
    }
  });
  function updateShotCount(data) {
    const container = document.getElementById("shot-count-container");
    const shotCountElement = document.getElementById("shot-count");
    if (!container || !shotCountElement) return;
    if (!data || typeof data !== "object") {
      container.classList.add("empty-state");
      return;
    }
    const sessionData = data;
    const clubGroups = sessionData["club_groups"];
    if (!clubGroups || !Array.isArray(clubGroups)) {
      container.classList.add("empty-state");
      return;
    }
    let totalShots = 0;
    for (const club of clubGroups) {
      const shots = club["shots"];
      if (shots && Array.isArray(shots)) {
        totalShots += shots.length;
      }
    }
    container.classList.remove("empty-state");
    shotCountElement.textContent = totalShots.toString();
  }
  function updateExportButtonVisibility(data) {
    const exportRow = document.getElementById("export-row");
    const aiSection = document.getElementById("ai-section");
    const clearBtn = document.getElementById("clear-btn");
    const hasValidData = data && typeof data === "object" && data["club_groups"];
    if (exportRow) exportRow.style.display = hasValidData ? "flex" : "none";
    if (aiSection) aiSection.style.display = hasValidData ? "block" : "none";
    if (clearBtn) clearBtn.style.display = hasValidData ? "block" : "none";
  }
  async function handleExportClick() {
    const exportBtn = document.getElementById("export-btn");
    if (!exportBtn) return;
    showStatusMessage("Preparing CSV...", false);
    exportBtn.disabled = true;
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "EXPORT_CSV_REQUEST" }, (resp) => {
          resolve(resp || { success: false, error: "No response from service worker" });
        });
      });
      if (response.success) {
        showToast(`Exported successfully: ${response.filename || "ShotData.csv"}`, "success");
      } else {
        showToast(response.error || "Export failed", "error");
      }
    } catch (error) {
      console.error("Error during export:", error);
      showToast("Export failed", "error");
    } finally {
      exportBtn.disabled = false;
    }
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
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add("hiding");
        setTimeout(() => {
          toast.remove();
        }, 300);
      }
    }, type === "error" ? 5e3 : 3e3);
  }
  function showStatusMessage(message, isError = false) {
    const statusElement = document.getElementById("status-message");
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.classList.remove("status-error", "status-success");
    statusElement.classList.add(isError ? "status-error" : "status-success");
  }
  async function handleClearClick() {
    const clearBtn = document.getElementById("clear-btn");
    if (!clearBtn) return;
    showStatusMessage("Clearing session data...", false);
    clearBtn.disabled = true;
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.remove(STORAGE_KEYS.TRACKMAN_DATA, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      cachedData = null;
      updateShotCount(null);
      updateExportButtonVisibility(null);
      renderStatCard();
      showToast("Session data cleared", "success");
    } catch (error) {
      console.error("Error clearing session data:", error);
      showToast("Failed to clear data", "error");
    } finally {
      clearBtn.disabled = false;
    }
  }
})();
