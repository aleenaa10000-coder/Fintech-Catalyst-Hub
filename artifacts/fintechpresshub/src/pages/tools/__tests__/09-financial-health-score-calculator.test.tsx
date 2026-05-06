import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinancialHealthScoreCalculator from "../financial-health-score-calculator";

describe("Financial Health Score Calculator", () => {
  it("renders without crashing and shows the income input", () => {
    render(<FinancialHealthScoreCalculator />);
    const incomeInput = screen.getByTestId("input-monthlyIncome");
    expect(incomeInput).toBeTruthy();
  });

  it("shows all 8 financial input fields", () => {
    render(<FinancialHealthScoreCalculator />);
    const fields = [
      "input-monthlyIncome",
      "input-monthlyExpenses",
      "input-monthlyDebtPayments",
      "input-monthlySavings",
      "input-emergencyFund",
      "input-creditCardDebt",
      "input-loanBalance",
      "input-rentMortgage",
    ];
    for (const id of fields) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });

  it("shows Your Score section after filling income and expenses", async () => {
    const user = userEvent.setup();
    render(<FinancialHealthScoreCalculator />);
    const incomeInput = screen.getByTestId("input-monthlyIncome");
    const expensesInput = screen.getByTestId("input-monthlyExpenses");
    await user.clear(incomeInput);
    await user.type(incomeInput, "5000");
    await user.clear(expensesInput);
    await user.type(expensesInput, "3000");
    expect(screen.getByText(/your score/i)).toBeTruthy();
  });

  it("displays a numeric score value after filling key inputs", async () => {
    const user = userEvent.setup();
    render(<FinancialHealthScoreCalculator />);
    await user.type(screen.getByTestId("input-monthlyIncome"), "6000");
    await user.type(screen.getByTestId("input-monthlyExpenses"), "3500");
    await user.type(screen.getByTestId("input-monthlySavings"), "800");
    await user.type(screen.getByTestId("input-emergencyFund"), "15000");
    const scoreEl = screen.getByTestId("text-score-value");
    const scoreNum = parseInt(scoreEl.textContent ?? "0", 10);
    expect(scoreNum).toBeGreaterThanOrEqual(0);
    expect(scoreNum).toBeLessThanOrEqual(100);
  });

  it("resets all fields when reset is clicked", async () => {
    const user = userEvent.setup();
    render(<FinancialHealthScoreCalculator />);
    const incomeInput = screen.getByTestId("input-monthlyIncome");
    await user.type(incomeInput, "5000");
    await user.click(screen.getByTestId("button-reset-calculator"));
    expect((incomeInput as HTMLInputElement).value).toBe("");
  });
});
