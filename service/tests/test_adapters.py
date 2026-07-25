from __future__ import annotations

import pytest

from branchtrace.adapters import (
    ActivationProvider,
    ActivationSlice,
    FixtureActivationProvider,
)


@pytest.fixture()
def provider() -> FixtureActivationProvider:
    return FixtureActivationProvider(
        {
            "head-4-7": ActivationSlice("head-4-7", 4, (0.1, 0.2, 0.3)),
            "feature-423": ActivationSlice("feature-423", 9, (0.8, -0.2)),
        }
    )


def test_fixture_provider_satisfies_runtime_contract(
    provider: FixtureActivationProvider,
) -> None:
    assert isinstance(provider, ActivationProvider)
    captured = provider.capture("The Eiffel Tower is located in")
    assert [item.component_id for item in captured] == ["feature-423", "head-4-7"]


def test_patch_is_deterministic_and_shape_checked(
    provider: FixtureActivationProvider,
) -> None:
    replacement = ActivationSlice("feature-423", 9, (0.4, -0.1))
    first = provider.patch("prompt", "feature-423", replacement)
    second = provider.patch("prompt", "feature-423", replacement)
    assert first == second
    assert len(first) == 16

    with pytest.raises(ValueError, match="shape"):
        provider.patch(
            "prompt",
            "feature-423",
            ActivationSlice("feature-423", 9, (0.4,)),
        )


def test_provider_rejects_wrong_target_and_blank_prompt(
    provider: FixtureActivationProvider,
) -> None:
    with pytest.raises(KeyError):
        provider.patch(
            "prompt",
            "missing",
            ActivationSlice("missing", 1, (0.1,)),
        )
    with pytest.raises(ValueError, match="prompt"):
        provider.capture(" ")
