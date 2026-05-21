# Git Commit Conventions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive guide for git commit messages that includes task IDs and follows professional standards.

**Architecture:** A standalone Markdown documentation file in the project root.

**Tech Stack:** Markdown.

---

### Task 1: Create GIT_COMMIT_CONVENTIONS.md

**Files:**
- Create: `GIT_COMMIT_CONVENTIONS.md`

- [ ] **Step 1: Write the content to GIT_COMMIT_CONVENTIONS.md**

```markdown
# Git Commit Conventions

This document defines the standard for commit messages in the **LivestockPass** project. Following these rules ensures a clean, searchable history and provides a clear audit trail for the Sariaya Municipal Agriculture Office.

## 🏗️ The Format

We use the [Conventional Commits](https://www.conventionalcommits.org/) standard with a required Task ID for tracked work.

```text
<type>(<scope>): <description> [#ID]

[Optional body explaining WHY the change was made]

[Optional footer for breaking changes or co-authors]
```

### 1. Type
- `feat`: A new feature for the user (e.g., `feat(farmer): add permit history page`).
- `fix`: A bug fix (e.g., `fix(api): resolve null pointer in permit creation`).
- `docs`: Documentation changes only.
- `style`: Code style changes (formatting, missing semi-colons, no code changes).
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Maintenance tasks, build changes, or dependency updates.

### 2. Scope
Scopes should be specific to the area of the application:
- **Roles:** `farmer`, `agri`, `opv`, `inspector`
- **Technical:** `backend`, `frontend`, `db`, `ocr`, `api`, `auth`
- **Global:** `docs`, `ci`, `config`

### 3. Task ID
Include the Task or Ticket ID in brackets at the end of the subject line (e.g., `[#123]`).
- If the task is from a specific system, use the prefix: `[#PROJ-123]`.
- If no ID is applicable (e.g., a typo fix), you may omit it.

---

## 📝 Examples

| Correct | Incorrect |
| :--- | :--- |
| `feat(farmer): add login screen [#10]` | `add login` |
| `fix(api): fix permit validation [#42]` | `fix bug` |
| `docs: update readme` | `update docs` |
| `refactor(backend): simplify auth logic [#15]` | `cleanup code` |

---

## 💡 Why Good Logs Matter

1. **Auditability:** LivestockPass is used for government permits. We need to know exactly when and why logic changes.
2. **Searchability:** Easily find when a feature was introduced or a bug was fixed using `git log --grep`.
3. **Collaboration:** Clear messages help the team understand your intent without reading every line of code.
4. **Automation:** Consistent formats allow for automated changelog generation and release notes.

---

## 🚀 Quick Tip
If you're using VS Code, consider installing the **"Conventional Commits"** extension to help you write these messages.
```

- [ ] **Step 2: Verify the file exists and is readable**

Run: `cat GIT_COMMIT_CONVENTIONS.md`

- [ ] **Step 3: Commit the new file**

```bash
git add GIT_COMMIT_CONVENTIONS.md
git commit -m "docs: add git commit conventions guide [#NONE]"
```
