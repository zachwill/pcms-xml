/**
 * Hooks Barrel Export
 *
 * Exports all hooks for the Salary Book feature.
 */

export { useScrollSpy } from "./useScrollSpy";
export {
  useSidebarStack,
  type EntityType,
  type SidebarEntity,
  type SidebarMode,
  type PlayerEntity,
  type AgentEntity,
  type PickEntity,
  type TeamEntity,
} from "./useSidebarStack";
export {
  useFilterState,
  type DisplayFilter,
  type FinancialsFilter,
  type ContractsFilter,
  type FilterKey,
  type FilterState,
  type FilterMeta,
  type UseFilterStateReturn,
  FILTER_METADATA,
} from "./useFilterState";
export { useTeams, type UseTeamsReturn } from "./useTeams";
export { usePlayers, type UsePlayersReturn } from "./usePlayers";
export { useTeamSalary, type UseTeamSalaryReturn } from "./useTeamSalary";
export { usePicks, type UsePicksReturn } from "./usePicks";
export {
  useAgent,
  type UseAgentReturn,
  type AgentDetail,
  type AgentClientPlayer,
} from "./useAgent";
