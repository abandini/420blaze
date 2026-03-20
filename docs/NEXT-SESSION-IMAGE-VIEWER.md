# Product Image Viewer Upgrade — 420Blazin Merch Page

## Problem
Current product cards have a jarring hover-swap between 2 images. Mouse out returns to first image. Users can't:
- Control which view they see
- Go back to a previous view
- See more than 2 angles
- Zoom into design details
- Navigate on mobile (no hover)

The Wake & Bake Mug is the worst case — hover shows one side, mouse out snaps back. No way to explore the product.

## Solution: Product Image Carousel + Zoom

### For Non-Video Products (tees, mugs, hats, socks, stickers, tote)

**Arrow navigation:**
- Left/right arrow buttons overlaid on the image area
- Click to cycle through all available Printify mockup angles (3-5 per product)
- Arrows appear on hover (desktop) or always visible (mobile)
- Wrap-around: last image → first image

**Dot indicators:**
- Small dots below the image showing total views and current position
- Clickable — jump to any view directly
- Styled to match 420Blazin green (#4a9)

**Double-click zoom:**
- Double-click (or pinch on mobile) opens a lightbox modal
- Full-resolution image with dark overlay background
- Click anywhere or press Escape to close
- Swipe left/right within lightbox to cycle views

**Mobile swipe:**
- Touch swipe left/right to cycle views (no hover on mobile)
- Swipe gesture replaces the broken hover-swap behavior

### For Video Products (New Arrivals section)
- **No change** — keep current hover-to-play video behavior
- Video products identified by `data-videos` attribute
- Arrow carousel only applies to `data-images` products

## Data Structure

Current:
```html
<div class="merch-image">
    <img class="merch-img-primary" src="url1" alt="...">
    <img class="merch-img-secondary" src="url2" alt="...">
</div>
```

New:
```html
<div class="merch-image" data-images='["front","model","back","side","detail"]'>
    <img class="merch-carousel-img" src="url1" alt="...">
    <button class="carousel-prev" aria-label="Previous view">‹</button>
    <button class="carousel-next" aria-label="Next view">›</button>
    <div class="carousel-dots"></div>
</div>
```

## Printify Mockup Angles to Fetch

Each product has multiple camera angles available via Printify API:
- `front` / `front-2` — flat front view
- `person-X-front` — on model (various models)
- `back` — back view
- `side` / `right` — side angles
- `context-1` — lifestyle/in-context shot
- `all-sides` — multi-angle composite

We should fetch ALL available mockup URLs per product and populate `data-images`.

## Implementation Plan

### Task 1: Fetch all Printify mockup URLs per product
**What:** Script to query Printify API for each product's full image set, save as JSON.
**Output:** `mockup-angles.json` mapping product ID → array of image URLs with labels.

### Task 2: Update merch.html product cards with data-images
**What:** Replace dual-image structure with carousel-ready structure.
- Remove `merch-img-primary` / `merch-img-secondary` pattern
- Add `data-images` attribute with full URL array
- Add arrow buttons + dots container
- Keep `data-videos` for video products (unchanged)

### Task 3: CSS for carousel + zoom
**What:** ~60 lines of CSS:
```css
.carousel-prev, .carousel-next {
    position: absolute; top: 50%; z-index: 10;
    background: rgba(0,0,0,0.5); color: white;
    border: none; border-radius: 50%; width: 32px; height: 32px;
    cursor: pointer; opacity: 0; transition: opacity 0.2s;
    font-size: 18px;
}
.merch-image:hover .carousel-prev,
.merch-image:hover .carousel-next { opacity: 1; }
.carousel-prev { left: 8px; }
.carousel-next { right: 8px; }
.carousel-dots {
    position: absolute; bottom: 8px; left: 50%;
    transform: translateX(-50%); display: flex; gap: 4px;
}
.carousel-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(255,255,255,0.4); cursor: pointer;
}
.carousel-dot.active { background: #4a9; }

/* Zoom lightbox */
.merch-lightbox {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.9); display: flex;
    align-items: center; justify-content: center;
}
.merch-lightbox img { max-width: 90vw; max-height: 90vh; }
```

### Task 4: JavaScript for carousel + zoom + swipe
**What:** ~100 lines of JS:

```javascript
// Carousel: arrow click cycles data-images
document.querySelectorAll('.merch-image[data-images]').forEach(container => {
    const images = JSON.parse(container.dataset.images);
    let current = 0;
    const img = container.querySelector('.merch-carousel-img');
    const dots = container.querySelector('.carousel-dots');

    // Build dots
    images.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.onclick = () => goTo(i);
        dots.appendChild(dot);
    });

    function goTo(idx) {
        current = idx;
        img.src = images[current];
        dots.querySelectorAll('.carousel-dot').forEach((d, i) =>
            d.classList.toggle('active', i === current));
    }

    container.querySelector('.carousel-prev').onclick = e => {
        e.stopPropagation();
        goTo((current - 1 + images.length) % images.length);
    };
    container.querySelector('.carousel-next').onclick = e => {
        e.stopPropagation();
        goTo((current + 1) % images.length);
    };

    // Double-click zoom
    img.ondblclick = () => openLightbox(images, current);

    // Mobile swipe
    let startX;
    container.ontouchstart = e => startX = e.touches[0].clientX;
    container.ontouchend = e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) goTo(diff > 0
            ? (current + 1) % images.length
            : (current - 1 + images.length) % images.length);
    };

    // PostHog tracking
    container.querySelector('.carousel-next').addEventListener('click', () => {
        posthog.capture('merch_image_browse', {
            product: container.closest('.merch-card').querySelector('h3').textContent,
            view_index: current,
            direction: 'next'
        });
    });
});

// Lightbox
function openLightbox(images, startIdx) {
    const lb = document.createElement('div');
    lb.className = 'merch-lightbox';
    const img = document.createElement('img');
    img.src = images[startIdx];
    lb.appendChild(img);
    lb.onclick = () => lb.remove();
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', esc); }
    });
    document.body.appendChild(lb);
    posthog.capture('merch_image_zoom', { image_index: startIdx });
}
```

### Task 5: Disable old hover-swap CSS for carousel products
**What:** Remove/override the opacity-swap CSS for products using the new carousel.
Keep the old behavior only as fallback for any products not yet migrated.

### Task 6: Mobile testing
**What:** Verify swipe works on iOS Safari + Android Chrome.
- Arrow buttons always visible on mobile (no hover state)
- Swipe gesture works smoothly
- Lightbox closes on tap
- No conflict with page scroll

## Test Plan

### Smoke Tests
- Page loads without JS errors (check console)
- All product images visible on initial load
- Arrow buttons appear on hover (desktop)
- Arrow buttons visible without hover (mobile)
- At least one product has 3+ images in carousel

### Unit Tests (manual QA checklist)
- [ ] Click right arrow → image changes to next view
- [ ] Click left arrow → image changes to previous view
- [ ] Click right on last image → wraps to first
- [ ] Click left on first image → wraps to last
- [ ] Dots show correct count for each product
- [ ] Click dot → jumps to that image
- [ ] Active dot highlights in green (#4a9)
- [ ] Double-click image → lightbox opens
- [ ] Click lightbox background → closes
- [ ] Press Escape → lightbox closes
- [ ] Video products still play on hover (not affected)
- [ ] Mobile: swipe right → next image
- [ ] Mobile: swipe left → previous image

### Regression Tests
- [ ] Video products in New Arrivals section still work (hover plays video)
- [ ] Shop Now buttons still link to correct Printify store URLs
- [ ] PostHog merch_shop_click events still fire
- [ ] PostHog merch_ab_assigned still fires for video products
- [ ] Page load time doesn't increase significantly (images lazy-loaded)
- [ ] No layout shift when carousel initializes

### PostHog Events (new)
- `merch_image_browse` — {product, view_index, direction}
- `merch_image_zoom` — {product, image_index}
- Track which views get the most browsing → informs which mockup angle to show first

## Files Changed

| File | Action |
|------|--------|
| `merch.html` | Restructure product cards, add carousel HTML |
| `css/style.css` | Add carousel + lightbox styles (~60 lines) |
| `js/script.js` | Add carousel + zoom + swipe logic (~100 lines) |
| `scripts/fetch-mockup-angles.py` | NEW — fetches all Printify mockup URLs |
| `mockup-angles.json` | NEW — cached mockup URL data |

## Estimated Effort
- Task 1 (fetch mockups): ~30 min
- Task 2 (HTML restructure): ~1 hour
- Task 3 (CSS): ~30 min
- Task 4 (JS): ~1 hour
- Task 5 (cleanup): ~15 min
- Task 6 (mobile test): ~30 min
- **Total: ~3.5 hours**

## Dependencies
- Printify API for mockup URLs (already have key)
- No new packages or services needed
- Pure HTML/CSS/JS — no framework required
