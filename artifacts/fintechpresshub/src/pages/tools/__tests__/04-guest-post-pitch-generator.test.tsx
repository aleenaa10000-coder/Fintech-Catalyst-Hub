import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuestPostPitchGenerator from "../guest-post-pitch-generator";

describe("Guest Post Pitch Generator", () => {
  it("renders without crashing and shows input fields", () => {
    render(<GuestPostPitchGenerator />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(3);
  });

  it("Generate Pitch Email button is disabled when required fields are empty", () => {
    render(<GuestPostPitchGenerator />);
    const btn = screen.getByRole("button", { name: /generate pitch email/i });
    expect(btn).toBeDisabled();
  });

  it("enables generate button once required fields are filled", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Jane Smith");
    await user.type(inputs[1], "FinTech Co");
    await user.type(inputs[2], "Content Strategist");
    await user.type(inputs[3], "FintechPressHub");
    await user.type(inputs[4], "Sarah");
    await user.type(inputs[5], "5 Trends Reshaping Digital Payments in 2025");
    await user.type(inputs[6], "fintech payments and digital banking");
    const btn = screen.getByRole("button", { name: /generate pitch email/i });
    expect(btn).not.toBeDisabled();
  });

  it("generates and displays pitch email content after clicking generate", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Jane Smith");
    await user.type(inputs[1], "FinTech Co");
    await user.type(inputs[2], "Content Strategist");
    await user.type(inputs[3], "FintechPressHub");
    await user.type(inputs[4], "Sarah");
    await user.type(inputs[5], "5 Trends Reshaping Digital Payments in 2025");
    await user.type(inputs[6], "fintech payments and digital banking");
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    expect(screen.getByText(/jane smith/i)).toBeTruthy();
  });
});
