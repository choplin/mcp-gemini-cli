# MCP Gemini CLI

A simple MCP server wrapper for Google's Gemini CLI that enables AI assistants to use Gemini's capabilities through the Model Context Protocol.

## What it does

This server exposes three tools that interact with Gemini CLI:

- `googleSearch`: Asks Gemini to perform a Google search using your query
- `chat`: Sends prompts directly to Gemini for general conversations
- `analyzeFile`: Analyzes files (images, PDFs, text) using Gemini's multimodal capabilities

## Prerequisites

- [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed and configured (optional with --allow-npx flag)

## 🚀 Quick Start with Claude Code

### 1. Add the MCP server

```bash
claude mcp add -s project gemini-cli -- npx @choplin/mcp-gemini-cli --allow-npx
```

Or configure your MCP client with the settings shown in the Installation Options section below.

### 2. Try it out

Example prompts:

- **Search**: "Search for the latest TypeScript 5.0 features using Google"
- **Chat**: "Ask Gemini to explain the difference between async/await and promises in JavaScript"
- **File Analysis**: "Ask Gemini to analyze the image at /path/to/screenshot.png"

## 🔧 Installation Options

### Using npx with --allow-npx flag

```json
{
  "mcpServers": {
    "mcp-gemini-cli": {
      "command": "npx",
      "args": ["@choplin/mcp-gemini-cli", "--allow-npx"]
    }
  }
}
```

### Local Development

1. Clone and install:

```bash
git clone https://github.com/choplin/mcp-gemini-cli
cd mcp-gemini-cli
bun install
```

1. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "mcp-gemini-cli": {
      "command": "bun",
      "args": ["run", "/path/to/mcp-gemini-cli/index.ts"]
    }
  }
}
```

## 🛠️ Available Tools

### 1. googleSearch

Performs a Google search using Gemini CLI.

**Parameters:**

- `query` (required): The search query
- `limit` (optional): Maximum number of results
- `sandbox` (optional): Run in sandbox mode
- `yolo` (optional): Skip confirmations
- `model` (optional): Gemini model to use (default: "gemini-2.5-pro")

### 2. chat

Have a conversation with Gemini.

**Parameters:**

- `prompt` (required): The conversation prompt
- `sandbox` (optional): Run in sandbox mode
- `yolo` (optional): Skip confirmations
- `model` (optional): Gemini model to use (default: "gemini-2.5-pro")

### 3. analyzeFile

Analyze files using Gemini's multimodal capabilities.

**Supported file types:**

- **Images**: PNG, JPG, JPEG, GIF, WEBP, SVG, BMP
- **Text**: TXT, MD, TEXT
- **Documents**: PDF

**Parameters:**

- `filePath` (required): The absolute path to the file to analyze
- `prompt` (optional): Additional instructions for analyzing the file
- `sandbox` (optional): Run in sandbox mode
- `yolo` (optional): Skip confirmations
- `model` (optional): Gemini model to use (default: "gemini-2.5-pro")

## 💡 Example Prompts

Try these prompts to see mcp-gemini-cli in action:

- **Search**: "Search for the latest TypeScript 5.0 features using Google"
- **Chat**: "Ask Gemini to explain the difference between async/await and promises in JavaScript"
- **File Analysis**: "Ask Gemini to describe what's in this image: /Users/me/Desktop/screenshot.png"

## 🛠️ Example Usage

### googleSearch

```typescript
// Simple search
googleSearch({ query: "latest AI news" });

// Search with limit
googleSearch({
  query: "TypeScript best practices",
  limit: 5,
});
```

### chat

```typescript
// Simple chat
chat({ prompt: "Explain quantum computing in simple terms" });

// Using a different model
chat({
  prompt: "Write a haiku about programming",
  model: "gemini-2.5-flash",
});
```

### analyzeFile

```typescript
// Analyze an image
analyzeFile({ 
  filePath: "/path/to/image.png",
  prompt: "What objects are in this image?"
});

// Analyze a PDF
analyzeFile({
  filePath: "/path/to/document.pdf",
  prompt: "Summarize the key points in this document"
});

// General analysis without specific instructions
analyzeFile({ filePath: "/path/to/file.jpg" });
```

## 📝 Development

> **Note**: Development requires [Bun](https://bun.sh) runtime.

### Run in Development Mode

```bash
bun run dev
```

### Run Tests

```bash
bun test
```

### Build for Production

```bash
# Development build
bun run build

# Production build (minified)
bun run build:prod
```

### Linting & Formatting

```bash
# Lint code
bun run lint

# Format code
bun run format
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related Links

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Bun Runtime](https://bun.sh)
