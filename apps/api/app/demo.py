from app.domain.models import LearnerTwin, ModalityEffectiveness
from app.repositories.memory import MemoryRepository

DEMO_PARENT_ID = "10000000-0000-0000-0000-000000000001"
DEMO_CHILD_ID = "10000000-0000-0000-0000-000000000011"
DEMO_MISSION_ID = "10000000-0000-0000-0000-000000000111"


def seed_demo(repository: MemoryRepository) -> None:
    repository.create_child({"id": DEMO_CHILD_ID, "display_name": "Nova"})
    repository.put_twin(
        DEMO_CHILD_ID,
        LearnerTwin(
            mastery={"identify-three-quarters": 0.4},
            modality_effectiveness=ModalityEffectiveness(visual=0.75, gesture=0.75),
        ),
    )
    repository.create_mission(
        {
            "id": DEMO_MISSION_ID,
            "child_id": DEMO_CHILD_ID,
            "objective": "identify-three-quarters",
            "title": "Pizza Fractions",
            "supported_modes": [
                "standard",
                "visual",
                "gesture",
                "visual_gesture",
                "chunk",
                "voice",
                "movement",
                "story",
            ],
            "authored_content": {
                "prompt": "Select three of four equal pizza slices.",
                "simulation": {
                    "objectiveCompatibility": {
                        "standard": 0.15,
                        "visual": 0.55,
                        "visual_gesture": 1.0,
                    },
                    "novelty": {"visual_gesture": 0.1},
                },
            },
        }
    )
