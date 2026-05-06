import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContentBriefGenerator from "../content-brief-generator";

describe("Content Brief Generator", () => {
  it("renders without crashing and shows the keyword input", () => {
    render(<ContentBriefGenerator />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the Generate Content Brief button", () => {
    render(<ContentBriefGenerator />);
    expect(screen.getByRole("button", { name: /generate content brief/i })).toBeTruthy();
  });

  it("Generate button is disabled when keyword is fewer than 3 characters", () => {
    render(<ContentBriefGenerator />);
    const btn = screen.getByRole("button", { name: /generate content brief/i });
    expect(btn).toBeDisabled();
  });

  it("enables Generate button after entering a keyword of 3+ characters", async () => {
    render(<ContentBriefGenerator />);
    const keywordInput = screen.getByPlaceholderText(/embedded finance/i);
    fireEvent.change(keywordInput, { target: { value: "open banking" } });
    const btn = screen.getByRole("button", { name: /generate content brief/i });
    expect(btn).not.toBeDisabled();
  });

  it("generates and displays a content brief after clicking generate", async () => {
    const user = userEvent.setup();
    render(<ContentBriefGenerator />);
    const keywordInput = screen.getByPlaceholderText(/embedded finance/i);
    fireEvent.change(keywordInput, { target: { value: "embedded finance" } });
    await user.click(screen.getByRole("button", { name: /generate content brief/i }));
    expect(screen.getAllByText(/download|copy|brief/i).length).toBeGreaterThan(0);
  });
});
