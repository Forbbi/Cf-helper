from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import database
import cf_client
from models import Bookmark, BookmarkCreate, UserInfo, Problem, ProblemWithStatus, Submission

app = FastAPI(title="CF Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

database.init_db()


@app.get("/api/config")
def get_config():
    """Return server-side defaults (default handle from .env)."""
    return {"default_handle": cf_client.CF_DEFAULT_HANDLE}


@app.get("/api/user/{handle}", response_model=UserInfo)
async def get_user(handle: str):
    try:
        return await cf_client.get_user_info(handle)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CF API error: {str(e)}")


@app.get("/api/user/{handle}/solved")
async def get_solved(handle: str):
    """Returns list of solved problem identifiers as 'contestId_index' strings."""
    try:
        solved = await cf_client.get_user_solved(handle)
        return {"solved": [f"{cid}_{idx}" for cid, idx in solved]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CF API error: {str(e)}")


@app.get("/api/user/{handle}/submissions", response_model=List[Submission])
async def get_submissions(handle: str):
    """Returns all submissions for the user with problem metadata."""
    try:
        return await cf_client.get_user_submissions(handle)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CF API error: {str(e)}")


@app.get("/api/problems", response_model=List[ProblemWithStatus])
async def get_problems(
    handle: Optional[str] = Query(None),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    min_rating: Optional[int] = Query(None),
    max_rating: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    try:
        problems = await cf_client.get_all_problems(
            tags=tag_list, min_rating=min_rating, max_rating=max_rating
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CF API error: {str(e)}")

    # Get solved set if handle provided
    solved_set = set()
    if handle:
        try:
            raw = await cf_client.get_user_solved(handle)
            solved_set = {f"{cid}_{idx}" for cid, idx in raw}
        except Exception:
            pass

    # Get bookmarked set
    bookmarked_ids = {f"{cid}_{idx}" for cid, idx in database.get_bookmarked_ids()}

    # Sort by rating ascending (None goes last)
    problems.sort(key=lambda p: (p.rating is None, p.rating or 0))

    # Paginate
    start = (page - 1) * page_size
    end = start + page_size
    page_problems = problems[start:end]

    result = []
    for p in page_problems:
        key = f"{p.contest_id}_{p.index}"
        result.append(
            ProblemWithStatus(
                **p.model_dump(),
                is_solved=key in solved_set,
                is_bookmarked=key in bookmarked_ids,
            )
        )
    return result


@app.get("/api/problems/count")
async def get_problems_count(
    tags: Optional[str] = Query(None),
    min_rating: Optional[int] = Query(None),
    max_rating: Optional[int] = Query(None),
):
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    try:
        problems = await cf_client.get_all_problems(
            tags=tag_list, min_rating=min_rating, max_rating=max_rating
        )
        return {"count": len(problems)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CF API error: {str(e)}")


@app.get("/api/tags")
async def get_tags():
    try:
        tags = await cf_client.get_all_tags()
        return {"tags": tags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CF API error: {str(e)}")


@app.get("/api/bookmarks", response_model=List[Bookmark])
def get_bookmarks():
    return database.get_bookmarks()


@app.post("/api/bookmarks", response_model=Bookmark, status_code=201)
def create_bookmark(bm: BookmarkCreate):
    return database.add_bookmark(bm)


@app.delete("/api/bookmarks/{contest_id}/{index}")
def delete_bookmark(contest_id: int, index: str):
    removed = database.remove_bookmark(contest_id, index)
    if not removed:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"status": "deleted"}
