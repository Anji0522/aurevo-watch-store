import { Link } from "react-router-dom";
import { useState } from "react";
import useAurevoStore from "../store/appStore.js";

function Logo() {
  return (
    <Link className="brand" to="/" aria-label="AUREVO home">
      <span className="brand-mark">A</span>
      <span>AUREVO</span>
    </Link>
  );
}

export function SiteShell({ children }) {
  const cartCount = useAurevoStore((state) =>
    state.cart.reduce((count, item) => count + item.quantity, 0),
  );
  const wishlistCount = useAurevoStore((state) => state.wishlist.length);
  const user = useAurevoStore((state) => state.user);
  const [isDark, setIsDark] = useState(
    document.documentElement.dataset.theme === "dark",
  );

  function toggleTheme() {
    const theme = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("aurevo-theme", theme);
    setIsDark(theme === "dark");
  }

  return (
    <>
      <div className="announcement">
        <span>Complimentary insured delivery on every timepiece</span>
      </div>
      <header className="site-header route-header">
        <nav className="nav-links" aria-label="Main navigation">
          <Link to="/shop">Watches</Link>
          <Link to="/about">Our story</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <Logo />
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          >
            {isDark ? "☼" : "☾"}
          </button>
          <Link to="/wishlist" aria-label={`Wishlist, ${wishlistCount} items`}>
            Saved
          </Link>
          <Link to={user ? "/profile" : "/login"}>
            {user ? user.name : "Account"}
          </Link>
          <Link
            className="bag-button"
            to="/cart"
            aria-label={`Open bag, ${cartCount} items`}
          >
            Bag <span>{cartCount.toString().padStart(2, "0")}</span>
          </Link>
        </div>
      </header>
      <main className="route-main">{children}</main>
      <footer className="route-footer">
        <div>
          <Logo />
          <p>Objects for the hours that matter most.</p>
        </div>
        <nav aria-label="Store policies">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/refund-policy">Refund policy</Link>
        </nav>
        <span>© {new Date().getFullYear()} AUREVO ATELIER · SAMPLE STORE</span>
      </footer>
    </>
  );
}

export default SiteShell;
