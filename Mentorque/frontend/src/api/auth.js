import { api, post } from "./client.js";

// No self-registration — accounts are seeded. See src/scripts/seed.js on the backend.
export async function login(data) {
  return post("/api/auth/login", data);
}

export async function me() {
  return api("GET", `/api/auth/me?_=${Date.now()}`, null, { skipAuthRedirect: true });
}
