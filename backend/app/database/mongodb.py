"""
Smart EV MongoDB Database Module
=================================
Manages MongoDB connections, collection indexes, ObjectId conversions,
and database lifecycle using PyMongo.

Manual Input mode - no image analysis or OCR collections.
"""

import logging
from typing import Optional, Union, Dict, Any, List, Tuple
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.core.config import settings

logger = logging.getLogger("smart-ev.mongodb")

_client: Optional[MongoClient] = None
_db: Optional[Database] = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=3000,
        )
    return _client


def get_db() -> Database:
    """Dependency / accessor for the smart_ev_db database."""
    global _db
    if _db is None:
        client = get_client()
        _db = client[settings.MONGODB_DATABASE]
    return _db


def check_mongodb_connection() -> Tuple[bool, str]:
    """Test actual connectivity to the MongoDB server."""
    try:
        client = get_client()
        # The ping command is cheap and does not require auth
        client.admin.command("ping")
        return True, "connected"
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error(f"MongoDB connection failed: {e}")
        return False, f"Connection failed: {str(e)}"
    except Exception as e:
        logger.error(f"MongoDB unexpected connection error: {e}")
        return False, f"Unexpected error: {str(e)}"


def init_mongodb():
    """Verify connection and create required collection indexes."""
    connected, msg = check_mongodb_connection()
    if not connected:
        logger.error(
            f"Could not connect to MongoDB at {settings.MONGODB_URI}! "
            f"Please ensure MongoDB Community Server is running. ({msg})"
        )
        return False

    db = get_db()
    logger.info(f"Connected to MongoDB ({settings.MONGODB_DATABASE}) at {settings.MONGODB_URI}")

    try:
        from pymongo import DESCENDING
        # 1. users collection: unique index on lowercase email
        db.users.create_index([("email", ASCENDING)], unique=True, name="idx_users_email_unique")

        # 2. vehicles collection: index on user_id and created_at
        db.vehicles.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_vehicles_user_created")
        db.vehicles.create_index([("user_id", ASCENDING)], name="idx_vehicles_user_id")

        # 3. journeys collection: index on user_id and created_at
        db.journeys.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_journeys_user_created")
        db.journeys.create_index([("user_id", ASCENDING)], name="idx_journeys_user_id")

        # 4. battery_states collection: index on user_id and vehicle_id
        db.battery_states.create_index([("user_id", ASCENDING)], name="idx_battery_states_user_id")

        # 5. notification_logs collection: index on user_id and created_at
        db.notification_logs.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_notif_logs_user_created")

        logger.info("MongoDB collection indexes verified and created.")
        return True
    except Exception as e:
        logger.warning(f"Warning while configuring MongoDB indexes: {e}")
        return True


def close_mongodb():
    """Safely close client connections on shutdown."""
    global _client, _db
    if _client is not None:
        logger.info("Closing MongoDB connection pool.")
        _client.close()
        _client = None
        _db = None


def to_object_id(val: Union[str, ObjectId, int, None]) -> Optional[ObjectId]:
    """Convert string/value to ObjectId safely."""
    if val is None:
        return None
    if isinstance(val, ObjectId):
        return val
    try:
        val_str = str(val).strip()
        if not val_str:
            return None
        return ObjectId(val_str)
    except Exception:
        return None


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Ensure all MongoDB BSON ObjectId values are converted to strings
    and provide both 'id' and '_id' string fields for frontend compatibility.
    """
    if doc is None:
        return None
    res = dict(doc)
    if "_id" in res:
        str_id = str(res["_id"])
        res["id"] = str_id
        res["_id"] = str_id

    # Convert known foreign key fields if stored as ObjectId
    for key in ["user_id", "vehicle_id"]:
        if key in res and isinstance(res[key], ObjectId):
            res[key] = str(res[key])

    return res


def serialize_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Serialize list of MongoDB documents."""
    return [serialize_doc(d) for d in docs if d is not None]


# CRUD helper functions for generic collections

def insert_one(collection_name: str, data: dict) -> str:
    """Insert a document into the specified collection and return its string ID."""
    db = get_db()
    result = db[collection_name].insert_one(data)
    return str(result.inserted_id)


def find_one(collection_name: str, filter: dict) -> Optional[dict]:
    """Find a single document matching filter and return serialized dict or None."""
    db = get_db()
    doc = db[collection_name].find_one(filter)
    return serialize_doc(doc)


def find_many(collection_name: str, filter: dict, skip: int = 0, limit: int = 100) -> List[dict]:
    """Find multiple documents with pagination, returning a list of serialized docs."""
    db = get_db()
    cursor = db[collection_name].find(filter).skip(skip).limit(limit)
    docs = list(cursor)
    return serialize_docs(docs)


def update_one(collection_name: str, filter: dict, update: dict) -> bool:
    """Update a single document matching filter with provided update dict. Returns True if a document was modified."""
    db = get_db()
    result = db[collection_name].update_one(filter, {"$set": update})
    return result.modified_count > 0


def delete_one(collection_name: str, filter: dict) -> bool:
    """Delete a single document matching filter. Returns True if a document was deleted."""
    db = get_db()
    result = db[collection_name].delete_one(filter)
    return result.deleted_count > 0
