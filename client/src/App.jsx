import { useEffect, useMemo, useState } from "react";

const collections = ["All", "Classic", "Sport", "Smart-Luxe", "Limited Edition"];
const formatPrice = (price) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(price);

function Logo() {
  return <a className="brand" href="#" aria-label="Aurevo home"><span className="brand-mark">A</span><span>AUREVO</span></a>;
}

function WatchArt({ watch, large = false }) {
  return (
    <div className={`watch-art${large ? " watch-art-large" : ""}`}>
      <img src={`https://images.unsplash.com/${watch.image}?auto=format&fit=crop&w=1000&q=85`} alt={`${watch.name} luxury watch`} loading="lazy" />
      <span className="image-shade" />
      <span className="art-label">AUREVO <i>—</i> {watch.collection.toUpperCase()}</span>
    </div>
  );
}

function ProductCard({ watch, onAdd, wished, onWish }) {
  return (
    <article className="product-card">
      <div className="product-visual">
        <WatchArt watch={watch} />
        <button className={`wish-button${wished ? " is-wished" : ""}`} onClick={() => onWish(watch.id)} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}>{wished ? "♥" : "♡"}</button>
        {watch.discount > 0 && <span className="discount-tag">{watch.discount}% OFF</span>}
        <button className="quick-add" onClick={() => onAdd(watch)}>Add to bag <span>＋</span></button>
      </div>
      <div className="product-meta"><div><span className="product-collection">{watch.collection}</span><h3>{watch.name}</h3></div><strong>{formatPrice(watch.price)}</strong></div>
      <div className="product-detail"><span>✦ {watch.rating.toFixed(1)} <span className="muted">({watch.reviewCount})</span></span><span>{watch.specs.caseSize} · {watch.specs.movement}</span></div>
    </article>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [collection, setCollection] = useState("All");
  const [sort, setSort] = useState("featured");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadError, setLoadError] = useState("");

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

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const addToCart = (watch) => {
    setCart((items) => {
      const existing = items.find((item) => item.id === watch.id);
      return existing
        ? items.map((item) => item.id === watch.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...items, { ...watch, quantity: 1 }];
    });
    setCartOpen(true);
  };
  const toggleWish = (id) => setWishlist((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return (
    <main>
      <div className="announcement"><span>Complimentary insured delivery on every timepiece</span><span className="announcement-right">Crafted with intention · Made to last</span></div>
      <header className="site-header">
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? "×" : "☰"}</button>
        <nav className={`nav-links${menuOpen ? " nav-open" : ""}`} aria-label="Main navigation">
          <a href="#collection" onClick={() => setMenuOpen(false)}>Watches</a><a href="#story" onClick={() => setMenuOpen(false)}>Our story</a><a href="#craft" onClick={() => setMenuOpen(false)}>The craft</a>
        </nav>
        <Logo />
        <div className="header-actions"><a className="account-link" href="#newsletter">Account</a><button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartCount} items`}>Bag <span>{cartCount.toString().padStart(2, "0")}</span></button></div>
      </header>

      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line" /> A DIFFERENT SENSE OF TIME</span><h1>Time,<br /><em>reimagined.</em></h1><p>Thoughtful timepieces for the moments that make us. Designed to be lived in, and passed on.</p><a className="button-primary" href="#collection">Discover the collection <span>↗</span></a><span className="hero-note">DESIGNED IN INDIA <i>·</i> MADE FOR EVERYWHERE</span></div>
        <div className="hero-image"><WatchArt watch={products[0] || { name: "Aurevo Chronos", image: "photo-1523170335258-f5ed11844a49", collection: "TIMELESS BY DESIGN" }} large /><div className="hero-index"><span>01</span><span className="index-line" /><span>04</span></div><div className="hero-caption">THE CHRONOS <span>A study in quiet confidence</span></div><div className="hero-stamp">A<br />—<br />V</div></div>
        <div className="hero-vertical">AUREVO ATELIER&nbsp;&nbsp; · &nbsp;&nbsp;EST. 2024</div>
      </section>

      <section className="trust-strip" aria-label="Our commitments"><span>✳ &nbsp;Complimentary delivery</span><span>✳ &nbsp;Two-year international warranty</span><span>✳ &nbsp;Designed for a lifetime</span><span>✳ &nbsp;Thoughtful aftercare</span></section>

      <section className="collection-section" id="collection">
        <div className="section-heading"><div><span className="eyebrow">THE AUREVO COLLECTION</span><h2>Find your <em>forever.</em></h2></div><p>Every detail considered. Every second, yours.</p></div>
        <div className="collection-toolbar"><div className="collection-tabs" role="group" aria-label="Filter by collection">{collections.map((item) => <button key={item} className={collection === item ? "active" : ""} onClick={() => setCollection(item)}>{item}</button>)}</div><div className="toolbar-right"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find your timepiece" aria-label="Search watches" /></label><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort watches"><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="rating">Top rated</option></select></div></div>
        {loadError ? <div className="empty-state" role="alert">{loadError}</div> : products.length ? <div className="product-grid">{products.map((watch) => <ProductCard key={watch.id} watch={watch} onAdd={addToCart} wished={wishlist.includes(watch.id)} onWish={toggleWish} />)}</div> : <div className="empty-state">No timepieces match that search. Try another name.</div>}
        <div className="catalog-foot"><span>SHOWING {products.length.toString().padStart(2, "0")} TIMEPIECES</span><span>MADE TO MOVE WITH YOU</span></div>
      </section>

      <section className="story-section" id="story"><div className="story-image"><WatchArt watch={products[2] || { name: "Aurevo Titan GMT", image: "photo-1524592094714-0f0654e20314", collection: "BUILT FOR THE JOURNEY" }} large /><span className="story-counter">AUREVO<br />NO. 001</span></div><div className="story-copy"><span className="eyebrow">A MORE CONSIDERED WAY</span><h2>Good things<br />take <em>their time.</em></h2><p>We believe what you wear every day should mean a little more. So we take our time: finding the right materials, working with people who care, and sweating the details you may never notice.</p><a className="text-link" href="#craft">A little about us <span>↗</span></a></div></section>

      <section className="craft-strip" id="craft"><span>01 &nbsp; HONEST MATERIALS</span><span>02 &nbsp; INTENTIONAL DESIGN</span><span>03 &nbsp; BUILT TO BE KEPT</span><span>04 &nbsp; TIME, WELL SPENT</span></section>
      <footer id="newsletter"><div className="footer-main"><div><Logo /><p>Objects for the hours<br />that matter most.</p></div><div className="footer-links"><a href="#collection">Shop watches</a><a href="#story">Our story</a><a href="mailto:hello@aurevo.example">Contact</a></div><div className="footer-news"><span className="eyebrow">A NOTE FROM AUREVO</span><p>New chapters, considered carefully. Notes from our studio, once in a while.</p><form onSubmit={(event) => event.preventDefault()}><label className="sr-only" htmlFor="email">Email address</label><input id="email" type="email" placeholder="Your email address" /><button aria-label="Subscribe">↗</button></form></div></div><div className="footer-bottom"><span>© 2025 AUREVO ATELIER</span><span>TIME, REIMAGINED.</span><span>MADE WITH INTENTION IN INDIA</span></div></footer>

      {cartOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-drawer" aria-label="Shopping bag"><div className="drawer-heading"><div><span className="eyebrow">YOUR SELECTION</span><h2>The bag <em>({cartCount})</em></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close bag">×</button></div>{cart.length ? <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-thumb"><img src={`https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=200&q=70`} alt="" /></div><div className="cart-item-info"><span>{item.collection}</span><strong>{item.name}</strong><span>{formatPrice(item.price)}</span><div className="quantity"><button aria-label="Decrease quantity" onClick={() => setCart((items) => items.flatMap((entry) => entry.id !== item.id ? [entry] : entry.quantity > 1 ? [{ ...entry, quantity: entry.quantity - 1 }] : []))}>−</button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={() => setCart((items) => items.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry))}>＋</button><button className="remove-item" onClick={() => setCart((items) => items.filter((entry) => entry.id !== item.id))}>Remove</button></div></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatPrice(cartTotal)}</strong></div><p>Taxes and delivery calculated at checkout.</p><button className="button-primary checkout-button" onClick={() => window.alert("Checkout is not enabled in this demo. Configure MongoDB and a verified payment provider before accepting orders.")}>Continue to checkout <span>↗</span></button><span className="demo-notice">Secure online payments only · No cash payment options</span></div></> : <div className="cart-empty"><span>✳</span><p>Your next favorite is waiting.</p><button className="button-primary" onClick={() => setCartOpen(false)}>Explore the collection</button></div>}</aside></div>}
    </main>
  );
}
