# railway_api/routes/avatars.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List

from models import AvatarState, AvatarUpdate, AvatarJumpRequest
from database import get_avatars_collection, get_messages_collection, get_mood_events_collection
from utils import format_avatar_animation

router = APIRouter(prefix="/avatars", tags=["Avatars"])

def serialize_doc(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@router.get("/{user_id}")
async def get_avatar(user_id: str):
    """Get user's avatar state"""
    avatars_collection = get_avatars_collection()
    
    avatar = await avatars_collection.find_one({"user_id": user_id})
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return serialize_doc(avatar)

@router.put("/{user_id}")
async def update_avatar(user_id: str, avatar_update: AvatarUpdate):
    """Manually update avatar state"""
    avatars_collection = get_avatars_collection()
    
    update_data = {k: v for k, v in avatar_update.dict().items() if v is not None}
    update_data["last_updated"] = datetime.utcnow()
    
    result = await avatars_collection.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return {"message": "Avatar updated successfully", "updated_fields": list(update_data.keys())}

@router.post("/jump")
async def avatar_jump(request: AvatarJumpRequest):
    """
    Send avatar remotely to another user (Remote Avatar Jump)
    This is a core feature for emotional support
    """
    avatars_collection = get_avatars_collection()
    messages_collection = get_messages_collection()
    
    # Get sender's avatar
    sender_avatar = await avatars_collection.find_one({"user_id": request.sender_id})
    if not sender_avatar:
        raise HTTPException(status_code=404, detail="Sender avatar not found")
    
    # Verify recipient exists
    recipient_avatar = await avatars_collection.find_one({"user_id": request.recipient_id})
    if not recipient_avatar:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Create avatar jump event
    jump_event = {
        "sender_id": request.sender_id,
        "recipient_id": request.recipient_id,
        "message": request.message,
        "message_type": "avatar_jump",
        "avatar_state": {
            "color": sender_avatar.get("color"),
            "posture": sender_avatar.get("posture"),
            "animation": sender_avatar.get("animation"),
            "mood": sender_avatar.get("mood"),
            "accessories": sender_avatar.get("accessories", [])
        },
        "timestamp": datetime.utcnow(),
        "viewed": False
    }
    
    result = await messages_collection.insert_one(jump_event)
    
    # TODO: Send push notification to recipient
    # TODO: Track emotional impact with ML
    
    return {
        "message": "Avatar jumped successfully",
        "jump_id": str(result.inserted_id),
        "animation": "teleport",
        "arrival_message": request.message
    }

@router.get("/{user_id}/history")
async def get_avatar_history(user_id: str, days: int = 7):
    """
    Get avatar state history for a user
    Shows how avatar has evolved over time based on mood
    """
    mood_events_collection = get_mood_events_collection()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    mood_events = await mood_events_collection.find({
        "user_id": user_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1).to_list(length=1000)
    
    # Build timeline of avatar states
    avatar_timeline = []
    for event in mood_events:
        avatar_config = format_avatar_animation(event.get("sentiment", "neutral"))
        avatar_timeline.append({
            "timestamp": event["timestamp"],
            "mood": event.get("sentiment"),
            "avatar_state": avatar_config,
            "suicide_risk": event.get("suicide_risk", False),
            "self_harm_risk": event.get("self_harm_risk", False)
        })
    
    return {
        "user_id": user_id,
        "period_days": days,
        "total_events": len(avatar_timeline),
        "timeline": avatar_timeline
    }

@router.get("/{user_id}/jumps/received")
async def get_received_jumps(user_id: str, limit: int = 20):
    """Get avatar jumps received by this user"""
    messages_collection = get_messages_collection()
    
    jumps = await messages_collection.find({
        "recipient_id": user_id,
        "message_type": "avatar_jump"
    }).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    return {
        "user_id": user_id,
        "total_received": len(jumps),
        "jumps": [serialize_doc(jump) for jump in jumps]
    }

@router.get("/{user_id}/jumps/sent")
async def get_sent_jumps(user_id: str, limit: int = 20):
    """Get avatar jumps sent by this user"""
    messages_collection = get_messages_collection()
    
    jumps = await messages_collection.find({
        "sender_id": user_id,
        "message_type": "avatar_jump"
    }).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    return {
        "user_id": user_id,
        "total_sent": len(jumps),
        "jumps": [serialize_doc(jump) for jump in jumps]
    }

@router.post("/interact")
async def avatar_interact(
    sender_id: str,
    recipient_id: str,
    interaction_type: str
):
    """
    Avatar-to-avatar interaction (hug, high-five, sit-beside, etc.)
    Tracks emotional impact of interactions
    """
    valid_interactions = ["hug", "high_five", "sit_beside", "dance", "wave", "comfort"]
    
    if interaction_type not in valid_interactions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid interaction type. Valid types: {valid_interactions}"
        )
    
    messages_collection = get_messages_collection()
    
    interaction = {
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "message_type": "avatar_interaction",
        "interaction_type": interaction_type,
        "timestamp": datetime.utcnow()
    }
    
    result = await messages_collection.insert_one(interaction)
    
    # Get interaction message
    interaction_messages = {
        "hug": "Avatar gives a warm hug",
        "high_five": "Avatar gives an enthusiastic high-five!",
        "sit_beside": "Avatar sits quietly beside you",
        "dance": "Avatar starts dancing with joy!",
        "wave": "Avatar waves hello",
        "comfort": "Avatar offers comforting presence"
    }
    
    return {
        "interaction_id": str(result.inserted_id),
        "type": interaction_type,
        "message": interaction_messages.get(interaction_type),
        "animation": interaction_type
    }

@router.post("/{user_id}/mood-update")
async def update_avatar_from_mood(user_id: str, mood: str, confidence: float = 0.8):
    """
    Update avatar automatically based on detected mood
    This is called internally after sentiment analysis
    """
    avatars_collection = get_avatars_collection()
    
    # Get avatar configuration for this mood
    avatar_config = format_avatar_animation(mood)
    avatar_config["last_updated"] = datetime.utcnow()
    avatar_config["mood"] = mood
    avatar_config["mood_confidence"] = confidence
    
    result = await avatars_collection.update_one(
        {"user_id": user_id},
        {"$set": avatar_config}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return {
        "message": "Avatar updated from mood detection",
        "mood": mood,
        "avatar_state": avatar_config
    }

@router.get("/{user_id}/evolution")
async def get_avatar_evolution(user_id: str):
    """
    Get avatar evolution metrics
    Shows how avatar has changed over the user's wellness journey
    """
    mood_events_collection = get_mood_events_collection()
    
    # Get all mood events
    all_events = await mood_events_collection.find({
        "user_id": user_id
    }).sort("timestamp", 1).to_list(length=10000)
    
    if not all_events:
        return {
            "user_id": user_id,
            "total_events": 0,
            "message": "No mood data yet"
        }
    
    # Calculate statistics
    mood_counts = {}
    for event in all_events:
        mood = event.get("sentiment", "neutral")
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
    
    # Get most recent trend (last 10 events)
    recent_moods = [e.get("sentiment", "neutral") for e in all_events[-10:]]
    
    # Calculate improvement score
    positive_moods = ["happy", "calm", "joy"]
    recent_positive = sum(1 for m in recent_moods if m in positive_moods)
    improvement_score = (recent_positive / len(recent_moods)) * 100 if recent_moods else 0
    
    return {
        "user_id": user_id,
        "total_events": len(all_events),
        "mood_distribution": mood_counts,
        "recent_trend": recent_moods,
        "improvement_score": round(improvement_score, 1),
        "first_event": all_events[0]["timestamp"],
        "latest_event": all_events[-1]["timestamp"],
        "journey_days": (all_events[-1]["timestamp"] - all_events[0]["timestamp"]).days
    }