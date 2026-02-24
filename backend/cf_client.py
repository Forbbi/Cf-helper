"""
Codeforces API client.
Based on cf_helper source (uses requests library internally).
API key/secret only required for user.friends endpoint.
"""
import asyncio
import hashlib
import os
import random
import string
import time
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import List, Optional, Set, Tuple

import requests
from dotenv import load_dotenv

from models import UserInfo, Problem, Submission, SubmissionProblem

load_dotenv()

CF_KEY = os.getenv("key", "")
CF_SECRET = os.getenv("secret", "")
CF_DEFAULT_HANDLE = os.getenv("CF_DEFAULT_HANDLE", "Tourist")

_executor = ThreadPoolExecutor(max_workers=4)


async def _run(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, partial(fn, *args, **kwargs))


# ─── Raw API helpers (sync) ──────────────────────────────────────────────────

def _get_user_info_sync(handle: str):
    url = f"https://codeforces.com/api/user.info?handles={handle}"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    data = r.json()
    if data["status"] != "OK":
        raise ValueError(data.get("comment", "Unknown error"))
    return data["result"][0]


def _get_user_status_sync(handle: str, count: int = 10000):
    url = (
        f"https://codeforces.com/api/user.status"
        f"?handle={handle}&from=1&count={count}"
    )
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    data = r.json()
    if data["status"] != "OK":
        raise ValueError(data.get("comment", "Unknown error"))
    return data["result"]


def _get_problemset_sync(tags: Optional[str] = None):
    """Returns (problems_list, stats_list) matching cf_helper's return format."""
    url = "https://codeforces.com/api/problemset.problems"
    params = {}
    if tags:
        params["tags"] = tags
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    if data["status"] != "OK":
        raise ValueError(data.get("comment", "Unknown error"))
    return data["result"]["problems"], data["result"]["problemStatistics"]


def _generate_api_sig(method: str, params: dict, secret: str) -> str:
    rand = "".join(random.choices(string.ascii_letters + string.digits, k=6))
    params_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    sig_base = f"{rand}/{method}?{params_str}#{secret}"
    api_sig = rand + hashlib.sha512(sig_base.encode()).hexdigest()
    return api_sig


def _get_user_friends_sync(only_online: bool = False):
    if not CF_KEY or not CF_SECRET:
        return []
    method = "user.friends"
    current_time = int(time.time())
    params = {
        "apiKey": CF_KEY,
        "time": current_time,
        "onlyOnline": str(only_online).lower(),
    }
    api_sig = _generate_api_sig(method, params, CF_SECRET)
    params["apiSig"] = api_sig
    r = requests.get(f"https://codeforces.com/api/{method}", params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    if data["status"] != "OK":
        raise ValueError(data.get("comment", "Unknown error"))
    return data["result"]


# ─── Async public API ─────────────────────────────────────────────────────────

async def get_user_info(handle: str) -> UserInfo:
    u = await _run(_get_user_info_sync, handle)
    return UserInfo(
        handle=u.get("handle", handle),
        rating=u.get("rating"),
        max_rating=u.get("maxRating"),
        rank=u.get("rank"),
        max_rank=u.get("maxRank"),
        avatar=u.get("titlePhoto") or u.get("avatar"),
        contribution=u.get("contribution"),
    )


async def get_user_solved(handle: str) -> Set[Tuple[Optional[int], str]]:
    """Return set of (contestId, index) for all AC submissions."""
    submissions = await _run(_get_user_status_sync, handle, 10000)
    solved = set()
    for sub in submissions:
        if sub.get("verdict") == "OK":
            p = sub.get("problem", {})
            solved.add((p.get("contestId"), p.get("index", "")))
    return solved


async def get_all_problems(
    tags: Optional[List[str]] = None,
    min_rating: Optional[int] = None,
    max_rating: Optional[int] = None,
) -> List[Problem]:
    tag_str = ";".join(tags) if tags else None
    # Returns (problems, stats) tuple — matching cf_helper source exactly
    problems_raw, stats_raw = await _run(_get_problemset_sync, tag_str)

    solve_counts = {
        (s.get("contestId"), s.get("index")): s.get("solvedCount", 0)
        for s in stats_raw
    }

    problems = []
    for p in problems_raw:
        rating = p.get("rating")
        if min_rating is not None and (rating is None or rating < min_rating):
            continue
        if max_rating is not None and (rating is None or rating > max_rating):
            continue
        contest_id = p.get("contestId")
        index = p.get("index", "")
        url = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
        problems.append(
            Problem(
                contest_id=contest_id,
                index=index,
                name=p.get("name", ""),
                rating=rating,
                tags=p.get("tags", []),
                url=url,
                solved_count=solve_counts.get((contest_id, index), 0),
            )
        )
    return problems


async def get_unattempted_problems(
    handle: str,
    tags: Optional[str] = None,
    rating: Optional[int] = None,
    count: int = 10,
    choose_random: bool = False,
) -> List[Problem]:
    """Problems the user hasn't attempted — mirrors cf_helper.get_unattempted_problems."""
    problems_raw, _ = await _run(_get_problemset_sync, tags)
    submissions = await _run(_get_user_status_sync, handle, 10000)

    attempted = {
        (sub["problem"]["contestId"], sub["problem"]["index"])
        for sub in submissions
    }

    if rating is not None:
        problems_raw = [p for p in problems_raw if p.get("rating") == rating]

    unattempted = [
        p for p in problems_raw
        if (p.get("contestId"), p.get("index", "")) not in attempted
    ]

    if choose_random:
        random.shuffle(unattempted)

    result = []
    for p in unattempted[:count]:
        contest_id = p.get("contestId")
        index = p.get("index", "")
        result.append(Problem(
            contest_id=contest_id,
            index=index,
            name=p.get("name", ""),
            rating=p.get("rating"),
            tags=p.get("tags", []),
            url=f"https://codeforces.com/problemset/problem/{contest_id}/{index}",
        ))
    return result


async def get_all_tags() -> List[str]:
    problems_raw, _ = await _run(_get_problemset_sync, None)
    tags = set()
    for p in problems_raw:
        for t in p.get("tags", []):
            tags.add(t)
    return sorted(tags)


async def get_user_submissions(handle: str) -> List[Submission]:
    """Return all submissions for a user, newest first, enriched with problem URL."""
    raw = await _run(_get_user_status_sync, handle, 10000)
    result = []
    for sub in raw:
        p = sub.get("problem", {})
        contest_id = p.get("contestId")
        index = p.get("index", "")
        url = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
        result.append(
            Submission(
                id=sub.get("id", 0),
                verdict=sub.get("verdict"),
                time_seconds=sub.get("creationTimeSeconds", 0),
                language=sub.get("programmingLanguage"),
                problem=SubmissionProblem(
                    contest_id=contest_id,
                    index=index,
                    name=p.get("name", ""),
                    rating=p.get("rating"),
                    tags=p.get("tags", []),
                    url=url,
                ),
            )
        )
    return result
