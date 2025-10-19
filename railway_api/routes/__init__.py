# railway_api/routes/__init__.py

"""
Route modules for the Mental Health App
Each module handles a specific feature domain
"""

from . import auth
from . import avatars
from . import mood
from . import geolocation
from . import professionals
from . import communities
from . import messaging

__all__ = ["auth", "avatars", "mood", "geolocation", "professionals", "communities", "messaging"]