/**
 * Shared constants for the AERO frontend.
 *
 * Single source of truth for status enums, role strings, badge mappings,
 * and validation patterns used across multiple page components.
 */

// ── Operation Status Enum ────────────────────────────────────────────

export const OPERATION_STATUS = {
  INTRODUCED: 1,
  REJECTED: 2,
  CONFIRMED: 3,
  ORDERED: 4,
  IN_REALIZATION: 5,
  COMPLETED: 6,
  RESIGNED: 7,
} as const;

export const OPERATION_STATUS_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

// ── Order Status Enum ────────────────────────────────────────────────

export const ORDER_STATUS = {
  INTRODUCED: 1,
  SUBMITTED: 2,
  REJECTED: 3,
  ACCEPTED: 4,
  IN_SETTLEMENT: 5,
  COMPLETED: 6,
  NOT_COMPLETED: 7,
} as const;

export const ORDER_STATUS_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

// ── System Roles ─────────────────────────────────────────────────────

export const SYSTEM_ROLE = {
  ADMIN: "Administrator",
  PLANNER: "Osoba planuj\u0105ca",
  SUPERVISOR: "Osoba nadzoruj\u0105ca",
  PILOT: "Pilot",
} as const;

export const SYSTEM_ROLES = [
  SYSTEM_ROLE.ADMIN,
  SYSTEM_ROLE.PLANNER,
  SYSTEM_ROLE.SUPERVISOR,
  SYSTEM_ROLE.PILOT,
] as const;

export const SYSTEM_ROLE_DISPLAY_KEY: Record<string, string> = {
  [SYSTEM_ROLE.ADMIN]: "users.roleAdmin",
  [SYSTEM_ROLE.PLANNER]: "users.rolePlanner",
  [SYSTEM_ROLE.SUPERVISOR]: "users.roleSupervisor",
  [SYSTEM_ROLE.PILOT]: "users.rolePilot",
};

export const SYSTEM_ROLE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  [SYSTEM_ROLE.ADMIN]: "default",
  [SYSTEM_ROLE.PLANNER]: "secondary",
  [SYSTEM_ROLE.SUPERVISOR]: "outline",
  [SYSTEM_ROLE.PILOT]: "secondary",
};

// ── Crew Roles ───────────────────────────────────────────────────────

export const CREW_ROLE = {
  PILOT: "Pilot",
  OBSERVER: "Obserwator",
  MECHANIC: "Mechanik",
  OPERATOR: "Operator",
} as const;

export const CREW_ROLES = [
  CREW_ROLE.PILOT,
  CREW_ROLE.OBSERVER,
  CREW_ROLE.MECHANIC,
  CREW_ROLE.OPERATOR,
] as const;

export const CREW_ROLE_DISPLAY_KEY: Record<string, string> = {
  [CREW_ROLE.PILOT]: "crew.rolePilot",
  [CREW_ROLE.OBSERVER]: "crew.roleObserver",
  [CREW_ROLE.MECHANIC]: "crew.roleMechanic",
  [CREW_ROLE.OPERATOR]: "crew.roleOperator",
};

export const CREW_ROLE_BADGE_VARIANT: Record<string, "default" | "secondary"> = {
  [CREW_ROLE.PILOT]: "default",
  [CREW_ROLE.OBSERVER]: "secondary",
  [CREW_ROLE.MECHANIC]: "secondary",
  [CREW_ROLE.OPERATOR]: "secondary",
};

// ── Operation Status Badge Mappings ──────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const OPERATION_STATUS_BADGE_VARIANT: Record<number, BadgeVariant> = {
  1: "default",
  2: "destructive",
  3: "default",
  4: "outline",
  5: "outline",
  6: "default",
  7: "secondary",
};

export const OPERATION_STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-[#48A2CE] text-white",     // accent blue — introduced
  2: "",                              // destructive variant handles red
  3: "bg-[#4C8832] text-white",     // accent green — confirmed
  4: "bg-[#F2C432] text-gray-900",  // accent yellow — ordered
  5: "bg-orange-500 text-gray-900", // in realization
  6: "bg-[#4C8832] text-white",     // accent green — completed
  7: "",                              // secondary variant handles grey
};

// ── Operation Form Status Badge Classes (without variant) ────────────

export const OPERATION_FORM_STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-[#48A2CE] text-white",     // accent blue — introduced
  2: "bg-[#C90019] text-white",     // accent red — rejected
  3: "bg-[#4C8832] text-white",     // accent green — confirmed
  4: "bg-[#F2C432] text-gray-900",  // accent yellow — ordered
  5: "bg-orange-500 text-white",     // in realization
  6: "bg-[#4C8832] text-white",     // accent green — completed
  7: "bg-gray-400 text-white",       // resigned
};

// ── Order Status Badge Mappings ──────────────────────────────────────

export const ORDER_STATUS_BADGE_VARIANT: Record<number, BadgeVariant> = {
  1: "default",
  2: "outline",
  3: "destructive",
  4: "default",
  5: "outline",
  6: "default",
  7: "secondary",
};

export const ORDER_STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-[#48A2CE] text-white",     // accent blue — introduced
  2: "bg-[#F2C432] text-gray-900",  // accent yellow — submitted
  3: "",                              // destructive handles red
  4: "bg-[#4C8832] text-white",     // accent green — accepted
  5: "bg-orange-500 text-gray-900", // in settlement
  6: "bg-[#4C8832] text-white",     // accent green — completed
  7: "",                              // secondary handles grey
};

// ── Order Form Status Badge Classes (without variant) ────────────────

export const ORDER_FORM_STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-[#48A2CE] text-white",     // accent blue — introduced
  2: "bg-[#F2C432] text-gray-900",  // accent yellow — submitted
  3: "bg-[#C90019] text-white",     // accent red — rejected
  4: "bg-[#4C8832] text-white",     // accent green — accepted
  5: "bg-orange-500 text-white",     // in settlement
  6: "bg-[#4C8832] text-white",     // accent green — completed
  7: "bg-gray-400 text-white",       // not completed
};

// ── Helicopter Status Mappings ───────────────────────────────────────

export const HELICOPTER_STATUSES = ["aktywny", "nieaktywny"] as const;

export const HELICOPTER_STATUS_BADGE_VARIANT: Record<string, "default" | "secondary"> = {
  aktywny: "default",
  nieaktywny: "secondary",
};

export const HELICOPTER_STATUS_DISPLAY_KEY: Record<string, string> = {
  aktywny: "helicopters.statusActive",
  nieaktywny: "helicopters.statusInactive",
};

// ── Planner Editable Statuses ────────────────────────────────────────

export const PLANNER_EDITABLE_STATUSES = [
  OPERATION_STATUS.INTRODUCED,
  OPERATION_STATUS.REJECTED,
  OPERATION_STATUS.CONFIRMED,
  OPERATION_STATUS.ORDERED,
  OPERATION_STATUS.IN_REALIZATION,
] as const;

// ── Role-Based Default Filters ──────────────────────────────────────

/**
 * Default operation list status filter per role.
 * "" means show all statuses (no filter applied).
 */
export const OPERATION_DEFAULT_STATUS_FILTER: Record<string, string> = {
  [SYSTEM_ROLE.ADMIN]: "",
  [SYSTEM_ROLE.PLANNER]: String(OPERATION_STATUS.INTRODUCED),    // "1"
  [SYSTEM_ROLE.SUPERVISOR]: String(OPERATION_STATUS.INTRODUCED),  // "1"
  [SYSTEM_ROLE.PILOT]: String(OPERATION_STATUS.CONFIRMED),        // "3"
};

/**
 * Default order list status filter per role.
 * "" means show all statuses (no filter applied).
 */
export const ORDER_DEFAULT_STATUS_FILTER: Record<string, string> = {
  [SYSTEM_ROLE.ADMIN]: "",
  [SYSTEM_ROLE.PILOT]: String(ORDER_STATUS.INTRODUCED),           // "1"
  [SYSTEM_ROLE.SUPERVISOR]: String(ORDER_STATUS.SUBMITTED),       // "2"
};

// ── Email Validation Regex ───────────────────────────────────────────

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
