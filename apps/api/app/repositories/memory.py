"""Deterministic, parent-scoped in-memory repository for tests and demos."""

from collections.abc import Mapping
from copy import deepcopy
from dataclasses import dataclass, field

from app.domain.models import LearnerTwin, LearningEvent
from app.repositories.protocols import Record, RepositoryAccessError, RepositoryError


def _copy(record: Mapping[str, object]) -> Record:
    return deepcopy(dict(record))


@dataclass
class MemoryStore:
    """Shareable backing store used to test household isolation."""

    children: dict[str, Record] = field(default_factory=dict)
    twins: dict[str, Record] = field(default_factory=dict)
    missions: dict[str, Record] = field(default_factory=dict)
    sessions: dict[str, Record] = field(default_factory=dict)
    events: dict[str, Record] = field(default_factory=dict)
    event_keys: dict[tuple[str, str], str] = field(default_factory=dict)
    interventions: dict[str, Record] = field(default_factory=dict)
    settings: dict[str, Record] = field(default_factory=dict)
    check_ins: dict[str, Record] = field(default_factory=dict)


class MemoryRepository:
    """Repository whose authorization behavior mirrors database RLS."""

    def __init__(self, owner_id: str, store: MemoryStore | None = None) -> None:
        if not owner_id:
            raise ValueError("owner_id must not be empty")
        self.owner_id = owner_id
        self._store = store or MemoryStore()

    @staticmethod
    def _identifier(record: Mapping[str, object]) -> str:
        identifier = record.get("id")
        if not isinstance(identifier, str) or not identifier:
            raise RepositoryError("record requires a non-empty string id")
        return identifier

    def _owned_child(self, child_id: object) -> Record:
        if not isinstance(child_id, str):
            raise RepositoryAccessError("record requires a valid child_id")
        child = self._store.children.get(child_id)
        if child is None or child.get("parent_id") != self.owner_id:
            raise RepositoryAccessError("child does not belong to this parent")
        return child

    def _insert(self, collection: dict[str, Record], record: Mapping[str, object]) -> Record:
        identifier = self._identifier(record)
        if identifier in collection:
            raise RepositoryError(f"record already exists: {identifier}")
        stored = _copy(record)
        collection[identifier] = stored
        return _copy(stored)

    def create_child(self, child: Mapping[str, object]) -> Record:
        record = _copy(child)
        requested_parent = record.setdefault("parent_id", self.owner_id)
        if requested_parent != self.owner_id:
            raise RepositoryAccessError("cannot create a child for another parent")
        return self._insert(self._store.children, record)

    def get_child(self, child_id: str) -> Record | None:
        child = self._store.children.get(child_id)
        if child is None or child.get("parent_id") != self.owner_id:
            return None
        return _copy(child)

    def list_children(self) -> list[Record]:
        return [
            _copy(child)
            for child in self._store.children.values()
            if child.get("parent_id") == self.owner_id
        ]

    def put_twin(self, child_id: str, twin: LearnerTwin, *, schema_version: int = 1) -> LearnerTwin:
        self._owned_child(child_id)
        if schema_version < 1:
            raise RepositoryError("schema_version must be positive")
        self._store.twins[child_id] = {
            "child_id": child_id,
            "twin": twin.model_dump(mode="json"),
            "schema_version": schema_version,
        }
        return LearnerTwin.model_validate(self._store.twins[child_id]["twin"])

    def get_twin(self, child_id: str) -> LearnerTwin | None:
        try:
            self._owned_child(child_id)
        except RepositoryAccessError:
            return None
        record = self._store.twins.get(child_id)
        return None if record is None else LearnerTwin.model_validate(record["twin"])

    def create_mission(self, mission: Mapping[str, object]) -> Record:
        self._owned_child(mission.get("child_id"))
        return self._insert(self._store.missions, mission)

    def get_mission(self, mission_id: str) -> Record | None:
        mission = self._store.missions.get(mission_id)
        if mission is None:
            return None
        try:
            self._owned_child(mission.get("child_id"))
        except RepositoryAccessError:
            return None
        return _copy(mission)

    def list_missions(self, child_id: str) -> list[Record]:
        try:
            self._owned_child(child_id)
        except RepositoryAccessError:
            return []
        return [
            _copy(mission)
            for mission in self._store.missions.values()
            if mission.get("child_id") == child_id
        ]

    def create_session(self, session: Mapping[str, object]) -> Record:
        child_id = session.get("child_id")
        self._owned_child(child_id)
        mission = self.get_mission(str(session.get("mission_id", "")))
        if mission is None or mission.get("child_id") != child_id:
            raise RepositoryAccessError("session mission must belong to its child")
        return self._insert(self._store.sessions, session)

    def get_session(self, session_id: str) -> Record | None:
        session = self._store.sessions.get(session_id)
        if session is None:
            return None
        try:
            self._owned_child(session.get("child_id"))
        except RepositoryAccessError:
            return None
        return _copy(session)

    def update_session(self, session_id: str, changes: Mapping[str, object]) -> Record:
        current = self.get_session(session_id)
        if current is None:
            raise RepositoryAccessError("session is not available to this parent")
        if "id" in changes or "child_id" in changes or "mission_id" in changes:
            raise RepositoryError("session identity and ownership fields are immutable")
        current.update(_copy(changes))
        self._store.sessions[session_id] = current
        return _copy(current)

    def append_event(self, event: LearningEvent, *, idempotency_key: str) -> LearningEvent:
        if not idempotency_key:
            raise RepositoryError("idempotency_key must not be empty")
        self._owned_child(event.child_id)
        session = self.get_session(event.session_id)
        if session is None or session.get("child_id") != event.child_id:
            raise RepositoryAccessError("event session must belong to its child")
        event_key = (event.session_id, idempotency_key)
        existing_id = self._store.event_keys.get(event_key)
        if existing_id is not None:
            existing = LearningEvent.model_validate(self._store.events[existing_id])
            if existing != event:
                raise RepositoryError("idempotency key was already used for another event")
            return existing
        record = event.model_dump(mode="json")
        record["idempotency_key"] = idempotency_key
        self._insert(self._store.events, record)
        self._store.event_keys[event_key] = event.id
        return event

    def list_events(self, child_id: str, *, session_id: str | None = None) -> list[LearningEvent]:
        try:
            self._owned_child(child_id)
        except RepositoryAccessError:
            return []
        records = [
            record
            for record in self._store.events.values()
            if record.get("child_id") == child_id
            and (session_id is None or record.get("session_id") == session_id)
        ]
        records.sort(key=lambda record: str(record.get("occurred_at", "")))
        return [LearningEvent.model_validate(record) for record in records]

    def create_intervention(self, intervention: Mapping[str, object]) -> Record:
        child_id = intervention.get("child_id")
        self._owned_child(child_id)
        session = self.get_session(str(intervention.get("session_id", "")))
        if session is None or session.get("child_id") != child_id:
            raise RepositoryAccessError("intervention session must belong to its child")
        return self._insert(self._store.interventions, intervention)

    def update_intervention(self, intervention_id: str, changes: Mapping[str, object]) -> Record:
        current = self._store.interventions.get(intervention_id)
        if current is None:
            raise RepositoryAccessError("intervention is not available to this parent")
        self._owned_child(current.get("child_id"))
        if "id" in changes or "child_id" in changes or "session_id" in changes:
            raise RepositoryError("intervention identity and ownership fields are immutable")
        updated = _copy(current)
        updated.update(_copy(changes))
        self._store.interventions[intervention_id] = updated
        return _copy(updated)

    def list_interventions(self, child_id: str) -> list[Record]:
        try:
            self._owned_child(child_id)
        except RepositoryAccessError:
            return []
        return [
            _copy(intervention)
            for intervention in self._store.interventions.values()
            if intervention.get("child_id") == child_id
        ]

    def get_settings(self) -> Record | None:
        settings = self._store.settings.get(self.owner_id)
        return None if settings is None else _copy(settings)

    def put_settings(self, settings: Mapping[str, object]) -> Record:
        record = _copy(settings)
        requested_parent = record.setdefault("parent_id", self.owner_id)
        if requested_parent != self.owner_id:
            raise RepositoryAccessError("cannot change another parent's settings")
        self._store.settings[self.owner_id] = record
        return _copy(record)

    def add_check_in(self, check_in: Mapping[str, object]) -> Record:
        self._owned_child(check_in.get("child_id"))
        record = _copy(check_in)
        requested_parent = record.setdefault("parent_id", self.owner_id)
        if requested_parent != self.owner_id:
            raise RepositoryAccessError("cannot create another parent's check-in")
        return self._insert(self._store.check_ins, record)

    def list_check_ins(self, child_id: str) -> list[Record]:
        try:
            self._owned_child(child_id)
        except RepositoryAccessError:
            return []
        return [
            _copy(check_in)
            for check_in in self._store.check_ins.values()
            if check_in.get("child_id") == child_id
        ]
