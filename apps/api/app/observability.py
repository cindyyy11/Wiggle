"""Request diagnostics contain route templates and timing, never learner payloads."""

import json
import logging
from collections.abc import Awaitable, Callable
from time import perf_counter
from uuid import uuid4

from fastapi import Request, Response

logger = logging.getLogger("wiggle.requests")


async def request_summary(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    started = perf_counter()
    request_id = str(uuid4())
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        route = request.scope.get("route")
        logger.info(
            json.dumps(
                {
                    "event": "http_request",
                    "request_id": request_id,
                    "method": request.method,
                    "route": getattr(route, "path", "unmatched"),
                    "status": status,
                    "duration_ms": round((perf_counter() - started) * 1000, 1),
                }
            )
        )
