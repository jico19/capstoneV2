# Git Commit Conventions Design Spec

**Date:** 2026-05-22
**Status:** Approved

## Goal
Establish a professional, consistent, and traceable commit history for the FarmPass project. This ensures that the Sariaya Municipal Agriculture Office has a clear audit trail and developers can easily navigate the codebase's evolution.

## Convention: Conventional Commits + IDs

### Header Format
`<type>(<scope>): <description> [#ID]`

- **Type:** Categorizes the change (feat, fix, docs, etc.).
- **Scope:** The area of the project affected (farmer, agri, backend, frontend, etc.).
- **Description:** A short, imperative-mood summary (e.g., "add permit validation").
- **ID:** The task or ticket ID in brackets (e.g., `[#42]`).

### Standard Scopes
- **Roles:** `farmer`, `agri`, `opv`, `inspector`
- **Technical:** `backend`, `frontend`, `db`, `ocr`, `api`
- **Global:** `docs`, `ci`, `deps`, `config`

### Example
`feat(agri): add payment verification logic [#102]`

## Comparison to Current State
Current logs are a mix of Conventional Commits and informal notes ("add", "ad"). This spec mandates the Conventional format for all future work.

## Integration
The rules defined here will be saved to `GIT_COMMIT_CONVENTIONS.md` in the project root for easy reference by the team.
