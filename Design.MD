# LivestockPass Design System
*Version 2.0 — Production Reference*

---

## 1. Philosophy

LivestockPass is built on **high-signal minimalism** — a pure white canvas, precise typography, and a surgical use of color to communicate state. The aesthetic is clean, official, and approachable for all roles: Farmers, Agri Officers, OPV Staff, and Inspectors.

**Core Principles:**
- White-first surfaces for maximum readability
- Color is reserved for state and meaning — never decoration
- Flat UI only — elevation is expressed through borders, never shadows
- Square edges throughout — this is a technical, document-grade system
- No decorative animations — only functional micro-transitions

---

## 2. Color Palette

### Brand / Primary
| Token | Hex | Usage |
|---|---|---|
| `green-700` | `#15803d` | Primary action buttons, active nav indicators, key branding |
| `green-600` | `#16a34a` | Hover states on primary elements |
| `green-50` | `#f0fdf4` | Active background fills, selected row highlights |

### Neutrals
| Token | Hex | Usage |
|---|---|---|
| `stone-800` | `#292524` | Primary headings and body text (warm, not cold black) |
| `stone-600` | `#57534e` | Secondary body text, labels |
| `stone-400` | `#a8a29e` | Placeholder text, de-emphasized metadata |
| `stone-100` | `#f5f5f4` | Subtle surface backgrounds (non-primary sections) |
| `stone-200` | `#e7e5e3` | Borders, dividers |
| `white` | `#ffffff` | Primary canvas and card backgrounds |

> Stone neutrals are used instead of cold gray. Stone has a subtle warmth that reads as agricultural and grounded — it pairs naturally with greens without feeling sterile.

### Semantic / Status Colors
These are used **only** for status indicators, badges, and alerts. Never for decoration.

| State | Token | Hex | Usage |
|---|---|---|---|
| Success / Approved | `green-600` | `#16a34a` | Approved permits, success toasts |
| Pending / In Review | `amber-500` | `#f59e0b` | Pending permits, awaiting action |
| Rejected / Error | `red-600` | `#dc2626` | Rejected permits, form errors |
| Info / In Progress | `sky-600` | `#0284c7` | In-progress status, informational alerts |
| Flagged | `orange-500` | `#f97316` | Flagged for inspection, requires attention |

### Earth Accents (Use Sparingly)
| Token | Hex | Usage |
|---|---|---|
| `lime-100` | `#ecfccb` | Very subtle highlight for farmer-facing sections |
| `amber-50` | `#fffbeb` | Warning alert backgrounds |
| `red-50` | `#fef2f2` | Error state backgrounds |
| `sky-50` | `#f0f9ff` | Info alert backgrounds |

---

## 3. Typography

### Font Stack
- **Headings:** `system-ui, -apple-system, sans-serif` — native authority, zero flash of unstyled text
- **Body / UI:** `Inter, system-ui, sans-serif` — geometric precision for forms and data

### Type Scale
| Role | Class | Size | Weight | Notes |
|---|---|---|---|---|
| Page Title | `text-3xl font-black uppercase tracking-tighter` | 30px | 900 | Main page header only |
| Section Header | `text-lg font-bold tracking-tight` | 18px | 700 | Card/section titles |
| Label | `text-[10px] font-black uppercase tracking-widest` | 10px | 900 | Field labels, table column headers |
| Body | `text-sm font-normal leading-relaxed` | 14px | 400 | General content |
| Secondary | `text-xs font-medium` | 12px | 500 | Metadata, timestamps, helper text |
| Active / Selected | `font-bold text-green-700` | — | 700 | Nav active state, selected items |

### Line Heights
- Body copy: `leading-relaxed` (1.625)
- UI elements (buttons, labels): `leading-none`
- Data tables: `leading-snug` (1.375)

---

## 4. Spacing Scale

All spacing follows a **4px base grid**. Use only these values.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Tight internal padding (icon gaps, badge padding) |
| `space-2` | 8px | Small component internal padding |
| `space-3` | 12px | Standard form field padding, list item padding |
| `space-4` | 16px | Default component padding |
| `space-6` | 24px | Section internal spacing |
| `space-8` | 32px | Between major sections |
| `space-12` | 48px | Page-level vertical rhythm |
| `space-16` | 64px | Large layout gaps |

---

## 5. Component Specifications

### Sidebar
- **Background:** `#ffffff`
- **Right border:** `1px solid #e7e5e3`
- **Active item background:** `#f0fdf4`
- **Active item indicator:** `2px solid #15803d` (right border on active item)
- **Section labels:** `text-[10px] font-black uppercase tracking-widest text-stone-400`
- **Nav link:** `text-sm font-medium text-stone-600`
- **Active nav link:** `text-sm font-bold text-green-700`

### Buttons
| Variant | Classes |
|---|---|
| Primary | `bg-green-700 text-white font-black uppercase tracking-widest text-xs px-4 py-2 rounded-none hover:bg-green-600` |
| Outline | `border border-stone-200 bg-white text-stone-600 font-medium text-sm px-4 py-2 rounded-none hover:bg-stone-100` |
| Danger | `bg-red-600 text-white font-black uppercase tracking-widest text-xs px-4 py-2 rounded-none hover:bg-red-700` |
| Ghost | `bg-transparent text-stone-600 font-medium text-sm px-3 py-2 rounded-none hover:bg-stone-100` |

- **All buttons:** `rounded-none` — no exceptions
- **Disabled state:** `opacity-50 cursor-not-allowed`
- **With icon:** Icon left of label, `gap-2`, icon size `16px`

### Form Inputs
| State | Border | Background |
|---|---|---|
| Default | `1px solid #e7e5e3` | `#ffffff` |
| Focus | `1px solid #15803d` + `outline: none` | `#ffffff` |
| Error | `1px solid #dc2626` | `#fef2f2` |
| Disabled | `1px solid #e7e5e3` | `#f5f5f4` |

- **Height:** `h-9` (36px) for standard inputs
- **Padding:** `px-3 py-2`
- **Radius:** `rounded-none`
- **Font:** `text-sm text-stone-800`
- **Placeholder:** `text-stone-400`
- **Label:** Always above the field, `text-[10px] font-black uppercase tracking-widest text-stone-600 mb-1`

### Status Badges
Used for permit status, application state, and flags.

| Status | Background | Text Color | Border |
|---|---|---|---|
| Approved | `green-50` | `green-700` | `1px solid #16a34a` |
| Pending | `amber-50` | `amber-700` | `1px solid #f59e0b` |
| Rejected | `red-50` | `red-700` | `1px solid #dc2626` |
| In Review | `sky-50` | `sky-700` | `1px solid #0284c7` |
| Flagged | `orange-50` | `orange-700` | `1px solid #f97316` |

- **Padding:** `px-2 py-0.5`
- **Font:** `text-[10px] font-black uppercase tracking-widest`
- **Radius:** `rounded-none`

### Cards / Panels
- **Background:** `#ffffff`
- **Border:** `1px solid #e7e5e3`
- **Radius:** `rounded-none`
- **No shadows — ever**
- **Internal padding:** `p-4` or `p-6`
- **Section dividers inside cards:** `border-t border-stone-200`

### Tables
- **Header row background:** `#f5f5f4`
- **Header text:** `text-[10px] font-black uppercase tracking-widest text-stone-500`
- **Row border:** `border-b border-stone-100`
- **Row hover:** `bg-stone-50`
- **Selected row:** `bg-green-50`
- **Cell padding:** `px-4 py-3`
- **Data text:** `text-sm text-stone-800`
- **No outer table border** — rely on row dividers only

### Toasts / Alerts
| Type | Left Border | Background | Icon |
|---|---|---|---|
| Success | `4px solid #16a34a` | `#f0fdf4` | `CheckCircle` (lucide) |
| Warning | `4px solid #f59e0b` | `#fffbeb` | `AlertTriangle` (lucide) |
| Error | `4px solid #dc2626` | `#fef2f2` | `XCircle` (lucide) |
| Info | `4px solid #0284c7` | `#f0f9ff` | `Info` (lucide) |

- All toasts: `rounded-none`, `border border-stone-200` (full border) + left accent border
- Title: `text-sm font-bold text-stone-800`
- Message: `text-sm text-stone-600`

### Modals
- **Overlay:** `bg-stone-900/50`
- **Panel:** `bg-white border border-stone-200 rounded-none`
- **Header:** `border-b border-stone-200 px-6 py-4`
- **Footer:** `border-t border-stone-200 px-6 py-4 flex justify-end gap-2`
- **No border-radius on the panel**

---

## 6. Icon System — Lucide Icons

**All icons must come from `lucide-react`.** No other icon libraries.

### Usage Rules
- **Size:** `16px` for inline/button icons, `20px` for standalone UI icons, `24px` for empty states
- **Stroke width:** `1.5` (default) — do not change
- **Color:** Always inherit from parent text color via `currentColor`
- **Never use icons alone** without an accessible label or tooltip (except in clearly labeled tables)

### Common Icons by Context
| Context | Icon |
|---|---|
| Permit application | `FileText` |
| Approved | `CheckCircle` |
| Rejected | `XCircle` |
| Pending / Clock | `Clock` |
| Flagged | `AlertTriangle` |
| Farmer profile | `User` |
| Animal / Livestock | `Tag` |
| Location / Area | `MapPin` |
| Documents / Upload | `Upload`, `Paperclip` |
| Search | `Search` |
| Filter | `Filter` |
| Settings | `Settings` |
| Logout | `LogOut` |
| Notifications | `Bell` |
| Download | `Download` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| View detail | `Eye` |
| Dashboard | `LayoutDashboard` |
| Reports | `BarChart2` |
| Chevrons / Nav | `ChevronRight`, `ChevronDown` |
| Close / Dismiss | `X` |

---

## 7. Animation & Transition Policy

**No decorative animations.** The following functional micro-transitions are allowed:

| Use case | Transition |
|---|---|
| Button hover background | `transition-colors duration-100 ease-out` |
| Dropdown open/close | `transition-opacity duration-100 ease-out` |
| Toast enter/exit | `transition-transform duration-150 ease-out` |
| Sidebar collapse | `transition-width duration-150 ease-out` |

- **Maximum duration:** 150ms
- **Allowed properties:** `opacity`, `transform`, `colors`
- **Forbidden:** `animate-pulse`, `animate-spin` (except loading spinners), `animate-bounce`, `scale` on hover, any keyframe-driven decoration

---

## 8. Plain Language Guidelines

LivestockPass is a government service used by farmers, barangay staff, and municipal agriculture workers — not software engineers. Most users are not tech-savvy. Every word in the UI must be immediately understandable by someone who may have only a grade school education or limited experience with computers.

**The rule: if a farmer from Sariaya wouldn't understand it at a glance, rewrite it.**

### Core Principle
Write like you're talking to a person, not filing a form. Short sentences. Common words. Direct instructions.

### Role Labels
Use the simplest, most recognizable label for each user role.

| Don't use | Use instead |
|---|---|
| `Applicant` | `Farmer` |
| `End User` | `Farmer` |
| `OPV Validator` | `Checker` or `Validator` |
| `Agri Officer` | `Agriculture Officer` |
| `System Administrator` | `Admin` |
| `Inspector` | `Inspector` ✓ (already plain) |

### UI Copy — Word Replacements
| Don't use | Use instead |
|---|---|
| `Submit Application` | `Send Request` or `Apply Now` |
| `Authenticate` | `Log In` |
| `Logout` | `Log Out` |
| `View Record` | `See Details` |
| `Invalid Input` | `Please check this field` |
| `Request Denied` | `Your request was not approved` |
| `Processing` | `We're working on it` |
| `Unauthorized` | `You don't have permission to do this` |
| `Not Found` | `We couldn't find that page` |
| `An error occurred` | `Something went wrong. Please try again.` |
| `Upload Document` | `Attach File` or `Add Document` |
| `Verify` | `Check` or `Confirm` |
| `Validate` | `Review` or `Check` |
| `Initiate` | `Start` |
| `Terminate` | `Cancel` or `Stop` |
| `Parameters` | `Details` |
| `Configuration` | `Settings` |
| `Generate Report` | `Download Report` |
| `Fetch Data` | (never show this to users — it's a dev term) |

### Form Labels & Helper Text
Form labels must be short and direct. Helper text must explain **why** we're asking, not just **what** to enter.

| Don't write | Write instead |
|---|---|
| `Enter your TIN` | `Tax ID Number (TIN)` + helper: `You can find this on your tax documents.` |
| `Provide the species of your livestock` | `Type of Animal` + helper: `Example: Cattle, Carabao, Hog, Goat` |
| `Input barangay of residence` | `Barangay` |
| `Date of permit issuance` | `Date Issued` |
| `Destination municipality` | `Where are the animals going?` |
| `Number of heads` | `How many animals?` |

### Status Messages
Status labels on badges and in notifications must tell the farmer exactly where their request stands — not just the system state.

| Don't write | Write instead |
|---|---|
| `Pending` | `Waiting for Review` |
| `In Review` | `Being Checked` |
| `Approved` | `Approved` ✓ |
| `Rejected` | `Not Approved` |
| `Flagged` | `Needs Attention` |
| `Expired` | `Permit Expired` |
| `Cancelled` | `Cancelled` ✓ |

### Empty States
Every empty state must have three things: an icon, a plain explanation, and a clear next action.

| Context | Message | Action Button |
|---|---|---|
| No applications yet | `You haven't sent any requests yet.` | `Apply for a Permit` |
| No results found | `We couldn't find anything matching your search.` | `Clear Search` |
| No notifications | `You're all caught up. Nothing new here.` | — |
| No animals on record | `No animals added yet.` | `Add Animal` |

### Error Messages
Errors must tell the user what happened and what to do next. Never show raw error codes or technical messages to farmers.

| Don't show | Show instead |
|---|---|
| `Error 422: Unprocessable Entity` | `We couldn't save your request. Please check the highlighted fields.` |
| `Network Error` | `Something went wrong. Check your connection and try again.` |
| `403 Forbidden` | `You don't have permission to view this.` |
| `Token expired` | `Your session ended. Please log in again.` |

### Confirmation Dialogs
Be specific. Tell users exactly what will happen.

| Don't write | Write instead |
|---|---|
| `Are you sure?` | `Are you sure you want to cancel this permit request? This cannot be undone.` |
| `Confirm action` | `Approve this permit?` |
| `Delete record` | `Remove this animal from your list?` |

### General Tone Rules
- Write in **second person** — say "you" and "your", not "the user" or "the farmer"
- Use **active voice** — "Your permit was approved" not "The permit has been approved by the officer"
- **Never abbreviate** unless the abbreviation is universally known (e.g. ID, TIN)
- **Avoid ALL CAPS** in body copy and messages — it reads as shouting (labels and buttons are exempt per the design system)
- When something goes wrong, **don't blame the user** — say "something went wrong" not "you entered an invalid value"

---

## 9. Do's and Don'ts

### Do
- Use `#ffffff` as the primary surface for all major UI areas
- Use `green-700` for the single most important CTA per screen
- Use `stone-*` neutrals — never cold `gray-*` — for warmth consistent with the agricultural context
- Use `rounded-none` on all components without exception
- Use `1px stone-200 borders` to define structure instead of shadows
- Use `font-black uppercase tracking-widest` for all labels and section markers
- Use Lucide icons exclusively, at `16px` or `20px`
- Use semantic status colors only on badges, toasts, and alert states

### Don't
- No shadows (`shadow-sm`, `shadow-md`, etc.)
- No rounded corners (`rounded-md`, `rounded-lg`, etc.)
- No gradients or glassmorphism
- No `gray-*` colors — use `stone-*` instead
- No `black` (`#000000`) or near-black outside of `stone-800` for text
- No colors outside the defined palette
- No decorative animations or transitions longer than 150ms
- No icon libraries other than `lucide-react`
- No empty states without an icon + message + action button