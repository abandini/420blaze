# 420Blazin Accessories Store — Implementation Plan

**Prepared:** March 15, 2026
**Status:** Phase 1 (Trust/Legal Pages) COMPLETE. Phase 2 (Storefront Build) READY TO START.

---

## Business Overview

420Blazin.com will add an accessories-only shop selling rolling papers, pre-rolled cones, filter tips, rolling trays, herb grinders, smell-proof storage, and rolling kits. No cannabis, no concentrates, no ingestibles.

Products are sourced at wholesale and dropshipped directly to customers. 420Blazin holds no inventory.

---

## What Bill Needs To Do

### 1. Get Ohio Vendor's License / Resale Certificate

**What:** Ohio requires a vendor's license (also called a Sales Tax ID or Resale Certificate) to purchase wholesale goods for resale.

**Where to apply:** Ohio Department of Taxation
- Online: https://gateway.ohio.gov/
- Form: Ohio IT 1 (Application for Sales Tax Vendor's License)
- Cost: Free
- Processing: Typically 3-5 business days online

**What you need:**
- Business name (420Blazin / whatever your LLC is)
- EIN (Federal Tax ID) — if you don't have one, get it free at https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
- Business address
- Type of business (retail, online sales)
- NAICS code: 453991 (Tobacco Stores) or 454110 (Electronic Shopping)

### 2. Open SPS Wholesale Account

**After** you have your vendor's license:

1. Go to https://spswholesale.com/wholesale-info/
2. Create account with your legal business name
3. Submit required documents:
   - Tax ID / EIN (IRS letter or portal screenshot)
   - Business license / Ohio vendor's license
   - State resale certificate
4. Email SPS with subject: "Dropship via Crowdship" if you want to set up automated dropshipping later

**Minimum order:** $100
**Shipping:** UPS from Rancho Cordova, CA

### 3. Payment Processing

**Stripe** — You already have an account. Rolling papers and smoking accessories are a gray area on Stripe. Many accessory-only stores operate on Stripe without issue. We start with Stripe.

**Backup plan:** Square has an explicit cannabis-adjacent accessories program. Open a Square account as a backup: https://squareup.com/

### 4. Business Insurance (Recommended)

Consider general liability insurance for your ecommerce business. Not legally required but protects you. Providers like Thimble, Hiscox, or NEXT Insurance offer affordable online business insurance.

---

## What Gets Built (Technical Architecture)

### Stack

```
420blazin.com/shop          — Storefront (static HTML + JS)
Cloudflare Workers          — API backend (orders, products, Stripe webhooks)
Cloudflare D1               — Product catalog, orders, customer data
Stripe Checkout             — Payment processing
SPS Wholesale               — Product supplier (manual ordering initially)
Crowdship (future)          — Automated dropship sync (when volume justifies $599/mo)
```

### Site Architecture

```
420blazin.com
├── /shop                    — Product listings, categories
├── /shop/rolling-papers     — Collection: Rolling Papers
├── /shop/cones              — Collection: Pre-Rolled Cones
├── /shop/tips               — Collection: Filter Tips & Crutches
├── /shop/trays              — Collection: Rolling Trays
├── /shop/grinders           — Collection: Herb Grinders
├── /shop/storage            — Collection: Smell-Proof Storage
├── /shop/kits               — Collection: Rolling Kits & Bundles
├── /shop/product/{slug}     — Individual product pages
├── /shop/cart               — Shopping cart
├── /shop/checkout           — Stripe Checkout redirect
├── /shop/order/{id}         — Order status / tracking
├── /about                   — About page ✅ DONE
├── /privacy                 — Privacy Policy ✅ DONE
├── /terms                   — Terms of Service ✅ DONE
├── /shipping                — Shipping Policy ✅ DONE
├── /returns                 — Returns Policy ✅ DONE
```

### Database Schema (Cloudflare D1)

```sql
-- Products
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    brand TEXT,
    collection TEXT NOT NULL,
    wholesale_cost INTEGER,        -- cents
    retail_price INTEGER NOT NULL,  -- cents
    msrp INTEGER,                  -- cents (MAP if applicable)
    images TEXT,                    -- JSON array of URLs
    variants TEXT,                  -- JSON array of variant options
    weight_oz REAL,
    age_restricted BOOLEAN DEFAULT TRUE,
    restricted_states TEXT,        -- JSON array of state codes
    in_stock BOOLEAN DEFAULT TRUE,
    supplier TEXT DEFAULT 'sps',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Collections
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Orders
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    shipping_address TEXT NOT NULL,  -- JSON
    items TEXT NOT NULL,             -- JSON array
    subtotal INTEGER NOT NULL,       -- cents
    shipping_cost INTEGER NOT NULL,  -- cents
    tax INTEGER NOT NULL,            -- cents
    total INTEGER NOT NULL,          -- cents
    stripe_payment_id TEXT,
    stripe_checkout_session TEXT,
    status TEXT DEFAULT 'pending',   -- pending, paid, submitted, shipped, delivered
    supplier_order_id TEXT,
    tracking_number TEXT,
    tracking_carrier TEXT,
    age_verified BOOLEAN DEFAULT FALSE,
    customer_state TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cart Sessions
CREATE TABLE carts (
    id TEXT PRIMARY KEY,
    items TEXT NOT NULL,             -- JSON array
    customer_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);
```

### API Endpoints (Cloudflare Worker)

```
GET  /api/products                  — List products (filterable by collection, brand)
GET  /api/products/{slug}           — Get single product
GET  /api/collections               — List collections
GET  /api/collections/{slug}        — Get collection with products
POST /api/cart                      — Create/update cart
GET  /api/cart/{id}                 — Get cart
POST /api/checkout                  — Create Stripe Checkout session
POST /api/webhooks/stripe           — Stripe payment webhook
GET  /api/orders/{id}               — Get order status (customer-facing)
POST /api/admin/products            — Add/update products (admin)
POST /api/admin/orders/{id}/submit  — Mark order as submitted to supplier
POST /api/admin/orders/{id}/track   — Add tracking info
```

### Stripe Checkout Flow

```
1. Customer adds items to cart
2. Customer clicks "Checkout"
3. Frontend calls POST /api/checkout with cart ID
4. Worker creates Stripe Checkout Session with:
   - Line items from cart
   - Shipping address collection
   - Age verification checkbox (custom field)
   - Success/cancel URLs
5. Customer completes payment on Stripe's hosted checkout
6. Stripe fires webhook to POST /api/webhooks/stripe
7. Worker creates order in D1, marks as "paid"
8. Bill gets email notification with order details
9. Bill places order on SPS Wholesale (manual initially)
10. Bill updates order with tracking via admin API
11. Customer gets tracking email
```

---

## Product Catalog — Phase 1 Launch

### Initial Collections (50-100 products)

| Collection | Example Brands | Est. Products |
|-----------|---------------|---------------|
| Rolling Papers | RAW, OCB, Elements, Juicy Jay's, Bob Marley, Afghan Hemp, Blazy Susan | 20-25 |
| Pre-Rolled Cones | RAW, Blazy Susan, King Palm, Cyclones, GRAV | 10-15 |
| Filter Tips | RAW, Elements, glass tips | 5-8 |
| Rolling Trays | RAW, various designs | 8-10 |
| Herb Grinders | Various (2-piece, 4-piece, aluminum, steel) | 8-10 |
| Storage | Smell-proof bags, stash jars, humidity packs | 5-8 |
| Rolling Kits | Curated bundles (papers + tips + tray + grinder) | 3-5 |

### Pricing Strategy

- **Markup:** 40-60% above wholesale cost
- **Target retail range:** $3.99 (single pack papers) to $49.99 (premium grinder)
- **Free shipping threshold:** Orders over $35 (encourages larger carts)
- **Bundle discounts:** 10-15% off kits vs buying individually

---

## Content-to-Commerce Integration

### /culture-rolling Rebuild (Phase 3)

Transform from generic article to buyer guide:

1. **Intro** with shop CTAs
2. **Joint vs Blunt vs Spliff** comparison table → link to papers, wraps
3. **Paper materials guide** (hemp, rice, wood pulp) → link to specific brands
4. **Size guide** (single wide, 1 1/4, king size, cones) → link to products
5. **Best by use case** (beginners, clean taste, slow burn) → product recommendations
6. **Accessory bundle logic** → link to kits
7. **FAQ with schema markup**
8. **Embedded product modules** throughout

### Cross-linking from other culture pages

- /culture-flower → grinders, storage jars
- /culture-glass → (future: glass tips, screens)
- /culture-concentrates → (future: dab tools)
- /culture-edibles → (no commerce link)

---

## Compliance Checklist

- [x] Age gate on all pages (21+ modal with localStorage)
- [x] Privacy Policy
- [x] Terms of Service
- [x] Shipping Policy
- [x] Returns/Refund Policy
- [ ] Age verification at checkout (Stripe custom field)
- [ ] State restriction checking (block restricted states at checkout)
- [ ] Order confirmation with age verification record
- [ ] PACT Act compliance review (if selling papers that could be classified under tobacco)
- [ ] Ohio vendor's license obtained
- [ ] Sales tax collection setup (use Stripe Tax or TaxJar)

---

## Timeline

### Week 1: Foundation (Bill + Claude Code)
- [ ] Bill: Apply for Ohio vendor's license
- [ ] Bill: Apply for EIN if needed
- [ ] Claude Code: Build Cloudflare Workers shop backend (D1 schema, API endpoints, Stripe integration)
- [ ] Claude Code: Build shop frontend (product listings, cart, checkout flow)

### Week 2: Catalog + Testing
- [ ] Bill: Open SPS Wholesale account once vendor's license arrives
- [ ] Bill: Select initial 50-100 products from SPS catalog
- [ ] Claude Code: Import products into D1 database
- [ ] Claude Code: Build collection pages and product pages
- [ ] Claude Code: Test Stripe Checkout flow end-to-end
- [ ] Both: Test order flow (place test order, verify webhook, verify notification)

### Week 3: Launch
- [ ] Claude Code: Rebuild /culture-rolling as buyer guide with product CTAs
- [ ] Claude Code: Add shop CTA to homepage
- [ ] Both: Final QA and launch
- [ ] Bill: Place first real orders on SPS manually

### Week 4+: Optimize
- [ ] Monitor order volume
- [ ] Refine product selection based on sales data
- [ ] Add more products
- [ ] When volume justifies: upgrade to Crowdship Pro ($599/mo) for automation
- [ ] Add analytics and conversion tracking

---

## Cost Summary

### Startup Costs

| Item | Cost |
|------|------|
| Ohio vendor's license | Free |
| EIN (if needed) | Free |
| SPS Wholesale account | Free |
| Cloudflare Workers (existing) | $0 (within free tier) |
| Stripe | 2.9% + $0.30 per transaction |
| Domain (already owned) | $0 |
| **Total startup** | **$0** |

### Monthly Costs (Before Revenue)

| Item | Cost |
|------|------|
| Cloudflare Workers | $0-5/mo (usage-based) |
| Stripe | Transaction fees only |
| SPS Wholesale | No monthly fee |
| **Total monthly** | **~$5/mo** |

### Future Costs (When Scaling)

| Item | Cost | When |
|------|------|------|
| Crowdship Pro | $599/mo + 4% PO fee | When doing 10+ orders/day |
| Cloudflare Workers Paid | $5/mo | When exceeding free tier |
| Sales tax service | $20-50/mo | After first $10K in sales |
| Stripe Tax | 0.5% per transaction | Optional, automates tax calc |

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product scope | Accessories only | Legal clarity, payment processor compatibility, clean compliance |
| Supplier | SPS Wholesale | Verified rolling paper catalog (RAW, OCB, Elements), U.S. fulfillment |
| Payment | Stripe (existing) | Already set up, lowest cost; Square as backup |
| Platform | Custom on Cloudflare | No monthly platform fees, full control, matches existing tech stack |
| Dropship automation | Manual first, Crowdship later | Saves $599/mo until volume justifies automation |
| Store location | 420blazin.com/shop | Same domain, simpler than subdomain, leverages existing SEO |

---

*This document will be updated as decisions are made and phases are completed.*
