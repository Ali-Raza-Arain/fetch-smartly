# Contributing to fetch-smartly

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Fork and clone the repo
git clone https://github.com/<your-username>/fetch-smartly.git
cd fetch-smartly

# Install dependencies
npm install

# Run tests to verify setup
npm test

# Build the project
npm run build

# Type check
npm run lint
```

## How to Contribute

### Reporting Bugs

Use the [Bug Report](https://github.com/Ali-Raza-Arain/fetch-smartly/issues/new?template=bug_report.yml) template. Include:

- Package version and Node.js version
- Steps to reproduce
- Expected vs actual behavior

### Suggesting Features

Use the [Feature Request](https://github.com/Ali-Raza-Arain/fetch-smartly/issues/new?template=feature_request.yml) template.

### Submitting Code

1. **Check existing issues** — Look for open issues or create one before starting.
2. **Fork the repo** and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   # or
   git checkout -b fix/your-bugfix
   ```
3. **Write your code** following the guidelines below.
4. **Write or update tests** for your changes.
5. **Run checks** before committing:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
6. **Commit** with a clear message (see Commit Convention).
7. **Push** and open a Pull Request.

## Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feat/short-description` | `feat/add-new-adapter` |
| Bug fix | `fix/short-description` | `fix/edge-case-error` |
| Docs | `docs/short-description` | `docs/update-api-guide` |
| Refactor | `refactor/short-description` | `refactor/simplify-core` |

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: correct bug in module
docs: update configuration examples
test: add tests for edge case
refactor: simplify internal logic
chore: update dependencies
```

## Code Guidelines

- **TypeScript** — All source code in TypeScript. Maintain strict typing.
- **Tests** — Write tests using Vitest. Aim for coverage on new code.
- **No breaking changes** without discussion — Open an issue first.
- **Keep it focused** — One PR = one concern.
- **Document public APIs** — Add JSDoc comments for exported functions and types.

## Project Structure

```
src/            # Source code (TypeScript)
dist/           # Build output (do not edit)
docs/           # VitePress documentation site
tests/          # Test files
```

## Pull Request Process

1. Fill out the PR template completely.
2. Ensure all checks pass (tests, types, build).
3. Link the related issue (e.g., `Closes #12`).
4. Request a review from a maintainer.
5. Address review feedback with new commits (don't force-push).
6. A maintainer will merge once approved.

## First-Time Contributors

Look for issues labeled [`good first issue`](https://github.com/Ali-Raza-Arain/fetch-smartly/labels/good%20first%20issue).

## Code of Conduct

By contributing, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](https://opensource.org/licenses/MIT).

## Questions?

Open a [Question](https://github.com/Ali-Raza-Arain/fetch-smartly/issues/new?template=question.yml) issue. We're happy to help!
