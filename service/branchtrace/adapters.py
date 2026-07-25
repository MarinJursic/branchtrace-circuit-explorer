from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from hashlib import sha256
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class ActivationSlice:
    """Framework-neutral activation payload at the model-adapter boundary."""

    component_id: str
    layer: int
    values: Sequence[float]


@runtime_checkable
class ActivationProvider(Protocol):
    """Contract implemented by fixture, PyTorch-hook, or remote trace adapters."""

    def capture(self, prompt: str) -> list[ActivationSlice]:
        """Return selected intermediate activations for one forward pass."""

    def patch(
        self,
        prompt: str,
        component_id: str,
        replacement: ActivationSlice,
    ) -> str:
        """Continue an execution with one replacement activation."""


class FixtureActivationProvider:
    """Small executable adapter used to verify the provider contract locally.

    It is deliberately not wired into :class:`CircuitEngine`: the engine's
    demonstration values are precomputed summaries, while this provider proves
    that callers can capture and patch caller-supplied activation slices without
    importing a model framework.
    """

    def __init__(self, activations: Mapping[str, ActivationSlice]) -> None:
        self._activations = dict(activations)

    def capture(self, prompt: str) -> list[ActivationSlice]:
        if not prompt.strip():
            raise ValueError("prompt must not be blank")
        return [self._activations[key] for key in sorted(self._activations)]

    def patch(
        self,
        prompt: str,
        component_id: str,
        replacement: ActivationSlice,
    ) -> str:
        if not prompt.strip():
            raise ValueError("prompt must not be blank")
        if component_id not in self._activations:
            raise KeyError(component_id)
        original = self._activations[component_id]
        if replacement.component_id != component_id:
            raise ValueError("replacement component_id must match the patch target")
        if replacement.layer != original.layer:
            raise ValueError("replacement layer must match the patch target")
        if len(replacement.values) != len(original.values):
            raise ValueError("replacement activation shape must match the patch target")
        payload = f"{prompt}:{component_id}:{replacement.layer}:{tuple(replacement.values)}"
        return sha256(payload.encode()).hexdigest()[:16]


class TorchHookBoundary:
    """Explicit seam for a future torch.nn.Module-backed provider.

    The MVP deliberately does not import or download a model. A production adapter
    can accept a caller-owned ``torch.nn.Module``, register forward hooks, and
    implement ``ActivationProvider`` without changing the API or circuit engine.
    """

    def __init__(self, model: object) -> None:
        self.model = model

    def capture(self, prompt: str) -> list[ActivationSlice]:
        raise NotImplementedError("Connect a caller-owned model and hook policy here.")

    def patch(
        self,
        prompt: str,
        component_id: str,
        replacement: ActivationSlice,
    ) -> str:
        raise NotImplementedError("Connect the model-specific forward continuation here.")
