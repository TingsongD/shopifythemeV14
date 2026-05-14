# SimGym Feedback Fix Plan

## Reviewed Inputs

- `feedback/SimGym_Feedback_Raw.md`
- `feedback/SimGym_Recommendations.md`
- Current Shopify theme files under `layout/`, `sections/`, `snippets/`, `assets/`, `templates/`, `config/`, and `locales/`

## Executive Priority

### P0: Blocks Purchase Progression

- **Conversion / cart-checkout:** Confirm Secure Checkout always submits the cart form and reaches Shopify checkout.
- **Conversion / cart-checkout:** Confirm View Bag opens the full cart, not a blocked popup or dead-end overlay.
- **Technical/theme code:** Add or preserve instrumentation/error handling around add-to-cart and checkout interactions where existing code supports it.

Current code evidence:

- `snippets/cart.liquid` has a standard cart form posting to `routes.cart_url` and a checkout submit button with `name="checkout"`.
- `snippets/cart.liquid` already shows line-item variant titles for non-default variants.
- `snippets/cart.liquid` already includes secure checkout confidence copy, free-shipping/returns text, and payment icons.

Status:

- No speculative code change needed in this pass.
- Needs browser QA on a live or local Shopify theme preview to prove full cart and checkout progression.

### P1: Search And Navigation Dead-Ends

- **UX/navigation:** Search suggestion clicks repeatedly failed or left shoppers on the same page.
- **Technical/theme code:** The predictive-search “Search for ...” action needed a deterministic results-page destination.
- **Accessibility:** Keyboard navigation needed to include the search-results action.

Implemented:

- `sections/predictive-search.liquid`: converted “Search for ...” from a button into a real link to `routes.search_url` with product search parameters.
- `assets/theme-pt2.js` and `assets/theme-pt2.s.min.js`: included the new search-results link in predictive-search keyboard navigation.

### P1: Product Material Transparency

- **Trust:** Shoppers repeatedly abandoned or kept searching because product pages said fabric composition was pending verification.
- **PDPs:** PDP material/care badges were already present near price when data exists.
- **Collection pages:** Product cards needed material/care signals before shoppers opened many PDPs.
- **Content/copy:** Missing material/care/spec information must come from verified product data, not invented claims.

Implemented:

- `snippets/product-material-care-badges.liquid`: added compact card mode.
- `snippets/product-collection.liquid`: renders compact material/care badges on collection cards when existing metafields or FAQ data provide material/care details.

Blocked:

- Adding missing fabric composition or care instructions can use product title and description only when the material/care detail is explicitly stated there. Do not infer unstated materials or assume premium materials for all products.
- Provenance, certification, quality guarantees, and other premium assurance claims remain blocked unless the claim is explicitly present in product/policy copy or separately provided.

### P1: Collection Curation And Taxonomy

- **UX/navigation:** Shoppers looking for dresses, jeans, sweatshirts, blouses, sweaters, and jumpsuits hit mixed or confusing collections.
- **Collection pages:** Elegant Dresses should not include loungewear or unrelated sets unless that is intentional merchandising.
- **Homepage:** Homepage entry points should route to clean, expected category collections.
- **Content/copy:** Category names should be consistent enough that breadcrumbs, menus, and collection titles do not feel contradictory.

Merchant inputs captured from prior notes:

- Keep both `Tops & Blouses` and `Chic Tops & Blouses`.
- Keep both `Dresses` and `Elegant Dresses & Gowns`.
- Keep both `Pants & Skirts` and dedicated `Jeans`.
- Keep both `Sweaters & Cardigans` and dedicated `Sweatshirts & Hoodies`.
- Remove non-dress products from dress collections.
- Keep existing collection handles when they already exist.
- If a needed collection has no handle, create a new SEO-safe handle from the canonical collection name.

Blocked:

- Collection membership changes should be based on an audited export. Theme code cannot safely decide which products are “non-dress” without that export or Admin/store data.

### P2: Quick View Policy

- **UX/navigation:** Quick view must accelerate shopping, not block PDP navigation.
- **PDPs / collection pages:** If quick view remains enabled, it should include material, fit, delivery, and a prominent “View full details” path.
- **Accessibility:** Quick view must not trap focus or leave overlays intercepting product/result clicks.

Merchant input captured:

- Enrich quick view with material, fit, and delivery instead of disabling it.
- Fit details in quick view should be limited to variant option names and the size chart link.
- Delivery ETA is approved as `6-10 days` for every product.

Blocked:

- Quick-view material details should use only explicit material/care text from product title, product description, existing metafields, or FAQ data.
- Any additional fit guidance beyond variant option names and size chart link remains blocked.

### P2: Reviews And Q&A

- **Trust:** Shoppers cited review counts with confusing `0.00` ratings and difficulty finding actual reviews.
- **PDPs:** Reviews should appear near title/price and anchor to product-specific reviews.
- **Collection pages:** Review stars/counts should appear on cards where real review data exists.

Current code evidence:

- `snippets/product-page-get-info.liquid` already links review badges near the title to `#customer-reviews`.
- `snippets/product-collection.liquid` already renders review badges on cards when configured review data exists.

Blocked:

- Review `0.00` states are handled by the external Judge.me app. Do not change review-provider behavior in theme code for this workstream.

### P2: Facets, Sorting, And Compare Signals

- **Collection pages:** Recommended filters include material, sleeve, fit, length, occasion, price, size, and rating.
- **Search:** Material/category query synonyms such as silk, cashmere, sherpa, linen, denim, co-ord, jeans, and sweatshirts were recommended.
- **Performance / UX:** Sticky filters and default sorts can improve scanning.

Blocked:

- Shopify Search & Discovery filter setup, product metafield definitions, synonym data, and collection sort defaults are store/admin configuration tasks. Theme code can display filters already exposed by Shopify but cannot safely invent missing filter data.

### P2: Homepage Entry Points

- **Homepage:** Hero CTAs and homepage tiles should be fully clickable with sufficient tap targets.
- **UX/navigation:** Entry points should route to canonical category pages, including Sets & Co-ords, Jeans, and Sweatshirts & Hoodies if those collections exist.

Blocked:

- Needs confirmation of the exact collections/handles and current homepage sections before changing homepage links.

### P3: Performance And Monitoring

- **Performance:** Keep product-card material badges compact and data-dependent to avoid large card layout shifts.
- **Technical/theme code:** Add automated checks for menu links, breadcrumbs, product-card-to-PDP mapping, predictive search, cart, and checkout progression.
- **Monitoring:** Watch sitemap/404 and overlay conflicts.

Blocked:

- No local test suite was present in this repository snapshot. Future automation should be added once preview URLs and test tooling are confirmed.

## Fixes Implemented In This Pass

1. Predictive search “Search for ...” now links to a full product search results page.
2. Predictive search keyboard navigation now includes the “Search for ...” link.
3. Collection cards now show existing material/care details when verified product metafields or FAQ data already exist.
4. Material/care badges now support compact card rendering.
5. Commerce interactions now emit lightweight monitoring events for add-to-cart, checkout, and View Bag clicks/submits through the existing `ThemeErrorHandler` event pipeline.
6. PDP and quick-view buy-box surfaces now show `Estimated delivery: 6-10 days`.
7. Product trust/confidence copy now includes `6-10 days` delivery timing on PDP, cart, and popup cart confidence surfaces.
8. Quick view now shows a fit row limited to variant option names and the size guide popup link.
9. Material/care badges now fall back to product title and description only when explicit whitelisted material or care terms are present.

## Execution Plan Based On Merchant Replies

### Conversion/cart-checkout

- **Implement now:** Keep the full cart path and popup View Bag link pointed at `routes.cart_url`; current `snippets/popup-cart.liquid` already does this.
- **Implement now:** Preserve cart checkout as a native cart form submit with `name="checkout"`; current `snippets/cart.liquid` and `snippets/popup-cart.liquid` already do this.
- **Implement now:** Add monitoring for add-to-cart, checkout, and View Bag interactions so stalls can be detected without changing purchase flow. Implemented in `assets/module.error-handler.js`.
- **Needs Shopify Admin/store data:** Prove Secure Checkout reaches Shopify checkout on a real preview/store session with a sellable product and valid variant.
- **Needs my clarification:** If a checkout click still stalls in production, provide the exact product URL, variant, browser/device, and whether it happened from PDP, quick view, popup cart, or cart page.

### Accessibility

- **Implement now:** Keep predictive-search keyboard navigation on the full-results action. Implemented in `assets/theme-pt2.js` and `assets/theme-pt2.s.min.js`.
- **Implement now:** Keep the predictive-search full-results action as a real anchor rather than a button with JavaScript-only behavior. Implemented in `sections/predictive-search.liquid`.
- **Implemented:** Quick-view fit enrichment is limited to variant option names and the existing size guide popup link.
- **Defer:** Broader focus-trap and overlay QA needs browser automation against a running theme preview.

### Performance

- **Implement now:** Keep collection-card material/care badges compact and render them only when existing verified metafields or FAQ data exist. Implemented in `snippets/product-material-care-badges.liquid` and `snippets/product-collection.liquid`.
- **Implemented:** Product material/care badges now use title and description as fallback sources only when the copy explicitly names a whitelisted material or care term.
- **Needs Shopify Admin/store data:** Material filters, synonym behavior, and collection sort defaults need Search & Discovery/store configuration and verified product metadata.
- **Defer:** Add performance budgets or visual regression checks once a local preview/test harness is available.

### Technical/theme QA

- **Implement now:** Validate changed Liquid files with the Shopify Liquid validator.
- **Implement now:** Validate changed JavaScript with `node --check`.
- **Implement now:** Run `shopify theme check` and JSON output as the theme gate.
- **Needs Shopify Admin/store data:** End-to-end checkout, audited export-based collection membership, Search & Discovery filters, and any new collection handle creation need a store-authenticated preview or Admin data.
- **Defer:** Review-provider correctness is deferred because Judge.me owns the review display issue.
- **Defer:** Add automated menu, breadcrumb, product-card-to-PDP, and cart/checkout tests once preview URL and test tooling are confirmed.

## Merchant Replies Incorporated

1. **Material/care source of truth:** Product title and product description are approved sources. Use them only for explicit facts already present in the copy.
2. **Collection handles:** Keep existing handles. If a needed collection does not already have a handle, create an SEO-safe handle from the collection name.
3. **Dress collection cleanup:** Remove non-dress products from dress collections based on an audited export.
4. **Delivery ETA:** `6-10 days` is approved as the delivery ETA wording for every product.
5. **Quick-view fit fields:** Show only variant option names and size chart link for fit.
6. **Reviews:** Ignore `0.00` review states in this workstream because Judge.me handles review display.

## Updated Next Execution Plan

### Implemented In Theme Code

- Added `6-10 days` delivery ETA to quick view, PDP buy-box, and confidence surfaces that already discuss delivery/returns.
- Enriched quick view with material/care badges from verified metafields, FAQ data, or explicit material/care terms in product title/description.
- Added quick-view fit surface limited to variant option names and the existing size guide popup link.
- Added product-title/product-description fallback to material/care badge extraction, using only explicit whitelisted material/care terms.

### Needs Shopify Admin/store data

- Run or receive an audited product export for dress collections and remove non-dress products from dress collections based on that export.
- Create missing collections/handles, only where needed, using SEO-safe handles from canonical collection names.
- Configure Search & Discovery filters and synonyms for material/category terms.
- Verify checkout progression in a real Shopify preview/store session.

### Needs my clarification

- Provide or approve the audited export format for collection cleanup: CSV path, columns, and the target dress collection handles.
- Confirm only if you want `6-10 days` to link to the shipping policy everywhere it appears. Current implementation renders it as plain text.

### Defer

- Review `0.00` display changes, because Judge.me owns that behavior.
- Automated browser regression tests until a preview URL and test harness are available.

## Explicit Clarifying Questions

1. Provide or approve the audited export format for collection cleanup: CSV path, columns, and target dress collection handles.
2. Confirm only if you want every `6-10 days` delivery ETA mention linked to the shipping policy. Current implementation keeps it unlinked.

## Validation Evidence

- `node /Users/tingsongdai/.agents/skills/shopify-liquid/scripts/validate.mjs --filename snippets/product-material-care-badges.liquid ...` passed.
- `node /Users/tingsongdai/.agents/skills/shopify-liquid/scripts/validate.mjs --filename product-material-care-badges.liquid --file snippets/product-material-care-badges.liquid --filetype snippets` passed.
- `node /Users/tingsongdai/.agents/skills/shopify-liquid/scripts/validate.mjs --filename product-buybox-assurance.liquid --file snippets/product-buybox-assurance.liquid --filetype snippets` passed.
- `node /Users/tingsongdai/.agents/skills/shopify-liquid/scripts/validate.mjs --filename sections/predictive-search.liquid ...` passed.
- `node --check assets/module.error-handler.js` passed.
- `node --check assets/theme-pt2.js` passed.
- `node --check assets/theme-pt2.s.min.js` passed.
- `shopify theme check` passed with `676 files inspected with no offenses found`.
- `shopify theme check -o json` returned `[]`.
- Full-theme Shopify Liquid validator mode could not complete because the tool aborts while scanning unreadable `/Library/Trial`; `shopify theme check` completed successfully and is the theme-level gate for this pass.
- No local `package.json`, Playwright config, or test directory was found, so there were no repo-local test suites to run beyond the theme and syntax validation above.
