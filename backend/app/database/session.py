"""Database session compatibility layer (redirects to MongoDB)."""
from app.database.mongodb import get_db, init_mongodb, close_mongodb

def init_db():
    return init_mongodb()
