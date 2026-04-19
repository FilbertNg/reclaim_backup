# 🛠 Reclaim Project: Commit & Versioning Guide

Welcome to the Reclaim development team! To keep our codebase clean, our history readable, and our releases automated, we use a strict system for Git commits called **Conventional Commits**.

This guide explains how to write commits and how our automated versioning works.

PS from Filbert: Frontend team, inside .cz.toml, please remove # in lines 9 after creating packages.json please.
---

## 1. The Rule of Commits

Every commit must follow this exact template:
`type(scope): short description`

### The Types You Can Use
* **`feat`**: A new feature (e.g., adding a new page, a new API endpoint).
* **`fix`**: A bug fix.
* **`docs`**: Changes to documentation only (like editing this file).
* **`style`**: Formatting changes (spaces, commas, missing semicolons) that don't affect code logic.
* **`refactor`**: Changing code logic without adding a feature or fixing a bug.
* **`perf`**: A code change that improves performance.
* **`test`**: Adding or fixing tests.
* **`chore`**: Maintenance work, updating dependencies, or configuration changes.

### The Scope (Optional but Recommended)
The `(scope)` tells us what part of the app you touched.
* `(ui)` or `(frontend)`
* `(api)` or `(backend)`
* `(database)`

---

## 2. Examples of Good vs. Bad Commits

✅ **GOOD:**
* `feat(ui): add receipt upload button`
* `fix(api): resolve database timeout error`
* `chore: update python dependencies`
* `docs: update readme with setup instructions`

❌ **BAD (These will be rejected):**
* `added upload button` *(Missing type)*
* `Fix database` *(Capital letter, missing type)*
* `feat(ui): added upload button` *(Do not use past tense like "added". Use imperative mood like "add")*

---

## 3. How to Commit Your Code

You have two ways to commit code in this repository:

### Method A: The Standard Way
If you know the format, just use Git as usual. Our automated system (`pre-commit`) is watching in the background to make sure you formatted it correctly.

```bash
git add .
git commit -m "feat(api): add audit engine"
```
*(If you make a typo in the format, you will get an error message, and the commit will be aborted. Just try again!)*

### Method B: The Interactive Wizard (Recommended for Beginners)
If you can't remember the types or rules, you can use our interactive tool. Instead of typing `git commit`, type:

```bash
cz commit
```
This will open a wizard in your terminal that asks you:
1. What type of change are you making? (Select from a list)
2. What is the scope?
3. Write a short description.

It will then perfectly format and make the commit for you!

---

## 4. How Releases & Versioning Work

Reclaim uses **Unified Versioning**. This means our frontend and backend share the exact same version number (e.g., `v1.2.0`). 

You do **not** need to manually edit version numbers in `package.json` or `pyproject.toml`. The system does this for you based on the commits you wrote!

* If you wrote a `fix` commit, the system automatically bumps the Patch number (e.g., `1.0.0` → `1.0.1`).
* If you wrote a `feat` commit, the system automatically bumps the Minor number (e.g., `1.0.0` → `1.1.0`).

### Cutting a New Release
When we are ready to release a new version of Reclaim to production, **do not change the versions manually**.

Just go to the root folder (`/reclaim`) and run:

```bash
cz bump --changelog
```

**What this magical command does:**
1. It reads all our recent commits.
2. It calculates the correct new version number.
3. It safely updates `backend/pyproject.toml`, `backend/reclaim/__init__.py`, and `frontend/package.json` all at once.
4. It auto-generates a `CHANGELOG.md` file so we know exactly what is in this release.
5. It creates a Git tag (e.g., `v1.1.0`).

Finally, just push everything to GitHub:

```bash
git push && git push --tags
```