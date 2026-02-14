# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Electron app in dev mode with hot reload
npm run build        # Build for production
npm run typecheck    # Run TypeScript type checking
npm run preview      # Preview production build

# Testing
npm run test:unit      # Main process unit tests (node env)
npm run test:renderer  # React component tests (jsdom env)
npm run test:e2e       # Playwright E2E tests (requires `npm run build` first)
npm run test:all       # Run unit + renderer + E2E tests sequentially
npm run test:watch     # Run tests in watch mode during development
npm run test:coverage  # Run tests with code coverage report

# Environment setup
export ANTHROPIC_API_KEY=your_key_here  # Required for agent functionality
```

## Testing Policy

**First step in every session: run all tests.** Before making any changes, run `npm run test:unit && npm run test:renderer` to establish a green baseline. If any tests fail, fix them before proceeding with new work. This ensures you are starting from a known-good state and can detect regressions caused by your changes.

**Tests are mandatory for every change.** All unit and renderer tests must pass before any code is considered complete. Run `npm run test:unit && npm run test:renderer` to verify.

### Test-Driven Development (TDD) for Features

When implementing a new feature, follow this workflow:

1. **Write failing tests first** — Create test cases that describe the expected behaviour of the feature before writing any implementation code.
2. **Implement the feature** — Write the minimum code needed to make the tests pass.
3. **Refactor** — Clean up the implementation while keeping all tests green.
4. **Run the full suite** — `npm run test:unit && npm run test:renderer` must pass with zero failures.

### Bug Fix Workflow

When fixing a reported bug, follow this workflow:

1. **Reproduce with a test** — Write a unit or component test that fails because of the bug. This proves the bug exists and defines the expected correct behaviour.
2. **Fix the bug** — Change the source code so the failing test passes.
3. **Verify no regressions** — Run `npm run test:unit && npm run test:renderer` to confirm all existing tests still pass.
4. **Keep the regression test** — The new test stays in the suite permanently to prevent the bug from returning.

### Test Structure

- **Main process tests** (`src/**/*.test.ts`) — Run with `vitest.config.ts` (node environment). Mock `electron` and `@anthropic-ai/sdk`.
- **Renderer tests** (`src/renderer/**/*.test.tsx`) — Run with `vitest.config.renderer.ts` (jsdom environment). Mock `window.electronAPI`.
- **E2E tests** (`e2e/**/*.e2e.test.ts`) — Playwright with Electron. Require a production build (`npm run build`).
- **Setup files**: `src/test-setup.ts` (electron mocks), `src/test-setup-renderer.ts` (electronAPI + jsdom polyfills).

### Key Testing Conventions

- Place test files next to their source files (e.g., `Foo.tsx` → `Foo.test.tsx`).
- Mock the Anthropic SDK with a real class constructor, not `vi.fn().mockImplementation()`.
- Use `waitFor()` for components that trigger async state updates on mount.
- Use `getAllByText` when multiple elements share the same text content.
- Use `getByAltText` (not `getByAlt`) for image alt text queries.
- Add `Element.prototype.scrollIntoView = vi.fn()` in jsdom setup (already in `test-setup-renderer.ts`).
- StaticServer tests share a single server instance to avoid port 3000 conflicts.

## Architecture Overview

UI Studio is an **Electron desktop app** that combines a chat interface with an AI coding agent (powered by Anthropic SDK) to generate interactive prototypes. The app uses a **static HTML + CDN preview system** instead of traditional build tools for generated prototypes.

### Three-Process Architecture

1. **Main Process** (`src/main/`)
   - Orchestrates the Anthropic API agent with custom tools
   - Manages project directories and file generation
   - Runs a simple Node.js HTTP static file server for previews
   - Handles IPC communication between renderer and services

2. **Renderer Process** (`src/renderer/`)
   - React + TypeScript UI with TailwindCSS
   - Chat interface (left panel) + iframe preview (right panel)
   - Communicates with main via IPC (preload bridge)

3. **Preload Script** (`src/preload/`)
   - Secure IPC bridge using `contextBridge`
   - Exposes `window.electronAPI` to renderer

### Key Data Flow

```
User types message → Renderer → IPC → Main Process
  → AgentService.sendMessage()
  → Anthropic API (with custom tools)
  → Agent calls write_file tool
  → Writes to prototypes/[project-id]/app.jsx
  → Sends stream updates back → Renderer
  → Preview iframe reloads → Shows updated prototype
```

## The Preview System (Critical for Code Generation)

Generated prototypes use a **CDN-based approach** with NO build step:

### What Gets Generated
Each prototype lives in `prototypes/[project-id]/` with just:
- `index.html` - Loads React, ReactDOM, Babel Standalone, and Tailwind from CDN
- `app.jsx` - Single-file app with all components (transpiled in-browser via Babel)

### Critical Constraints for Generated Code
The AI agent must follow these rules when writing `app.jsx`:
- **NO import statements** - React/ReactDOM are UMD globals (`window.React`, `window.ReactDOM`)
- **NO TypeScript** - Plain JSX only (Babel Standalone transpiles it)
- **NO npm packages** - Everything self-contained
- **NO export statements** - No `export default`, no module syntax
- **Must end with render call**: `ReactDOM.createRoot(document.getElementById("root")).render(<App />);`

### Routing for Multi-Page Prototypes
Hash-based routing using custom hooks (no React Router):
```jsx
function useHashRoute() {
  const [route, setRoute] = React.useState(window.location.hash.slice(1) || '/');
  React.useEffect(() => {
    const handler = () => setRoute(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}

function Link({ to, children, className }) {
  return <a href={`#${to}`} className={className}>{children}</a>;
}
```

### Static Server Implementation
`StaticServer.ts` runs a simple Node.js `http.createServer()` on port 3000:
- Serves files from `prototypes/[project-id]/`
- No Vite dev server, no HMR, no build process
- Falls back to `index.html` for SPA-style routing
- Kills stale processes on port using `lsof` before starting

## Agent System

### Agent Tools (`src/main/agent/tools/index.ts`)
- `write_file` - Write/update files in prototype (primarily `app.jsx`)
- `read_file` - Read existing files before modifying

**Important**: `sanitizeForCDN()` strips accidental import/export statements from agent output to prevent errors.

### Agent Service (`src/main/agent/AgentService.ts`)
- Implements **agentic loop**: keeps calling API until no tool_use blocks remain
- Uses Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- Streams responses back to renderer via IPC
- Maintains conversation history across turns
- Uses Claude Haiku 4.5 to auto-generate project names

### System Prompts (`src/main/agent/prompts.ts`)
Contains detailed instructions for the AI agent including:
- Runtime environment constraints (CDN globals)
- Routing patterns for multi-page apps
- Code quality expectations
- Mode-specific behaviors (rapid-prototype, mobile-first, data-heavy, presentation)

## Project Scaffolding

`ProjectManager.ts` creates new prototypes:
- Directory naming: `{slug}-{timestamp}` (e.g., `dashboard-app-2025-01-15-14-30-00`)
- Generates `index.html` with CDN script tags
- Creates placeholder `app.jsx` with welcome screen
- All prototypes go in `prototypes/` (git-ignored)

## Configuration

- Agent settings: `src/shared/constants.ts` (model, temperature, max_tokens)
- Prototype modes: `config/modes.yaml` (rapid-prototype, mobile-first, etc.)
- Preview port: Hardcoded to 3000 in `src/shared/constants.ts`

## IPC Communication

All IPC channels defined in `src/shared/types.ts` enum `IPCChannel`:
- `CHAT_SEND` / `CHAT_RECEIVE` / `CHAT_STREAM` - Chat messages
- `PREVIEW_RELOAD` / `PREVIEW_URL` - Preview updates
- `MODE_CHANGE` / `MODE_LIST` - Agent mode switching

Renderer accesses via `window.electronAPI` (exposed by preload script).

## electron-vite SSR Transform Issue

**Critical**: `electron-vite` builds the main process as SSR bundle. Its transform detects `import` inside template literals and corrupts them with CommonJS shims.

**Solution**: Use `[...].join('\n')` arrays instead of template literals when generating code templates that contain `import` statements. See `ProjectManager.ts` for examples.

## Common Patterns

### Adding New Agent Tools
1. **Write tests first** in `src/main/agent/tools/index.test.ts` — add cases for `getTools()` (verify the tool definition) and `executeToolCall()` (verify execution logic and edge cases).
2. Add tool definition to `getTools()` in `src/main/agent/tools/index.ts`.
3. Add execution logic to `executeToolCall()` switch statement.
4. Update system prompt if needed to explain tool usage.
5. Run `npm run test:unit` and verify all tests pass.

### Modifying System Prompts
1. **Write tests first** in `src/main/agent/prompts.test.ts` — assert on the new content that should appear in the prompt output.
2. Edit `getSystemPrompt()` or `getModeSpecificPrompt()` in `src/main/agent/prompts.ts`. Remember: these prompts instruct the AI agent on how to generate CDN-compatible code.
3. Run `npm run test:unit` and verify all tests pass.

### Adding New Prototype Modes
1. **Write a test first** in `src/main/agent/prompts.test.ts` — add a case under "mode-specific prompts" asserting the new mode's key instructions.
2. Add mode definition to `config/modes.yaml`.
3. Add corresponding case to `getModeSpecificPrompt()` in `prompts.ts`.
4. Mode affects agent behavior, mock data style, and default viewport.
5. Run `npm run test:unit` and verify all tests pass.

### Adding New React Components
1. **Write a test file** alongside the component (e.g., `NewComponent.test.tsx`).
2. Test rendering, user interactions, IPC listener registration/cleanup, and edge cases.
3. Mock `window.electronAPI` methods as needed (already available via `test-setup-renderer.ts`).
4. Run `npm run test:renderer` and verify all tests pass.

### Adding New IPC Channels
1. Add the channel to `IPCChannel` enum in `src/shared/types.ts`.
2. **Write tests** for both the main-process handler and the renderer-side consumer.
3. Update the preload bridge in `src/preload/index.ts`.
4. Run `npm run test:unit && npm run test:renderer` and verify all tests pass.

## Build Tool

Uses `electron-vite` which is a wrapper around Vite configured for Electron:
- Main process: Vite build with SSR transform (watch for template literal issues)
- Renderer: Standard Vite + React
- Preload: Separate Vite build with limited externals

Config: `electron.vite.config.ts` (if exists) or uses defaults.
