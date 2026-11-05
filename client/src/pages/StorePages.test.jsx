import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/client.js";
import useAurevoStore from "../store/appStore.js";
import { CartPage, ShopPage } from "./StorePages.jsx";

vi.mock("../api/client.js", () => ({
  api: vi.fn(),
  apiUrl: vi.fn(),
}));

const watches = [
  {
    _id: "507f1f77bcf86cd799439011",
    slug: "aurevo-chronos",
    name: "Aurevo Chronos",
    collection: "Classic",
    price: 48500,
    discount: 0,
    description: "A considered automatic timepiece.",
    specs: { movement: "Automatic", caseSize: "40 mm" },
    colors: ["Midnight"],
    stock: 12,
    image: "photo-1523170335258-f5ed11844a49",
    rating: 0,
    reviewCount: 0,
  },
];

describe("storefront pages", () => {
  beforeEach(() => {
    localStorage.clear();
    useAurevoStore.setState({
      cart: [],
      wishlist: [],
      user: null,
      sessionReady: false,
    });
    api.mockResolvedValue(watches);
  });

  it("renders a searchable product card from the API catalogue", async () => {
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("link", { name: "Aurevo Chronos" }),
    ).toHaveAttribute("href", "/product/aurevo-chronos");
    expect(screen.getByText("₹48,500")).toBeInTheDocument();
  });

  it("shows a transparent error when catalog loading fails", async () => {
    api.mockRejectedValueOnce(new Error("Catalog temporarily unavailable."));
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Catalog temporarily unavailable.",
    );
  });

  it("calculates GST from the displayed bag subtotal", async () => {
    useAurevoStore.getState().addToCart(watches[0], "Midnight");
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    );
    const summary = screen.getByRole("complementary");
    await waitFor(() =>
      expect(within(summary).getByText("₹8,730")).toBeInTheDocument(),
    );
    expect(within(summary).getByText("₹48,500")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Continue to checkout/ }),
    ).toHaveAttribute("href", "/checkout");
  });
});
