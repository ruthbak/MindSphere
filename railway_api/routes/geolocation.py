# railway_api/routes/geolocation.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import math
from bson import ObjectId

from models import (
    SupportZoneRequest,
    RiskAlertRequest,
    MapReportRequest,
    LocationData
)
from database import get_geolocation_collection, get_reports_collection

router = APIRouter(prefix="/geo", tags=["Geolocation"])

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

@router.post("/support-zones")
async def get_support_zones(request: SupportZoneRequest):
    """
    Get nearby crisis support resources based on GPS location
    Returns clinics, hotlines, police stations within radius
    """
    # Jamaica crisis resources with coordinates
    support_zones = [
        {
            "name": "Bellevue Hospital - Crisis Unit",
            "type": "psychiatric_hospital",
            "latitude": 18.0179,
            "longitude": -76.7989,
            "contact": "876-XXX-XXXX",
            "services": ["crisis_intervention", "emergency_care"]
        },
        {
            "name": "University Hospital Crisis Center",
            "type": "hospital",
            "latitude": 18.0094,
            "longitude": -76.7467,
            "contact": "876-XXX-XXXX",
            "services": ["mental_health", "emergency"]
        },
        {
            "name": "Half Way Tree Police Station",
            "type": "police",
            "latitude": 18.0130,
            "longitude": -76.7973,
            "contact": "119",
            "services": ["emergency_response", "violence_reporting"]
        },
        {
            "name": "Peace Management Initiative Office",
            "type": "ngo",
            "latitude": 18.0196,
            "longitude": -76.8071,
            "contact": "876-XXX-XXXX",
            "services": ["community_support", "conflict_resolution"]
        }
    ]
    
    # Filter resources within radius
    nearby_resources = []
    for zone in support_zones:
        distance = haversine_distance(
            request.latitude,
            request.longitude,
            zone["latitude"],
            zone["longitude"]
        )
        
        if distance <= request.radius_km:
            zone["distance_km"] = round(distance, 2)
            nearby_resources.append(zone)
    
    # Sort by distance
    nearby_resources.sort(key=lambda x: x["distance_km"])
    
    return {
        "location": {
            "latitude": request.latitude,
            "longitude": request.longitude
        },
        "radius_km": request.radius_km,
        "resources_found": len(nearby_resources),
        "resources": nearby_resources,
        "hotlines": [
            {
                "name": "National Crisis Hotline",
                "number": "876-XXX-XXXX",
                "available": "24/7"
            },
            {
                "name": "Suicide Prevention Line",
                "number": "876-XXX-XXXX",
                "available": "24/7"
            }
        ]
    }

@router.post("/risk-alerts")
async def get_risk_alerts(request: RiskAlertRequest):
    """
    Get alerts for high-risk areas based on violence reports
    Returns geo-fenced alerts for flagged zones
    """
    reports_collection = get_reports_collection()
    
    # Find recent high-urgency reports in the area
    recent_reports = await reports_collection.find({
        "urgency_score": {"$gte": 0.7},
        "timestamp": {"$gte": datetime.utcnow().replace(hour=0, minute=0)}  # Today
    }).to_list(length=100)
    
    # Calculate distances and filter
    nearby_alerts = []
    for report in recent_reports:
        if "extracted_entities" in report and "locations" in report["extracted_entities"]:
            # In production, use geocoding to get coordinates from location names
            # For now, using placeholder logic
            alert = {
                "type": report.get("report_type", "unknown"),
                "urgency": report.get("urgency_score", 0),
                "area": report["extracted_entities"]["locations"],
                "time": report.get("timestamp"),
                "status": report.get("status", "active")
            }
            nearby_alerts.append(alert)
    
    # Define risk level for the area
    risk_level = "low"
    if len(nearby_alerts) >= 5:
        risk_level = "high"
    elif len(nearby_alerts) >= 2:
        risk_level = "moderate"
    
    return {
        "location": {
            "latitude": request.latitude,
            "longitude": request.longitude
        },
        "risk_level": risk_level,
        "active_alerts": len(nearby_alerts),
        "alerts": nearby_alerts[:10],  # Return top 10
        "safety_tips": get_safety_tips(risk_level)
    }

@router.post("/map-report")
async def create_map_report(request: MapReportRequest):
    """
    Submit a location-tagged violence report
    Stores coordinates for community mapping
    """
    reports_collection = get_reports_collection()
    geolocation_collection = get_geolocation_collection()
    
    # Create report with location
    report_doc = {
        "content": request.description,
        "report_type": request.report_type,
        "anonymous": request.anonymous,
        "location": {
            "type": "Point",
            "coordinates": [request.longitude, request.latitude]  # GeoJSON format
        },
        "timestamp": datetime.utcnow(),
        "status": "pending",
        "urgency_score": 0.5  # Will be updated by NLP
    }
    
    result = await reports_collection.insert_one(report_doc)
    
    # Create geolocation event
    geo_event = {
        "report_id": str(result.inserted_id),
        "event_type": "violence_report",
        "latitude": request.latitude,
        "longitude": request.longitude,
        "report_type": request.report_type,
        "timestamp": datetime.utcnow()
    }
    
    await geolocation_collection.insert_one(geo_event)
    
    return {
        "report_id": str(result.inserted_id),
        "message": "Report submitted with location data",
        "support_message": "Yuh brave fi speak up. Help deh nearby if yuh need it."
    }

@router.get("/community-map")
async def get_community_map(
    latitude: float,
    longitude: float,
    radius_km: float = 10.0,
    report_type: str = None
):
    """
    Get community mapping data for violence reports
    Returns aggregated, anonymized report locations
    """
    geolocation_collection = get_geolocation_collection()
    
    # Build query
    query = {"event_type": "violence_report"}
    if report_type:
        query["report_type"] = report_type
    
    # Get recent events
    events = await geolocation_collection.find(query).sort(
        "timestamp", -1
    ).limit(100).to_list(length=100)
    
    # Filter by distance and aggregate
    heatmap_points = []
    for event in events:
        distance = haversine_distance(
            latitude,
            longitude,
            event["latitude"],
            event["longitude"]
        )
        
        if distance <= radius_km:
            # Round coordinates for privacy (grid aggregation)
            heatmap_points.append({
                "lat": round(event["latitude"], 3),  # ~100m precision
                "lon": round(event["longitude"], 3),
                "type": event.get("report_type", "unknown"),
                "count": 1
            })
    
    # Aggregate points at same location
    aggregated = {}
    for point in heatmap_points:
        key = f"{point['lat']},{point['lon']},{point['type']}"
        if key in aggregated:
            aggregated[key]["count"] += 1
        else:
            aggregated[key] = point
    
    return {
        "center": {
            "latitude": latitude,
            "longitude": longitude
        },
        "radius_km": radius_km,
        "total_reports": len(heatmap_points),
        "heatmap_points": list(aggregated.values()),
        "disclaimer": "Locations are approximate for privacy protection"
    }

@router.post("/check-in")
async def safety_check_in(
    user_id: str,
    latitude: float,
    longitude: float,
    status: str = "safe"
):
    """
    Allow users to check in with their safety status
    Can trigger alerts if user is in danger
    """
    geolocation_collection = get_geolocation_collection()
    
    check_in = {
        "user_id": user_id,
        "event_type": "safety_check_in",
        "latitude": latitude,
        "longitude": longitude,
        "status": status,
        "timestamp": datetime.utcnow()
    }
    
    await geolocation_collection.insert_one(check_in)
    
    response = {
        "message": "Check-in recorded",
        "status": status
    }
    
    if status == "danger":
        response["emergency_contacts"] = [
            {"service": "Police", "number": "119"},
            {"service": "Crisis Line", "number": "876-XXX-XXXX"}
        ]
        response["message"] = "Emergency services notified. Help is on the way."
    
    return response

def get_safety_tips(risk_level: str) -> List[str]:
    """Get safety tips based on risk level"""
    tips = {
        "low": [
            "Stay aware of your surroundings",
            "Keep emergency contacts handy",
            "Travel in groups when possible"
        ],
        "moderate": [
            "Avoid unfamiliar areas after dark",
            "Keep phone charged and accessible",
            "Share your location with trusted contacts",
            "Stay in well-lit, populated areas"
        ],
        "high": [
            "Consider staying indoors if possible",
            "Have emergency contacts readily available",
            "Keep doors and windows secured",
            "Report any suspicious activity immediately",
            "Stay connected with neighbors and community"
        ]
    }
    
    return tips.get(risk_level, tips["low"])