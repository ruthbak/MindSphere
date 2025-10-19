# database/schemas.py

"""
MongoDB Schema Documentation
This file documents the structure of all MongoDB collections
"""

# Users Collection
users_schema = {
    "_id": "ObjectId",  # Auto-generated
    "username": "string",  # Unique username
    "display_name": "string",  # Optional display name
    "anonymous_mode": "boolean",  # Whether user prefers anonymity
    "language_preference": "string",  # 'en' or 'patois'
    "created_at": "datetime",
    "last_active": "datetime"
}

# Avatars Collection
avatars_schema = {
    "_id": "ObjectId",
    "user_id": "string",  # Reference to user
    "color": "string",  # Current avatar color (blue, yellow, gray, red, etc.)
    "posture": "string",  # standing, slouched, etc.
    "accessories": ["array of strings"],  # sunshine_badge, etc.
    "animation": "string",  # idle, bounce, tense, etc.
    "mood": "string",  # happy, sad, angry, calm, neutral
    "last_updated": "datetime"
}

# Messages Collection
messages_schema = {
    "_id": "ObjectId",
    "sender_id": "string",  # Reference to user
    "recipient_id": "string",  # For DMs (optional)
    "community_id": "string",  # For community messages (optional)
    "content": "string",  # Message text
    "message_type": "string",  # text, voice, avatar_jump
    "timestamp": "datetime",
    "analyzed": "boolean",  # Whether sentiment analysis was performed
    "analysis": {  # Analysis results (optional)
        "sentiment": "string",
        "confidence": "float",
        "suicide_risk": "boolean",
        "self_harm_risk": "boolean"
    }
}

# Communities Collection
communities_schema = {
    "_id": "ObjectId",
    "name": "string",  # Community name
    "topic": "string",  # anxiety, grief, youth, etc.
    "description": "string",
    "anonymous_allowed": "boolean",
    "created_at": "datetime",
    "members": ["array of user_ids"]
}

# Violence Reports Collection
violence_reports_schema = {
    "_id": "ObjectId",
    "content": "string",  # Report description
    "location": "string",  # Optional location
    "report_type": "string",  # domestic, gang, firearms, murder, planned
    "urgency": "string",  # low, medium, high, critical
    "anonymous": "boolean",
    "voice_note_url": "string",  # Optional voice recording
    "timestamp": "datetime",
    "extracted_entities": {
        "locations": ["array"],
        "times": ["array"],
        "persons": ["array"],
        "organizations": ["array"]
    },
    "urgency_score": "float",  # 0.0 to 1.0
    "status": "string",  # pending, reviewed, escalated, resolved
    "routed_to": ["array"],  # JCF, PMI, NGO, etc.
    "metadata_scrubbed": "boolean"
}

# Professionals Collection
professionals_schema = {
    "_id": "ObjectId",
    "name": "string",
    "profession": "string",  # psychologist, doctor, social_worker, police
    "credentials": "string",
    "availability": ["array of time slots"],
    "contact_methods": ["array"],  # chat, call, video, in_person
    "created_at": "datetime",
    "verified": "boolean"
}

# Mood Events Collection
mood_events_schema = {
    "_id": "ObjectId",
    "user_id": "string",  # Reference to user
    "sentiment": "string",  # joy, sad, angry, calm, neutral
    "suicide_risk": "boolean",
    "self_harm_risk": "boolean",
    "message_id": "string",  # Reference to triggering message
    "timestamp": "datetime"
}

# Avatar Jump Events (stored in messages with special type)
avatar_jump_schema = {
    "_id": "ObjectId",
    "sender_id": "string",
    "recipient_id": "string",
    "message": "string",  # Accompanying message
    "avatar_state": {  # Snapshot of sender's avatar
        "color": "string",
        "posture": "string",
        "accessories": ["array"],
        "animation": "string",
        "mood": "string"
    },
    "timestamp": "datetime",
    "viewed": "boolean",
    "emotional_impact": "float"  # Tracked via ML
}

# Support Sessions Collection (for professional interactions)
support_sessions_schema = {
    "_id": "ObjectId",
    "user_id": "string",
    "professional_id": "string",
    "session_type": "string",  # chat, call, video, in_person
    "scheduled_time": "datetime",
    "duration_minutes": "integer",
    "status": "string",  # scheduled, in_progress, completed, cancelled
    "notes": "string",  # Professional notes (encrypted)
    "created_at": "datetime"
}

# Geolocation Events Collection
geolocation_events_schema = {
    "_id": "ObjectId",
    "user_id": "string",
    "event_type": "string",  # support_request, safety_alert, check_in
    "latitude": "float",
    "longitude": "float",
    "location_name": "string",  # Optional place name
    "timestamp": "datetime",
    "metadata": {}  # Additional context
}