# Design System Template
*Version 1.0 — Reusable Production Reference*
*Based on the FarmPass Design System v2.0*

---

> [!IMPORTANT]
> ## 🤖 Agent Instructions — READ FIRST
>
> This document is a **reusable design system template** intended to be customized for any new project. Before applying this design system, you **MUST** complete the **Modification Questionnaire** in Section 0 below.
>
> **How to use this document:**
> 1. Read Section 0 (Modification Questionnaire) first.
> 2. Use the `ask_question` tool (or equivalent interactive prompt) to ask the user **each question one at a time**.
> 3. Record their answers.
> 4. Once all answers are collected, generate a **project-specific** `Design.MD` by substituting the user's answers into this template.
> 5. The generated `Design.MD` becomes the single source of truth for all UI development.
>
> **Do NOT skip the questionnaire.** Do NOT assume defaults without asking. The user's answers drive every decision in this document.

---

## 0. Modification Questionnaire

> [!NOTE]
> **For the implementing agent:** Present these questions to the user using the `ask_question` tool before writing any code or generating the final Design.MD. Ask them **one at a time** so the user isn't overwhelmed. Provide the recommended default for each question.

### Q1. Project Identity
**Ask:** *"What is the name of your project?"*
- Example: `FarmPass`, `ClinicFlow`, `BarangayConnect`
- **Default if skipped:** `MyApp`

**Ask:** *"What is a one-line tagline or description for your project?"*
- Example: `Digital Permit & Hog Management System for Sariaya`
- **Default if skipped:** `A modern web application`

---

### Q2. Primary Brand Color
**Ask:** *"What is your primary brand color? Provide a hex code, a named color, or describe a feeling (e.g., 'forest green', 'medical blue', 'warm orange')."*

The agent must then generate a **full shade scale** (50, 100, 200, 300, 400, 500, 600, 700, 800, 900) from the user's chosen color. The primary action color should be the **700 shade**, with 600 as hover and 50 as background fills.

| Option | Hex Example | Mood |
|---|---|---|
| Forest Green (default) | `#15803d` | Agricultural, official, grounded |
| Medical Blue | `#0369a1` | Healthcare, clinical, trustworthy |
| Government Blue | `#1e40af` | Institutional, formal, authoritative |
| Warm Orange | `#c2410c` | Energetic, community, approachable |
| Deep Purple | `#7e22ce` | Creative, modern, tech-forward |
| Custom | User provides hex | — |

---

### Q3. Neutral Tone
**Ask:** *"What neutral color family do you prefer for text, borders, and backgrounds?"*

| Option | Tailwind Family | Character |
|---|---|---|
| Warm Stone (default) | `stone-*` | Earthy, agricultural, approachable |
| Cool Gray | `gray-*` | Modern, tech, corporate |
| Slate | `slate-*` | Sophisticated, editorial, professional |
| Zinc | `zinc-*` | Industrial, minimal, neutral |
| Neutral | `neutral-*` | Truly neutral, no warm or cool bias |

---

### Q4. Corner Radius
**Ask:** *"Do you want strict square edges (no rounding) or allow rounded corners?"*

| Option | Value | Character |
|---|---|---|
| Square (default) | `rounded-none` | Technical, document-grade, authoritative |
| Subtle | `rounded-sm` (2px) | Slightly softer, still professional |
| Standard | `rounded-md` (6px) | Modern SaaS default |
| Rounded | `rounded-lg` (8px) | Friendly, consumer-facing |
| Pill | `rounded-full` (buttons only) | Playful, mobile-first |

---

### Q5. Shadow Policy
**Ask:** *"Do you want a completely flat design (no shadows) or allow subtle shadows?"*

| Option | Value | Character |
|---|---|---|
| No shadows (default) | Borders only | Flat, document-grade, clean |
| Subtle shadows | `shadow-sm` on cards/modals | Modern, slightly elevated |
| Standard shadows | `shadow-md` on floating elements | Depth hierarchy, consumer app feel |

---

### Q6. Dark Mode
**Ask:** *"Do you want dark mode support?"*

| Option | Notes |
|---|---|
| No (default) | Simpler implementation, single theme |
| Yes — user toggle | Manual light/dark switch in settings |
| Yes — system preference | Follows OS `prefers-color-scheme` |
| Yes — both | Toggle + system fallback |

---

### Q7. Icon Library
**Ask:** *"Which icon library do you want to use?"*

| Option | Package | Notes |
|---|---|---|
| Lucide (default) | `lucide-react` | Clean, consistent, MIT licensed |
| Heroicons | `@heroicons/react` | Tailwind team, outline + solid variants |
| Phosphor | `@phosphor-icons/react` | Very large set, 6 weight variants |
| Tabler Icons | `@tabler/icons-react` | Developer-focused, extensive |
| Custom / Other | User specifies | — |

---

## 1. Philosophy

> [!NOTE]
> **Agent:** Replace `{PROJECT_NAME}` with the user's answer from Q1 throughout this document.

{PROJECT_NAME} is built on **high-signal minimalism** — a pure white canvas, precise typography, and a surgical use of color to communicate state. The aesthetic is clean, official, and approachable for all user roles.

**Core Principles:**
- White-first surfaces for maximum readability
- Color is reserved for state and meaning — never decoration
- Flat UI only — elevation is expressed through borders, not shadows *(adjust if Q5 allows shadows)*
- {CORNER_STYLE} edges throughout *(from Q4)*
- No decorative animations — only functional micro-transitions

---

## 2. Color Palette

> [!NOTE]
> **Agent:** Generate this palette based on Q2 (primary color) and Q3 (neutral tone). The structure below is the template — fill in actual hex values from the user's choices.

### Brand / Primary
| Token | Hex | Usage |
|---|---|---|
| `primary-700` | `{PRIMARY_700}` | Primary action buttons, active nav indicators, key branding |
| `primary-600` | `{PRIMARY_600}` | Hover states on primary elements |
| `primary-50` | `{PRIMARY_50}` | Active background fills, selected row highlights |

### Neutrals
| Token | Hex | Usage |
|---|---|---|
| `neutral-800` | `{NEUTRAL_800}` | Primary headings and body text |
| `neutral-600` | `{NEUTRAL_600}` | Secondary body text, labels |
| `neutral-400` | `{NEUTRAL_400}` | Placeholder text, de-emphasized metadata |
| `neutral-200` | `{NEUTRAL_200}` | Borders, dividers |
| `neutral-100` | `{NEUTRAL_100}` | Subtle surface backgrounds |
| `white` | `#ffffff` | Primary canvas and card backgrounds |

### Semantic / Status Colors
These are used **only** for status indicators, badges, and alerts. Never for decoration.

| State | Token | Hex | Usage |
|---|---|---|---|
| Success / Approved | `green-600` | `#16a34a` | Approved states, success toasts |
| Pending / In Review | `amber-500` | `#f59e0b` | Pending states, awaiting action |
| Rejected / Error | `red-600` | `#dc2626` | Rejected states, form errors |
| Info / In Progress | `sky-600` | `#0284c7` | In-progress status, informational alerts |
| Flagged / Warning | `orange-500` | `#f97316` | Flagged items, requires attention |

> [!TIP]
> Semantic status colors should remain consistent across all projects for universal recognition. Only change these if you have a strong project-specific reason.

### Soft Accent Backgrounds
| Token | Hex | Usage |
|---|---|---|
| `green-50` | `#f0fdf4` | Success state backgrounds |
| `amber-50` | `#fffbeb` | Warning alert backgrounds |
| `red-50` | `#fef2f2` | Error state backgrounds |
| `sky-50` | `#f0f9ff` | Info alert backgrounds |
| `orange-50` | `#fff7ed` | Flagged item backgrounds |

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
| Active / Selected | `font-bold text-primary-700` | — | 700 | Nav active state, selected items |

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

> [!IMPORTANT]
> **Agent:** In all component specs below, replace:
> - `{RADIUS}` with the user's Q4 answer (e.g., `rounded-none`, `rounded-md`)
> - `{PRIMARY_*}` colors with the user's Q2-generated palette
> - `{NEUTRAL_*}` colors with the user's Q3 choice
> - `{SHADOW}` with the user's Q5 policy (empty string for no shadows, or the shadow class)

### Sidebar
- **Background:** `#ffffff`
- **Right border:** `1px solid {NEUTRAL_200}`
- **Active item background:** `{PRIMARY_50}`
- **Active item indicator:** `2px solid {PRIMARY_700}` (right border on active item)
- **Section labels:** `text-[10px] font-black uppercase tracking-widest text-{NEUTRAL}-400`
- **Nav link:** `text-sm font-medium text-{NEUTRAL}-600`
- **Active nav link:** `text-sm font-bold text-{PRIMARY}-700`

### Top Navigation Bar
- **Background:** `#ffffff`
- **Bottom border:** `1px solid {NEUTRAL_200}`
- **Height:** `h-14` (56px)
- **Logo area:** Left-aligned, `font-black text-lg text-{NEUTRAL}-800`
- **Nav links:** `text-sm font-medium text-{NEUTRAL}-600 hover:text-{PRIMARY}-700`
- **Active link:** `text-sm font-bold text-{PRIMARY}-700` with `border-b-2 border-{PRIMARY}-700`
- **Right section:** User avatar, notification bell, settings icon
- **Mobile:** Hamburger menu → slide-in drawer or bottom sheet

### Buttons
| Variant | Classes |
|---|---|
| Primary | `bg-{PRIMARY}-700 text-white font-black uppercase tracking-widest text-xs px-4 py-2 {RADIUS} hover:bg-{PRIMARY}-600 {SHADOW}` |
| Outline | `border border-{NEUTRAL}-200 bg-white text-{NEUTRAL}-600 font-medium text-sm px-4 py-2 {RADIUS} hover:bg-{NEUTRAL}-100` |
| Danger | `bg-red-600 text-white font-black uppercase tracking-widest text-xs px-4 py-2 {RADIUS} hover:bg-red-700` |
| Ghost | `bg-transparent text-{NEUTRAL}-600 font-medium text-sm px-3 py-2 {RADIUS} hover:bg-{NEUTRAL}-100` |

- **All buttons:** `{RADIUS}` — applied consistently
- **Disabled state:** `opacity-50 cursor-not-allowed`
- **With icon:** Icon left of label, `gap-2`, icon size `16px`

### Form Inputs
| State | Border | Background |
|---|---|---|
| Default | `1px solid {NEUTRAL_200}` | `#ffffff` |
| Focus | `1px solid {PRIMARY_700}` + `outline: none` | `#ffffff` |
| Error | `1px solid #dc2626` | `#fef2f2` |
| Disabled | `1px solid {NEUTRAL_200}` | `{NEUTRAL_100}` |

- **Height:** `h-9` (36px) for standard inputs
- **Padding:** `px-3 py-2`
- **Radius:** `{RADIUS}`
- **Font:** `text-sm text-{NEUTRAL}-800`
- **Placeholder:** `text-{NEUTRAL}-400`
- **Label:** Always above the field, `text-[10px] font-black uppercase tracking-widest text-{NEUTRAL}-600 mb-1`

### Status Badges
Used for workflow status, application state, and flags.

| Status | Background | Text Color | Border |
|---|---|---|---|
| Approved / Success | `green-50` | `green-700` | `1px solid #16a34a` |
| Pending / Waiting | `amber-50` | `amber-700` | `1px solid #f59e0b` |
| Rejected / Error | `red-50` | `red-700` | `1px solid #dc2626` |
| In Review / Info | `sky-50` | `sky-700` | `1px solid #0284c7` |
| Flagged / Warning | `orange-50` | `orange-700` | `1px solid #f97316` |
| Draft / Inactive | `{NEUTRAL}-50` | `{NEUTRAL}-600` | `1px solid {NEUTRAL_200}` |

- **Padding:** `px-2 py-0.5`
- **Font:** `text-[10px] font-black uppercase tracking-widest`
- **Radius:** `{RADIUS}`

### Cards / Panels
- **Background:** `#ffffff`
- **Border:** `1px solid {NEUTRAL_200}`
- **Radius:** `{RADIUS}`
- **Shadow:** `{SHADOW}` *(none if flat policy)*
- **Internal padding:** `p-4` or `p-6`
- **Section dividers inside cards:** `border-t border-{NEUTRAL}-200`

### Tables
- **Header row background:** `{NEUTRAL_100}`
- **Header text:** `text-[10px] font-black uppercase tracking-widest text-{NEUTRAL}-500`
- **Row border:** `border-b border-{NEUTRAL}-100`
- **Row hover:** `bg-{NEUTRAL}-50`
- **Selected row:** `bg-{PRIMARY}-50`
- **Cell padding:** `px-4 py-3`
- **Data text:** `text-sm text-{NEUTRAL}-800`
- **No outer table border** — rely on row dividers only

### Toasts / Alerts
| Type | Left Border | Background | Icon |
|---|---|---|---|
| Success | `4px solid #16a34a` | `#f0fdf4` | `CheckCircle` |
| Warning | `4px solid #f59e0b` | `#fffbeb` | `AlertTriangle` |
| Error | `4px solid #dc2626` | `#fef2f2` | `XCircle` |
| Info | `4px solid #0284c7` | `#f0f9ff` | `Info` |

- All toasts: `{RADIUS}`, `border border-{NEUTRAL}-200` (full border) + left accent border
- Title: `text-sm font-bold text-{NEUTRAL}-800`
- Message: `text-sm text-{NEUTRAL}-600`

### Modals
- **Overlay:** `bg-{NEUTRAL}-900/50`
- **Panel:** `bg-white border border-{NEUTRAL}-200 {RADIUS} {SHADOW}`
- **Header:** `border-b border-{NEUTRAL}-200 px-6 py-4`
- **Footer:** `border-t border-{NEUTRAL}-200 px-6 py-4 flex justify-end gap-2`
- **Close button:** Top-right, `X` icon, ghost button style

### Empty States
Every empty state must have three things: an icon, a plain explanation, and a clear next action.

- **Icon:** `24px`, `text-{NEUTRAL}-400`, centered
- **Heading:** `text-sm font-bold text-{NEUTRAL}-700 mt-3`
- **Message:** `text-sm text-{NEUTRAL}-500 mt-1`
- **Action button:** Primary button, `mt-4`

### Pagination
- **Container:** `flex items-center gap-1`
- **Page button (default):** `px-3 py-1.5 text-sm text-{NEUTRAL}-600 border border-{NEUTRAL}-200 bg-white {RADIUS} hover:bg-{NEUTRAL}-100`
- **Page button (active):** `px-3 py-1.5 text-sm font-bold text-white bg-{PRIMARY}-700 border border-{PRIMARY}-700 {RADIUS}`
- **Prev/Next arrows:** Ghost button style with `ChevronLeft` / `ChevronRight` icons
- **Disabled state:** `opacity-50 cursor-not-allowed`

### Dropdowns / Select Menus
- **Trigger:** Same styling as form inputs with a `ChevronDown` icon on the right
- **Dropdown panel:** `bg-white border border-{NEUTRAL}-200 {RADIUS} {SHADOW}` — positioned absolutely below trigger
- **Option (default):** `px-3 py-2 text-sm text-{NEUTRAL}-800 hover:bg-{NEUTRAL}-100 cursor-pointer`
- **Option (selected):** `px-3 py-2 text-sm font-bold text-{PRIMARY}-700 bg-{PRIMARY}-50`
- **Max height:** `max-h-60 overflow-y-auto`

### Loading Skeletons
- **Background:** `bg-{NEUTRAL}-100`
- **Animation:** `animate-pulse` *(this is the one exception to the animation policy)*
- **Shape:** Match the shape of the content being loaded (rectangles for text, squares for avatars, full-width bars for rows)
- **Radius:** `{RADIUS}`

---

## 6. Icon System

> [!NOTE]
> **Agent:** Replace `{ICON_LIBRARY}` with the user's Q7 answer.

**All icons must come from `{ICON_LIBRARY}`.** No other icon libraries.

### Usage Rules
- **Size:** `16px` for inline/button icons, `20px` for standalone UI icons, `24px` for empty states
- **Stroke width:** `1.5` (default) — do not change
- **Color:** Always inherit from parent text color via `currentColor`
- **Never use icons alone** without an accessible label or tooltip

### Common Icons by Context

> [!NOTE]
> **Agent:** Map these contexts to the appropriate icons from the user's chosen icon library (Q7). The contexts below are universal — the specific icon names will vary by library.

| Context | Description |
|---|---|
| Dashboard / Home | Main navigation landing |
| Profile / User | User account and profiles |
| Documents / Files | File management, uploads |
| Search | Search functionality |
| Filter | Filter/sort controls |
| Settings | Application settings |
| Logout | End session |
| Notifications | Alerts and updates |
| Download | File downloads |
| Upload / Attach | File uploads |
| Edit | Edit/modify actions |
| Delete | Remove/destroy actions |
| View / Detail | View more information |
| Approve / Success | Confirmation/check actions |
| Reject / Error | Denial/error indicators |
| Pending / Clock | Time-based/waiting states |
| Warning / Flag | Attention required |
| Close / Dismiss | Close modals, panels, alerts |
| Navigation arrows | Breadcrumbs, pagination, expansion |
| Reports / Charts | Data visualization |
| Map / Location | Geographic/location features |

---

## 7. Animation & Transition Policy

**No decorative animations.** The following functional micro-transitions are allowed:

| Use case | Transition |
|---|---|
| Button hover background | `transition-colors duration-100 ease-out` |
| Dropdown open/close | `transition-opacity duration-100 ease-out` |
| Toast enter/exit | `transition-transform duration-150 ease-out` |
| Sidebar collapse | `transition-width duration-150 ease-out` |
| Modal overlay fade | `transition-opacity duration-150 ease-out` |

- **Maximum duration:** 150ms
- **Allowed properties:** `opacity`, `transform`, `colors`, `width`
- **Forbidden:** `animate-bounce`, `animate-spin` (except loading spinners), `scale` on hover, any keyframe-driven decoration
- **One exception:** `animate-pulse` is allowed for loading skeletons only

---

## 8. Plain Language & UX Writing Guidelines

> [!IMPORTANT]
> **Agent:** Adapt this section based on the user's project context. The principle is universal — write for clarity, not cleverness. Replace the example word replacements with ones appropriate to the user's domain.

### Core Principle
Write like you're talking to a person, not filing a form. Short sentences. Common words. Direct instructions.

**The rule: if your least tech-savvy user wouldn't understand it at a glance, rewrite it.**

### UI Copy — Universal Word Replacements
| Don't use | Use instead |
|---|---|
| `Submit` | `Send` or `Apply` |
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
| `Fetch Data` | *(never show this to users — it's a dev term)* |
| `Null` / `Undefined` | *(never show this to users)* |

### Form Labels & Helper Text
Form labels must be short and direct. Helper text must explain **why** we're asking, not just **what** to enter.

**Pattern:** `Short Label` + helper: `Plain explanation with an example.`

Example:
- ✗ `Enter your email address for correspondence` → ✓ `Email` + helper: `We'll send your updates here.`
- ✗ `Input the quantity of items` → ✓ `How many?`

### Status Messages
Status labels on badges and in notifications must tell the user exactly where their request stands — not just the system state.

| Don't write | Write instead |
|---|---|
| `Pending` | `Waiting for Review` |
| `In Review` | `Being Checked` |
| `Approved` | `Approved` ✓ |
| `Rejected` | `Not Approved` |
| `Flagged` | `Needs Attention` |
| `Expired` | `Expired` ✓ |
| `Cancelled` | `Cancelled` ✓ |

### Empty States
Every empty state must have three things: an icon, a plain explanation, and a clear next action.

| Context | Message Pattern | Action Button Pattern |
|---|---|---|
| No items yet | `You haven't added any {items} yet.` | `Add {Item}` |
| No results found | `We couldn't find anything matching your search.` | `Clear Search` |
| No notifications | `You're all caught up. Nothing new here.` | — |
| Permission denied | `You don't have access to this section.` | `Go Back` |

### Error Messages
Errors must tell the user what happened and what to do next. Never show raw error codes or technical messages.

| Don't show | Show instead |
|---|---|
| `Error 422: Unprocessable Entity` | `We couldn't save your request. Please check the highlighted fields.` |
| `Network Error` | `Something went wrong. Check your connection and try again.` |
| `403 Forbidden` | `You don't have permission to view this.` |
| `Token expired` | `Your session ended. Please log in again.` |
| `500 Internal Server Error` | `Something went wrong on our end. Please try again later.` |

### Confirmation Dialogs
Be specific. Tell users exactly what will happen.

| Don't write | Write instead |
|---|---|
| `Are you sure?` | `Are you sure you want to delete this {item}? This cannot be undone.` |
| `Confirm action` | `{Action} this {item}?` |
| `Delete record` | `Remove this {item} from your list?` |

### General Tone Rules
- Write in **second person** — say "you" and "your", not "the user"
- Use **active voice** — "Your request was approved" not "The request has been approved by the administrator"
- **Never abbreviate** unless the abbreviation is universally known (e.g., ID, URL)
- **Avoid ALL CAPS** in body copy and messages — it reads as shouting *(labels and buttons are exempt per the design system)*
- When something goes wrong, **don't blame the user** — say "something went wrong" not "you entered an invalid value"

---

## 9. Dark Mode Specifications

> [!NOTE]
> **Agent:** Only include this section if the user answered "Yes" to Q6. If they said "No", delete this entire section from the generated Design.MD.

### Implementation Strategy
- Use Tailwind's `dark:` variant prefix
- Toggle mechanism: *(from Q6 — user toggle, system preference, or both)*
- Store preference in `localStorage` under key `theme`

### Dark Mode Color Mapping
| Light Mode | Dark Mode |
|---|---|
| `white` (canvas) | `{NEUTRAL}-900` |
| `{NEUTRAL}-100` (surface) | `{NEUTRAL}-800` |
| `{NEUTRAL}-200` (borders) | `{NEUTRAL}-700` |
| `{NEUTRAL}-800` (text) | `{NEUTRAL}-100` |
| `{NEUTRAL}-600` (secondary text) | `{NEUTRAL}-300` |
| `{NEUTRAL}-400` (placeholder) | `{NEUTRAL}-500` |
| `{PRIMARY}-700` (primary action) | `{PRIMARY}-500` (slightly lighter for contrast) |
| `{PRIMARY}-50` (selected bg) | `{PRIMARY}-900` with reduced opacity |

### Status Colors in Dark Mode
Status colors remain the same hue but shift to a slightly brighter shade and use darker background fills:
- Success: `green-400` text on `green-950` bg
- Warning: `amber-400` text on `amber-950` bg
- Error: `red-400` text on `red-950` bg
- Info: `sky-400` text on `sky-950` bg

---

## 10. Do's and Don'ts

### ✅ Do
- Use `#ffffff` as the primary surface for all major UI areas
- Use `{PRIMARY}-700` for the single most important CTA per screen
- Use `{NEUTRAL}-*` neutrals consistently — never mix neutral families
- Use `{RADIUS}` on all components without exception
- Use `1px {NEUTRAL}-200 borders` to define structure *(if flat policy from Q5)*
- Use `font-black uppercase tracking-widest` for all labels and section markers
- Use icons from `{ICON_LIBRARY}` exclusively, at `16px` or `20px`
- Use semantic status colors only on badges, toasts, and alert states
- Use the 4px spacing grid for all measurements
- Write all UI copy following the Plain Language guidelines (Section 8)

### ❌ Don't
- No colors outside the defined palette
- No decorative animations or transitions longer than 150ms
- No icon libraries other than `{ICON_LIBRARY}`
- No empty states without an icon + message + action button
- No raw error codes or technical jargon in user-facing text
- No mixing of neutral families (e.g., don't use `gray-*` if `stone-*` is the chosen neutral)
- No `#000000` pure black for text — always use `{NEUTRAL}-800`

#### Conditional Don'ts *(based on questionnaire answers)*

**If Q4 = `rounded-none` (flat):**
- No rounded corners (`rounded-md`, `rounded-lg`, etc.) — anywhere
- No border-radius on any component

**If Q5 = No shadows:**
- No shadows (`shadow-sm`, `shadow-md`, etc.) — anywhere
- No gradients or glassmorphism

**If Q6 = No dark mode:**
- No `dark:` variants in any component

---

## 11. Tailwind Configuration Reference

> [!NOTE]
> **Agent:** After completing the questionnaire, generate a working `tailwind.config.js` (or `@theme` block in `index.css` for Tailwind v4) that encodes all the user's choices. Include the full color palette, spacing scale, font stack, and any custom theme extensions.

### Example Tailwind v4 `@theme` Block (template)

```css
@import "tailwindcss";

@theme {
  /* Primary Brand Colors — generated from Q2 */
  --color-primary-50: {PRIMARY_50};
  --color-primary-100: {PRIMARY_100};
  --color-primary-200: {PRIMARY_200};
  --color-primary-300: {PRIMARY_300};
  --color-primary-400: {PRIMARY_400};
  --color-primary-500: {PRIMARY_500};
  --color-primary-600: {PRIMARY_600};
  --color-primary-700: {PRIMARY_700};
  --color-primary-800: {PRIMARY_800};
  --color-primary-900: {PRIMARY_900};

  /* Fonts */
  --font-heading: system-ui, -apple-system, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
}
```

---

## 12. File Structure Recommendation

When setting up a new project with this design system, create these UI component files:

```
src/
├── components/
│   └── ui/
│       ├── Button.jsx          # All button variants
│       ├── Badge.jsx           # Status badges
│       ├── Card.jsx            # Card / Panel wrapper
│       ├── Input.jsx           # Form inputs with all states
│       ├── Select.jsx          # Dropdown / Select menus
│       ├── Modal.jsx           # Modal dialog
│       ├── Toast.jsx           # Toast notifications (or use Sonner)
│       ├── Table.jsx           # Data table with header/row styling
│       ├── Pagination.jsx      # Page navigation
│       ├── Sidebar.jsx         # Navigation sidebar
│       ├── Navbar.jsx          # Top navigation bar
│       ├── EmptyState.jsx      # Empty state pattern
│       └── Skeleton.jsx        # Loading skeletons
├── index.css                   # Tailwind imports + @theme tokens
└── lib/
    └── utils.js                # cn() helper (clsx + tailwind-merge)
```

---

*This design system template is based on the FarmPass Design System v2.0. It encodes the same visual philosophy — high-signal minimalism, white-first surfaces, and functional precision — while allowing full customization of brand identity, color palette, and interaction style through the Modification Questionnaire.*
