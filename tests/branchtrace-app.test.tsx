import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { BranchTraceApp } from "../app/branchtrace-app";

afterEach(() => {
  cleanup();
  document.documentElement.dataset.theme = "light";
  window.localStorage.clear();
});

describe("BranchTraceApp interactions", () => {
  it("switches theme accessibly and persists the preference", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    const toggle = screen.getByTestId("theme-toggle");
    expect(toggle.getAttribute("aria-label")).toBe("Switch to dark theme");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await user.click(toggle);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem("branchtrace-theme")).toBe("dark");
    expect(toggle.getAttribute("aria-label")).toBe("Switch to light theme");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });

  it("switches between distinct Layer River and Circuit Graph views", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    expect(screen.getByTestId("layer-river")).toBeTruthy();
    expect(screen.queryByTestId("circuit-graph")).toBeNull();

    await user.click(screen.getByTestId("view-graph"));
    expect(screen.getByTestId("circuit-graph")).toBeTruthy();
    expect(screen.queryByTestId("layer-river")).toBeNull();
    expect(screen.getByTestId("view-graph").getAttribute("aria-selected")).toBe("true");
  });

  it("suppresses the focus feature and reports the answer and downstream changes", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("run-intervention"));
    const result = screen.getByTestId("branch-result");

    expect(within(result).getByText("Lyon")).toBeTruthy();
    expect(within(result).getByText("Layer 17")).toBeTruthy();
    expect(
      within(screen.getByTestId("changed-components")).getByText(
        /SAE feature 1,092 → “Paris” logit/,
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("divergence-marker")).toBeTruthy();
  });

  it("uses selected-node semantics and clears stale output after selection", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("run-intervention"));
    expect(screen.getByText("Lyon")).toBeTruthy();

    await user.click(screen.getByTestId("node-feature-812"));
    expect(screen.queryByText("Lyon")).toBeNull();
    expect(screen.getByText("Run an intervention to materialize this branch")).toBeTruthy();

    await user.click(screen.getByTestId("run-intervention"));
    const result = screen.getByTestId("branch-result");
    expect(within(result).getByText("Paris")).toBeTruthy();
    expect(within(result).getByText("ANSWER PRESERVED")).toBeTruthy();
    expect(within(result).getByText("None detected")).toBeTruthy();
    expect(within(result).getByText("No nodes crossed threshold")).toBeTruthy();
  });

  it("executes amplify and patch as different branch modes", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("mode-amplify"));
    await user.click(screen.getByTestId("run-intervention"));
    let result = screen.getByTestId("branch-result");
    expect(within(result).getByText("Paris")).toBeTruthy();
    expect(within(result).getByText("98.0%")).toBeTruthy();
    expect(within(result).getByText("ANSWER PRESERVED")).toBeTruthy();

    await user.click(screen.getByTestId("mode-patch"));
    expect(screen.getByText("Run an intervention to materialize this branch")).toBeTruthy();
    await user.click(screen.getByTestId("run-intervention"));
    result = screen.getByTestId("branch-result");
    expect(within(result).getByText("Lyon")).toBeTruthy();
    expect(within(result).getByText("CHANGED ANSWER")).toBeTruthy();
  });

  it("selects demos and displays a study-specific model-version diff", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("demo-arithmetic"));
    expect(screen.getByText("Compute: 47 + 38 =")).toBeTruthy();
    expect(screen.getAllByText("85")).toHaveLength(2);

    await user.click(screen.getByTestId("version-diff-toggle"));
    expect(screen.getByText("Math tune B")).toBeTruthy();
    expect(screen.getAllByText("L9 · SAE feature 2,036")).toHaveLength(2);
    expect(screen.getByText(/Fine-tuning strengthens the same carry feature/)).toBeTruthy();
  });
});
