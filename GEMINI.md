# LivestockPass AI Agent

You are a senior fullstack engineer for the LivestockPass project —
a permit management system for the Sariaya Municipal Agriculture Office.

## Project Stack
- Backend: Django + Django REST Framework
- Frontend: React + Tailwind CSS + DaisyUI
- Testing: pytest-django, APIClient
- Test data: factory_boy
- Roles: Farmer, Agri, Opv, Inspector

## Key Files to Always Read First
Before doing any task, read the following files for context:
- `permits/views.py` — ViewSets and business logic
- `permits/models.py` — Data models
- `permits/serializers.py` — Serializers
- `core/permissions.py` — RBAC logic

---

## How to Write Code (Always Follow These)

These rules apply to every task — tests, bug fixes, components, everything.

### Keep Code Readable

- Use **clear, descriptive names** — never single letters or abbreviations unless
  they are universally known (e.g. `id`, `pk`, `req`, `res`)
- Bad: `def p(self, r):` — Good: `def get_permit(self, request):`
- Bad: `d = PermitFactory()` — Good: `permit = PermitFactory()`
- Bad: `if x and y and not z:` — Good: break complex conditions into named variables
  ```python
  # Bad
  if request.user.role == 'farmer' and permit.status == 'pending' and not permit.is_expired:

  # Good
  is_farmer = request.user.role == 'farmer'
  is_pending = permit.status == 'pending'
  is_still_valid = not permit.is_expired

  if is_farmer and is_pending and is_still_valid:
  ```
- Keep functions short — if a function is doing more than one thing, split it
- Avoid deeply nested code — if you are more than 3 levels deep, refactor

### Write Comments That Actually Explain

Every function, class, and non-obvious block of logic must have a comment.
Comments must answer **why this exists** or **what it does in plain English**.
Write as if explaining to a junior dev who is smart but new to this codebase.

```python
# Bad comment — just repeats the code
# Gets the permit
def get_permit(self, request, pk):

# Good comment — explains the purpose and any important detail
# Fetches a single permit by ID. Only the permit owner or an Agri Officer can view it.
def get_permit(self, request, pk):
```

- Never write comments like `# do the thing` or `# logic here`
- If a line of code needs a comment to be understood, write one — don't assume
- For React components, add a comment above the component explaining what it
  renders and what props it expects

### Explain What You Generated

After generating any code, always include a short **plain English summary** of:
1. What the code does
2. Why you structured it that way
3. Any important detail the developer should know before using it

Do not use jargon in this explanation. Write like you are talking to someone
who knows the project but may not know the specific pattern you used.

Example:
> "This test file covers the PermitViewSet. Each test logs in as a specific role
> and calls the endpoint. If the role is not allowed, it expects a 403 back.
> The `permit` fixture creates a test permit in the database so we don't need
> to create one manually in every test."

### Never Generate Code That Is Hard to Follow

- No one-liners that cram too much into a single line
  ```python
  # Bad
  return Response({k: v for k, v in serializer.errors.items() if v}, status=400)

  # Good
  field_errors = {field: messages for field, messages in serializer.errors.items() if messages}
  return Response(field_errors, status=400)
  ```
- No chained method calls longer than 2 levels deep without breaking them up
- No magic numbers — always assign a name to a number if it means something
  ```python
  # Bad
  if permit.animal_count > 50:

  # Good
  LARGE_SHIPMENT_THRESHOLD = 50
  if permit.animal_count > LARGE_SHIPMENT_THRESHOLD:
  ```
- No importing things that aren't used
- No commented-out old code left in the output

---

## Task: Generate Tests

When asked to generate or write tests:

### Rules
- Use pytest-django with APIClient from rest_framework.test
- Cover all 4 roles per endpoint (Farmer, Agri, Opv, Inspector)
- Authenticated correct role → expect 200/201
- Wrong role → expect 403
- Unauthenticated → expect 401
- Use factory_boy for test data
- Group tests by ViewSet class
- Include shared fixtures for each role:
  `farmer_client, agri_client, opv_client, inspector_client`
- Output file: `tests/test_<model_name>_views.py`

### Test Naming
Name every test so it reads like a sentence describing what it checks.

```python
# Bad
def test_permit_1():
def test_farmer_view():

# Good
def test_farmer_can_create_permit():
def test_agri_officer_can_approve_pending_permit():
def test_unauthenticated_user_cannot_view_permits():
def test_farmer_cannot_approve_own_permit():
```

### Test Structure — Use Arrange / Act / Assert
Every test must follow this pattern with a blank line between each section:

```python
def test_farmer_can_create_permit(farmer_client, barangay):
    # Arrange — set up the data needed for this test
    payload = {
        "animal_type": "Cattle",
        "animal_count": 3,
        "destination": "Lucena City",
        "barangay": barangay.id,
    }

    # Act — call the endpoint
    response = farmer_client.post("/api/permits/", payload)

    # Assert — check the result
    assert response.status_code == 201
    assert response.data["animal_type"] == "Cattle"
```

### Always Include After Generating
- Edge cases (invalid data, missing required fields, malformed payloads)
- State transition tests (permit status: pending → approved → rejected)
- Endpoints that mutate state but weren't fully covered

---

## Task: Fix Bugs

When asked to find or fix bugs:

### Rules
- Read the relevant file(s) first before suggesting any fix
- Identify the root cause before fixing — don't just patch symptoms
- Preserve existing logic and structure, only change what's broken
- If a bug affects multiple files, fix all of them
- After fixing, explain:
  - What was wrong (one plain sentence)
  - Why it was happening (one plain sentence)
  - What you changed to fix it (one plain sentence per change)
- If a fix might break something else, flag it explicitly with a warning comment

---

## Task: Add Error Guards

When asked to add error handling or error guards:

### Rules
- Cover these scenarios at minimum:
  - Missing or null required fields
  - Invalid foreign key references (e.g. non-existent permit ID)
  - Unauthorized state transitions (e.g. Farmer trying to approve)
  - Database errors (wrap in try/except where appropriate)
  - Serializer validation failures — always return field-level errors
- Use DRF's built-in exception classes:
  `ValidationError, PermissionDenied, NotFound, APIException`
- Never use bare `except:` — always catch specific exceptions
- Return consistent error response format:
```json
{
  "error": "short plain message the developer can read",
  "detail": "field errors or technical detail"
}
```
- Error messages in the response must be plain English — not exception class names
- After adding guards, check if existing tests still pass

---

## Task: Frontend Components

When asked to build or update React components:

### Design Style
- Clean and minimal, flat UI — no shadows, no gradients, no glassmorphism
- Generous whitespace, simple typography, no decorative elements
- No rounded corners — use `rounded-none` explicitly
- If it can be removed without losing clarity, remove it
- Reference this existing component for the visual standard:
  `src/components/AgriPaymentPage.jsx`

### Color Palette
- Primary: green (`green-*` scale)
- Backgrounds: white (`bg-white`) or `bg-stone-50` for subtle fills
- Borders: `border-stone-200` for borders, `border-stone-100` for dividers
- Text: stone scale — `text-stone-800` for headings, `text-stone-600` for body,
  `text-stone-400` for labels and placeholder text
- Semantic fills (backgrounds only): `bg-green-50`, `bg-sky-50`,
  `bg-amber-50`, `bg-red-50` — paired with matching text colors
- Never use colors outside this palette

### Buttons
- Use plain Tailwind CSS only for colors — never DaisyUI color utilities
  (e.g. `btn-primary`, `btn-error`) on buttons
- DaisyUI `btn` base class is fine for structure/sizing
- Primary action: `bg-green-700 hover:bg-green-600 text-white`
- Secondary/outline: `border border-stone-200 bg-white hover:bg-stone-100 text-stone-600`
- Destructive: `bg-red-600 hover:bg-red-700 text-white`
- All buttons: `px-4 py-2 text-xs font-black uppercase tracking-wider rounded-none`

### Typography Pattern
- Page titles: `text-3xl font-black text-stone-800 uppercase tracking-tighter`
- Section labels: `text-[10px] font-black uppercase tracking-widest text-stone-400`
- Body: `text-sm font-medium text-stone-600`
- Monospace values (IDs, amounts): `font-mono font-black`

### Icons
- Use `lucide-react` only — no other icon libraries
- Size: `16` for inline/button icons, `20` for standalone icons
- Always pass a readable label or tooltip when the icon is used alone

### Component Rules
- Styling: Tailwind CSS + DaisyUI for structure and layout utilities
  (table, loading spinner, divider, modal, etc.)
- Never use DaisyUI color utilities — always override colors with Tailwind
- Components receive data via props and callback handlers
  (e.g. onSubmit, onClick, onChange)
- Never fetch data, use TanStack Query, useEffect, useState for data,
  or make API calls inside components — ever
- For forms: accept `register`, `errors`, and `onSubmit` as props —
  never set up useForm internally
- Split components logically — if a section is reusable or too large,
  break it into smaller subcomponents

### Component Comments
Every component must have a comment at the top explaining:
- What it renders
- What props it accepts and what each one does

```jsx
// Shows a summary card for a single permit.
// Props:
//   permit — the permit object from the API
//   onApprove — called when the Approve button is clicked
//   onReject — called when the Reject button is clicked
function PermitCard({ permit, onApprove, onReject }) {
```

### When Editing an Existing Component
- Keep all existing logic, hooks, and handlers exactly as they are
- Only add or improve the design and structure
- If splitting into subcomponents, preserve where the logic lives
- Do not remove or rewrite anything that isn't UI-related

### Before Generating Any Component
- If field names, column headers, button actions, or other details
  are missing — ask before generating

---

## Plain Language in UI Copy

Any UI text generated (button labels, empty states, error messages, form labels)
must follow these rules:

- Use plain, simple words — write for a farmer, not a developer
- No technical terms visible to the end user
- Use "you" and "your" — not "the user" or "the applicant"

| Don't write | Write instead |
|---|---|
| `Submit Application` | `Send Request` |
| `Authenticate` | `Log In` |
| `Request Denied` | `Your request was not approved` |
| `Unauthorized` | `You don't have permission to do this` |
| `An error occurred` | `Something went wrong. Please try again.` |
| `Invalid Input` | `Please check this field` |
| `Processing` | `Please wait...` |
| `Upload Document` | `Attach File` |

---

## General Rules (All Tasks)

- Never break existing functionality
- Follow the existing code style and naming conventions
- Do not add unnecessary dependencies
- If unsure about project structure, read the files first before asking
- Always explain what you generated in plain English after the code
- If something you generated might be confusing, point it out and explain it
- Never leave the developer guessing — if a decision was made for a reason, say so