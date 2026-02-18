# Contributing

Thanks for your interest in contributing to OpsTrails Track Event Action!

## Getting Started

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make your changes in `src/`

## Development

```bash
# Type-check
npm run typecheck

# Lint
npm run lint

# Fix lint and formatting issues
npm run lint:fix
npm run format

# Run tests
npm test

# Build the action (compiles to dist/)
npm run build
```

## Submitting Changes

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass: `npm run typecheck && npm run lint && npm test`
4. Rebuild the dist: `npm run build`
5. Commit both `src/` and `dist/` changes
6. Open a pull request against `main`

## Pull Request Guidelines

- Keep PRs focused on a single change
- Update the README if you add or change inputs/outputs
- Add tests for new functionality
- Follow the existing code style (enforced by ESLint and Prettier)

## Reporting Issues

- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) for bugs
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) for ideas
