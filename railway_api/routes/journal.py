# railway_api/routes/journal.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from database import get_journal_entries_collection, get_mood_events_collection, get_avatars_collection
from utils import serialize_doc, forward_to_model_server

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/journal", tags=["Journal"])

# ===== PYDANTIC MODELS =====

class JournalEntry(BaseModel):
    user_id: str
    title: Optional[str] = None
    content: str
    mood: Optional[str] = None
    tags: List[str] = []
    is_private: bool = True
    voice_note_url: Optional[str] = None
    media_urls: List[str] = []
    language: str = "en"
    
    @validator('content')
    def validate_content(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Journal entry cannot be empty')
        if len(v) > 10000:
            raise ValueError('Journal entry too long (max 10,000 characters)')
        return v.strip()
    
    @validator('mood')
    def validate_mood(cls, v):
        if v is not None:
            allowed_moods = ['happy', 'sad', 'anxious', 'calm', 'angry', 'neutral']
            if v not in allowed_moods:
                raise ValueError(f'Mood must be one of: {", ".join(allowed_moods)}')
        return v
    
    @validator('language')
    def validate_language(cls, v):
        if v not in ['en', 'patois']:
            raise ValueError('Language must be "en" or "patois"')
        return v

class JournalUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    mood: Optional[str] = None
    tags: Optional[List[str]] = None
    is_private: Optional[bool] = None
    language: Optional[str] = None
    
    @validator('content')
    def validate_content(cls, v):
        if v is not None:
            if len(v.strip()) == 0:
                raise ValueError('Journal entry cannot be empty')
            if len(v) > 10000:
                raise ValueError('Journal entry too long (max 10,000 characters)')
        return v.strip() if v else None
    
    @validator('mood')
    def validate_mood(cls, v):
        if v is not None:
            allowed_moods = ['happy', 'sad', 'anxious', 'calm', 'angry', 'neutral']
            if v not in allowed_moods:
                raise ValueError(f'Mood must be one of: {", ".join(allowed_moods)}')
        return v

class JournalResponse(BaseModel):
    entry_id: str
    message: str
    analysis: Optional[dict] = None
    recommendations: Optional[List[dict]] = None

# ===== HELPER FUNCTIONS =====

async def update_avatar_from_sentiment(user_id: str, analysis: dict):
    """Update avatar state based on sentiment analysis"""
    avatars_collection = get_avatars_collection()
    sentiment = analysis.get("sentiment", "neutral")
    
    avatar_updates = {}
    
    if sentiment == "happy":
        avatar_updates = {"color": "yellow", "animation": "bounce", "mood": "happy"}
    elif sentiment == "sad":
        avatar_updates = {"color": "gray", "posture": "slouched", "mood": "sad"}
    elif sentiment == "angry":
        avatar_updates = {"color": "red", "animation": "tense", "mood": "angry"}
    elif sentiment == "anxious":
        avatar_updates = {"color": "purple", "animation": "nervous", "mood": "anxious"}
    elif sentiment == "calm":
        avatar_updates = {"color": "blue", "posture": "standing", "mood": "calm"}
    
    if avatar_updates:
        avatar_updates["last_updated"] = datetime.utcnow()
        await avatars_collection.update_one(
            {"user_id": user_id},
            {"$set": avatar_updates},
            upsert=True
        )

# ===== ENDPOINTS =====

@router.post("/create", response_model=JournalResponse)
async def create_journal_entry(entry: JournalEntry):
    """
    Create a new journal entry
    - Stores entry in MongoDB
    - Analyzes content using AI model server
    - Updates user's avatar based on sentiment
    - Creates mood event for tracking
    """
    journal_collection = get_journal_entries_collection()
    mood_events_collection = get_mood_events_collection()
    
    # Prepare entry document
    entry_doc = entry.dict()
    entry_doc["created_at"] = datetime.utcnow()
    entry_doc["updated_at"] = datetime.utcnow()
    entry_doc["analyzed"] = False
    entry_doc["word_count"] = len(entry.content.split())
    
    # Insert entry
    result = await journal_collection.insert_one(entry_doc)
    entry_id = str(result.inserted_id)
    
    # Analyze the journal entry using model server
    analysis = None
    recommendations = []
    
    try:
        analysis = await forward_to_model_server("/analyze/journal", {
            "text": entry.content,
            "language": entry.language
        })
        
        # Store comprehensive analysis
        analysis_data = {
            "sentiment": analysis.get("sentiment", "neutral"),
            "confidence": analysis.get("confidence", 0.0),
            "suicide_risk": analysis.get("suicide_risk", False),
            "self_harm_risk": analysis.get("self_harm_risk", False),
            "needs_support": analysis.get("needs_support", False),
            "mental_health_indicators": analysis.get("mental_health_indicators", {}),
            "positive_indicators": analysis.get("positive_indicators", {}),
            "overall_risk_score": analysis.get("overall_risk_score", 0.0),
            "risk_level": analysis.get("risk_level", "low"),
            "recommendations": analysis.get("recommendations", []),
            "analyzed_at": datetime.utcnow()
        }
        
        recommendations = analysis.get("recommendations", [])
        
        # Update journal entry with analysis
        await journal_collection.update_one(
            {"_id": ObjectId(entry_id)},
            {"$set": {"analyzed": True, "analysis": analysis_data}}
        )
        
        # Create mood event for tracking
        mood_event = {
            "user_id": entry.user_id,
            "sentiment": analysis.get("sentiment", "neutral"),
            "suicide_risk": analysis.get("suicide_risk", False),
            "self_harm_risk": analysis.get("self_harm_risk", False),
            "journal_entry_id": entry_id,
            "source": "journal",
            "timestamp": datetime.utcnow()
        }
        await mood_events_collection.insert_one(mood_event)
        
        # Update avatar based on sentiment
        await update_avatar_from_sentiment(entry.user_id, analysis)
        
        logger.info(f"Journal entry created and analyzed: {entry_id}")
        
    except Exception as e:
        logger.error(f"Journal analysis error: {e}")
        # Entry is still saved, just without analysis
    
    return JournalResponse(
        entry_id=entry_id,
        message="Journal entry created successfully",
        analysis=analysis,
        recommendations=recommendations
    )

@router.get("/entries/{user_id}")
async def get_journal_entries(
    user_id: str,
    limit: int = 20,
    skip: int = 0,
    mood: Optional[str] = None,
    tag: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get journal entries for a user with optional filters
    - Supports pagination (limit, skip)
    - Filter by mood, tags, date range
    """
    journal_collection = get_journal_entries_collection()
    
    # Build query
    query = {"user_id": user_id}
    
    if mood:
        query["mood"] = mood
    
    if tag:
        query["tags"] = tag
    
    # Date range filter
    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                date_query["$gte"] = datetime.fromisoformat(start_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format")
        if end_date:
            try:
                date_query["$lte"] = datetime.fromisoformat(end_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format")
        query["created_at"] = date_query
    
    # Get total count
    total = await journal_collection.count_documents(query)
    
    # Get entries
    entries = await journal_collection.find(query)\
        .sort("created_at", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(length=limit)
    
    return {
        "entries": [serialize_doc(entry) for entry in entries],
        "total": total,
        "limit": limit,
        "skip": skip,
        "has_more": (skip + limit) < total
    }

@router.get("/entry/{entry_id}")
async def get_journal_entry(entry_id: str):
    """Get a specific journal entry by ID"""
    journal_collection = get_journal_entries_collection()
    
    try:
        entry = await journal_collection.find_one({"_id": ObjectId(entry_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid entry ID format")
    
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    return serialize_doc(entry)

@router.put("/update/{entry_id}")
async def update_journal_entry(entry_id: str, update: JournalUpdate):
    """
    Update an existing journal entry
    - Re-analyzes content if changed
    - Updates timestamp
    """
    journal_collection = get_journal_entries_collection()
    
    # Build update data
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    # If content is updated, recalculate word count and re-analyze
    if "content" in update_data:
        update_data["word_count"] = len(update_data["content"].split())
        update_data["analyzed"] = False
        
        # Get the entry to access user_id and language
        try:
            entry = await journal_collection.find_one({"_id": ObjectId(entry_id)})
        except:
            raise HTTPException(status_code=400, detail="Invalid entry ID format")
        
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        # Re-analyze with model server
        try:
            analysis = await forward_to_model_server("/analyze/journal", {
                "text": update_data["content"],
                "language": update_data.get("language", entry.get("language", "en"))
            })
            
            update_data["analysis"] = {
                "sentiment": analysis.get("sentiment", "neutral"),
                "confidence": analysis.get("confidence", 0.0),
                "suicide_risk": analysis.get("suicide_risk", False),
                "self_harm_risk": analysis.get("self_harm_risk", False),
                "needs_support": analysis.get("needs_support", False),
                "mental_health_indicators": analysis.get("mental_health_indicators", {}),
                "positive_indicators": analysis.get("positive_indicators", {}),
                "overall_risk_score": analysis.get("overall_risk_score", 0.0),
                "risk_level": analysis.get("risk_level", "low"),
                "recommendations": analysis.get("recommendations", []),
                "analyzed_at": datetime.utcnow()
            }
            update_data["analyzed"] = True
            
            # Update avatar
            await update_avatar_from_sentiment(entry["user_id"], analysis)
            
        except Exception as e:
            logger.error(f"Re-analysis error: {e}")
    
    # Perform update
    try:
        result = await journal_collection.update_one(
            {"_id": ObjectId(entry_id)},
            {"$set": update_data}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid entry ID format")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    return {
        "message": "Journal entry updated successfully",
        "entry_id": entry_id
    }

@router.delete("/delete/{entry_id}")
async def delete_journal_entry(entry_id: str):
    """Delete a journal entry"""
    journal_collection = get_journal_entries_collection()
    
    try:
        result = await journal_collection.delete_one({"_id": ObjectId(entry_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid entry ID format")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    return {
        "message": "Journal entry deleted successfully",
        "entry_id": entry_id
    }

@router.get("/stats/{user_id}")
async def get_journal_stats(user_id: str, days: int = 30):
    """
    Get journaling statistics and insights for a user
    - Entry count, word count, streaks
    - Mood distribution
    - Risk indicators
    """
    journal_collection = get_journal_entries_collection()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all entries in the time period
    entries = await journal_collection.find({
        "user_id": user_id,
        "created_at": {"$gte": start_date}
    }).to_list(length=1000)
    
    if not entries:
        return {
            "total_entries": 0,
            "period_days": days,
            "message": "No journal entries found in this period"
        }
    
    # Calculate statistics
    total_entries = len(entries)
    total_words = sum(entry.get("word_count", 0) for entry in entries)
    
    # Mood distribution
    mood_counts = {}
    for entry in entries:
        mood = entry.get("mood", "neutral")
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
    
    # Sentiment distribution from analysis
    sentiment_counts = {}
    for entry in entries:
        if "analysis" in entry:
            sentiment = entry["analysis"].get("sentiment", "neutral")
            sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
    
    # Tag frequency
    tag_counts = {}
    for entry in entries:
        for tag in entry.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # Risk indicators
    entries_with_suicide_risk = sum(
        1 for entry in entries
        if entry.get("analysis", {}).get("suicide_risk", False)
    )
    entries_with_self_harm_risk = sum(
        1 for entry in entries
        if entry.get("analysis", {}).get("self_harm_risk", False)
    )
    
    # Journaling streak calculation
    entry_dates = sorted(list(set(entry["created_at"].date() for entry in entries)))
    current_streak = 0
    longest_streak = 0
    temp_streak = 1
    
    for i in range(1, len(entry_dates)):
        if (entry_dates[i] - entry_dates[i-1]).days == 1:
            temp_streak += 1
        else:
            longest_streak = max(longest_streak, temp_streak)
            temp_streak = 1
    longest_streak = max(longest_streak, temp_streak)
    
    # Current streak
    if entry_dates:
        last_entry_date = entry_dates[-1]
        today = datetime.utcnow().date()
        if (today - last_entry_date).days <= 1:
            current_streak = 1
            for i in range(len(entry_dates) - 2, -1, -1):
                if (entry_dates[i+1] - entry_dates[i]).days == 1:
                    current_streak += 1
                else:
                    break
    
    return {
        "total_entries": total_entries,
        "total_words": total_words,
        "average_words_per_entry": round(total_words / total_entries, 1) if total_entries > 0 else 0,
        "mood_distribution": mood_counts,
        "sentiment_distribution": sentiment_counts,
        "top_tags": sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10],
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "risk_indicators": {
            "suicide_risk_entries": entries_with_suicide_risk,
            "self_harm_risk_entries": entries_with_self_harm_risk,
            "needs_attention": entries_with_suicide_risk > 0 or entries_with_self_harm_risk > 0
        },
        "period_days": days,
        "first_entry_date": entries[0]["created_at"] if entries else None,
        "last_entry_date": entries[-1]["created_at"] if entries else None
    }

@router.get("/prompts")
async def get_journal_prompts(
    mood: Optional[str] = None,
    language: str = "en",
    personalized: bool = False,
    user_id: Optional[str] = None
):
    """
    Get journaling prompts to help users write
    - Static prompts by mood and language
    - AI-generated personalized prompts (if personalized=true)
    """
    
    # If personalized prompt requested
    if personalized and user_id:
        journal_collection = get_journal_entries_collection()
        
        try:
            # Get user's recent mood from last entry
            recent_entry = await journal_collection.find_one(
                {"user_id": user_id},
                sort=[("created_at", -1)]
            )
            
            user_mood = mood or (recent_entry.get("mood") if recent_entry else "neutral")
            
            # Get AI-generated personalized prompt
            ai_prompt = await forward_to_model_server("/generate/journal_prompt", {
                "user_mood": user_mood,
                "language": language
            })
            
            return {
                "prompts": [ai_prompt.get("prompt")],
                "type": "personalized",
                "mood": user_mood,
                "source": "ai"
            }
        except Exception as e:
            logger.error(f"Error generating personalized prompt: {e}")
            # Fall through to static prompts
    
    # Static prompts
    prompts_en = {
        "general": [
            "What are three things you're grateful for today?",
            "Describe a moment that made you smile recently.",
            "What challenges did you face today and how did you handle them?",
            "Write about someone who positively impacted your life.",
            "What would you like to accomplish this week?"
        ],
        "happy": [
            "What brought you joy today?",
            "Describe a success you're proud of.",
            "Who made you laugh recently and why?",
            "What's something you're looking forward to?"
        ],
        "sad": [
            "What's weighing on your heart right now?",
            "Write a letter to your future self about how you're feeling.",
            "What comfort do you need right now?",
            "What's one small thing that could make today better?"
        ],
        "anxious": [
            "What worries are on your mind? List them out.",
            "What can you control in this situation?",
            "Describe a time when you overcame anxiety.",
            "What would you tell a friend feeling this way?"
        ],
        "angry": [
            "What triggered your anger? Describe the situation.",
            "How would you like to resolve this feeling?",
            "What boundaries do you need to set?",
            "What's underneath the anger?"
        ],
        "calm": [
            "What's bringing you peace right now?",
            "Describe this moment of calm.",
            "What helped you find this balance?"
        ]
    }
    
    prompts_patois = {
        "general": [
            "Wah three tings yuh grateful fah today?",
            "Tell mi bout a moment weh mek yuh smile recent time.",
            "Wah challenge yuh face today an how yuh deal wid it?",
            "Write bout somebody weh mek yuh life betta.",
            "Wah yuh waan accomplish dis week?"
        ],
        "happy": [
            "Wah bring yuh joy today?",
            "Tell mi bout a success yuh proud of.",
            "Who mek yuh laugh lately an why?",
            "Wah yuh a look forward to?"
        ],
        "sad": [
            "Wah a weigh pon yuh heart right now?",
            "Write a letter to yuhself bout how yuh feel.",
            "Wah comfort yuh need now?",
            "Wah one likkle ting coulda mek today betta?"
        ],
        "anxious": [
            "Wah worries deh pon yuh mind? List dem out.",
            "Wah yuh can control inna dis situation?",
            "Tell mi bout a time when yuh overcome anxiety.",
            "Wah yuh woulda tell a friend weh feel dis way?"
        ],
        "angry": [
            "Wah trigger yuh anger? Describe di situation.",
            "How yuh woulda like fi sort out dis feeling?",
            "Wah boundaries yuh need fi set?",
            "Wah deh under di anger?"
        ],
        "calm": [
            "Wah a bring yuh peace right now?",
            "Describe dis moment of calm.",
            "Wah help yuh find dis balance?"
        ]
    }
    
    prompts = prompts_patois if language == "patois" else prompts_en
    
    if mood and mood in prompts:
        return {"prompts": prompts[mood], "type": "static", "mood": mood}
    
    return {"prompts": prompts.get("general", []), "type": "static"}

@router.get("/insights/{user_id}")
async def get_journal_insights(user_id: str, days: int = 30):
    """
    Get AI-generated insights from journal entries over time
    - Analyzes trends and patterns
    - Provides supportive recommendations
    """
    journal_collection = get_journal_entries_collection()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all entries in the time period
    entries = await journal_collection.find({
        "user_id": user_id,
        "created_at": {"$gte": start_date}
    }).sort("created_at", 1).to_list(length=1000)
    
    if not entries:
        return {
            "message": "No journal entries found in this period",
            "entries_count": 0,
            "period_days": days
        }
    
    # Serialize entries for AI analysis (privacy-safe)
    serialized_entries = []
    for entry in entries:
        serialized_entries.append({
            "created_at": entry["created_at"].isoformat(),
            "mood": entry.get("mood", "neutral"),
            "analysis": entry.get("analysis", {}),
            "word_count": entry.get("word_count", 0)
        })
    
    try:
        # Get AI-generated insights
        insights = await forward_to_model_server("/insights/journal", {
            "user_id": user_id,
            "entries": serialized_entries,
            "time_period_days": days
        })
        
        return {
            "insights": insights.get("insights"),
            "entries_analyzed": len(entries),
            "time_period_days": days,
            "source": "ai_generated"
        }
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        return {
            "message": "Unable to generate AI insights at this time",
            "entries_count": len(entries),
            "time_period_days": days,
            "error": str(e)
        }

@router.get("/search/{user_id}")
async def search_journal_entries(user_id: str, query: str, limit: int = 20):
    """Search journal entries by content, title, or tags"""
    journal_collection = get_journal_entries_collection()
    
    if not query or len(query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Search query too short (min 2 characters)")
    
    # Perform text search
    entries = await journal_collection.find({
        "user_id": user_id,
        "$or": [
            {"content": {"$regex": query, "$options": "i"}},
            {"title": {"$regex": query, "$options": "i"}},
            {"tags": {"$regex": query, "$options": "i"}}
        ]
    }).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {
        "results": [serialize_doc(entry) for entry in entries],
        "count": len(entries),
        "query": query
    }