import { get, post, patch, downloadFile } from "./client.js";

export async function listUsers() {
  return get("/api/admin/users");
}

export async function listMentors() {
  return get("/api/admin/mentors");
}

export async function createUser(data) {
  return post("/api/admin/create-user", data);
}

export async function updateProfile(userId, data) {
  return patch(`/api/admin/users/${userId}/profile`, data);
}

export async function listTags() {
  return get("/api/admin/tags");
}

export async function listCallTypes() {
  return get("/api/admin/call-types");
}

export async function getAvailabilityForUser(userId, weekStart) {
  const q = weekStart ? `?weekStart=${weekStart}` : "";
  return get(`/api/admin/availability/${userId}${q}`);
}

export async function getOverlappingSlots(userId, mentorId, days) {
  const q = days ? `?days=${days}` : "";
  return get(`/api/admin/overlap/${userId}/${mentorId}${q}`);
}

export async function getRecommendations(userId, callType) {
  return post("/api/admin/recommendations", { userId, callType });
}

export async function getRecommendationHistory(userId) {
  return get(`/api/admin/recommendations/${userId}`);
}

export async function scheduleMeeting(data) {
  return post("/api/admin/meetings", data);
}

export async function cancelMeeting(id) {
  return post(`/api/admin/meetings/${id}/cancel`);
}

export async function rescheduleMeeting(id, data) {
  return post(`/api/admin/meetings/${id}/reschedule`, data);
}

export async function getAnalytics() {
  return get("/api/admin/analytics");
}

export async function exportCsv(kind) {
  return downloadFile(`/api/admin/export/${kind}.csv`, `${kind}.csv`);
}
