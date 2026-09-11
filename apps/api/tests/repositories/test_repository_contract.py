from uuid import uuid4

import pytest

from app.domain.models import LearnerTwin
from app.repositories.protocols import RepositoryAccessError

from .conftest import RepositoryPair


def test_owned_twin_round_trip_and_cross_parent_isolation(
    repository_pair: RepositoryPair,
) -> None:
    child_id = str(uuid4())
    twin = LearnerTwin(mastery={"fractions": 0.45})

    repository_pair.parent_a.create_child({"id": child_id, "display_name": "Contract Child"})
    assert repository_pair.parent_a.get_child(child_id) is not None
    assert repository_pair.parent_b.get_child(child_id) is None
    assert repository_pair.parent_a.put_twin(child_id, twin) == twin
    assert repository_pair.parent_a.get_twin(child_id) == twin
    assert repository_pair.parent_b.get_twin(child_id) is None
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.put_twin(child_id, twin)
