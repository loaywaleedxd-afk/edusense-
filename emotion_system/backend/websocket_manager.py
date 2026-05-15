"""
WebSocket Connection Manager — manages per-lecture rooms
"""
from fastapi import WebSocket
from typing import Dict, List
import asyncio
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # lecture_id -> list of connected websockets
        self.rooms: Dict[str, List[WebSocket]] = {}

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
