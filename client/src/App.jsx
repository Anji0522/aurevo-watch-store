import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AriaWidget from "./components/ai/AriaWidget.jsx";
import SessionSync from "./components/SessionSync.jsx";
import useAurevoStore from "./store/appStore.js";
import {
  AuthPage, CartPage, CheckoutPage, InformationPage, NotFoundPage, OrderSuccessPage,
  OrdersPage, ProductPage, ProfilePage, ShopPage, WishlistPage,
} from "./pages/StorePages.jsx";

const WatchCanvas = lazy(() => import("./components/3d/WatchCanvas.jsx"));

const collections = ["All", "Classic", "Sport", "Smart-Luxe", "Limited Edition"];
const formatPrice = (price) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(price);

function watchArtwork(watch) {
  const dialPalette = {
    Midnight: "#292731", Ivory: "#e7ddc9", "Cosmic Blue": "#263b64", Silver: "#b9b9b5",
    Titanium: "#687777", Black: "#17191c", Obsidian: "#252124", Champagne: "#c5aa78",
    "Royal Green": "#294a37", Onyx: "#201e20", Graphite: "#3b4146", Orange: "#b94f2a",
    Sand: "#c6b293", Forest: "#344735", Slate: "#515c62", "Rose Gold": "#b98270",
    Gold: "#b49a67", Blue: "#304d74",
  };
  const dialColor = dialPalette[watch.colors?.[0]] || "#30313a";
  const caseColor = /^#[\da-f]{6}$/i.test(watch.accent || "") ? watch.accent : "#c2b49e";
  const marks = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    const x1 = 350 + Math.sin(angle) * 112;
    const y1 = 400 - Math.cos(angle) * 112;
    const x2 = 350 + Math.sin(angle) * 132;
    const y2 = 400 - Math.cos(angle) * 132;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d8c49b" stroke-width="${index % 3 === 0 ? 5 : 3}" stroke-linecap="round"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 800"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#f1eee9"/><stop offset="1" stop-color="#d8d1c7"/></linearGradient><linearGradient id="strap" x2="1"><stop stop-color="#29262a"/><stop offset=".5" stop-color="#514b4d"/><stop offset="1" stop-color="#282529"/></linearGradient><linearGradient id="case" x2="1"><stop stop-color="#807357"/><stop offset=".28" stop-color="${caseColor}"/><stop offset=".7" stop-color="#eee0bf"/><stop offset="1" stop-color="#74664d"/></linearGradient><radialGradient id="dial"><stop stop-color="${dialColor}"/><stop offset="1" stop-color="#17171d"/></radialGradient><filter id="shadow" x="-40%" y="-30%" width="180%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="18"/><feOffset dy="18"/><feComponentTransfer><feFuncA type="linear" slope=".28"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="700" height="800" fill="url(#bg)"/><circle cx="350" cy="400" r="290" fill="#fff" opacity=".16"/><g transform="rotate(-13 350 400)" filter="url(#shadow)"><path d="M288 75 Q350 49 412 75 L397 260 Q350 278 303 260Z" fill="url(#strap)"/><path d="M303 540 Q350 522 397 540 L412 725 Q350 750 288 725Z" fill="url(#strap)"/><path d="M319 81v152m62-152v152m-62 355v131m62-131v131" stroke="#b09b7d" stroke-opacity=".35" stroke-width="2"/><circle cx="350" cy="400" r="205" fill="#80775f" opacity=".35"/><circle cx="350" cy="400" r="184" fill="url(#case)"/><circle cx="350" cy="400" r="163" fill="#d9c9a7"/><circle cx="350" cy="400" r="153" fill="url(#dial)"/><circle cx="350" cy="400" r="144" fill="none" stroke="#cab48c" stroke-opacity=".7" stroke-width="1"/><g>${marks}</g><path d="M350 400l-15-78 15-14 8 92Z" fill="#e5d5b7"/><path d="M350 400l69 31-4 7-68-31Z" fill="#d7c49c"/><circle cx="350" cy="400" r="9" fill="#ff6b1a"/><text x="350" y="338" text-anchor="middle" fill="#f3ead7" font-family="Georgia,serif" font-size="16" letter-spacing="5">AUREVO</text><text x="350" y="472" text-anchor="middle" fill="#c6b894" font-family="Arial,sans-serif" font-size="8" letter-spacing="3">AUTOMATIC</text><circle cx="541" cy="400" r="18" fill="url(#case)"/><circle cx="541" cy="400" r="9" fill="#a89a7f"/></g><text x="350" y="770" text-anchor="middle" fill="#625b57" font-family="Arial,sans-serif" font-size="12" letter-spacing="7">TIME, REIMAGINED</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function Logo() {
  return <a className="brand" href="/" aria-label="Aurevo home"><span className="brand-mark">A</span><span>AUREVO</span></a>;
}

function WatchArt({ watch, large = false }) {
  return (
    <div className={`watch-art${large ? " watch-art-large" : ""}`}>
      <img src={watchArtwork(watch)} alt={`AUREVO ${watch.name} product illustration`} loading="lazy" />
      <span className="image-shade" />
      <span className="art-label">AUREVO <i>—</i> {watch.collection.toUpperCase()}</span>
    </div>
  );
}

function HeroWatch({ watch, variant }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let handle;
    if ("requestIdleCallback" in window) {
      handle = window.requestIdleCallback(() => setReady(true), { timeout: 1600 });
      return () => window.cancelIdleCallback(handle);
    }
    handle = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(handle);
  }, []);
  return ready
    ? <Suspense fallback={<WatchArt watch={watch} large />}><WatchCanvas watch={watch} variant={variant} interactive={false} reactToPointer /></Suspense>
    : <WatchArt watch={watch} large />;
}

function ProductCard({ watch, onAdd, wished, onWish, onSelect }) {
  const watchId = watch._id || watch.id;
  return (
    <motion.article className="product-card" whileHover={{ y: -4, rotateX: 1, rotateY: -1 }} transition={{ duration: 0.2 }}>
      <div className="product-visual">
        <WatchArt watch={watch} />
        <motion.button className={`wish-button${wished ? " is-wished" : ""}`} whileTap={{ scale: 0.78 }} animate={wished ? { scale: [1, 1.35, 1] } : { scale: 1 }} onClick={() => onWish(watchId)} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}>{wished ? "♥" : "♡"}</motion.button>
        {watch.discount > 0 && <span className="discount-tag">{watch.discount}% OFF</span>}
        <motion.button className="quick-add" whileTap={{ scale: 0.98 }} onClick={() => onAdd(watch)}>Add to bag <span>＋</span></motion.button>
      </div>
      <div className="product-meta"><div><span className="product-collection">{watch.collection}</span><h3><button className="product-name" onClick={() => onSelect(watch)}>{watch.name}</button></h3></div><strong>{formatPrice(watch.price)}</strong></div>
      <div className="product-detail"><span>{watch.reviewCount ? <>✦ {watch.rating.toFixed(1)} <span className="muted">({watch.reviewCount})</span></> : <span className="muted">No customer reviews yet</span>}</span><span>{watch.specs.caseSize} · {watch.specs.movement}</span></div>
    </motion.article>
  );
}

function WatchDetail({ watch, onClose, onAdd }) {
  const [variant, setVariant] = useState(watch.colors[0] || "Midnight");
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...(dialogRef.current?.querySelectorAll("button, select, [href], input") || [])].filter((element) => !element.disabled);
    const first = focusable()[0];
    first?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab") {
        const elements = focusable();
        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [watch.id]);

  return (
    <motion.div className="detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section ref={dialogRef} className="watch-detail" role="dialog" aria-modal="true" aria-labelledby="detail-title" initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 22, opacity: 0 }}>
        <button className="detail-close" onClick={onClose} aria-label="Close product details">×</button>
        <div className="detail-viewer"><Suspense fallback={<div className="viewer-skeleton" aria-label="Loading 3D watch" />}><WatchCanvas watch={watch} variant={variant} autoRotate={!reduceMotion} /></Suspense><span className="viewer-hint">DRAG TO ROTATE · SCROLL TO ZOOM</span></div>
        <div className="detail-copy"><span className="eyebrow">{watch.collection.toUpperCase()} · AUREVO</span><h2 id="detail-title">{watch.name}</h2><strong className="detail-price">{formatPrice(watch.price)}</strong><p>{watch.description}</p><label className="variant-label" htmlFor="variant-select">DIAL & STRAP</label><select id="variant-select" value={variant} onChange={(event) => setVariant(event.target.value)}>{watch.colors.map((color) => <option key={color} value={color}>{color}</option>)}</select><dl className="spec-list">{Object.entries(watch.specs).map(([label, value]) => <div key={label}><dt>{label.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl><motion.button className="button-primary detail-add" whileTap={{ scale: 0.98 }} onClick={() => { onAdd(watch); onClose(); }}>Add to bag <span>↗</span></motion.button><span className="demo-notice">Secure online payments only · No cash payment options</span></div>
      </motion.section>
    </motion.div>
  );
}

function HomePage() {
  const [products, setProducts] = useState([]);
  const [collection, setCollection] = useState("All");
  const [sort, setSort] = useState("featured");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedWatch, setSelectedWatch] = useState(null);
  const [isDark, setIsDark] = useState(document.documentElement.dataset.theme === "dark");
  const cart = useAurevoStore((state) => state.cart);
  const setCart = useAurevoStore((state) => state.setCart);
  const wishlist = useAurevoStore((state) => state.wishlist);
  const toggleWishlist = useAurevoStore((state) => state.toggleWishlist);
  const storeAddToCart = useAurevoStore((state) => state.addToCart);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (collection !== "All") params.set("collection", collection);
    if (search.trim()) params.set("search", search.trim());
    if (sort !== "featured") params.set("sort", sort);
    fetch(`/api/watches?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the collection.");
        return response.json();
      })
      .then((items) => { if (active) { setProducts(items); setLoadError(""); } })
      .catch(() => { if (active) setLoadError("Our collection is momentarily unavailable. Please try again."); });
    return () => { active = false; };
  }, [collection, search, sort]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let disposed = false;
    let cleanup = () => {};
    Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("lenis"),
    ]).then(([gsapModule, scrollTriggerModule, lenisModule]) => {
      if (disposed) return;
      const gsap = gsapModule.default;
      const { ScrollTrigger } = scrollTriggerModule;
      const Lenis = lenisModule.default;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ duration: 1, smoothWheel: true });
      const tick = (time) => { lenis.raf(time * 1000); };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      const context = gsap.context(() => {
        gsap.utils.toArray(".reveal").forEach((element) => {
          gsap.fromTo(element, { y: 24, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.7, ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 92%", once: true },
          });
        });
      });
      cleanup = () => {
        context.revert();
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    }).catch((error) => console.error("Could not initialize scroll animations.", error));
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const addToCart = (watch) => {
    storeAddToCart(watch);
    setCartOpen(true);
  };
  const toggleWish = (id) => toggleWishlist(id);
  const toggleTheme = () => {
    const theme = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("aurevo-theme", theme);
    setIsDark(theme === "dark");
  };

  return (
    <MotionConfig reducedMotion="user">
    <main>
      <div className="announcement"><span>Complimentary insured delivery on every timepiece</span><span className="announcement-right">Crafted with intention · Made to last</span></div>
      <header className="site-header">
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? "×" : "☰"}</button>
        <nav className={`nav-links${menuOpen ? " nav-open" : ""}`} aria-label="Main navigation">
          <a href="/shop" onClick={() => setMenuOpen(false)}>Watches</a><a href="/about" onClick={() => setMenuOpen(false)}>Our story</a><a href="/contact" onClick={() => setMenuOpen(false)}>The craft</a>
        </nav>
        <Logo />
        <div className="header-actions"><button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}>{isDark ? "☼" : "☾"}</button><a className="account-link" id="account" href="/login">Account</a><a className="account-link" href="/wishlist">Saved</a><button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartCount} items`}>Bag <span>{cartCount.toString().padStart(2, "0")}</span></button></div>
      </header>

      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line" /> A DIFFERENT SENSE OF TIME</span><h1>Time,<br /><em>reimagined.</em></h1><p>Thoughtful timepieces for the moments that make us. Designed to be lived in, and passed on.</p><a className="button-primary" href="#collection">Discover the collection <span>↗</span></a><span className="hero-note">DESIGNED IN INDIA <i>·</i> MADE FOR EVERYWHERE</span></div>
        <div className="hero-image"><HeroWatch watch={products[0] || { name: "Aurevo Chronos", image: "photo-1523170335258-f5ed11844a49", collection: "TIMELESS BY DESIGN", colors: ["Midnight"], accent: "#d5c6b3" }} variant={(products[0]?.colors || ["Midnight"])[0]} /><div className="hero-index"><span>01</span><span className="index-line" /><span>04</span></div><div className="hero-caption">THE CHRONOS <span>A study in quiet confidence</span></div><div className="hero-stamp">A<br />—<br />V</div></div>
        <div className="hero-vertical">AUREVO ATELIER&nbsp;&nbsp; · &nbsp;&nbsp;EST. 2024</div>
      </section>

      <section className="trust-strip" aria-label="Our commitments"><span>✳ &nbsp;Complimentary delivery</span><span>✳ &nbsp;Two-year international warranty</span><span>✳ &nbsp;Designed for a lifetime</span><span>✳ &nbsp;Thoughtful aftercare</span></section>

      <section className="collection-section reveal" id="collection">
        <div className="section-heading"><div><span className="eyebrow">THE AUREVO COLLECTION</span><h2>Find your <em>forever.</em></h2></div><p>Every detail considered. Every second, yours.</p></div>
        <div className="collection-toolbar"><div className="collection-tabs" role="group" aria-label="Filter by collection">{collections.map((item) => <button key={item} className={collection === item ? "active" : ""} onClick={() => setCollection(item)}>{item}</button>)}</div><div className="toolbar-right"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find your timepiece" aria-label="Search watches" /></label><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort watches"><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="rating">Top rated</option></select></div></div>
        {loadError ? <div className="empty-state" role="alert">{loadError}</div> : products.length ? <div className="product-grid">{products.map((watch) => <ProductCard key={watch._id || watch.id} watch={watch} onAdd={addToCart} wished={wishlist.includes(watch._id || watch.id)} onWish={toggleWish} onSelect={setSelectedWatch} />)}</div> : <div className="empty-state">No timepieces match that search. Try another name.</div>}
        <div className="catalog-foot"><span>SHOWING {products.length.toString().padStart(2, "0")} TIMEPIECES</span><span>MADE TO MOVE WITH YOU</span></div>
      </section>

      <section className="story-section reveal" id="story"><div className="story-image"><WatchArt watch={products[2] || { name: "Aurevo Titan GMT", image: "photo-1524592094714-0f0654e20314", collection: "BUILT FOR THE JOURNEY" }} large /><span className="story-counter">AUREVO<br />NO. 001</span></div><div className="story-copy"><span className="eyebrow">A MORE CONSIDERED WAY</span><h2>Good things<br />take <em>their time.</em></h2><p>We believe what you wear every day should mean a little more. So we take our time: finding the right materials, working with people who care, and sweating the details you may never notice.</p><a className="text-link" href="#craft">A little about us <span>↗</span></a></div></section>

      <section className="craft-strip" id="craft"><span>01 &nbsp; HONEST MATERIALS</span><span>02 &nbsp; INTENTIONAL DESIGN</span><span>03 &nbsp; BUILT TO BE KEPT</span><span>04 &nbsp; TIME, WELL SPENT</span></section>
      <footer id="newsletter"><div className="footer-main"><div><Logo /><p>Objects for the hours<br />that matter most.</p></div><div className="footer-links" id="contact"><a href="#collection">Shop watches</a><a href="#story">Our story</a><a href="#contact">Contact</a></div><div className="footer-news"><span className="eyebrow">A NOTE FROM AUREVO</span><p>New chapters, considered carefully. Notes from our studio, once in a while.</p><form onSubmit={(event) => event.preventDefault()}><label className="sr-only" htmlFor="email">Email address</label><input id="email" type="email" placeholder="Your email address" /><button aria-label="Subscribe">↗</button></form></div></div><div className="footer-bottom"><span>© 2025 AUREVO ATELIER</span><span>TIME, REIMAGINED.</span><span>MADE WITH INTENTION IN INDIA</span></div></footer>

      {cartOpen && <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><motion.aside className="cart-drawer" aria-label="Shopping bag" initial={{ x: 30 }} animate={{ x: 0 }} exit={{ x: 30 }}><div className="drawer-heading"><div><span className="eyebrow">YOUR SELECTION</span><h2>The bag <motion.em key={cartCount} initial={{ scale: 1.4 }} animate={{ scale: 1 }}>({cartCount})</motion.em></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close bag">×</button></div>{cart.length ? <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={`${item.id}-${item.variant}`}><div className="cart-thumb"><img src={watchArtwork(item)} alt={`AUREVO ${item.name}`} /></div><div className="cart-item-info"><span>{item.collection}</span><strong>{item.name}</strong><span>{formatPrice(item.price)}</span><div className="quantity"><button aria-label="Decrease quantity" onClick={() => setCart((items) => items.flatMap((entry) => entry.id !== item.id || entry.variant !== item.variant ? [entry] : entry.quantity > 1 ? [{ ...entry, quantity: entry.quantity - 1 }] : []))}>−</button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={() => setCart((items) => items.map((entry) => entry.id === item.id && entry.variant === item.variant ? { ...entry, quantity: entry.quantity + 1 } : entry))}>＋</button><button className="remove-item" onClick={() => setCart((items) => items.filter((entry) => entry.id !== item.id || entry.variant !== item.variant))}>Remove</button></div></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatPrice(cartTotal)}</strong></div><p>Taxes and delivery calculated at checkout.</p><a className="button-primary checkout-button" href="/cart">View bag & continue <span>↗</span></a><span className="demo-notice">Secure online payments only · No cash payment options</span></div></> : <div className="cart-empty"><span>✳</span><p>Your next favorite is waiting.</p><button className="button-primary" onClick={() => setCartOpen(false)}>Explore the collection</button></div>}</motion.aside></motion.div>}
      <AnimatePresence>{selectedWatch && <WatchDetail key={selectedWatch.id} watch={selectedWatch} onClose={() => setSelectedWatch(null)} onAdd={addToCart} />}</AnimatePresence>
      <AriaWidget products={products} onAdd={addToCart} />
    </main>
    </MotionConfig>
  );
}

export default function App() {
  return <BrowserRouter><SessionSync /><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/shop" element={<ShopPage />} />
    <Route path="/product/:slug" element={<ProductPage />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/wishlist" element={<WishlistPage />} />
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
    <Route path="/orders" element={<OrdersPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/login" element={<AuthPage />} />
    <Route path="/signup" element={<AuthPage register />} />
    <Route path="/about" element={<InformationPage type="about" />} />
    <Route path="/contact" element={<InformationPage type="contact" />} />
    <Route path="/privacy" element={<InformationPage type="privacy" />} />
    <Route path="/terms" element={<InformationPage type="terms" />} />
    <Route path="/refund-policy" element={<InformationPage type="refund-policy" />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter>;
}
