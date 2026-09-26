# JAGO AKADEMI — DESIGN SYSTEM
## Visual Identity & Component Guidelines

> Versi: 1.0 | Tanggal: 22 Juni 2026
> Referensi logo: Cyan (#00D4FF) + Hot Pink (#FF0066) + Black stroke
> Referensi vibe: Bold · Dark · Energik · Premium · Youth-first

---

## DAFTAR ISI

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Effects: Shadow, Border, Radius](#5-effects)
6. [Component Library](#6-component-library)
7. [Tailwind Config](#7-tailwind-config)
8. [CSS Variables (globals.css)](#8-css-variables)
9. [Page Layout Patterns](#9-page-layout-patterns)
10. [Motion & Animation](#10-motion--animation)
11. [Iconography & Imagery](#11-iconography--imagery)
12. [Dark Mode Strategy](#12-dark-mode-strategy)

---

## 1. DESIGN PHILOSOPHY

### 1.1 Visual Direction

Jago Akademi mengadopsi arah visual **"Neon Neo-Bold"** — perpaduan antara:

- **Neo-brutalism**: border tebal, shadow keras, layout berani
- **Neon Energy**: warna vibrant di atas dark background
- **Indonesian Youth Culture**: terasa dekat, relatable, tidak kaku korporat
- **EdTech Premium**: meyakinkan, kredibel, terpercaya

> Referensi terbaik: habiskerja.com (bold + dark) ✕ Duolingo (playful + color) ✕ Vercel (clean dark)

### 1.2 Brand Personality

| Trait | Ekspresi Visual |
|-------|-----------------|
| **Berani** | Warna cyan + pink mencolok di atas dark background |
| **Energik** | Micro-animation, gradient, glow effect |
| **Terpercaya** | Konsistensi layout, whitespace yang terukur |
| **Playful** | Font rounded, ilustrasi friendly, tone hangat |
| **Modern** | Dark mode primer, glassmorphism subtle |

### 1.3 Anti-Pattern (Jangan Dilakukan)

- ❌ White background polos tanpa hierarchy
- ❌ Warna abu-abu yang terlalu dominan
- ❌ Button kecil tanpa kontrast
- ❌ Font terlalu tipis di dark background
- ❌ Card seragam tanpa focal point
- ❌ Hero section generik dengan gradient blob biasa

---

## 2. COLOR SYSTEM

### 2.1 Brand Colors (dari Logo)

```typescript
// tokens/colors.ts

export const brand = {
  // Primary — CYAN (dari logo)
  cyan: {
    50:  '#e0fbff',
    100: '#b3f5ff',
    200: '#80eeff',
    300: '#4de6ff',
    400: '#1adfff',
    500: '#00D4FF', // ← WARNA LOGO UTAMA
    600: '#00aad4',
    700: '#007fa9',
    800: '#00547e',
    900: '#002a53',
    950: '#001a33',
  },

  // Secondary — HOT PINK (dari logo)
  pink: {
    50:  '#ffe0ef',
    100: '#ffb3d0',
    200: '#ff80b0',
    300: '#ff4d90',
    400: '#ff1a72',
    500: '#FF0066', // ← WARNA LOGO SECONDARY
    600: '#d40054',
    700: '#a90042',
    800: '#7e0031',
    900: '#530020',
    950: '#290010',
  },

  // Dark Base (background primer)
  dark: {
    50:  '#f0f0f5',
    100: '#d8d8e8',
    200: '#b0b0cc',
    300: '#8888aa',
    400: '#606088',
    500: '#383866',
    600: '#252544',
    700: '#181830',   // ← Background section
    800: '#0f0f1e',   // ← Background card
    900: '#080810',   // ← Background page utama
    950: '#03030a',
  },
} as const;

// Semantic Colors
export const semantic = {
  success: {
    light: '#d1fae5',
    main:  '#10b981',
    dark:  '#065f46',
    glow:  'rgba(16, 185, 129, 0.25)',
  },
  warning: {
    light: '#fef3c7',
    main:  '#f59e0b',
    dark:  '#92400e',
    glow:  'rgba(245, 158, 11, 0.25)',
  },
  error: {
    light: '#fee2e2',
    main:  '#ef4444',
    dark:  '#991b1b',
    glow:  'rgba(239, 68, 68, 0.25)',
  },
  info: {
    light: '#dbeafe',
    main:  '#3b82f6',
    dark:  '#1e40af',
    glow:  'rgba(59, 130, 246, 0.25)',
  },
} as const;

// Neutral
export const neutral = {
  white: '#ffffff',
  black: '#000000',
  gray: {
    50:  '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
} as const;
```

### 2.2 Color Palette Visual

```
PRIMER PALETTE (Dark Mode — Default):
─────────────────────────────────────────
Page BG:     #080810  (dark.900)
Card BG:     #0f0f1e  (dark.800)
Section BG:  #181830  (dark.700)
Border:      #252544  (dark.600)
Text Muted:  #8888aa  (dark.300)
Text Body:   #d8d8e8  (dark.100)
Text Head:   #ffffff  (white)

ACCENT PALETTE:
─────────────────────────────────────────
Cyan:        #00D4FF  → glow: rgba(0,212,255,0.3)
Pink:        #FF0066  → glow: rgba(255,0,102,0.3)
Cyan/Pink    Gradient: linear-gradient(135deg, #00D4FF, #FF0066)

SECONDARY PALETTE (Light Mode):
─────────────────────────────────────────
Page BG:     #f8f8fc
Card BG:     #ffffff
Section BG:  #f0f0f8
Border:      #e4e4f0
Text Muted:  #6b6b8a
Text Body:   #1a1a2e
Text Head:   #080810
```

### 2.3 Gradient Presets

```css
/* Gradients yang sering dipakai */

/* Hero gradient — dark bg dengan nuansa brand */
--gradient-hero: linear-gradient(135deg, #080810 0%, #0f0f2e 50%, #080810 100%);

/* Brand gradient — cyan ke pink */
--gradient-brand: linear-gradient(135deg, #00D4FF 0%, #FF0066 100%);

/* Cyan glow gradient — untuk card highlight */
--gradient-cyan-glow: linear-gradient(135deg, rgba(0,212,255,0.15) 0%, transparent 60%);

/* Pink glow gradient — untuk secondary card */
--gradient-pink-glow: linear-gradient(135deg, rgba(255,0,102,0.15) 0%, transparent 60%);

/* Text gradient — untuk heading spesial */
--gradient-text: linear-gradient(135deg, #00D4FF, #FF0066);

/* Mesh gradient — untuk hero background texture */
--gradient-mesh:
  radial-gradient(at 20% 50%, rgba(0,212,255,0.12) 0px, transparent 50%),
  radial-gradient(at 80% 20%, rgba(255,0,102,0.10) 0px, transparent 50%),
  radial-gradient(at 50% 80%, rgba(0,212,255,0.06) 0px, transparent 50%),
  #080810;
```

### 2.4 Contoh Penggunaan Warna

```
Button Primary  → bg: #00D4FF  | text: #000000 (kontras tinggi)
Button Accent   → bg: #FF0066  | text: #ffffff
Button Outline  → border: #00D4FF | text: #00D4FF | bg: transparent
Heading h1      → text: #ffffff atau gradient brand
Body text       → text: #d8d8e8
Caption/label   → text: #8888aa
Link            → text: #00D4FF | hover: #1adfff
Badge success   → bg: rgba(16,185,129,0.15) | text: #10b981
Badge promo     → bg: rgba(255,0,102,0.15) | text: #FF0066
Card bg         → #0f0f1e dengan border #252544
```

---

## 3. TYPOGRAPHY

### 3.1 Font Stack

```typescript
// tokens/typography.ts

export const fonts = {
  // Display — untuk heading besar, hero, judul section
  display: {
    family: '"Plus Jakarta Sans", "Nunito", sans-serif',
    weights: [700, 800, 900],
    note: 'Untuk H1, H2, judul card besar. Bold, rounded, readable.',
  },

  // Body — untuk paragraph, deskripsi, UI text
  body: {
    family: '"Inter", "DM Sans", system-ui, sans-serif',
    weights: [400, 500, 600],
    note: 'Untuk body text, caption, label, input.',
  },

  // Mono — untuk kode, badge teknis
  mono: {
    family: '"JetBrains Mono", "Fira Code", monospace',
    weights: [400, 500],
    note: 'Untuk kode, ID transaksi, certificate code.',
  },
} as const;

// Google Fonts import order (di globals.css):
// @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap');
```

### 3.2 Type Scale

```typescript
export const typeScale = {
  // Display sizes — hanya untuk hero & section title besar
  'display-2xl': { size: '4.5rem',  lineHeight: '1.1',  weight: 900 }, // 72px
  'display-xl':  { size: '3.75rem', lineHeight: '1.1',  weight: 800 }, // 60px
  'display-lg':  { size: '3rem',    lineHeight: '1.15', weight: 800 }, // 48px
  'display-md':  { size: '2.25rem', lineHeight: '1.2',  weight: 700 }, // 36px
  'display-sm':  { size: '1.875rem',lineHeight: '1.25', weight: 700 }, // 30px

  // Heading — untuk section titles, card titles
  h1:  { size: '2.25rem', lineHeight: '1.25', weight: 800 }, // 36px
  h2:  { size: '1.875rem',lineHeight: '1.3',  weight: 700 }, // 30px
  h3:  { size: '1.5rem',  lineHeight: '1.35', weight: 700 }, // 24px
  h4:  { size: '1.25rem', lineHeight: '1.4',  weight: 600 }, // 20px
  h5:  { size: '1.125rem',lineHeight: '1.45', weight: 600 }, // 18px
  h6:  { size: '1rem',    lineHeight: '1.5',  weight: 600 }, // 16px

  // Body — untuk konten utama
  'body-xl':  { size: '1.25rem', lineHeight: '1.75', weight: 400 }, // 20px
  'body-lg':  { size: '1.125rem',lineHeight: '1.75', weight: 400 }, // 18px
  'body-md':  { size: '1rem',    lineHeight: '1.625',weight: 400 }, // 16px — DEFAULT
  'body-sm':  { size: '0.875rem',lineHeight: '1.571',weight: 400 }, // 14px
  'body-xs':  { size: '0.75rem', lineHeight: '1.5',  weight: 400 }, // 12px

  // Label & UI
  'label-lg': { size: '0.875rem',lineHeight: '1.25', weight: 600 }, // 14px
  'label-md': { size: '0.75rem', lineHeight: '1.25', weight: 600 }, // 12px
  'label-sm': { size: '0.625rem',lineHeight: '1.2',  weight: 700 }, // 10px
} as const;
```

### 3.3 Typography Usage Examples

```
HERO HEADING:
font: Plus Jakarta Sans
size: clamp(2.5rem, 5vw, 4.5rem)   /* responsive */
weight: 900
color: #ffffff
optional: gradient-text untuk highlight kata kunci

SECTION TITLE:
font: Plus Jakarta Sans
size: clamp(1.75rem, 3vw, 2.25rem)
weight: 800
color: #ffffff

CARD TITLE:
font: Plus Jakarta Sans
size: 1.25rem (20px)
weight: 700
color: #ffffff

BODY TEXT:
font: Inter
size: 1rem (16px)
weight: 400
color: #d8d8e8

CAPTION / LABEL:
font: Inter
size: 0.75rem – 0.875rem
weight: 500–600
color: #8888aa

BADGE TEXT:
font: Inter
size: 0.75rem (12px)
weight: 700
letter-spacing: 0.05em
text-transform: uppercase
```

---

## 4. SPACING & LAYOUT

### 4.1 Spacing Scale (4px base)

```typescript
export const spacing = {
  // Micro
  '0':    '0px',
  'px':   '1px',
  '0.5':  '2px',
  '1':    '4px',
  '1.5':  '6px',
  '2':    '8px',
  '2.5':  '10px',
  '3':    '12px',
  '3.5':  '14px',

  // Small
  '4':    '16px',
  '5':    '20px',
  '6':    '24px',
  '7':    '28px',
  '8':    '32px',

  // Medium
  '9':    '36px',
  '10':   '40px',
  '11':   '44px',
  '12':   '48px',
  '14':   '56px',
  '16':   '64px',

  // Large
  '18':   '72px',
  '20':   '80px',
  '24':   '96px',
  '28':   '112px',
  '32':   '128px',

  // Section padding
  'section-sm':  '64px',  // mobile
  'section-md':  '96px',  // tablet
  'section-lg':  '128px', // desktop
} as const;
```

### 4.2 Layout Grid

```css
/* Container sizes */
.container-xs  { max-width: 480px;  }
.container-sm  { max-width: 640px;  }
.container-md  { max-width: 768px;  }
.container-lg  { max-width: 1024px; }
.container-xl  { max-width: 1280px; } /* ← Default untuk content */
.container-2xl { max-width: 1440px; } /* ← Default untuk full-width sections */

/* Page wrapper */
.page-wrapper {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 5vw, 5rem);
}

/* Grid systems */
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }

/* Course card grid */
.grid-courses {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
```

### 4.3 Breakpoints

```typescript
export const breakpoints = {
  'xs':  '375px',   // Small mobile
  'sm':  '640px',   // Mobile landscape
  'md':  '768px',   // Tablet
  'lg':  '1024px',  // Desktop
  'xl':  '1280px',  // Wide desktop
  '2xl': '1440px',  // Full HD
  '3xl': '1920px',  // Ultra wide
} as const;
```

---

## 5. EFFECTS

### 5.1 Border Radius

```typescript
export const radii = {
  'none':  '0px',
  'xs':    '4px',
  'sm':    '6px',
  'md':    '8px',
  'lg':    '12px',
  'xl':    '16px',
  '2xl':   '20px',
  '3xl':   '24px',
  '4xl':   '32px',
  'full':  '9999px',  // untuk badge, avatar, pill button
} as const;

// Panduan penggunaan:
// Button standard  → rounded-lg   (12px)
// Button pill      → rounded-full
// Card             → rounded-2xl  (20px) atau rounded-3xl (24px)
// Input            → rounded-lg   (12px)
// Badge/tag        → rounded-full
// Modal            → rounded-3xl  (24px)
// Avatar           → rounded-full
```

### 5.2 Shadow System

```typescript
export const shadows = {
  // Standard shadows (light mode support)
  'sm':   '0 1px 2px 0 rgba(0,0,0,0.05)',
  'md':   '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  'lg':   '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  'xl':   '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  '2xl':  '0 25px 50px -12px rgba(0,0,0,0.25)',

  // Dark + Neon Glow Shadows (dark mode — karakter utama Jago Akademi)
  'card-dark': '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)',

  // Glow shadows — untuk elemen yang perlu perhatian
  'glow-cyan':  '0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15)',
  'glow-pink':  '0 0 20px rgba(255,0,102,0.4), 0 0 60px rgba(255,0,102,0.15)',
  'glow-brand': '0 0 30px rgba(0,212,255,0.25), 0 0 60px rgba(255,0,102,0.15)',
  'glow-sm-cyan': '0 0 8px rgba(0,212,255,0.35)',
  'glow-sm-pink': '0 0 8px rgba(255,0,102,0.35)',

  // Neo-brutalism shadow (solid offset shadow)
  'neo':        '4px 4px 0px #000000',
  'neo-cyan':   '4px 4px 0px #00D4FF',
  'neo-pink':   '4px 4px 0px #FF0066',
  'neo-lg':     '6px 6px 0px #000000',
  'neo-cyan-lg':'6px 6px 0px #00D4FF',
} as const;
```

### 5.3 Border Style

```css
/* Border presets */
--border-default:     1px solid rgba(255,255,255,0.07);
--border-subtle:      1px solid rgba(255,255,255,0.04);
--border-strong:      1px solid rgba(255,255,255,0.12);
--border-cyan:        1px solid rgba(0,212,255,0.3);
--border-pink:        1px solid rgba(255,0,102,0.3);
--border-cyan-strong: 2px solid #00D4FF;
--border-pink-strong: 2px solid #FF0066;
--border-brand-glow:  1px solid rgba(0,212,255,0.4);

/* Neo-brutalism border (tebal) */
--border-neo:         3px solid #000000;
--border-neo-thick:   4px solid #000000;
```

### 5.4 Glassmorphism Presets

```css
/* Glass card — subtle */
.glass-subtle {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

/* Glass card — cyan tint */
.glass-cyan {
  background: rgba(0, 212, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 212, 255, 0.2);
}

/* Glass card — pink tint */
.glass-pink {
  background: rgba(255, 0, 102, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 0, 102, 0.2);
}

/* Glass nav */
.glass-nav {
  background: rgba(8, 8, 16, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
```

---

## 6. COMPONENT LIBRARY

### 6.1 Button

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2 font-semibold',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080810]',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:scale-[0.97]',
  ],
  {
    variants: {
      variant: {
        // Primary — cyan, solid, high contrast
        primary: [
          'bg-[#00D4FF] text-black font-bold',
          'shadow-[0_0_20px_rgba(0,212,255,0.3)]',
          'hover:bg-[#1adfff] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]',
          'focus-visible:ring-[#00D4FF]',
          'border-2 border-[#00D4FF]',
        ],
        // Accent — hot pink
        accent: [
          'bg-[#FF0066] text-white font-bold',
          'shadow-[0_0_20px_rgba(255,0,102,0.3)]',
          'hover:bg-[#ff1a72] hover:shadow-[0_0_30px_rgba(255,0,102,0.5)]',
          'focus-visible:ring-[#FF0066]',
          'border-2 border-[#FF0066]',
        ],
        // Gradient — brand gradient
        gradient: [
          'bg-gradient-to-r from-[#00D4FF] to-[#FF0066] text-white font-bold',
          'hover:opacity-90 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)]',
          'border-0',
        ],
        // Outline cyan
        outline: [
          'bg-transparent text-[#00D4FF] font-semibold',
          'border-2 border-[#00D4FF]',
          'hover:bg-[rgba(0,212,255,0.08)]',
          'focus-visible:ring-[#00D4FF]',
        ],
        // Outline pink
        'outline-pink': [
          'bg-transparent text-[#FF0066] font-semibold',
          'border-2 border-[#FF0066]',
          'hover:bg-[rgba(255,0,102,0.08)]',
          'focus-visible:ring-[#FF0066]',
        ],
        // Ghost
        ghost: [
          'bg-transparent text-[#d8d8e8] font-medium',
          'hover:bg-white/5 hover:text-white',
          'border border-transparent',
        ],
        // Neo-brutalism
        neo: [
          'bg-[#00D4FF] text-black font-black uppercase tracking-wide',
          'border-[3px] border-black',
          'shadow-[4px_4px_0px_#000]',
          'hover:translate-x-[-2px] hover:translate-y-[-2px]',
          'hover:shadow-[6px_6px_0px_#000]',
          'active:translate-x-[2px] active:translate-y-[2px]',
          'active:shadow-none',
        ],
        // Destructive
        destructive: [
          'bg-red-500 text-white font-semibold',
          'hover:bg-red-600',
          'focus-visible:ring-red-500',
        ],
      },
      size: {
        xs:   'h-7 px-3 text-xs rounded-md',
        sm:   'h-9 px-4 text-sm rounded-lg',
        md:   'h-11 px-5 text-sm rounded-xl',
        lg:   'h-13 px-8 text-base rounded-xl',
        xl:   'h-14 px-10 text-lg rounded-2xl',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  className,
  variant,
  size,
  isLoading,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}

// Usage examples:
// <Button variant="primary">Beli Sekarang</Button>
// <Button variant="gradient" size="xl">Mulai Gratis</Button>
// <Button variant="neo">Daftar Trainer</Button>
// <Button variant="outline" size="lg">Lihat Kursus</Button>
```

### 6.2 Input & Form

```tsx
// components/ui/input.tsx
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[#d8d8e8]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8888aa]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              // Base
              'w-full h-11 rounded-xl px-4 text-sm font-medium',
              'bg-[#0f0f1e] text-white',
              'border border-[rgba(255,255,255,0.08)]',
              'placeholder:text-[#8888aa]',
              // Focus
              'focus:outline-none focus:border-[#00D4FF]',
              'focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)]',
              // Error state
              error && 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed',
              // Icon padding
              leftIcon  && 'pl-10',
              rightIcon && 'pr-10',
              // Transition
              'transition-all duration-200',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8888aa]">
              {rightIcon}
            </div>
          )}
        </div>
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[#8888aa]">{hint}</p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-400 flex items-center gap-1" role="alert">
            <span>⚠</span> {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
```

### 6.3 Course Card

```tsx
// components/course/CourseCard.tsx
import { cn } from '@/lib/utils';
import { Star, Users, Clock, BookOpen } from 'lucide-react';

interface CourseCardProps {
  title: string;
  trainerName: string;
  trainerAvatar?: string;
  thumbnail: string;
  price: number;
  originalPrice?: number;
  rating: number;
  totalReviews: number;
  totalStudents: number;
  duration: string;        // contoh: "8 jam"
  totalLessons: number;
  category: string;
  level: 'Pemula' | 'Menengah' | 'Mahir';
  badge?: 'BESTSELLER' | 'NEW' | 'HOT' | 'FREE';
  className?: string;
  onClick?: () => void;
}

export function CourseCard({
  title,
  trainerName,
  trainerAvatar,
  thumbnail,
  price,
  originalPrice,
  rating,
  totalReviews,
  totalStudents,
  duration,
  totalLessons,
  category,
  level,
  badge,
  className,
  onClick,
}: CourseCardProps) {
  const badgeColors = {
    BESTSELLER: 'bg-[#FF0066] text-white',
    NEW: 'bg-[#00D4FF] text-black',
    HOT: 'bg-orange-500 text-white',
    FREE: 'bg-emerald-500 text-white',
  };

  const levelColors = {
    Pemula:   'text-emerald-400 bg-emerald-400/10',
    Menengah: 'text-amber-400 bg-amber-400/10',
    Mahir:    'text-[#FF0066] bg-[#FF0066]/10',
  };

  return (
    <article
      onClick={onClick}
      className={cn(
        // Base
        'group relative flex flex-col rounded-2xl overflow-hidden',
        'bg-[#0f0f1e]',
        'border border-[rgba(255,255,255,0.07)]',
        // Hover
        'hover:border-[rgba(0,212,255,0.3)]',
        'hover:shadow-[0_0_30px_rgba(0,212,255,0.12)]',
        'hover:-translate-y-1',
        // Transition
        'transition-all duration-300 ease-out',
        'cursor-pointer',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1e] via-transparent to-transparent opacity-60" />

        {/* Badge */}
        {badge && (
          <span className={cn(
            'absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black tracking-wider uppercase',
            badgeColors[badge]
          )}>
            {badge}
          </span>
        )}

        {/* Category chip */}
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-[#d8d8e8] backdrop-blur-sm">
          {category}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Level + Duration */}
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', levelColors[level])}>
            {level}
          </span>
          <span className="text-xs text-[#8888aa] flex items-center gap-1">
            <Clock className="w-3 h-3" /> {duration}
          </span>
          <span className="text-xs text-[#8888aa] flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {totalLessons} pelajaran
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-[#00D4FF] transition-colors">
          {title}
        </h3>

        {/* Trainer */}
        <div className="flex items-center gap-2">
          {trainerAvatar ? (
            <img src={trainerAvatar} alt={trainerName}
              className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.1)]" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#FF0066] flex items-center justify-center text-xs font-bold text-white">
              {trainerName[0]}
            </div>
          )}
          <span className="text-sm text-[#8888aa]">{trainerName}</span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">{rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-[#8888aa]">({totalReviews.toLocaleString('id')})</span>
          <span className="text-xs text-[#8888aa] flex items-center gap-1">
            <Users className="w-3 h-3" /> {totalStudents.toLocaleString('id')}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(255,255,255,0.06)]" />

        {/* Price */}
        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            {price === 0 ? (
              <span className="text-xl font-black text-emerald-400">GRATIS</span>
            ) : (
              <>
                <span className="text-xl font-black text-white">
                  Rp {price.toLocaleString('id')}
                </span>
                {originalPrice && (
                  <span className="text-sm text-[#8888aa] line-through">
                    Rp {originalPrice.toLocaleString('id')}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Diskon badge */}
          {originalPrice && price > 0 && (
            <span className="px-2 py-1 rounded-lg bg-[#FF0066]/15 text-[#FF0066] text-sm font-bold">
              -{Math.round((1 - price / originalPrice) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Bottom glow on hover */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#00D4FF] to-[#FF0066] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </article>
  );
}
```

### 6.4 Badge / Tag

```tsx
// components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-xs rounded-full px-2.5 py-0.5',
  {
    variants: {
      variant: {
        cyan:    'bg-[rgba(0,212,255,0.15)] text-[#00D4FF] border border-[rgba(0,212,255,0.3)]',
        pink:    'bg-[rgba(255,0,102,0.15)] text-[#FF0066] border border-[rgba(255,0,102,0.3)]',
        success: 'bg-[rgba(16,185,129,0.15)] text-emerald-400 border border-emerald-400/30',
        warning: 'bg-[rgba(245,158,11,0.15)] text-amber-400 border border-amber-400/30',
        error:   'bg-[rgba(239,68,68,0.15)] text-red-400 border border-red-400/30',
        neutral: 'bg-white/5 text-[#d8d8e8] border border-white/10',
        solid:   'bg-[#00D4FF] text-black font-black',
        'solid-pink': 'bg-[#FF0066] text-white font-black',
      },
    },
    defaultVariants: { variant: 'cyan' },
  }
);

export function Badge({ variant, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

### 6.5 Section Hero

```tsx
// components/sections/Hero.tsx
// Struktur visual hero — referensi habiskerja.com (bold + dark + glow)

export function Hero() {
  return (
    <section className={cn(
      'relative min-h-screen flex items-center justify-center overflow-hidden',
      // Mesh gradient background
      'bg-[#080810]',
    )}>
      {/* Background mesh glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#00D4FF] opacity-[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#FF0066] opacity-[0.06] rounded-full blur-[120px]" />
      </div>

      {/* Grid texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.05)] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
          <span className="text-sm font-semibold text-[#00D4FF]">Platform Edukasi #1 Indonesia</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-black leading-[1.05] mb-6 tracking-tight">
          <span className="text-white">Belajar. Berlatih.</span>
          <br />
          {/* Gradient text */}
          <span className="bg-gradient-to-r from-[#00D4FF] via-[#88e4ff] to-[#FF0066] bg-clip-text text-transparent">
            Jadi Jago.
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-xl text-[#8888aa] max-w-2xl mx-auto mb-10 leading-relaxed">
          Platform edukasi terintegrasi untuk kamu yang serius upgrade skill,
          dapat sertifikat, dan tampil percaya diri di dunia profesional.
        </p>

        {/* CTA Group */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button variant="primary" size="xl">
            Mulai Belajar Gratis →
          </Button>
          <Button variant="ghost" size="xl">
            Lihat Semua Kursus
          </Button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 pt-16 border-t border-[rgba(255,255,255,0.06)]">
          {[
            { value: '50.000+', label: 'Pelajar Aktif' },
            { value: '200+',    label: 'Kursus Premium' },
            { value: '500+',    label: 'Trainer Tersertifikasi' },
            { value: '4.9/5',   label: 'Rating Platform' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-black text-white">{stat.value}</div>
              <div className="text-sm text-[#8888aa] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 6.6 Navbar

```tsx
// components/layout/Navbar.tsx
// Glass navbar — sticky, dark, minimalis

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Glass background */}
      <div className="bg-[rgba(8,8,16,0.85)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-[1440px] mx-auto px-4 xl:px-20 h-16 flex items-center justify-between">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Jago Akademi" className="h-8 w-auto" />
          </a>

          {/* Nav links — Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {['Kursus', 'Event', 'Trainer Program', 'E-Book', 'Blog'].map((item) => (
              <a
                key={item}
                href="#"
                className="px-4 py-2 text-sm font-medium text-[#8888aa] hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
              >
                {item}
              </a>
            ))}
            <a href="/lms" className="px-4 py-2 text-sm font-semibold text-[#00D4FF] hover:text-white hover:bg-[rgba(0,212,255,0.08)] rounded-xl transition-all">
              LMS B2B
            </a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:flex">Masuk</Button>
            <Button variant="primary" size="sm">Daftar Gratis</Button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### 6.7 Pricing Card

```tsx
// Untuk halaman LMS atau Trainer Program
interface PricingCardProps {
  name: string;
  price: number | 'Custom';
  period?: 'bulan' | 'tahun';
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaLabel?: string;
  onCta?: () => void;
}

export function PricingCard({ name, price, period, description, features, isPopular, ctaLabel = 'Mulai Sekarang', onCta }: PricingCardProps) {
  return (
    <div className={cn(
      'relative flex flex-col rounded-3xl p-8 border transition-all duration-300',
      isPopular
        ? 'bg-gradient-to-b from-[rgba(0,212,255,0.08)] to-[rgba(0,212,255,0.02)] border-[#00D4FF] shadow-[0_0_40px_rgba(0,212,255,0.15)]'
        : 'bg-[#0f0f1e] border-[rgba(255,255,255,0.07)] hover:border-[rgba(0,212,255,0.2)]'
    )}>
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-full bg-[#00D4FF] text-black text-xs font-black uppercase tracking-wider">
            Paling Populer
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-2">{name}</h3>
        <p className="text-sm text-[#8888aa]">{description}</p>
      </div>

      <div className="mb-8">
        {price === 'Custom' ? (
          <span className="text-4xl font-black text-white">Custom</span>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-sm font-medium text-[#8888aa]">Rp</span>
            <span className="text-4xl font-black text-white">{price.toLocaleString('id')}</span>
            {period && <span className="text-sm text-[#8888aa] pb-1">/{period}</span>}
          </div>
        )}
      </div>

      <Button
        variant={isPopular ? 'primary' : 'outline'}
        size="lg"
        className="w-full mb-8"
        onClick={onCta}
      >
        {ctaLabel}
      </Button>

      <ul className="flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-[#d8d8e8]">
            <span className="mt-0.5 text-[#00D4FF] font-bold shrink-0">✓</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 7. TAILWIND CONFIG

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Brand Colors
      colors: {
        brand: {
          cyan:  '#00D4FF',
          pink:  '#FF0066',
          'cyan-light': '#1adfff',
          'pink-light': '#ff1a72',
          'cyan-dark':  '#00aad4',
          'pink-dark':  '#d40054',
        },
        dark: {
          50:  '#f0f0f5',
          100: '#d8d8e8',
          200: '#b0b0cc',
          300: '#8888aa',
          400: '#606088',
          500: '#383866',
          600: '#252544',
          700: '#181830',
          800: '#0f0f1e',
          900: '#080810',
          950: '#03030a',
        },
      },

      // Fonts
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '"Nunito"', 'sans-serif'],
        body:    ['"Inter"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },

      // Font sizes (fluid/responsive via clamp)
      fontSize: {
        'hero':    ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '1.05', fontWeight: '900' }],
        'display': ['clamp(2rem, 4vw, 3.75rem)', { lineHeight: '1.1',  fontWeight: '800' }],
        'heading': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.2', fontWeight: '700' }],
      },

      // Custom shadows
      boxShadow: {
        'glow-cyan':    '0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15)',
        'glow-pink':    '0 0 20px rgba(255,0,102,0.4), 0 0 60px rgba(255,0,102,0.15)',
        'glow-brand':   '0 0 30px rgba(0,212,255,0.25), 0 0 60px rgba(255,0,102,0.15)',
        'glow-sm-cyan': '0 0 8px rgba(0,212,255,0.4)',
        'glow-sm-pink': '0 0 8px rgba(255,0,102,0.4)',
        'card-dark':    '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)',
        'neo':          '4px 4px 0px #000000',
        'neo-cyan':     '4px 4px 0px #00D4FF',
        'neo-pink':     '4px 4px 0px #FF0066',
      },

      // Background images (gradients)
      backgroundImage: {
        'gradient-brand':      'linear-gradient(135deg, #00D4FF 0%, #FF0066 100%)',
        'gradient-brand-r':    'linear-gradient(135deg, #FF0066 0%, #00D4FF 100%)',
        'gradient-hero':       'linear-gradient(135deg, #080810 0%, #0f0f2e 50%, #080810 100%)',
        'gradient-mesh':       'radial-gradient(at 20% 50%, rgba(0,212,255,0.12) 0px, transparent 50%), radial-gradient(at 80% 20%, rgba(255,0,102,0.10) 0px, transparent 50%), #080810',
        'gradient-card-cyan':  'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, transparent 60%)',
        'gradient-card-pink':  'linear-gradient(135deg, rgba(255,0,102,0.08) 0%, transparent 60%)',
        'gradient-text':       'linear-gradient(135deg, #00D4FF, #FF0066)',
      },

      // Animations
      animation: {
        'fade-in':      'fadeIn 0.5s ease-out',
        'slide-up':     'slideUp 0.5s ease-out',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'float':        'float 3s ease-in-out infinite',
        'shimmer':      'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        glowPulse: { '0%,100%': { boxShadow: '0 0 20px rgba(0,212,255,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(0,212,255,0.6)' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer:   { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
      },

      // Backdrop blur
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/line-clamp'),
  ],
};
```

---

## 8. CSS VARIABLES (globals.css)

```css
/* app/globals.css */

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ========================
   DESIGN TOKENS
   ======================== */
:root {
  /* Brand Colors */
  --cyan:          #00D4FF;
  --cyan-light:    #1adfff;
  --cyan-dark:     #00aad4;
  --pink:          #FF0066;
  --pink-light:    #ff1a72;
  --pink-dark:     #d40054;

  /* Glow */
  --glow-cyan:     rgba(0, 212, 255, 0.3);
  --glow-pink:     rgba(255, 0, 102, 0.3);

  /* Dark Backgrounds (default: dark mode) */
  --bg-page:       #080810;
  --bg-card:       #0f0f1e;
  --bg-section:    #181830;
  --bg-input:      #0f0f1e;

  /* Borders */
  --border:        rgba(255, 255, 255, 0.07);
  --border-hover:  rgba(0, 212, 255, 0.3);
  --border-strong: rgba(255, 255, 255, 0.12);

  /* Text */
  --text-primary:  #ffffff;
  --text-body:     #d8d8e8;
  --text-muted:    #8888aa;
  --text-disabled: #525270;

  /* Semantic */
  --success:       #10b981;
  --warning:       #f59e0b;
  --error:         #ef4444;
  --info:          #3b82f6;

  /* Radius */
  --radius-sm:     6px;
  --radius-md:     12px;
  --radius-lg:     20px;
  --radius-xl:     24px;
  --radius-full:   9999px;

  /* Transitions */
  --transition:    all 0.2s ease-out;
  --transition-slow: all 0.4s ease-out;
}

/* Light mode overrides (jika dark mode dinonaktifkan) */
.light {
  --bg-page:      #f8f8fc;
  --bg-card:      #ffffff;
  --bg-section:   #f0f0f8;
  --bg-input:     #ffffff;
  --border:       rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 212, 255, 0.4);
  --text-primary: #080810;
  --text-body:    #1a1a2e;
  --text-muted:   #6b6b8a;
}

/* ========================
   BASE STYLES
   ======================== */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--bg-page);
  color: var(--text-body);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.625;
}

/* ========================
   UTILITY CLASSES
   ======================== */

/* Gradient text */
.text-gradient {
  background: linear-gradient(135deg, var(--cyan), var(--pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glow effects */
.glow-cyan { box-shadow: 0 0 20px var(--glow-cyan), 0 0 60px rgba(0,212,255,0.1); }
.glow-pink  { box-shadow: 0 0 20px var(--glow-pink), 0 0 60px rgba(255,0,102,0.1); }

/* Glass card */
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
}

/* Neo brutalism */
.neo-shadow        { box-shadow: 4px 4px 0 #000; }
.neo-shadow-cyan   { box-shadow: 4px 4px 0 var(--cyan); }
.neo-shadow-pink   { box-shadow: 4px 4px 0 var(--pink); }

/* Section padding */
.section-padding { padding: clamp(4rem, 8vw, 8rem) 0; }

/* Container */
.container {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 5vw, 5rem);
}

/* Scrollbar styling */
::-webkit-scrollbar         { width: 6px; }
::-webkit-scrollbar-track   { background: var(--bg-card); }
::-webkit-scrollbar-thumb   { background: #252544; border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: var(--cyan); }

/* Selection */
::selection {
  background: rgba(0, 212, 255, 0.25);
  color: #ffffff;
}

/* Focus ring */
:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
  border-radius: 4px;
}
```

---

## 9. PAGE LAYOUT PATTERNS

### 9.1 Struktur Halaman Kursus

```
┌──────────── NAVBAR (sticky, glass) ────────────┐
│                                                  │
├──────────── HERO SECTION ───────────────────────┤
│  Eyebrow badge  │  H1 besar (gradient text)     │
│  Subheading     │  Stats row                    │
│  CTA buttons    │  Floating card illustration   │
│                                                  │
├──────────── TRUST BAR ──────────────────────────┤
│  Logo klien (scroll infinite animation)          │
│                                                  │
├──────────── FEATURED COURSES ───────────────────┤
│  Section title + CTA "Lihat Semua"               │
│  Grid 3 kolom (CourseCard)                       │
│  Tab filter: All / Marketing / Tech / Business   │
│                                                  │
├──────────── WHY JAGO AKADEMI ───────────────────┤
│  Dark bg + grid 2 kolom                          │
│  4 icon+text feature blocks                      │
│                                                  │
├──────────── UPCOMING EVENTS ────────────────────┤
│  Card event dengan countdown timer               │
│                                                  │
├──────────── TESTIMONIALS ───────────────────────┤
│  Carousel / masonry layout                       │
│  Bintang rating + kutipan + nama + role          │
│                                                  │
├──────────── CTA SECTION ────────────────────────┤
│  Gradient bg (cyan ke pink) atau dark + glow     │
│  H2 besar + button primary besar                 │
│                                                  │
└──────────── FOOTER ─────────────────────────────┘
```

### 9.2 Dark Card Grid Pattern (ala habiskerja.com)

```
Penggunaan: section "Kenapa Jago Akademi?" atau fitur LMS

┌──────────────────────┐  ┌──────────────────────┐
│  [Ikon cyan]          │  │  [Ikon pink]          │
│  Heading fitur bold   │  │  Heading fitur bold   │
│  Deskripsi singkat    │  │  Deskripsi singkat    │
│  Border bawah: cyan  │  │  Border bawah: pink   │
└──────────────────────┘  └──────────────────────┘
 ↑ dark.800 bg             ↑ dark.800 bg
 ↑ border white/7          ↑ border white/7
 ↑ hover: border-cyan      ↑ hover: border-pink
```

---

## 10. MOTION & ANIMATION

### 10.1 Prinsip Animasi

```
1. PURPOSEFUL   — Animasi membantu konteks, bukan dekorasi
2. FAST         — Default 200ms, max 400ms untuk full-page transition
3. NATURAL      — Easing: ease-out untuk masuk, ease-in untuk keluar
4. REDUCIBLE    — Semua animasi off jika prefers-reduced-motion
```

### 10.2 Animation Presets (Framer Motion)

```typescript
// lib/animations.ts

export const fadeInUp = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
};

export const fadeIn = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  transition: { duration: 0.3 },
};

export const scaleIn = {
  initial:  { opacity: 0, scale: 0.95 },
  animate:  { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export const slideInRight = {
  initial:  { opacity: 0, x: 40 },
  animate:  { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
};

// Viewport trigger (scroll-triggered)
export const scrollReveal = {
  initial:  { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};
```

### 10.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 11. ICONOGRAPHY & IMAGERY

### 11.1 Icon System

```
Library utama: Lucide React
  → Consistent stroke width: 1.5
  → Default size: 20px (w-5 h-5)
  → Small: 16px (w-4 h-4)
  → Large: 24px (w-6 h-6)

Icon colors:
  → Dalam button: inherit dari text
  → Standalone cyan accent: text-[#00D4FF]
  → Muted context: text-[#8888aa]
  → Success state: text-emerald-400
```

### 11.2 Ilustrasi & Visual

```
Style ilustrasi: Flat + bold outline, warna brand (cyan + pink)
Format: SVG (untuk bisa dikustomisasi warna)
Hindari: Foto stock generik, clipart, ikon terlalu detail

Avatar placeholder:
  → Inisial nama dalam gradient cyan-pink circle
  → Atau avatar photo dengan ring: ring-2 ring-[#00D4FF]/30

Thumbnail kursus:
  → Aspect ratio 16:9
  → Overlay gradient: from-dark-900 via-transparent to-transparent
  → Badge kategori di atas kanan
```

---

## 12. DARK MODE STRATEGY

### 12.1 Posisi

```
Dark Mode = DEFAULT & PRIMER untuk Jago Akademi
Light Mode = Opsional (tersedia tapi bukan prioritas)
```

### 12.2 Implementasi

```typescript
// app/providers.tsx — gunakan next-themes
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"          // dark sebagai default
      enableSystem={false}         // jangan ikuti system preference
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

// Toggle (jika diinginkan user)
import { useTheme } from 'next-themes';
const { theme, setTheme } = useTheme();
// <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
```

### 12.3 Color Mapping Dark vs Light

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--bg-page` | `#080810` | `#f8f8fc` |
| `--bg-card` | `#0f0f1e` | `#ffffff` |
| `--text-primary` | `#ffffff` | `#080810` |
| `--text-body` | `#d8d8e8` | `#1a1a2e` |
| `--text-muted` | `#8888aa` | `#6b6b8a` |
| `--border` | `rgba(255,255,255,0.07)` | `rgba(0,0,0,0.08)` |
| `--cyan` (sama) | `#00D4FF` | `#00D4FF` |
| `--pink` (sama) | `#FF0066` | `#FF0066` |

---

## QUICK REFERENCE CHEATSHEET

```
WARNA UTAMA:
  Cyan:  #00D4FF  (bg button primer, border aktif, highlight)
  Pink:  #FF0066  (bg button aksen, badge promo, gradient)
  Dark:  #080810  (page bg), #0f0f1e (card), #181830 (section)
  Text:  #ffffff  (heading), #d8d8e8 (body), #8888aa (muted)

FONT:
  Heading: Plus Jakarta Sans 700–900
  Body:    Inter 400–600

RADIUS:
  Button: rounded-xl (16px) atau rounded-full (pill)
  Card:   rounded-2xl (20px) atau rounded-3xl (24px)
  Input:  rounded-xl (16px)

SHADOW:
  Hover card:  hover:shadow-[0_0_30px_rgba(0,212,255,0.12)]
  Button glow: shadow-[0_0_20px_rgba(0,212,255,0.3)]
  Neo:         shadow-[4px_4px_0px_#000]

GRADIENTS:
  Brand:  linear-gradient(135deg, #00D4FF, #FF0066)
  Hero:   mesh gradient (glow orbs cyan + pink di dark bg)
  Text:   bg-gradient-brand bg-clip-text text-transparent

SPACING SECTION: py-16 md:py-24 lg:py-32
CONTAINER:       max-w-[1440px] mx-auto px-4 xl:px-20
```

---

*Design System ini adalah dokumen hidup — diperbarui setiap kali ada komponen atau pola baru.*
*Gunakan dokumen ini sebagai satu-satunya sumber kebenaran visual Jago Akademi.*
