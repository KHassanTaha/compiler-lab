import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../pages/LoginPage";
import { renderWithProviders } from "../test/utils";
import { ApiError } from "../lib/api";

const loginMock = vi.fn();
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    api: { ...actual.api, login: (...args: unknown[]) => loginMock(...args) },
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it("keeps submit disabled until both fields are filled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const submit = screen.getByRole("button", { name: /sign in/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/username/i), "alice");
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/^password$/i), "secret1pass");
    expect(submit).toBeEnabled();
  });

  it("shows an inline message when credentials are rejected", async () => {
    loginMock.mockRejectedValue(new ApiError(401, "Invalid username or password"));
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), "alice");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByTestId("login-error")).toHaveTextContent(
      /invalid username or password/i,
    );
  });

  it("calls the login endpoint with the entered credentials", async () => {
    loginMock.mockResolvedValue({
      access_token: "t",
      token_type: "bearer",
      user: { id: 1, username: "alice", email: "a@b.c", role: "user", created_at: "" },
    });
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), "alice");
    await user.type(screen.getByLabelText(/^password$/i), "secret1pass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({ username: "alice", password: "secret1pass" }),
    );
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(password).toHaveAttribute("type", "text");
  });
});
