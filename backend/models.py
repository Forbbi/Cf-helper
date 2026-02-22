from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class UserInfo(BaseModel):
    handle: str
    rating: Optional[int] = None
    max_rating: Optional[int] = None
    rank: Optional[str] = None
    max_rank: Optional[str] = None
    avatar: Optional[str] = None
    contribution: Optional[int] = None


class Problem(BaseModel):
    contest_id: Optional[int] = None
    index: str
    name: str
    rating: Optional[int] = None
    tags: List[str] = []
    url: str
    solved_count: Optional[int] = None


class ProblemWithStatus(Problem):
    is_solved: bool = False
    is_bookmarked: bool = False


class BookmarkCreate(BaseModel):
    contest_id: Optional[int] = None
    index: str
    name: str
    rating: Optional[int] = None
    tags: List[str] = []
    url: str


class Bookmark(BookmarkCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionProblem(BaseModel):
    contest_id: Optional[int] = None
    index: str
    name: str
    rating: Optional[int] = None
    tags: List[str] = []
    url: str


class Submission(BaseModel):
    id: int
    verdict: Optional[str] = None
    time_seconds: int
    language: Optional[str] = None
    problem: SubmissionProblem
