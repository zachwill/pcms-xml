import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { TradeMode, TradePlayer, TradeState } from "../data";

const DEFAULT_SALARY_YEAR = 2025;
const DEFAULT_MODE: TradeMode = "expanded";

export interface TradeMachineContextValue {
  trade: TradeState;
  selectedPlayerIds: Set<number>;
  setSalaryYear: (year: number) => void;
  setPrimaryTeam: (teamCode: string | null) => void;
  setSecondaryTeam: (teamCode: string | null) => void;
  togglePlayer: (player: TradePlayer) => void;
  removePlayer: (playerId: number) => void;
  clearPlayers: () => void;
  resetTrade: () => void;
  isPlayerSelected: (playerId: number) => boolean;
}

const TradeMachineContext = createContext<TradeMachineContextValue | null>(null);

export function useTradeMachineContext() {
  const ctx = useContext(TradeMachineContext);
  if (!ctx) {
    throw new Error("useTradeMachineContext must be used within <TradeMachineProvider>");
  }
  return ctx;
}

export interface TradeMachineProviderProps {
  children: ReactNode;
  defaultYear?: number;
  defaultMode?: TradeMode;
}

function createInitialTradeState(
  defaultYear: number,
  defaultMode: TradeMode
): TradeState {
  return {
    salaryYear: defaultYear,
    mode: defaultMode,
    primaryTeamCode: null,
    secondaryTeamCode: null,
    players: [],
  };
}

export function TradeMachineProvider({
  children,
  defaultYear = DEFAULT_SALARY_YEAR,
  defaultMode = DEFAULT_MODE,
}: TradeMachineProviderProps) {
  const [trade, setTrade] = useState<TradeState>(() =>
    createInitialTradeState(defaultYear, defaultMode)
  );

  const setSalaryYear = useCallback((year: number) => {
    setTrade((prev) => {
      if (prev.salaryYear === year) return prev;
      return { ...prev, salaryYear: year };
    });
  }, []);

  const setPrimaryTeam = useCallback((teamCode: string | null) => {
    setTrade((prev) => {
      if (teamCode === prev.primaryTeamCode) return prev;

      if (!teamCode) {
        return {
          ...prev,
          primaryTeamCode: null,
          secondaryTeamCode: null,
          players: [],
        };
      }

      const nextSecondary =
        prev.secondaryTeamCode === teamCode ? null : prev.secondaryTeamCode;

      const players = prev.players.filter(
        (player) => player.teamCode === teamCode || player.teamCode === nextSecondary
      );

      return {
        ...prev,
        primaryTeamCode: teamCode,
        secondaryTeamCode: nextSecondary,
        players,
      };
    });
  }, []);

  const setSecondaryTeam = useCallback((teamCode: string | null) => {
    setTrade((prev) => {
      if (teamCode === prev.secondaryTeamCode) return prev;
      if (teamCode && teamCode === prev.primaryTeamCode) return prev;

      const players = prev.players.filter(
        (player) => player.teamCode === prev.primaryTeamCode || player.teamCode === teamCode
      );

      return {
        ...prev,
        secondaryTeamCode: teamCode,
        players,
      };
    });
  }, []);

  const togglePlayer = useCallback((player: TradePlayer) => {
    setTrade((prev) => {
      const alreadySelected = prev.players.some(
        (existing) => existing.playerId === player.playerId
      );

      if (alreadySelected) {
        return {
          ...prev,
          players: prev.players.filter(
            (existing) => existing.playerId !== player.playerId
          ),
        };
      }

      let primaryTeamCode = prev.primaryTeamCode;
      let secondaryTeamCode = prev.secondaryTeamCode;

      const isKnownTeam =
        player.teamCode === primaryTeamCode || player.teamCode === secondaryTeamCode;

      if (!isKnownTeam) {
        if (!primaryTeamCode) {
          primaryTeamCode = player.teamCode;
        } else if (!secondaryTeamCode) {
          secondaryTeamCode = player.teamCode;
        } else {
          return prev;
        }
      }

      return {
        ...prev,
        primaryTeamCode,
        secondaryTeamCode,
        players: [...prev.players, player],
      };
    });
  }, []);

  const removePlayer = useCallback((playerId: number) => {
    setTrade((prev) => {
      const players = prev.players.filter(
        (player) => player.playerId !== playerId
      );
      if (players.length === prev.players.length) return prev;
      return { ...prev, players };
    });
  }, []);

  const clearPlayers = useCallback(() => {
    setTrade((prev) => ({ ...prev, players: [] }));
  }, []);

  const resetTrade = useCallback(() => {
    setTrade(createInitialTradeState(defaultYear, defaultMode));
  }, [defaultYear, defaultMode]);

  const selectedPlayerIds = useMemo(() => {
    return new Set(trade.players.map((player) => player.playerId));
  }, [trade.players]);

  const isPlayerSelected = useCallback(
    (playerId: number) => selectedPlayerIds.has(playerId),
    [selectedPlayerIds]
  );

  const value = useMemo<TradeMachineContextValue>(
    () => ({
      trade,
      selectedPlayerIds,
      setSalaryYear,
      setPrimaryTeam,
      setSecondaryTeam,
      togglePlayer,
      removePlayer,
      clearPlayers,
      resetTrade,
      isPlayerSelected,
    }),
    [
      trade,
      selectedPlayerIds,
      setSalaryYear,
      setPrimaryTeam,
      setSecondaryTeam,
      togglePlayer,
      removePlayer,
      clearPlayers,
      resetTrade,
      isPlayerSelected,
    ]
  );

  return (
    <TradeMachineContext.Provider value={value}>
      {children}
    </TradeMachineContext.Provider>
  );
}
