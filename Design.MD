# FarmPass Design System
*Version 2.1 — Production Reference*

---

## 1. Philosophy

FarmPass is built on **high-signal, approachable utility** — a clean white canvas, warm agricultural stone neutrals, precise typography, and a refined tactile feel. The aesthetic balances official municipal authority with modern, approachable ease for Farmers, Agri Officers, OPV Staff, and Inspectors.

**Core Principles:**
- **White-first surfaces** for maximum readability and high contrast.
- **Color is reserved for state and meaning** — surgical greens for action/approval, warm stones for structure.
- **Tactile, refined corner radii** — an intentional 3-tier hierarchy (`rounded-xl` for cards, `rounded-lg` for controls, `rounded-md` for badges). Eliminates aggressive brutalist square edges without collapsing into generic pill slop.
- **Structured depth** — clean `1px stone-200` borders paired with subtle, crisp micro-shadows (`shadow-xs` / `shadow-sm`) on elevated surfaces (modals, dropdowns, floating docks).
- **Subtle, functional transitions** — fast micro-interactions (100–150ms) that give immediate physical feedback.

---

## 2. Corner Radius System

Hierarchy follows the nested geometry rule (inner radius = outer radius − padding):

| Level | Token | Value | Applied To |
|---|---|---|---|
| **Container / Card** | `rounded-xl` | 12px | Cards, panels, modals, map hero container, table frames |
| **Interactive Control** | `rounded-lg` | 8px | Action buttons, form inputs, search selects, dropdown menus |
| **Compact / Chip** | `rounded-md` | 6px | Status badges, segment buttons, indicator chips, audit formula blocks |
| **Indicator Dot** | `rounded-full` | 9999px | Status pulse dots, avatar circles, legend swatches (when circular) |

---

## 3. Color Palette

### Brand / Primary
| Token | Hex | Usage |
|---|---|---|
| `green-700` | `#15803d` | Primary action buttons, active nav indicators, key branding |
| `green-600` | `#16a34a` | Hover states on primary elements |
| `green-50` | `#f0fdf4` | Active background fills, selected row highlights |

### Neutrals
| Token | Hex | Usage |
|---|---|---|
| `stone-800` | `#292524` | Primary headings and body text (warm, grounded neutral) |
| `stone-600` | `#57534e` | Secondary body text, labels |
| `stone-400` | `#a8a29e` | Placeholder text, de-emphasized metadata |
| `stone-100` | `#f5f5f4` | Subtle surface backgrounds (page canvas, segmented rails) |
| `stone-200` | `#e7e5e3` | Structural borders, dividers |
| `white` | `#ffffff` | Primary canvas and card backgrounds |

> Stone neutrals are used instead of cold gray or blue-slate. Stone has a subtle warmth that reads as agricultural and grounded — it pairs naturally with greens without feeling sterile.

### Semantic / Status Colors
These are used **only** for status indicators, badges, and alerts. Never for decoration.

| State | Token | Hex | Usage |
|---|---|---|---|
| Success / Approved | `green-600` | `#16a34a` | Approved permits, positive census growth |
| Pending / In Review | `amber-500` | `#f59e0b` | Pending permits, awaiting action |
| Rejected / Error | `red-600` | `#dc2626` | Rejected permits, form errors, decline shifts |
| Info / In Progress | `sky-600` | `#0284c7` | Outbound shipments, in-progress status, info notes |
| Flagged | `orange-500` | `#f97316` | High density, flagged for inspection |

### Subtle Status Backgrounds
| Token | Hex | Usage |
|---|---|---|
| `green-50` | `#f0fdf4` | Approved badge fills |
| `amber-50` | `#fffbeb` | Warning alert backgrounds |
| `red-50` | `#fef2f2` | Error state backgrounds |
| `sky-50` | `#f0f9ff` | Shipment badge backgrounds |

---

## 4. Typography

### Font Stack
- **Headings:** `system-ui, -apple-system, sans-serif` — native authority, zero flash of unstyled text
- **Body / UI:** `Inter, system-ui, sans-serif` — geometric precision for forms and data

### Type Scale
| Role | Class | Size | Weight | Notes |
|---|---|---|---|---|
| Page Title | `text-2xl md:text-3xl font-black uppercase tracking-tight` | 24–30px | 900 | Main page header only |
| Section Header | `text-base md:text-lg font-black tracking-tight` | 16–18px | 900 | Card/section titles |
| Label | `text-[10px] font-black uppercase tracking-widest` | 10px | 900 | Field labels, table column headers |
| Body | `text-sm font-normal leading-relaxed` | 14px | 400 | General content |
| Secondary | `text-xs font-medium` | 12px | 500 | Metadata, timestamps, helper text |
| Active / Selected | `font-bold text-green-700` | — | 700 | Nav active state, selected items |

---

## 5. Spacing Scale

All spacing follows a **4px base grid**:
- `space-1` (4px): Icon gaps, badge internal padding
- `space-2` (8px): Button gaps, small card padding
- `space-3` (12px): Standard form field padding, list item padding
- `space-4` (16px): Default card internal padding
- `space-6` (24px): Section internal spacing
- `space-8` (32px): Layout gaps

---

## 6. Component Specifications

### Sidebar
- **Background:** `#ffffff`
- **Right border:** `1px solid #e7e5e3`
- **Active item background:** `#f0fdf4`
- **Active item indicator:** `2px solid #15803d` (right border or indicator)
- **Active nav link:** `text-sm font-bold text-green-700 rounded-lg`

### Buttons
| Variant | Classes |
|---|---|
| Primary | `bg-green-700 text-white font-black uppercase tracking-widest text-xs px-4 py-2 rounded-lg hover:bg-green-600 shadow-xs active:scale-[0.98] transition-all` |
| Outline | `border border-stone-200 bg-white text-stone-700 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-stone-50 shadow-2xs transition-colors` |
| Danger | `bg-red-600 text-white font-black uppercase tracking-widest text-xs px-4 py-2 rounded-lg hover:bg-red-700 shadow-xs transition-colors` |
| Ghost | `bg-transparent text-stone-600 hover:text-stone-800 font-medium text-xs px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors` |

### Form Inputs
- **Class:** `h-9 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs transition-all`
- **Label:** `text-[10px] font-black uppercase tracking-widest text-stone-600 mb-1`

### Status Badges
- **Padding:** `px-2 py-0.5`
- **Font:** `text-[10px] font-black uppercase tracking-widest`
- **Radius:** `rounded-md`
- **Style:** Subtle tinted background + colored border (e.g. `bg-green-50 text-green-700 border border-green-600/30`)

### Cards / Panels
- **Background:** `#ffffff`
- **Border:** `1px solid #e7e5e3`
- **Radius:** `rounded-xl`
- **Elevation:** `shadow-xs` for subtle tactile presence
- **Internal padding:** `p-4` or `p-6`

### Floating Controls & Docks (Map / Canvas)
- **Background:** `#ffffff` (solid white, no heavy glassmorphism blur)
- **Border:** `1px solid #e7e5e3`
- **Radius:** `rounded-xl` for docks, `rounded-lg` for child chips and toggles
- **Elevation:** `shadow-sm` (crisp and restrained)

### Modals
- **Overlay:** `bg-stone-900/50 backdrop-blur-xs`
- **Panel:** `bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden max-w-md w-full`
- **Header:** `border-b border-stone-200 px-6 py-4 bg-stone-50/50`
- **Footer:** `border-t border-stone-200 px-6 py-4 flex justify-end gap-2 bg-stone-50/50`

---

## 7. Plain Language Guidelines

FarmPass is a municipal government tool used by farmers and agriculture field workers. Every term must be clear, direct, and human:

| Don't write | Write instead |
|---|---|
| `Submit Application` | `Send Request` or `Apply Now` |
| `Upload CSV` | `Upload Survey` |
| `Start Upload` | `Upload Now` |
| `Authenticate` | `Log In` |
| `View Record` | `See Details` |
| `Pending` | `Waiting for Review` |
| `In Review` | `Being Checked` |
| `Approved` | `Approved` |
| `Rejected` | `Not Approved` |
| `Flagged` | `Needs Attention` |
| `Reset Camera` | `Reset Bounds` |

---

## 8. Do's and Don'ts

### Do
- Use `rounded-xl` for cards, `rounded-lg` for buttons and inputs, and `rounded-md` for badges.
- Use `stone-*` warm neutrals — never cold blue-grays.
- Use `green-700` (`#15803d`) for primary actions.
- Use crisp, subtle micro-elevation (`shadow-xs` or `shadow-sm`) on raised surfaces.
- Use Lucide icons exclusively at `14px`, `16px`, or `20px`.
- Use second-person, active voice ("You", "Your permit").

### Don't
- No aggressive, brutalist 0px corners across everything (`rounded-none` everywhere).
- No excessive pill-shapes on every button and card (`rounded-full` everywhere).
- No heavy, muddy dark drop shadows (`shadow-2xl` with massive blur).
- No full-page frosted glassmorphism (`backdrop-blur-md` stacked on all surfaces).
- No cold `gray-*` or `slate-*` palettes.