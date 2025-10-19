# railway_api/database.py

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import os
import logging

logger = logging.getLogger(__name__)

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "mental_health_app")

# Global client
client: AsyncIOMotorClient = None
database = None

async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, database
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        database = client[DATABASE_NAME]
        
        # Test connection
        await client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {DATABASE_NAME}")
        
        # Create indexes for better performance
        await create_indexes()
        
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        logger.info("Closed MongoDB connection")

async def create_indexes():
    """Create database indexes for optimized queries"""
    try:
        # Users collection indexes
        await database.users.create_index("username", unique=True)
        await database.users.create_index("email", unique=True)
        await database.users.create_index("created_at")
        
        # Avatars collection indexes
        await database.avatars.create_index("user_id", unique=True)
        await database.avatars.create_index("last_updated")
        
        # Messages collection indexes
        await database.messages.create_index([("sender_id", 1), ("timestamp", -1)])
        await database.messages.create_index([("recipient_id", 1), ("timestamp", -1)])
        await database.messages.create_index([("community_id", 1), ("timestamp", -1)])
        await database.messages.create_index("timestamp")
        
        # Communities collection indexes
        await database.communities.create_index("topic")
        await database.communities.create_index("created_at")
        
        # Violence reports indexes
        await database.violence_reports.create_index("timestamp")
        await database.violence_reports.create_index("status")
        await database.violence_reports.create_index("urgency_score")
        await database.violence_reports.create_index([("location", "2dsphere")])  # Geospatial
        
        # Professionals indexes
        await database.professionals.create_index("profession")
        await database.professionals.create_index("verified")
        
        # Mood events indexes
        await database.mood_events.create_index([("user_id", 1), ("timestamp", -1)])
        await database.mood_events.create_index("timestamp")
        
        # Journal entries indexes (NEW)
        await database.journal_entries.create_index("user_id")
        await database.journal_entries.create_index([("user_id", 1), ("created_at", -1)])
        await database.journal_entries.create_index("mood")
        await database.journal_entries.create_index("tags")
        await database.journal_entries.create_index([("user_id", 1), ("mood", 1)])
        await database.journal_entries.create_index("created_at")
        
        # Support requests indexes
        await database.support_requests.create_index([("user_id", 1), ("status", 1)])
        await database.support_requests.create_index("professional_id")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

def get_database():
    """Dependency to get database instance"""
    return database

# Collection accessors
def get_users_collection():
    return database.users

def get_avatars_collection():
    return database.avatars

def get_messages_collection():
    return database.messages

def get_communities_collection():
    return database.communities

def get_reports_collection():
    return database.violence_reports

def get_professionals_collection():
    return database.professionals

def get_mood_events_collection():
    return database.mood_events

def get_journal_entries_collection():
    """Get journal entries collection"""
    return database.journal_entries

def get_support_requests_collection():
    return database.support_requests

def get_geolocation_collection():
    return database.geolocation_events