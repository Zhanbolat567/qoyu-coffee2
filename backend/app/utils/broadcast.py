# app/utils/broadcast.py
from typing import Dict, Set
from starlette.websockets import WebSocket
import asyncio, json

class Hub:
    def __init__(self):
        self.channels: Dict[str, Set[WebSocket]] = {}

    async def join(self, channel: str, ws: WebSocket):
        await ws.accept()
        self.channels.setdefault(channel, set()).add(ws)

    def leave(self, channel: str, ws: WebSocket):
        self.channels.get(channel, set()).discard(ws)

    async def send(self, channel: str, payload: dict):
        conns = list(self.channels.get(channel, set()))
        if not conns:
            return
        msg = json.dumps(payload, ensure_ascii=False)
        living: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(msg)
                living.append(ws)
            except Exception:
                pass
        self.channels[channel] = set(living)

hub = Hub()
