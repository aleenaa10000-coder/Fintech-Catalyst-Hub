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

function getPitchTextareaValue(): string {
  const el = screen
    .getAllByRole("textbox")
    .find(
      (e) =>
        e.tagName === "TEXTAREA" &&
        (e as HTMLTextAreaElement).value.includes("Subject:"),
    ) as HTMLTextAreaElement | undefined;
  return el?.value ?? "";
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
    expect(screen.getAllByText(/jane smith/i).length).toBeGreaterThan(0);
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

    const firstPitch = getPitchTextareaValue();
    expect(firstPitch).toContain("Subject:");

    await user.click(screen.getByRole("button", { name: /regenerate/i }));

    const secondPitch = getPitchTextareaValue();
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

  it("Copy subject line button appears after pitch is generated", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    expect(screen.getByRole("button", { name: /copy subject/i })).toBeTruthy();
  });

  it("greeting uses only first name when a full name is provided", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Jane Smith");
    await user.type(inputs[1], "FinTech Co");
    await user.type(inputs[2], "Content Strategist");
    await user.type(inputs[3], "FintechPressHub");
    await user.type(inputs[4], "Pat Miller");
    await user.type(inputs[5], "Digital Payments Trends");
    await user.type(inputs[6], "fintech payments");
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    const pitch = getPitchTextareaValue();
    expect(pitch).toContain("Hi Pat,");
    expect(pitch).not.toContain("Hi Pat Miller,");
  });

  it("greeting defaults to 'Hi there,' when editor name is empty", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Jane Smith");
    await user.type(inputs[1], "FinTech Co");
    await user.type(inputs[2], "Content Strategist");
    await user.type(inputs[3], "FintechPressHub");
    await user.type(inputs[5], "Digital Payments Trends");
    await user.type(inputs[6], "fintech payments");
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    const pitch = getPitchTextareaValue();
    expect(pitch).toContain("Hi there,");
  });

  it("formal tone uses 'Dear [FirstName],' when a name is provided", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Jane Smith");
    await user.type(inputs[1], "FinTech Co");
    await user.type(inputs[2], "Content Strategist");
    await user.type(inputs[3], "FintechPressHub");
    await user.type(inputs[4], "Alex Johnson");
    await user.type(inputs[5], "Digital Payments Trends");
    await user.type(inputs[6], "fintech payments");
    const toneButtons = screen.getAllByRole("button");
    const formalBtn = toneButtons.find((b) => b.textContent?.includes("Formal"));
    if (formalBtn) await user.click(formalBtn);
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    const pitch = getPitchTextareaValue();
    expect(pitch).toContain("Dear Alex,");
    expect(pitch).not.toContain("Dear Alex Johnson,");
  });

  it("formal tone defaults to 'Hi there,' when editor name is empty", async () => {
    const user = userEvent.setup();
    render(<GuestPostPitchGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Jane Smith");
    await user.type(inputs[1], "FinTech Co");
    await user.type(inputs[2], "Content Strategist");
    await user.type(inputs[3], "FintechPressHub");
    await user.type(inputs[5], "Digital Payments Trends");
    await user.type(inputs[6], "fintech payments");
    const toneButtons = screen.getAllByRole("button");
    const formalBtn = toneButtons.find((b) => b.textContent?.includes("Formal"));
    if (formalBtn) await user.click(formalBtn);
    await user.click(screen.getByRole("button", { name: /generate pitch email/i }));
    const pitch = getPitchTextareaValue();
    expect(pitch).toContain("Hi there,");
    expect(pitch).not.toContain("Dear there,");
  });
});
