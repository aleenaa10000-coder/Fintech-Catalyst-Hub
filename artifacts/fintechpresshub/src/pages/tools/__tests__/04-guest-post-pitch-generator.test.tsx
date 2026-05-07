import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuestPostPitchGenerator from "../guest-post-pitch-generator";

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  const inputs = screen.getAllByRole("textbox");
  await user.type(inputs[0], "Jane Smith");
  await user.type(inputs[1], "FinTech Co");
  await user.type(inputs[2], "Content Strategist");
  await user.type(inputs[3], "FintechPressHub");
  await user.type(inputs[4], "Sarah");
  await user.type(inputs[5], "5 Trends Reshaping Digital Payments in 2025");
  await user.type(inputs[6], "fintech payments and digital banking");
}

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
    await fillRequiredFields(user);
    const btn = screen.getByRole("button", { name: /generate pitch email/i });
    expect(btn).not.toBeDisabled();
  });

  it("generates and displays pitch email content after clicking generate", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    expect(screen.getByText(/jane smith/i)).toBeTruthy();
  });

  it("Regenerate button is not visible before a pitch is generated", () => {
    render(<GuestPostPitchGenerator />);
    expect(screen.queryByRole("button", { name: /regenerate/i })).toBeNull();
  });

  it("Regenerate button appears after first generate", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeTruthy();
  });

  it("Regenerate produces a different opening sentence on the same inputs", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));

    const pitchArea = screen.getAllByRole("textbox").find(
      (el) => (el as HTMLTextAreaElement).value?.includes("Jane Smith"),
    ) as HTMLTextAreaElement;
    const firstPitch = pitchArea.value;

    await user.click(screen.getByRole("button", { name: /regenerate/i }));
    const secondPitch = pitchArea.value;

    expect(secondPitch).not.toEqual(firstPitch);
  });

  it("Regenerate does not clear the form fields", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    await user.click(screen.getByRole("button", { name: /regenerate/i }));

    const inputs = screen.getAllByRole("textbox");
    expect((inputs[0] as HTMLInputElement).value).toBe("Jane Smith");
    expect((inputs[3] as HTMLInputElement).value).toBe("FintechPressHub");
  });
});
