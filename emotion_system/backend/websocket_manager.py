"""
WebSocket Connection Manager — manages per-lecture rooms AND per-user notification channels
"""
from fastapi import WebSocket
from typing import Dict, List
import asyncio
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # lecture_id -> list of connected websockets
        self.rooms: Dict[str, List[WebSocket]] = {}
        # user_id -> list of notification websockets
        self.user_connections: Dict[str, List[WebSocket]] = {}

    # ── Lecture rooms ──────────────────────────────────────────────────────────
    async def connect(self, websocket: WebSocket, lecture_id: str):
        await websocket.accept()
        if lecture_id not in self.rooms:
            self.rooms[lecture_id] = []
        self.rooms[lecture_id].append(websocket)
        logger.info(f"Client connected to lecture {lecture_id}. Total: {len(self.rooms[lecture_id])}")

    def disconnect(self, websocket: WebSocket, lecture_id: str):
        if lecture_id in self.rooms:
            self.rooms[lecture_id] = [ws for ws in self.rooms[lecture_id] if ws != websocket]
        logger.info(f"Client disconnected from lecture {lecture_id}")

    async def broadcast(self, lecture_id: str, message: str):
        if lecture_id not in self.rooms:
            return
        dead = []
        for ws in self.rooms[lecture_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.rooms[lecture_id].remove(ws)

    async def send_personal(self, websocket: WebSocket, message: str):
        await websocket.send_text(message)

    def get_room_count(self, lecture_id: str) -> int:
        return len(self.rooms.get(lecture_id, []))

    # ── Per-user notification channels ────────────────────────────────────────
    async def connect_user(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
        logger.info(f"Notification WS connected for user {user_id}")

    def disconnect_user(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_connections:
            self.user_connections[user_id] = [
                ws for ws in self.user_connections[user_id] if ws != websocket
            ]
        logger.info(f"Notification WS disconnected for user {user_id}")

    async def notify_user(self, user_id: str, payload: dict):
        """Send a JSON notification to a specific user across all their connections."""
        conns = self.user_connections.get(user_id, [])
        if not conns:
            return
        msg = json.dumps(payload)
        dead = []
        for ws in conns:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.remove(ws)

    async def notify_all_users(self, payload: dict):
        """Broadcast a notification to all connected users."""
        msg = json.dumps(payload)
        for user_id, conns in list(self.user_connections.items()):
            dead = []
            for ws in conns:
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                conns.remove(ws)
