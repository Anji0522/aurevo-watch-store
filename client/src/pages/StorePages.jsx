import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiUrl } from "../api/client.js";
import SiteShell from "../components/SiteShell.jsx";
import useAurevoStore from "../store/appStore.js";

const WatchCanvas = lazy(() => import("../components/3d/WatchCanvas.jsx"));
const collections = [
  "All",
  "Classic",
  "Sport",
  "Smart-Luxe",
  "Limited Edition",
];
const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

function usePageTitle(title) {
  useEffect(() => {
    document.title = `${title} | AUREVO — Time, Reimagined.`;
    const description = document.querySelector('meta[name="description"]');
    if (description)
      description.content = `${title} at AUREVO. Explore considered timepieces, crafted to be kept.`;
    const socialTitle = document.querySelector('meta[property="og:title"]');
    const socialDescription = document.querySelector(
      'meta[property="og:description"]',
    );
    if (socialTitle) socialTitle.content = document.title;
    if (socialDescription)
      socialDescription.content = `${title} at AUREVO. Explore considered timepieces, crafted to be kept.`;
  }, [title]);
}

function PageHeading({ eyebrow, title, copy }) {
  return (
    <header className="route-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {copy && <p>{copy}</p>}
    </header>
  );
}

function LoadingState({ label = "Loading..." }) {
  return (
    <div className="route-state" role="status">
      {label}
    </div>
  );
}

function ErrorState({ error, retry }) {
  return (
    <div className="route-state route-error" role="alert">
      {error}
      {retry && (
        <button className="button-secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

function CatalogCard({ watch }) {
  const addToCart = useAurevoStore((state) => state.addToCart);
  const toggleWishlist = useAurevoStore((state) => state.toggleWishlist);
  const wished = useAurevoStore((state) =>
    state.wishlist.includes(watch._id || watch.id),
  );
  const id = watch._id || watch.id;
  const image = watch.image?.startsWith("http")
    ? watch.image
    : watch.image?.startsWith("photo-")
      ? `https://images.unsplash.com/${watch.image}?auto=format&fit=crop&w=900&q=82`
      : "/images/watch-placeholder.svg";
  return (
    <article className="route-product-card">
      <Link to={`/product/${watch.slug}`} className="route-product-art">
        <img
          src={image}
          alt={`${watch.name} watch`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.src = "/images/watch-placeholder.svg";
          }}
        />
      </Link>
      <button
        className={`wish-button${wished ? " is-wished" : ""}`}
        onClick={() => toggleWishlist(id)}
        aria-label={
          wished ? `Remove ${watch.name} from wishlist` : `Save ${watch.name}`
        }
      >
        {wished ? "♥" : "♡"}
      </button>
      <span className="product-collection">{watch.collection}</span>
      <h2>
        <Link to={`/product/${watch.slug}`}>{watch.name}</Link>
      </h2>
      <div className="route-product-meta">
        <strong>{formatPrice(watch.price)}</strong>
        <span>
          {watch.reviewCount
            ? `★ ${watch.rating.toFixed(1)} (${watch.reviewCount})`
            : "No customer reviews yet"}
        </span>
      </div>
      <button className="button-secondary" onClick={() => addToCart(watch)}>
        Add to bag
      </button>
    </article>
  );
}

export function ShopPage() {
  usePageTitle("Shop watches");
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    collection: "All",
    search: "",
    material: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
    sort: "featured",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value && value !== "All"),
      );
      setProducts(await api(`/watches?${params}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function update(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  return (
    <SiteShell>
      <section className="route-container">
        <PageHeading
          eyebrow="THE AUREVO COLLECTION"
          title={
            <>
              Find your <em>forever.</em>
            </>
          }
          copy="Thoughtful timepieces, made for the hours that matter."
        />
        <div className="filter-panel">
          <label>
            Search watches
            <input
              list="watch-suggestions"
              value={filters.search}
              onChange={(event) => update("search", event.target.value)}
              placeholder="Try Chronos or GMT"
            />
            <datalist id="watch-suggestions">
              {products.map((watch) => (
                <option key={watch.slug} value={watch.name} />
              ))}
            </datalist>
          </label>
          <label>
            Collection
            <select
              value={filters.collection}
              onChange={(event) => update("collection", event.target.value)}
            >
              {collections.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Material
            <input
              value={filters.material}
              onChange={(event) => update("material", event.target.value)}
              placeholder="e.g. titanium"
            />
          </label>
          <label>
            Minimum price
            <input
              type="number"
              min="22000"
              max="250000"
              value={filters.minPrice}
              onChange={(event) => update("minPrice", event.target.value)}
            />
          </label>
          <label>
            Maximum price
            <input
              type="number"
              min="22000"
              max="250000"
              value={filters.maxPrice}
              onChange={(event) => update("maxPrice", event.target.value)}
            />
          </label>
          <label>
            Minimum rating
            <select
              value={filters.minRating}
              onChange={(event) => update("minRating", event.target.value)}
            >
              <option value="">Any rating</option>
              {[4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}+ stars
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select
              value={filters.sort}
              onChange={(event) => update("sort", event.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </label>
        </div>
        {loading ? (
          <LoadingState label="Finding your timepiece..." />
        ) : error ? (
          <ErrorState error={error} retry={loadProducts} />
        ) : products.length ? (
          <div className="route-product-grid">
            {products.map((watch) => (
              <CatalogCard key={watch._id || watch.id} watch={watch} />
            ))}
          </div>
        ) : (
          <div className="route-state">
            No timepieces match those filters. Adjust your search and try again.
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function Reviews({ watch }) {
  const user = useAurevoStore((state) => state.user);
  const [data, setData] = useState(null);
  const [sort, setSort] = useState("recent");
  const [stars, setStars] = useState("");
  const [rating, setRating] = useState("5");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!watch._id) return;
    try {
      setData(
        await api(
          `/reviews/${watch._id}?${new URLSearchParams({ sort, ...(stars ? { stars } : {}) })}`,
        ),
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [watch._id, sort, stars]);
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function submitReview(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await api(`/reviews/${watch._id}`, {
        method: "POST",
        body: { rating: Number(rating), text },
      });
      setText("");
      setMessage(
        "Thank you. Your verified-purchase review has been published.",
      );
      await loadReviews();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reviews-section" aria-labelledby="reviews-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CUSTOMER NOTES</span>
          <h2 id="reviews-title">Reviews</h2>
        </div>
        {data && (
          <div className="review-summary">
            <strong>{data.average ? data.average.toFixed(1) : "—"}</strong>
            <span>★ · {data.total} verified customer reviews</span>
          </div>
        )}
      </div>
      {data && (
        <div className="review-controls">
          <label>
            Filter by rating
            <select
              value={stars}
              onChange={(event) => setStars(event.target.value)}
            >
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((item) => (
                <option value={item} key={item}>
                  {item} stars
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort reviews
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Most recent</option>
              <option value="helpful">Most helpful</option>
              <option value="rating-high">Highest rating</option>
              <option value="rating-low">Lowest rating</option>
            </select>
          </label>
        </div>
      )}
      {data && (
        <div className="rating-bars" aria-label="Customer rating breakdown">
          {[5, 4, 3, 2, 1].map((item) => (
            <div key={item}>
              <span>{item} ★</span>
              <progress
                max={Math.max(data.total, 1)}
                value={data.distribution[item]}
              />
              <span>{data.distribution[item]}</span>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}
      {!watch._id && (
        <p className="demo-notice">
          Customer reviews appear here when the sample catalogue is connected to
          MongoDB. No reviews have been invented.
        </p>
      )}
      {data?.reviews?.length ? (
        <div className="review-list">
          {data.reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div>
                <strong>{review.displayName}</strong>
                {review.isDemo && (
                  <span className="sample-badge">Sample review</span>
                )}
                {review.verifiedPurchase && (
                  <span className="verified-badge">Verified purchase</span>
                )}
              </div>
              <span
                className="review-stars"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
              <p>{review.text}</p>
              <small>
                {new Date(review.createdAt).toLocaleDateString("en-IN")}
              </small>
              {!review.isDemo && (
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      await api(`/reviews/${watch._id}/${review.id}/helpful`, {
                        method: "POST",
                      });
                      await loadReviews();
                    } catch (requestError) {
                      setError(requestError.message);
                    }
                  }}
                >
                  Helpful ({review.helpfulVotes})
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        data && (
          <p className="route-state">
            No customer reviews yet. Sample reviews, if seeded, are labelled
            clearly.
          </p>
        )
      )}
      {user && watch._id && (
        <form className="review-form" onSubmit={submitReview}>
          <h3>Share your experience</h3>
          <p>
            Only customers with a paid order for this timepiece can submit a
            review.
          </p>
          <label>
            Rating
            <select
              value={rating}
              onChange={(event) => setRating(event.target.value)}
            >
              {[5, 4, 3, 2, 1].map((item) => (
                <option key={item} value={item}>
                  {item} stars
                </option>
              ))}
            </select>
          </label>
          <label>
            Your review
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              minLength="10"
              maxLength="2000"
              required
            />
          </label>
          <button className="button-primary" disabled={busy}>
            {busy ? "Submitting..." : "Submit review"}
          </button>
          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}
        </form>
      )}
      {!user && watch._id && (
        <p>
          <Link to="/login" className="text-link">
            Sign in to write a review <span>↗</span>
          </Link>
        </p>
      )}
    </section>
  );
}

function RelatedWatches({ watch }) {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    let active = true;
    api(`/watches?collection=${encodeURIComponent(watch.collection)}`)
      .then((items) => {
        if (active)
          setProducts(
            items.filter((item) => item.slug !== watch.slug).slice(0, 3),
          );
      })
      .catch((error) =>
        console.error("Could not load related timepieces:", error.message),
      );
    return () => {
      active = false;
    };
  }, [watch.collection, watch.slug]);
  if (!products.length) return null;
  return (
    <section className="related-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CONSIDER THESE, TOO</span>
          <h2>
            Related <em>timepieces.</em>
          </h2>
        </div>
      </div>
      <div className="route-product-grid">
        {products.map((item) => (
          <CatalogCard key={item._id || item.id} watch={item} />
        ))}
      </div>
    </section>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const addToCart = useAurevoStore((state) => state.addToCart);
  const [watch, setWatch] = useState(null);
  const [variant, setVariant] = useState("");
  const [error, setError] = useState("");
  usePageTitle(watch?.name || "Timepiece");

  useEffect(() => {
    let active = true;
    api(`/watches/${encodeURIComponent(slug)}`)
      .then((item) => {
        if (active) {
          setWatch(item);
          setVariant(item.colors?.[0] || "Midnight");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (error)
    return (
      <SiteShell>
        <ErrorState error={error} />
      </SiteShell>
    );
  if (!watch)
    return (
      <SiteShell>
        <LoadingState label="Loading timepiece..." />
      </SiteShell>
    );
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: watch.name,
    description: watch.description,
    brand: { "@type": "Brand", name: "AUREVO" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: watch.price,
      availability:
        watch.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    ...(watch.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: watch.rating,
            reviewCount: watch.reviewCount,
          },
        }
      : {}),
  };
  return (
    <SiteShell>
      <article className="route-container product-page">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/shop">Watches</Link>
          <span>/</span>
          <span>{watch.name}</span>
        </nav>
        <div className="product-detail-layout">
          <div
            className="product-canvas"
            aria-label={`${watch.name} 3D viewer`}
          >
            <Suspense
              fallback={
                <div className="route-state">Loading interactive model...</div>
              }
            >
              <WatchCanvas watch={watch} variant={variant} interactive />
            </Suspense>
          </div>
          <div className="detail-copy">
            <span className="eyebrow">{watch.collection} · AUREVO</span>
            <h1>{watch.name}</h1>
            <p className="detail-price">{formatPrice(watch.price)}</p>
            <p>{watch.description}</p>
            <label className="variant-label" htmlFor="detail-variant">
              Dial & strap
            </label>
            <select
              id="detail-variant"
              value={variant}
              onChange={(event) => setVariant(event.target.value)}
            >
              {(watch.colors || []).map((color) => (
                <option key={color}>{color}</option>
              ))}
            </select>
            <dl className="spec-list">
              {Object.entries(watch.specs || {}).map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="stock-note">
              {watch.stock > 0
                ? `${watch.stock} available`
                : "Availability confirmed at checkout"}
            </p>
            <button
              className="button-primary detail-add"
              onClick={() => addToCart(watch, variant)}
            >
              Add to bag <span>↗</span>
            </button>
          </div>
        </div>
        <Reviews watch={watch} />
        <RelatedWatches watch={watch} />
      </article>
    </SiteShell>
  );
}

export function CartPage() {
  usePageTitle("Your bag");
  const cart = useAurevoStore((state) => state.cart);
  const setCart = useAurevoStore((state) => state.setCart);
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  function changeQuantity(id, variant, amount) {
    setCart((items) =>
      items.flatMap((item) =>
        item.id !== id || item.variant !== variant
          ? [item]
          : item.quantity + amount > 0
            ? [{ ...item, quantity: Math.min(item.quantity + amount, 10) }]
            : [],
      ),
    );
  }
  return (
    <SiteShell>
      <section className="route-container">
        <PageHeading
          eyebrow="YOUR SELECTION"
          title={
            <>
              The <em>bag.</em>
            </>
          }
          copy="Every timepiece is insured and carefully packed for its journey."
        />
        {!cart.length ? (
          <div className="route-state">
            <p>Your bag is waiting for its first timepiece.</p>
            <Link to="/shop" className="button-primary">
              Explore watches
            </Link>
          </div>
        ) : (
          <div className="cart-page-layout">
            <div className="cart-page-items">
              {cart.map((item) => (
                <article
                  className="cart-page-item"
                  key={`${item.id}-${item.variant}`}
                >
                  <img
                    src={
                      item.image?.startsWith("photo-")
                        ? `https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=300&q=75`
                        : "/images/watch-placeholder.svg"
                    }
                    alt={`${item.name} watch`}
                  />
                  <div>
                    <span className="product-collection">
                      {item.collection}
                    </span>
                    <h2>
                      <Link to={`/product/${item.slug}`}>{item.name}</Link>
                    </h2>
                    <p>
                      {item.variant} · {formatPrice(item.price)}
                    </p>
                    <div className="quantity">
                      <button
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() =>
                          changeQuantity(item.id, item.variant, -1)
                        }
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={`Increase ${item.name} quantity`}
                        onClick={() => changeQuantity(item.id, item.variant, 1)}
                      >
                        ＋
                      </button>
                      <button
                        className="text-button"
                        onClick={() =>
                          setCart((items) =>
                            items.filter(
                              (entry) =>
                                entry.id !== item.id ||
                                entry.variant !== item.variant,
                            ),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </article>
              ))}
            </div>
            <aside className="order-summary">
              <h2>Order summary</h2>
              <div>
                <span>Subtotal</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <div>
                <span>GST (18%)</span>
                <strong>{formatPrice(Math.round(total * 18) / 100)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong>Complimentary</strong>
              </div>
              <label>
                Coupon code
                <input
                  disabled
                  placeholder="No active coupon codes"
                  aria-label="Coupon code (currently unavailable)"
                />
              </label>
              <p>Coupons are not currently active for this demo store.</p>
              <Link className="button-primary checkout-button" to="/checkout">
                Continue to checkout <span>↗</span>
              </Link>
              <small>Online payments only. No cash payment options.</small>
            </aside>
          </div>
        )}
      </section>
    </SiteShell>
  );
}

export function WishlistPage() {
  usePageTitle("Saved timepieces");
  const ids = useAurevoStore((state) => state.wishlist);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/watches")
      .then((items) => {
        if (active)
          setProducts(
            items.filter((item) => ids.includes(item._id || item.id)),
          );
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [ids]);
  return (
    <SiteShell>
      <section className="route-container">
        <PageHeading
          eyebrow="YOUR SAVED TIMEPIECES"
          title={
            <>
              Keep what <em>speaks.</em>
            </>
          }
        />
        {error ? (
          <ErrorState error={error} />
        ) : products.length ? (
          <div className="route-product-grid">
            {products.map((watch) => (
              <CatalogCard key={watch._id || watch.id} watch={watch} />
            ))}
          </div>
        ) : (
          <div className="route-state">
            No saved watches yet.{" "}
            <Link className="text-link" to="/shop">
              Explore the collection ↗
            </Link>
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function StepIndicator({ step }) {
  return (
    <ol className="checkout-steps" aria-label="Checkout progress">
      {["Address", "Delivery", "Payment"].map((item, index) => (
        <li
          className={index + 1 <= step ? "current" : ""}
          key={item}
          aria-current={index + 1 === step ? "step" : undefined}
        >
          <span>{index + 1}</span>
          {item}
        </li>
      ))}
    </ol>
  );
}

const paymentMethods = [
  ["upi", "UPI · QR & UPI apps"],
  ["card", "Credit or debit card"],
  ["netbanking", "Net banking"],
  ["wallet", "Wallets"],
  ["emi", "EMI"],
];
const upiPattern = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function CheckoutPage() {
  usePageTitle("Secure checkout");
  const navigate = useNavigate();
  const cart = useAurevoStore((state) => state.cart);
  const user = useAurevoStore((state) => state.user);
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    fullName: user?.name || "",
    phone: user?.phone || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const userForAddress = useAurevoStore((state) => state.user);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const delivery = deliveryMethod === "express" ? 499 : 0;
  const total = subtotal + tax + delivery;

  useEffect(() => {
    api("/health")
      .then((result) => setDemoMode(result.database !== "connected"))
      .catch(() => setDemoMode(true));
  }, []);
  useEffect(() => {
    if (userForAddress) {
      setAddress((current) => ({
        ...current,
        fullName: current.fullName || userForAddress.name,
        phone: current.phone || userForAddress.phone || "",
      }));
    }
  }, [userForAddress]);

  function goNext(event) {
    event.preventDefault();
    setError("");
    if (step === 1 && !/^[1-9][0-9]{5}$/.test(address.pincode)) {
      setError("Enter a valid six-digit Indian pincode.");
      return;
    }
    if (step < 3) setStep(step + 1);
  }

  async function openRazorpay() {
    if (!user) {
      navigate("/login", { state: { returnTo: "/checkout" } });
      return;
    }
    if (demoMode) {
      setError(
        "Checkout is unavailable until the MongoDB catalogue and Razorpay test credentials are configured.",
      );
      return;
    }
    if (paymentMethod === "upi" && upiId && !upiPattern.test(upiId)) {
      setError("Enter a valid UPI ID, such as name@bank.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { orderId, razorpayOrderId, amount, currency, keyId, amounts } =
        await api("/payments/create-order", {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: {
            items: cart.map((item) => ({
              watchId: item._id || item.id,
              variant: item.variant,
              quantity: item.quantity,
            })),
            address,
            deliveryMethod,
            paymentMethod,
          },
        });
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error("Secure payment checkout could not be loaded."));
          document.body.appendChild(script);
        });
      }
      const methods = Object.fromEntries(
        paymentMethods.map(([method]) => [method, method === paymentMethod]),
      );
      const checkout = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "AUREVO",
        description: "AUREVO timepiece",
        order_id: razorpayOrderId,
        prefill: {
          name: address.fullName,
          email: user.email,
          contact: address.phone,
          ...(paymentMethod === "upi" && upiId ? { vpa: upiId } : {}),
        },
        method: methods,
        theme: { color: "#4B1D8F" },
        modal: {
          escape: true,
          ondismiss: () => {
            setError(
              "Payment was closed. Your bag is unchanged; you can safely retry.",
            );
            setLoading(false);
          },
        },
        handler: async (result) => {
          try {
            await api("/payments/verify", { method: "POST", body: result });
            useAurevoStore.getState().clearCart();
            navigate(`/order-success/${orderId}`, {
              state: { orderId, amounts },
            });
          } catch (verificationError) {
            setError(
              `Payment could not be verified: ${verificationError.message} Contact support before retrying.`,
            );
          } finally {
            setLoading(false);
          }
        },
      });
      checkout.on("payment.failed", async (event) => {
        try {
          await api("/payments/failure", {
            method: "POST",
            body: {
              razorpay_order_id:
                event.error.metadata?.order_id || razorpayOrderId,
            },
          });
        } catch (failureError) {
          setError(
            `Payment failed and its status could not be updated: ${failureError.message}`,
          );
        }
        setError(
          "Payment was not completed. Your bag is unchanged; you can retry securely.",
        );
        setLoading(false);
      });
      checkout.open();
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  }

  if (!cart.length)
    return (
      <SiteShell>
        <section className="route-container">
          <PageHeading eyebrow="SECURE CHECKOUT" title="Your bag is empty." />
          <Link className="button-primary" to="/shop">
            Explore watches
          </Link>
        </section>
      </SiteShell>
    );
  return (
    <SiteShell>
      <section className="route-container checkout-page">
        <PageHeading
          eyebrow="A CONSIDERED LAST STEP"
          title={
            <>
              Secure <em>checkout.</em>
            </>
          }
        />
        <StepIndicator step={step} />
        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={goNext}>
            {step === 1 && (
              <fieldset>
                <legend>Delivery address</legend>
                {!user && (
                  <p className="demo-notice">
                    Sign in to continue to secure checkout.{" "}
                    <Link to="/login">Sign in or create an account</Link>
                  </p>
                )}
                {[
                  ["fullName", "Full name"],
                  ["phone", "Phone number"],
                  ["line1", "Address line 1"],
                  ["line2", "Address line 2 (optional)"],
                  ["city", "City"],
                  ["state", "State"],
                  ["pincode", "PIN code"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      required={key !== "line2"}
                      value={address[key]}
                      maxLength={key === "pincode" ? 6 : 150}
                      inputMode={
                        key === "pincode" || key === "phone"
                          ? "numeric"
                          : undefined
                      }
                      onChange={(event) =>
                        setAddress((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
                <button className="button-primary" disabled={!user}>
                  Continue to delivery
                </button>
              </fieldset>
            )}
            {step === 2 && (
              <fieldset>
                <legend>Delivery method</legend>
                <label className="choice-row">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === "standard"}
                    onChange={() => setDeliveryMethod("standard")}
                  />{" "}
                  Insured standard delivery · Complimentary
                </label>
                <label className="choice-row">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === "express"}
                    onChange={() => setDeliveryMethod("express")}
                  />{" "}
                  Express delivery · ₹499
                </label>
                <p>
                  Estimated delivery is confirmed after payment, based on your
                  pincode.
                </p>
                <div className="checkout-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button className="button-primary">
                    Continue to payment
                  </button>
                </div>
              </fieldset>
            )}
            {step === 3 && (
              <fieldset>
                <legend>Online payment method</legend>
                <p>
                  Secure payments are processed by Razorpay. Cash payment
                  options are not available.
                </p>
                {paymentMethods.map(([value, label]) => (
                  <label className="choice-row" key={value}>
                    <input
                      type="radio"
                      name="payment"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                    />{" "}
                    {label}
                  </label>
                ))}
                {paymentMethod === "upi" && (
                  <label>
                    UPI ID (optional)
                    <input
                      value={upiId}
                      onChange={(event) => setUpiId(event.target.value)}
                      placeholder="name@bank"
                      autoComplete="off"
                    />
                  </label>
                )}
                <div className="checkout-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={openRazorpay}
                    disabled={loading || !user}
                  >
                    {loading ? "Preparing secure payment..." : "Pay securely"}
                  </button>
                </div>
                {demoMode && (
                  <p className="demo-notice">
                    Demo mode: connect MongoDB and Razorpay test credentials to
                    accept test payments.
                  </p>
                )}
              </fieldset>
            )}
            {error && (
              <p className="form-message form-error" role="alert">
                {error}
              </p>
            )}
          </form>
          <aside className="order-summary">
            <h2>Order summary</h2>
            {cart.map((item) => (
              <div key={`${item.id}-${item.variant}`}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))}
            <div>
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div>
              <span>GST (18%)</span>
              <strong>{formatPrice(tax)}</strong>
            </div>
            <div>
              <span>Delivery</span>
              <strong>
                {delivery ? formatPrice(delivery) : "Complimentary"}
              </strong>
            </div>
            <div className="summary-total">
              <span>Total (INR)</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}

export function OrderSuccessPage() {
  const { orderId } = useParams();
  usePageTitle("Order confirmed");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`/orders/${orderId}`)
      .then(({ order: result }) => setOrder(result))
      .catch((requestError) => setError(requestError.message));
  }, [orderId]);
  useEffect(() => {
    if (
      order?.paymentStatus === "paid" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      import("canvas-confetti").then(({ default: confetti }) =>
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 },
          colors: ["#4B1D8F", "#FF6B1A", "#C9A96E"],
        }),
      );
    }
  }, [order]);
  return (
    <SiteShell>
      <section className="route-container success-page">
        <PageHeading
          eyebrow="A MOMENT TO REMEMBER"
          title={
            order?.paymentStatus === "paid" ? (
              <>
                It is <em>yours.</em>
              </>
            ) : (
              "Payment confirmation"
            )
          }
          copy={
            error ||
            (order?.paymentStatus === "paid"
              ? "Your payment is confirmed by Razorpay. Thank you for choosing AUREVO."
              : "We are verifying the payment status with the server.")
          }
        />
        {order?.paymentStatus === "paid" && (
          <>
            <p className="order-number">
              Order reference <strong>{order._id}</strong>
            </p>
            <button
              className="button-secondary"
              onClick={() => {
                window.location.href = apiUrl(`/orders/${orderId}/invoice`);
              }}
            >
              Download invoice PDF
            </button>
            <p className="demo-notice">
              Order confirmation email is sent when SMTP is configured for this
              store.
            </p>
            <Link className="button-primary" to="/orders">
              View your orders
            </Link>
          </>
        )}
      </section>
    </SiteShell>
  );
}

export function OrdersPage() {
  usePageTitle("My orders");
  const user = useAurevoStore((state) => state.user);
  const sessionReady = useAurevoStore((state) => state.sessionReady);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!sessionReady || !user) return;
    api("/orders")
      .then(({ orders: result }) => setOrders(result))
      .catch((requestError) => setError(requestError.message));
  }, [sessionReady, user]);
  const displayError =
    error || (sessionReady && !user ? "Sign in to see your orders." : "");
  return (
    <SiteShell>
      <section className="route-container">
        <PageHeading
          eyebrow="YOUR AUREVO JOURNEY"
          title={
            <>
              My <em>orders.</em>
            </>
          }
        />
        {!sessionReady ? (
          <LoadingState />
        ) : displayError ? (
          <ErrorState error={displayError} />
        ) : orders.length ? (
          <div className="order-list">
            {orders.map((order) => (
              <article className="order-card" key={order._id}>
                <header>
                  <div>
                    <span className="product-collection">Order reference</span>
                    <h2>{order._id}</h2>
                  </div>
                  <strong>{formatPrice(order.totalAmount)}</strong>
                </header>
                <p>
                  {order.items
                    .map((item) => `${item.name} × ${item.quantity}`)
                    .join(" · ")}
                </p>
                <ol className="order-timeline">
                  {order.statusTimeline.map((entry, index) => (
                    <li
                      className={
                        index === order.statusTimeline.length - 1
                          ? "current"
                          : ""
                      }
                      key={`${entry.status}-${entry.at}`}
                    >
                      <strong>{entry.status.replaceAll("_", " ")}</strong>
                      <span>{entry.note}</span>
                      <small>
                        {new Date(entry.at).toLocaleDateString("en-IN")}
                      </small>
                    </li>
                  ))}
                </ol>
                <Link className="text-link" to={`/order-success/${order._id}`}>
                  View order details ↗
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="route-state">
            No orders yet. <Link to="/shop">Explore the collection ↗</Link>
          </div>
        )}
      </section>
    </SiteShell>
  );
}

export function AuthPage({ register = false }) {
  usePageTitle(register ? "Create account" : "Sign in");
  const navigate = useNavigate();
  const setUser = useAurevoStore((state) => state.setUser);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: form,
      });
      setUser(result.user);
      const destination =
        window.history.state?.usr?.returnTo ||
        (window.location.pathname === "/login" ? "/profile" : "/profile");
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SiteShell>
      <section className="auth-page route-container">
        <PageHeading
          eyebrow="WELCOME TO AUREVO"
          title={
            register ? (
              <>
                Make it <em>yours.</em>
              </>
            ) : (
              <>
                Welcome <em>back.</em>
              </>
            )
          }
          copy="An account is never required to browse; sign in to manage your details and orders."
        />
        <form className="auth-form" onSubmit={submit}>
          {register && (
            <label>
              Full name
              <input
                required
                minLength="2"
                maxLength="100"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                autoComplete="name"
              />{" "}
            </label>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              maxLength="254"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              minLength={register ? 10 : 1}
              maxLength="72"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              autoComplete={register ? "new-password" : "current-password"}
            />
          </label>
          <button className="button-primary" disabled={busy}>
            {busy ? "Please wait..." : register ? "Create account" : "Sign in"}
          </button>
          {error && (
            <p className="form-message form-error" role="alert">
              {error}
            </p>
          )}
          <p>
            {register ? "Already have an account?" : "New to AUREVO?"}{" "}
            <Link to={register ? "/login" : "/signup"}>
              {register ? "Sign in" : "Create account"}
            </Link>
          </p>
        </form>
      </section>
    </SiteShell>
  );
}

export function ProfilePage() {
  usePageTitle("Your profile");
  const user = useAurevoStore((state) => state.user);
  const sessionReady = useAurevoStore((state) => state.sessionReady);
  return (
    <SiteShell>
      <section className="route-container">
        <PageHeading
          eyebrow="YOUR ACCOUNT"
          title={
            <>
              A little <em>about you.</em>
            </>
          }
        />
        {!sessionReady ? (
          <LoadingState />
        ) : user ? (
          <ProfileEditor key={user.id || user._id} user={user} />
        ) : (
          <ErrorState error="Sign in to view your profile." />
        )}
      </section>
    </SiteShell>
  );
}

function ProfileEditor({ user }) {
  const setUser = useAurevoStore((state) => state.setUser);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setError("");
    try {
      const { user: updated } = await api("/auth/profile", {
        method: "PATCH",
        body: form,
      });
      setUser(updated);
      setMessage("Your profile has been updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      window.location.assign("/");
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  return (
    <div className="profile-layout">
      <form className="auth-form" onSubmit={save}>
        <label>
          Name
          <input
            required
            minLength="2"
            maxLength="100"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          Email
          <input value={user.email || ""} readOnly />
        </label>
        <label>
          Phone
          <input
            maxLength="20"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />
        </label>
        <button className="button-primary">Save profile</button>
        {message && <p role="status">{message}</p>}
        {error && (
          <p className="form-message form-error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="button-secondary" onClick={logout}>
          Sign out
        </button>
      </form>
      <aside className="profile-links">
        <Link to="/orders">My orders ↗</Link>
        <Link to="/wishlist">Saved timepieces ↗</Link>
        <Link to="/shop">Explore watches ↗</Link>
        <h2>Saved delivery addresses</h2>
        <p>Address management is available at checkout.</p>
      </aside>
    </div>
  );
}

const pageContent = {
  about: [
    "About AUREVO",
    "Time, Reimagined.",
    "AUREVO is a fictional sample watch brand exploring thoughtful design, enduring materials, and considered details. The watches and brand story on this site are demo content.",
  ],
  contact: [
    "Contact",
    "We are here to help.",
    "For assistance with this sample store, email hello@aurevo.example. This reserved example address is not a monitored support inbox.",
  ],
  privacy: [
    "Privacy policy",
    "Your information, treated carefully.",
    "This demo storefront stores cart and wishlist preferences in your browser. Account, order, and payment features require a store operator's configured backend. Do not enter real payment details into an unconfigured demo.",
  ],
  terms: [
    "Terms of use",
    "A sample store, with clear limits.",
    "AUREVO and its watches are fictional demo content. Prices, stock and product details are illustrative. No purchase should be considered accepted unless a configured payment provider verifies it server-side.",
  ],
  "refund-policy": [
    "Refund policy",
    "A clear path to resolution.",
    "This demo does not accept live orders. A deployed store operator must publish an applicable return and refund policy before enabling real transactions.",
  ],
};

export function InformationPage({ type }) {
  const [eyebrow, title, copy] = pageContent[type] || pageContent.about;
  usePageTitle(eyebrow);
  return (
    <SiteShell>
      <section className="route-container info-page">
        <PageHeading
          eyebrow={eyebrow.toUpperCase()}
          title={
            <>
              {title.split(" ").slice(0, -1).join(" ")}{" "}
              <em>{title.split(" ").slice(-1)}</em>
            </>
          }
          copy={copy}
        />
        {type === "contact" && (
          <Link className="button-primary" to="/shop">
            Explore the collection
          </Link>
        )}
      </section>
    </SiteShell>
  );
}

export function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <SiteShell>
      <section className="route-container not-found">
        <span className="eyebrow">404 · LOST IN TIME</span>
        <h1>
          This page has <em>passed.</em>
        </h1>
        <p>We could not find the page you requested.</p>
        <Link className="button-primary" to="/">
          Return home
        </Link>
      </section>
    </SiteShell>
  );
}
