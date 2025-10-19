# railway_api/routes/auth.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
import re

from database import get_users_collection, get_avatars_collection
from auth import get_password_hash, verify_password, create_access_token
from models import AvatarState

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Pydantic Models
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    display_name: Optional[str] = None
    anonymous_mode: bool = False
    language_preference: str = "en"
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    display_name: Optional[str]
    expires_in: int = 604800  # 7 days in seconds

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordChange(BaseModel):
    user_id: str
    old_password: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v

def serialize_doc(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
        doc["id"] = doc["_id"]
    return doc

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """
    Register a new user account
    Creates user profile and default avatar
    Returns JWT token for immediate login
    """
    users_collection = get_users_collection()
    avatars_collection = get_avatars_collection()
    
    # Check if username already exists
    existing_user = await users_collection.find_one({"username": user_data.username.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = await users_collection.find_one({"email": user_data.email.lower()})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user document
    user_doc = {
        "username": user_data.username.lower(),
        "email": user_data.email.lower(),
        "password_hash": hashed_password,
        "display_name": user_data.display_name or user_data.username,
        "anonymous_mode": user_data.anonymous_mode,
        "language_preference": user_data.language_preference,
        "created_at": datetime.utcnow(),
        "last_login": datetime.utcnow(),
        "is_active": True,
        "is_verified": False,  # Email verification
        "profile_complete": False
    }
    
    # Insert user
    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create default avatar
    avatar = AvatarState(user_id=user_id)
    await avatars_collection.insert_one(avatar.dict())
    
    # Create JWT token
    token_data = {
        "sub": user_id,
        "username": user_data.username.lower(),
        "type": "user"
    }
    access_token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        user_id=user_id,
        username=user_data.username.lower(),
        display_name=user_data.display_name or user_data.username
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Login with username and password
    Returns JWT token on success
    """
    users_collection = get_users_collection()
    
    # Find user by username
    user = await users_collection.find_one({"username": credentials.username.lower()})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support."
        )
    
    # Update last login
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create JWT token
    user_id = str(user["_id"])
    token_data = {
        "sub": user_id,
        "username": user["username"],
        "type": "user"
    }
    access_token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        user_id=user_id,
        username=user["username"],
        display_name=user.get("display_name")
    )

@router.post("/logout")
async def logout(user_id: str):
    """
    Logout user
    In a production app, you would invalidate the token
    For now, just update last_logout timestamp
    """
    users_collection = get_users_collection()
    
    try:
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_logout": datetime.utcnow()}}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    return {
        "message": "Logged out successfully",
        "user_id": user_id
    }

@router.post("/password/change")
async def change_password(password_change: PasswordChange):
    """
    Change user password
    Requires old password for verification
    """
    users_collection = get_users_collection()
    
    # Get user
    try:
        user = await users_collection.find_one({"_id": ObjectId(password_change.user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not verify_password(password_change.old_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password"
        )
    
    # Hash new password
    new_password_hash = get_password_hash(password_change.new_password)
    
    # Update password
    await users_collection.update_one(
        {"_id": ObjectId(password_change.user_id)},
        {"$set": {
            "password_hash": new_password_hash,
            "password_changed_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": "Password changed successfully",
        "user_id": password_change.user_id
    }

@router.post("/password/reset-request")
async def request_password_reset(reset_request: PasswordReset):
    """
    Request password reset
    In production, this would send an email with a reset link
    """
    users_collection = get_users_collection()
    
    # Find user by email
    user = await users_collection.find_one({"email": reset_request.email.lower()})
    
    # For security, always return success even if email doesn't exist
    if user:
        # Generate reset token (in production, send via email)
        reset_token_data = {
            "sub": str(user["_id"]),
            "type": "password_reset"
        }
        reset_token = create_access_token(
            reset_token_data,
            expires_delta=timedelta(hours=1)  # Short-lived token
        )
        
        # Store reset token and expiry
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "password_reset_token": reset_token,
                "password_reset_expires": datetime.utcnow() + timedelta(hours=1)
            }}
        )
        
        # TODO: Send email with reset link
        # send_password_reset_email(user["email"], reset_token)
    
    return {
        "message": "If that email exists, a password reset link has been sent.",
        "note": "Check your email for reset instructions"
    }

@router.get("/verify-token")
async def verify_token(token: str):
    """
    Verify if a JWT token is valid
    Returns user info if valid
    """
    from auth import decode_access_token
    
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return {
            "valid": True,
            "user_id": str(user["_id"]),
            "username": user["username"],
            "display_name": user.get("display_name"),
            "expires_at": payload.get("exp")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

@router.post("/refresh")
async def refresh_token(current_token: str):
    """
    Refresh an existing JWT token
    Returns a new token with extended expiry
    """
    from auth import decode_access_token
    
    try:
        # Verify current token
        payload = decode_access_token(current_token)
        user_id = payload.get("sub")
        username = payload.get("username")
        
        # Create new token
        new_token_data = {
            "sub": user_id,
            "username": username,
            "type": "user"
        }
        new_access_token = create_access_token(new_token_data)
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        return TokenResponse(
            access_token=new_access_token,
            user_id=user_id,
            username=username,
            display_name=user.get("display_name") if user else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

@router.delete("/account/{user_id}")
async def delete_account(user_id: str, password: str):
    """
    Delete user account (soft delete)
    Requires password confirmation
    """
    users_collection = get_users_collection()
    
    # Get user
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify password
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Soft delete (deactivate account)
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "is_active": False,
            "deleted_at": datetime.utcnow(),
            "username": f"deleted_{user_id}",  # Free up username
            "email": f"deleted_{user_id}@deleted.com"  # Free up email
        }}
    )
    
    return {
        "message": "Account deleted successfully",
        "user_id": user_id
    }