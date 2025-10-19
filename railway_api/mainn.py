# railway_api/main.py

from fastapi import FastAPI, HTTPException, Depends, Header, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import httpx
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MODEL_SERVER_URL = os.getenv("MODEL_SERVER_URL", "http://localhost:8001")
DATABASE_NAME = os.getenv("DATABASE_NAME", "mental_health_app")

# FastAPI app
app = FastAPI(title="Mental Health App - Railway API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB client
client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Collections
users_collection = db["users"]
avatars_collection = db["avatars"]
messages_collection = db["messages"]
communities_collection = db["communities"]
reports_collection = db["violence_reports"]
professionals_collection = db["professionals"]
mood_events_collection = db["mood_events"]

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    display_name: Optional[str] = None
    anonymous_mode: bool = False
    language_preference: str = "en"  # en or patois

class AvatarState(BaseModel):
    user_id: str
    color: str = "blue"
    posture: str = "standing"
    accessories: List[str] = []
    animation: str = "idle"
    mood: str = "neutral"
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    sender_id: str
    recipient_id: Optional[str] = None
    community_id: Optional[str] = None
    content: str
    message_type: str = "text"  # text, voice, avatar_jump

class CommunityCreate(BaseModel):
    name: str
    topic: str
    description: str
    anonymous_allowed: bool = True

class ViolenceReport(BaseModel):
    content: str
    location: Optional[str] = None
    report_type: str  # domestic, gang, firearms, murder, planned
    urgency: Optional[str] = None
    anonymous: bool = True
    voice_note_url: Optional[str] = None

class ProfessionalProfile(BaseModel):
    name: str
    profession: str  # psychologist, doctor, social_worker, police
    credentials: str
    availability: List[str] = []
    contact_methods: List[str] = []

# Helper Functions
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
        logger.error(f"Model server error: {e}")
        raise HTTPException(status_code=503, detail=f"Model server unavailable: {str(e)}")

# Root endpoint
@app.get("/")
async def root():
    return {
        "app": "Mental Health App - Railway API",
        "status": "running",
        "model_server": MODEL_SERVER_URL
    }

# Health check
@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {str(e)}")

# User Management
@app.post("/users")
async def create_user(user: UserCreate):
    user_doc = user.dict()
    user_doc["created_at"] = datetime.utcnow()
    result = await users_collection.insert_one(user_doc)
    
    # Create default avatar
    avatar = AvatarState(user_id=str(result.inserted_id))
    await avatars_collection.insert_one(avatar.dict())
    
    return {"user_id": str(result.inserted_id), "message": "User created successfully"}

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

# Avatar Management
@app.get("/avatars/{user_id}")
async def get_avatar(user_id: str):
    avatar = await avatars_collection.find_one({"user_id": user_id})
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    return serialize_doc(avatar)

@app.put("/avatars/{user_id}")
async def update_avatar(user_id: str, avatar: AvatarState):
    avatar_doc = avatar.dict()
    avatar_doc["last_updated"] = datetime.utcnow()
    
    result = await avatars_collection.update_one(
        {"user_id": user_id},
        {"$set": avatar_doc},
        upsert=True
    )
    return {"message": "Avatar updated successfully"}

@app.post("/avatars/jump")
async def avatar_jump(sender_id: str, recipient_id: str, message: str):
    """Send avatar remotely to another user"""
    sender_avatar = await avatars_collection.find_one({"user_id": sender_id})
    if not sender_avatar:
        raise HTTPException(status_code=404, detail="Sender avatar not found")
    
    jump_event = {
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "message": message,
        "avatar_state": serialize_doc(sender_avatar),
        "timestamp": datetime.utcnow()
    }
    
    await messages_collection.insert_one(jump_event)
    
    # TODO: Send push notification to recipient
    
    return {"message": "Avatar jumped successfully", "event": serialize_doc(jump_event)}

# Messaging
@app.post("/messages")
async def send_message(message: MessageCreate):
    message_doc = message.dict()
    message_doc["timestamp"] = datetime.utcnow()
    message_doc["analyzed"] = False
    
    result = await messages_collection.insert_one(message_doc)
    message_id = str(result.inserted_id)
    
    # Analyze sentiment and update avatar
    if message.message_type == "text":
        try:
            analysis = await forward_to_model_server("/analyze", {
                "text": message.content,
                "language": "patois"
            })
            
            # Update avatar based on sentiment
            if "sentiment" in analysis:
                await update_avatar_from_sentiment(message.sender_id, analysis)
            
            # Store mood event
            mood_event = {
                "user_id": message.sender_id,
                "sentiment": analysis.get("sentiment", "neutral"),
                "suicide_risk": analysis.get("suicide_risk", False),
                "self_harm_risk": analysis.get("self_harm_risk", False),
                "message_id": message_id,
                "timestamp": datetime.utcnow()
            }
            await mood_events_collection.insert_one(mood_event)
            
            # Update message as analyzed
            await messages_collection.update_one(
                {"_id": ObjectId(message_id)},
                {"$set": {"analyzed": True, "analysis": analysis}}
            )
            
        except Exception as e:
            logger.error(f"Analysis error: {e}")
    
    return {"message_id": message_id, "status": "sent"}

@app.get("/messages/{user_id}")
async def get_messages(user_id: str, limit: int = 50):
    messages = await messages_collection.find({
        "$or": [
            {"sender_id": user_id},
            {"recipient_id": user_id}
        ]
    }).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    return [serialize_doc(msg) for msg in messages]

async def update_avatar_from_sentiment(user_id: str, analysis: dict):
    """Update avatar state based on sentiment analysis"""
    sentiment = analysis.get("sentiment", "neutral")
    
    avatar_updates = {}
    
    if sentiment == "joy" or sentiment == "happy":
        avatar_updates = {"color": "yellow", "animation": "bounce", "mood": "happy"}
    elif sentiment == "sad":
        avatar_updates = {"color": "gray", "posture": "slouched", "mood": "sad"}
    elif sentiment == "angry":
        avatar_updates = {"color": "red", "animation": "tense", "mood": "angry"}
    elif sentiment == "calm":
        avatar_updates = {"color": "blue", "posture": "standing", "mood": "calm"}
    
    if avatar_updates:
        avatar_updates["last_updated"] = datetime.utcnow()
        await avatars_collection.update_one(
            {"user_id": user_id},
            {"$set": avatar_updates}
        )

# Communities
@app.post("/communities")
async def create_community(community: CommunityCreate):
    community_doc = community.dict()
    community_doc["created_at"] = datetime.utcnow()
    community_doc["members"] = []
    
    result = await communities_collection.insert_one(community_doc)
    return {"community_id": str(result.inserted_id)}

@app.get("/communities")
async def list_communities():
    communities = await communities_collection.find().to_list(length=100)
    return [serialize_doc(c) for c in communities]

@app.post("/communities/{community_id}/join")
async def join_community(community_id: str, user_id: str):
    await communities_collection.update_one(
        {"_id": ObjectId(community_id)},
        {"$addToSet": {"members": user_id}}
    )
    return {"message": "Joined community successfully"}

@app.get("/communities/{community_id}/messages")
async def get_community_messages(community_id: str, limit: int = 50):
    messages = await messages_collection.find({
        "community_id": community_id
    }).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    return [serialize_doc(msg) for msg in messages]

# Violence Reporting
@app.post("/reports")
async def submit_report(report: ViolenceReport):
    # Extract entities using NLP
    try:
        extraction = await forward_to_model_server("/extract", {
            "text": report.content,
            "report_type": report.report_type
        })
        
        report_doc = report.dict()
        report_doc["timestamp"] = datetime.utcnow()
        report_doc["extracted_entities"] = extraction.get("entities", {})
        report_doc["urgency_score"] = extraction.get("urgency_score", 0)
        report_doc["status"] = "pending"
        report_doc["routed_to"] = []
        
        # Route based on urgency
        if report_doc["urgency_score"] > 0.8:
            report_doc["routed_to"].append("JCF")
        elif report_doc["urgency_score"] > 0.5:
            report_doc["routed_to"].append("PMI")
        
        result = await reports_collection.insert_one(report_doc)
        
        return {
            "report_id": str(result.inserted_id),
            "message": "Yuh brave. Yuh help protect di community.",
            "urgency": report_doc["urgency_score"]
        }
        
    except Exception as e:
        logger.error(f"Report processing error: {e}")
        raise HTTPException(status_code=500, detail="Error processing report")

@app.get("/reports")
async def list_reports(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    
    reports = await reports_collection.find(query).sort("timestamp", -1).to_list(length=100)
    return [serialize_doc(r) for r in reports]

# Professional Directory
@app.post("/professionals")
async def create_professional(professional: ProfessionalProfile):
    professional_doc = professional.dict()
    professional_doc["created_at"] = datetime.utcnow()
    professional_doc["verified"] = False
    
    result = await professionals_collection.insert_one(professional_doc)
    return {"professional_id": str(result.inserted_id)}

@app.get("/professionals")
async def list_professionals(profession: Optional[str] = None):
    query = {"verified": True}
    if profession:
        query["profession"] = profession
    
    professionals = await professionals_collection.find(query).to_list(length=100)
    return [serialize_doc(p) for p in professionals]

# Voice transcription
@app.post("/transcribe")
async def transcribe_audio(audio_data: dict):
    """Forward audio to model server for transcription"""
    result = await forward_to_model_server("/transcribe", audio_data)
    return result

# Generate AI response
@app.post("/generate")
async def generate_response(data: dict):
    """Forward to model server for AI response generation"""
    result = await forward_to_model_server("/generate", data)
    return result

# Text to speech
@app.post("/speak")
async def text_to_speech(data: dict):
    """Forward to model server for TTS"""
    result = await forward_to_model_server("/speak", data)
    return result

# Mood analytics
@app.get("/mood/history/{user_id}")
async def get_mood_history(user_id: str, days: int = 7):
    from datetime import timedelta
    start_date = datetime.utcnow() - timedelta(days=days)
    
    mood_events = await mood_events_collection.find({
        "user_id": user_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1).to_list(length=1000)
    
    return [serialize_doc(event) for event in mood_events]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)