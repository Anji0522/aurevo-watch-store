# AUREVO Test Report

## Run summary

| Check                                                         | Result                           |
| ------------------------------------------------------------- | -------------------------------- |
| Backend unit/API tests (`npm run test:server`)                | 32 passed                        |
| Frontend unit tests (`npm run test:client`)                   | 6 passed                         |
| Playwright storefront E2E (`npm run test:e2e -- --workers=1`) | 5 passed (mocked API/payment/AI) |
| ESLint (`npm run lint`)                                       | Passed                           |
| Prettier (`npm run format:check`)                             | Passed                           |
| Production build (`npm run build`)                            | Passed                           |
| Dependency audit (`npm audit`)                                | Passed; 0 vulnerabilities        |

## Backend tests

| Test case                                                                          | Result |
| ---------------------------------------------------------------------------------- | ------ |
| Catalog endpoint returns sample watches without invented review metrics            | PASS   |
| Catalog filters and sorts validated query parameters                               | PASS   |
| Catalog rejects unsupported filter values                                          | PASS   |
| Catalog rejects out-of-range price filters                                         | PASS   |
| Catalog detail resolves a watch by slug                                            | PASS   |
| Unknown API paths return a JSON 404                                                | PASS   |
| Unsafe requests require the double-submit CSRF token                               | PASS   |
| Invalid registration payload is rejected before database access                    | PASS   |
| Registration fails closed if no JWT signing secret is configured                   | PASS   |
| Anonymous session lookup is safe while protected account endpoints reject guests   | PASS   |
| Aria prompt is grounded in supplied catalogue and explicit policies                | PASS   |
| Aria prompt limits order tracking context to the supplied signed-in orders         | PASS   |
| Anthropic client fails closed when credentials or model are absent                 | PASS   |
| AI endpoint returns an explicit streaming fallback when API credentials are absent | PASS   |
| Catalog contains twelve premium watches                                            | PASS   |
| Catalog records have unique slugs and required product details                     | PASS   |
| Catalog covers the requested collections                                           | PASS   |
| Catalog ratings are sample metadata, not written testimonials                      | PASS   |
| GST and delivery amounts are derived from server-priced line items                 | PASS   |
| Express delivery fee is included in the server total                               | PASS   |
| Payment amounts convert whole rupees to integer paise only                         | PASS   |
| Checkout prices always come from the catalog, not request-supplied prices          | PASS   |
| Checkout rejects quantities above catalog stock                                    | PASS   |
| Razorpay client accepts test keys and rejects live keys                            | PASS   |
| Razorpay checkout HMAC accepts the correct signature and rejects tampering         | PASS   |
| Webhook HMAC authenticates exact raw request bytes                                 | PASS   |
| Order payment enum has only approved online methods and no cash option             | PASS   |
| Rating summary excludes sample/demo reviews                                        | PASS   |
| Rating summary returns zero counts before real customer reviews                    | PASS   |
| Sample review seed records are explicitly labelled demo content                    | PASS   |
| Demo review documents do not require a fictitious user account                     | PASS   |
| Customer reviews require a user, valid rating, and bounded text                    | PASS   |

## Frontend unit tests

| Test case                                                  | Result |
| ---------------------------------------------------------- | ------ |
| Increments matching bag variants independently             | PASS   |
| Toggles a saved product without disturbing the bag         | PASS   |
| Persists guest bag and wishlist state but not account data | PASS   |
| Renders a searchable product card from the API catalogue   | PASS   |
| Shows a transparent error when catalog loading fails       | PASS   |
| Calculates GST from the displayed bag subtotal             | PASS   |

## Browser E2E tests

| Test case                                                                | Result                         |
| ------------------------------------------------------------------------ | ------------------------------ |
| Shop search, saved items, and bag persist across routes                  | PASS                           |
| Verified online checkout confirms only after server verification         | PASS (mocked payment provider) |
| Failed payment keeps the bag and never displays success                  | PASS (mocked payment provider) |
| Paid-customer review form submits through the API and shows verification | PASS (mocked API)              |
| Aria streams a mocked assistant response                                 | PASS                           |

## Not verified in this environment

- Live MongoDB connectivity, replica-set transactions, and seeded database behavior require a configured `MONGODB_URI`.
- Razorpay test-mode checkout/webhooks require the user's test credentials; browser payment scenarios above use a local mock.
- Live Claude streaming and SMTP delivery require their respective credentials.
- Cross-browser runs, mobile-device runs, and Lighthouse scores were not run.
- No GitHub push or production deployment was performed.
