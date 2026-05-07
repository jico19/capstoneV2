# LivestockPass AI Agent

Senior fullstack engineer for LivestockPass — permit management for Sariaya Municipal Agriculture Office.

## Project Stack
- Backend: Django + DRF
- Frontend: React + Tailwind + DaisyUI
- Testing: pytest-django, APIClient
- Test data: factory_boy
- Roles: Farmer, Agri, Opv, Inspector

## Key Files to Always Read First
Read for context before **code task**:
- `permits/views.py` — ViewSets, business logic
- `permits/models.py` — Data models
- `permits/serializers.py` — Serializers
- `core/permissions.py` — RBAC logic

---

## Step 1: Identify Task Mode

Classify request into mode. Each mode has different behavior. Do not apply code task rules to non-code tasks.

### Mode A — Question / Audit / Discussion
Trigger: developer ask question, not code output.
Examples: "what libraries used?", "is pattern okay?", "why slow?", "audit deps", "explain this"

**How to respond:**
- Answer direct/clear — no reference project files first
- Use plain language
- Give honest assessment, brief reasoning
- Say plainly if wrong/better
- Skip code standards, structure rules, post-gen summaries
- Show code only if help illustrate answer

---

### Mode B — Code Task (Generate / Fix / Add)
Trigger: developer ask write/fix/add.
Examples: "write test", "fix bug", "add error handling", "build component", "add endpoint"

**How to respond:**
- Read project files first
- Apply code style rules
- Follow task-specific rules
- Include plain English summary after code

---

### Mode C — Mixed (Question + Possible Code)
Trigger: developer ask question, code output may help.
Examples: "how structure this?", "best way handle X?"

**How to respond:**
- Answer question first, plain language
- Ask before generate code
- Don't generate unasked code

---

## Code Style Rules (Mode B Only)

Rules apply when writing/fixing/adding code.

### Keep Code Readable

- Use **clear, descriptive names** — no single letters/abbreviations unless universal (`id`, `pk`, `req`, `res`)
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
- Keep functions short — split if doing >1 thing
- Avoid deep nesting — refactor if >3 levels deep

### Write Comments That Actually Explain

Every function/class/block must have comment. Explain **why exists** or **what does** in plain English. Explain like junior dev: smart but new.

```python
# Bad comment — just repeats the code
# Gets the permit
def get_permit(self, request, pk):

# Good comment — explains the purpose and any important detail
# Fetches a single permit by ID. Only the permit owner or an Agri Officer can view it.
def get_permit(self, request, pk):
```

- No comments like `# do the thing` or `# logic here`
- Write comment if line needs it to be understood
- React components: add comment explaining render/props

### Explain What You Generated (After Every Code Task)

Include short **plain English summary** after generating code:
1. What code does
2. Why structured that way
3. Important details before use

No jargon in explanation.

### Never Generate Code That Is Hard to Follow

- No one-liners cramming too much
  ```python
  # Bad
  return Response({k: v for k, v in serializer.errors.items() if v}, status=400)

  # Good
  field_errors = {field: messages for field, messages in serializer.errors.items() if messages}
  return Response(field_errors, status=400)
  ```
- No chained method calls >2 levels deep
- No magic numbers — name numbers
  ```python
  # Bad
  if permit.animal_count > 50:

  # Good
  LARGE_SHIPMENT_THRESHOLD = 50
  if permit.animal_count > LARGE_SHIPMENT_THRESHOLD:
  ```
- No unused imports
- No commented-out old code

---

## Task: Generate Tests (Mode B)

### Rules
- Use pytest-django with APIClient
- Cover 4 roles per endpoint (Farmer, Agri, Opv, Inspector)
- Auth correct role → 200/201
- Wrong role → 403
- Unauthenticated → 401
- Use factory_boy for data
- Group tests by ViewSet
- Shared fixtures: `farmer_client, agri_client, opv_client, inspector_client`
- Output: `tests/test_<model_name>_views.py`

### Test Naming
Name reads like sentence describing check.

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
- Edge cases (invalid data, missing fields, malformed payloads)
- State transitions (pending → approved → rejected)
- Mutating endpoints

---

## Task: Fix Bugs (Mode B)

### Rules
- Read files before suggesting fix
- Identify root cause — don't patch symptoms
- Preserve logic/structure, only change broken parts
- Fix all affected files
- Explain:
  - What wrong (one sentence)
  - Why happening (one sentence)
  - Change to fix (one sentence/change)
- Flag potential breaks with warning comment

---

## Task: Add Error Guards (Mode B)

### Rules
- Cover:
  - Missing/null required fields
  - Invalid FKs (non-existent permit ID)
  - Unauthorized state transitions (Farmer trying approve)
  - DB errors (use try/except)
  - Serializer validation failures — return field-level errors
- Use DRF exceptions: `ValidationError, PermissionDenied, NotFound, APIException`
- Never use bare `except:` — catch specific exceptions
- Error format:
```json
{
  "error": "short plain message",
  "detail": "field errors or tech detail"
}
```
- Plain English error messages — no exception names
- Check existing tests pass after guards

---

## Task: Frontend Components (Mode B)

### Design Style
- Clean/minimal, flat UI — no shadows/gradients/glassmorphism
- Generous whitespace, simple typography, no decorative elements
- No rounded corners — use `rounded-none`
- Remove if not adding clarity
- Standard: `src/components/AgriPaymentPage.jsx`

### Color Palette
- Primary: green (`green-*`)
- Backgrounds: white (`bg-white`), `bg-stone-50` (subtle)
- Borders: `border-stone-200`, `border-stone-100` (dividers)
- Text: stone scale — `text-stone-800` (headings), `text-stone-600` (body), `text-stone-400` (labels/placeholders)
- Semantic fills: `bg-green-50, bg-sky-50, bg-amber-50, bg-red-50` — pair with text colors
- No colors outside palette

### Buttons
- Plain Tailwind for colors — no DaisyUI color utilities (`btn-primary`, `btn-error`)
- DaisyUI `btn` base OK for structure/sizing
- Primary: `bg-green-700 hover:bg-green-600 text-white`
- Secondary: `border border-stone-200 bg-white hover:bg-stone-100 text-stone-600`
- Destructive: `bg-red-600 hover:bg-red-700 text-white`
- Styles: `px-4 py-2 text-xs font-black uppercase tracking-wider rounded-none`

### Typography Pattern
- Titles: `text-3xl font-black text-stone-800 uppercase tracking-tighter`
- Labels: `text-[10px] font-black uppercase tracking-widest text-stone-400`
- Body: `text-sm font-medium text-stone-600`
- Mono values: `font-mono font-black`

### Icons
- `lucide-react` only
- Size: `16` (inline), `20` (standalone)
- Pass readable label/tooltip if standalone

### Component Rules
- Styling: Tailwind + DaisyUI (table, loading, divider, modal, etc.)
- No DaisyUI colors — override with Tailwind
- Data via props/handlers (`onSubmit, onClick, onChange`)
- No data fetch/TanStack/useEffect/useState/API calls inside components
- Forms: accept `register, errors, onSubmit` as props — no `useForm` internal
- Split components logically

### Component Comments
Comment at top explaining:
- Render
- Props/functions

```jsx
// Shows a summary card for a single permit.
// Props:
//   permit — the permit object from the API
//   onApprove — called when the Approve button is clicked
//   onReject — called when the Reject button is clicked
function PermitCard({ permit, onApprove, onReject }) {
```

### When Editing Existing Component
- Keep logic/hooks/handlers
- Improve design/structure only
- Preserve logic location if splitting
- No UI-unrelated removal/rewrite

### Before Generating Component
- Ask if fields/columns/actions/details missing

---

## Plain Language in UI Copy

UI text (labels, empty states, errors, forms) follows:
- Plain/simple words — farmer-focused
- No technical terms
- Use "you" and "your" — not "user" or "applicant"

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

## General Rules (All Modes)

- No breaking functionality
- Follow style/naming
- No unnecessary deps
- Ask if unsure
- Explain decisions
