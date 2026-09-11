import re
from pathlib import Path

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
