# UI Studio

AI-powered prototype generator using your design system.

## Overview

UI Studio is an Electron-based desktop application that enables designers and PMs to rapidly create interactive prototypes using their organization's design system. The tool uses the Anthropic SDK to power an AI coding agent that generates and iterates on prototypes through a chat interface, with live preview capabilities.

## Features

- 🤖 **AI-Powered Generation** - Describe UIs in natural language and get instant prototypes
- 🖼️ **Multimodal Input** - Upload screenshots or wireframes to guide generation
- 🔄 **Iterative Refinement** - Refine prototypes through conversation
- 👁️ **Live Preview** - See changes instantly in an embedded preview panel
- 📱 **Multi-Device** - Preview in mobile, tablet, or desktop viewports
- 🎨 **Design System Integration** - Uses your organization's design system via MCP
- 📄 **Multi-Page Support** - Generate complex, multi-page prototypes with navigation

## Download

Pre-built binaries are available on the [Releases](../../releases) page:

| Platform | File | Notes |
|----------|------|-------|
| macOS (Apple Silicon) | `UI Studio-<version>-arm64.dmg` | Requires macOS 12+ |
| Windows | `UI Studio-Setup-<version>.exe` | 64-bit installer |
| Linux | `UI Studio-<version>.AppImage` | Portable, no install needed |

> **New to this?** See the step-by-step [Installation Guide](INSTALL.md) for detailed instructions.

## Prerequisites

- **Anthropic API Key** - Get one at https://console.anthropic.com/settings/keys

## Quick Start (from download)

1. Download the file for your platform from [Releases](../../releases)
2. Open/install the app (see [INSTALL.md](INSTALL.md) for detailed steps)
3. Set your API key as an environment variable before launching, or place a `.env` file in the app's data directory:

```bash
# macOS / Linux — set before launching
export ANTHROPIC_API_KEY=your_api_key_here

# Or create a .env file (macOS example):
echo "ANTHROPIC_API_KEY=your_api_key_here" > ~/Library/Application\ Support/UI\ Studio/.env
```

4. Launch UI Studio and start describing your UI in the chat panel

## Development Setup

If you want to run from source or contribute:

**Prerequisites:** Node.js v20+

```bash
# Install dependencies
npm install

# Set your API key
export ANTHROPIC_API_KEY=your_api_key_here

# Start development server with hot reload
npm run dev
```

## Building Distributables

```bash
# Build for your current platform
npm run dist

# Platform-specific builds
npm run dist:mac      # macOS .dmg (arm64)
npm run dist:win      # Windows .exe (NSIS installer)
npm run dist:linux    # Linux .AppImage

# Quick test build (unpacked, no installer)
npm run pack

# Type check only
npm run typecheck
```

Build output goes to the `dist/` directory.

## Project Structure

```
ui-studio/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # React UI
│   ├── preload/           # Electron preload scripts
│   └── shared/            # Shared types and utilities
├── prototypes/            # Generated prototypes (git-ignored)
└── config/                # Configuration files
```

## Configuration

Agent settings (model, temperature, max tokens) are defined in `src/shared/constants.ts`.

Prototype modes are configured in `config/modes.yaml`.

## Usage

1. **Launch the app** - The main window shows a chat interface on the left and preview panel on the right

2. **Describe your UI** - Type a natural language description:
   - "Create a dashboard with user stats and recent activity"
   - "Build a settings page with form inputs"

3. **Add images** - Click the attachment button to upload screenshots or wireframes

4. **Iterate** - Continue chatting to refine the prototype:
   - "Make the header sticky"
   - "Add a dark mode toggle"
   - "Change the layout to use a sidebar"

5. **Preview** - The preview panel updates automatically as the agent generates code

6. **Switch viewports** - Toggle between mobile, tablet, and desktop views

## Architecture

- **Electron** - Desktop application shell
- **React + TypeScript** - UI layer
- **Anthropic SDK** - Agent orchestration
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Model Context Protocol (MCP)** - Design system integration

## Roadmap

- [x] Chat interface with multimodal input
- [x] Live preview panel with viewport controls
- [x] Agent integration (Anthropic SDK)
- [x] Custom agent tools (write_file, create_page, mock data)
- [x] Multi-page support with auto-routing
- [x] Configurable modes (rapid, mobile-first, data-heavy, presentation)
- [x] Downloadable executables (electron-builder)
- [ ] In-app API key settings screen
- [ ] MCP integration for design systems
- [ ] Version history
- [ ] Export functionality
- [ ] Local network sharing

## License

MIT
