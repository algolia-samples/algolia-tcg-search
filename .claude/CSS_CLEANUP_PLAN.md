# Plan: App.css Cleanup

Audit run: 2026-03-11. Three tiers of work below, ordered by risk (low → high).

---

## Tier 1 — Delete orphaned blocks (low risk)

These classes are not referenced in any component. Safe to delete outright.

| Lines | Block | Notes |
|-------|-------|-------|
| 645, 652 | `.row`, `.column` | Generic flex utilities, unused |
| 777–841 | `.item`, `.item-card`, `.item-desc`, `.item-line`, `.item-type`, `.item-info`, `.item-set`, `.item-price` | Old chat/carousel component styles |
| 844–867 | `.hit-line`, `.hit-price` | Old hit component styles (predates current Hit.jsx) |
| 920–969 | `.card-info-section`, `.card-info-grid`, `.info-item`, `.info-label`, `.info-value`, `.card-detail-*` | Unused card detail layout |
| 956–1043 | `.pricing-section-compact`, `.pricing-source-compact`, `.pricing-updated-inline`, `.pricing-header`, `.pricing-table-compact` | No pricing display component exists |
| 1045–1148 | `.filter-drawer`, `.filter-drawer-overlay`, `.filter-drawer-header`, `.filter-drawer-close`, `.filter-drawer-content`, `.filter-drawer--open`, `.filter-toggle-btn` | Filter drawer was never implemented |

**Before deleting:** do a final grep of each class name across all `.jsx`/`.js` files to confirm nothing is dynamically generated.

---

## Tier 2 — Consolidate inventory count classes (low risk)

`hit-inventory-count` and `carousel-inventory-count` (and their `--last` modifiers) are
identical. Created in the same session, never diverged.

**Replace with a single shared class:**

```css
/* App.css */
.inventory-count {
  color: #2d3748;
  font-weight: 500;
  white-space: nowrap;
}

.inventory-count--last {
  color: #e74c3c;
  font-weight: 700;
  flex: 1;
  text-align: center;
}
```

**Update all three components** (`Hit.jsx`, `CarouselHit.jsx`, `ChatItemComponent.jsx`):
- `hit-inventory-count` → `inventory-count`
- `hit-inventory-count--last` → `inventory-count--last`
- `carousel-inventory-count` → `inventory-count`
- `carousel-inventory-count--last` → `inventory-count--last`

Delete old rules at lines 1289–1305 and 2519–2535.

---

## Tier 3 — Consolidate claimed badge + carousel title (medium risk)

### Claimed badge

Three classes share nearly all properties:
- `.claimed-card-badge` (line ~2663)
- `.hit-claimed-badge` (line ~2750)
- `.carousel-claimed-badge` (line ~2750)

Extract shared properties to a `.claimed-badge` base class. Keep per-selector
overrides only where they differ (`.claimed-card-badge` lacks `pointer-events: none`).

### Carousel title

`.carousel-title` (line ~2422) and `.claimed-carousel-title` (line ~2626) are
identical except for `background-color` (blue vs red). Extract shared styles to a
base rule, override only color:

```css
.carousel-title,
.claimed-carousel-title {
  /* shared properties */
}
.carousel-title       { background-color: #3B4CCA; }
.claimed-carousel-title { background-color: #FF1C1C; }
```

---

## Verification after each tier

```bash
# No references to deleted/renamed classes remain
grep -r "hit-inventory-count\|carousel-inventory-count\|filter-drawer\|item-card" tcg-search/src/

# App builds cleanly
cd tcg-search && npm run build
```

---

## Suggested branch name

`chore/css-cleanup`
