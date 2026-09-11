import re
from pathlib import Path

from app.demo import DEMO_CHILD_ID, DEMO_MISSION_ID, seed_demo
from app.domain.models import LearnerTwin
from app.repositories.memory import MemoryRepository

ROOT = Path(__file__).parents[4]
MIGRATION = ROOT / "supabase/migrations/20260911000000_initial_wiggle_schema.sql"
RLS_TEST = ROOT / "supabase/tests/rls.test.sql"


def compact_sql(path: Path) -> str:
    return " ".join(path.read_text(encoding="utf-8").lower().split())


def test_event_payload_check_is_total_and_requires_matching_kind() -> None:
    migration = compact_sql(MIGRATION)

    assert "payload ->> 'kind' = event_type ) is true" in migration


def test_rls_sql_covers_missing_and_null_event_discriminators() -> None:
    sql = RLS_TEST.read_text(encoding="utf-8").lower()

    assert "event-missing-kind" in sql
    assert "event-null-kind" in sql
    planned = int(re.search(r"select plan\((\d+)\)", sql).group(1))
    assertions = len(
        re.findall(r"^select (?:has_table|has_index|ok|is|lives_ok|throws_ok)\(", sql, re.M)
    )
    assert planned == assertions


def test_local_sql_seed_matches_the_tested_hero_twin_and_mission() -> None:
    import json

    sql = (ROOT / "supabase/seed.sql").read_text(encoding="utf-8")
    documents = [json.loads(value) for value in re.findall(r"'([^']+)'::jsonb", sql)]
    repository = MemoryRepository("10000000-0000-0000-0000-000000000001")
    seed_demo(repository)
    assert LearnerTwin.model_validate(documents[0]) == repository.get_twin(DEMO_CHILD_ID)
    mission = repository.get_mission(DEMO_MISSION_ID)
    assert mission is not None
    assert documents[1] == mission["authored_content"]
    modes = re.search(r"array\[([^]]+)\]", sql)
    assert modes is not None
    assert re.findall(r"'([^']+)'", modes.group(1)) == mission["supported_modes"]
