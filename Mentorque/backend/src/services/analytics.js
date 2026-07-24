import { prisma } from "../lib/prisma.js";

/**
 * All the aggregate numbers the admin analytics dashboard needs, gathered
 * in parallel. Kept as plain grouped counts (no raw SQL) so it works
 * identically on Neon and Supabase without any extension requirements.
 */
export async function buildAnalytics() {
  const [
    userCount,
    mentorCount,
    scheduledCount,
    completedCount,
    cancelledCount,
    callTypeGroups,
    allCallTypes,
    mentorBookingGroups,
    mentors,
    recentMeetings,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "MENTOR" } }),
    prisma.meeting.count({ where: { status: "SCHEDULED" } }),
    prisma.meeting.count({ where: { status: "COMPLETED" } }),
    prisma.meeting.count({ where: { status: "CANCELLED" } }),
    prisma.meeting.groupBy({ by: ["callTypeKey"], _count: { _all: true } }),
    prisma.callType.findMany({ select: { key: true, label: true } }),
    prisma.meeting.groupBy({
      by: ["mentorId"],
      where: { mentorId: { not: null }, status: { not: "CANCELLED" } },
      _count: { _all: true },
    }),
    prisma.user.findMany({ where: { role: "MENTOR" }, select: { id: true, name: true } }),
    // last 90 days of meetings, for weekly-activity / booking-trend rollups
    prisma.meeting.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const callTypeDistribution = allCallTypes.map((ct) => ({
    callType: ct.label,
    key: ct.key,
    count: callTypeGroups.find((g) => g.callTypeKey === ct.key)?._count._all || 0,
  }));

  const nameByMentorId = Object.fromEntries(mentors.map((m) => [m.id, m.name]));
  const mentorUtilization = mentorBookingGroups
    .map((g) => ({ mentorId: g.mentorId, name: nameByMentorId[g.mentorId] || "Unknown", bookings: g._count._all }))
    .sort((a, b) => b.bookings - a.bookings);
  // Mentors with zero bookings still show up at 0, so admins see full utilization spread.
  for (const m of mentors) {
    if (!mentorUtilization.find((u) => u.mentorId === m.id)) {
      mentorUtilization.push({ mentorId: m.id, name: m.name, bookings: 0 });
    }
  }
  mentorUtilization.sort((a, b) => b.bookings - a.bookings);

  const weeklyActivity = rollupByWeek(recentMeetings, 8);
  const bookingTrends = rollupByDay(recentMeetings, 30);

  return {
    totals: {
      users: userCount,
      mentors: mentorCount,
      scheduledCalls: scheduledCount,
      completedCalls: completedCount,
      cancelledCalls: cancelledCount,
    },
    callTypeDistribution,
    mentorUtilization,
    weeklyActivity,
    bookingTrends,
  };
}

function rollupByWeek(meetings, weeks) {
  const buckets = new Map();
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000));
    buckets.set(weekStart.toISOString().slice(0, 10), 0);
  }
  for (const m of meetings) {
    const key = startOfWeek(m.createdAt).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }
  return [...buckets.entries()].map(([week, bookings]) => ({ week, bookings }));
}

function rollupByDay(meetings, days) {
  const buckets = new Map();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const m of meetings) {
    const key = m.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }
  return [...buckets.entries()].map(([date, bookings]) => ({ date, bookings }));
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
