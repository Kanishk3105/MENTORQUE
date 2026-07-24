import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { getWeekStart } from "../utils/time.js";
import { loadWeeklyAvailability } from "../services/availabilityWeek.js";
import { computeOverlap } from "../services/overlap.js";
import { recommendMentors } from "../services/recommendation.js";
import { buildAnalytics } from "../services/analytics.js";
import { toCsv, sendCsv } from "../utils/csv.js";
import { v4 as uuidv4 } from "uuid";
import { isPastTime } from "../utils/time.js";

const userSelect = {
  id: true, name: true, email: true, role: true, timezone: true, createdAt: true,
  description: true, location: true, company: true, isBigTech: true, domain: true,
  yearsExperience: true, communicationScore: true, tags: true,
};

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { role: "USER" }, select: userSelect, orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (e) { next(e); }
}

export async function listMentors(req, res, next) {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: "MENTOR" }, select: userSelect, orderBy: { name: "asc" },
    });
    res.json(mentors);
  } catch (e) { next(e); }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role, timezone } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!role || !["USER", "MENTOR"].includes(role)) {
      return res.status(400).json({ error: "Role must be USER or MENTOR" });
    }
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const displayName = name?.trim() || email.trim().split("@")[0] || "User";
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        id: uuidv4(), name: displayName, email: email.trim().toLowerCase(),
        password: hashed, role, timezone: timezone || "UTC",
      },
      select: userSelect,
    });
    res.status(201).json(user);
  } catch (e) { next(e); }
}

/** Admin edits a user/mentor's description, tags, and (for mentors) matching-relevant profile fields. */
export async function updateProfile(req, res, next) {
  try {
    const { id } = req.params;
    const { description, tags, location, company, isBigTech, domain, yearsExperience, communicationScore } = req.body;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: "User not found" });

    const data = {};
    if (description !== undefined) data.description = description;
    if (location !== undefined) data.location = location;
    if (target.role === "MENTOR") {
      if (company !== undefined) data.company = company;
      if (isBigTech !== undefined) data.isBigTech = !!isBigTech;
      if (domain !== undefined) data.domain = domain;
      if (yearsExperience !== undefined) data.yearsExperience = yearsExperience === null ? null : Number(yearsExperience);
      if (communicationScore !== undefined) data.communicationScore = communicationScore === null ? null : Number(communicationScore);
    }

    // Description changed -> invalidate cached embedding so it's recomputed lazily.
    if (description !== undefined && description !== target.description) {
      data.embedding = null;
      data.embeddingModel = null;
    }

    if (Array.isArray(tags)) {
      data.tags = { set: [], connectOrCreate: tags.map((name) => ({
        where: { name }, create: { name },
      })) };
    }

    const updated = await prisma.user.update({ where: { id }, data, select: userSelect });
    res.json(updated);
  } catch (e) { next(e); }
}

export async function listTags(req, res, next) {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    res.json(tags);
  } catch (e) { next(e); }
}

export async function listCallTypes(req, res, next) {
  try {
    const callTypes = await prisma.callType.findMany({ orderBy: { label: "asc" } });
    res.json(callTypes);
  } catch (e) { next(e); }
}

export async function getAvailabilityForUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { weekStart } = req.query;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const owner = user.role === "MENTOR"
      ? { userId: null, mentorId: userId, role: "MENTOR" }
      : { userId, mentorId: null, role: "USER" };

    const weekStartDate = weekStart ? new Date(weekStart) : getWeekStart(new Date());
    weekStartDate.setUTCHours(0, 0, 0, 0);

    const result = await loadWeeklyAvailability(owner, weekStartDate);
    res.json(result);
  } catch (e) { next(e); }
}

/** Real multi-slot overlap between a user and a mentor over the next N days (default 30). */
export async function getOverlappingSlots(req, res, next) {
  try {
    const { userId, mentorId } = req.params;
    const { days } = req.query;

    const [user, mentor] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: mentorId } }),
    ]);
    if (!user || user.role !== "USER") return res.status(404).json({ error: "User not found" });
    if (!mentor || mentor.role !== "MENTOR") return res.status(404).json({ error: "Mentor not found" });

    const to = days ? new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000) : undefined;
    const overlap = await computeOverlap(userId, mentorId, to ? { to } : {});
    res.json({ userId, mentorId, overlap });
  } catch (e) { next(e); }
}

export async function getRecommendations(req, res, next) {
  try {
    const { userId, callType } = req.body;
    if (!userId || !callType) {
      return res.status(400).json({ error: "userId and callType are required" });
    }
    const result = await recommendMentors({ userId, callTypeKey: callType });
    res.json(result);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
}

export async function listRecommendationHistory(req, res, next) {
  try {
    const { userId } = req.params;
    const history = await prisma.recommendation.findMany({
      where: { userId }, include: { callType: true }, orderBy: { createdAt: "desc" }, take: 20,
    });
    res.json(history);
  } catch (e) { next(e); }
}

export async function scheduleMeeting(req, res, next) {
  try {
    const adminId = req.userId;
    const { title, startTime, endTime, userId, mentorId, callType, meetingLink, notes, participantEmails } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: "title is required" });
    if (!startTime || !endTime) return res.status(400).json({ error: "startTime and endTime are required" });

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) return res.status(400).json({ error: "endTime must be after startTime" });
    if (isPastTime(start)) return res.status(400).json({ error: "Cannot schedule meeting in the past" });

    // Double-booking prevention: reject if either party already has a meeting overlapping this window.
    const conflict = await prisma.meeting.findFirst({
      where: {
        status: "SCHEDULED",
        OR: [userId ? { userId } : undefined, mentorId ? { mentorId } : undefined].filter(Boolean),
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (conflict) {
      return res.status(409).json({ error: "This slot conflicts with an existing meeting for this user or mentor" });
    }

    const emails = Array.isArray(participantEmails)
      ? participantEmails.map((e) => (typeof e === "string" ? e.trim() : "")).filter(Boolean)
      : [];

    const meeting = await prisma.meeting.create({
      data: {
        id: uuidv4(), adminId, userId: userId || null, mentorId: mentorId || null,
        callTypeKey: callType || null, title: title.trim(), startTime: start, endTime: end,
        meetingLink: meetingLink?.trim() || null, notes: notes?.trim() || null,
      },
    });

    if (emails.length > 0) {
      await prisma.meetingParticipant.createMany({
        data: emails.map((email) => ({ id: uuidv4(), meetingId: meeting.id, email })),
        skipDuplicates: true,
      });
    }

    const withParticipants = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: { participants: true, user: { select: userSelect }, mentor: { select: userSelect } },
    });
    res.status(201).json(withParticipants);
  } catch (e) { next(e); }
}

export async function cancelMeeting(req, res, next) {
  try {
    const { id } = req.params;
    const meeting = await prisma.meeting.update({ where: { id }, data: { status: "CANCELLED" } });
    res.json(meeting);
  } catch (e) { next(e); }
}

export async function rescheduleMeeting(req, res, next) {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;
    if (!startTime || !endTime) return res.status(400).json({ error: "startTime and endTime are required" });
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) return res.status(400).json({ error: "endTime must be after startTime" });

    const meeting = await prisma.meeting.update({
      where: { id },
      data: { startTime: start, endTime: end, status: "RESCHEDULED" },
    });
    res.json(meeting);
  } catch (e) { next(e); }
}

export async function analytics(req, res, next) {
  try {
    const data = await buildAnalytics();
    res.json(data);
  } catch (e) { next(e); }
}

const csvDate = (d) => (d ? new Date(d).toISOString() : "");

export async function exportUsersCsv(req, res, next) {
  try {
    const users = await prisma.user.findMany({ where: { role: "USER" }, include: { tags: true }, orderBy: { name: "asc" } });
    const csv = toCsv(users, [
      { header: "Name", value: (u) => u.name },
      { header: "Email", value: (u) => u.email },
      { header: "Timezone", value: (u) => u.timezone },
      { header: "Description", value: (u) => u.description },
      { header: "Tags", value: (u) => u.tags.map((t) => t.name).join("; ") },
      { header: "Created At", value: (u) => csvDate(u.createdAt) },
    ]);
    sendCsv(res, "users.csv", csv);
  } catch (e) { next(e); }
}

export async function exportMentorsCsv(req, res, next) {
  try {
    const mentors = await prisma.user.findMany({ where: { role: "MENTOR" }, include: { tags: true }, orderBy: { name: "asc" } });
    const csv = toCsv(mentors, [
      { header: "Name", value: (m) => m.name },
      { header: "Email", value: (m) => m.email },
      { header: "Company", value: (m) => m.company },
      { header: "Big Tech", value: (m) => (m.isBigTech ? "Yes" : "No") },
      { header: "Domain", value: (m) => m.domain },
      { header: "Years Experience", value: (m) => m.yearsExperience },
      { header: "Communication Score", value: (m) => m.communicationScore },
      { header: "Location", value: (m) => m.location },
      { header: "Description", value: (m) => m.description },
      { header: "Tags", value: (m) => m.tags.map((t) => t.name).join("; ") },
      { header: "Created At", value: (m) => csvDate(m.createdAt) },
    ]);
    sendCsv(res, "mentors.csv", csv);
  } catch (e) { next(e); }
}

export async function exportBookingsCsv(req, res, next) {
  try {
    const meetings = await prisma.meeting.findMany({
      include: { user: true, mentor: true, admin: true, participants: true },
      orderBy: { startTime: "desc" },
    });
    const csv = toCsv(meetings, [
      { header: "Title", value: (m) => m.title },
      { header: "Call Type", value: (m) => m.callTypeKey },
      { header: "User", value: (m) => m.user?.name },
      { header: "User Email", value: (m) => m.user?.email },
      { header: "Mentor", value: (m) => m.mentor?.name },
      { header: "Mentor Email", value: (m) => m.mentor?.email },
      { header: "Start Time", value: (m) => csvDate(m.startTime) },
      { header: "End Time", value: (m) => csvDate(m.endTime) },
      { header: "Status", value: (m) => m.status },
      { header: "Meeting Link", value: (m) => m.meetingLink },
      { header: "Booked By", value: (m) => m.admin?.name },
      { header: "Created At", value: (m) => csvDate(m.createdAt) },
    ]);
    sendCsv(res, "bookings.csv", csv);
  } catch (e) { next(e); }
}

export async function exportRecommendationsCsv(req, res, next) {
  try {
    const recs = await prisma.recommendation.findMany({
      include: { user: true, callType: true },
      orderBy: { createdAt: "desc" },
    });
    const rows = recs.flatMap((r) =>
      (Array.isArray(r.results) ? r.results : []).map((mentorResult, rank) => ({ r, mentorResult, rank }))
    );
    const csv = toCsv(rows, [
      { header: "User", value: ({ r }) => r.user?.name },
      { header: "Call Type", value: ({ r }) => r.callType?.label },
      { header: "Rank", value: ({ rank }) => rank + 1 },
      { header: "Mentor", value: ({ mentorResult }) => mentorResult.name },
      { header: "Score", value: ({ mentorResult }) => mentorResult.score },
      { header: "Confidence", value: ({ mentorResult }) => mentorResult.confidence },
      { header: "Reasoning", value: ({ mentorResult }) => mentorResult.reasoning },
      { header: "Model", value: ({ r }) => r.model },
      { header: "Created At", value: ({ r }) => csvDate(r.createdAt) },
    ]);
    sendCsv(res, "recommendations.csv", csv);
  } catch (e) { next(e); }
}
