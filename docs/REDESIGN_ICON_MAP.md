# REDESIGN — Icon & Token Remap Reference

> Wave 0 foundation artifact. Every redesign wave uses this doc to translate Stitch
> markup into the app. Stitch designs use **Google Material Symbols Outlined**
> (`<span class="material-symbols-outlined">glyph_name</span>`); the app uses
> **`lucide-react`** (`v1.21.0`, confirmed present in `node_modules`). Icons are
> imported as PascalCase React components: `import { ChevronRight } from "lucide-react"`.
>
> Scope: **presentation only.** Swapping an icon never changes page logic/fetch/guards.
> Decisions in force: **LIGHT-ONLY** (no dark mode), brand cyan `#0077A8`.

**Inventory:** 100 unique Material Symbol glyphs across all 20 `code.html` files.
Every glyph has a lucide target; the ones with no clean 1:1 are flagged **⚠ approx**,
and glyphs that should **not** be ported at all are flagged **⛔ drop**.

Names below are verified against `node_modules/lucide-react/dist/lucide-react.d.ts`
(both legacy aliases like `CheckCircle2` and shape-first names like `CircleCheck`
exist in this version — either import works; the table picks one).

---

## 1. Navigation & disclosure

| Material Symbol | lucide component | Notes |
|---|---|---|
| `chevron_right` | `ChevronRight` | |
| `chevron_left` | `ChevronLeft` | |
| `expand_more` | `ChevronDown` | Accordion / select / dropdown caret |
| `expand_less` | `ChevronUp` | |
| `arrow_forward` | `ArrowRight` | |
| `arrow_back` | `ArrowLeft` | |
| `menu` | `Menu` | Mobile hamburger |
| `close` | `X` | Modal / dialog dismiss |
| `home` | `Home` | |
| `dashboard` | `LayoutDashboard` | |
| `grid_view` | `LayoutGrid` | View-mode toggle |
| `explore` | `Compass` | |
| `search` | `Search` | |
| `filter_list` | `ListFilter` | `Filter` also acceptable |

## 2. Actions

| Material Symbol | lucide component | Notes |
|---|---|---|
| `add` | `Plus` | |
| `add_circle` | `CirclePlus` | `PlusCircle` alias |
| `edit` | `SquarePen` | Material `edit` = pencil-in-square; `Pencil` if a plain pencil is wanted |
| `delete` | `Trash2` | |
| `save` | `Save` | |
| `download` | `Download` | |
| `print` | `Printer` | |
| `share` | `Share2` | |
| `content_copy` | `Copy` | "Copy to clipboard" |
| `refresh` | `RefreshCw` | |
| `update` | `RotateCw` | ⚠ approx — Material `update` = circular arrow + clock; overlaps `refresh` |
| `settings` | `Settings` | |
| `visibility` | `Eye` | Password reveal / show |

## 3. Status, feedback & trust

| Material Symbol | lucide component | Notes |
|---|---|---|
| `check` | `Check` | |
| `check_circle` | `CheckCircle2` | `CircleCheck` / `CircleCheckBig` also present |
| `circle` | `Circle` | Radio / step dot |
| `cancel` | `CircleX` | `XCircle` alias — Material `cancel` = X-in-circle |
| `error` | `AlertCircle` | `CircleAlert` alias |
| `error_outline` | `AlertCircle` | Same lucide target as `error` (outline is default lucide style) |
| `info` | `Info` | |
| `verified` | `BadgeCheck` | Check in scalloped badge |
| `verified_user` | `ShieldCheck` | |
| `security` | `Shield` | Use `ShieldCheck` if a check is shown |
| `lock` | `Lock` | |
| `workspace_premium` | `Award` | ⚠ approx — medal/ribbon; `Award` is the closest |
| `star` | `Star` | Rating |
| `grade` | `Star` | Material `grade` = filled star; same as `star` |
| `stars` | `Sparkles` | Decorative multi-star / "AI"/premium sparkle |
| `cloud_done` | `CloudCheck` | Saved-to-cloud confirmation |
| `pending_actions` | `ClipboardList` | ⚠ approx — clipboard + clock; no exact lucide (consider `ClipboardCheck`) |

## 4. Media & playback

| Material Symbol | lucide component | Notes |
|---|---|---|
| `play_arrow` | `Play` | |
| `play_circle` | `PlayCircle` | `CirclePlay` alias |
| `playlist_play` | `ListVideo` | |
| `movie` | `Film` | |
| `video_library` | `Video` | ⚠ approx — `Clapperboard`/`Film` alternatives |
| `podcasts` | `Podcast` | |
| `photo_camera` | `Camera` | |
| `public` | `Globe` | |
| `language` | `Languages` | ⚠ approx — Material `language` renders as a globe (language selector); `Globe` is the visual twin, `Languages` the semantic one. Pick one and be consistent (don't collide with `public`) |

## 5. Commerce & payments

| Material Symbol | lucide component | Notes |
|---|---|---|
| `payments` | `CreditCard` | Material `payments` = card + $ |
| `account_balance_wallet` | `Wallet` | |
| `shopping_bag` | `ShoppingBag` | |
| `sell` | `Tag` | Price / discount / loyalty tag |
| `card_membership` | `IdCard` | ⚠ approx — membership card w/ ribbon; `CreditCard` alt |
| `inventory_2` | `Package` | Box / inventory |

## 6. People & accounts

| Material Symbol | lucide component | Notes |
|---|---|---|
| `person` | `User` | |
| `group` | `Users` | |
| `groups` | `Users` | Overlaps `group`; both → `Users` (`UsersRound` if differentiation needed) |
| `person_add` | `UserPlus` | |
| `person_pin` | `Contact` | ⚠ approx — person in map-pin; `MapPin` alt |
| `logout` | `LogOut` | |
| `corporate_fare` | `Building2` | Corporate / company (B2B LMS) |
| `support_agent` | `Headset` | |

## 7. Communication & contact

| Material Symbol | lucide component | Notes |
|---|---|---|
| `mail` | `Mail` | |
| `alternate_email` | `AtSign` | |
| `call` | `Phone` | |
| `phone` | `Phone` | Overlaps `call` — same lucide target |
| `chat` | `MessageCircle` | |
| `forum` | `MessagesSquare` | Two overlapping bubbles |
| `notifications` | `Bell` | |
| `location_on` | `MapPin` | |
| `schedule` | `Clock` | Time / duration |
| `calendar_today` | `Calendar` | |
| `event` | `CalendarDays` | Calendar w/ event marker |
| `timer` | `Timer` | Countdown |

## 8. Education & content

| Material Symbol | lucide component | Notes |
|---|---|---|
| `school` | `GraduationCap` | Core brand icon (Jago **Akademi**) |
| `menu_book` | `BookOpen` | |
| `history_edu` | `ScrollText` | ⚠ approx — scroll/book + cap; `BookMarked` alt, no exact |
| `description` | `FileText` | Document |
| `list_alt` | `ClipboardList` | `List` alt |
| `quiz` | `HelpCircle` | ⚠ approx — Material `quiz` = bubble w/ "?"; `CircleHelp` alias, `FileQuestion` for quiz UI |
| `help` | `HelpCircle` | `CircleHelp` alias |
| `help_center` | `HelpCircle` | Overlaps `help`; `LifeBuoy` alt for support |
| `lightbulb` | `Lightbulb` | Tip / insight |
| `assignment_return` | `Undo2` | ⚠ approx — clipboard + return arrow; no exact (`CornerUpLeft` alt) |
| `copyright` | `Copyright` | Footer |
| `hub` | `Waypoints` | ⚠ approx — central node + spokes; `Network` alt |

## 9. Metrics & analytics

| Material Symbol | lucide component | Notes |
|---|---|---|
| `trending_up` | `TrendingUp` | |
| `trending_down` | `TrendingDown` | |
| `analytics` | `BarChart3` | `ChartColumn`/`ChartBar` variants exist |
| `speed` | `Gauge` | |
| `rocket_launch` | `Rocket` | |

## 10. Devices

| Material Symbol | lucide component | Notes |
|---|---|---|
| `smartphone` | `Smartphone` | |

## 11. ⛔ DO NOT PORT

| Material Symbol | (lucide) | Why dropped |
|---|---|---|
| `dark_mode` | ~~`Moon`~~ | **LIGHT-ONLY** app. Remove the theme toggle entirely — do not port the icon or the toggle control. |
| `light_mode` | ~~`Sun`~~ | Same — theme toggle removed. |
| `brand_family` | ~~`Waypoints`~~ | Stitch placeholder used as a footer social icon. Replace with the real Jago Akademi logo/wordmark or the correct social-network icon — never a literal glyph port. |

---

### Flagged summary
- **⛔ Drop (3):** `dark_mode`, `light_mode` (theme toggle — light-only), `brand_family` (placeholder).
- **⚠ Approx, no clean 1:1 (10):** `update`, `pending_actions`, `workspace_premium`, `language`, `video_library`, `card_membership`, `person_pin`, `history_edu`, `quiz`, `assignment_return`, `hub`. Pick the noted lucide component and stay consistent across waves.
- **Intentional collisions** (multiple glyphs → one lucide icon, fine): `error`/`error_outline` → `AlertCircle`; `call`/`phone` → `Phone`; `group`/`groups` → `Users`; `star`/`grade` → `Star`; `help`/`help_center` → `HelpCircle`.

### Porting notes
- Material Symbols size via `font-size`; lucide sizes via the `size` prop (px) or `w-*/h-*` classes. Map Stitch `text-[16px]`/`style="font-size:48px"` → `<Icon size={16} />` / `size={48}`.
- Material `style="font-variation-settings:'FILL' 1"` (filled variant) has no lucide equivalent — lucide is stroke-only. Use `fill="currentColor"` on the lucide component or accept the outline look.
- Color: Stitch `text-primary`/`text-text-secondary` on the span → set `className="text-accent"` / `text-text-secondary` (see token dictionary below) or pass `color`.

---

## Token remap dictionary — Stitch (Material-3) → app tokens

Stitch embeds a full Material-3 palette in each `code.html` (`tailwind.config` + `DESIGN.md`
frontmatter). The app uses a **smaller, light-only token set** (`apps/web/app/globals.css`
`:root` + `@theme inline`, and `tailwind-legacy.config.ts`). Use this table to translate
Stitch utility classes (`bg-surface-container`, `text-on-surface`, `text-primary`, …) during
porting. Many M3 tiers collapse onto one app token.

### Surfaces

| Stitch token (value) | App token / value | Tailwind utility in app |
|---|---|---|
| `surface` / `background` (`#f7f9fe`) | `--surface-page` (`#F5F5F7`) | `bg-surface-page` |
| `surface-page` (`#F5F5F7`) | `--surface-page` (`#F5F5F7`) | `bg-surface-page` |
| `surface-bright` (`#f7f9fe`) | `--surface-page` (`#F5F5F7`) | `bg-surface-page` |
| `surface-card` / `surface-container-lowest` (`#FFFFFF`) | `--surface-card` (`#FFFFFF`) | `bg-surface-card` |
| `surface-container-low` (`#f1f4f8`) | `--surface-sunken` (`#FAFAFA`) | `bg-surface-sunken` |
| `surface-container` (`#ebeef2`) | `--surface-sunken` (`#FAFAFA`) | `bg-surface-sunken` |
| `surface-container-high` (`#e6e8ed`) | hover surface `#F0F0F2` | (raw / `.btn-ghost:hover`) |
| `surface-container-highest` / `surface-variant` (`#e0e3e7`) | `--border-subtle`/`--surface-sunken` | closest neutral fill |
| `surface-dim` (`#d7dadf`) | `--border-strong` (`#D2D2D7`) | dim/disabled surface |

### Text (on-surface)

| Stitch token (value) | App token / value | Tailwind utility in app |
|---|---|---|
| `on-surface` / `on-background` (`#181c1f`) | `--text-primary` (`#1D1D1F`) | `text-text-primary` |
| `on-surface-variant` (`#3f484f`) | `--text-secondary` (`#6E6E73`) | `text-text-secondary` |
| `text-primary` (`#1D1D1F`) | `--text-primary` | `text-text-primary` |
| `text-secondary` (`#6E6E73`) | `--text-secondary` | `text-text-secondary` |
| `on-primary` / `on-primary-container` (`#ffffff`/`#ecf5ff`) | `--text-inverse` (`#FFFFFF`) | `text-text-inverse` / `text-white` |

### Primary / brand (cyan)

| Stitch token (value) | App token / value | Tailwind utility in app |
|---|---|---|
| `primary` (`#005d85`) | `--brand-cyan-strong` (`#0077A8`) | `text-accent` / `bg-accent-cyan-strong` |
| `primary-container` (`#0077a8`) | `--brand-cyan-strong` (`#0077A8`) | `text-accent` / `bg-accent-cyan-strong` |
| `surface-tint` (`#00658f`) | `--brand-cyan-strong` (`#0077A8`) | tint → brand cyan |
| `info` (`#0077A8`) | `--brand-cyan-strong` (`#0077A8`) | `text-accent` |
| `hover-primary` (`#005F87`) | brand-cyan-strong hover (`#005F87`) | see `.btn-primary:hover` |
| `inverse-primary` / `primary-fixed*` (`#86cfff`/`#c8e6ff`) | soft cyan tint — `--surface-accent-soft` | `bg-surface-accent-soft` |

### Secondary (purple) — **NEW token added in W0.1**

| Stitch token (value) | App token / value | Tailwind utility in app |
|---|---|---|
| `secondary` (`#712ae2`) | `--brand-purple` (`#7C3AED`) | `text-accent-purple` / `bg-accent-purple` |
| `secondary-container` (`#8a4cfc`) | `--brand-purple` tint (`#7C3AED`) | `bg-accent-purple` (lighten via opacity) |
| `secondary-fixed*` (`#eaddff`/`#d2bbff`) | purple soft tint (no exact token) | use `--brand-purple` at low opacity |

> Note: Stitch's `secondary` hex is `#712ae2`; the app standardizes on the gradient
> mid-stop **`#7C3AED`** (`--brand-purple`). Use the app value.

### Accent / pink

| Stitch token (value) | App token / value | Tailwind utility in app |
|---|---|---|
| _(pink lives in the gradient only in Stitch)_ | `--brand-pink-strong` (`#CC0052`) | `text-accent-pink` / `bg-accent-pink` |

### Borders / outline

| Stitch token (value) | App token / value | Tailwind utility in app |
|---|---|---|
| `outline` (`#707880`) | `--border-strong` (`#D2D2D7`) | `border-border-strong` |
| `outline-variant` (`#bfc7d0`) | `--border-default` (`#E5E5E5`) | `border-border-default` |

### Status / semantic

| Stitch token (value) | App value | Notes |
|---|---|---|
| `success` (`#16A34A`) | `#16A34A` | ⚠ **No app CSS var yet** — use hex or Tailwind `green-600`. From `DESIGN.md`. |
| `danger` / `error` (`#DC2626` / M3 `#ba1a1a`) | `#DC2626` | Collapse both to `#DC2626` (`red-600`). No app var yet. |
| `warning` (`#B45309`) | `#B45309` | No app var yet. `amber-700`. |
| `info` (`#0077A8`) | `--brand-cyan-strong` | Same as brand cyan. |
| `error-container` / `on-error*` (`#ffdad6`/`#93000a`) | soft-red tint / dark-red text | Derive from `#DC2626` at low opacity. |

### Gradient

| Stitch token (value) | App token / utility |
|---|---|
| `brand-gradient` (`linear-gradient(100deg,#0077A8 0%,#7C3AED 55%,#CC0052 100%)`) | `--brand-gradient` + **`.bg-brand-gradient`** (added W0.1) |

### Dropped Stitch tokens (light-only / not needed)
`inverse-surface`, `inverse-on-surface`, and every `*-fixed` / `*-fixed-dim` / `*-fixed-variant`
tier are Material-3 dark-mode / tonal-palette tokens with no light-only equivalent — **do not port**.
Collapse anything referencing them onto the nearest app surface/text token above.
