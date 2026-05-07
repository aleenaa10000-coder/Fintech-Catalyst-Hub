import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BacklinkValueEstimator from "../backlink-value-estimator";

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  const textInputs = screen.getAllByRole("textbox");
  await user.type(textInputs[0], "techcrunch.com");
  const daInputs = screen.getAllByRole("spinbutton");
  fireEvent.change(daInputs[0], { target: { value: "85" } });
  const updatedTextInputs = screen.getAllByRole("textbox");
  await user.type(updatedTextInputs[updatedTextInputs.length - 1], "500000");
}

describe("Backlink Value Estimator", () => {
  it("renders without crashing and shows input fields", () => {
    render(<BacklinkValueEstimator />);
    const textInputs = screen.getAllByRole("textbox");
    const numberInputs = screen.getAllByRole("spinbutton");
    expect(textInputs.length + numberInputs.length).toBeGreaterThanOrEqual(3);
  });

  it("shows the Estimate Backlink Value button", () => {
    render(<BacklinkValueEstimator />);
    expect(screen.getByRole("button", { name: /estimate backlink value/i })).toBeTruthy();
  });

  it("Estimate button is disabled when required fields are empty", () => {
    render(<BacklinkValueEstimator />);
    const btn = screen.getByRole("button", { name: /estimate backlink value/i });
    expect(btn).toBeDisabled();
  });

  it("enables Estimate button after filling domain, DA, and traffic", async () => {
    const user = userEvent.setup();
    render(<BacklinkValueEstimator />);
    await fillRequiredFields(user);
    const btn = screen.getByRole("button", { name: /estimate backlink value/i });
    expect(btn).not.toBeDisabled();
  });

  it("displays estimated backlink value after clicking estimate", async () => {
    const user = userEvent.setup();
    render(<BacklinkValueEstimator />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /estimate backlink value/i }));
    expect(screen.getAllByText(/estimated/i).length).toBeGreaterThan(0);
  });
});
