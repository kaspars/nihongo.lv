import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { name: "Test User", email: "test@example.com" } }),
  signOut: async () => {},
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import Home from "./page";

describe("Home", () => {
  it("renders the site title", async () => {
    render(await Home());
    expect(screen.getByText("nihongo.lv")).toBeInTheDocument();
  });
});
