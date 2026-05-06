import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadabilityChecker from "../readability-checker";

describe("Readability Checker", () => {
  it("renders without crashing and shows the form", () => {
    render(<ReadabilityChecker />);
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("button", { name: /check readability/i })).toBeTruthy();
  });

  it("check button is disabled when textarea is empty", () => {
    render(<ReadabilityChecker />);
    const btn = screen.getByRole("button", { name: /check readability/i });
    expect(btn).toBeDisabled();
  });

  it("enables check button once text is entered", async () => {
    const user = userEvent.setup();
    render(<ReadabilityChecker />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "The quick brown fox jumps over the lazy dog.");
    const btn = screen.getByRole("button", { name: /check readability/i });
    expect(btn).not.toBeDisabled();
  });

  it("displays readability results after clicking Check Readability", async () => {
    const user = userEvent.setup();
    render(<ReadabilityChecker />);
    const textarea = screen.getByRole("textbox");
    await user.type(
      textarea,
      "Simple sentences help readers understand your content. Short words are best.",
    );
    await user.click(screen.getByRole("button", { name: /check readability/i }));
    expect(screen.getByText(/flesch reading ease score/i)).toBeTruthy();
  });

  it("resets the form when Reset is clicked", async () => {
    const user = userEvent.setup();
    render(<ReadabilityChecker />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Some fintech content to analyse.");
    await user.click(screen.getByRole("button", { name: /check readability/i }));
    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect((textarea as HTMLTextAreaElement).value).toBe("");
  });
});
