import type { AuthSession, ProfileUpdate, Student } from "@/types";

/**
 * Guest demo: lets a visitor (e.g. an interviewer) open the hosted app without creating a
 * Supabase account. The session and any profile edits live only in this browser's
 * localStorage, and every screen shows the Sophia Rodriguez demo data from services/demo.ts.
 */

const STORAGE_KEY = "maroon.demo.session";
export const DEMO_USER_ID = "demo-student";

/** Sophia Rodriguez, the persona the mock academics, payments and clubs data is written for. */
const DEMO_STUDENT: Student = {
  id: DEMO_USER_ID,
  internetId: "rodr0420",
  name: "Sophia Rodriguez",
  email: "rodr0420@umn.edu",
  program: "B.S. Computer Science",
  graduationYear: 2028,
  preferredLanguage: "en",
  plainLanguage: false,
  transferStudent: false,
  onboardingStep: "done",
  onboardedAt: "2026-09-01T12:00:00.000Z",
  // touredAt is left unset so the first-visit dashboard tour runs for every new visitor.
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // private mode or blocked storage
  }
}

function read(): Student | null {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return { ...DEMO_STUDENT, ...(JSON.parse(raw) as Partial<Student>), id: DEMO_USER_ID };
  } catch {
    return null;
  }
}

function write(student: Student): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(student));
  } catch {
    /* the demo still works for this page view without storage */
  }
}

function toSession(student: Student): AuthSession {
  return { student, token: "demo" };
}

export const demoSession = {
  isDemoUser: (userId: string | undefined) => userId === DEMO_USER_ID,

  /** The saved demo session, if this browser started one. */
  restore(): AuthSession | null {
    const student = read();
    return student ? toSession(student) : null;
  },

  start(): AuthSession {
    const student = read() ?? DEMO_STUDENT;
    write(student);
    return toSession(student);
  },

  update(update: ProfileUpdate): Student {
    const current = read() ?? DEMO_STUDENT;
    const next = { ...current } as Record<string, unknown>;
    for (const [key, value] of Object.entries(update)) {
      if (value === undefined) delete next[key];
      else next[key] = typeof value === "string" ? value.trim() : value;
    }
    const student = { ...(next as unknown as Student), id: DEMO_USER_ID };
    write(student);
    return student;
  },

  end(): void {
    try {
      storage()?.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};
