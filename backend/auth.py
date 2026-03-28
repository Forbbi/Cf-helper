import os
from datetime import datetime, timedelta
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.oauth2 import id_token
from google.auth.transport import requests
from dotenv import load_dotenv
import database
from models import User

load_dotenv()

# These should ideally come from .env
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-me-in-production")
JWT_ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

security = HTTPBearer()

def verify_google_token(token: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        # Fallback for local testing without proper Google Client ID
        # Only use if explicitly wanting to bypass Google verification in dev
        print("WARNING: GOOGLE_CLIENT_ID not set. Authentication might fail.")
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        return idinfo
    except ValueError as e:
        raise ValueError(f"Invalid Google token: {str(e)}")

def create_access_token(user_id: int) -> str:
    expiration = datetime.utcnow() + timedelta(days=7)
    payload = {
        "sub": str(user_id),
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> User:
    token = credentials.credentials
    payload = verify_access_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user_id = int(user_id_str)
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Security(security)) -> User | None:
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None
