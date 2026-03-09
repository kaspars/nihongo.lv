import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("renders the site title", () => {
    render(<Home />);
    expect(screen.getByText("nihongo.lv")).toBeInTheDocument();
  });
});
