# railway_api/utils.py

from datetime import datetime, timedelta
from typing import List, Dict, Optional
import re
import httpx
import os
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Model server configuration
MODEL_SERVER_URL = os.getenv("MODEL_SERVER_URL", "http://localhost:8001")

# ===== DOCUMENT SERIALIZATION =====

def serialize_doc(doc):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
        doc["id"] = doc["_id"]  # Add 'id' field for convenience
    return doc

# ===== MODEL SERVER COMMUNICATION =====

async def forward_to_model_server(endpoint: str, data: dict, timeout: Optional[int] = None) -> dict:
    """
    Forward requests to local model server via ngrok tunnel
    
    Args:
        endpoint: API endpoint (e.g., "/analyze/journal")
        data: Request payload
        timeout: Request timeout in seconds (auto-set based on endpoint if None)
    
    Returns:
        Response JSON from model server
    
    Raises:
        HTTPException: If model server is unavailable or request fails
    """
    
    # Set different timeouts for different endpoints
    if timeout is None:
        if any(slow_endpoint in endpoint for slow_endpoint in ["/generate", "/insights/journal", "/generate/journal_prompt"]):
            timeout = 120  # 2 minutes for AI generation endpoints
        elif "/transcribe" in endpoint:
            timeout = 60  # 1 minute for audio transcription
        elif "/speak" in endpoint:
            timeout = 60  # 1 minute for text-to-speech
        else:
            timeout = 30  # 30 seconds for analysis and other endpoints
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            url = f"{MODEL_SERVER_URL}{endpoint}"
            logger.info(f"Forwarding request to model server: {url} (timeout: {timeout}s)")
            
            response = await client.post(url, json=data)
            response.raise_for_status()
            
            logger.info(f"Model server response received from {endpoint}")
            return response.json()
            
    except httpx.TimeoutException:
        logger.error(f"Model server timeout after {timeout}s: {endpoint}")
        raise HTTPException(
            status_code=504,
            detail=f"Model server timeout after {timeout} seconds. The AI is taking longer than expected. Please try again with a shorter message."
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"Model server HTTP error: {e.response.status_code} for {endpoint}")
        raise HTTPException(
            status_code=503,
            detail=f"Model server error: {e.response.status_code}"
        )
    except httpx.ConnectError as e:
        logger.error(f"Cannot connect to model server: {e}")
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to AI model server. Please ensure it's running."
        )
    except Exception as e:
        logger.error(f"Model server communication error for {endpoint}: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Model server unavailable: {str(e)}"
        )

# ===== LANGUAGE DETECTION =====

def is_jamaican_patois(text: str) -> bool:
    """Simple heuristic to detect Jamaican Patois"""
    patois_markers = [
        "mi", "yuh", "dem", "inna", "deh", "di", "fi", "nuh",
        "weh", "wah", "mek", "tek", "suh", "pon", "bout",
        "ting", "gwaan", "dun", "nah", "yah", "ya", "cyaa"
    ]
    
    text_lower = text.lower()
    words = text_lower.split()
    
    # If 20% or more words are Patois markers, consider it Patois
    patois_count = sum(1 for word in words if word in patois_markers)
    
    return len(words) > 0 and (patois_count / len(words)) >= 0.2

# ===== CULTURALLY AWARE RESPONSES =====

def get_culturally_aware_response(sentiment: str, language: str) -> str:
    """Generate culturally appropriate responses"""
    
    responses = {
        "happy": {
            "en": "That's wonderful! I'm glad to hear you're feeling good.",
            "patois": "Dat nice! Mi glad fi hear seh yuh gwaan good."
        },
        "sad": {
            "en": "I hear you. It's okay to feel this way. You're not alone.",
            "patois": "Mi hear yuh. It alright fi feel suh. Yuh nah alone."
        },
        "angry": {
            "en": "I understand you're upset. Take your time to breathe.",
            "patois": "Mi understand seh yuh vex. Tek yuh time and breathe."
        },
        "anxious": {
            "en": "I'm here with you. Let's take this one step at a time.",
            "patois": "Mi deh yah wid yuh. Mek wi tek it one step at a time."
        },
        "neutral": {
            "en": "I'm listening. How can I support you today?",
            "patois": "Mi a listen. How mi can support yuh today?"
        }
    }
    
    return responses.get(sentiment, responses["neutral"]).get(language, responses["neutral"]["en"])

# ===== MOOD ANALYSIS =====

def calculate_mood_trend(mood_events: List[Dict]) -> Dict:
    """Calculate mood trends over time"""
    if not mood_events:
        return {"trend": "stable", "average_sentiment": "neutral"}
    
    # Count sentiments
    sentiment_counts = {}
    for event in mood_events:
        sentiment = event.get("sentiment", "neutral")
        sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
    
    # Find dominant sentiment
    dominant_sentiment = max(sentiment_counts, key=sentiment_counts.get)
    
    # Check for concerning patterns
    recent_events = mood_events[-10:]  # Last 10 events
    suicide_risks = sum(1 for e in recent_events if e.get("suicide_risk", False))
    self_harm_risks = sum(1 for e in recent_events if e.get("self_harm_risk", False))
    
    concern_level = "none"
    if suicide_risks >= 2 or self_harm_risks >= 3:
        concern_level = "high"
    elif suicide_risks >= 1 or self_harm_risks >= 2:
        concern_level = "moderate"
    
    return {
        "trend": "improving" if dominant_sentiment in ["happy", "calm"] else "declining",
        "average_sentiment": dominant_sentiment,
        "concern_level": concern_level,
        "needs_intervention": concern_level in ["moderate", "high"]
    }

# ===== URGENCY ANALYSIS =====

def extract_urgency_indicators(text: str) -> float:
    """Extract urgency from text for violence reports"""
    text_lower = text.lower()
    
    urgency_score = 0.0
    
    # Immediate danger indicators
    immediate_keywords = ["now", "right now", "happening", "currently", "today", "tonight"]
    if any(keyword in text_lower for keyword in immediate_keywords):
        urgency_score += 0.4
    
    # Weapon indicators
    weapon_keywords = ["gun", "knife", "weapon", "machete", "firearm"]
    if any(keyword in text_lower for keyword in weapon_keywords):
        urgency_score += 0.3
    
    # Violence severity
    severe_keywords = ["murder", "kill", "death", "shooting", "stabbing"]
    if any(keyword in text_lower for keyword in severe_keywords):
        urgency_score += 0.4
    
    # Victim count
    multiple_keywords = ["multiple", "many", "several", "group"]
    if any(keyword in text_lower for keyword in multiple_keywords):
        urgency_score += 0.2
    
    return min(urgency_score, 1.0)

# ===== PRIVACY & SECURITY =====

def sanitize_location(location: str) -> str:
    """Sanitize location data for privacy"""
    # Remove exact addresses, keep general area
    # Remove numbers that might be house numbers
    sanitized = re.sub(r'\b\d+[A-Za-z]?\b', '', location)
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    
    return sanitized

def scrub_pii(text: str) -> str:
    """
    Scrub personally identifiable information from text
    Used for anonymizing violence reports
    """
    # Remove phone numbers
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
    
    # Remove email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    
    # Remove TRN/ID numbers (Jamaica specific)
    text = re.sub(r'\b\d{9}\b', '[ID]', text)
    
    return text

# ===== CRISIS RESOURCES =====

def get_crisis_resources(location: str = "Jamaica") -> Dict:
    """Get crisis resources based on location"""
    resources = {
        "Jamaica": {
            "hotlines": [
                {"name": "Suicide Prevention Helpline", "number": "876-XXX-XXXX", "available": "24/7"},
                {"name": "Bellevue Hospital Crisis Line", "number": "876-XXX-XXXX", "available": "24/7"},
                {"name": "Women's Crisis Centre", "number": "876-929-2997", "available": "24/7"}
            ],
            "organizations": [
                {"name": "Jamaica AIDS Support for Life (JASL)", "contact": "info@jasl.org.jm"},
                {"name": "Peace Management Initiative (PMI)", "contact": "pmi@example.com"},
                {"name": "Eve for Life", "contact": "eveforlife@example.com"}
            ],
            "emergency": {
                "police": "119",
                "ambulance": "110",
                "fire": "110"
            }
        }
    }
    
    return resources.get(location, resources["Jamaica"])

# ===== AVATAR MANAGEMENT =====

def format_avatar_animation(mood: str) -> Dict:
    """Get avatar animation parameters based on mood"""
    animations = {
        "happy": {
            "color": "yellow",
            "posture": "standing",
            "animation": "bounce",
            "accessories": ["sunshine_badge"],
            "speed": 1.2
        },
        "sad": {
            "color": "gray",
            "posture": "slouched",
            "animation": "slow_walk",
            "accessories": [],
            "speed": 0.6
        },
        "angry": {
            "color": "red",
            "posture": "tense",
            "animation": "shake",
            "accessories": ["storm_cloud"],
            "speed": 1.5
        },
        "calm": {
            "color": "blue",
            "posture": "standing",
            "animation": "breathe",
            "accessories": ["lotus_flower"],
            "speed": 0.8
        },
        "anxious": {
            "color": "purple",
            "posture": "fidgeting",
            "animation": "pace",
            "accessories": [],
            "speed": 1.3
        },
        "neutral": {
            "color": "green",
            "posture": "standing",
            "animation": "idle",
            "accessories": [],
            "speed": 1.0
        }
    }
    
    return animations.get(mood, animations["neutral"])

# ===== REPORT ESCALATION =====

def should_escalate_report(report_data: Dict) -> bool:
    """Determine if a violence report should be immediately escalated"""
    urgency_score = report_data.get("urgency_score", 0)
    report_type = report_data.get("report_type", "")
    
    # Immediate escalation criteria
    if urgency_score >= 0.8:
        return True
    
    if report_type in ["murder", "planned_violence"] and urgency_score >= 0.5:
        return True
    
    # Check for weapons with immediate timeframe
    content = report_data.get("content", "").lower()
    has_weapon = any(word in content for word in ["gun", "knife", "weapon"])
    has_immediate = any(word in content for word in ["now", "today", "happening"])
    
    if has_weapon and has_immediate:
        return True
    
    return False

def get_routing_agencies(report_data: Dict) -> List[str]:
    """
    Determine which agencies should receive the report
    
    Returns:
        List of agency codes: ["JCF", "PMI", "NGO", etc.]
    """
    agencies = []
    
    urgency_score = report_data.get("urgency_score", 0)
    report_type = report_data.get("report_type", "")
    
    # Jamaica Constabulary Force (Police)
    if urgency_score >= 0.6 or report_type in ["murder", "firearms", "planned_violence"]:
        agencies.append("JCF")
    
    # Peace Management Initiative (Community intervention)
    if report_type in ["gang", "community_violence"] or 0.3 <= urgency_score < 0.7:
        agencies.append("PMI")
    
    # Domestic violence organizations
    if report_type == "domestic":
        agencies.append("WOMEN_CRISIS_CENTRE")
        if urgency_score >= 0.5:
            agencies.append("JCF")
    
    # Youth organizations
    content = report_data.get("content", "").lower()
    if any(word in content for word in ["youth", "child", "student", "school"]):
        agencies.append("YOUTH_SERVICES")
    
    return agencies if agencies else ["PMI"]  # Default to PMI

# ===== VALIDATION HELPERS =====

def validate_user_id(user_id: str) -> bool:
    """Validate MongoDB ObjectId format"""
    return bool(re.match(r'^[a-f\d]{24}$', user_id))

def validate_date_format(date_string: str) -> Optional[datetime]:
    """
    Validate and parse ISO date format
    
    Returns:
        datetime object if valid, None otherwise
    """
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None

# ===== JOURNAL HELPERS =====

def calculate_reading_time(word_count: int) -> int:
    """
    Calculate estimated reading time in minutes
    Average reading speed: 200 words per minute
    """
    return max(1, round(word_count / 200))

def extract_keywords(text: str, limit: int = 10) -> List[str]:
    """
    Extract key words/phrases from text for tagging suggestions
    Simple frequency-based extraction
    """
    # Remove common words
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
        'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your'
    }
    
    # Extract words
    words = re.findall(r'\b[a-z]{4,}\b', text.lower())
    
    # Filter and count
    word_freq = {}
    for word in words:
        if word not in stop_words:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Sort by frequency and return top keywords
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, _ in sorted_words[:limit]]

# ===== TIME HELPERS =====

def get_time_of_day() -> str:
    """Get current time period for contextual greetings"""
    hour = datetime.utcnow().hour
    
    if 5 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 21:
        return "evening"
    else:
        return "night"

def get_greeting(language: str = "en") -> str:
    """Get time-appropriate greeting"""
    time_of_day = get_time_of_day()
    
    greetings = {
        "morning": {
            "en": "Good morning",
            "patois": "Mawnin"
        },
        "afternoon": {
            "en": "Good afternoon",
            "patois": "Good evening"  # Jamaicans often say evening for afternoon
        },
        "evening": {
            "en": "Good evening",
            "patois": "Good evening"
        },
        "night": {
            "en": "Good evening",
            "patois": "Wah gwaan"
        }
    }
    
    return greetings[time_of_day].get(language, greetings[time_of_day]["en"])