# railway_api/routes/professionals.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from typing import Optional

from models import (
    ProfessionalCreate,
    ProfessionalResponse,
    SupportRequestCreate,
    SupportRequestResponse
)
from database import (
    get_professionals_collection,
    get_support_requests_collection,
    get_users_collection
)
from auth import get_current_user, get_current_professional

router = APIRouter(prefix="/professionals", tags=["Professional Support"])

def serialize_doc(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
        doc["id"] = doc["_id"]
    return doc

@router.post("", response_model=dict)
async def create_professional(professional: ProfessionalCreate):
    """
    Register a professional profile
    Requires verification before becoming active
    """
    professionals_collection = get_professionals_collection()
    
    professional_doc = professional.dict()
    professional_doc["created_at"] = datetime.utcnow()
    professional_doc["verified"] = False  # Requires admin verification
    professional_doc["rating"] = None
    professional_doc["total_sessions"] = 0
    
    result = await professionals_collection.insert_one(professional_doc)
    
    return {
        "professional_id": str(result.inserted_id),
        "message": "Profile created. Pending verification.",
        "status": "pending_verification"
    }

@router.get("", response_model=list)
async def list_professionals(
    profession: Optional[str] = None,
    verified_only: bool = True
):
    """
    List all verified professionals
    Can filter by profession type
    """
    professionals_collection = get_professionals_collection()
    
    query = {}
    if verified_only:
        query["verified"] = True
    if profession:
        query["profession"] = profession
    
    professionals = await professionals_collection.find(query).to_list(length=100)
    
    return [serialize_doc(p) for p in professionals]

@router.get("/{professional_id}")
async def get_professional(professional_id: str):
    """Get detailed professional profile"""
    professionals_collection = get_professionals_collection()
    
    try:
        professional = await professionals_collection.find_one({"_id": ObjectId(professional_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid professional ID")
    
    if not professional:
        raise HTTPException(status_code=404, detail="Professional not found")
    
    return serialize_doc(professional)

@router.post("/support-request")
async def create_support_request(request: SupportRequestCreate):
    """
    Submit a request for professional support
    Connects users with verified professionals
    """
    support_requests_collection = get_support_requests_collection()
    professionals_collection = get_professionals_collection()
    users_collection = get_users_collection()
    
    # Verify user exists
    try:
        user = await users_collection.find_one({"_id": ObjectId(request.user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify professional exists and is verified
    try:
        professional = await professionals_collection.find_one({"_id": ObjectId(request.professional_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid professional ID")
    
    if not professional:
        raise HTTPException(status_code=404, detail="Professional not found")
    
    if not professional.get("verified", False):
        raise HTTPException(status_code=400, detail="Professional not verified")
    
    # Create support request
    request_doc = request.dict()
    request_doc["created_at"] = datetime.utcnow()
    request_doc["status"] = "pending"
    request_doc["scheduled_time"] = request.preferred_time
    
    result = await support_requests_collection.insert_one(request_doc)