import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { BranchTraceApp } from "../app/branchtrace-app";

afterEach(() => {
  cleanup();
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "";
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

  it("switches among legible Graph, River, and table representations", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    expect(screen.getByTestId("circuit-graph")).toBeTruthy();

    await user.click(screen.getByTestId("view-river"));
    expect(screen.getByTestId("layer-river")).toBeTruthy();
    expect(screen.getByTestId("view-river").getAttribute("aria-pressed")).toBe(
      "true",
    );

    await user.click(screen.getByTestId("view-table"));
    expect(
      screen.getByRole("table", { name: "Accessible circuit node table" }),
    ).toBeTruthy();
    expect(screen.getByTestId("view-table").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("provides a complete compact labeled overview for phone layouts", () => {
    render(<BranchTraceApp />);

    const overview = screen.getByRole("group", {
      name: "Compact graph overview",
    });
    expect(
      within(overview).getByText("Use Table to select a component"),
    ).toBeTruthy();
    expect(within(overview).getAllByRole("listitem")).toHaveLength(9);
    expect(within(overview).getByText("Basketball association")).toBeTruthy();
    expect(
      within(overview)
        .getByText("Basketball association")
        .closest("li")
        ?.getAttribute("aria-current"),
    ).toBe("true");
  });

  it("runs the default causal branch and reports the changed path", async () => {
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
    expect(
      screen.getByRole("heading", {
        name: "The stored branch changes the output.",
      }),
    ).toBeTruthy();
  });

  it("clears stale evidence when the selected component changes", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("run-intervention"));
    expect(screen.getByText("baseball")).toBeTruthy();

    await user.click(screen.getByTestId("graph-node-error-jordan"));
    expect(screen.queryByText("baseball")).toBeNull();
    expect(screen.getByText("Awaiting intervention")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Run the branch before interpreting the trace.",
      }),
    ).toBeTruthy();

    await user.click(screen.getByTestId("run-intervention"));
    const result = screen.getByTestId("branch-result");
    expect(within(result).getByText("basketball")).toBeTruthy();
    expect(within(result).getByText("Output preserved")).toBeTruthy();
    expect(within(result).getByText("None detected")).toBeTruthy();
    expect(
      within(result).getByText("No nodes crossed the stored threshold"),
    ).toBeTruthy();
  });

  it("executes amplify and patch as distinct radio-selected modes", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("mode-amplify"));
    expect(
      (screen.getByTestId("mode-amplify") as HTMLInputElement).checked,
    ).toBe(true);
    await user.click(screen.getByTestId("run-intervention"));
    let result = screen.getByTestId("branch-result");
    expect(within(result).getByText("basketball")).toBeTruthy();
    expect(within(result).getByText("0.72")).toBeTruthy();
    expect(within(result).getByText("Output preserved")).toBeTruthy();

    await user.click(screen.getByTestId("mode-patch"));
    expect(screen.getByText("Awaiting intervention")).toBeTruthy();
    await user.click(screen.getByTestId("run-intervention"));
    result = screen.getByTestId("branch-result");
    expect(within(result).getByText("baseball")).toBeTruthy();
    expect(within(result).getByText("Output changed")).toBeTruthy();
  });

  it("resets a completed branch without changing the selected hypothesis", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("run-intervention"));
    await user.click(screen.getByRole("button", { name: "Reset branch" }));

    expect(screen.getByText("Awaiting intervention")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Basketball association" }),
    ).toBeTruthy();
    expect(screen.queryByText("baseball")).toBeNull();
  });

  it("opens every fixture study and resets the trace state", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    for (const [id, prompt, title] of [
      ["translation", "Mexico uses the peso; Thailand uses the", "Peso → baht"],
      [
        "refusal",
        "National Aeronautics and Space Administration is abbreviated",
        "Expansion → NASA",
      ],
      ["arithmetic", "Compute: 36 + 59 =", "Two-digit carry"],
      [
        "factual-recall",
        "Michael Jordan is best known for playing the sport of",
        "Jordan → basketball",
      ],
    ]) {
      await user.click(screen.getByTestId(`demo-${id}`));
      expect(screen.getAllByText(prompt).length).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
      expect(screen.getByText("Awaiting intervention")).toBeTruthy();
      expect(screen.getByTestId("circuit-graph")).toBeTruthy();
    }
  });

  it("filters the table and keeps node selection equivalent to the graph", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.type(
      screen.getByRole("textbox", { name: "Search circuit features" }),
      "country-name competitor",
    );
    await user.click(screen.getByTestId("view-table"));

    const table = screen.getByRole("table", {
      name: "Accessible circuit node table",
    });
    expect(within(table).getByText("Country-name competitor")).toBeTruthy();
    expect(within(table).queryByText("Basketball association")).toBeNull();

    await user.click(
      within(table).getByRole("button", {
        name: "Country-name competitor",
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Country-name competitor" }),
    ).toBeTruthy();
  });

  it("derives validation values and contrast from active state", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    await user.click(screen.getByTestId("demo-arithmetic"));
    await user.click(screen.getByTestId("mode-amplify"));
    await user.click(screen.getByTestId("run-intervention"));

    const values = screen.getByRole("region", { name: "Validation values" });
    expect(within(values).getByText("0.66")).toBeTruthy();
    expect(within(values).getByText("0.72")).toBeTruthy();
    expect(within(values).getByText("0.06")).toBeTruthy();
    expect(screen.getByText(/no-carry contrast/i)).toBeTruthy();
    expect(screen.getByText(/bypasses carry/i)).toBeTruthy();
  });

  it("reveals complete provenance only on request", async () => {
    const user = userEvent.setup();
    render(<BranchTraceApp />);

    const details = screen
      .getByText("Inspect artifact provenance and limitations")
      .closest("details");
    expect(details?.hasAttribute("open")).toBe(false);
    await user.click(
      screen.getByText("Inspect artifact provenance and limitations"),
    );

    expect(details?.hasAttribute("open")).toBe(true);
    expect(screen.getByText("deterministic-fixture")).toBeTruthy();
    expect(screen.getByText(/generated locally without model weights/i)).toBeTruthy();
    expect(screen.getAllByText(/^sha256:[a-f0-9]{64}$/)).toHaveLength(2);
  });

  it("gives every visible button a meaningful accessible name", () => {
    render(<BranchTraceApp />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(10);
    for (const button of buttons) {
      expect(button.getAttribute("aria-label") ?? button.textContent?.trim()).toBeTruthy();
    }
  });

  it("removes nonessential IDE chrome and inactive controls", () => {
    render(<BranchTraceApp />);

    expect(screen.queryByRole("button", { name: /command palette/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
    expect(screen.queryByText(/minimap/i)).toBeNull();
    expect(screen.queryByText(/graph\.json/i)).toBeNull();
    expect(screen.queryByText(/main\*/i)).toBeNull();
  });
});
