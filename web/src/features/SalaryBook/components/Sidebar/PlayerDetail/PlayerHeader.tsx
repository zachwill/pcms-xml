import React from "react";
import { cx } from "@/lib/utils";

/**
 * Player headshot with fallback to initials
 */
export function PlayerPhoto({
  playerId,
  playerName,
  className,
}: {
  playerId?: number | null;
  playerName: string;
  className?: string;
}) {
  const [imageErrored, setImageErrored] = React.useState(false);

  // Reset error state when player changes
  React.useEffect(() => {
    setImageErrored(false);
  }, [playerId]);

  // Get initials from player name for fallback
  const initials = playerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const headshotUrl = playerId
    ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
    : null;

  return (
    <div
      className={cx(
        "w-20 h-20 rounded-full",
        "bg-gradient-to-br from-muted to-muted/50",
        "flex items-center justify-center",
        "text-2xl font-bold text-muted-foreground",
        "ring-2 ring-border",
        "overflow-hidden",
        className
      )}
    >
      {headshotUrl && !imageErrored ? (
        <img
          src={headshotUrl}
          alt={playerName}
          className="w-full h-full object-cover"
          onError={() => setImageErrored(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

/**
 * Player header section with photo, name, team info
 */
export function PlayerHeader({
  playerId,
  playerName,
  teamCode,
  teamName,
  position,
  age,
  experience,
}: {
  playerId?: number | null;
  playerName: string;
  teamCode: string;
  teamName: string;
  position?: string | null;
  age?: number | null;
  experience?: number | null;
}) {
  // Build metadata line
  const metaParts: string[] = [];
  if (position) metaParts.push(position);
  if (age) metaParts.push(`${age} yrs old`);
  if (experience !== null && experience !== undefined)
    metaParts.push(`${experience} yr${experience !== 1 ? "s" : ""} exp`);

  return (
    <div className="flex flex-col items-center text-center space-y-3">
      <PlayerPhoto playerId={playerId} playerName={playerName} />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">{playerName}</h2>
        <div className="text-sm text-muted-foreground">{teamName}</div>
        {metaParts.length > 0 && (
          <div className="text-xs text-muted-foreground/80">
            {metaParts.join(" • ")}
          </div>
        )}
      </div>
    </div>
  );
}
