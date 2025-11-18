# Model Context Protocol (MCP) Setup Guide

This document explains how the Model Context Protocol (MCP) is configured in BitSleuth and how to use it with AI coding assistants.

## What is MCP?

Model Context Protocol (MCP) is a standard that enables AI coding assistants (like GitHub Copilot, Claude, Cursor) to interact directly with your running Next.js application. This provides:

- **Real-time diagnostics**: Access to build errors, runtime errors, and logs
- **Automated upgrades**: Run official Next.js codemod scripts
- **Context-aware assistance**: AI agents have access to page metadata, routes, and server actions
- **Enhanced debugging**: Live inspection of your application state
- **Development knowledge base**: Access to curated Next.js best practices

## Current Configuration

BitSleuth is configured with two MCP servers:

### 1. Chrome DevTools MCP
Provides browser automation and testing capabilities through Playwright.

### 2. Next.js DevTools MCP
Provides Next.js-specific development tooling and diagnostics.

## Configuration Files

### `.mcp.json`
This file at the project root configures the MCP servers:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    },
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

### `next.config.ts`
The experimental MCP server feature is enabled in the Next.js configuration:

```typescript
experimental: {
  mcpServer: true,
  // ... other experimental features
}
```

## Using MCP with AI Assistants

### Prerequisites
- Node.js v20.19+ (latest LTS recommended)
- Next.js 15+ (Next.js 16+ recommended for full features)
- An AI coding assistant that supports MCP (GitHub Copilot, Claude, Cursor, etc.)

### Starting the Development Server

1. Start the Next.js dev server:
```bash
npm run dev
```

2. You should see in the console output:
```
✓ mcpServer
```

This indicates the MCP server is enabled and running.

### Connecting Your AI Assistant

The MCP servers are automatically available to AI assistants that support the protocol. The configuration in `.mcp.json` tells your AI assistant how to connect to the servers.

For VS Code with GitHub Copilot or similar tools, the `.mcp.json` file at the project root is automatically discovered.

## Available MCP Tools

Once connected, AI assistants can use various tools:

### Next.js DevTools Commands
- `get_errors` - Retrieve build, runtime, and type errors
- `get_logs` - Access development logs and console output
- `get_page_metadata` - Get metadata about specific pages/components/routes
- `enable-cache-components` - Automate Cache Components setup
- Upgrade assistance - AI can help upgrade Next.js versions with automated codemods

### Chrome DevTools Commands
- Browser automation for testing
- Screenshot capture
- DOM inspection
- Network request analysis

## Testing the Setup

To verify MCP is working:

1. Start the dev server: `npm run dev`
2. Look for the MCP server confirmation in the console
3. Ask your AI assistant to query your Next.js application state
4. Try commands like "Show me the current build errors" or "What routes are available?"

## Troubleshooting

### MCP Server Not Starting
- Ensure you have Node.js 20.19+ installed
- Check that `.mcp.json` has valid JSON syntax
- Verify `next.config.ts` has `mcpServer: true` in the experimental section

### AI Assistant Can't Connect
- Ensure your AI assistant supports MCP
- Check that `.mcp.json` is in the project root
- Restart your IDE/editor after adding MCP configuration
- Verify the dev server is running

### "Unrecognized key" Warning
You may see a warning like:
```
⚠ Invalid next.config.ts options detected: 
⚠     Unrecognized key(s) in object: 'mcpServer' at "experimental"
```

This is expected for Next.js 15.x and can be safely ignored. The feature still works (you'll see `✓ mcpServer` in the experiments list).

## Additional Resources

- [Next.js MCP Server Documentation](https://nextjs.org/docs/app/guides/mcp)
- [next-devtools-mcp on npm](https://www.npmjs.com/package/next-devtools-mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## Notes

- MCP servers run using `npx` with the `-y` flag to auto-accept installation
- The `@latest` tag ensures you're always using the newest version
- MCP communication uses stdio protocol (not HTTP endpoints)
- No additional installation is required - the servers are invoked on-demand

---

**Last Updated**: November 2025  
**Next.js Version**: 15.5.6  
**MCP Version**: Latest
