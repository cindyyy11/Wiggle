"""Repository contract shared by local and Supabase persistence adapters."""

from collections.abc import Mapping
from typing import Protocol, runtime_checkable

from app.domain.models import LearnerTwin, LearningEvent

type Record = dict[str, object]


class RepositoryError(RuntimeError):
    """Base error raised when persistence cannot complete safely."""


class RepositoryAccessError(RepositoryError):
    """Raised when a record does not belong to the bound parent account."""


@runtime_checkable
class WiggleRepository(Protocol):
    """Parent-scoped persistence used by Wiggle's application services."""

    owner_id: str

    def create_child(self, child: Mapping[str, object]) -> Record: ...

    def get_child(self, child_id: str) -> Record | None: ...

    def list_children(self) -> list[Record]: ...

    def put_twin(
        self, child_id: str, twin: LearnerTwin, *, schema_version: int = 1
    ) -> LearnerTwin: ...

    def get_twin(self, child_id: str) -> LearnerTwin | None: ...

    def create_mission(self, mission: Mapping[str, object]) -> Record: ...

    def get_mission(self, mission_id: str) -> Record | None: ...

    def list_missions(self, child_id: str) -> list[Record]: ...

    def create_session(self, session: Mapping[str, object]) -> Record: ...

    def get_session(self, session_id: str) -> Record | None: ...

    def update_session(self, session_id: str, changes: Mapping[str, object]) -> Record: ...

    def append_event(self, event: LearningEvent, *, idempotency_key: str) -> LearningEvent: ...

    def list_events(
        self, child_id: str, *, session_id: str | None = None
    ) -> list[LearningEvent]: ...

    def create_intervention(self, intervention: Mapping[str, object]) -> Record: ...

    def update_intervention(
        self, intervention_id: str, changes: Mapping[str, object]
    ) -> Record: ...

    def list_interventions(self, child_id: str) -> list[Record]: ...

    def get_settings(self) -> Record | None: ...

    def put_settings(self, settings: Mapping[str, object]) -> Record: ...

    def add_check_in(self, check_in: Mapping[str, object]) -> Record: ...

    def list_check_ins(self, child_id: str) -> list[Record]: ...
