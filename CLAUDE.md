# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Electron app in dev mode with hot reload
npm run build        # Build for production
npm run typecheck    # Run TypeScript type checking
npm run preview      # Preview production build

# Environment setup
export ANTHROPIC_API_KEY=your_key_here  # Required for agent functionality
```

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
1. Add tool definition to `getTools()` in `src/main/agent/tools/index.ts`
2. Add execution logic to `executeToolCall()` switch statement
3. Update system prompt if needed to explain tool usage

### Modifying System Prompts
Edit `getSystemPrompt()` or `getModeSpecificPrompt()` in `src/main/agent/prompts.ts`. Remember: these prompts instruct the AI agent on how to generate CDN-compatible code.

### Adding New Prototype Modes
1. Add mode definition to `config/modes.yaml`
2. Add corresponding case to `getModeSpecificPrompt()` in `prompts.ts`
3. Mode affects agent behavior, mock data style, and default viewport

## Build Tool

Uses `electron-vite` which is a wrapper around Vite configured for Electron:
- Main process: Vite build with SSR transform (watch for template literal issues)
- Renderer: Standard Vite + React
- Preload: Separate Vite build with limited externals

Config: `electron.vite.config.ts` (if exists) or uses defaults.
