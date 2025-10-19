# railway_api/models.py

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums
class LanguagePreference(str, Enum):
    ENGLISH = "en"
    PATOIS = "patois"

class MessageType(str, Enum):
    TEXT = "text"
    VOICE = "voice"
    AVATAR_JUMP = "avatar_jump"

class ReportType(str, Enum):
    DOMESTIC = "domestic"
    GANG = "gang"
    FIREARMS = "firearms"
    MURDER = "murder"
    PLANNED = "planned"

class ProfessionType(str, Enum):
    PSYCHOLOGIST = "psychologist"
    DOCTOR = "doctor"
    SOCIAL_WORKER = "social_worker"
    POLICE = "police"

class ReportStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    ESCALATED = "escalated"
    RESOLVED = "resolved"

# User Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    display_name: Optional[str] = None
    anonymous_mode: bool = False
    language_preference: LanguagePreference = LanguagePreference.ENGLISH
    
    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError('Username must be alphanumeric (underscores allowed)')
        return v.lower()

class UserResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str]
    anonymous_mode: bool
    language_preference: str
    created_at: datetime
    
    class Config:
        from_attributes = True  # Updated for Pydantic V2

# Avatar Models
class AvatarState(BaseModel):
    user_id: str
    color: str = "blue"
    posture: str = "standing"
    accessories: List[str] = []
    animation: str = "idle"
    mood: str = "neutral"
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    @validator('color')
    def validate_color(cls, v):
        allowed_colors = ['blue', 'yellow', 'gray', 'red', 'purple', 'green', 'orange']
        if v not in allowed_colors:
            raise ValueError(f'Color must be one of: {", ".join(allowed_colors)}')
        return v
    
    @validator('mood')
    def validate_mood(cls, v):
        allowed_moods = ['happy', 'sad', 'angry', 'anxious', 'calm', 'neutral']
        if v not in allowed_moods:
            raise ValueError(f'Mood must be one of: {", ".join(allowed_moods)}')
        return v

class AvatarUpdate(BaseModel):
    color: Optional[str] = None
    posture: Optional[str] = None
    accessories: Optional[List[str]] = None
    animation: Optional[str] = None
    mood: Optional[str] = None

class AvatarJumpRequest(BaseModel):
    sender_id: str
    recipient_id: str
    message: str = Field(..., max_length=500)

# Message Models
class MessageCreate(BaseModel):
    sender_id: str
    recipient_id: Optional[str] = None
    community_id: Optional[str] = None
    content: str = Field(..., max_length=5000)
    message_type: MessageType = MessageType.TEXT
    
    @validator('content')
    def validate_content(cls, v):
        if not v.strip():
            raise ValueError('Content cannot be empty')
        return v

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    recipient_id: Optional[str]
    community_id: Optional[str]
    content: str
    message_type: str
    timestamp: datetime
    analysis: Optional[dict] = None
    
    class Config:
        from_attributes = True  # Updated for Pydantic V2

# Community Models
class CommunityCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    topic: str = Field(..., max_length=50)
    description: str = Field(..., max_length=1000)
    anonymous_allowed: bool = True

class CommunityResponse(BaseModel):
    id: str
    name: str
    topic: str
    description: str
    anonymous_allowed: bool
    member_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True  # Updated for Pydantic V2

# Violence Report Models
class ViolenceReportCreate(BaseModel):
    content: str = Field(..., min_length=10, max_length=5000)
    location: Optional[str] = None
    report_type: ReportType
    anonymous: bool = True
    voice_note_url: Optional[str] = None

class ViolenceReportResponse(BaseModel):
    id: str
    report_type: str
    urgency_score: float
    status: str
    timestamp: datetime
    extracted_entities: dict
    routed_to: List[str]
    
    class Config:
        from_attributes = True  # Updated for Pydantic V2

# Professional Models
class ProfessionalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    profession: ProfessionType
    credentials: str = Field(..., max_length=500)
    availability: List[str] = []
    contact_methods: List[str] = []
    bio: Optional[str] = Field(None, max_length=1000)

class ProfessionalResponse(BaseModel):
    id: str
    name: str
    profession: str
    credentials: str
    availability: List[str]
    contact_methods: List[str]
    verified: bool
    rating: Optional[float] = None
    
    class Config:
        from_attributes = True  # Updated for Pydantic V2

# Support Request Models
class SupportRequestCreate(BaseModel):
    user_id: str
    professional_id: str
    request_type: str = Field(..., pattern="^(chat|call|video|in_person)$")
    preferred_time: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=1000)
    emergency: bool = False

class SupportRequestResponse(BaseModel):
    id: str
    user_id: str
    professional_id: str
    request_type: str
    status: str
    created_at: datetime
    scheduled_time: Optional[datetime]
    
    class Config:
        from_attributes = True  # Updated for Pydantic V2

# Mood Event Models
class MoodEvent(BaseModel):
    user_id: str
    sentiment: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    suicide_risk: bool = False
    self_harm_risk: bool = False
    message_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Geolocation Models
class LocationData(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_name: Optional[str] = None
    radius_km: float = Field(default=5.0, ge=0.1, le=100)

class SupportZoneRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10.0, ge=0.1, le=100)

class RiskAlertRequest(BaseModel):
    latitude: float
    longitude: float

class MapReportRequest(BaseModel):
    latitude: float
    longitude: float
    report_type: ReportType
    description: str
    anonymous: bool = True

# ML Request/Response Models
class TranscriptionRequest(BaseModel):
    audio_base64: str
    language: LanguagePreference = LanguagePreference.ENGLISH

class GenerationRequest(BaseModel):
    prompt: str = Field(..., max_length=2000)
    context: Optional[str] = None
    language: LanguagePreference = LanguagePreference.ENGLISH
    max_length: int = Field(default=200, ge=50, le=500)

class AnalysisRequest(BaseModel):
    text: str = Field(..., max_length=5000)
    language: LanguagePreference = LanguagePreference.ENGLISH

class AnalysisResponse(BaseModel):
    sentiment: str
    confidence: float
    suicide_risk: bool
    self_harm_risk: bool
    needs_support: bool
    recommended_action: Optional[str] = None

# ===== USER MODELS =====

class UserProfile(BaseModel):
    username: str
    email: str
    display_name: Optional[str] = None
    anonymous_mode: bool = False
    language_preference: str = "en"
    
class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    anonymous_mode: Optional[bool] = None
    language_preference: Optional[str] = None
    
    @validator('language_preference')
    def validate_language(cls, v):
        if v and v not in ['en', 'patois']:
            raise ValueError('Language must be "en" or "patois"')
        return v