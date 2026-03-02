/**
 * Prompt Library: types, skill tiers, and built-in golf analysis prompts.
 * Built-in prompts are TypeScript constants only -- they do not go into chrome.storage.
 */

export type SkillTier = "beginner" | "intermediate" | "advanced";

export interface BuiltInPrompt {
  readonly id: string;
  readonly name: string;
  readonly tier: SkillTier;
  readonly topic: string;
  readonly template: string;
}

export const BUILTIN_PROMPTS: readonly BuiltInPrompt[] = [
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

Use simple language. Avoid heavy technical jargon. Speak directly to the player like a supportive coach.`,
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

Use moderate technical depth. Briefly explain what metrics mean when you reference them.`,
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

Reference specific metric values and numbers throughout. Prioritize data over general advice.`,
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

Use moderate technical depth and explain what metrics mean for players who are learning.`,
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

Keep it simple and encouraging. Focus on practical take-aways the player can use on the course.`,
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

Use moderate technical depth. Briefly explain what each metric means.`,
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

Prioritize numbers and specific metric values. Provide a ranked list of delivery improvements by expected performance impact.`,
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

Keep it brief and encouraging. No heavy analysis needed -- just the headlines.`,
  },
] as const;
