from __future__ import annotations

import asyncio
import os
from datetime import datetime
from typing import Any

import httpx

BASE_URLS = {
    "nba": "https://api.sportradar.com/nba/trial/v8",
    "gleague": "https://api.sportradar.com/nbdl/trial/v8",
    "ncaa": "https://api.sportradar.com/ncaamb/trial/v8",
    "intl": "https://api.sportradar.com/basketball/trial/v2",
}

DRAFT_BASE_URL = "https://api.sportradar.com/draft/nba/trial/v1"

NCAA_POLL_NAMES = ["AP", "US"]


class FetchError(ValueError):
    pass


def get_base_url(source_api: str) -> str:
    if source_api not in BASE_URLS:
        raise FetchError(f"Unsupported source_api: {source_api}")
    return BASE_URLS[source_api]


def get_api_key() -> str:
    api_key = os.environ.get("SPORTRADAR_API_KEY")
    if not api_key:
        raise FetchError("SPORTRADAR_API_KEY is required")
    return api_key


def get_seasons_url(source_api: str, base_url: str, locale: str) -> str:
    if source_api == "intl":
        return f"{base_url}/{locale}/seasons.json"
    return f"{base_url}/{locale}/league/seasons.json"


def get_teams_url(source_api: str, base_url: str, locale: str) -> str | None:
    if source_api == "intl":
        return None
    if source_api in {"nba", "ncaa"}:
        return f"{base_url}/{locale}/league/hierarchy.json"
    return f"{base_url}/{locale}/league/teams.json"


def build_schedule_url(
    base_url: str,
    locale: str,
    mode: str,
    date: str | None,
    season_year: int | None,
    season_type: str | None,
) -> tuple[str, str]:
    if mode == "daily":
        if not date:
            raise FetchError("date is required for daily mode")
        try:
            day = datetime.fromisoformat(date).date()
        except ValueError as exc:
            raise FetchError("date must be YYYY-MM-DD") from exc
        schedule_url = (
            f"{base_url}/{locale}/games/{day.year}/{day.month:02d}/{day.day:02d}/schedule.json"
        )
        schedule_suffix = day.isoformat()
    elif mode == "backfill":
        if season_year is None or season_type is None:
            raise FetchError("season_year and season_type are required for backfill mode")
        schedule_url = f"{base_url}/{locale}/games/{season_year}/{season_type}/schedule.json"
        schedule_suffix = f"{season_year}_{season_type}"
    else:
        raise FetchError(f"Unsupported mode: {mode}")

    return schedule_url, schedule_suffix


async def fetch_json(client: httpx.AsyncClient, url: str, params: dict, max_retries: int = 4) -> dict:
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            response = await client.get(url, params=params, timeout=30.0)
            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                wait = float(retry_after) if retry_after else 2 ** attempt
                await asyncio.sleep(wait)
                continue
            if response.status_code >= 500:
                await asyncio.sleep(2 ** attempt)
                continue
            response.raise_for_status()
            return response.json()
        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            last_error = exc
            await asyncio.sleep(2 ** attempt)
    if last_error:
        raise last_error
    raise RuntimeError(f"Failed to fetch {url}")


async def fetch_many(
    client: httpx.AsyncClient,
    items: list[tuple[str, str]],
    params: dict,
    max_concurrency: int,
) -> dict[str, dict]:
    semaphore = asyncio.Semaphore(max_concurrency)
    results: dict[str, dict] = {}

    async def fetch_one(key: str, url: str) -> None:
        async with semaphore:
            payload = await fetch_json(client, url, params)
            results[key] = payload

    await asyncio.gather(*(fetch_one(key, url) for key, url in items))
    return results


__all__ = [
    "BASE_URLS",
    "DRAFT_BASE_URL",
    "NCAA_POLL_NAMES",
    "FetchError",
    "get_base_url",
    "get_api_key",
    "get_seasons_url",
    "get_teams_url",
    "build_schedule_url",
    "fetch_json",
    "fetch_many",
]
