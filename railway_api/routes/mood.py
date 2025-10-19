# railway_api/routes/mood.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from typing import List, Dict
from bson import ObjectId

from database import get_mood_events_collection, get_avatars_collection
from utils import calculate_mood_trend, format_avatar_animation
import httpx
import os

router = APIRouter(prefix="/mood", tags=["Mood & Analysis"])

MODEL_SERVER_URL = os.getenv("MODEL_SERVER_URL", "http://localhost:8001")

def serialize_doc(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

async def forward_to_model_server(endpoint: str, data: dict):
    """Forward requests to local model server"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{MODEL_SERVER_URL}{endpoint}", json=data)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model server unavailable: {str(e)}")

@router.post("/detect")
async def detect_mood(text: str, language: str = "en", user_id: str = None):
    """
    Detect mood from text using sentiment analysis
    Returns mood label and triggers avatar update if user_id provided
    """
    # Forward to model server for analysis
    analysis = await forward_to_model_server("/analyze", {
        "text": text,
        "language": language
    })
    
    mood_result = {
        "mood": analysis.get("sentiment", "neutral"),
        "confidence": analysis.get("confidence", 0.0),
        "suicide_risk": analysis.get("suicide_risk", False),
        "self_harm_risk": analysis.get("self_harm_risk", False),
        "needs_support": analysis.get("needs_support", False)
    }
    
    # If user_id provided, update avatar and store mood event
    if user_id:
        mood_events_collection = get_mood_events_collection()
        avatars_collection = get_avatars_collection()
        
        # Store mood event
        mood_event = {
            "user_id": user_id,
            "sentiment": mood_result["mood"],
            "confidence": mood_result["confidence"],
            "suicide_risk": mood_result["suicide_risk"],
            "self_harm_risk": mood_result["self_harm_risk"],
            "timestamp": datetime.utcnow()
        }
        await mood_events_collection.insert_one(mood_event)
        
        # Update avatar
        avatar_config = format_avatar_animation(mood_result["mood"])
        avatar_config["last_updated"] = datetime.utcnow()
        
        await avatars_collection.update_one(
            {"user_id": user_id},
            {"$set": avatar_config}
        )
        
        mood_result["avatar_updated"] = True
    
    # Add support message if needed
    if mood_result["needs_support"]:
        mood_result["support_message"] = get_support_message(
            mood_result["mood"],
            language,
            mood_result["suicide_risk"]
        )
    
    return mood_result

@router.get("/history/{user_id}")
async def get_mood_history(user_id: str, days: int = 7):
    """Get mood history for a user over specified days"""
    mood_events_collection = get_mood_events_collection()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    mood_events = await mood_events_collection.find({
        "user_id": user_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1).to_list(length=1000)
    
    # Calculate trends
    trend_data = calculate_mood_trend(mood_events)
    
    return {
        "user_id": user_id,
        "period_days": days,
        "total_events": len(mood_events),
        "events": [serialize_doc(event) for event in mood_events],
        "analysis": trend_data
    }

@router.get("/analytics/{user_id}")
async def get_mood_analytics(user_id: str, period: str = "week"):
    """
    Get comprehensive mood analytics
    period: 'day', 'week', 'month', 'all'
    """
    mood_events_collection = get_mood_events_collection()
    
    # Calculate date range
    period_map = {
        "day": 1,
        "week": 7,
        "month": 30,
        "all": 365 * 10  # 10 years max
    }
    days = period_map.get(period, 7)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get events
    events = await mood_events_collection.find({
        "user_id": user_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1).to_list(length=10000)
    
    if not events:
        return {
            "user_id": user_id,
            "period": period,
            "message": "No mood data available"
        }
    
    # Calculate various metrics
    moods = [e.get("sentiment", "neutral") for e in events]
    mood_counts = {}
    for mood in moods:
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
    
    # Risk analysis
    suicide_risks = sum(1 for e in events if e.get("suicide_risk", False))
    self_harm_risks = sum(1 for e in events if e.get("self_harm_risk", False))
    
    # Time-based patterns
    hourly_distribution = {}
    for event in events:
        hour = event["timestamp"].hour
        hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1
    
    # Mood progression
    positive_moods = ["happy", "calm", "joy"]
    negative_moods = ["sad", "angry", "anxious"]
    
    positive_count = sum(mood_counts.get(m, 0) for m in positive_moods)
    negative_count = sum(mood_counts.get(m, 0) for m in negative_moods)
    
    wellness_score = (positive_count / len(events)) * 100 if events else 0
    
    return {
        "user_id": user_id,
        "period": period,
        "total_events": len(events),
        "mood_distribution": mood_counts,
        "wellness_score": round(wellness_score, 1),
        "risk_indicators": {
            "suicide_risks": suicide_risks,
            "self_harm_risks": self_harm_risks,
            "total_concerning_events": suicide_risks + self_harm_risks
        },
        "time_patterns": {
            "most_active_hour": max(hourly_distribution, key=hourly_distribution.get) if hourly_distribution else None,
            "hourly_distribution": hourly_distribution
        },
        "recommendations": get_recommendations(wellness_score, suicide_risks, self_harm_risks)
    }

@router.get("/aggregate")
async def get_mood_aggregate(time_window: int = 10):
    """
    Get aggregated mood data (sliding window analysis)
    Used for detecting patterns across all users (anonymized)
    """
    mood_events_collection = get_mood_events_collection()
    
    start_time = datetime.utcnow() - timedelta(minutes=time_window)
    
    # Aggregate recent mood events
    recent_events = await mood_events_collection.find({
        "timestamp": {"$gte": start_time}
    }).to_list(length=10000)
    
    # Count sentiments
    sentiment_counts = {}
    risk_events = 0
    
    for event in recent_events:
        sentiment = event.get("sentiment", "neutral")
        sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
        
        if event.get("suicide_risk") or event.get("self_harm_risk"):
            risk_events += 1
    
    # Community wellness indicator
    total_events = len(recent_events)
    positive_events = sentiment_counts.get("happy", 0) + sentiment_counts.get("calm", 0)
    community_wellness = (positive_events / total_events * 100) if total_events > 0 else 0
    
    return {
        "time_window_minutes": time_window,
        "total_events": total_events,
        "sentiment_distribution": sentiment_counts,
        "risk_events": risk_events,
        "community_wellness_score": round(community_wellness, 1),
        "timestamp": datetime.utcnow()
    }

@router.post("/avatar-update")
async def update_avatar_from_analysis(user_id: str, sentiment: str, confidence: float):
    """
    Update user's avatar based on mood analysis
    Called automatically after sentiment analysis
    """
    avatars_collection = get_avatars_collection()
    mood_events_collection = get_mood_events_collection()
    
    # Get avatar configuration
    avatar_config = format_avatar_animation(sentiment)
    avatar_config["mood"] = sentiment
    avatar_config["mood_confidence"] = confidence
    avatar_config["last_updated"] = datetime.utcnow()
    
    # Update avatar
    result = await avatars_collection.update_one(
        {"user_id": user_id},
        {"$set": avatar_config}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Record mood event
    mood_event = {
        "user_id": user_id,
        "sentiment": sentiment,
        "confidence": confidence,
        "timestamp": datetime.utcnow()
    }
    await mood_events_collection.insert_one(mood_event)
    
    return {
        "message": "Avatar updated successfully",
        "avatar_state": avatar_config
    }

@router.get("/support-check/{user_id}")
async def check_support_needs(user_id: str):
    """
    Check if user needs support based on recent mood patterns
    Returns support recommendations
    """
    mood_events_collection = get_mood_events_collection()
    
    # Get recent events (last 24 hours)
    recent_events = await mood_events_collection.find({
        "user_id": user_id,
        "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
    }).sort("timestamp", -1).to_list(length=100)
    
    if not recent_events:
        return {
            "user_id": user_id,
            "needs_support": False,
            "message": "No recent activity"
        }
    
    # Analyze patterns
    trend_data = calculate_mood_trend(recent_events)
    
    needs_intervention = trend_data.get("needs_intervention", False)
    concern_level = trend_data.get("concern_level", "none")
    
    response = {
        "user_id": user_id,
        "needs_support": needs_intervention,
        "concern_level": concern_level,
        "recent_mood": trend_data.get("average_sentiment", "neutral"),
        "trend": trend_data.get("trend", "stable")
    }
    
    if needs_intervention:
        response["recommended_actions"] = [
            "Reach out to a professional",
            "Connect with support community",
            "Call crisis hotline: 876-XXX-XXXX"
        ]
        response["support_message"] = "Mi deh yah wid yuh. Yuh nuh haffi face dis alone. Please reach out fi help."
    
    return response

def get_support_message(mood: str, language: str, high_risk: bool = False) -> str:
    """Generate culturally appropriate support message"""
    if high_risk:
        messages = {
            "en": "I'm really concerned about you. Please reach out to someone you trust or call the crisis line: 876-XXX-XXXX. You matter.",
            "patois": "Mi really worried bout yuh. Please reach out to somebody yuh trust or call di crisis line: 876-XXX-XXXX. Yuh life matter."
        }
        return messages.get(language, messages["en"])
    
    mood_messages = {
        "sad": {
            "en": "I hear you. It's okay to feel this way. You're not alone.",
            "patois": "Mi hear yuh. It alright fi feel suh. Yuh nuh alone."
        },
        "angry": {
            "en": "I understand you're upset. Take your time to breathe.",
            "patois": "Mi understand seh yuh vex. Tek yuh time and breathe."
        },
        "anxious": {
            "en": "I'm here with you. Let's take this one step at a time.",
            "patois": "Mi deh yah wid yuh. Mek wi tek it one step at a time."
        }
    }
    
    return mood_messages.get(mood, {}).get(language, "I'm here for you.")

def get_recommendations(wellness_score: float, suicide_risks: int, self_harm_risks: int) -> List[str]:
    """Generate personalized recommendations"""
    recommendations = []
    
    if suicide_risks > 0 or self_harm_risks > 2:
        recommendations.append("⚠️ Please reach out to a mental health professional immediately")
        recommendations.append("Consider calling crisis hotline: 876-XXX-XXXX")
    
    if wellness_score < 30:
        recommendations.append("Connect with support communities")
        recommendations.append("Try daily mood journaling")
        recommendations.append("Reach out to friends or send an avatar jump")
    elif wellness_score < 60:
        recommendations.append("Keep engaging with positive activities")
        recommendations.append("Consider professional support")
    else:
        recommendations.append("You're doing great! Keep up the positive momentum")
        recommendations.append("Share your avatar with friends who might need support")
    
    return recommendations