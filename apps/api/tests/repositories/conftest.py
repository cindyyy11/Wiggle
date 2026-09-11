import os
from collections.abc import Iterator
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import pytest

from app.repositories.memory import MemoryRepository, MemoryStore
from app.repositories.protocols import WiggleRepository
from app.repositories.supabase import SupabaseRepository

PARENT_A = "10000000-0000-0000-0000-000000000001"
PARENT_B = "20000000-0000-0000-0000-000000000002"


@dataclass(frozen=True)
class RepositoryPair:
    parent_a: WiggleRepository
    parent_b: WiggleRepository


@pytest.fixture(params=("memory", "supabase"), ids=("memory", "local-supabase"))
def repository_pair(request: pytest.FixtureRequest) -> Iterator[RepositoryPair]:
    """Run one contract against memory and an explicitly configured local stack."""

    if request.param == "memory":
        store = MemoryStore()
        yield RepositoryPair(MemoryRepository(PARENT_A, store), MemoryRepository(PARENT_B, store))
        return

    url = os.getenv("WIGGLE_TEST_SUPABASE_URL", "")
    anon_key = os.getenv("WIGGLE_TEST_SUPABASE_ANON_KEY", "")
    token_a = os.getenv("WIGGLE_TEST_PARENT_A_ACCESS_TOKEN", "")
    token_b = os.getenv("WIGGLE_TEST_PARENT_B_ACCESS_TOKEN", "")
    if not all((url, anon_key, token_a, token_b)):
        pytest.skip("local Supabase contract credentials are unavailable")
    if urlparse(url).hostname not in {"127.0.0.1", "localhost", "::1"}:
        pytest.skip("WIGGLE_TEST_SUPABASE_URL must point to a local Supabase stack")
    try:
        request = Request(
            f"{url.rstrip('/')}/auth/v1/health",
            headers={"apikey": anon_key},
            method="GET",
        )
        with urlopen(request, timeout=1):  # noqa: S310
            pass
    except HTTPError as error:
        pytest.fail(f"configured local Supabase health check returned HTTP {error.code}")
    except URLError:
        pytest.skip("configured local Supabase services are unavailable")

    yield RepositoryPair(
        SupabaseRepository(
            url=url,
            anon_key=anon_key,
            access_token=token_a,
            owner_id=PARENT_A,
        ),
        SupabaseRepository(
            url=url,
            anon_key=anon_key,
            access_token=token_b,
            owner_id=PARENT_B,
        ),
    )
