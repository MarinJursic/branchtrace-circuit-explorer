import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

    expect(screen.getByTestId("circuit-graph")).toBeTruthy();
    expect(screen.queryByTestId("layer-river")).toBeNull();

    await user.click(screen.getByTestId("view-river"));
    expect(screen.getByTestId("layer-river")).toBeTruthy();
    expect(screen.queryByTestId("circuit-graph")).toBeNull();
    expect(screen.getByTestId("view-river").getAttribute("aria-selected")).toBe("true");
  });

  it("suppresses the focus feature and reports the answer and downstream changes", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("run-intervention"));
    const result = screen.getByTestId("branch-result");

    expect(within(result).getByText("baseball")).toBeTruthy();
    expect(within(result).getByText("Layer 12")).toBeTruthy();
    expect(
      within(screen.getByTestId("changed-components")).getByText(
        /Basketball association → Sport answer feature → “basketball” logit/,
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("divergence-marker")).toBeTruthy();
  });

  it("uses selected-node semantics and clears stale output after selection", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("run-intervention"));
    expect(screen.getByText("baseball")).toBeTruthy();

    await user.click(screen.getByTestId("graph-node-error-jordan"));
    expect(screen.queryByText("baseball")).toBeNull();
    expect(screen.getByText("Run an intervention to materialize this branch")).toBeTruthy();

    await user.click(screen.getByTestId("run-intervention"));
    const result = screen.getByTestId("branch-result");
    expect(within(result).getByText("basketball")).toBeTruthy();
    expect(within(result).getByText("OUTPUT PRESERVED")).toBeTruthy();
    expect(within(result).getByText("None detected")).toBeTruthy();
    expect(within(result).getByText("No nodes crossed threshold")).toBeTruthy();
  });

  it("executes amplify and patch as different branch modes", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("mode-amplify"));
    await user.click(screen.getByTestId("run-intervention"));
    let result = screen.getByTestId("branch-result");
    expect(within(result).getByText("basketball")).toBeTruthy();
    expect(within(result).getByText("0.72")).toBeTruthy();
    expect(within(result).getByText("OUTPUT PRESERVED")).toBeTruthy();

    await user.click(screen.getByTestId("mode-patch"));
    expect(screen.getByText("Run an intervention to materialize this branch")).toBeTruthy();
    await user.click(screen.getByTestId("run-intervention"));
    result = screen.getByTestId("branch-result");
    expect(within(result).getByText("baseball")).toBeTruthy();
    expect(within(result).getByText("OUTPUT CHANGED")).toBeTruthy();
  });

  it("selects materially different artifacts and displays exact provenance", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("demo-arithmetic"));
    expect(screen.getAllByText("Compute: 36 + 59 =").length).toBeGreaterThan(0);
    expect(screen.getByText("95")).toBeTruthy();
    expect(screen.getByText("12-node subgraph")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "provenance" }));
    expect(screen.getAllByText("addition-carry-v2").length).toBeGreaterThan(0);
    expect(screen.getByText("deterministic-fixture")).toBeTruthy();
    expect(screen.getByText(/generated locally without model weights/i)).toBeTruthy();
  });

  it("opens the command palette and exposes an accessible node table", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByRole("button", { name: "Open command palette" }));
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Toggle accessible node table/i }));
    expect(screen.getByRole("table", { name: "Accessible circuit node table" })).toBeTruthy();
  });

  it("derives validation metrics and version contrast from active state", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("demo-arithmetic"));
    await user.click(screen.getByTestId("mode-amplify"));
    await user.click(screen.getByRole("tab", { name: "validation" }));

    expect(screen.getByText(/Carry-one feature, the amplify branch/)).toBeTruthy();
    expect(screen.getByText("0.66")).toBeTruthy();
    expect(screen.getByText("0.72")).toBeTruthy();
    expect(screen.getByText("0.06")).toBeTruthy();
    expect(screen.getByText(/no-carry contrast/i)).toBeTruthy();
    expect(screen.getByText(/bypasses carry/i)).toBeTruthy();
  });

  it("only offers tab close when it can perform a meaningful action", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    expect(screen.queryByRole("button", { name: /Close Jordan/ })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "More explorer actions" }),
    ).toBeNull();

    await user.click(screen.getByTestId("demo-arithmetic"));
    const close = screen.getByRole("button", { name: "Close Two-digit carry" });
    await user.click(close);
    expect(screen.queryByText("Compute: 36 + 59 =")).toBeNull();
    expect(screen.queryByRole("button", { name: /Close Jordan/ })).toBeNull();
  });

  it("supports command arrows and restores focus to its trigger", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    const trigger = screen.getByRole("button", {
      name: "Open command palette",
    });
    await user.click(trigger);
    const input = screen.getByRole("textbox", { name: "Command search" });
    expect(document.activeElement).toBe(input);

    await user.keyboard("{ArrowDown}{Enter}");
    expect(
      screen.getByRole("table", { name: "Accessible circuit node table" }),
    ).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("applies feature search to the accessible node table", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.type(
      screen.getByRole("textbox", { name: "Search circuit features" }),
      "country-name competitor",
    );
    await user.click(screen.getByRole("button", { name: "Node table" }));
    const table = screen.getByRole("table", {
      name: "Accessible circuit node table",
    });
    expect(within(table).getByText("Country-name competitor")).toBeTruthy();
    expect(within(table).queryByText("Basketball association")).toBeNull();
  });

  it("renders complete sha256 provenance identifiers", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);
    await user.click(screen.getByRole("tab", { name: "provenance" }));

    const hashes = screen.getAllByText(/^sha256:[a-f0-9]{64}$/);
    expect(hashes).toHaveLength(2);
  });
});
