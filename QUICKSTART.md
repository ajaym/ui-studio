# UI Studio - Quick Start Guide

## What's Been Built

UI Studio is now a functional Electron-based desktop application for AI-powered prototype generation. Here's what's been implemented:

### ✅ Completed Features

#### Phase 1: Core Infrastructure
- **Project Scaffolding** - Full TypeScript + Electron + React + Vite setup
- **Electron Shell** - Main process, renderer, and secure IPC bridge
- **UI Layout** - Split-pane interface with resizable chat and preview panels

#### Phase 2: Agent Integration
- **Agent Service** - Anthropic SDK integration with tool execution
- **Custom Tools** - File writing, page creation, mock data generation
- **Project Manager** - Automatic prototype project scaffolding
- **Preview Server** - Vite dev server for live prototypes

#### Phase 3: Chat Interface
- **Message Display** - Chat history with markdown rendering
- **File Upload** - Drag & drop image attachments
- **Streaming Support** - Real-time response display
- **Error Handling** - Graceful error messages

#### Phase 4: Preview Panel
- **Live Preview** - Embedded iframe with hot reload
- **Viewport Controls** - Mobile, tablet, desktop views
- **Loading States** - Visual feedback during generation

#### Configuration
- **Modes** - 4 pre-configured prototype modes (rapid, mobile-first, data-heavy, presentation)
- **MCP Servers** - Configuration for design system integration
- **Mock Components** - 10+ design system components catalog

## Getting Started

### 1. Prerequisites

- **Node.js v20+** - [Download here](https://nodejs.org/)
- **Anthropic API Key** - [Get one here](https://console.anthropic.com/)

### 2. Installation

```bash
# Navigate to the project
cd /Users/ajaym/Documents/code/ui-studio

# Dependencies are already installed
# If you need to reinstall:
# npm install

# Set your API key
export ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Run the App

```bash
npm run dev
```

The Electron app will launch with:
- Chat interface on the left
- Preview panel on the right
- Mode selector (coming soon)

### 4. Try It Out

**First prompt example:**
```
Create a dashboard with user statistics cards showing:
- Total users
- Active sessions
- Revenue this month
- Growth percentage

Add a table of recent users below the stats.
```

**What happens:**
1. Agent analyzes your request
2. Creates a new prototype project in `prototypes/[id]/`
3. Installs dependencies
4. Generates React components using tools
5. Starts Vite dev server
6. Shows live preview in right panel

**Iterate with follow-ups:**
```
Add a dark mode toggle button in the top right
```

```
Make the stats cards have colored backgrounds
```

## Project Structure

```
ui-studio/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts          # App entry, IPC setup
│   │   ├── agent/            # Agent SDK integration
│   │   │   ├── AgentService.ts
│   │   │   ├── prompts.ts
│   │   │   └── tools/
│   │   ├── project/          # Project management
│   │   │   └── ProjectManager.ts
│   │   └── preview/          # Preview server
│   │       └── PreviewServer.ts
│   │
│   ├── renderer/             # React UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatPanel/
│   │   │   ├── PreviewPanel/
│   │   │   └── Layout/
│   │   └── hooks/
│   │
│   ├── preload/              # IPC bridge
│   │   └── index.ts
│   │
│   └── shared/               # Shared types
│       ├── types.ts
│       └── constants.ts
│
├── config/                   # Configuration
│   ├── modes.yaml
│   ├── mcp-servers.json
│   └── agent-config.json
│
├── mcp-server/              # Mock design system
│   ├── components.json
│   └── README.md
│
└── prototypes/              # Generated prototypes (git-ignored)
    └── [project-id]/
```

## How It Works

### 1. Chat Message Flow

```
User types message
  → Renderer sends via IPC
  → Main process receives
  → Creates project (if first message)
  → Starts preview server
  → Sends to Agent Service
  → Agent analyzes and uses tools
  → Tools write files to prototype/
  → Agent responds with explanation
  → Main sends response back to renderer
  → Vite dev server auto-reloads
  → Preview updates
```

### 2. Tool Execution

The agent has access to these tools:

- **write_file** - Create/update any file in the prototype
- **read_file** - Read existing files
- **create_page** - Add new pages with routing
- **generate_mock_data** - Create realistic mock data

### 3. Generated Prototypes

Each prototype is a complete React + TypeScript + Vite project:

```
prototypes/abc123/
├── package.json          # React, Router, Tailwind
├── vite.config.ts        # Dev server config
├── tsconfig.json         # TypeScript config
├── tailwind.config.js    # Tailwind config
├── index.html
└── src/
    ├── main.tsx          # Entry point
    ├── App.tsx           # Main app component
    ├── index.css         # Global styles
    ├── pages/            # Generated pages
    ├── components/       # Generated components
    └── mockData.ts       # Generated mock data
```

## What's Next

### Immediate Next Steps

1. **Test the basic UI** - Run `npm run dev` to see the interface
2. **Add API key** - Set `ANTHROPIC_API_KEY` to enable agent
3. **Try generating** - Send a chat message to create a prototype
4. **Iterate** - Refine the prototype with follow-up messages

### Features to Add (See Plan)

- **MCP Integration** - Connect to real design system servers
- **Mode Switching** - UI for changing prototype modes
- **Version History** - Time travel through iterations
- **Export** - Bundle prototypes for sharing
- **Network Sharing** - Share previews on local network

## Troubleshooting

### App won't start
- Check Node.js version: `node --version` (need v20+)
- Reinstall dependencies: `rm -rf node_modules && npm install`

### No preview shows
- Check console for errors
- Verify preview server started (should see "localhost:3000" in logs)
- Check `prototypes/` directory was created

### Agent doesn't respond
- Verify `ANTHROPIC_API_KEY` is set: `echo $ANTHROPIC_API_KEY`
- Check main process logs in terminal
- Look for API errors

### Preview shows blank page
- Check browser console in preview iframe
- Verify files were generated in `prototypes/[id]/src/`
- Try manual refresh button

## Development Commands

```bash
# Start development (hot reload)
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture Highlights

### Secure IPC
- Uses Electron's `contextBridge` API
- No direct Node.js access from renderer
- All agent operations in main process

### Agentic Tool Loop
- Agent can use multiple tools per turn
- Results feed back into next request
- Continues until natural completion
- Max 10 loops to prevent infinite cycles

### Live Preview
- Separate Vite dev server per project
- File watching with hot module reload
- Iframe isolation for safety
- Configurable viewport sizes

## Tips for Testing

### Start Simple
```
Create a simple counter app with increment and decrement buttons
```

### Test Multimodal
1. Take a screenshot of any UI
2. Attach via paperclip icon
3. Say: "Build this interface"

### Iterate Quickly
```
First: "Create a todo list app"
Then: "Add a filter for completed items"
Then: "Style it with a gradient background"
```

### Try Different Modes (in config)
- **rapid-prototype** - Fast, minimal data
- **mobile-first** - Mobile layouts
- **data-heavy** - Rich datasets
- **presentation** - High polish

## Support

- **Issues**: File in GitHub repo
- **Docs**: See README.md for full documentation
- **Plan**: See original implementation plan for roadmap

---

**Ready to build?** Run `npm run dev` and start chatting! 🚀
