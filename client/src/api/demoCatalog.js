import { watches } from "../../../server/data/watches.js";

function filterCatalog(items, params) {
  let result = items.filter(
    (watch) =>
      (!params.get("collection") ||
        params.get("collection") === "All" ||
        watch.collection === params.get("collection")) &&
      (!params.get("search") ||
        watch.name
          .toLowerCase()
          .includes(params.get("search").toLowerCase())) &&
      (!params.get("material") ||
        watch.specs.material
          .toLowerCase()
          .includes(params.get("material").toLowerCase())) &&
      (!params.get("minPrice") ||
        watch.price >= Number(params.get("minPrice"))) &&
      (!params.get("maxPrice") ||
        watch.price <= Number(params.get("maxPrice"))) &&
      (!params.get("minRating") ||
        watch.rating >= Number(params.get("minRating"))),
  );
  if (params.get("sort") === "price-asc")
    result = result.toSorted((a, b) => a.price - b.price);
  else if (params.get("sort") === "price-desc")
    result = result.toSorted((a, b) => b.price - a.price);
  else if (params.get("sort") === "rating")
    result = result.toSorted((a, b) => b.rating - a.rating);
  return result;
}

export function getDemoCatalog(path) {
  const [pathname, query = ""] = path.split("?", 2);
  if (pathname === "/watches")
    return filterCatalog(
      watches.map((watch) => ({ ...watch, rating: 0, reviewCount: 0 })),
      new URLSearchParams(query),
    );

  const prefix = "/watches/";
  if (
    pathname.startsWith(prefix) &&
    !pathname.slice(prefix.length).includes("/")
  ) {
    const slug = decodeURIComponent(pathname.slice(prefix.length));
    const watch = watches.find((item) => item.slug === slug);
    if (watch) return { ...watch, rating: 0, reviewCount: 0 };
  }
}
