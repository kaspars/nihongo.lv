import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({
  auth:    vi.fn().mockResolvedValue({ user: { name: "Test User", email: "test@example.com" } }),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import Home from "./page";
import { auth } from "@/lib/auth";

describe("Home", () => {
  afterEach(() => cleanup());

  it("renders the site title", async () => {
    render(await Home());
    expect(screen.getByText("nihongo.lv")).toBeInTheDocument();
  });

  it("shows logout button when logged in", async () => {
    render(await Home());
    expect(screen.getByText(/Iziet/)).toBeInTheDocument();
  });

  it("does not show logout button when logged out", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    render(await Home());
    expect(screen.queryByText(/Iziet/)).not.toBeInTheDocument();
  });
});
