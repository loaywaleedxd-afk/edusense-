"""
Singleton WebSocket notification manager.
Import `manager` in routers to push real-time events to connected users.
"""
from websocket_manager import ConnectionManager

manager = ConnectionManager()
