/**
 * Data Layer Barrel Export
 *
 * Exports all types, constants, and data utilities for the Salary Book feature.
 * Data is fetched from PostgreSQL via API routes, not stored here.
 */

// Type definitions
export * from "./types";

// Static team metadata (instant render; used as a fallback for API latency)
export * from "./teams";

// Re-export commonly used types for convenience
export type {
  // Core entities
  SalaryBookPlayer,
  Team,
  TeamSalary,
  DraftPick,
  DraftPickSummary,
  Agent,
  Agency,

  // Contract types
  ContractOption,
  GuaranteeType,
  BirdRights,
  FreeAgencyType,

  // UI state types
  Conference,
  EntityType,
  EntityRef,
  SalaryBookFilters,
  LoadedTeamsState,
} from "./types";
