import { describe, it, expect } from "vitest";
import {
  parsePortalActivity,
  extractActivityUuid,
} from "../src/shared/portal_parser";
import type { GraphQLActivity } from "../src/shared/portal_parser";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURE_FULL_ACTIVITY: GraphQLActivity = {
  id: btoa("SessionActivity\n550e8400-e29b-41d4-a716-446655440000"),
  time: "2026-01-15",
  strokes: [
    {
      club: "7-Iron",
      measurement: {
        clubSpeed: 85.4,
        ballSpeed: 120.1,
        carry: 145.2,
        spinRate: 7200,
        someNewField: 42.5,
      },
    },
    {
      club: "7-Iron",
      measurement: {
        clubSpeed: 86.0,
        ballSpeed: 121.5,
        carry: 148.0,
        spinRate: 7350,
        someNewField: 43.1,
      },
    },
    {
      club: "Driver",
      measurement: {
        clubSpeed: 112.0,
        ballSpeed: 167.3,
        carry: null,
        total: 280.5,
      },
    },
  ],
};

const FIXTURE_NULL_FIELDS: GraphQLActivity = {
  id: btoa("SessionActivity\nabc-uuid-null-test"),
  time: "2026-01-20",
  strokes: [
    {
      club: "PW",
      measurement: {
        clubSpeed: 78.0,
        ballSpeed: null,
        carry: undefined,
        spinRate: 9500,
        badValue: "abc" as unknown as number,
      },
    },
  ],
};

const FIXTURE_EMPTY: GraphQLActivity = {
  id: btoa("SessionActivity\nempty-uuid-test"),
  time: "2026-01-25",
  strokes: [],
};

const FIXTURE_NO_ID: GraphQLActivity = {
  id: "",
  time: "2026-01-25",
  strokes: [
    {
      club: "PW",
      measurement: { clubSpeed: 75.0 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests: extractActivityUuid
// ---------------------------------------------------------------------------

describe("extractActivityUuid", () => {
  it("decodes base64 SessionActivity format to UUID", () => {
    const encoded = btoa("SessionActivity\n550e8400-e29b-41d4-a716-446655440000");
    const result = extractActivityUuid(encoded);
    expect(result).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("returns raw input on invalid base64", () => {
    const result = extractActivityUuid("%%%");
    expect(result).toBe("%%%");
  });

  it("returns raw input when decoded string has no newline", () => {
    const encoded = btoa("NoNewlineHere");
    const result = extractActivityUuid(encoded);
    expect(result).toBe(encoded);
  });
});

// ---------------------------------------------------------------------------
// Tests: parsePortalActivity
// ---------------------------------------------------------------------------

describe("parsePortalActivity", () => {
  describe("field mapping (PIPE-01)", () => {
    it("maps all non-null numeric measurement fields to shot metrics", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      const ironGroup = session!.club_groups.find(
        (g) => g.club_name === "7-Iron"
      );
      expect(ironGroup).toBeDefined();
      const firstShot = ironGroup!.shots[0];
      expect(firstShot.metrics["ClubSpeed"]).toBeDefined();
      expect(firstShot.metrics["BallSpeed"]).toBeDefined();
      expect(firstShot.metrics["Carry"]).toBeDefined();
      expect(firstShot.metrics["SpinRate"]).toBeDefined();
    });

    it("omits null measurement fields from metrics", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      const driverGroup = session!.club_groups.find(
        (g) => g.club_name === "Driver"
      );
      expect(driverGroup).toBeDefined();
      const firstShot = driverGroup!.shots[0];
      // carry is null, should not appear
      expect(firstShot.metrics["Carry"]).toBeUndefined();
      // total is present, should appear
      expect(firstShot.metrics["Total"]).toBeDefined();
    });

    it("omits undefined measurement fields from metrics", () => {
      const session = parsePortalActivity(FIXTURE_NULL_FIELDS);
      expect(session).not.toBeNull();
      const pwGroup = session!.club_groups[0];
      const firstShot = pwGroup.shots[0];
      // ballSpeed is null, carry is undefined — both omitted
      expect(firstShot.metrics["BallSpeed"]).toBeUndefined();
      expect(firstShot.metrics["Carry"]).toBeUndefined();
    });

    it("omits NaN-producing values from metrics", () => {
      const session = parsePortalActivity(FIXTURE_NULL_FIELDS);
      expect(session).not.toBeNull();
      const pwGroup = session!.club_groups[0];
      const firstShot = pwGroup.shots[0];
      // badValue = "abc" -> NaN -> omitted
      expect(firstShot.metrics["BadValue"]).toBeUndefined();
    });

    it("normalizes known aliases to METRIC_KEYS names", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      const ironGroup = session!.club_groups.find(
        (g) => g.club_name === "7-Iron"
      );
      const firstShot = ironGroup!.shots[0];
      // clubSpeed -> ClubSpeed
      expect(firstShot.metrics["ClubSpeed"]).toBeDefined();
      // ballSpeed -> BallSpeed
      expect(firstShot.metrics["BallSpeed"]).toBeDefined();
      // carry -> Carry
      expect(firstShot.metrics["Carry"]).toBeDefined();
      // spinRate -> SpinRate
      expect(firstShot.metrics["SpinRate"]).toBeDefined();
      // total -> Total (from driver shot)
      const driverGroup = session!.club_groups.find(
        (g) => g.club_name === "Driver"
      );
      expect(driverGroup!.shots[0].metrics["Total"]).toBeDefined();
      // confirm raw camelCase is NOT used
      expect(firstShot.metrics["clubSpeed"]).toBeUndefined();
      expect(firstShot.metrics["ballSpeed"]).toBeUndefined();
    });

    it("normalizes unknown fields to PascalCase", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      const ironGroup = session!.club_groups.find(
        (g) => g.club_name === "7-Iron"
      );
      const firstShot = ironGroup!.shots[0];
      // someNewField -> SomeNewField
      expect(firstShot.metrics["SomeNewField"]).toBeDefined();
      expect(firstShot.metrics["someNewField"]).toBeUndefined();
    });

    it("populates metric_names from actually populated fields only", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      // metric_names should be sorted
      const names = session!.metric_names;
      expect(names).toEqual([...names].sort());
      // All populated fields should appear
      expect(names).toContain("ClubSpeed");
      expect(names).toContain("BallSpeed");
      expect(names).toContain("SpinRate");
      expect(names).toContain("Total");
      expect(names).toContain("SomeNewField");
      // Null carry from Driver shot should not be in metric_names if it never appears
      // (it IS in 7-Iron shots as non-null so it will appear)
      expect(names).toContain("Carry");
    });

    it("stores metric values as strings", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      const ironGroup = session!.club_groups.find(
        (g) => g.club_name === "7-Iron"
      );
      const firstShot = ironGroup!.shots[0];
      expect(typeof firstShot.metrics["ClubSpeed"]).toBe("string");
      expect(typeof firstShot.metrics["BallSpeed"]).toBe("string");
      expect(typeof firstShot.metrics["SpinRate"]).toBe("string");
    });

    it("stores zero-based shot numbers for CSV/TSV display", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      const ironGroup = session!.club_groups.find(
        (g) => g.club_name === "7-Iron"
      );
      expect(ironGroup!.shots.map((shot) => shot.shot_number)).toEqual([0, 1]);
    });

    it("sets url_type to activity", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      expect(session!.url_type).toBe("activity");
    });

    it("stores raw activity_id in metadata_params", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      expect(session!.metadata_params["activity_id"]).toBe(
        FIXTURE_FULL_ACTIVITY.id
      );
    });

    it("excludes strokes with no valid numeric measurements", () => {
      const emptyStrokeActivity: GraphQLActivity = {
        id: btoa("SessionActivity\nexclude-empty-stroke"),
        time: "2026-01-15",
        strokes: [
          {
            club: "9-Iron",
            measurement: {
              clubSpeed: null,
              ballSpeed: null,
            },
          },
          {
            club: "9-Iron",
            measurement: {
              clubSpeed: 80.0,
            },
          },
        ],
      };
      const session = parsePortalActivity(emptyStrokeActivity);
      expect(session).not.toBeNull();
      // Only 1 valid stroke, the all-null one is excluded
      expect(session!.club_groups[0].shots).toHaveLength(1);
    });

    it("excludes club groups with no valid strokes", () => {
      const noValidStrokesActivity: GraphQLActivity = {
        id: btoa("SessionActivity\nexclude-empty-club"),
        time: "2026-01-15",
        strokes: [
          {
            club: "EmptyClub",
            measurement: {
              clubSpeed: null,
              ballSpeed: "invalid" as unknown as number,
            },
          },
          {
            club: "ValidClub",
            measurement: { clubSpeed: 90.0 },
          },
        ],
      };
      const session = parsePortalActivity(noValidStrokesActivity);
      expect(session).not.toBeNull();
      expect(session!.club_groups).toHaveLength(1);
      expect(session!.club_groups[0].club_name).toBe("ValidClub");
    });

    it("parses grouped Course Play strokes into club groups", () => {
      const coursePlayActivity: GraphQLActivity = {
        id: btoa("CoursePlayActivity\ncourse-play-uuid"),
        __typename: "CoursePlayActivity",
        kind: "Course Play",
        time: "2026-02-01",
        strokeGroups: [
          {
            club: "Driver",
            strokes: [
              { measurement: { ballSpeed: 160.2, carry: 258.4 } },
              { measurement: { ballSpeed: 158.0, carry: 249.7 } },
            ],
          },
          {
            club: "9-Iron",
            strokes: [
              { measurement: { ballSpeed: 105.2, carry: 136.0 } },
            ],
          },
        ],
      };

      const session = parsePortalActivity(coursePlayActivity);
      expect(session).not.toBeNull();
      expect(session!.club_groups).toHaveLength(2);
      expect(session!.club_groups[0].club_name).toBe("Driver");
      expect(session!.club_groups[0].shots).toHaveLength(2);
      expect(session!.club_groups[1].club_name).toBe("9-Iron");
      expect(session!.metadata_params["activity_type"]).toBe("CoursePlayActivity");
      expect(session!.metadata_params["activity_kind"]).toBe("Course Play");
    });

    it("parses live Course Play scorecard hole shots", () => {
      const coursePlayActivity = {
        id: btoa("CoursePlayActivity\ncourse-play-scorecard-uuid"),
        __typename: "CoursePlayActivity",
        kind: "Course Play",
        time: "2025-04-05T15:46:57.519Z",
        scorecard: {
          holes: [
            {
              holeNumber: 1,
              shots: [
                {
                  shotNumber: 1,
                  club: "Driver",
                  measurement: {
                    clubSpeed: 108.1,
                    ballSpeed: 158.4,
                    carry: 252.2,
                    spinRate: 2450,
                  },
                },
                {
                  shotNumber: 2,
                  club: "PW",
                  measurement: {
                    ballSpeed: 96.2,
                    carry: 118.7,
                  },
                },
              ],
            },
          ],
        },
      } as unknown as GraphQLActivity;

      const session = parsePortalActivity(coursePlayActivity);
      expect(session).not.toBeNull();
      expect(session!.club_groups.map((g) => g.club_name)).toEqual(["Driver", "PW"]);
      expect(session!.club_groups[0].shots[0].metrics["ClubSpeed"]).toBe("108.1");
      expect(session!.club_groups[0].shots[0].metrics["Carry"]).toBe("252.2");
      expect(session!.club_groups[1].shots[0].metrics["BallSpeed"]).toBe("96.2");
      expect(session!.metadata_params["activity_type"]).toBe("CoursePlayActivity");
    });

    it("parses nested Map My Bag shot groups", () => {
      const mapMyBagActivity = {
        id: btoa("MapMyBagActivity\nmap-my-bag-uuid"),
        __typename: "MapMyBagActivity",
        kind: "Map My Bag",
        time: "2026-02-05",
        bag: {
          clubs: [
            {
              name: "PW",
              shotGroups: [
                {
                  strokes: [
                    { measurement: { carry: 123.4, total: 128.9 } },
                    { measurement: { carry: 121.2, total: 127.0 } },
                  ],
                },
              ],
            },
            {
              name: "7-Iron",
              shotGroups: [
                {
                  strokes: [
                    { measurement: { carry: 164.2, total: 171.5 } },
                  ],
                },
              ],
            },
          ],
        },
      } as unknown as GraphQLActivity;

      const session = parsePortalActivity(mapMyBagActivity);
      expect(session).not.toBeNull();
      expect(session!.club_groups.map((g) => g.club_name)).toEqual(["PW", "7-Iron"]);
      expect(session!.club_groups[0].shots).toHaveLength(2);
      expect(session!.club_groups[0].shots[0].metrics["Carry"]).toBe("123.4");
      expect(session!.club_groups[1].shots[0].metrics["Total"]).toBe("171.5");
      expect(session!.metric_names).toEqual(["Carry", "Total"]);
    });
  });

  describe("deduplication identity (PIPE-03)", () => {
    it("sets report_id to extracted UUID not raw base64", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      expect(session!.report_id).toBe(
        "550e8400-e29b-41d4-a716-446655440000"
      );
      expect(session!.report_id).not.toBe(FIXTURE_FULL_ACTIVITY.id);
    });

    it("passes date through as-is", () => {
      const session = parsePortalActivity(FIXTURE_FULL_ACTIVITY);
      expect(session).not.toBeNull();
      expect(session!.date).toBe("2026-01-15");
    });

    it("uses Unknown when time is null", () => {
      const activity: GraphQLActivity = {
        id: btoa("SessionActivity\nsome-uuid"),
        time: null,
        strokes: [
          {
            club: "5-Iron",
            measurement: { clubSpeed: 88.0 },
          },
        ],
      };
      const session = parsePortalActivity(activity);
      expect(session).not.toBeNull();
      expect(session!.date).toBe("Unknown");
    });
  });

  describe("defensive handling", () => {
    it("returns null for empty strokeGroups", () => {
      const session = parsePortalActivity(FIXTURE_EMPTY);
      expect(session).toBeNull();
    });

    it("returns null for missing activity id", () => {
      const session = parsePortalActivity(FIXTURE_NO_ID);
      expect(session).toBeNull();
    });

    it("returns null for completely malformed input", () => {
      expect(parsePortalActivity(null as unknown as GraphQLActivity)).toBeNull();
      expect(
        parsePortalActivity(undefined as unknown as GraphQLActivity)
      ).toBeNull();
      expect(
        parsePortalActivity({} as unknown as GraphQLActivity)
      ).toBeNull();
    });
  });
});
