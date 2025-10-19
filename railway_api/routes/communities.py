# railway_api/routes/communities.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from bson import ObjectId
from typing import Optional, List

from models import CommunityCreate
from database import (
    get_communities_collection,
    get_messages_collection,
    get_users_collection
)

router = APIRouter(prefix="/communities", tags=["Communities"])

def serialize_doc(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
        doc["id"] = doc["_id"]
    return doc

@router.post("")
async def create_community(community: CommunityCreate):
    """Create a new wellness community"""
    communities_collection = get_communities_collection()
    
    community_doc = community.dict()
    community_doc["created_at"] = datetime.utcnow()
    community_doc["members"] = []
    community_doc["moderators"] = []
    community_doc["message_count"] = 0
    community_doc["active"] = True
    
    result = await communities_collection.insert_one(community_doc)
    
    return {
        "community_id": str(result.inserted_id),
        "name": community.name,
        "message": "Community created successfully"
    }

@router.get("")
async def list_communities(
    topic: Optional[str] = None,
    active_only: bool = True
):
    """List all communities, optionally filtered by topic"""
    communities_collection = get_communities_collection()
    
    query = {}
    if active_only:
        query["active"] = True
    if topic:
        query["topic"] = topic
    
    communities = await communities_collection.find(query).to_list(length=100)
    
    # Add member count to each community
    for community in communities:
        community["member_count"] = len(community.get("members", []))
    
    return [serialize_doc(c) for c in communities]

@router.get("/{community_id}")
async def get_community(community_id: str):
    """Get detailed community information"""
    communities_collection = get_communities_collection()
    
    try:
        community = await communities_collection.find_one({"_id": ObjectId(community_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid community ID")
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    community["member_count"] = len(community.get("members", []))
    
    return serialize_doc(community)

@router.post("/{community_id}/join")
async def join_community(community_id: str, user_id: str):
    """Join a community"""
    communities_collection = get_communities_collection()
    users_collection = get_users_collection()
    
    # Verify user exists
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify community exists
    try:
        community = await communities_collection.find_one({"_id": ObjectId(community_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid community ID")
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Check if already a member
    if user_id in community.get("members", []):
        return {
            "message": "Already a member of this community",
            "community_id": community_id
        }
    
    # Add user to community
    result = await communities_collection.update_one(
        {"_id": ObjectId(community_id)},
        {"$addToSet": {"members": user_id}}
    )
    
    return {
        "message": "Successfully joined community",
        "community_id": community_id,
        "community_name": community.get("name")
    }

@router.post("/{community_id}/leave")
async def leave_community(community_id: str, user_id: str):
    """Leave a community"""
    communities_collection = get_communities_collection()
    
    # Verify community exists
    try:
        community = await communities_collection.find_one({"_id": ObjectId(community_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid community ID")
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Check if user is a member
    if user_id not in community.get("members", []):
        raise HTTPException(status_code=400, detail="Not a member of this community")
    
    # Remove user from community
    result = await communities_collection.update_one(
        {"_id": ObjectId(community_id)},
        {"$pull": {"members": user_id}}
    )
    
    return {
        "message": "Successfully left community",
        "community_id": community_id,
        "community_name": community.get("name")
    }

@router.get("/{community_id}/members")
async def get_community_members(
    community_id: str,
    include_details: bool = False
):
    """Get list of community members"""
    communities_collection = get_communities_collection()
    users_collection = get_users_collection()
    
    # Get community
    try:
        community = await communities_collection.find_one({"_id": ObjectId(community_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid community ID")
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    member_ids = community.get("members", [])
    
    if not include_details:
        return {
            "community_id": community_id,
            "member_count": len(member_ids),
            "member_ids": member_ids
        }
    
    # Get member details
    members = []
    for member_id in member_ids:
        try:
            user = await users_collection.find_one({"_id": ObjectId(member_id)})
            if user:
                # Return limited info for privacy
                members.append({
                    "user_id": str(user["_id"]),
                    "display_name": user.get("display_name", "Anonymous"),
                    "anonymous_mode": user.get("anonymous_mode", True)
                })
        except:
            continue
    
    return {
        "community_id": community_id,
        "member_count": len(members),
        "members": members
    }

@router.get("/{community_id}/messages")
async def get_community_messages(
    community_id: str,
    limit: int = Query(50, ge=1, le=200),
    before: Optional[str] = None
):
    """
    Get messages from a community
    Supports pagination with 'before' cursor
    """
    messages_collection = get_messages_collection()
    communities_collection = get_communities_collection()
    
    # Verify community exists
    try:
        community = await communities_collection.find_one({"_id": ObjectId(community_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid community ID")
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Build query
    query = {"community_id": community_id}
    
    # Add pagination
    if before:
        try:
            before_date = datetime.fromisoformat(before.replace('Z', '+00:00'))
            query["timestamp"] = {"$lt": before_date}
        except:
            raise HTTPException(status_code=400, detail="Invalid 'before' timestamp")
    
    # Get messages
    messages = await messages_collection.find(query).sort(
        "timestamp", -1
    ).limit(limit).to_list(length=limit)
    
    return {
        "community_id": community_id,
        "community_name": community.get("name"),
        "message_count": len(messages),
        "messages": [serialize_doc(msg) for msg in messages],
        "has_more": len(messages) == limit
    }

@router.post("/{community_id}/message")
async def send_community_message(
    community_id: str,
    user_id: str,
    content: str,
    anonymous: Optional[bool] = None
):
    """
    Send a message to a community
    All members will receive this message
    """
    communities_collection = get_communities_collection()
    messages_collection = get_messages_collection()
    users_collection = get_users_collection()
    
    # Verify community exists
    try:
        community = await communities_collection.find_one({"_id": ObjectId(community_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid community ID")
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Verify user is a member
    if user_id not in community.get("members", []):
        raise HTTPException(status_code=403, detail="Must be a member to send messages")
    
    # Get user info
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Determine if message is anonymous
    is_anonymous = anonymous if anonymous is not None else user.get("anonymous_mode", False)
    
    # Create message
    message_doc = {
        "sender_id": user_id if not is_anonymous else "anonymous",
        "community_id": community_id,
        "content": content,
        "message_type": "text",
        "timestamp": datetime.utcnow(),
        "is_anonymous": is_anonymous,
        "reply_to": None,
        "reactions": {},
        "flagged": False
    }
    
    result = await messages_collection.insert_one(message_doc)
    
    # Update community message count
    await communities_collection.update_one(
        {"_id": ObjectId(community_id)},
        {"$inc": {"message_count": 1}}
    )
    
    # TODO: Send push notifications to all members
    # TODO: Run AI moderation for suicide/self-harm detection
    
    return {
        "message_id": str(result.inserted_id),
        "community_id": community_id,
        "timestamp": message_doc["timestamp"],
        "status": "sent",
        "recipients": len(community.get("members", [])) - 1  # Exclude sender
    }

@router.get("/user/{user_id}/communities")
async def get_user_communities(user_id: str):
    """Get all communities a user is a member of"""
    communities_collection = get_communities_collection()
    
    communities = await communities_collection.find({
        "members": user_id,
        "active": True
    }).to_list(length=100)
    
    # Add member count
    for community in communities:
        community["member_count"] = len(community.get("members", []))
    
    return {
        "user_id": user_id,
        "community_count": len(communities),
        "communities": [serialize_doc(c) for c in communities]
    }

@router.delete("/{community_id}")
async def delete_community(community_id: str, user_id: str):
    """
    Delete/archive a community (moderator only)
    In production, add proper authorization
    """
    communities_collection = get_communities_collection()
    
    # Verify community exists
    try:
        community = await communities_collection.find_one({"_id": ObjectId(community_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid community ID")
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    # In production, check if user is moderator/creator
    # For now, just mark as inactive
    result = await communities_collection.update_one(
        {"_id": ObjectId(community_id)},
        {"$set": {"active": False, "deleted_at": datetime.utcnow()}}
    )
    
    return {
        "message": "Community archived successfully",
        "community_id": community_id
    }