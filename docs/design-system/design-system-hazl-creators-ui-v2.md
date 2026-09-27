# Design System — Hazl Creators UI v2 ("Minimal / Editorial")

**Source:** `https://hazl-creators-ui.vercel.app/`
**Stack:** Vanilla JS SPA (hash-routed), inline `<style>`, no framework, base64-embedded assets
**Audited:** 2026-09-26 (live computed-style inspection via browser + raw CSS scrape)

⚠️ **Note on stability:** this prototype's CSS variables are overridden multiple times in cascade order (likely active design iteration / theme experiment). Values below are the **final computed values** actually rendered on the homepage at audit time — not the first `:root` declaration in the raw stylesheet. See §7 for the override history observed.

---

## 1. Brand & Character

- **Product name:** Hazl Academy (same brand family as v1, different product surface — this looks like a **marketplace/creator-dashboard** prototype vs. v1's **marketing homepage**)
- **Tagline:** "Belajar. Berkarya. Berhasil." (footer) / "Temukan kelasnya. Wujudkan ide barumu." (hero, client-rendered)
- **Mascot:** Same **Hazel** blue fox logo mark as v1 — confirms shared brand identity across both prototypes, but this surface uses it only in the navbar as a small icon (no full-body mascot illustrations, no floating badges).
- **Tone of imagery:** AI-generated "photo-realistic" product/portrait images (perfume bottles, headphones, branding mockups, creator headshots) — explicitly labeled `"PROTOTIPE · Profil & visual buatan AI. Transaksi simulasi."` banner at top of every page.

## 2. Color Tokens (final computed values, homepage)

```css
:root{
  --ink: #202124;      /* primary text */
  --pink: #258ee9;     /* NOTE: variable named "pink" but computed value is BLUE — cascade override, see §7 */
  --violet: #339dfa;   /* also blue-shifted from override */
  --line: #e8e8e9;     /* borders/dividers */
  --muted: #77787d;    /* secondary text */
  --bg: #fff;
  --lav: #f2f2f4;       /* neutral chip/avatar background */
  --dark: #252527;      /* primary button / active chip background */
}
```

**Palette type:** near-monochromatic neutral (ink/muted/line/lav grayscale) + single accent color that is unstable across cascade layers (raw source declares pink `#d91e60`/`#bf285d`, final render shows blue `#258ee9`/`#339dfa`).
**Contrast strategy:** high-contrast dark-on-light dominant, accent used sparingly (hover states, links, active tab underline).

## 3. Typography

- **Font family:** `-apple-system, "system-ui", "Segoe UI", Arial, sans-serif` — **native OS font stack**, no custom webfont loaded.
- **Base body:** `15px / 1.55`

| Role | Size | Weight | Letter-spacing | Notes |
|---|---|---|---|---|
| Hero H1 | `60px` (homepage) | 600 | `-2.8px` | very tight tracking |
| Section H2 | `29px` | 500 | `-0.8px` | |
| Card H3 | `16–18px` | 600 | normal | |
| Body | `14–15px` | 400 | normal | color `var(--muted)` for secondary |
| Eyebrow | `10px` | 700 | `1.8px` uppercase | |
| Nav links | `15px` | 700 | normal | |

**Style notes:** Apple/Notion-like editorial minimalism — system font, medium weight (500–600, never bold 700+ except nav/eyebrow), very negative tracking on large headings for a dense, confident look.

## 4. Spacing & Layout

- **Container:** `max-width: 1600px`, centered (`margin: auto`)
- **Header height:** `78px`, horizontal padding `56px`
- **Content padding:** `40px 56px 64px`
- **Grid:** CSS Grid, `repeat(4, minmax(0,1fr))` for card/creator grids, gap `20–24px`
- **Search input max-width:** `430px`, centered

## 5. Shape & Elevation

```css
border-radius (buttons/chips): 24px (pill)
border-radius (cards):         18px
border-radius (avatars):       50% (circle)
border-radius (image tiles):   16px
border-radius (search):        30px
```

- **Elevation:** `box-shadow: none` almost everywhere — this system uses **borders, not shadows**, for depth (`border: 1px solid #e4e5e7`). Confirmed final override: `.panel,.card,.metric{box-shadow:none;border-color:var(--line)}`.
- **Depth cues:** flat design + subtle `translateY(-3px)` on card hover, no shadow layering.

## 6. Motion

- Card hover: `transition: .2s`, `transform: translateY(-3px)` (lift on hover)
- Image hover (creator/discover tiles): `transform: scale(1.04)` over `.5s`
- **Philosophy:** minimal functional — subtle, fast, no bounce/spring easing (unlike v1's playful bounce).

## 7. Iconography

- **No icon library detected** (no Lucide/Heroicons/FontAwesome classes in DOM).
- Uses **plain text/emoji-adjacent glyphs** instead: `→` (arrow), `↗` (external link), `⌕` (search), `▶` (play), `✓` (checkmark via CSS `content:'✓'`), `☰` (mobile menu).
- **Avatars:** circular, either initials-in-colored-circle (`.avatar` with letter) or real photo (`<img>` object-fit: cover).

## 8. Components

### Buttons (`.btn`)
```css
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:10px;
  background:#252527; color:#fff;
  padding:11px 21px; border-radius:24px;
  font-weight:500; font-size:13px; white-space:nowrap; min-height:46px;
}
.btn.secondary{ background:#fff; color:#202124; border:1px solid #e8e8e9; }
```
No "hard shadow" or bounce transition — flat, calm, dark pill.

### Navbar (`.top`)
- Full-width bar (NOT floating pill like v1), white background, `border-bottom: 1px solid var(--line)`
- Logo (Hazel icon) + vertical divider + "Academy" wordmark, `min-width: 235px`
- Center nav: bold text links (Jelajah / Kreator / Belajar saya)
- Right: "Studio kreator ↗" outline button + circular avatar

### Hero / Discovery Intro
- Centered text block, eyebrow label, large tight-tracked H1, muted subtitle
- Single centered search bar (pill, `background:#f5f5f7`, no border) — **search-first UX**, not a big CTA button hero like v1

### Tabs + Filter chips
- Underline tabs (`Kelas` / `Produk Digital`) — `border-bottom: 2px solid var(--dark)` on selected
- Pill filter chips (`Semua` / `Rekaman` / `Live`) — selected state = solid dark fill

### Cards (course/product grid)
```css
.card{ background:#fff; border:1px solid #e4e5e7; border-radius:18px; overflow:hidden; box-shadow:none; }
.photo-cover{ height:190px; background:#eee; /* real photo, filter: saturate(.55) for muted tone */ }
.format-label{ background:#f0f5fa; color:#617386; border-radius:5px; font-size:10px; padding:4px 8px; }
.price{ border-top:1px solid var(--line); padding-top:17px; font-weight:700; }
```
Photo-driven cards (not icon-driven like v1), desaturated filter for a consistent muted editorial tone.

### Creator grid ("discover-art")
- Square-ish photo tiles (`aspect-ratio: 1.08`), rounded `16px`, hover zoom `scale(1.04)`
- "Lihat profil ↗" pill overlay bottom-left, semi-transparent white background

### Quiet CTA (footer band)
- No colored background block (unlike v1's navy `.cta-band`) — just a top border divider, left-aligned heading + description, right-aligned dark button. Much lower visual weight than v1's CTA.

## 9. Design Style (Qualitative)

- **Mood:** calm, professional, editorial, understated, trustworthy
- **Genre:** minimalist marketplace/dashboard, "Apple Store meets Notion meets Behance"
- **Personality traits:** meticulous, quiet-confident, curatorial
- **Complexity:** minimal — flat cards, no gradients, no mascot illustrations on this surface, single accent color used sparingly
- **Ornamentation:** none to subtle — real photography does the visual work, not decorative shapes
- **CTA style:** subtle suggestion / quiet invitation ("Buka studio kreator ↗") rather than urgent/bold
- **Imagery:** AI-generated photorealistic product shots + creator portraits, desaturated (`saturate(.55)`) for cohesive muted palette

## 10. Key Differences vs. v1 (Playful)

| Aspect | v1 (Playful) | v2 (Minimal) |
|---|---|---|
| Font | Poppins (custom, geometric) | System-ui stack (native) |
| Accent color | Cyan blue `#1f6ae6` + hot pink `#eb2f70` | Single unstable accent (blue, was pink) |
| Shadows | Layered soft shadows + "hard" 3D offset | `box-shadow: none`, border-only |
| Icons | Lucide outline icon set | No icon library, text glyphs (→ ↗ ⌕ ▶) |
| Buttons | Pill, bold 700, hard-shadow, bounce easing | Pill, medium 500, flat, simple ease |
| Navbar | Floating rounded pill, blurred glass | Full-width flat bar, hard border |
| Imagery | Flat vector mascot illustrations | AI-generated photorealistic imagery |
| Mood | Energetic, toy-like, bold | Calm, editorial, curated |

## 11. Reusable Snippet — Button

```css
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;
  background:#252527;color:#fff;padding:11px 21px;border-radius:24px;
  font-weight:500;font-size:13px;white-space:nowrap;min-height:46px;
  font-family:-apple-system,"system-ui","Segoe UI",Arial,sans-serif;}
.btn.secondary{background:#fff;color:#202124;border:1px solid #e8e8e9;}
```

---
*Raw HTML/CSS scrape saved at `/tmp/hazl-creators-ui.html` and `/tmp/hazl-creators-ui.css`. Logo asset decoded to `/tmp/hazl2_logo.png` (confirmed identical Hazel fox mark as v1). Homepage clone prototype: `/tmp/hazl2-homepage-test.html` (screenshot: `/private/tmp/hazl2-homepage-test.jpeg`). Note: product/creator photos in the clone are gray placeholders — original AI-generated photos were not reproduced (rights/authenticity concern).*
