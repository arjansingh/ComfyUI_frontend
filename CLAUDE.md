# ComfyUI Frontend Project Guidelines

## Repository Setup

For first-time setup, use the Claude command:
```
/setup_repo
```
This bootstraps the monorepo with dependencies, builds, tests, and dev server verification.

**Prerequisites:** Node.js >= 18, Git repository, available ports (5173, 6006)

## Quick Commands

- `pnpm`: See all available commands
- `pnpm dev`: Start development server (port 5173, via nx)
- `pnpm typecheck`: Type checking
- `pnpm build`: Build for production (via nx)
- `pnpm lint`: Linting (via nx)
- `pnpm format`: Prettier formatting
- `pnpm test:component`: Run component tests with browser environment
- `pnpm test:unit`: Run all unit tests
- `pnpm test:browser`: Run E2E tests via Playwright
- `pnpm test:unit -- tests-ui/tests/example.test.ts`: Run single test file
- `pnpm storybook`: Start Storybook development server (port 6006)
- `pnpm knip`: Detect unused code and dependencies

## Monorepo Architecture

The project now uses **Nx** for build orchestration and task management:

- **Task Orchestration**: Commands like `dev`, `build`, `lint`, and `test:browser` run via Nx
- **Caching**: Nx provides intelligent caching for faster rebuilds
- **Configuration**: Managed through `nx.json` with plugins for ESLint, Storybook, Vite, and Playwright
- **Dependencies**: Nx handles dependency graph analysis and parallel execution

Key Nx features:
- Build target caching and incremental builds
- Parallel task execution across the monorepo
- Plugin-based architecture for different tools

## Development Workflow

1. **First-time setup**: Run `/setup_repo` Claude command
2. Make code changes
3. **Visual verification**: Run `/verify-visually` to test UI changes
4. **Add translations**: Run `/add-missing-i18n` for new i18n keys
5. Run tests (see subdirectory CLAUDE.md files)
6. Run typecheck, lint, format
7. Check README updates
8. Consider docs.comfy.org updates

## Claude Commands

The repository includes specialized Claude commands for common workflows:

- `/setup_repo`: Bootstrap monorepo with full verification
- `/verify-visually`: Systematic visual testing via screenshots
- `/add-missing-i18n`: Add English translations for new i18n keys
- `/pr`: Create pull requests with proper formatting
- `/comprehensive-pr-review`: Detailed code review process
- `/create-frontend-release`: Release management workflow
- `/create-hotfix-release`: Emergency release process

## Visual Testing

Use `/verify-visually` for UI change verification:

1. **Server Check**: Ensures dev server is running on port 5173
2. **Screenshot Analysis**: Captures and analyzes visual changes
3. **Quality Verification**: Checks layout, styling, responsiveness
4. **Issue Reporting**: Documents problems with severity levels

Critical for catching visual regressions and layout issues.

## Internationalization (i18n)

Use `/add-missing-i18n` for translation management:

1. **Key Detection**: Finds new `t()`, `st()`, `$t()` function calls
2. **English Translation**: Adds entries to `src/locales/en/main.json`
3. **Dot Notation Mapping**: Converts `g.user.name` to nested JSON structure
4. **Automated Workflow**: Other languages handled by `i18n.yaml` workflow

**Important**: Only modify English locale file manually.

## Git Conventions

- Use [prefix] format: [feat], [bugfix], [docs]
- Add "Fixes #n" to PR descriptions
- Never mention Claude/AI in commits

## External Resources

- PrimeVue docs: <https://primevue.org>
- ComfyUI docs: <https://docs.comfy.org>
- Electron: <https://www.electronjs.org/docs/latest/>
- Wiki: <https://deepwiki.com/Comfy-Org/ComfyUI_frontend/1-overview>

## Project Philosophy

- Clean, stable public APIs
- Domain-driven design
- Thousands of users and extensions
- Prioritize clean interfaces that restrict extension access

## Repository Navigation

- Check README files in key folders (tests-ui, browser_tests, composables, etc.)
- Prefer running single tests for performance
- Use --help for unfamiliar CLI tools
- Use `nx --help` to explore Nx commands and task orchestration

## Component Development

- **Storybook**: Run `pnpm storybook` for component documentation and testing
- **Component Tests**: Use `pnpm test:component` for isolated component testing
- **Visual Testing**: Use `/verify-visually` after UI changes
- **Stories**: Write component stories for documentation and visual regression testing

## Advanced Development Tools

- **Knip**: Run `pnpm knip` to detect unused code and dependencies
- **Schema Generation**: Use `pnpm json-schema` to generate TypeScript schemas
- **Electron Mode**: Use `pnpm dev:electron` for Electron development
- **Build Analysis**: Nx provides build caching and dependency analysis

## GitHub Integration

When referencing Comfy-Org repos:

1. Check for local copy
2. Use GitHub API for branches/PRs/metadata
3. Curl GitHub website if needed

## Common Pitfalls

- NEVER use `any` type - use proper TypeScript types
- NEVER use `as any` type assertions - fix the underlying type issue
- NEVER use `--no-verify` flag when committing
- NEVER delete or disable tests to make them pass
- NEVER circumvent quality checks
