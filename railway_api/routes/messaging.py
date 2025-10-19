# railway_api/routes/messaging.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from bson import ObjectId
from typing import Optional, List
import httpx
import os

from models import MessageCreate
from database import (
    get_messages_collection,
    get_users_collection,
    get_avatars_collection,
    get_mood_events_collection
)
from utils import format_avatar_animation

router = APIRouter(prefix="/messages", tags=["Messaging"])

MODEL_SERVER_URL = os.getenv("MODEL_SERVER_URL", "http://localhost:8001")

def serialize_doc(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
        doc["id"] = doc["_id"]
    return doc

async def forward_to_model_server(endpoint: str, data: dict):
    """Forward requests to local model server"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{MODEL_SERVER_URL}{endpoint}", json=data)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        # Log error but don't fail the message send
        print(f"Model server error: {e}")
        return None

async def analyze_and_update_avatar(user_id: str, content: str, language: str = "en"):
    """Analyze message sentiment and update avatar"""
    try:
        # Analyze sentiment
        analysis = await forward_to_model_server("/analyze", {
            "text": content,
            "language": language
        })
        
        if not analysis:
            return None
        
        # Update avatar based on sentiment
        avatars_collection = get_avatars_collection()
        mood_events_collection = get_mood_events_collection()
        
        sentiment = analysis.get("sentiment", "neutral")
        avatar_config = format_avatar_animation(sentiment)
        avatar_config["last_updated"] = datetime.utcnow()
        avatar_config["mood"] = sentiment
        
        await avatars_collection.update_one(
            {"user_id": user_id},
            {"$set": avatar_config}
        )
        
        # Store mood event
        mood_event = {
            "user_id": user_id,
            "sentiment": sentiment,
            "confidence": analysis.get("confidence", 0.0),
            "suicide_risk": analysis.get("suicide_risk", False),
            "self_harm_risk": analysis.get("self_harm_risk", False),
            "timestamp": datetime.utcnow()
        }
        await mood_events_collection.insert_one(mood_event)
        
        return analysis
    except Exception as e:
        print(f"Analysis error: {e}")
        return None

@router.post("")
async def send_message(message: MessageCreate):
    """
    Send a direct message to another user
    Automatically analyzes sentiment and updates avatar
    """
    messages_collection = get_messages_collection()
    users_collection = get_users_collection()
    
    # Verify sender exists
    try:
        sender = await users_collection.find_one({"_id": ObjectId(message.sender_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid sender ID")
    
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    # Verify recipient exists (if not a community message)
    if message.recipient_id:
        try:
            recipient = await users_collection.find_one({"_id": ObjectId(message.recipient_id)})
        except:
            raise HTTPException(status_code=400, detail="Invalid recipient ID")
        
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Create message document
    message_doc = message.dict()
    message_doc["timestamp"] = datetime.utcnow()
    message_doc["read"] = False
    message_doc["reactions"] = {}
    message_doc["reply_to"] = None
    message_doc["analysis"] = None
    
    result = await messages_collection.insert_one(message_doc)
    message_id = str(result.inserted_id)
    
    # Analyze sentiment in background (don't block response)
    if message.message_type == "text":
        language = sender.get("language_preference", "en")
        analysis = await analyze_and_update_avatar(
            message.sender_id,
            message.content,
            language
        )
        
        if analysis:
            # Update message with analysis
            await messages_collection.update_one(
                {"_id": ObjectId(message_id)},
                {"$set": {"analysis": analysis}}
            )
    
    # TODO: Send push notification to recipient
    
    return {
        "message_id": message_id,
        "status": "sent",
        "timestamp": message_doc["timestamp"]
    }

@router.post("/{message_id}/reply")
async def reply_to_message(
    message_id: str,
    sender_id: str,
    content: str
):
    """
    Reply to a specific message (threading)
    Creates a new message that references the original
    """
    messages_collection = get_messages_collection()
    users_collection = get_users_collection()
    
    # Verify original message exists
    try:
        original_message = await messages_collection.find_one({"_id": ObjectId(message_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    
    if not original_message:
        raise HTTPException(status_code=404, detail="Original message not found")
    
    # Verify sender exists
    try:
        sender = await users_collection.find_one({"_id": ObjectId(sender_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid sender ID")
    
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    # Determine recipient (reply goes to original sender or community)
    recipient_id = None
    community_id = original_message.get("community_id")
    
    if not community_id:
        # Direct message reply
        recipient_id = original_message["sender_id"]
    
    # Create reply message
    reply_doc = {
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "community_id": community_id,
        "content": content,
        "message_type": "text",
        "timestamp": datetime.utcnow(),
        "read": False,
        "reply_to": message_id,  # Reference to original message
        "reactions": {}
    }
    
    result = await messages_collection.insert_one(reply_doc)
    
    # Analyze sentiment
    language = sender.get("language_preference", "en")
    await analyze_and_update_avatar(sender_id, content, language)
    
    return {
        "message_id": str(result.inserted_id),
        "reply_to": message_id,
        "status": "sent",
        "timestamp": reply_doc["timestamp"]
    }

@router.get("/{message_id}/replies")
async def get_message_replies(
    message_id: str,
    limit: int = Query(50, ge=1, le=100)
):
    """Get all replies to a specific message"""
    messages_collection = get_messages_collection()
    
    # Verify original message exists
    try:
        original = await messages_collection.find_one({"_id": ObjectId(message_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    
    if not original:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Get replies
    replies = await messages_collection.find({
        "reply_to": message_id
    }).sort("timestamp", 1).limit(limit).to_list(length=limit)
    
    return {
        "message_id": message_id,
        "reply_count": len(replies),
        "replies": [serialize_doc(r) for r in replies]
    }

@router.get("/conversation/{user_id_1}/{user_id_2}")
async def get_conversation(
    user_id_1: str,
    user_id_2: str,
    limit: int = Query(50, ge=1, le=200),
    before: Optional[str] = None
):
    """
    Get conversation between two users (all messages back and forth)
    Supports pagination
    """
    messages_collection = get_messages_collection()
    
    # Build query for messages between these two users
    query = {
        "$or": [
            {"sender_id": user_id_1, "recipient_id": user_id_2},
            {"sender_id": user_id_2, "recipient_id": user_id_1}
        ]
    }
    
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
    
    # Reverse to show oldest first
    messages.reverse()
    
    return {
        "user_id_1": user_id_1,
        "user_id_2": user_id_2,
        "message_count": len(messages),
        "messages": [serialize_doc(msg) for msg in messages],
        "has_more": len(messages) == limit
    }

@router.get("/user/{user_id}")
async def get_user_messages(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = False
):
    """
    Get all messages for a user (sent and received)
    Can filter for unread messages only
    """
    messages_collection = get_messages_collection()
    
    query = {
        "$or": [
            {"sender_id": user_id},
            {"recipient_id": user_id}
        ]
    }
    
    if unread_only:
        query["recipient_id"] = user_id
        query["read"] = False
    
    messages = await messages_collection.find(query).sort(
        "timestamp", -1
    ).limit(limit).to_list(length=limit)
    
    return {
        "user_id": user_id,
        "message_count": len(messages),
        "messages": [serialize_doc(msg) for msg in messages]
    }

@router.get("/user/{user_id}/conversations")
async def get_user_conversations(user_id: str):
    """
    Get list of all conversations for a user
    Returns unique users they've messaged with
    """
    messages_collection = get_messages_collection()
    users_collection = get_users_collection()
    
    # Get all messages involving this user
    messages = await messages_collection.find({
        "$or": [
            {"sender_id": user_id},
            {"recipient_id": user_id}
        ]
    }).sort("timestamp", -1).to_list(length=1000)
    
    # Extract unique conversation partners
    conversation_partners = set()
    conversations = {}
    
    for msg in messages:
        # Skip community messages
        if msg.get("community_id"):
            continue
        
        # Determine the other user
        other_user_id = msg["recipient_id"] if msg["sender_id"] == user_id else msg["sender_id"]
        
        if other_user_id and other_user_id not in conversation_partners:
            conversation_partners.add(other_user_id)
            
            # Get other user info
            try:
                other_user = await users_collection.find_one({"_id": ObjectId(other_user_id)})
                if other_user:
                    conversations[other_user_id] = {
                        "user_id": other_user_id,
                        "display_name": other_user.get("display_name", "User"),
                        "last_message": msg.get("content", "")[:50] + "...",
                        "last_message_time": msg["timestamp"],
                        "unread_count": 0  # Will calculate below
                    }
            except:
                continue
    
    # Count unread messages for each conversation
    for partner_id in conversation_partners:
        unread_count = await messages_collection.count_documents({
            "sender_id": partner_id,
            "recipient_id": user_id,
            "read": False
        })
        if partner_id in conversations:
            conversations[partner_id]["unread_count"] = unread_count
    
    # Sort by most recent
    conversation_list = sorted(
        conversations.values(),
        key=lambda x: x["last_message_time"],
        reverse=True
    )
    
    return {
        "user_id": user_id,
        "conversation_count": len(conversation_list),
        "conversations": conversation_list
    }

@router.put("/{message_id}/read")
async def mark_message_read(message_id: str, user_id: str):
    """Mark a message as read"""
    messages_collection = get_messages_collection()
    
    # Verify message exists and user is recipient
    try:
        message = await messages_collection.find_one({"_id": ObjectId(message_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.get("recipient_id") != user_id:
        raise HTTPException(status_code=403, detail="Can only mark your own messages as read")
    
    # Update read status
    await messages_collection.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )
    
    return {
        "message_id": message_id,
        "status": "marked_as_read"
    }

@router.post("/{message_id}/react")
async def add_reaction(
    message_id: str,
    user_id: str,
    reaction: str
):
    """
    Add reaction to a message (emoji, heart, etc.)
    Valid reactions: heart, thumbs_up, hug, support, pray
    """
    valid_reactions = ["heart", "thumbs_up", "hug", "support", "pray", "smile", "sad"]
    
    if reaction not in valid_reactions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid reaction. Valid reactions: {valid_reactions}"
        )
    
    messages_collection = get_messages_collection()
    
    # Verify message exists
    try:
        message = await messages_collection.find_one({"_id": ObjectId(message_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Add reaction (store as dict: {user_id: reaction})
    await messages_collection.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {f"reactions.{user_id}": reaction}}
    )
    
    return {
        "message_id": message_id,
        "reaction": reaction,
        "user_id": user_id
    }

@router.delete("/{message_id}")
async def delete_message(message_id: str, user_id: str):
    """
    Delete a message (soft delete - marks as deleted but keeps in DB)
    Can only delete own messages
    """
    messages_collection = get_messages_collection()
    
    # Verify message exists and user is sender
    try:
        message = await messages_collection.find_one({"_id": ObjectId(message_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.get("sender_id") != user_id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")
    
    # Soft delete
    await messages_collection.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {
            "deleted": True,
            "deleted_at": datetime.utcnow(),
            "content": "[Message deleted]"
        }}
    )
    
    return {
        "message_id": message_id,
        "status": "deleted"
    }