import { prisma } from "../lib/prisma.js";

const profileSelect = {
  id: true, name: true, email: true, role: true, timezone: true,
  description: true, company: true, isBigTech: true, domain: true,
};

/**
 * Users and mentors only ever see their own meetings; admins can see
 * everything or filter by adminId/from/to.
 */
export async function listMeetings(req, res, next) {
  try {
    const { adminId, from, to } = req.query;
    const where = {};

    if (req.userRole === "USER") where.userId = req.userId;
    else if (req.userRole === "MENTOR") where.mentorId = req.userId;
    else if (adminId) where.adminId = adminId;

    if (from) where.startTime = { ...where.startTime, gte: new Date(from) };
    if (to) where.endTime = { ...where.endTime, lte: new Date(to) };

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        participants: true,
        user: { select: profileSelect },
        mentor: { select: profileSelect },
      },
      orderBy: { startTime: "asc" },
    });
    res.json(meetings);
  } catch (e) {
    next(e);
  }
}

export async function deleteMeeting(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.meeting.delete({ where: { id } });
    res.json({ success: true, message: "Meeting deleted" });
  } catch (e) {
    next(e);
  }
}
