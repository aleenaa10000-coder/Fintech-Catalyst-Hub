import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KeywordDifficultyEstimator from "../keyword-difficulty-estimator";

describe("Keyword Difficulty Estimator", () => {
  it("renders without crashing and shows the keyword input", () => {
    render(<KeywordDifficultyEstimator />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the Analyse button", () => {
    render(<KeywordDifficultyEstimator />);
    expect(screen.getByRole("button", { name: /^analyse$/i })).toBeTruthy();
  });

  it("Analyse button is disabled when keyword input is empty", () => {
    render(<KeywordDifficultyEstimator />);
    const btn = screen.getByRole("button", { name: /^analyse$/i });
    expect(btn).toBeDisabled();
  });

  it("enables Analyse button after typing at least 2 characters", async () => {
    const user = userEvent.setup();
    render(<KeywordDifficultyEstimator />);
    const input = screen.getAllByRole("textbox")[0];
    await user.type(input, "fintech payments");
    const btn = screen.getByRole("button", { name: /^analyse$/i });
    expect(btn).not.toBeDisabled();
  });

  it("displays difficulty results after clicking Analyse", async () => {
    const user = userEvent.setup();
    render(<KeywordDifficultyEstimator />);
    const input = screen.getAllByRole("textbox")[0];
    await user.type(input, "open banking api");
    await user.click(screen.getByRole("button", { name: /^analyse$/i }));
    expect(screen.getAllByText(/difficulty/i).length).toBeGreaterThan(0);
  });
});
