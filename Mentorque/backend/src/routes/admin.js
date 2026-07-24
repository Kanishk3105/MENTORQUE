import { Router } from "express";
import {
  listUsers,
  listMentors,
  createUser,
  updateProfile,
  listTags,
  listCallTypes,
  getAvailabilityForUser,
  getOverlappingSlots,
  getRecommendations,
  listRecommendationHistory,
  scheduleMeeting,
  cancelMeeting,
  rescheduleMeeting,
  analytics,
  exportUsersCsv,
  exportMentorsCsv,
  exportBookingsCsv,
  exportRecommendationsCsv,
} from "../controllers/adminController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export const adminRoutes = Router();

adminRoutes.use(authenticate);
adminRoutes.use(requireRole("ADMIN"));

adminRoutes.get("/users", listUsers);
adminRoutes.get("/mentors", listMentors);
adminRoutes.post("/create-user", createUser);
adminRoutes.patch("/users/:id/profile", updateProfile);

adminRoutes.get("/tags", listTags);
adminRoutes.get("/call-types", listCallTypes);

adminRoutes.get("/availability/:userId", getAvailabilityForUser);
adminRoutes.get("/overlap/:userId/:mentorId", getOverlappingSlots);

adminRoutes.post("/recommendations", getRecommendations);
adminRoutes.get("/recommendations/:userId", listRecommendationHistory);

adminRoutes.post("/meetings", scheduleMeeting);
adminRoutes.post("/meetings/:id/cancel", cancelMeeting);
adminRoutes.post("/meetings/:id/reschedule", rescheduleMeeting);

adminRoutes.get("/analytics", analytics);

adminRoutes.get("/export/users.csv", exportUsersCsv);
adminRoutes.get("/export/mentors.csv", exportMentorsCsv);
adminRoutes.get("/export/bookings.csv", exportBookingsCsv);
adminRoutes.get("/export/recommendations.csv", exportRecommendationsCsv);
