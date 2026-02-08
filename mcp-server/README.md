# Mock Design System MCP Server

A simple Model Context Protocol (MCP) server that provides a mock design system component catalog for testing UI Studio.

## Overview

This MCP server exposes a catalog of common UI components including:

- **Actions**: Button
- **Layout**: Card
- **Forms**: Input, Select
- **Data Display**: Table, Badge, Avatar
- **Navigation**: Navbar, Sidebar
- **Overlay**: Modal

## Usage

The AI agent in UI Studio can query this server to understand what design system components are available and how to use them.

## Installation

```bash
cd mcp-server
npm install
```

## Running

```bash
npm start
```

## Integration with UI Studio

This MCP server is automatically configured in `config/mcp-servers.json`. When UI Studio starts, it can connect to this server to access the component catalog.

## Customization

To customize the component catalog, edit `components.json` and add your own components following the same structure:

```json
{
  "ComponentName": {
    "description": "Component description",
    "category": "Category",
    "props": {
      "propName": {
        "type": "string|boolean|enum|array|function",
        "values": ["for", "enum", "types"],
        "default": "defaultValue",
        "required": true
      }
    },
    "example": "<ComponentName prop=\"value\">Content</ComponentName>"
  }
}
```

## Future Enhancements

- Add real design system integration
- Support for component variants and themes
- Live component preview
- Component usage analytics
