# railway_api/routes/chatbot.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import logging

from database import get_database
from utils import serialize_doc, forward_to_model_server

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])

# ===== PYDANTIC MODELS =====

class ChatMessage(BaseModel):
    user_id: str
    message: str
    language: str = "en"
    context: Optional[str] = None
    session_id: Optional[str] = None
    
    @validator('message')
    def validate_message(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Message cannot be empty')
        if len(v) > 5000:
            raise ValueError('Message too long (max 5000 characters)')
        return v.strip()
    
    @validator('language')
    def validate_language(cls, v):
        if v not in ['en', 'patois']:
            raise ValueError('Language must be "en" or "patois"')
        return v

class VoiceMessage(BaseModel):
    user_id: str
    audio_base64: str
    language: str = "en"
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sentiment_analysis: Optional[dict] = None
    suggestions: Optional[List[str]] = None
    audio_response: Optional[str] = None  # Base64 encoded audio

# ===== HELPER FUNCTIONS =====

async def get_conversation_history(user_id: str, session_id: Optional[str] = None, limit: int = 5):
    """Get recent conversation history for context"""
    db = get_database()
    chat_history_collection = db["chat_history"]
    
    query = {"user_id": user_id}
    if session_id:
        query["session_id"] = session_id
    
    history = await chat_history_collection.find(query)\
        .sort("timestamp", -1)\
        .limit(limit)\
        .to_list(length=limit)
    
    # Reverse to get chronological order
    return list(reversed(history))

async def save_chat_message(user_id: str, message: str, response: str, session_id: str, 
                            sentiment: dict = None, language: str = "en"):
    """Save chat message to database"""
    db = get_database()
    chat_history_collection = db["chat_history"]
    
    chat_doc = {
        "user_id": user_id,
        "session_id": session_id,
        "user_message": message,
        "bot_response": response,
        "sentiment_analysis": sentiment,
        "language": language,
        "timestamp": datetime.utcnow()
    }
    
    result = await chat_history_collection.insert_one(chat_doc)
    return str(result.inserted_id)

async def check_crisis_indicators(sentiment: dict, user_id: str):
    """Check if message contains crisis indicators and create alert"""
    if sentiment.get("suicide_risk") or sentiment.get("self_harm_risk"):
        db = get_database()
        crisis_alerts_collection = db["crisis_alerts"]
        
        alert = {
            "user_id": user_id,
            "alert_type": "crisis_detected",
            "suicide_risk": sentiment.get("suicide_risk", False),
            "self_harm_risk": sentiment.get("self_harm_risk", False),
            "sentiment": sentiment.get("sentiment", "unknown"),
            "source": "chatbot",
            "timestamp": datetime.utcnow(),
            "status": "pending"
        }
        
        await crisis_alerts_collection.insert_one(alert)
        logger.warning(f"Crisis alert created for user {user_id}")

def generate_suggestions(sentiment: dict, language: str = "en") -> List[str]:
    """Generate contextual suggestions based on sentiment"""
    suggestions_en = {
        "anxious": [
            "Try a breathing exercise",
            "Talk to someone you trust",
            "Write in your journal",
            "Join a support community"
        ],
        "sad": [
            "Connect with a friend",
            "Practice self-compassion",
            "Write about your feelings",
            "Explore professional support"
        ],
        "angry": [
            "Take a moment to breathe",
            "Go for a walk",
            "Express your feelings safely",
            "Practice grounding techniques"
        ],
        "happy": [
            "Share your joy with others",
            "Journal about this moment",
            "Practice gratitude",
            "Keep up the positive momentum"
        ],
        "neutral": [
            "Check in with yourself",
            "Set a small goal for today",
            "Practice mindfulness",
            "Connect with your support system"
        ]
    }
    
    suggestions_patois = {
        "anxious": [
            "Try some breathing exercise",
            "Talk to somebody yuh trust",
            "Write inna yuh journal",
            "Join a support group"
        ],
        "sad": [
            "Link up wid a friend",
            "Be kind to yuhself",
            "Write bout how yuh feel",
            "Check out professional help"
        ],
        "angry": [
            "Tek a moment fi breathe",
            "Go fi a walk",
            "Express yuh feelings safe",
            "Practice grounding techniques"
        ],
        "happy": [
            "Share yuh joy wid people",
            "Write bout dis moment",
            "Give thanks",
            "Keep up di good vibes"
        ],
        "neutral": [
            "Check in wid yuhself",
            "Set a small goal fi today",
            "Practice mindfulness",
            "Connect wid yuh support system"
        ]
    }
    
    suggestions = suggestions_patois if language == "patois" else suggestions_en
    mood = sentiment.get("sentiment", "neutral")
    
    return suggestions.get(mood, suggestions["neutral"])

# ===== ENDPOINTS =====

@router.post("/chat", response_model=ChatResponse)
async def chat_with_bot(chat: ChatMessage):
    """Send a message to the AI chatbot"""
    
    session_id = chat.session_id or str(ObjectId())
    
    try:
        # 1. Analyze sentiment of user message
        logger.info(f"Analyzing sentiment for user {chat.user_id}...")
        
        try:
            sentiment_analysis = await forward_to_model_server("/analyze", {
                "text": chat.message,
                "language": chat.language
            })
            logger.info(f"Sentiment analysis successful: {sentiment_analysis.get('sentiment')}")
        except Exception as e:
            logger.error(f"❌ Sentiment analysis failed: {e}")
            raise  # Re-raise to see full error
        
        # 2. Check for crisis indicators
        await check_crisis_indicators(sentiment_analysis, chat.user_id)
        
        # 3. Get conversation history for context
        logger.info(f"Fetching conversation history...")
        history = await get_conversation_history(chat.user_id, session_id, limit=5)
        
        # Build context from history
        context_messages = []
        for msg in history:
            context_messages.append(f"User: {msg['user_message']}")
            context_messages.append(f"Bot: {msg['bot_response']}")
        
        conversation_context = "\n".join(context_messages) if context_messages else None
        
        if chat.context:
            conversation_context = f"{conversation_context}\n{chat.context}" if conversation_context else chat.context
        
        # 4. Generate AI response
        logger.info(f"Generating AI response...")
        logger.info(f"Prompt: {chat.message[:100]}...")
        logger.info(f"Context length: {len(conversation_context) if conversation_context else 0}")
        
        try:
            ai_response = await forward_to_model_server("/generate", {
                "prompt": chat.message,
                "context": conversation_context,
                "language": chat.language,
                "max_length": 300
            })
            logger.info(f"✅ AI response generated: {ai_response.get('response')[:100]}...")
        except Exception as e:
            logger.error(f"❌ AI generation failed: {e}")
            raise  # Re-raise to see full error
        
        bot_response = ai_response.get("response", "I'm here to listen. Tell me more.")
        
        # 5. Generate contextual suggestions
        suggestions = generate_suggestions(sentiment_analysis, chat.language)
        
        # 6. Save conversation to database
        logger.info(f"Saving conversation to database...")
        await save_chat_message(
            user_id=chat.user_id,
            message=chat.message,
            response=bot_response,
            session_id=session_id,
            sentiment=sentiment_analysis,
            language=chat.language
        )
        
        logger.info(f"✅ Chat completed successfully for user {chat.user_id}")
        
        return ChatResponse(
            response=bot_response,
            sentiment_analysis=sentiment_analysis,
            suggestions=suggestions[:3]
        )
        
    except Exception as e:
        logger.error(f"❌ CHAT ERROR: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        # Fallback response
        fallback_response = "Mi deh yah fi yuh. Wah else pon yuh mind?" if chat.language == "patois" else "I'm here for you. What else is on your mind?"
        
        return ChatResponse(
            response=fallback_response,
            sentiment_analysis=None,
            suggestions=["Try again", "Write in journal", "Talk to someone"]
        )

@router.post("/chat/voice")
async def chat_with_voice(voice_message: VoiceMessage):
    """
    Send voice message to chatbot
    - Transcribes audio to text
    - Processes message
    - Returns text and audio response
    """
    session_id = voice_message.session_id or str(ObjectId())
    
    try:
        # 1. Transcribe audio
        transcription = await forward_to_model_server("/transcribe", {
            "audio_base64": voice_message.audio_base64,
            "language": voice_message.language
        })
        
        user_message = transcription.get("text", "")
        
        if not user_message:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        
        # 2. Analyze sentiment
        sentiment_analysis = await forward_to_model_server("/analyze", {
            "text": user_message,
            "language": voice_message.language
        })
        
        # 3. Check crisis indicators
        await check_crisis_indicators(sentiment_analysis, voice_message.user_id)
        
        # 4. Get conversation context
        history = await get_conversation_history(voice_message.user_id, session_id, limit=5)
        
        context_messages = []
        for msg in history:
            context_messages.append(f"User: {msg['user_message']}")
            context_messages.append(f"Bot: {msg['bot_response']}")
        
        conversation_context = "\n".join(context_messages) if context_messages else None
        
        # 5. Generate response
        ai_response = await forward_to_model_server("/generate", {
            "prompt": user_message,
            "context": conversation_context,
            "language": voice_message.language,
            "max_length": 200
        })
        
        bot_response = ai_response.get("response", "I'm listening.")
        
        # 6. Generate audio response
        try:
            audio_response = await forward_to_model_server("/speak", {
                "text": bot_response,
                "language": voice_message.language
            })
            audio_base64 = audio_response.get("audio_base64")
        except Exception as e:
            logger.error(f"TTS error: {e}")
            audio_base64 = None
        
        # 7. Generate suggestions
        suggestions = generate_suggestions(sentiment_analysis, voice_message.language)
        
        # 8. Save conversation
        await save_chat_message(
            user_id=voice_message.user_id,
            message=user_message,
            response=bot_response,
            session_id=session_id,
            sentiment=sentiment_analysis,
            language=voice_message.language
        )
        
        return {
            "transcription": user_message,
            "response": bot_response,
            "audio_response": audio_base64,
            "sentiment_analysis": sentiment_analysis,
            "suggestions": suggestions[:3]
        }
        
    except Exception as e:
        logger.error(f"Voice chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice chat failed: {str(e)}")

@router.get("/chat/history/{user_id}")
async def get_chat_history(
    user_id: str,
    session_id: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get chat history for a user"""
    db = get_database()
    chat_history_collection = db["chat_history"]
    
    query = {"user_id": user_id}
    if session_id:
        query["session_id"] = session_id
    
    total = await chat_history_collection.count_documents(query)
    
    history = await chat_history_collection.find(query)\
        .sort("timestamp", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(length=limit)
    
    return {
        "history": [serialize_doc(msg) for msg in history],
        "total": total,
        "has_more": (skip + limit) < total
    }

@router.get("/chat/sessions/{user_id}")
async def get_chat_sessions(user_id: str):
    """Get all chat sessions for a user"""
    db = get_database()
    chat_history_collection = db["chat_history"]
    
    # Aggregate to get unique sessions with metadata
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$first": "$timestamp"},
            "message_count": {"$sum": 1},
            "last_user_message": {"$first": "$user_message"},
            "last_sentiment": {"$first": "$sentiment_analysis"}
        }},
        {"$sort": {"last_message": -1}},
        {"$limit": 20}
    ]
    
    sessions = await chat_history_collection.aggregate(pipeline).to_list(length=20)
    
    return {
        "sessions": [
            {
                "session_id": str(session["_id"]),
                "last_message": session["last_message"],
                "message_count": session["message_count"],
                "preview": session["last_user_message"][:50] + "..." if len(session["last_user_message"]) > 50 else session["last_user_message"],
                "last_sentiment": session.get("last_sentiment", {}).get("sentiment", "neutral")
            }
            for session in sessions
        ]
    }

@router.delete("/chat/session/{session_id}")
async def delete_chat_session(session_id: str, user_id: str):
    """Delete a specific chat session"""
    db = get_database()
    chat_history_collection = db["chat_history"]
    
    result = await chat_history_collection.delete_many({
        "session_id": session_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "message": "Chat session deleted successfully",
        "messages_deleted": result.deleted_count
    }

@router.get("/chat/crisis-alerts/{user_id}")
async def get_crisis_alerts(user_id: str, status: Optional[str] = None):
    """Get crisis alerts for a user"""
    db = get_database()
    crisis_alerts_collection = db["crisis_alerts"]
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    alerts = await crisis_alerts_collection.find(query)\
        .sort("timestamp", -1)\
        .limit(10)\
        .to_list(length=10)
    
    return {
        "alerts": [serialize_doc(alert) for alert in alerts],
        "count": len(alerts)
    }

@router.put("/chat/crisis-alert/{alert_id}/acknowledge")
async def acknowledge_crisis_alert(alert_id: str):
    """Mark a crisis alert as acknowledged"""
    db = get_database()
    crisis_alerts_collection = db["crisis_alerts"]
    
    result = await crisis_alerts_collection.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {
            "status": "acknowledged",
            "acknowledged_at": datetime.utcnow()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Crisis alert acknowledged"}

@router.post("/chat/feedback")
async def submit_chat_feedback(
    user_id: str,
    session_id: str,
    message_id: str,
    rating: int,
    feedback: Optional[str] = None
):
    """Submit feedback on chatbot responses"""
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    db = get_database()
    feedback_collection = db["chat_feedback"]
    
    feedback_doc = {
        "user_id": user_id,
        "session_id": session_id,
        "message_id": message_id,
        "rating": rating,
        "feedback": feedback,
        "timestamp": datetime.utcnow()
    }
    
    result = await feedback_collection.insert_one(feedback_doc)
    
    return {
        "message": "Feedback submitted successfully",
        "feedback_id": str(result.inserted_id)
    }

@router.get("/chat/suggestions")
async def get_conversation_starters(language: str = "en", mood: Optional[str] = None):
    """Get conversation starter suggestions"""
    
    starters_en = {
        "general": [
            "I'm feeling overwhelmed and need to talk",
            "Can you help me process my thoughts?",
            "I'd like some coping strategies",
            "Tell me about mindfulness techniques"
        ],
        "anxious": [
            "I'm feeling anxious and don't know what to do",
            "My anxiety is really high right now",
            "Can you guide me through a calming exercise?",
            "Help me understand my anxiety"
        ],
        "sad": [
            "I'm feeling really down today",
            "Everything feels hopeless",
            "I need some encouragement",
            "Help me find reasons to keep going"
        ],
        "happy": [
            "I'm having a good day and want to share",
            "Things are going well for me",
            "I achieved something today",
            "I'm feeling grateful"
        ]
    }
    
    starters_patois = {
        "general": [
            "Mi feel overwhelmed an need fi talk",
            "Yuh can help mi process mi thoughts?",
            "Mi need some coping strategies",
            "Tell mi bout mindfulness techniques"
        ],
        "anxious": [
            "Mi feel anxious an nuh know wah fi do",
            "Mi anxiety really high right now",
            "Guide mi through a calming exercise?",
            "Help mi understand mi anxiety"
        ],
        "sad": [
            "Mi feel really down today",
            "Everything feel hopeless",
            "Mi need some encouragement",
            "Help mi find reasons fi keep gwaan"
        ],
        "happy": [
            "Mi a have a good day an waan share",
            "Tings a gwaan good fi mi",
            "Mi achieve something today",
            "Mi feel grateful"
        ]
    }
    
    starters = starters_patois if language == "patois" else starters_en
    
    if mood and mood in starters:
        return {"starters": starters[mood]}
    
    return {"starters": starters["general"]}