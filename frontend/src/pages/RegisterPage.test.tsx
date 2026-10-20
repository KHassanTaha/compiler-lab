import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RegisterPage } from "../pages/RegisterPage";
import { renderWithProviders } from "../test/utils";

describe("RegisterPage", () => {
  it("shows username regex guidance on blur with invalid input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    const username = screen.getByLabelText(/username/i);
    await user.type(username, "ab!");
    await user.tab();
    expect(screen.getByText(/letters, numbers, and underscores only/i)).toBeInTheDocument();
  });

  it("rejects a weak password", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.tab();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("keeps submit disabled until all fields are valid", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    const submit = screen.getByRole("button", { name: /create account/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/username/i), "newuser");
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret1pass");
    expect(submit).toBeEnabled();
  });

  it("renders a password strength meter as the user types", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText(/^password$/i), "Secret123!longer");
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });
});
