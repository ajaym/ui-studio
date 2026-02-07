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

## Prerequisites

- **Node.js** v20 or higher
- **Anthropic API Key** - Get one at https://console.anthropic.com/settings/keys

## Installation

```bash
# Install dependencies
npm install

# Set your API key (Linux/Mac)
export ANTHROPIC_API_KEY=your_api_key_here

# Or on Windows (PowerShell)
$env:ANTHROPIC_API_KEY="your_api_key_here"

# Start development server
npm run dev
```

The app will open automatically. You should see:
- Chat interface on the left
- Preview panel on the right (initially empty)
- Type a message to start generating a prototype

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

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
- [ ] MCP integration for design systems
- [ ] Version history
- [ ] Export functionality
- [ ] Local network sharing

## License

MIT
