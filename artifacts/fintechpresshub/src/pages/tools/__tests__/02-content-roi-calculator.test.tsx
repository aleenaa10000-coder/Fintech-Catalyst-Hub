import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContentROICalculator from "../content-roi-calculator";

describe("Content ROI Calculator", () => {
  it("renders without crashing and shows all input fields", () => {
    render(<ContentROICalculator />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBeGreaterThanOrEqual(4);
  });

  it("shows the reset button", () => {
    render(<ContentROICalculator />);
    expect(screen.getByRole("button", { name: /reset/i })).toBeTruthy();
  });

  it("auto-calculates ROI as inputs are filled", async () => {
    const user = userEvent.setup();
    render(<ContentROICalculator />);
    const [trafficInput] = screen.getAllByRole("spinbutton");
    await user.clear(trafficInput);
    await user.type(trafficInput, "10000");
    const cvrInputs = screen.getAllByRole("spinbutton");
    await user.clear(cvrInputs[1]);
    await user.type(cvrInputs[1], "2");
    await user.clear(cvrInputs[2]);
    await user.type(cvrInputs[2], "5000");
    await user.clear(cvrInputs[3]);
    await user.type(cvrInputs[3], "2000");
    expect(screen.getByText(/roi/i)).toBeTruthy();
  });

  it("resets all inputs when Reset is clicked", async () => {
    const user = userEvent.setup();
    render(<ContentROICalculator />);
    const [trafficInput] = screen.getAllByRole("spinbutton");
    await user.clear(trafficInput);
    await user.type(trafficInput, "5000");
    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect((trafficInput as HTMLInputElement).value).toBe("");
  });
});
