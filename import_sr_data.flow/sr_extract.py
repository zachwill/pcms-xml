"""
SportRadar extraction + normalization helpers (no IO).
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any


TEAM_STAT_MAP = [
    ("points", "pts"),
    ("field_goals_made", "fgm"),
    ("field_goals_attempted", "fga"),
    ("field_goals_pct", "fg_pct"),
    ("field_goal_pct", "fg_pct"),
    ("fg_pct", "fg_pct"),
    ("three_pointers_made", "fg3m"),
    ("three_point_made", "fg3m"),
    ("three_pointers_attempted", "fg3a"),
    ("three_point_attempted", "fg3a"),
    ("three_pointers_pct", "fg3_pct"),
    ("three_point_pct", "fg3_pct"),
    ("two_points_made", "fg2m"),
    ("two_point_made", "fg2m"),
    ("two_points_att", "fg2a"),
    ("two_points_attempted", "fg2a"),
    ("two_points_pct", "fg2_pct"),
    ("two_point_pct", "fg2_pct"),
    ("free_throws_made", "ftm"),
    ("free_throws_attempted", "fta"),
    ("free_throws_pct", "ft_pct"),
    ("offensive_rebounds", "oreb"),
    ("defensive_rebounds", "dreb"),
    ("rebounds", "reb"),
    ("assists", "ast"),
    ("steals", "stl"),
    ("blocks", "blk"),
    ("turnovers", "tov"),
    ("personal_fouls", "pf"),
    ("technical_fouls", "tech_fouls"),
    ("flagrant_fouls", "flagrant_fouls"),
    ("points_in_paint", "pts_in_paint"),
    ("fast_break_points", "fast_break_pts"),
    ("second_chance_points", "second_chance_pts"),
    ("points_off_turnovers", "pts_off_turnovers"),
    ("biggest_lead", "biggest_lead"),
    ("true_shooting_attempts", "ts_att"),
    ("true_shooting_percentage", "ts_pct"),
    ("effective_field_goal_percentage", "efg_pct"),
    ("effective_fg_percentage", "efg_pct"),
    ("bench_points", "bench_pts"),
]

PLAYER_STAT_MAP = [
    ("points", "pts"),
    ("field_goals_made", "fgm"),
    ("field_goals_attempted", "fga"),
    ("field_goals_pct", "fg_pct"),
    ("field_goal_pct", "fg_pct"),
    ("fg_pct", "fg_pct"),
    ("three_pointers_made", "fg3m"),
    ("three_point_made", "fg3m"),
    ("three_pointers_attempted", "fg3a"),
    ("three_point_attempted", "fg3a"),
    ("three_pointers_pct", "fg3_pct"),
    ("three_point_pct", "fg3_pct"),
    ("two_points_made", "fg2m"),
    ("two_point_made", "fg2m"),
    ("two_points_att", "fg2a"),
    ("two_points_attempted", "fg2a"),
    ("two_points_pct", "fg2_pct"),
    ("two_point_pct", "fg2_pct"),
    ("free_throws_made", "ftm"),
    ("free_throws_attempted", "fta"),
    ("free_throws_pct", "ft_pct"),
    ("offensive_rebounds", "oreb"),
    ("defensive_rebounds", "dreb"),
    ("rebounds", "reb"),
    ("assists", "ast"),
    ("steals", "stl"),
    ("blocks", "blk"),
    ("turnovers", "tov"),
    ("personal_fouls", "pf"),
    ("technical_fouls", "tech_fouls"),
    ("flagrant_fouls", "flagrant_fouls"),
    ("plus_minus", "plus_minus"),
    ("efficiency", "efficiency"),
    ("efficiency_game_score", "efficiency_game_score"),
    ("double_double", "double_double"),
    ("triple_double", "triple_double"),
    ("points_in_paint", "pts_in_paint"),
    ("second_chance_points", "second_chance_pts"),
    ("points_off_turnovers", "pts_off_turnovers"),
    ("assists_turnover_ratio", "ast_tov_ratio"),
    ("assist_turnover_ratio", "ast_tov_ratio"),
    ("fouls_drawn", "fouls_drawn"),
    ("shots_blocked", "blocked_att"),
    ("blocked_att", "blocked_att"),
    ("true_shooting_attempts", "ts_att"),
    ("true_shooting_percentage", "ts_pct"),
    ("effective_field_goal_percentage", "efg_pct"),
    ("effective_fg_percentage", "efg_pct"),
]

TEAM_INT_FIELDS = {
    "pts",
    "fgm",
    "fga",
    "fg3m",
    "fg3a",
    "fg2m",
    "fg2a",
    "ftm",
    "fta",
    "oreb",
    "dreb",
    "reb",
    "ast",
    "stl",
    "blk",
    "tov",
    "pf",
    "tech_fouls",
    "flagrant_fouls",
    "pts_in_paint",
    "fast_break_pts",
    "second_chance_pts",
    "pts_off_turnovers",
    "biggest_lead",
    "bench_pts",
}

TEAM_FLOAT_FIELDS = {"fg_pct", "fg3_pct", "fg2_pct", "ft_pct", "ts_att", "ts_pct", "efg_pct"}

PLAYER_INT_FIELDS = {
    "pts",
    "fgm",
    "fga",
    "fg3m",
    "fg3a",
    "fg2m",
    "fg2a",
    "ftm",
    "fta",
    "oreb",
    "dreb",
    "reb",
    "ast",
    "stl",
    "blk",
    "tov",
    "pf",
    "tech_fouls",
    "flagrant_fouls",
    "plus_minus",
    "efficiency",
    "pts_in_paint",
    "second_chance_pts",
    "pts_off_turnovers",
    "fouls_drawn",
    "blocked_att",
    "seconds_played",
}

PLAYER_FLOAT_FIELDS = {
    "fg_pct",
    "fg3_pct",
    "fg2_pct",
    "ft_pct",
    "efficiency_game_score",
    "ast_tov_ratio",
    "ts_att",
    "ts_pct",
    "efg_pct",
}

SEASON_TEAM_INT_FIELDS = TEAM_INT_FIELDS | {"games_played"}
SEASON_TEAM_FLOAT_FIELDS = TEAM_FLOAT_FIELDS | {"pts_avg", "efficiency"}

SEASON_PLAYER_INT_FIELDS = PLAYER_INT_FIELDS | {
    "games_played",
    "games_started",
    "double_doubles",
    "triple_doubles",
}
SEASON_PLAYER_FLOAT_FIELDS = PLAYER_FLOAT_FIELDS | {
    "minutes_avg",
    "reb_avg",
    "ast_avg",
    "stl_avg",
    "blk_avg",
    "tov_avg",
    "pts_avg",
}

TEAM_SPLIT_STAT_FIELDS = {
    "pts",
    "fgm",
    "fga",
    "fg_pct",
    "fg3m",
    "fg3a",
    "fg3_pct",
    "fg2m",
    "fg2a",
    "fg2_pct",
}

PLAYER_SPLIT_STAT_FIELDS = {
    "fgm",
    "fga",
    "fg_pct",
    "fg3m",
    "fg3a",
    "fg3_pct",
    "fg2m",
    "fg2a",
    "fg2_pct",
}

SEASON_TEAM_STAT_FIELDS = {
    "pts",
    "fgm",
    "fga",
    "fg_pct",
    "fg3m",
    "fg3a",
    "fg3_pct",
    "fg2m",
    "fg2a",
    "fg2_pct",
    "ftm",
    "fta",
    "ft_pct",
    "oreb",
    "dreb",
    "reb",
    "ast",
    "stl",
    "blk",
    "tov",
    "pf",
    "tech_fouls",
    "flagrant_fouls",
    "pts_in_paint",
    "fast_break_pts",
    "second_chance_pts",
    "pts_off_turnovers",
}

SEASON_PLAYER_STAT_FIELDS = {
    "pts",
    "fgm",
    "fga",
    "fg_pct",
    "fg3m",
    "fg3a",
    "fg3_pct",
    "fg2m",
    "fg2a",
    "fg2_pct",
    "ftm",
    "fta",
    "ft_pct",
    "oreb",
    "dreb",
    "reb",
    "ast",
    "stl",
    "blk",
    "tov",
    "pf",
    "tech_fouls",
    "efficiency",
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))


def parse_iso_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_season_year(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        if value.isdigit():
            return int(value)
        match = re.search(r"\d{4}", value)
        if match:
            return int(match.group(0))
    return None


def to_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_season_type(value: Any) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, dict):
        return value.get("code") or value.get("name")
    return str(value)


def select_current_season(seasons_payload: dict) -> tuple[int | None, str | None]:
    seasons = seasons_payload.get("seasons") or []
    if isinstance(seasons, dict):
        seasons = [seasons]
    candidates = []
    for season in seasons:
        year = parse_season_year(season.get("year"))
        season_type = normalize_season_type(season.get("type") or season.get("season_type"))
        if year is None or not season_type:
            continue
        candidates.append(
            {
                "year": year,
                "season_type": season_type,
                "current": bool(season.get("current") or season.get("is_current")),
                "status": (season.get("status") or "").lower(),
                "start_date": season.get("start_date"),
            }
        )

    if not candidates:
        return None, None

    season_type_order = {
        "REG": 0,
        "PST": 1,
        "PIT": 2,
        "IST": 3,
        "SC": 4,
        "PRE": 5,
        "CT": 6,
    }
    status_order = {"inprogress": 0, "scheduled": 1, "open": 1}

    def season_sort_key(candidate: dict) -> tuple[int, int, int]:
        return (
            status_order.get(candidate["status"], 2),
            season_type_order.get(candidate["season_type"], 9),
            -candidate["year"],
        )

    current = [c for c in candidates if c["current"]]
    if current:
        best = sorted(current, key=season_sort_key)[0]
        return best["year"], best["season_type"]

    active = [c for c in candidates if c["status"] in {"inprogress", "scheduled", "open"}]
    if active:
        best = sorted(active, key=season_sort_key)[0]
        return best["year"], best["season_type"]

    best = sorted(candidates, key=season_sort_key)[0]
    return best["year"], best["season_type"]


def resolve_season_year_type(
    seasons_payload: dict,
    schedule_payload: dict | None,
    season_year: int | None,
    season_type: str | None,
) -> tuple[int | None, str | None]:
    resolved_year = season_year
    resolved_type = normalize_season_type(season_type)

    if schedule_payload and (resolved_year is None or resolved_type is None):
        season_ctx = extract_season_context(schedule_payload)
        if resolved_year is None:
            resolved_year = parse_season_year(season_ctx.get("year"))
        if resolved_type is None:
            resolved_type = normalize_season_type(
                season_ctx.get("type") or season_ctx.get("season_type")
            )

    if resolved_year is None or resolved_type is None:
        current_year, current_type = select_current_season(seasons_payload)
        if resolved_year is None:
            resolved_year = current_year
        if resolved_type is None:
            resolved_type = current_type

    return resolved_year, resolved_type


def lookup_season_id(
    season_lookup: dict[tuple[int, str], str],
    season_year: int | None,
    season_type: str | None,
) -> tuple[str | None, str | None]:
    if season_year is None or not season_lookup:
        return None, None

    normalized_type = normalize_season_type(season_type)
    if normalized_type and (season_year, normalized_type) in season_lookup:
        return season_lookup[(season_year, normalized_type)], normalized_type

    for preferred in ("REG", "PST", "PRE", "IST", "PIT", "CT"):
        if (season_year, preferred) in season_lookup:
            return season_lookup[(season_year, preferred)], preferred

    for (year, stype), season_id in season_lookup.items():
        if year == season_year:
            return season_id, stype

    return None, None


def minutes_to_seconds(value: str | None) -> int | None:
    if not value or ":" not in value:
        return None
    try:
        minutes, seconds = value.split(":")
        return int(minutes) * 60 + int(seconds)
    except (ValueError, TypeError):
        return None


def extract_game_id(game: dict) -> str | None:
    return (
        game.get("id")
        or game.get("game_id")
        or game.get("sr_event_id")
        or game.get("sport_event_id")
    )


def extract_home_away(game: dict) -> tuple[dict | None, dict | None]:
    if "home" in game or "away" in game:
        return game.get("home"), game.get("away")
    competitors = game.get("competitors") or game.get("teams") or []
    home = next((c for c in competitors if c.get("qualifier") == "home"), None)
    away = next((c for c in competitors if c.get("qualifier") == "away"), None)
    return home, away


def extract_points(team: dict | None, status: dict | None, side: str) -> int | None:
    if team:
        for key in ("points", "score", "points_scored"):
            if key in team:
                return to_int(team.get(key))
    if status:
        for key in (f"{side}_points", f"{side}_score"):
            if key in status:
                return to_int(status.get(key))
    return None


def parse_streak(streak: Any) -> str | None:
    if isinstance(streak, str):
        return streak
    if isinstance(streak, dict):
        kind = streak.get("kind") or streak.get("type") or streak.get("result")
        length = streak.get("length") or streak.get("count") or streak.get("streak")
        if kind and length is not None:
            prefix = "W" if str(kind).lower().startswith("w") else "L"
            return f"{prefix}{length}"
    return None


def normalize_records(records: Any) -> list[dict]:
    if not records:
        return []
    if isinstance(records, dict):
        return [records]
    if isinstance(records, list):
        return records
    return []


def extract_record(records: list[dict], record_types: set[str]) -> tuple[int | None, int | None]:
    for record in records:
        record_type = record.get("record_type") or record.get("type")
        if record_type in record_types:
            return to_int(record.get("wins")), to_int(record.get("losses"))
    return None, None


def apply_stat_map(stats: dict, mapping: list[tuple[str, str]]) -> dict:
    result: dict[str, Any] = {}
    for src, dest in mapping:
        if dest not in result and src in stats and stats[src] is not None:
            result[dest] = stats[src]
    return result


def compute_shooting_fields(row: dict) -> None:
    fgm = row.get("fgm")
    fg3m = row.get("fg3m")
    fga = row.get("fga")
    fg3a = row.get("fg3a")
    if fgm is not None and fg3m is not None:
        row["fg2m"] = fgm - fg3m
    if fga is not None and fg3a is not None:
        row["fg2a"] = fga - fg3a
    fg2m = row.get("fg2m")
    fg2a = row.get("fg2a")
    if fg2m is not None and fg2a:
        try:
            row["fg2_pct"] = round(float(fg2m) / float(fg2a), 4)
        except (TypeError, ValueError, ZeroDivisionError):
            row["fg2_pct"] = None


def normalize_numeric(row: dict, int_fields: set[str], float_fields: set[str]) -> None:
    for key in int_fields:
        if key in row:
            row[key] = to_int(row.get(key))
    for key in float_fields:
        if key in row:
            row[key] = to_float(row.get(key))


# ─────────────────────────────────────────────────────────────────────────────
# Extraction helpers
# ─────────────────────────────────────────────────────────────────────────────

def extract_seasons(payload: dict, source_api: str) -> list[dict]:
    league = payload.get("league", {})
    seasons = payload.get("seasons") or []
    if isinstance(seasons, dict):
        seasons = [seasons]
    rows = []
    for season in seasons:
        competition = season.get("competition") or {}
        season_id = season.get("id")
        league_id = (
            league.get("id")
            or season.get("league_id")
            or season.get("competition_id")
            or competition.get("id")
        )
        league_name = league.get("name") or competition.get("name")
        league_alias = league.get("alias") or competition.get("alias")
        season_year = parse_season_year(season.get("year"))
        season_type = normalize_season_type(season.get("type") or season.get("season_type"))
        if not season_type and source_api == "intl":
            season_type = "REG"
        if not season_id or not league_id or season_year is None or not season_type:
            continue
        is_current = season.get("current") or season.get("is_current")
        if is_current is None and source_api == "intl" and season.get("disabled") is not None:
            is_current = not season.get("disabled")
        rows.append(
            {
                "source_api": source_api,
                "season_id": season_id,
                "league_id": league_id,
                "league_name": league_name,
                "league_alias": league_alias,
                "season_year": season_year,
                "season_type": season_type,
                "season_name": season.get("name"),
                "is_current": bool(is_current) if is_current is not None else False,
                "status": season.get("status") or (season.get("info") or {}).get("competition_status"),
                "start_date": season.get("start_date"),
                "end_date": season.get("end_date"),
            }
        )
    return rows


def extract_teams(payload: dict, source_api: str) -> list[dict]:
    teams: list[dict] = []
    if payload.get("conferences"):
        for conference in payload.get("conferences", []):
            for division in conference.get("divisions", []):
                for team in division.get("teams", []):
                    teams.append(
                        build_team_row(
                            team,
                            source_api,
                            conference=conference,
                            division=division,
                        )
                    )
    else:
        for team in payload.get("teams", []):
            teams.append(build_team_row(team, source_api))

    return [t for t in teams if t]


def build_team_row(
    team: dict,
    source_api: str,
    conference: dict | None = None,
    division: dict | None = None,
) -> dict | None:
    sr_team_id = team.get("id") or team.get("sr_team_id")
    if not sr_team_id:
        return None
    venue = team.get("venue", {})
    return {
        "source_api": source_api,
        "sr_team_id": sr_team_id,
        "name": team.get("name"),
        "alias": team.get("alias") or team.get("abbreviation"),
        "market": team.get("market"),
        "reference": team.get("reference"),
        "venue_id": venue.get("id"),
        "conference_id": conference.get("id") if conference else team.get("conference_id"),
        "conference_name": conference.get("name") if conference else team.get("conference_name"),
        "division_id": division.get("id") if division else team.get("division_id"),
        "division_name": division.get("name") if division else team.get("division_name"),
        "country": team.get("country") or team.get("country_name"),
        "country_code": team.get("country_code"),
        "competition_id": team.get("competition_id"),
        "affiliated_sr_team_id": team.get("affiliated_team_id")
        or team.get("parent_team_id")
        or team.get("affiliated_sr_team_id"),
        "owner": team.get("owner"),
        "founded": to_int(team.get("founded")),
        "championships_won": to_int(team.get("championships_won")),
        "playoff_appearances": to_int(team.get("playoff_appearances")),
        "team_colors_json": team.get("team_colors"),
        "roster_json": team.get("roster"),
        "depth_chart_json": team.get("depth_chart"),
    }


def extract_schedule_games(payload: dict) -> list[dict]:
    return payload.get("games") or payload.get("sport_events") or payload.get("events") or []


def extract_season_context(payload: dict) -> dict:
    if payload.get("season"):
        return payload.get("season")
    if payload.get("league", {}).get("season"):
        return payload.get("league", {}).get("season")
    return {}


def build_game_row_from_schedule(game: dict, source_api: str, season_ctx: dict) -> dict | None:
    game_id = extract_game_id(game)
    if not game_id:
        return None

    home, away = extract_home_away(game)
    venue = game.get("venue", {})
    season_year = parse_season_year(season_ctx.get("year"))
    season_type = normalize_season_type(season_ctx.get("type") or season_ctx.get("season_type"))

    row = {
        "source_api": source_api,
        "game_id": game_id,
        "season_id": season_ctx.get("id") or game.get("season_id"),
        "status": game.get("status"),
        "coverage": game.get("coverage"),
        "scheduled_at": game.get("scheduled") or game.get("start_time"),
        "away_sr_team_id": (away or {}).get("id"),
        "away_team_name": (away or {}).get("name"),
        "away_team_alias": (away or {}).get("alias") or (away or {}).get("abbreviation"),
        "home_sr_team_id": (home or {}).get("id"),
        "home_team_name": (home or {}).get("name"),
        "home_team_alias": (home or {}).get("alias") or (home or {}).get("abbreviation"),
        "home_pts": extract_points(home, None, "home"),
        "away_pts": extract_points(away, None, "away"),
        "series_id": (game.get("series") or {}).get("id"),
        "series_game_number": to_int((game.get("series") or {}).get("game_number")),
        "tournament_id": (game.get("tournament") or {}).get("id"),
        "round_name": (game.get("round") or {}).get("name") or game.get("round_name"),
        "bracket_name": (game.get("bracket") or {}).get("name"),
        "region_name": (game.get("region") or {}).get("name"),
        "home_seed": to_int((home or {}).get("seed")),
        "away_seed": to_int((away or {}).get("seed")),
        "neutral_site": bool(game.get("neutral_site")) if game.get("neutral_site") is not None else None,
        "reference": game.get("reference"),
        "venue_id": venue.get("id"),
        "venue_name": venue.get("name"),
        "venue_capacity": to_int(venue.get("capacity")),
        "venue_address": venue.get("address"),
        "venue_city": venue.get("city") or venue.get("city_name"),
        "venue_state": venue.get("state"),
        "venue_zip": venue.get("zip"),
        "venue_country": venue.get("country") or venue.get("country_name"),
        "venue_lat": venue.get("lat") or venue.get("latitude"),
        "venue_lng": venue.get("lng") or venue.get("longitude"),
        "venue_sr_id": venue.get("sr_id") or venue.get("id"),
        "category_id": game.get("category", {}).get("id"),
        "category_name": game.get("category", {}).get("name"),
        "competition_id": game.get("competition", {}).get("id"),
        "stage_type": (game.get("stage") or {}).get("type"),
        "stage_phase": (game.get("stage") or {}).get("phase"),
        "group_id": (game.get("group") or {}).get("id"),
        "group_name": (game.get("group") or {}).get("name"),
        "cup_round_id": (game.get("round") or {}).get("cup_round_id"),
        "cup_round_number": to_int((game.get("round") or {}).get("cup_round_number")),
        "cup_round_total_games": to_int((game.get("round") or {}).get("cup_round_number_of_sport_events")),
        "title": game.get("title"),
        "season_year": season_year,
        "season_type": season_type,
        "broadcast_json": game.get("broadcasts") or game.get("broadcast"),
        "time_zones_json": game.get("time_zones") or game.get("timezones"),
    }
    return row


def build_game_row_from_summary(summary: dict, source_api: str) -> dict | None:
    game_obj = summary.get("game") or summary.get("sport_event") or summary
    status_obj = summary.get("sport_event_status") or summary
    game_id = extract_game_id(game_obj)
    if not game_id:
        return None

    home, away = extract_home_away(game_obj)
    context = game_obj.get("sport_event_context") or {}
    season = context.get("season") or summary.get("season") or game_obj.get("season") or {}

    coverage = game_obj.get("coverage")
    if isinstance(coverage, dict):
        coverage = coverage.get("type") or coverage.get("name")

    clock_value = None
    status_clock = status_obj.get("clock") if isinstance(status_obj, dict) else None
    if isinstance(status_clock, dict):
        clock_value = status_clock.get("remaining") or status_clock.get("played")
    elif isinstance(status_clock, str):
        clock_value = status_clock
    if not clock_value:
        clock_value = summary.get("clock")

    row = {
        "source_api": source_api,
        "game_id": game_id,
        "season_id": season.get("id") or game_obj.get("season_id"),
        "status": status_obj.get("status") or game_obj.get("status"),
        "coverage": coverage,
        "scheduled_at": game_obj.get("scheduled") or game_obj.get("start_time"),
        "lead_changes": to_int(summary.get("lead_changes")),
        "times_tied": to_int(summary.get("times_tied")),
        "clock": clock_value,
        "quarter": to_int(status_obj.get("quarter") or summary.get("quarter") or status_obj.get("period")),
        "is_track_on_court": summary.get("track_on_court"),
        "entry_mode": summary.get("entry_mode"),
        "duration": summary.get("duration") or game_obj.get("duration"),
        "attendance": to_int(summary.get("attendance") or game_obj.get("attendance")),
        "away_sr_team_id": (away or {}).get("id"),
        "away_team_name": (away or {}).get("name"),
        "away_team_alias": (away or {}).get("alias") or (away or {}).get("abbreviation"),
        "away_pts": extract_points(away, status_obj, "away"),
        "home_sr_team_id": (home or {}).get("id"),
        "home_team_name": (home or {}).get("name"),
        "home_team_alias": (home or {}).get("alias") or (home or {}).get("abbreviation"),
        "home_pts": extract_points(home, status_obj, "home"),
        "series_id": (game_obj.get("series") or {}).get("id"),
        "series_game_number": to_int((game_obj.get("series") or {}).get("game_number")),
        "tournament_id": (game_obj.get("tournament") or {}).get("id"),
        "round_name": (context.get("round") or {}).get("name")
        or (game_obj.get("round") or {}).get("name"),
        "bracket_name": context.get("bracket") or (game_obj.get("bracket") or {}).get("name"),
        "region_name": context.get("region") or (game_obj.get("region") or {}).get("name"),
        "home_seed": to_int((home or {}).get("seed")),
        "away_seed": to_int((away or {}).get("seed")),
        "neutral_site": (summary.get("neutral_site") if "neutral_site" in summary else None),
        "reference": game_obj.get("reference"),
        "venue_id": (game_obj.get("venue") or {}).get("id"),
        "venue_name": (game_obj.get("venue") or {}).get("name"),
        "venue_capacity": to_int((game_obj.get("venue") or {}).get("capacity")),
        "venue_address": (game_obj.get("venue") or {}).get("address"),
        "venue_city": (game_obj.get("venue") or {}).get("city")
        or (game_obj.get("venue") or {}).get("city_name"),
        "venue_state": (game_obj.get("venue") or {}).get("state"),
        "venue_zip": (game_obj.get("venue") or {}).get("zip"),
        "venue_country": (game_obj.get("venue") or {}).get("country")
        or (game_obj.get("venue") or {}).get("country_name"),
        "venue_lat": (game_obj.get("venue") or {}).get("lat")
        or (game_obj.get("venue") or {}).get("latitude"),
        "venue_lng": (game_obj.get("venue") or {}).get("lng")
        or (game_obj.get("venue") or {}).get("longitude"),
        "venue_sr_id": (game_obj.get("venue") or {}).get("sr_id")
        or (game_obj.get("venue") or {}).get("id"),
        "category_id": (context.get("category") or {}).get("id"),
        "category_name": (context.get("category") or {}).get("name"),
        "competition_id": (context.get("competition") or {}).get("id"),
        "stage_type": (context.get("stage") or {}).get("type"),
        "stage_phase": (context.get("stage") or {}).get("phase"),
        "group_id": (context.get("groups") or [{}])[0].get("id")
        if context.get("groups")
        else None,
        "group_name": (context.get("groups") or [{}])[0].get("name")
        if context.get("groups")
        else None,
        "cup_round_id": (context.get("round") or {}).get("cup_round_id"),
        "cup_round_number": to_int((context.get("round") or {}).get("cup_round_number")),
        "cup_round_total_games": to_int(
            (context.get("round") or {}).get("cup_round_number_of_sport_events")
        ),
        "title": summary.get("title") or game_obj.get("title"),
        "season_year": parse_season_year(season.get("year")),
        "season_type": normalize_season_type(season.get("type") or season.get("season_type")),
        "broadcast_json": game_obj.get("broadcasts") or game_obj.get("broadcast"),
        "time_zones_json": game_obj.get("time_zones") or game_obj.get("timezones"),
        "summary_json": summary,
    }
    return row


def extract_period_scores(
    summary: dict,
    source_api: str,
    game_id: str,
    home_team_id: str | None,
    away_team_id: str | None,
) -> list[dict]:
    periods = summary.get("periods") or summary.get("period_scores") or []
    rows = []
    for period in periods:
        number = to_int(period.get("number") or period.get("period"))
        if number is None:
            continue
        period_type = period.get("type") or period.get("period_type")
        if not period_type:
            period_type = "overtime" if number > 4 else "quarter"
        sequence = to_int(period.get("sequence"))
        scoring = period.get("scoring") or {}
        home_pts = to_int(
            period.get("home_points") or period.get("home_score") or scoring.get("home")
        )
        away_pts = to_int(
            period.get("away_points") or period.get("away_score") or scoring.get("away")
        )
        if home_team_id:
            rows.append(
                {
                    "source_api": source_api,
                    "game_id": game_id,
                    "sr_team_id": home_team_id,
                    "period_number": number,
                    "period_type": period_type,
                    "sequence": sequence,
                    "pts": home_pts,
                }
            )
        if away_team_id:
            rows.append(
                {
                    "source_api": source_api,
                    "game_id": game_id,
                    "sr_team_id": away_team_id,
                    "period_number": number,
                    "period_type": period_type,
                    "sequence": sequence,
                    "pts": away_pts,
                }
            )
    return rows


def extract_team_stats(
    summary: dict,
    source_api: str,
    game_id: str,
    home_team: dict | None,
    away_team: dict | None,
) -> list[dict]:
    rows: list[dict] = []
    for team, is_home in ((home_team, True), (away_team, False)):
        if not team:
            continue
        sr_team_id = team.get("id")
        stats = team.get("statistics") or {}
        opponent_id = None
        if is_home:
            opponent_id = away_team.get("id") if away_team else None
        else:
            opponent_id = home_team.get("id") if home_team else None
        row = {
            "source_api": source_api,
            "game_id": game_id,
            "sr_team_id": sr_team_id,
            "opposite_sr_team_id": opponent_id,
            "is_home": is_home,
            "pts": extract_points(team, None, "home" if is_home else "away"),
            "minutes": stats.get("minutes"),
        }
        row.update(apply_stat_map(stats, TEAM_STAT_MAP))
        compute_shooting_fields(row)
        normalize_numeric(row, TEAM_INT_FIELDS, TEAM_FLOAT_FIELDS)
        rows.append(row)
    return rows


def extract_player_stats(
    summary: dict,
    source_api: str,
    game_id: str,
    team: dict | None,
) -> list[dict]:
    rows: list[dict] = []
    if not team:
        return rows
    sr_team_id = team.get("id")
    for player in team.get("players", []):
        sr_id = player.get("id")
        if not sr_id:
            continue
        stats = player.get("statistics") or {}
        minutes = stats.get("minutes") or player.get("minutes")
        is_starter = player.get("starter") if "starter" in player else player.get("starting")
        row = {
            "source_api": source_api,
            "game_id": game_id,
            "sr_id": sr_id,
            "sr_team_id": sr_team_id,
            "is_played": player.get("played") if "played" in player else None,
            "is_starter": is_starter,
            "minutes": minutes,
            "seconds_played": minutes_to_seconds(minutes),
        }
        row.update(apply_stat_map(stats, PLAYER_STAT_MAP))
        if row.get("is_played") is None:
            row["is_played"] = bool(minutes and minutes != "00:00")
        compute_shooting_fields(row)
        normalize_numeric(row, PLAYER_INT_FIELDS, PLAYER_FLOAT_FIELDS)
        rows.append(row)
    return rows


def extract_players(summary: dict, source_api: str) -> list[dict]:
    players: dict[str, dict] = {}
    for side in ("home", "away"):
        team = summary.get(side)
        if not team:
            continue
        team_id = team.get("id")
        for player in team.get("players", []):
            sr_id = player.get("id")
            if not sr_id:
                continue
            full_name = player.get("full_name") or player.get("name")
            first_name = player.get("first_name")
            last_name = player.get("last_name")
            if full_name and (not first_name or not last_name):
                if "," in full_name:
                    last, first = [p.strip() for p in full_name.split(",", 1)]
                    first_name = first_name or first
                    last_name = last_name or last
                else:
                    parts = full_name.split(" ", 1)
                    if len(parts) == 2:
                        first_name = first_name or parts[0]
                        last_name = last_name or parts[1]
            row = {
                "source_api": source_api,
                "sr_id": sr_id,
                "reference": player.get("reference"),
                "full_name": full_name,
                "first_name": first_name,
                "last_name": last_name,
                "abbr_name": player.get("abbr_name"),
                "status": player.get("status"),
                "position": player.get("position"),
                "primary_position": player.get("primary_position"),
                "jersey_number": player.get("jersey_number"),
                "experience": player.get("experience"),
                "birthdate": player.get("birthdate"),
                "birth_place": player.get("birth_place"),
                "high_school": player.get("high_school"),
                "college": player.get("college"),
                "rookie_year": to_int(player.get("rookie_year")),
                "height": to_int(player.get("height")),
                "weight": to_int(player.get("weight")),
                "sr_team_id": team_id,
                "draft_year": to_int(player.get("draft_year")),
                "draft_round": to_int(player.get("draft_round")),
                "draft_pick": to_int(player.get("draft_pick")),
                "sr_draft_team_id": player.get("draft_team_id") or player.get("draft_team"),
                "is_free_agent": player.get("free_agent") or False,
                "updated_at": player.get("updated_at"),
                "references_json": player.get("references"),
                "seasons_json": player.get("seasons"),
            }
            if sr_id not in players:
                players[sr_id] = row
            else:
                for key, value in row.items():
                    if players[sr_id].get(key) in (None, "") and value not in (None, ""):
                        players[sr_id][key] = value
    return list(players.values())


def build_standings_row(
    team: dict,
    source_api: str,
    season_id: str,
    conference: dict | None = None,
    division: dict | None = None,
) -> dict | None:
    sr_team_id = team.get("id")
    if not sr_team_id:
        return None

    records = normalize_records(team.get("records"))
    home_wins, home_losses = extract_record(records, {"home"})
    road_wins, road_losses = extract_record(records, {"road", "away"})
    last_10_wins, last_10_losses = extract_record(records, {"last_10", "last10", "last_ten"})

    if home_wins is None:
        home_wins = to_int(team.get("home_wins"))
        home_losses = to_int(team.get("home_losses"))
    if road_wins is None:
        road_wins = to_int(team.get("road_wins") or team.get("away_wins"))
        road_losses = to_int(team.get("road_losses") or team.get("away_losses"))
    if last_10_wins is None:
        last_10_wins = to_int(team.get("last_10_wins"))
        last_10_losses = to_int(team.get("last_10_losses"))

    games_behind = team.get("games_behind")
    conference_games_behind = None
    if isinstance(games_behind, dict):
        conference_games_behind = to_float(games_behind.get("conference") or games_behind.get("conf"))
        games_behind = to_float(
            games_behind.get("league")
            or games_behind.get("overall")
            or games_behind.get("conference")
        )
    else:
        games_behind = to_float(games_behind)

    wins = to_int(team.get("wins"))
    losses = to_int(team.get("losses"))
    if wins is None:
        wins = 0
    if losses is None:
        losses = 0

    row = {
        "source_api": source_api,
        "season_id": season_id,
        "sr_team_id": sr_team_id,
        "conference_id": (conference or {}).get("id"),
        "conference_name": (conference or {}).get("name"),
        "conference_rank": to_int(team.get("conference_rank") or team.get("conf_rank")),
        "conference_wins": to_int(team.get("conference_wins") or team.get("conf_wins")),
        "conference_losses": to_int(team.get("conference_losses") or team.get("conf_losses")),
        "division_id": (division or {}).get("id"),
        "division_name": (division or {}).get("name"),
        "division_rank": to_int(team.get("division_rank") or team.get("subdivision_rank") or team.get("div_rank")),
        "division_wins": to_int(team.get("division_wins") or team.get("div_wins")),
        "division_losses": to_int(team.get("division_losses") or team.get("div_losses")),
        "wins": wins,
        "losses": losses,
        "win_pct": to_float(team.get("win_pct") or team.get("win_percentage")),
        "games_behind": games_behind,
        "conference_games_behind": conference_games_behind,
        "clinching_status": team.get("clinched") or team.get("clinching_status"),
        "streak": parse_streak(team.get("streak")),
        "home_wins": home_wins,
        "home_losses": home_losses,
        "road_wins": road_wins,
        "road_losses": road_losses,
        "last_10_wins": last_10_wins,
        "last_10_losses": last_10_losses,
        "pts_for": to_float(team.get("points_for") or team.get("pts_for")),
        "pts_against": to_float(team.get("points_against") or team.get("pts_against")),
        "pts_diff": to_float(team.get("point_diff") or team.get("points_diff")),
        "records_json": records or None,
    }
    return row


def extract_standings(payload: dict, source_api: str) -> list[dict]:
    season = payload.get("season") or {}
    season_id = season.get("id") or payload.get("season_id")
    if not season_id:
        return []

    conferences = payload.get("conferences") or payload.get("conference") or []
    if isinstance(conferences, dict):
        conferences = [conferences]

    rows: list[dict] = []
    for conference in conferences:
        divisions = conference.get("divisions") or []
        if divisions:
            for division in divisions:
                for team in normalize_records(division.get("teams")):
                    row = build_standings_row(team, source_api, season_id, conference, division)
                    if row:
                        rows.append(row)
        else:
            for team in normalize_records(conference.get("teams")):
                row = build_standings_row(team, source_api, season_id, conference, None)
                if row:
                    rows.append(row)

    teams = normalize_records(payload.get("teams"))
    if teams and not rows:
        for team in teams:
            row = build_standings_row(team, source_api, season_id, None, None)
            if row:
                rows.append(row)

    return rows


def extract_injuries(payload: dict, source_api: str) -> list[dict]:
    rows: list[dict] = []

    teams = normalize_records(payload.get("teams"))
    for team in teams:
        team_id = team.get("id")
        players = normalize_records(team.get("players"))
        for player in players:
            player_id = player.get("id") or player.get("sr_id")
            for injury in normalize_records(player.get("injuries")):
                injury_id = injury.get("id") or injury.get("injury_id")
                if not injury_id or not player_id:
                    continue
                rows.append(
                    {
                        "source_api": source_api,
                        "injury_id": injury_id,
                        "sr_id": player_id,
                        "sr_team_id": team_id,
                        "status": injury.get("status"),
                        "description": injury.get("desc") or injury.get("description") or injury.get("type"),
                        "comment": injury.get("comment") or injury.get("details") or injury.get("note"),
                        "start_date": injury.get("start_date"),
                        "update_date": injury.get("update_date") or injury.get("updated") or injury.get("updated_at"),
                        "is_active": injury.get("active") if "active" in injury else True,
                    }
                )

    if not rows and payload.get("injuries"):
        for injury in normalize_records(payload.get("injuries")):
            injury_id = injury.get("id") or injury.get("injury_id")
            player = injury.get("player") or {}
            team = injury.get("team") or {}
            player_id = injury.get("sr_id") or injury.get("player_id") or player.get("id")
            team_id = injury.get("sr_team_id") or injury.get("team_id") or team.get("id")
            if not injury_id or not player_id:
                continue
            rows.append(
                {
                    "source_api": source_api,
                    "injury_id": injury_id,
                    "sr_id": player_id,
                    "sr_team_id": team_id,
                    "status": injury.get("status"),
                    "description": injury.get("desc") or injury.get("description") or injury.get("type"),
                    "comment": injury.get("comment") or injury.get("details") or injury.get("note"),
                    "start_date": injury.get("start_date"),
                    "update_date": injury.get("update_date") or injury.get("updated") or injury.get("updated_at"),
                    "is_active": injury.get("active") if "active" in injury else True,
                }
            )

    return rows


def extract_rankings(
    payload: dict,
    source_api: str,
    ranking_type: str,
    ranking_name: str,
    season_lookup: dict[tuple[int, str], str],
) -> list[dict]:
    if not payload:
        return []

    season = payload.get("season") or {}
    season_year = parse_season_year(season.get("year") or payload.get("year"))
    season_type = normalize_season_type(season.get("type") or payload.get("season_type"))
    season_id = season.get("id")
    if not season_id:
        season_id, inferred_type = lookup_season_id(season_lookup, season_year, season_type)
        if season_type is None:
            season_type = inferred_type

    if not season_id:
        return []

    week = payload.get("week") or payload.get("week_id") or payload.get("poll_week") or "CUR"

    rankings = normalize_records(payload.get("rankings"))
    candidates = normalize_records(payload.get("candidates"))
    rows: list[dict] = []

    for entry in list(rankings) + list(candidates):
        sr_team_id = entry.get("id") or entry.get("sr_team_id")
        if not sr_team_id:
            continue

        rank_value = entry.get("rank") or entry.get("net_rank") or entry.get("rpi_rank")
        prev_rank = entry.get("prev_rank") or entry.get("prev_net_rank") or entry.get("prev_rpi_rank")
        points = entry.get("points") or entry.get("votes")
        first_place_votes = entry.get("fp_votes") or entry.get("first_place_votes")
        rating = None
        if ranking_type == "rpi":
            rating = entry.get("rpi") or entry.get("rating")
        elif ranking_type == "net":
            rating = entry.get("net_rank") or entry.get("rating")

        strength_of_schedule = (
            entry.get("sos")
            or entry.get("net_sos")
            or entry.get("strength_of_schedule")
            or entry.get("strength_of_schedule_rank")
        )

        rows.append(
            {
                "source_api": source_api,
                "season_id": season_id,
                "season_year": season_year,
                "season_type": season_type,
                "type": ranking_type,
                "name": ranking_name,
                "week": week,
                "sr_team_id": sr_team_id,
                "rank": to_int(rank_value),
                "prev_rank": to_int(prev_rank),
                "pts": to_int(points),
                "first_place_votes": to_int(first_place_votes),
                "rating": to_float(rating),
                "strength_of_schedule": to_float(strength_of_schedule),
            }
        )

    return rows


def extract_stat_value(stats: dict | None, *keys: str) -> Any:
    if not isinstance(stats, dict):
        return None
    for key in keys:
        value = stats.get(key)
        if value not in (None, ""):
            return value
    return None


def resolve_season_from_payload(
    payload: dict,
    season_lookup: dict[tuple[int, str], str],
    fallback_year: int | None = None,
    fallback_type: str | None = None,
) -> tuple[str | None, int | None, str | None]:
    season = (
        payload.get("season")
        or payload.get("league", {}).get("season")
        or payload.get("competition", {}).get("season")
        or {}
    )
    season_year = parse_season_year(season.get("year") or payload.get("year") or fallback_year)
    season_type = normalize_season_type(season.get("type") or payload.get("season_type") or fallback_type)
    season_id = season.get("id") or payload.get("season_id")
    if not season_id:
        season_id, inferred_type = lookup_season_id(season_lookup, season_year, season_type)
        if season_type is None:
            season_type = inferred_type
    return season_id, season_year, season_type


def build_team_statistics_row(
    stats: dict,
    source_api: str,
    season_id: str,
    sr_team_id: str,
    series_id: str | None = None,
    tournament_id: str | None = None,
    is_opponent: bool = False,
) -> dict | None:
    if not isinstance(stats, dict) or not stats:
        return None

    row = {
        "source_api": source_api,
        "season_id": season_id,
        "sr_team_id": sr_team_id,
        "series_id": series_id,
        "tournament_id": tournament_id,
        "is_opponent": is_opponent,
        "games_played": to_int(extract_stat_value(stats, "games_played", "games", "gp")),
        "minutes": extract_stat_value(stats, "minutes", "min", "minutes_played"),
        "pts_avg": to_float(
            extract_stat_value(stats, "points_avg", "points_per_game", "points_per_game_avg", "ppg")
        ),
        "efficiency": to_float(extract_stat_value(stats, "efficiency", "efficiency_rating")),
        "ts_att": to_float(
            extract_stat_value(stats, "true_shooting_att", "true_shooting_attempts", "ts_att")
        ),
        "ts_pct": to_float(
            extract_stat_value(stats, "true_shooting_pct", "true_shooting_percentage", "ts_pct")
        ),
        "efg_pct": to_float(
            extract_stat_value(
                stats,
                "effective_fg_pct",
                "effective_field_goal_pct",
                "effective_field_goal_percentage",
                "efg_pct",
            )
        ),
        "statistics_json": stats,
    }
    mapped = apply_stat_map(stats, TEAM_STAT_MAP)
    for key in SEASON_TEAM_STAT_FIELDS:
        if key in mapped:
            row[key] = mapped[key]
    compute_shooting_fields(row)
    normalize_numeric(row, SEASON_TEAM_INT_FIELDS, SEASON_TEAM_FLOAT_FIELDS)
    return row


def build_player_statistics_row(
    player: dict,
    source_api: str,
    season_id: str,
    sr_team_id: str,
    series_id: str | None = None,
    tournament_id: str | None = None,
) -> dict | None:
    sr_id = player.get("id") or player.get("sr_id")
    if not sr_id:
        return None

    stats = (
        player.get("statistics")
        or player.get("total")
        or player.get("totals")
        or player.get("stats")
        or {}
    )
    averages = player.get("average") or player.get("avg") or player.get("averages") or {}
    if not isinstance(stats, dict):
        stats = {}
    if not isinstance(averages, dict):
        averages = {}

    row = {
        "source_api": source_api,
        "season_id": season_id,
        "sr_team_id": sr_team_id,
        "sr_id": sr_id,
        "series_id": series_id,
        "tournament_id": tournament_id,
        "games_played": to_int(
            extract_stat_value(stats, "games_played", "games", "gp") or player.get("games_played")
        ),
        "games_started": to_int(
            extract_stat_value(stats, "games_started", "games_start", "gs")
            or player.get("games_started")
        ),
        "minutes": extract_stat_value(stats, "minutes", "min", "minutes_played"),
        "minutes_avg": to_float(
            extract_stat_value(averages, "minutes", "minutes_avg", "min")
            or extract_stat_value(stats, "minutes_avg")
        ),
        "reb_avg": to_float(
            extract_stat_value(averages, "rebounds", "reb_avg", "rebounds_avg")
            or extract_stat_value(stats, "rebounds_avg")
        ),
        "ast_avg": to_float(
            extract_stat_value(averages, "assists", "ast_avg", "assists_avg")
            or extract_stat_value(stats, "assists_avg")
        ),
        "stl_avg": to_float(
            extract_stat_value(averages, "steals", "stl_avg", "steals_avg")
            or extract_stat_value(stats, "steals_avg")
        ),
        "blk_avg": to_float(
            extract_stat_value(averages, "blocks", "blk_avg", "blocks_avg")
            or extract_stat_value(stats, "blocks_avg")
        ),
        "tov_avg": to_float(
            extract_stat_value(averages, "turnovers", "tov_avg", "turnovers_avg")
            or extract_stat_value(stats, "turnovers_avg")
        ),
        "pts_avg": to_float(
            extract_stat_value(averages, "points", "pts", "points_avg", "ppg")
            or extract_stat_value(stats, "points_avg", "points_per_game")
        ),
        "double_doubles": to_int(extract_stat_value(stats, "double_doubles", "double_double")),
        "triple_doubles": to_int(extract_stat_value(stats, "triple_doubles", "triple_double")),
        "statistics_json": stats,
    }
    mapped = apply_stat_map(stats, PLAYER_STAT_MAP)
    for key in SEASON_PLAYER_STAT_FIELDS:
        if key in mapped:
            row[key] = mapped[key]
    compute_shooting_fields(row)
    normalize_numeric(row, SEASON_PLAYER_INT_FIELDS, SEASON_PLAYER_FLOAT_FIELDS)
    return row


def extract_team_statistics_payload(
    payload: dict,
    source_api: str,
    season_lookup: dict[tuple[int, str], str],
    series_id: str | None = None,
    tournament_id: str | None = None,
) -> tuple[list[dict], list[dict]]:
    if not payload:
        return [], []

    team_obj = payload.get("team") or payload.get("competitor") or payload.get("club") or payload
    sr_team_id = team_obj.get("id") or payload.get("team_id") or payload.get("id")
    season_id, _, _ = resolve_season_from_payload(payload, season_lookup)
    if not season_id or not sr_team_id:
        return [], []

    stats = (
        payload.get("statistics")
        or team_obj.get("statistics")
        or payload.get("total")
        or payload.get("totals")
        or {}
    )
    if not isinstance(stats, dict):
        stats = {}

    team_rows: list[dict] = []
    row = build_team_statistics_row(
        stats,
        source_api,
        season_id,
        sr_team_id,
        series_id=series_id,
        tournament_id=tournament_id,
        is_opponent=False,
    )
    if row:
        team_rows.append(row)

    opponent_stats = None
    opponents = payload.get("opponents") or payload.get("opponent") or payload.get("opponent_stats")
    if isinstance(opponents, dict):
        opponent_stats = (
            opponents.get("statistics")
            or opponents.get("stats")
            or opponents.get("total")
            or opponents.get("totals")
            or opponents
        )
    elif isinstance(opponents, list) and opponents:
        candidate = opponents[0]
        if isinstance(candidate, dict):
            opponent_stats = (
                candidate.get("statistics")
                or candidate.get("stats")
                or candidate.get("total")
                or candidate.get("totals")
                or candidate
            )

    if opponent_stats:
        opponent_row = build_team_statistics_row(
            opponent_stats,
            source_api,
            season_id,
            sr_team_id,
            series_id=series_id,
            tournament_id=tournament_id,
            is_opponent=True,
        )
        if opponent_row:
            team_rows.append(opponent_row)

    players = payload.get("players") or team_obj.get("players") or []
    player_rows: list[dict] = []
    for player in players:
        player_row = build_player_statistics_row(
            player,
            source_api,
            season_id,
            sr_team_id,
            series_id=series_id,
            tournament_id=tournament_id,
        )
        if player_row:
            player_rows.append(player_row)

    return team_rows, player_rows


def normalize_splits(value: Any) -> list[dict]:
    if not value:
        return []
    if isinstance(value, dict):
        if "splits" in value:
            return normalize_splits(value.get("splits"))
        if "values" in value:
            return normalize_splits(value.get("values"))
        return [value]
    if isinstance(value, list):
        return value
    return []


def resolve_split_type_value(split: dict, default_type: str | None) -> tuple[str | None, str | None]:
    split_type = split.get("type") or split.get("split_type") or split.get("category") or default_type
    split_value = (
        split.get("value")
        or split.get("split_value")
        or split.get("name")
        or split.get("label")
        or split.get("id")
    )
    if split_value is None and split_type and split_type != default_type:
        split_value = split_type
        split_type = default_type or "split"
    return split_type, split_value


def build_team_split_row(
    stats: dict,
    source_api: str,
    season_id: str,
    sr_team_id: str,
    split_type: str,
    split_value: str,
    is_opponent: bool,
    wins: int | None,
    losses: int | None,
    win_pct: float | None,
) -> dict | None:
    if not isinstance(stats, dict) or not stats:
        return None

    mapped = apply_stat_map(stats, TEAM_STAT_MAP)
    games_played = to_int(extract_stat_value(stats, "games_played", "games", "gp"))
    if games_played is None and wins is not None and losses is not None:
        games_played = wins + losses

    row = {
        "source_api": source_api,
        "season_id": season_id,
        "sr_team_id": sr_team_id,
        "split_type": split_type,
        "split_value": split_value,
        "is_opponent": is_opponent,
        "games_played": games_played,
        "wins": wins,
        "losses": losses,
        "win_pct": win_pct,
        "pts": to_int(mapped.get("pts")),
        "pts_avg": to_float(extract_stat_value(stats, "points_avg", "points_per_game", "ppg")),
        "reb_avg": to_float(extract_stat_value(stats, "rebounds_avg", "reb_avg")),
        "ast_avg": to_float(extract_stat_value(stats, "assists_avg", "ast_avg")),
        "tov_avg": to_float(extract_stat_value(stats, "turnovers_avg", "tov_avg")),
        "statistics_json": stats,
    }
    for key in TEAM_SPLIT_STAT_FIELDS:
        if key in mapped:
            row[key] = mapped[key]

    compute_shooting_fields(row)
    normalize_numeric(row, SEASON_TEAM_INT_FIELDS, SEASON_TEAM_FLOAT_FIELDS)
    return row


def build_player_split_row(
    player: dict,
    source_api: str,
    season_id: str,
    sr_team_id: str,
    split_type: str,
    split_value: str,
) -> dict | None:
    sr_id = player.get("id") or player.get("sr_id")
    if not sr_id:
        return None

    stats = (
        player.get("statistics")
        or player.get("total")
        or player.get("totals")
        or player.get("stats")
        or {}
    )
    averages = player.get("average") or player.get("avg") or player.get("averages") or {}
    if not isinstance(stats, dict):
        stats = {}
    if not isinstance(averages, dict):
        averages = {}

    mapped = apply_stat_map(stats, PLAYER_STAT_MAP)
    row = {
        "source_api": source_api,
        "season_id": season_id,
        "sr_team_id": sr_team_id,
        "sr_id": sr_id,
        "split_type": split_type,
        "split_value": split_value,
        "games_played": to_int(extract_stat_value(stats, "games_played", "games", "gp")),
        "games_started": to_int(extract_stat_value(stats, "games_started", "games_start", "gs")),
        "minutes_avg": to_float(
            extract_stat_value(averages, "minutes", "minutes_avg", "min")
            or extract_stat_value(stats, "minutes_avg")
        ),
        "pts_avg": to_float(
            extract_stat_value(averages, "points", "pts", "points_avg", "ppg")
            or extract_stat_value(stats, "points_avg", "points_per_game")
        ),
        "reb_avg": to_float(
            extract_stat_value(averages, "rebounds", "reb_avg")
            or extract_stat_value(stats, "reb_avg", "rebounds_avg")
        ),
        "ast_avg": to_float(
            extract_stat_value(averages, "assists", "ast_avg")
            or extract_stat_value(stats, "ast_avg", "assists_avg")
        ),
        "statistics_json": stats,
    }
    for key in PLAYER_SPLIT_STAT_FIELDS:
        if key in mapped:
            row[key] = mapped[key]

    compute_shooting_fields(row)
    normalize_numeric(row, SEASON_PLAYER_INT_FIELDS, SEASON_PLAYER_FLOAT_FIELDS)
    return row


def extract_splits(
    payload: dict,
    source_api: str,
    season_lookup: dict[tuple[int, str], str],
    split_kind: str | None = None,
) -> tuple[list[dict], list[dict]]:
    if not payload:
        return [], []

    team_obj = payload.get("team") or payload.get("competitor") or payload
    sr_team_id = team_obj.get("id") or payload.get("team_id") or payload.get("id")
    season_id, _, _ = resolve_season_from_payload(payload, season_lookup)
    if not season_id or not sr_team_id:
        return [], []

    splits = normalize_splits(payload.get("splits") or payload.get("split") or payload.get("categories"))
    team_rows: list[dict] = []
    player_rows: list[dict] = []

    for split in splits:
        split_type, split_value = resolve_split_type_value(split, split_kind)
        if not split_type or split_value is None:
            continue

        stats = split.get("statistics") or split.get("team") or split.get("total") or split.get("stats") or {}
        if not isinstance(stats, dict):
            stats = {}

        wins = to_int(split.get("wins") or (split.get("record") or {}).get("wins") or extract_stat_value(stats, "wins"))
        losses = to_int(
            split.get("losses")
            or (split.get("record") or {}).get("losses")
            or extract_stat_value(stats, "losses")
        )
        win_pct = to_float(
            split.get("win_pct")
            or split.get("win_percentage")
            or extract_stat_value(stats, "win_pct", "win_percentage")
        )
        if win_pct is None and wins is not None and losses is not None and (wins + losses) > 0:
            win_pct = round(wins / (wins + losses), 3)

        team_row = build_team_split_row(
            stats,
            source_api,
            season_id,
            sr_team_id,
            split_type,
            split_value,
            False,
            wins,
            losses,
            win_pct,
        )
        if team_row:
            team_rows.append(team_row)

        opponent_stats = None
        opponents = split.get("opponents") or split.get("opponent") or split.get("opponent_stats")
        if isinstance(opponents, dict):
            opponent_stats = (
                opponents.get("statistics")
                or opponents.get("stats")
                or opponents.get("total")
                or opponents.get("totals")
                or opponents
            )
        elif isinstance(opponents, list) and opponents:
            candidate = opponents[0]
            if isinstance(candidate, dict):
                opponent_stats = (
                    candidate.get("statistics")
                    or candidate.get("stats")
                    or candidate.get("total")
                    or candidate.get("totals")
                    or candidate
                )

        if opponent_stats:
            opponent_row = build_team_split_row(
                opponent_stats,
                source_api,
                season_id,
                sr_team_id,
                split_type,
                split_value,
                True,
                None,
                None,
                None,
            )
            if opponent_row:
                team_rows.append(opponent_row)

        players = split.get("players") or split.get("player_splits") or split.get("player_stats") or []
        for player in players:
            player_row = build_player_split_row(
                player,
                source_api,
                season_id,
                sr_team_id,
                split_type,
                split_value,
            )
            if player_row:
                player_rows.append(player_row)

    return team_rows, player_rows


def iter_series_entries(payload: dict) -> list[tuple[dict, dict | None]]:
    entries: list[tuple[dict, dict | None]] = []
    for series in normalize_records(payload.get("series")):
        entries.append((series, None))

    rounds = normalize_records(payload.get("rounds") or payload.get("brackets"))
    for round_entry in rounds:
        for series in normalize_records(round_entry.get("series") or round_entry.get("matchups")):
            entries.append((series, round_entry))
    return entries


def extract_series(
    payload: dict,
    source_api: str,
    season_lookup: dict[tuple[int, str], str],
) -> tuple[list[dict], dict[str, list[str]]]:
    if not payload:
        return [], {}

    season_id, _, _ = resolve_season_from_payload(payload, season_lookup)
    if not season_id:
        return [], {}

    rows: list[dict] = []
    series_team_map: dict[str, list[str]] = {}

    for series, round_ctx in iter_series_entries(payload):
        series_id = series.get("id") or series.get("series_id")
        if not series_id:
            continue

        participants = normalize_records(
            series.get("participants")
            or series.get("teams")
            or series.get("competitors")
            or series.get("contenders")
        )
        team1 = participants[0] if len(participants) > 0 else {}
        team2 = participants[1] if len(participants) > 1 else {}

        team_ids = [tid for tid in [team1.get("id"), team2.get("id")] if tid]
        if team_ids:
            series_team_map[series_id] = team_ids

        winner = series.get("winner") or {}
        winner_id = series.get("winner_id") or winner.get("id")
        if not winner_id:
            for team in participants:
                if team.get("winner") or team.get("is_winner"):
                    winner_id = team.get("id")
                    break

        bracket = series.get("bracket") or (round_ctx or {}).get("bracket")
        if isinstance(bracket, dict):
            bracket = bracket.get("name")

        round_name = series.get("round") or (round_ctx or {}).get("name") or (round_ctx or {}).get("round")
        round_number = to_int(series.get("round_number") or (round_ctx or {}).get("number"))

        team1_wins = to_int(team1.get("wins") or (team1.get("record") or {}).get("wins"))
        team2_wins = to_int(team2.get("wins") or (team2.get("record") or {}).get("wins"))

        rows.append(
            {
                "source_api": source_api,
                "series_id": series_id,
                "season_id": season_id,
                "title": series.get("title") or series.get("name"),
                "round": round_name,
                "round_number": round_number,
                "status": series.get("status") or series.get("state"),
                "start_date": series.get("start_date") or series.get("start"),
                "end_date": series.get("end_date") or series.get("end"),
                "best_of": to_int(series.get("best_of") or series.get("best_of_games")),
                "team1_sr_team_id": team1.get("id"),
                "team1_seed": to_int(team1.get("seed")),
                "team1_wins": team1_wins,
                "team2_sr_team_id": team2.get("id"),
                "team2_seed": to_int(team2.get("seed")),
                "team2_wins": team2_wins,
                "winner_sr_team_id": winner_id,
                "conference": series.get("conference") or (round_ctx or {}).get("conference"),
                "bracket": bracket,
            }
        )

    return rows, series_team_map


def extract_tournaments(
    payload: dict,
    source_api: str,
    season_lookup: dict[tuple[int, str], str],
) -> list[dict]:
    if not payload:
        return []

    season_id, _, _ = resolve_season_from_payload(payload, season_lookup)
    tournaments = normalize_records(payload.get("tournaments") or payload.get("tournament"))
    rows: list[dict] = []

    for tournament in tournaments:
        tournament_id = tournament.get("id") or tournament.get("tournament_id")
        if not tournament_id or not season_id:
            continue
        rows.append(
            {
                "source_api": source_api,
                "tournament_id": tournament_id,
                "season_id": season_id,
                "name": tournament.get("name"),
                "alias": tournament.get("alias"),
                "type": tournament.get("type") or tournament.get("category"),
                "gender": tournament.get("gender"),
                "division": tournament.get("division"),
                "status": tournament.get("status"),
                "location": tournament.get("location") or tournament.get("venue"),
                "start_date": tournament.get("start_date"),
                "end_date": tournament.get("end_date"),
                "bracket_size": to_int(
                    tournament.get("bracket_size")
                    or tournament.get("team_count")
                    or tournament.get("size")
                ),
            }
        )

    return rows


def extract_tournament_summary(
    payload: dict,
    source_api: str,
    season_lookup: dict[tuple[int, str], str],
) -> tuple[dict | None, list[dict]]:
    if not payload:
        return None, []

    tournament = payload.get("tournament") or payload.get("tournament_summary") or payload
    tournament_id = tournament.get("id") or tournament.get("tournament_id") or payload.get("tournament_id")
    season_id, _, _ = resolve_season_from_payload(payload, season_lookup)

    tournament_row = None
    if tournament_id and season_id:
        tournament_row = {
            "source_api": source_api,
            "tournament_id": tournament_id,
            "season_id": season_id,
            "name": tournament.get("name"),
            "alias": tournament.get("alias"),
            "type": tournament.get("type") or tournament.get("category"),
            "gender": tournament.get("gender"),
            "division": tournament.get("division"),
            "status": tournament.get("status"),
            "location": tournament.get("location") or tournament.get("venue"),
            "start_date": tournament.get("start_date"),
            "end_date": tournament.get("end_date"),
            "bracket_size": to_int(
                tournament.get("bracket_size")
                or tournament.get("team_count")
                or tournament.get("size")
            ),
        }

    teams = normalize_records(
        tournament.get("teams")
        or payload.get("teams")
        or payload.get("participants")
        or tournament.get("participants")
    )
    team_rows: list[dict] = []
    for team in teams:
        sr_team_id = team.get("id") or team.get("sr_team_id")
        if not sr_team_id or not tournament_id:
            continue
        team_rows.append(
            {
                "source_api": source_api,
                "tournament_id": tournament_id,
                "sr_team_id": sr_team_id,
                "seed": to_int(team.get("seed")),
                "region": team.get("region") or team.get("group"),
                "eliminated": team.get("eliminated") or False,
                "eliminated_round": team.get("eliminated_round") or team.get("round"),
                "final_rank": to_int(team.get("final_rank") or team.get("rank")),
            }
        )

    return tournament_row, team_rows


def extract_leaders(
    payload: dict,
    source_api: str,
    season_lookup: dict[tuple[int, str], str],
) -> list[dict]:
    if not payload:
        return []

    season_id, season_year, season_type = resolve_season_from_payload(payload, season_lookup)
    if not season_id:
        return []

    categories = normalize_records(payload.get("categories") or payload.get("leaders") or payload.get("statistics"))
    rows: list[dict] = []

    for category in categories:
        category_name = category.get("name") or category.get("type") or category.get("category")
        if not category_name:
            continue
        leaders = normalize_records(
            category.get("leaders")
            or category.get("players")
            or category.get("athletes")
            or category.get("rankings")
        )
        for index, leader in enumerate(leaders, start=1):
            player = leader.get("player") or leader.get("athlete") or leader
            sr_id = player.get("id") or player.get("sr_id")
            if not sr_id:
                continue
            team = player.get("team") or leader.get("team") or {}
            rank = to_int(leader.get("rank") or leader.get("place")) or index
            value = leader.get("value") or leader.get("stat") or leader.get("points") or leader.get("average")
            leader_id = f"{season_id}:{category_name}:{rank}:{sr_id}"
            rows.append(
                {
                    "source_api": source_api,
                    "leader_id": leader_id,
                    "season_id": season_id,
                    "season_year": season_year,
                    "season_type": season_type,
                    "category": category_name,
                    "rank": rank,
                    "sr_id": sr_id,
                    "sr_team_id": team.get("id") or leader.get("team_id"),
                    "player_name": player.get("full_name") or player.get("name"),
                    "team_alias": team.get("alias") or team.get("abbreviation"),
                    "value": to_float(value),
                    "games_played": to_int(leader.get("games_played") or leader.get("games")),
                    "is_tied": leader.get("tied") or leader.get("is_tied") or False,
                }
            )

    return rows


def extract_draft(payloads: dict[str, dict], source_api: str, draft_year: int | None) -> list[dict]:
    if not draft_year:
        return []

    draft_payload = payloads.get("draft") or {}
    prospects_payload = payloads.get("prospects") or {}
    top_payload = payloads.get("top_prospects") or {}
    trades_payload = payloads.get("trades") or {}

    def normalize_name_fields(record: dict) -> dict:
        full_name = record.get("full_name") or record.get("name")
        first_name = record.get("first_name")
        last_name = record.get("last_name")
        if full_name and (not first_name or not last_name):
            if "," in full_name:
                last, first = [p.strip() for p in full_name.split(",", 1)]
                first_name = first_name or first
                last_name = last_name or last
            else:
                parts = full_name.split(" ", 1)
                if len(parts) == 2:
                    first_name = first_name or parts[0]
                    last_name = last_name or parts[1]
        return {
            "first_name": first_name,
            "last_name": last_name,
            "full_name": full_name,
        }

    def extract_prospect_details(prospect: dict) -> dict:
        name_fields = normalize_name_fields(prospect)
        return {
            "prospect_id": prospect.get("id") or prospect.get("prospect_id"),
            "sr_id": prospect.get("player_id") or prospect.get("sr_id"),
            "first_name": name_fields.get("first_name"),
            "last_name": name_fields.get("last_name"),
            "full_name": name_fields.get("full_name"),
            "position": prospect.get("position"),
            "primary_position": prospect.get("primary_position") or prospect.get("primary_pos"),
            "height": to_int(prospect.get("height")),
            "weight": to_int(prospect.get("weight")),
            "experience": prospect.get("experience"),
            "birthdate": prospect.get("birthdate"),
            "birth_place": prospect.get("birth_place"),
            "high_school": prospect.get("high_school"),
            "college": prospect.get("college"),
            "country": prospect.get("country") or prospect.get("nationality"),
            "status": prospect.get("status"),
        }

    prospects_map: dict[str, dict] = {}
    for prospect in normalize_records(prospects_payload.get("prospects") or prospects_payload.get("players")):
        prospect_id = prospect.get("id") or prospect.get("prospect_id")
        if not prospect_id:
            continue
        prospects_map[prospect_id] = extract_prospect_details(prospect)

    for prospect in normalize_records(top_payload.get("prospects") or top_payload.get("players")):
        prospect_id = prospect.get("id") or prospect.get("prospect_id")
        if not prospect_id:
            continue
        if prospect_id not in prospects_map:
            prospects_map[prospect_id] = extract_prospect_details(prospect)
        prospects_map[prospect_id]["rank"] = to_int(prospect.get("rank"))

    trades_map: dict[tuple[int | None, int | None], dict] = {}
    for trade in normalize_records(trades_payload.get("trades") or trades_payload.get("transactions")):
        trade_id = trade.get("id") or trade.get("trade_id")
        for pick in normalize_records(trade.get("picks") or trade.get("draft_picks")):
            round_number = to_int(pick.get("round") or pick.get("round_number"))
            pick_number = to_int(pick.get("number") or pick.get("pick"))
            trades_map[(round_number, pick_number)] = {"trade_id": trade_id, "trade": trade}

    draft = draft_payload.get("draft") or draft_payload
    rounds = normalize_records(draft.get("rounds") or draft.get("draft_rounds"))
    rows: list[dict] = []
    used_prospects: set[str] = set()

    for round_entry in rounds:
        round_number = to_int(round_entry.get("number") or round_entry.get("round"))
        picks = normalize_records(round_entry.get("picks") or round_entry.get("draft_picks"))
        for pick in picks:
            pick_number = to_int(pick.get("number") or pick.get("pick"))
            overall_pick = to_int(pick.get("overall") or pick.get("overall_pick"))
            team = pick.get("team") or pick.get("franchise") or {}
            original_team = pick.get("original_team") or pick.get("from_team") or {}
            prospect = pick.get("prospect") or pick.get("player") or pick.get("athlete") or {}
            prospect_id = prospect.get("id") or pick.get("prospect_id")

            draft_id = pick.get("id") or (
                f"{draft_year}_{round_number}_{pick_number}"
                if round_number is not None and pick_number is not None
                else f"{draft_year}_{prospect_id}"
            )

            detail = prospects_map.get(prospect_id, {}) if prospect_id else {}
            if prospect_id:
                used_prospects.add(prospect_id)

            trade_info = trades_map.get((round_number, pick_number))
            row = {
                "source_api": source_api,
                "draft_id": str(draft_id),
                "draft_year": draft_year,
                "round": round_number,
                "pick": pick_number,
                "overall_pick": overall_pick,
                "sr_team_id": team.get("id") or pick.get("team_id"),
                "original_sr_team_id": original_team.get("id") or pick.get("original_team_id"),
                "sr_id": detail.get("sr_id") or prospect.get("player_id") or prospect.get("sr_id"),
                "prospect_id": prospect_id,
                "first_name": detail.get("first_name") or prospect.get("first_name"),
                "last_name": detail.get("last_name") or prospect.get("last_name"),
                "full_name": detail.get("full_name") or prospect.get("full_name") or prospect.get("name"),
                "position": detail.get("position") or prospect.get("position"),
                "primary_position": detail.get("primary_position") or prospect.get("primary_position"),
                "height": detail.get("height") or to_int(prospect.get("height")),
                "weight": detail.get("weight") or to_int(prospect.get("weight")),
                "experience": detail.get("experience") or prospect.get("experience"),
                "birthdate": detail.get("birthdate") or prospect.get("birthdate"),
                "birth_place": detail.get("birth_place") or prospect.get("birth_place"),
                "high_school": detail.get("high_school") or prospect.get("high_school"),
                "college": detail.get("college") or prospect.get("college"),
                "country": detail.get("country") or prospect.get("country"),
                "rank": detail.get("rank"),
                "status": detail.get("status") or prospect.get("status") or pick.get("status"),
                "trade_id": (trade_info or {}).get("trade_id"),
                "trades_json": (trade_info or {}).get("trade"),
            }
            rows.append(row)

    for prospect_id, detail in prospects_map.items():
        if prospect_id in used_prospects:
            continue
        draft_id = f"{draft_year}_prospect_{prospect_id}"
        rows.append(
            {
                "source_api": source_api,
                "draft_id": draft_id,
                "draft_year": draft_year,
                "round": None,
                "pick": None,
                "overall_pick": None,
                "sr_team_id": None,
                "original_sr_team_id": None,
                "sr_id": detail.get("sr_id"),
                "prospect_id": prospect_id,
                "first_name": detail.get("first_name"),
                "last_name": detail.get("last_name"),
                "full_name": detail.get("full_name"),
                "position": detail.get("position"),
                "primary_position": detail.get("primary_position"),
                "height": detail.get("height"),
                "weight": detail.get("weight"),
                "experience": detail.get("experience"),
                "birthdate": detail.get("birthdate"),
                "birth_place": detail.get("birth_place"),
                "high_school": detail.get("high_school"),
                "college": detail.get("college"),
                "country": detail.get("country"),
                "rank": detail.get("rank"),
                "status": detail.get("status"),
                "trade_id": None,
                "trades_json": None,
            }
        )

    return rows


def extract_competitions(payload: dict, source_api: str) -> list[dict]:
    competitions = normalize_records(payload.get("competitions"))
    rows: list[dict] = []
    for competition in competitions:
        competition_id = competition.get("id") or competition.get("competition_id")
        if not competition_id:
            continue
        category = competition.get("category") or {}
        rows.append(
            {
                "source_api": source_api,
                "competition_id": competition_id,
                "name": competition.get("name"),
                "alias": competition.get("alias"),
                "gender": competition.get("gender"),
                "type": competition.get("type"),
                "parent_id": competition.get("parent_id"),
                "category_id": category.get("id"),
                "category_name": category.get("name"),
            }
        )
    return rows


def extract_intl_season_hierarchy(payload: dict, source_api: str) -> tuple[list[dict], list[dict]]:
    if not payload:
        return [], []

    season = payload.get("season") or {}
    season_id = season.get("id") or payload.get("season_id")
    if not season_id:
        return [], []

    competition = season.get("competition") or {}
    competition_id = season.get("competition_id") or competition.get("id")

    stage_rows: list[dict] = []
    group_rows: list[dict] = []

    stages = normalize_records(payload.get("stages") or payload.get("stage"))
    for stage in stages:
        stage_id = stage.get("id") or stage.get("stage_id")
        if not stage_id:
            stage_id = f"{season_id}:{stage.get('type') or stage.get('phase') or stage.get('name') or stage.get('order')}"
        stage_rows.append(
            {
                "source_api": source_api,
                "stage_id": stage_id,
                "season_id": season_id,
                "competition_id": competition_id,
                "name": stage.get("name") or stage.get("phase"),
                "type": stage.get("type"),
                "phase": stage.get("phase"),
                "order_num": to_int(stage.get("order") or stage.get("order_num") or stage.get("sequence")),
                "start_date": stage.get("start_date"),
                "end_date": stage.get("end_date"),
            }
        )

        groups = normalize_records(stage.get("groups") or stage.get("group"))
        for group in groups:
            group_id = group.get("id") or group.get("group_id")
            if not group_id:
                group_id = f"{stage_id}:{group.get('name') or group.get('group_name') or group.get('id')}"
            group_rows.append(
                {
                    "source_api": source_api,
                    "group_id": group_id,
                    "stage_id": stage_id,
                    "season_id": season_id,
                    "name": group.get("name") or group.get("group_name"),
                    "order_num": to_int(
                        group.get("order")
                        or group.get("order_num")
                        or group.get("sequence")
                        or group.get("max_rounds")
                    ),
                }
            )

    return stage_rows, group_rows
