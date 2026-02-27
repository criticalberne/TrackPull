/**
 * Data models for Trackman session data.
 */

export type MetricValue = string | number | null;

export interface Shot {
  shot_number: number;
  metrics: Record<string, MetricValue>;
  tag?: string;
}

export interface ClubGroup {
  club_name: string;
  shots: Shot[];
  averages: Record<string, MetricValue>;
  consistency: Record<string, MetricValue>;
}

export interface SessionData {
  date: string;
  report_id: string;
  url_type: "report" | "activity";
  club_groups: ClubGroup[];
  raw_api_data?: unknown;
  metric_names: string[];
  metadata_params: Record<string, string>;
}

export interface CaptureInfo {
  url: string;
  status: number;
  body: unknown;
  is_api: boolean;
}

/**
 * Merge session data from multiple pages into a single dataset.
 * New metric columns are merged into existing shot data for multi-page scenarios.
 */
export function mergeSessionData(
  baseSession: SessionData,
  newSession: SessionData
): SessionData {
  // Create map of club_name -> ClubGroup for efficient lookup
  const clubsMap = new Map<string, ClubGroup>();

  // Add all clubs from base session
  for (const club of baseSession.club_groups) {
    clubsMap.set(club.club_name, { ...club });
  }

  // Process new session data and merge into existing clubs
  for (const newClub of newSession.club_groups) {
    const existingClub = clubsMap.get(newClub.club_name);

    if (!existingClub) {
      // New club - add as-is
      clubsMap.set(newClub.club_name, { ...newClub });
    } else {
      // Existing club - merge shot data
      const mergedClub: ClubGroup = {
        ...existingClub,
        averages: { ...existingClub.averages, ...newClub.averages },
        consistency: { ...existingClub.consistency, ...newClub.consistency },
      };

      // Merge shots by index - update existing shot metrics with new values
      for (let i = 0; i < newClub.shots.length; i++) {
        const newShot = newClub.shots[i];

        if (i < mergedClub.shots.length) {
          // Existing shot - merge metrics
          mergedClub.shots[i] = {
            ...mergedClub.shots[i],
            metrics: {
              ...mergedClub.shots[i].metrics,
              ...newShot.metrics,
            },
          };
        } else {
          // New shot at this index - add it
          mergedClub.shots.push({ ...newShot });
        }
      }

      clubsMap.set(newClub.club_name, mergedClub);
    }
  }

  // Collect all metric names from merged data
  const allMetricNames = new Set<string>();

  for (const club of clubsMap.values()) {
    for (const shot of club.shots) {
      Object.keys(shot.metrics).forEach((k) => allMetricNames.add(k));
    }
    Object.keys(club.averages).forEach((k) => allMetricNames.add(k));
    Object.keys(club.consistency).forEach((k) => allMetricNames.add(k));
  }

  // Update session with merged data
  const mergedSession: SessionData = {
    ...baseSession,
    club_groups: Array.from(clubsMap.values()),
    metric_names: Array.from(allMetricNames).sort(),
  };

  return mergedSession;
}
