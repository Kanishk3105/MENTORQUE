import { loadWeeklyAvailability } from "./availabilityWeek.js";
import { getWeekStart } from "../utils/time.js";

/**
 * Availability is derived from a recurring weekly template + per-week
 * exceptions (see availabilityWeek.js) — the raw `Availability` table is
 * legacy/unused for writes. So computing overlap means: for each week in the
 * requested range, materialize both parties' effective daily slot lists via
 * loadWeeklyAvailability(), then intersect by (date, startTime) — since both
 * sides emit normalized 1-hour UTC blocks this is a simple set intersection,
 * not a generic interval-overlap problem. Contiguous matching hours are then
 * merged into human-readable ranges (e.g. user free 2-5PM, mentor free
 * 3-6PM -> a single merged 3-5PM range).
 *
 * @param {string} userId
 * @param {string} mentorId
 * @param {{ from?: Date, to?: Date }} range defaults to "now" through +21 days
 * @returns {Promise<Array<{ date: string, start: string, end: string }>>}
 */
export async function computeOverlap(userId, mentorId, range = {}) {
  const from = range.from ?? new Date();
  const to = range.to ?? new Date(from.getTime() + 21 * 24 * 60 * 60 * 1000);

  const userOwner = { userId, mentorId: null, role: "USER" };
  const mentorOwner = { userId: null, mentorId, role: "MENTOR" };

  const weekStarts = weeksBetween(from, to);
  const matches = [];

  for (const weekStart of weekStarts) {
    const [userWeek, mentorWeek] = await Promise.all([
      loadWeeklyAvailability(userOwner, weekStart),
      loadWeeklyAvailability(mentorOwner, weekStart),
    ]);

    for (const dateStr of userWeek.dates) {
      const userSlots = userWeek.availability[dateStr] || [];
      const mentorSlots = new Set((mentorWeek.availability[dateStr] || []).map((s) => s.startTime));

      for (const slot of userSlots) {
        if (!mentorSlots.has(slot.startTime)) continue;
        const startMs = new Date(slot.startTime).getTime();
        if (startMs < from.getTime() || startMs > to.getTime()) continue;
        if (startMs <= Date.now()) continue; // never surface past slots
        matches.push({ date: dateStr, start: slot.startTime, end: slot.endTime });
      }
    }
  }

  matches.sort((a, b) => new Date(a.start) - new Date(b.start));
  return mergeContiguous(matches);
}

function weeksBetween(from, to) {
  const starts = [];
  let cursor = getWeekStart(from);
  const end = getWeekStart(to);
  while (cursor <= end) {
    starts.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return starts;
}

/** Merge back-to-back 1-hour matching slots (same date, prior end === next start) into ranges. */
function mergeContiguous(slots) {
  const ranges = [];
  for (const s of slots) {
    const last = ranges[ranges.length - 1];
    if (last && last.date === s.date && last.end === s.start) {
      last.end = s.end;
    } else {
      ranges.push({ ...s });
    }
  }
  return ranges;
}

/** Convenience: does at least one overlapping slot exist between the two? */
export async function hasAnyOverlap(userId, mentorId, range) {
  const overlaps = await computeOverlap(userId, mentorId, range);
  return overlaps.length > 0;
}
