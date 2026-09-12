"""Child-facing endpoints. No parent PIN: this is the child's own progress and Twin.

Everything returned here is already child-safe (probabilities and short text, no
diagnostic language); the child client is responsible for rendering it through the
visual mapping (getTwinVisualState / getConstellationStars), never as raw numbers.
Reusing ParentService keeps the child screen, the parent dashboard, and the backend
as three views of the same underlying Learner Digital Twin, per Wiggle's design.
"""

from fastapi import APIRouter

from app.dependencies import Sessions
from app.schemas import ParentInsightsResponse
from app.services.parent import ParentService

router = APIRouter(prefix="/child", tags=["child"])


@router.get("/{child_id}/progress", response_model=ParentInsightsResponse)
def progress(child_id: str, sessions: Sessions) -> ParentInsightsResponse:
    return ParentService(sessions).insights(child_id)
