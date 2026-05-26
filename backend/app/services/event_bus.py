"""In-memory pub-sub for streaming long-running work to SSE clients.

A `ProjectStream` is created per project when analysis starts; the background
task publishes events to it, and any number of HTTP clients subscribe via the
SSE endpoint. Events are buffered so a late-joining client replays everything
from the start.

Streams are kept ~5 minutes after `close()` so a client that reconnects right
after the analysis finishes still gets the final summary. After that they're
dropped — the canonical state lives in Postgres anyway.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

RETENTION_SECONDS = 300


class ProjectStream:
    def __init__(self) -> None:
        self.buffer: list[dict[str, Any]] = []
        self.subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self.done = asyncio.Event()
        self.closed_at: Optional[float] = None

    def publish(self, event: dict[str, Any]) -> None:
        self.buffer.append(event)
        for q in list(self.subscribers):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("Stream subscriber queue full; dropping event.")

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=2048)
        for ev in self.buffer:
            try:
                q.put_nowait(ev)
            except asyncio.QueueFull:
                break
        self.subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[dict[str, Any]]) -> None:
        self.subscribers.discard(q)

    def close(self) -> None:
        self.done.set()
        self.closed_at = time.monotonic()


class EventBus:
    _streams: dict[str, ProjectStream] = {}

    @classmethod
    def get_or_create(cls, project_id: str) -> ProjectStream:
        cls._sweep()
        stream = cls._streams.get(project_id)
        if stream is None:
            stream = ProjectStream()
            cls._streams[project_id] = stream
        return stream

    @classmethod
    def get(cls, project_id: str) -> Optional[ProjectStream]:
        cls._sweep()
        return cls._streams.get(project_id)

    @classmethod
    def _sweep(cls) -> None:
        """Drop streams that finished more than RETENTION_SECONDS ago."""
        now = time.monotonic()
        stale = [
            pid for pid, s in cls._streams.items()
            if s.closed_at is not None and now - s.closed_at > RETENTION_SECONDS
        ]
        for pid in stale:
            cls._streams.pop(pid, None)
