import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MetaDescriptionGenerator from "../meta-description-generator";

describe("Meta Description Generator", () => {
  it("renders without crashing and shows input fields", () => {
    render(<MetaDescriptionGenerator />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it("Generate button is disabled until required fields are filled", () => {
    render(<MetaDescriptionGenerator />);
    const btn = screen.getByRole("button", { name: /generate meta descriptions/i });
    expect(btn).toBeDisabled();
  });

  it("enables generate button after filling required fields", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MetaDescriptionGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Best Fintech Tools 2025");
    await user.type(inputs[1], "fintech tools");
    const btn = screen.getByRole("button", { name: /generate meta descriptions/i });
    expect(btn).not.toBeDisabled();
  });

  it("generates and displays meta descriptions after clicking generate", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MetaDescriptionGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Best Fintech Payment Solutions 2025");
    await user.type(inputs[1], "fintech payment");
    await user.type(inputs[2], "fintech professionals");
    await user.type(inputs[3], "streamline payments");
    await user.click(screen.getByRole("button", { name: /generate meta descriptions/i }));
    const copies = screen.getAllByRole("button", { name: /copy/i });
    expect(copies.length).toBeGreaterThanOrEqual(1);
  });

  it("resets fields when Reset is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MetaDescriptionGenerator />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Test Title");
    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect((inputs[0] as HTMLInputElement).value).toBe("");
  });
});
