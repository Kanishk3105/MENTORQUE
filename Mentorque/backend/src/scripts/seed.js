/**
 * Seeds the database with 1 admin, 5 mentors, 10 users — realistic names,
 * emails, descriptions, tags, mentor profile fields, and recurring weekly
 * availability templates, plus the 3 call types the matching engine uses.
 *
 * Run: npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { replaceTemplate } from "../services/availabilityWeek.js";

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@mentorque.dev").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin User";
const SEED_PASSWORD = process.env.SEED_PASSWORD || "password123";

const CALL_TYPES = [
  {
    key: "RESUME_REVAMP",
    label: "Resume Revamp",
    description: "Polish and restructure a resume; ideally with a Big Tech mentor.",
    weights: { bigTech: 0.45, communication: 0.15, domainMatch: 0.1, semantic: 0.3 },
  },
  {
    key: "JOB_MARKET_GUIDANCE",
    label: "Job Market Guidance",
    description: "Navigating the job market, negotiation, positioning; prefers strong communicators.",
    weights: { bigTech: 0.1, communication: 0.45, domainMatch: 0.15, semantic: 0.3 },
  },
  {
    key: "MOCK_INTERVIEW",
    label: "Mock Interview",
    description: "Practice interview; prefers a mentor from the same domain.",
    weights: { bigTech: 0.1, communication: 0.15, domainMatch: 0.45, semantic: 0.3 },
  },
];

const TAGS = [
  { name: "Tech", category: "domain" },
  { name: "Non-tech", category: "domain" },
  { name: "Frontend", category: "domain" },
  { name: "Backend", category: "domain" },
  { name: "Data Science", category: "domain" },
  { name: "Product", category: "domain" },
  { name: "Design", category: "domain" },
  { name: "Big Tech", category: "company-tier" },
  { name: "Startup", category: "company-tier" },
  { name: "Good Communication", category: "trait" },
  { name: "Asks Lots Of Questions", category: "trait" },
  { name: "Senior Developer", category: "trait" },
  { name: "India", category: "location" },
  { name: "Ireland", category: "location" },
  { name: "US", category: "location" },
];

const MENTORS = [
  {
    name: "Ananya Rao",
    email: "ananya.rao@mentorque.dev",
    description:
      "Senior Software Engineer at Google with 8 years building large-scale distributed systems. Loves helping candidates polish resumes and prep for system design interviews.",
    company: "Google",
    isBigTech: true,
    domain: "Backend",
    location: "Bengaluru, India",
    yearsExperience: 8,
    communicationScore: 82,
    tags: ["Tech", "Backend", "Big Tech", "Senior Developer", "India"],
    pattern: [
      { dayOfWeek: 0, hour: 15 }, { dayOfWeek: 0, hour: 16 },
      { dayOfWeek: 2, hour: 15 }, { dayOfWeek: 2, hour: 16 },
      { dayOfWeek: 4, hour: 10 }, { dayOfWeek: 4, hour: 11 },
    ],
  },
  {
    name: "Liam O'Connor",
    email: "liam.oconnor@mentorque.dev",
    description:
      "Career coach and former recruiter now leading talent ops at a Dublin fintech. Exceptional at mock interviews and calming pre-interview nerves, with a knack for clear, structured communication.",
    company: "Stripe",
    isBigTech: true,
    domain: "Product",
    location: "Dublin, Ireland",
    yearsExperience: 10,
    communicationScore: 93,
    tags: ["Non-tech", "Product", "Big Tech", "Good Communication", "Ireland"],
    pattern: [
      { dayOfWeek: 1, hour: 9 }, { dayOfWeek: 1, hour: 10 },
      { dayOfWeek: 3, hour: 9 }, { dayOfWeek: 3, hour: 10 },
      { dayOfWeek: 3, hour: 14 },
    ],
  },
  {
    name: "Priya Nair",
    email: "priya.nair@mentorque.dev",
    description:
      "Data Scientist at Meta specializing in ML infrastructure. Runs deep technical mock interviews focused on ML system design and takes a rigorous, no-nonsense approach to feedback.",
    company: "Meta",
    isBigTech: true,
    domain: "Data Science",
    location: "Hyderabad, India",
    yearsExperience: 6,
    communicationScore: 74,
    tags: ["Tech", "Data Science", "Big Tech", "Senior Developer", "India"],
    pattern: [
      { dayOfWeek: 0, hour: 17 }, { dayOfWeek: 0, hour: 18 },
      { dayOfWeek: 2, hour: 17 },
      { dayOfWeek: 5, hour: 8 }, { dayOfWeek: 5, hour: 9 },
    ],
  },
  {
    name: "Ciara Byrne",
    email: "ciara.byrne@mentorque.dev",
    description:
      "Founding designer at an early-stage startup, previously at Shopify. Great at portfolio and resume reviews for design and product roles, with a warm, encouraging communication style.",
    company: "Shopify",
    isBigTech: false,
    domain: "Design",
    location: "Cork, Ireland",
    yearsExperience: 5,
    communicationScore: 88,
    tags: ["Non-tech", "Design", "Startup", "Good Communication", "Ireland"],
    pattern: [
      { dayOfWeek: 1, hour: 13 }, { dayOfWeek: 1, hour: 14 },
      { dayOfWeek: 4, hour: 13 }, { dayOfWeek: 4, hour: 14 },
    ],
  },
  {
    name: "Rohan Mehta",
    email: "rohan.mehta@mentorque.dev",
    description:
      "Staff Frontend Engineer at Amazon, ex-startup CTO. Enjoys resume reviews for frontend/full-stack roles and running realistic coding mock interviews.",
    company: "Amazon",
    isBigTech: true,
    domain: "Frontend",
    location: "Pune, India",
    yearsExperience: 9,
    communicationScore: 79,
    tags: ["Tech", "Frontend", "Big Tech", "Senior Developer", "India"],
    pattern: [
      { dayOfWeek: 2, hour: 11 }, { dayOfWeek: 2, hour: 12 },
      { dayOfWeek: 4, hour: 16 }, { dayOfWeek: 4, hour: 17 },
      { dayOfWeek: 6, hour: 9 },
    ],
  },
];

const USERS = [
  { name: "Aditya Sharma", domain: "Backend", tags: ["Tech", "Backend"], description: "Backend engineer with 2 years experience looking to move to a bigger company; wants resume feedback from someone who's been through Big Tech hiring." },
  { name: "Sneha Patil", domain: "Frontend", tags: ["Tech", "Frontend", "Asks Lots Of Questions"], description: "Frontend developer prepping for interviews, asks a lot of clarifying questions and wants a mentor who explains things patiently." },
  { name: "Cathal Murphy", domain: "Product", tags: ["Non-tech", "Product"], description: "Product manager pivoting from consulting, needs guidance on how to talk about the job market and negotiate offers." },
  { name: "Meera Iyer", domain: "Data Science", tags: ["Tech", "Data Science"], description: "Data scientist wanting a rigorous mock interview on ML system design before final rounds." },
  { name: "Aoife Kelly", domain: "Design", tags: ["Non-tech", "Design"], description: "Product designer looking for a portfolio and resume review ahead of interviews at design-led companies." },
  { name: "Vikram Singh", domain: "Backend", tags: ["Tech", "Backend", "Good Communication"], description: "Senior backend engineer targeting FAANG, wants a resume revamp from someone who's hired at that level." },
  { name: "Fiona Walsh", domain: "Product", tags: ["Non-tech", "Product", "Asks Lots Of Questions"], description: "Early-career PM navigating a tough job market, wants coaching on positioning and communication." },
  { name: "Karan Verma", domain: "Frontend", tags: ["Tech", "Frontend"], description: "Frontend developer preparing for coding interviews, wants a realistic mock interview with feedback." },
  { name: "Niamh Doyle", domain: "Data Science", tags: ["Tech", "Data Science", "Good Communication"], description: "Analytics-to-DS transition, wants help articulating impact clearly on a resume." },
  { name: "Arjun Reddy", domain: "Design", tags: ["Non-tech", "Design"], description: "UX designer looking for job market guidance and interview prep as they look to relocate." },
];

async function upsertTags(tagDefs) {
  const map = new Map();
  for (const t of tagDefs) {
    const tag = await prisma.tag.upsert({ where: { name: t.name }, create: t, update: {} });
    map.set(tag.name, tag);
  }
  return map;
}

async function upsertPerson({ name, email, password, role, extra = {}, tagNames = [], tagMap }) {
  const hashed = await bcrypt.hash(password, 12);
  const data = {
    name, email, password: hashed, role, timezone: "UTC", ...extra,
    tags: { set: tagNames.map((n) => ({ id: tagMap.get(n).id })) },
  };
  return prisma.user.upsert({
    where: { email },
    create: { id: uuidv4(), ...data },
    update: data,
  });
}

async function main() {
  console.log("Seeding call types...");
  for (const ct of CALL_TYPES) {
    await prisma.callType.upsert({ where: { key: ct.key }, create: ct, update: ct });
  }

  console.log("Seeding tags...");
  const tagMap = await upsertTags(TAGS);

  console.log("Seeding admin...");
  await upsertPerson({
    name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "ADMIN", tagMap,
  });

  console.log("Seeding mentors...");
  for (const m of MENTORS) {
    const mentor = await upsertPerson({
      name: m.name, email: m.email, password: SEED_PASSWORD, role: "MENTOR", tagMap,
      tagNames: m.tags,
      extra: {
        description: m.description, company: m.company, isBigTech: m.isBigTech,
        domain: m.domain, location: m.location, yearsExperience: m.yearsExperience,
        communicationScore: m.communicationScore, embedding: null, embeddingModel: null,
      },
    });
    await replaceTemplate({ userId: null, mentorId: mentor.id, role: "MENTOR" }, m.pattern);
  }

  console.log("Seeding users...");
  const userPatterns = [
    [{ dayOfWeek: 0, hour: 15 }, { dayOfWeek: 0, hour: 16 }, { dayOfWeek: 2, hour: 15 }],
    [{ dayOfWeek: 1, hour: 9 }, { dayOfWeek: 1, hour: 10 }, { dayOfWeek: 3, hour: 9 }],
    [{ dayOfWeek: 0, hour: 17 }, { dayOfWeek: 2, hour: 17 }, { dayOfWeek: 5, hour: 8 }],
    [{ dayOfWeek: 1, hour: 13 }, { dayOfWeek: 4, hour: 13 }, { dayOfWeek: 4, hour: 14 }],
    [{ dayOfWeek: 2, hour: 11 }, { dayOfWeek: 4, hour: 16 }, { dayOfWeek: 4, hour: 17 }],
    [{ dayOfWeek: 0, hour: 15 }, { dayOfWeek: 0, hour: 16 }, { dayOfWeek: 4, hour: 10 }],
    [{ dayOfWeek: 1, hour: 9 }, { dayOfWeek: 3, hour: 10 }, { dayOfWeek: 3, hour: 14 }],
    [{ dayOfWeek: 2, hour: 11 }, { dayOfWeek: 2, hour: 12 }, { dayOfWeek: 6, hour: 9 }],
    [{ dayOfWeek: 0, hour: 17 }, { dayOfWeek: 0, hour: 18 }, { dayOfWeek: 5, hour: 9 }],
    [{ dayOfWeek: 1, hour: 13 }, { dayOfWeek: 1, hour: 14 }, { dayOfWeek: 4, hour: 14 }],
  ];

  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const email = `${u.name.toLowerCase().replace(/[^a-z]+/g, ".")}@mentorque.dev`;
    const user = await upsertPerson({
      name: u.name, email, password: SEED_PASSWORD, role: "USER", tagMap,
      tagNames: u.tags,
      extra: { description: u.description, location: null },
    });
    await replaceTemplate({ userId: user.id, mentorId: null, role: "USER" }, userPatterns[i]);
  }

  console.log("\nSeed complete.");
  console.log(`Admin:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Mentors & Users password: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
