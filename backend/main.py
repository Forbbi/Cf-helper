from fastapi import FastAPI, HTTPException, Query, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import database
import cf_client
import httpx
import os
from dotenv import load_dotenv
from models import Bookmark, BookmarkCreate, UserInfo, Problem, ProblemWithStatus, Submission, UserCreate, User, AuthToken, Contest
from auth import verify_google_token, create_access_token, get_current_user, get_current_user_optional

load_dotenv()

app = FastAPI(title="CF Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://35.229.93.108.nip.io:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

database.init_db()

class GoogleToken(BaseModel):
    token: str

@app.post("/api/auth/google", response_model=AuthToken)
def login_with_google(data: GoogleToken):
    print(f"[BACKEND] Received login request for token: {data.token[:15]}...")
    try:
        idinfo = verify_google_token(data.token)
    except Exception as e:
        print(f"[BACKEND ERROR] Authentication failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    google_id = idinfo['sub']
    user = database.get_user_by_google_id(google_id)
    if not user:
        user_create = UserCreate(
            google_id=google_id,
            email=idinfo.get('email', ''),
            name=idinfo.get('name', ''),
            picture=idinfo.get('picture', '')
        )
        user = database.create_user(user_create)

    token = create_access_token(user.id)
    return AuthToken(access_token=token)

@app.get("/api/me", response_model=User)
def get_me(user: User = Depends(get_current_user)):
    return user

class HandleUpdate(BaseModel):
    handle: str

@app.post("/api/me/handle", response_model=User)
def update_handle(data: HandleUpdate, user: User = Depends(get_current_user)):
    user = database.update_user_handle(user.id, data.handle)
    return user

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
    user: Optional[User] = Depends(get_current_user_optional)
):
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    try:
        problems = await cf_client.get_all_problems(
            tags=tag_list, min_rating=min_rating, max_rating=max_rating
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CF API error: {str(e)}")

    solved_set = set()
    if handle:
        try:
            raw = await cf_client.get_user_solved(handle)
            solved_set = {f"{cid}_{idx}" for cid, idx in raw}
        except Exception:
            pass

    bookmarked_ids = set()
    if user:
        raw_bm = database.get_bookmarked_ids(user.id)
        bookmarked_ids = {f"{cid}_{idx}" for cid, idx in raw_bm}

    problems.sort(key=lambda p: (p.rating is None, p.rating or 0))

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
def get_bookmarks(user: User = Depends(get_current_user)):
    return database.get_bookmarks(user.id)

@app.post("/api/bookmarks", response_model=Bookmark, status_code=201)
def create_bookmark(bm: BookmarkCreate, user: User = Depends(get_current_user)):
    return database.add_bookmark(user.id, bm)

@app.delete("/api/bookmarks/{contest_id}/{index}")
def delete_bookmark(contest_id: int, index: str, user: User = Depends(get_current_user)):
    removed = database.remove_bookmark(user.id, contest_id, index)
    if not removed:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"status": "deleted"}

@app.get("/api/contests", response_model=List[Contest])
async def get_contests():
    """Returns upcoming and recently finished contests."""
    try:
        upcoming = await cf_client.get_upcoming_contests()
        recent = await cf_client.get_recent_contests(count=10)
        return upcoming + recent
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CF API error: {str(e)}")


class CompileRequest(BaseModel):
    code: str
    input: str = ""
    compiler: str = "g++-15"

@app.post("/api/compile")
async def compile_code(req: CompileRequest):
    """Proxy to onlinecompiler.io to avoid CORS issues in the browser."""
    api_key = os.environ.get("COMPILER_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="COMPILER_API_KEY not set on server")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.onlinecompiler.io/api/run-code-sync/",
                headers={
                    "Authorization": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "compiler": req.compiler,
                    "code": req.code,
                    "input": req.input,
                },
            )
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compiler error: {str(e)}")
