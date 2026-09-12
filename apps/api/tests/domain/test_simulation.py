import json

import pytest

from app.domain.models import (
    LearnerTwin,
    ModalityEffectiveness,
    StrategyEffectiveness,
    canonical_probability,
)
from app.domain.simulation import (
    BASE_SUCCESS,
    FRICTION_WEIGHTS,
    MASTERY_GAIN_SCALE,
    MASTERY_OPPORTUNITY_WEIGHTS,
    ActivityCharacteristics,
    simulate,
)
from app.domain.strategies import STRATEGIES


@pytest.fixture
def seed_twin() -> LearnerTwin:
    return LearnerTwin(
        mastery={"fractions.three_quarters": 0.42},
        initiation_friction=0.2,
        persistence_friction=0.2,
        cognitive_load=0.25,
        transition_friction=0.2,
        fatigue_estimate=0.15,
        modality_effectiveness=ModalityEffectiveness(
            visual=0.9,
            voice=0.35,
            gesture=0.94,
            movement=0.4,
            story=0.45,
            text=0.45,
        ),
        strategy_effectiveness=StrategyEffectiveness(
            chunking=0.6,
            movement_break=0.4,
            visual_hint=0.9,
            voice_hint=0.35,
            choice=0.45,
        ),
    )


@pytest.fixture
def fraction_activity() -> ActivityCharacteristics:
    return ActivityCharacteristics(
        difficulty=0.58,
        objective_compatibility={
            "standard": 0.15,
            "chunked": 0.275,
            "visual": 0.55,
            "voice": 0.15,
            "gesture": 0.05,
            "visual_gesture": 1.0,
            "movement": 0.1,
            "story": 0.2,
            "challenge": 0.1,
        },
        novelty={
            "standard": 0.1,
            "chunked": 0.3,
            "visual": 0.1,
            "voice": 0.3,
            "gesture": 0.8,
            "visual_gesture": 0.1,
            "movement": 0.5,
            "story": 0.5,
            "challenge": 0.8,
        },
    )


def test_visual_gesture_wins_for_seeded_fraction_twin(
    seed_twin: LearnerTwin, fraction_activity: ActivityCharacteristics
) -> None:
    first = simulate(seed_twin, "fractions.three_quarters", fraction_activity)
    second = simulate(seed_twin, "fractions.three_quarters", fraction_activity)

    assert first == second
    assert first.recommended_strategy == "visual_gesture"
    assert [round(item.predicted_success, 2) for item in first.ranked[:3]] == [0.87, 0.68, 0.43]


def test_simulation_is_byte_for_byte_deterministic(
    seed_twin: LearnerTwin, fraction_activity: ActivityCharacteristics
) -> None:
    first = simulate(seed_twin, "fractions.three_quarters", fraction_activity)
    second = simulate(seed_twin, "fractions.three_quarters", fraction_activity)

    first_wire = first.model_dump_json(by_alias=True)
    second_wire = second.model_dump_json(by_alias=True)
    assert first_wire == second_wire
    assert json.loads(first_wire)["recommendedStrategy"] == "visual_gesture"


@pytest.mark.parametrize(
    ("twin", "activity"),
    [
        (LearnerTwin(), ActivityCharacteristics()),
        (
            LearnerTwin(
                mastery={"objective": 0.0},
                initiation_friction=1.0,
                persistence_friction=1.0,
                cognitive_load=1.0,
                transition_friction=1.0,
                fatigue_estimate=1.0,
                modality_effectiveness=ModalityEffectiveness(
                    visual=0.0, voice=0.0, gesture=0.0, movement=0.0, story=0.0, text=0.0
                ),
                strategy_effectiveness=StrategyEffectiveness(
                    chunking=0.0,
                    movement_break=0.0,
                    visual_hint=0.0,
                    voice_hint=0.0,
                    choice=0.0,
                ),
            ),
            ActivityCharacteristics(
                difficulty=1.0,
                objective_compatibility={
                    name: 0.0 for name in ActivityCharacteristics.strategy_names()
                },
                novelty={name: 1.0 for name in ActivityCharacteristics.strategy_names()},
            ),
        ),
    ],
)
def test_every_prediction_is_bounded(twin: LearnerTwin, activity: ActivityCharacteristics) -> None:
    report = simulate(twin, "objective", activity)

    assert len(report.ranked) == 9
    for prediction in report.ranked:
        assert 0 <= prediction.predicted_success <= 1
        assert 0 <= prediction.predicted_friction <= 1
        assert 0 <= prediction.expected_mastery_gain <= 1


def test_predictions_explain_every_named_weight(
    seed_twin: LearnerTwin, fraction_activity: ActivityCharacteristics
) -> None:
    report = simulate(seed_twin, "fractions.three_quarters", fraction_activity)

    factor_names = {factor.name for factor in report.ranked[0].factors}
    assert factor_names == {
        "modality_history",
        "strategy_history",
        "objective_compatibility",
        "current_friction",
        "fatigue",
        "cognitive_load",
        "novelty",
    }
    assert all(factor.explanation for factor in report.ranked[0].factors)


def test_all_advertised_outputs_reconstruct_from_named_configuration(
    seed_twin: LearnerTwin, fraction_activity: ActivityCharacteristics
) -> None:
    objective = "fractions.three_quarters"
    prediction = simulate(seed_twin, objective, fraction_activity).ranked[0]
    factor_values = {factor.name: factor.value for factor in prediction.factors}
    definition = next(item for item in STRATEGIES if item.name == prediction.strategy)

    expected_success = canonical_probability(
        BASE_SUCCESS + sum(factor.contribution for factor in prediction.factors)
    )
    friction_inputs = {
        "current_friction": factor_values["current_friction"],
        "cognitive_load": factor_values["cognitive_load"],
        "fatigue": factor_values["fatigue"],
        "novelty": factor_values["novelty"],
        "modality_history": factor_values["modality_history"],
        "objective_compatibility": factor_values["objective_compatibility"],
    }
    raw_expected_friction = definition.friction_modifier + sum(
        friction_inputs[name] * weight for name, weight in FRICTION_WEIGHTS.items()
    )
    expected_friction = max(0.0, min(1.0, raw_expected_friction))
    opportunity_inputs = {
        "activity_difficulty": fraction_activity.difficulty,
        "mastery_gap": 1.0 - seed_twin.mastery[objective],
    }
    learning_opportunity = sum(
        opportunity_inputs[name] * weight for name, weight in MASTERY_OPPORTUNITY_WEIGHTS.items()
    )
    expected_mastery_gain = (
        prediction.predicted_success
        * learning_opportunity
        * definition.learning_gain_multiplier
        * MASTERY_GAIN_SCALE
    )

    assert prediction.predicted_success == pytest.approx(expected_success)
    assert prediction.predicted_friction == pytest.approx(expected_friction)
    assert prediction.expected_mastery_gain == pytest.approx(expected_mastery_gain)


def test_equal_scores_use_declared_strategy_order() -> None:
    report = simulate(LearnerTwin(), "new-objective", ActivityCharacteristics())

    top_score = report.ranked[0].predicted_success
    tied_names = [item.strategy for item in report.ranked if item.predicted_success == top_score]
    assert tied_names == sorted(tied_names, key=ActivityCharacteristics.strategy_names().index)


def test_simulate_validates_mapping_inputs_and_rejects_empty_objectives() -> None:
    report = simulate(
        LearnerTwin(),
        "new-objective",
        {
            "difficulty": 0.4,
            "objectiveCompatibility": {"visual": 0.8},
            "novelty": {"visual": 0.1},
        },
    )

    assert report.objective == "new-objective"
    with pytest.raises(ValueError, match="objective must not be empty"):
        simulate(LearnerTwin(), "", ActivityCharacteristics())


def test_activity_defaults_are_complete_and_immutable() -> None:
    activity = ActivityCharacteristics()

    assert set(activity.objective_compatibility) == set(activity.strategy_names())
    assert set(activity.novelty) == set(activity.strategy_names())
    with pytest.raises(TypeError):
        activity.novelty["visual"] = 1.0
