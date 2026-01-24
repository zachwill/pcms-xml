import { useCallback, useMemo, useState } from "react";

/**
 * useSidebarStack — Manages entity navigation stack for the sidebar
 *
 * The sidebar has two modes:
 * 1. Default Mode: Shows context for the current team from scroll-spy
 * 2. Entity Mode: Shows detail view for a pushed entity (player/agent/pick/team)
 *
 * Key behavior: Back returns to CURRENT viewport team, not where you started.
 * This means the stack only tracks entity views, not team context.
 *
 * State Machine:
 * - DEFAULT MODE (empty stack) → shows scroll-spy active team
 * - ENTITY MODE (stack has items) → shows top of stack
 * - Back → pops stack, returns to previous entity or default mode
 */

/** Entity types that can be pushed onto the sidebar stack */
export type EntityType = "player" | "agent" | "pick" | "team";

/** Base entity structure */
interface BaseEntity {
  type: EntityType;
}

/** Player entity pushed when clicking a player row */
export interface PlayerEntity extends BaseEntity {
  type: "player";
  playerId: number;
  playerName: string;
  teamCode: string;
}

/** Agent entity pushed when clicking an agent name */
export interface AgentEntity extends BaseEntity {
  type: "agent";
  agentId: number;
  agentName: string;
}

/** Pick entity pushed when clicking a draft pick pill */
export interface PickEntity extends BaseEntity {
  type: "pick";
  teamCode: string;
  draftYear: number;
  draftRound: number;
  rawFragment: string;
}

/**
 * Team entity pushed when clicking team name in header
 * Unlike default mode, this is "pinned" and won't change on scroll
 */
export interface TeamEntity extends BaseEntity {
  type: "team";
  teamCode: string;
  teamName: string;
}

/** Union type for all pushable entities */
export type SidebarEntity = PlayerEntity | AgentEntity | PickEntity | TeamEntity;

/** Current sidebar mode */
export type SidebarMode = "default" | "entity";

interface SidebarStackResult {
  /** Current sidebar mode: default (team context) or entity (detail view) */
  mode: SidebarMode;

  /** Current entity at top of stack (null in default mode) */
  currentEntity: SidebarEntity | null;

  /** Full entity stack (for breadcrumb UI if needed) */
  stack: SidebarEntity[];

  /** Stack depth (0 = default mode) */
  depth: number;

  /** Push an entity onto the stack */
  push: (entity: SidebarEntity) => void;

  /** Pop the top entity from stack (go back) */
  pop: () => void;

  /** Clear entire stack (return to default mode) */
  clear: () => void;

  /** Check if we can go back */
  canGoBack: boolean;

  /** Replace the current entity (for navigation within same level) */
  replace: (entity: SidebarEntity) => void;
}

/**
 * Hook to manage sidebar entity navigation stack
 *
 * @example
 * ```tsx
 * const { mode, currentEntity, push, pop, canGoBack } = useSidebarStack();
 *
 * // Push player when row clicked
 * const handlePlayerClick = (player: PlayerEntity) => {
 *   push({ type: 'player', ...player });
 * };
 *
 * // Pop when back clicked (returns to current viewport team)
 * const handleBack = () => pop();
 * ```
 */
export function useSidebarStack(): SidebarStackResult {
  const [stack, setStack] = useState<SidebarEntity[]>([]);

  /**
   * Push an entity onto the stack
   * Opens the entity detail view in the sidebar
   */
  const push = useCallback((entity: SidebarEntity) => {
    setStack((prev) => [...prev, entity]);
  }, []);

  /**
   * Pop the top entity from the stack
   * Returns to previous entity, or default mode if stack becomes empty
   *
   * IMPORTANT: This returns to the CURRENT viewport team (via scroll-spy),
   * not the team you were viewing when you first pushed an entity.
   */
  const pop = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  /**
   * Clear entire stack
   * Returns immediately to default mode (current viewport team)
   */
  const clear = useCallback(() => {
    setStack([]);
  }, []);

  /**
   * Replace the current entity at top of stack
   * Useful for navigating between entities at the same level
   * (e.g., switching from one player to another without adding to stack)
   */
  const replace = useCallback((entity: SidebarEntity) => {
    setStack((prev) => {
      if (prev.length === 0) {
        // If empty, just push
        return [entity];
      }
      // Replace top of stack
      return [...prev.slice(0, -1), entity];
    });
  }, []);

  // Derived state
  const mode: SidebarMode = stack.length > 0 ? "entity" : "default";
  const currentEntity: SidebarEntity | null = stack.length > 0 ? stack[stack.length - 1]! : null;
  const canGoBack = stack.length > 0;
  const depth = stack.length;

  // Memoize the result to prevent unnecessary re-renders
  const result = useMemo<SidebarStackResult>(
    () => ({
      mode,
      currentEntity,
      stack,
      depth,
      push,
      pop,
      clear,
      canGoBack,
      replace,
    }),
    [mode, currentEntity, stack, depth, push, pop, clear, canGoBack, replace]
  );

  return result;
}
