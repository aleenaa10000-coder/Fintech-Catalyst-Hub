import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeadlineAnalyzer from "../headline-analyzer";

describe("Headline Analyzer", () => {
  it("renders without crashing and shows headline input", () => {
    render(<HeadlineAnalyzer />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the Analyze Headline button", () => {
    render(<HeadlineAnalyzer />);
    expect(screen.getByRole("button", { name: /analyze headline/i })).toBeTruthy();
  });

  it("Analyze Headline button is disabled when input is empty", () => {
    render(<HeadlineAnalyzer />);
    const btn = screen.getByRole("button", { name: /analyze headline/i });
    expect(btn).toBeDisabled();
  });

  it("enables Analyze button after typing a headline", async () => {
    const user = userEvent.setup();
    render(<HeadlineAnalyzer />);
    const input = screen.getAllByRole("textbox")[0];
    await user.type(input, "5 Fintech Trends You Can't Ignore in 2025");
    const btn = screen.getByRole("button", { name: /analyze headline/i });
    expect(btn).not.toBeDisabled();
  });

  it("shows analysis results after clicking Analyze Headline", async () => {
    const user = userEvent.setup();
    render(<HeadlineAnalyzer />);
    const input = screen.getAllByRole("textbox")[0];
    await user.type(input, "7 Ways Embedded Finance Is Reshaping Banking in 2025");
    await user.click(screen.getByRole("button", { name: /analyze headline/i }));
    expect(screen.getByText(/score/i)).toBeTruthy();
  });
});
