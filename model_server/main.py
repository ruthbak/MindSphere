# model_server/main.py - COMPLETE FILE WITH JOURNAL ANALYSIS

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import torch
import logging
import os
import tempfile
import base64

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="Mental Health App - Local Model Server", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model storage
models = {}

# ===== PYDANTIC MODELS =====

class TranscribeRequest(BaseModel):
    audio_base64: str
    language: str = "en"

class GenerateRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
    language: str = "en"
    max_length: int = 200

class SpeakRequest(BaseModel):
    text: str
    language: str = "en"

class AnalyzeRequest(BaseModel):
    text: str
    language: str = "en"

class ExtractRequest(BaseModel):
    text: str
    report_type: str

# NEW: Journal-specific models
class JournalAnalysisRequest(BaseModel):
    text: str
    language: str = "en"
    previous_entries: Optional[List[str]] = None
    user_baseline: Optional[Dict] = None

class JournalInsightRequest(BaseModel):
    user_id: str
    entries: List[Dict]
    time_period_days: int = 30

class PersonalizedPromptRequest(BaseModel):
    user_mood: str
    language: str = "en"

# ===== MODEL LOADING FUNCTIONS =====

def load_whisper_model():
    """Load Whisper model for speech transcription"""
    try:
        import whisper
        logger.info("Loading Whisper model...")
        model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully")
        return model
    except Exception as e:
        logger.error(f"Failed to load Whisper: {e}")
        return None

def load_sentiment_model():
    """Load sentiment analysis model"""
    try:
        from transformers import pipeline
        logger.info("Loading sentiment analysis model...")
        
        sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1
        )
        
        harm_pipeline = pipeline(
            "text-classification",
            model="distilbert-base-uncased",
            device=-1
        )
        
        logger.info("Sentiment models loaded successfully")
        return {"sentiment": sentiment_pipeline, "harm": harm_pipeline}
    except Exception as e:
        logger.error(f"Failed to load sentiment models: {e}")
        return None

def load_llama_model():
    """Load LLaMA model for response generation using GGUF file"""
    try:
        from llama_cpp import Llama
        logger.info("Loading LLaMA model from GGUF file...")
        
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Build absolute path to model
        model_path = os.getenv(
            "LLAMA_MODEL_PATH", 
            os.path.join(script_dir, "models", "llama-2-7b-chat.Q4_K_M.gguf")
        )
        
        logger.info(f"Looking for model at: {model_path}")
        
        if not os.path.exists(model_path):
            logger.error(f"LLaMA model not found at: {model_path}")
            logger.info("Please ensure llama-2-7b-chat.Q4_K_M.gguf is in the models/ directory")
            return None
        
        logger.info(f"Model file found! Size: {os.path.getsize(model_path) / (1024**3):.2f} GB")
        
        # Load model with CPU-optimized settings
        llm = Llama(
            model_path=model_path,
            n_ctx=2048,  # Context window
            n_threads=4,  # CPU threads (adjust based on your CPU)
            n_gpu_layers=0,  # CPU only
            verbose=True  # Changed to True for debugging
        )
        
        logger.info("LLaMA model loaded successfully from GGUF")
        return llm
    except ImportError:
        logger.error("llama-cpp-python not installed. Install with: pip install llama-cpp-python")
        return None
    except Exception as e:
        logger.error(f"Failed to load LLaMA model: {e}")
        import traceback
        traceback.print_exc()
        return None

def load_tts_model():
    """Load TTS model"""
    try:
        from TTS.api import TTS
        logger.info("Loading TTS model...")
        tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False)
        logger.info("TTS model loaded successfully")
        return tts
    except Exception as e:
        logger.error(f"Failed to load TTS: {e}")
        return None

def load_ner_model():
    """Load NER model for entity extraction"""
    try:
        from transformers import pipeline
        logger.info("Loading NER model...")
        ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", device=-1)
        logger.info("NER model loaded successfully")
        return ner_pipeline
    except Exception as e:
        logger.error(f"Failed to load NER: {e}")
        return None

# ===== STARTUP =====

@app.on_event("startup")
async def startup_event():
    logger.info("Starting model server and loading AI models...")
    models["whisper"] = load_whisper_model()
    models["sentiment"] = load_sentiment_model()
    models["llama"] = load_llama_model()
    models["tts"] = load_tts_model()
    models["ner"] = load_ner_model()
    logger.info("Model loading complete")

# ===== HEALTH & INFO ENDPOINTS =====

@app.get("/")
async def root():
    return {
        "app": "Mental Health App - Model Server",
        "status": "running",
        "models_loaded": {
            "whisper": models.get("whisper") is not None,
            "sentiment": models.get("sentiment") is not None,
            "llama": models.get("llama") is not None,
            "tts": models.get("tts") is not None,
            "ner": models.get("ner") is not None
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models": {
            "whisper": models.get("whisper") is not None,
            "sentiment": models.get("sentiment") is not None,
            "llama": models.get("llama") is not None,
            "tts": models.get("tts") is not None,
            "ner": models.get("ner") is not None
        }
    }

# ===== TRANSCRIPTION ENDPOINT =====

@app.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    """Transcribe audio to text using Whisper"""
    if not models.get("whisper"):
        raise HTTPException(status_code=503, detail="Whisper model not loaded")
    
    try:
        audio_bytes = base64.b64decode(request.audio_base64)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            temp_audio.write(audio_bytes)
            temp_path = temp_audio.name
        
        result = models["whisper"].transcribe(temp_path, language=request.language)
        os.unlink(temp_path)
        
        return {
            "text": result["text"],
            "language": result.get("language", request.language)
        }
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

# ===== TEXT GENERATION ENDPOINT =====

# model_server/main.py - UPDATE THIS ENDPOINT

@app.post("/generate")
async def generate_response(request: GenerateRequest):
    """Generate AI response using language model"""
    
    # Check if LLaMA is loaded, if not use fallback
    if not models.get("llama"):
        logger.warning("LLaMA model not loaded, using fallback responses")
        
        # Fallback empathetic responses
        fallback_responses = {
            "en": {
                "anxious": "I hear you, and anxiety can feel overwhelming. Take a deep breath with me. Breathe in slowly for 4 counts, hold for 4, then exhale for 4. Remember, you're not alone in this. Have you tried any grounding techniques like the 5-4-3-2-1 method?",
                "sad": "I'm here with you. It's okay to feel sad, and your feelings are valid. Sometimes talking about what's on your heart can help. What's weighing on you most right now?",
                "angry": "I understand you're feeling angry. Those feelings are valid. Take a moment to breathe. What triggered these feelings? Sometimes understanding the root helps us process better.",
                "happy": "That's wonderful! I'm so glad you're feeling good. What brought you joy today? Celebrating these moments is important.",
                "crisis": "I'm concerned about what you're sharing. You matter, and there are people who care. Please reach out to someone you trust or call a crisis helpline immediately. In Jamaica, you can contact the Suicide Prevention Helpline. You don't have to go through this alone.",
                "default": "I'm here to listen and support you. Tell me more about what you're experiencing. What's on your mind today?"
            },
            "patois": {
                "anxious": "Mi hear yuh, and anxiety can feel overwhelming. Tek a deep breath wid mi. Breathe in slow fi 4 counts, hold fi 4, den exhale fi 4. Remember, yuh nuh alone inna dis. Yuh ever try any grounding techniques?",
                "sad": "Mi deh yah wid yuh. It alright fi feel sad, and yuh feelings valid. Sometimes talking bout wah deh pon yuh heart can help. Wah a weigh pon yuh most right now?",
                "angry": "Mi understand seh yuh feel vex. Dem feelings valid. Tek a moment fi breathe. Wah trigger dese feelings? Sometimes understanding di root help wi process better.",
                "happy": "Dat wonderful! Mi glad yuh feel good. Wah bring yuh joy today? Celebrating dese moments important.",
                "crisis": "Mi concerned bout wah yuh a share. Yuh matter, and people care bout yuh. Please reach out to somebody yuh trust or call a crisis helpline immediately. Yuh nuh haffi go through dis alone.",
                "default": "Mi deh yah fi listen and support yuh. Tell mi more bout wah yuh experiencing. Wah deh pon yuh mind today?"
            }
        }
        
        # Detect mood from prompt
        prompt_lower = request.prompt.lower()
        
        # Determine response category
        category = "default"
        if any(word in prompt_lower for word in ["anxious", "anxiety", "worried", "panic", "nervous", "overwhelmed"]):
            category = "anxious"
        elif any(word in prompt_lower for word in ["sad", "depressed", "down", "hopeless", "worthless"]):
            category = "sad"
        elif any(word in prompt_lower for word in ["angry", "mad", "furious", "rage", "vex"]):
            category = "angry"
        elif any(word in prompt_lower for word in ["happy", "great", "wonderful", "excited", "blessed", "irie"]):
            category = "happy"
        elif any(word in prompt_lower for word in ["kill myself", "suicide", "end it all", "want to die", "no reason to live"]):
            category = "crisis"
        
        # Get appropriate response
        lang = request.language if request.language in ["en", "patois"] else "en"
        response_text = fallback_responses[lang].get(category, fallback_responses[lang]["default"])
        
        return {
            "response": response_text,
            "language": request.language,
            "model": "fallback",
            "note": "LLaMA model not available, using empathetic fallback responses"
        }
    
    # Original LLaMA code
    try:
        llm = models["llama"]
        
        system_prompt = """You are a compassionate mental health companion for Jamaican users. 
You understand both English and Jamaican Patois. You are warm, empathetic, and culturally aware.
You never diagnose or give medical advice. You listen, validate, and encourage reflection."""
        
        conversation = f"""<s>[INST] <<SYS>>
{system_prompt}
<</SYS>>

{request.prompt}

{f"Context: {request.context}" if request.context else ""}
 [/INST]"""
        
        output = llm(
            conversation,
            max_tokens=request.max_length,
            temperature=0.7,
            top_p=0.9,
            top_k=40,
            repeat_penalty=1.1,
            stop=["</s>", "[INST]", "User:"],
            echo=False
        )
        
        response_text = output["choices"][0]["text"].strip()
        
        return {
            "response": response_text,
            "language": request.language,
            "model": "llama-2-7b-chat"
        }
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# ===== TEXT-TO-SPEECH ENDPOINT =====

@app.post("/speak")
async def text_to_speech(request: SpeakRequest):
    """Convert text to speech using TTS"""
    if not models.get("tts"):
        raise HTTPException(status_code=503, detail="TTS model not loaded")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            models["tts"].tts_to_file(text=request.text, file_path=temp_audio.name)
            temp_path = temp_audio.name
        
        with open(temp_path, "rb") as f:
            audio_bytes = f.read()
            audio_base64 = base64.b64encode(audio_bytes).decode()
        
        os.unlink(temp_path)
        
        return {
            "audio_base64": audio_base64,
            "format": "wav"
        }
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

# ===== BASIC SENTIMENT ANALYSIS (for messages) =====

@app.post("/analyze")
async def analyze_text(request: AnalyzeRequest):
    """Analyze text for sentiment and mental health concerns"""
    if not models.get("sentiment"):
        raise HTTPException(status_code=503, detail="Sentiment model not loaded")
    
    try:
        sentiment_pipeline = models["sentiment"]["sentiment"]
        sentiment_result = sentiment_pipeline(request.text)[0]
        
        text_lower = request.text.lower()
        suicide_keywords = ["kill myself", "end it all", "don't want to live", "suicide", "worthless"]
        self_harm_keywords = ["cut myself", "hurt myself", "self harm", "harm myself"]
        
        suicide_risk = any(keyword in text_lower for keyword in suicide_keywords)
        self_harm_risk = any(keyword in text_lower for keyword in self_harm_keywords)
        
        sentiment_label = sentiment_result["label"].lower()
        mood = "happy" if sentiment_label == "positive" else "sad" if sentiment_label == "negative" else "neutral"
        
        if request.language == "patois":
            if any(word in text_lower for word in ["blessed", "irie", "gwaan good", "likkle more"]):
                mood = "happy"
            elif any(word in text_lower for word in ["mash up", "bruk", "bawl", "cry"]):
                mood = "sad"
        
        return {
            "sentiment": mood,
            "confidence": sentiment_result["score"],
            "suicide_risk": suicide_risk,
            "self_harm_risk": self_harm_risk,
            "needs_support": suicide_risk or self_harm_risk
        }
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# ===== ENTITY EXTRACTION (for violence reports) =====

@app.post("/extract")
async def extract_entities(request: ExtractRequest):
    """Extract entities from violence reports"""
    if not models.get("ner"):
        raise HTTPException(status_code=503, detail="NER model not loaded")
    
    try:
        ner_pipeline = models["ner"]
        entities = ner_pipeline(request.text)
        
        extracted = {
            "locations": [],
            "times": [],
            "persons": [],
            "organizations": []
        }
        
        for entity in entities:
            if entity["entity"].endswith("LOC"):
                extracted["locations"].append(entity["word"])
            elif entity["entity"].endswith("PER"):
                extracted["persons"].append(entity["word"])
            elif entity["entity"].endswith("ORG"):
                extracted["organizations"].append(entity["word"])
        
        text_lower = request.text.lower()
        urgency_score = 0.0
        
        if any(word in text_lower for word in ["murder", "kill", "gun", "weapon", "threat", "violence"]):
            urgency_score += 0.5
        if any(word in text_lower for word in ["now", "today", "happening", "currently"]):
            urgency_score += 0.3
        if any(word in text_lower for word in ["help", "emergency", "urgent", "danger"]):
            urgency_score += 0.2
        
        urgency_score = min(urgency_score, 1.0)
        
        return {
            "entities": extracted,
            "urgency_score": urgency_score,
            "report_type": request.report_type
        }
    except Exception as e:
        logger.error(f"Extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

# ===== ENHANCED JOURNAL ANALYSIS =====

@app.post("/analyze/journal")
async def analyze_journal_entry(request: JournalAnalysisRequest):
    """
    Deep analysis of journal entry for comprehensive mental health insights
    Detects crisis indicators, mental health patterns, and provides recommendations
    """
    if not models.get("sentiment"):
        raise HTTPException(status_code=503, detail="Sentiment model not loaded")
    
    try:
        sentiment_pipeline = models["sentiment"]["sentiment"]
        text_lower = request.text.lower()
        
        # 1. BASIC SENTIMENT
        sentiment_result = sentiment_pipeline(request.text)[0]
        
        # 2. CRISIS DETECTION
        suicide_keywords = [
            "kill myself", "end it all", "don't want to live", "suicide",
            "no reason to live", "better off dead", "end my life", "can't go on"
        ]
        
        patois_suicide_keywords = [
            "mi cyaan tek it", "mi done", "life nuh worth it",
            "mi waan dead", "kill miself", "end it now"
        ]
        
        self_harm_keywords = [
            "cut myself", "hurt myself", "self harm", "harm myself",
            "want to hurt", "cutting", "burning myself"
        ]
        
        patois_self_harm_keywords = [
            "hurt miself", "cut miself", "harm miself"
        ]
        
        all_suicide = suicide_keywords + (patois_suicide_keywords if request.language == "patois" else [])
        all_self_harm = self_harm_keywords + (patois_self_harm_keywords if request.language == "patois" else [])
        
        suicide_risk = any(kw in text_lower for kw in all_suicide)
        self_harm_risk = any(kw in text_lower for kw in all_self_harm)
        
        # 3. MENTAL HEALTH INDICATORS
        depression_keywords = [
            "hopeless", "worthless", "empty", "numb", "tired of life",
            "no energy", "can't get out of bed", "everything is dark",
            "lost interest", "don't care anymore", "exhausted", "drained"
        ]
        
        patois_depression = [
            "mi feel empty", "nutten nuh mek sense", "mi tired a life",
            "cyaan manage", "everything dark", "life hard", "mi give up"
        ]
        
        anxiety_keywords = [
            "anxious", "worried", "panic", "scared", "overwhelmed",
            "can't breathe", "racing thoughts", "terrified", "nervous",
            "fear", "stressed", "tense", "on edge"
        ]
        
        patois_anxiety = [
            "mi frighten", "mi scared", "heart a beat fast",
            "cyaan calm down", "worried bad", "fret up"
        ]
        
        anger_keywords = [
            "angry", "furious", "hate", "rage", "violent thoughts",
            "want to hurt", "destroy", "revenge", "mad", "pissed"
        ]
        
        patois_anger = [
            "mi vex", "mi mad", "want fi buss dem", "mi angry bad",
            "blood a boil", "ready fi war"
        ]
        
        trauma_keywords = [
            "flashback", "nightmare", "can't forget", "haunted",
            "violated", "abused", "attacked", "traumatized", "ptsd"
        ]
        
        isolation_keywords = [
            "alone", "lonely", "nobody cares", "no friends", "isolated",
            "abandoned", "rejected", "left out", "by myself"
        ]
        
        patois_isolation = [
            "mi one", "nobaddy nuh care", "mi all alone", "everybody lef mi"
        ]
        
        positive_coping = [
            "grateful", "thankful", "hope", "better", "improving",
            "trying", "working on", "therapy", "support", "helped",
            "blessed", "proud", "achieved", "accomplished"
        ]
        
        patois_positive = [
            "blessed", "irie", "give thanks", "a try", "better dan before",
            "God a help mi", "family deh yah", "friends support mi"
        ]
        
        # Calculate scores
        depression_score = sum(1 for kw in (depression_keywords + patois_depression) if kw in text_lower)
        anxiety_score = sum(1 for kw in (anxiety_keywords + patois_anxiety) if kw in text_lower)
        anger_score = sum(1 for kw in (anger_keywords + patois_anger) if kw in text_lower)
        trauma_score = sum(1 for kw in trauma_keywords if kw in text_lower)
        isolation_score = sum(1 for kw in (isolation_keywords + patois_isolation) if kw in text_lower)
        coping_score = sum(1 for kw in (positive_coping + patois_positive) if kw in text_lower)
        
        # 4. MAP SENTIMENT TO MOOD
        sentiment_label = sentiment_result["label"].lower()
        if sentiment_label == "positive":
            mood = "happy"
        elif sentiment_label == "negative":
            if anger_score > 2:
                mood = "angry"
            elif anxiety_score > 2:
                mood = "anxious"
            else:
                mood = "sad"
        else:
            mood = "neutral"
        
        # Patois mood override
        if request.language == "patois":
            if any(w in text_lower for w in ["blessed", "irie", "good vibes", "gwaan good"]):
                mood = "happy"
            elif any(w in text_lower for w in ["mash up", "bruk dung", "bawl", "sad bad"]):
                mood = "sad"
            elif any(w in text_lower for w in ["vex", "angry", "mad"]):
                mood = "angry"
        
        # 5. CALCULATE RISK SCORE
        risk_score = 0.0
        if suicide_risk:
            risk_score += 1.0
        if self_harm_risk:
            risk_score += 0.8
        
        risk_score += (depression_score * 0.1)
        risk_score += (anxiety_score * 0.08)
        risk_score += (anger_score * 0.06)
        risk_score += (trauma_score * 0.12)
        risk_score += (isolation_score * 0.09)
        risk_score -= (coping_score * 0.1)
        
        risk_score = max(0.0, min(risk_score, 1.0))
        
        # 6. GENERATE RECOMMENDATIONS
        recommendations = []
        
        if suicide_risk or risk_score > 0.8:
            recommendations.append({
                "type": "crisis",
                "message": "Immediate support needed. Please reach out to a crisis counselor.",
                "action": "show_crisis_resources"
            })
        
        if depression_score > 3:
            recommendations.append({
                "type": "professional_help",
                "message": "Consider speaking with a mental health professional",
                "action": "show_professionals"
            })
        
        if isolation_score > 2:
            recommendations.append({
                "type": "community",
                "message": "Connecting with others might help. Join a support community.",
                "action": "show_communities"
            })
        
        if anxiety_score > 3:
            recommendations.append({
                "type": "coping_technique",
                "message": "Try breathing exercises or mindfulness to manage anxiety",
                "action": "show_coping_tools"
            })
        
        if coping_score > 2:
            recommendations.append({
                "type": "positive_reinforcement",
                "message": "Great job using healthy coping strategies!",
                "action": "encourage_continuation"
            })
        
        # 7. RETURN COMPREHENSIVE ANALYSIS
        return {
            "sentiment": mood,
            "confidence": sentiment_result["score"],
            "suicide_risk": suicide_risk,
            "self_harm_risk": self_harm_risk,
            "needs_support": suicide_risk or self_harm_risk or risk_score > 0.7,
            "mental_health_indicators": {
                "depression": {
                    "score": depression_score,
                    "level": "high" if depression_score > 3 else "moderate" if depression_score > 1 else "low"
                },
                "anxiety": {
                    "score": anxiety_score,
                    "level": "high" if anxiety_score > 3 else "moderate" if anxiety_score > 1 else "low"
                },
                "anger": {
                    "score": anger_score,
                    "level": "high" if anger_score > 2 else "moderate" if anger_score > 1 else "low"
                },
                "trauma": {
                    "score": trauma_score,
                    "level": "present" if trauma_score > 0 else "none_detected"
                },
                "isolation": {
                    "score": isolation_score,
                    "level": "high" if isolation_score > 2 else "moderate" if isolation_score > 1 else "low"
                }
            },
            "positive_indicators": {
                "coping_mechanisms": coping_score,
                "resilience_present": coping_score > 1
            },
            "overall_risk_score": round(risk_score, 2),
            "risk_level": "critical" if risk_score > 0.8 else "high" if risk_score > 0.6 else "moderate" if risk_score > 0.3 else "low",
            "recommendations": recommendations,
            "language": request.language
        }
        
    except Exception as e:
        logger.error(f"Journal analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# ===== JOURNAL INSIGHTS (Trend Analysis) =====

@app.post("/insights/journal")
async def generate_journal_insights(request: JournalInsightRequest):
    """Generate insights from multiple journal entries over time"""
    if not models.get("llama"):
        return {
            "insights": "Advanced insights unavailable (LLaMA model not loaded)",
            "entries_analyzed": len(request.entries),
            "time_period_days": request.time_period_days
        }
    
    try:
        llm = models["llama"]
        
        entry_summaries = []
        for entry in request.entries[:10]:
            entry_summaries.append({
                "date": entry.get("created_at", ""),
                "mood": entry.get("mood", "neutral"),
                "sentiment": entry.get("analysis", {}).get("sentiment", "unknown"),
                "risk_score": entry.get("analysis", {}).get("overall_risk_score", 0)
            })
        
        prompt = f"""Analyze this user's mental health journey over {request.time_period_days} days.

Entry patterns:
{entry_summaries}

Provide:
1. Overall trend (improving/stable/declining)
2. Key patterns noticed
3. Positive developments
4. Areas of concern
5. Supportive recommendations

Keep response warm, empathetic, under 200 words."""

        output = llm(
            prompt,
            max_tokens=250,
            temperature=0.7,
            stop=["User:", "\n\n\n"]
        )
        
        insights_text = output["choices"][0]["text"].strip()
        
        return {
            "insights": insights_text,
            "entries_analyzed": len(request.entries),
            "time_period_days": request.time_period_days
        }
        
    except Exception as e:
        logger.error(f"Insight generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Insight generation failed: {str(e)}")

# ===== PERSONALIZED JOURNAL PROMPTS =====

@app.post("/generate/journal_prompt")
async def generate_personalized_prompt(request: PersonalizedPromptRequest):
    """Generate personalized journal prompts using LLaMA"""
    if not models.get("llama"):
        fallback = "What's on yuh mind today?" if request.language == "patois" else "What's on your mind today?"
        return {"prompt": fallback, "source": "fallback"}
    
    try:
        llm = models["llama"]
        
        mood_context = {
            "happy": "The user is feeling happy today",
            "sad": "The user is feeling sad today",
            "anxious": "The user is feeling anxious today",
            "angry": "The user is feeling angry today",
            "neutral": "The user has a neutral mood today"
        }
        
        context = mood_context.get(request.user_mood, "The user wants to journal")
        lang_instruction = "in Jamaican Patois" if request.language == "patois" else "in English"
        
        prompt = f"""{context}. Generate ONE thoughtful, culturally-aware journal prompt {lang_instruction} to help them reflect and process their emotions. Make it warm and supportive. Just the prompt, nothing else."""
        
        output = llm(
            prompt,
            max_tokens=100,
            temperature=0.8,
            stop=["\n\n", "User:"]
        )
        
        generated_prompt = output["choices"][0]["text"].strip()
        
        return {
            "prompt": generated_prompt,
            "mood": request.user_mood,
            "language": request.language,
            "source": "llama"
        }
        
    except Exception as e:
        logger.error(f"Prompt generation error: {e}")
        fallback = "What's on yuh mind today?" if request.language == "patois" else "What's on your mind today?"
        return {"prompt": fallback, "source": "fallback"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)