import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn } from "node:child_process";
import { z } from "zod";
import { extname } from "node:path";

// Function to determine the gemini-cli command and its initial arguments
export async function decideGeminiCliCommand(
  allowNpx: boolean,
): Promise<{ command: string; initialArgs: string[] }> {
  return new Promise((resolve, reject) => {
    const child = spawn("which", ["gemini"]);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ command: "gemini", initialArgs: [] });
      } else if (allowNpx) {
        resolve({
          command: "npx",
          initialArgs: ["https://github.com/google-gemini/gemini-cli"],
        });
      } else {
        reject(
          new Error(
            "gemini not found globally and --allow-npx option not specified.",
          ),
        );
      }
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
}

// Function to execute gemini-cli command
export async function executeGeminiCli(
  geminiCliCommand: { command: string; initialArgs: string[] },
  args: string[],
): Promise<string> {
  const { command, initialArgs } = geminiCliCommand;
  const commandArgs = [...initialArgs, ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    // Close stdin immediately since we're not sending any input
    child.stdin.end();

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`gemini exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

// Zod schema for googleSearch tool parameters
export const GoogleSearchParametersSchema = z.object({
  query: z.string().describe("The search query."),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return (optional)."),
  raw: z
    .boolean()
    .optional()
    .describe("Return raw search results with URLs and snippets (optional)."),
  sandbox: z.boolean().optional().describe("Run gemini-cli in sandbox mode."),
  yolo: z
    .boolean()
    .optional()
    .describe("Automatically accept all actions (aka YOLO mode)."),
  model: z
    .string()
    .optional()
    .describe(
      'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
    ),
});

// Zod schema for geminiChat tool parameters
export const GeminiChatParametersSchema = z.object({
  prompt: z.string().describe("The prompt for the chat conversation."),
  sandbox: z.boolean().optional().describe("Run gemini-cli in sandbox mode."),
  yolo: z
    .boolean()
    .optional()
    .describe("Automatically accept all actions (aka YOLO mode)."),
  model: z
    .string()
    .optional()
    .describe(
      'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
    ),
});

// Zod schema for geminiAnalyzeFile tool parameters
export const GeminiAnalyzeFileParametersSchema = z.object({
  filePath: z.string().describe("The absolute path to the file to analyze."),
  prompt: z
    .string()
    .optional()
    .describe(
      "Additional instructions for analyzing the file. If not provided, Gemini will provide a general analysis.",
    ),
  sandbox: z.boolean().optional().describe("Run gemini-cli in sandbox mode."),
  yolo: z
    .boolean()
    .optional()
    .describe("Automatically accept all actions (aka YOLO mode)."),
  model: z
    .string()
    .optional()
    .describe(
      'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
    ),
});

// Extracted tool execution functions for testing
export async function executeGoogleSearch(args: unknown, allowNpx = false) {
  const parsedArgs = GoogleSearchParametersSchema.parse(args);
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  // Build prompt based on options
  let prompt: string;

  if (parsedArgs.raw) {
    // Structured grounding metadata format
    const limitText = parsedArgs.limit
      ? `\nLimit to ${parsedArgs.limit} sources.`
      : "";
    prompt = `Search for: "${parsedArgs.query}" and return the results in the following JSON format:
{
  "${parsedArgs.query}": {
    "summary": "Brief summary of findings",
    "groundingMetadata": {
      "searchQueries": ["list of search queries used"],
      "sources": [
        {
          "url": "source URL",
          "title": "source domain/title",
          "relevantExcerpts": ["key excerpts from this source"]
        }
      ]
    }
  }
}${limitText}`;
  } else {
    // Natural language search
    prompt = `Search for: ${parsedArgs.query}`;
    if (parsedArgs.limit) {
      prompt += ` (return up to ${parsedArgs.limit} results)`;
    }
  }

  const cliArgs = ["-p", prompt];

  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  if (parsedArgs.model) {
    cliArgs.push("-m", parsedArgs.model);
  }

  // Return raw result without parsing - let the client handle it
  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

export async function executeGeminiChat(args: unknown, allowNpx = false) {
  const parsedArgs = GeminiChatParametersSchema.parse(args);
  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);
  const cliArgs = ["-p", parsedArgs.prompt];
  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  if (parsedArgs.model) {
    cliArgs.push("-m", parsedArgs.model);
  }
  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

// Supported file extensions for geminiAnalyzeFile
const SUPPORTED_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
];
const SUPPORTED_TEXT_EXTENSIONS = [".txt", ".md", ".text"];
const SUPPORTED_DOCUMENT_EXTENSIONS = [".pdf"];
const SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_TEXT_EXTENSIONS,
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
];

export async function executeGeminiAnalyzeFile(
  args: unknown,
  allowNpx = false,
) {
  const parsedArgs = GeminiAnalyzeFileParametersSchema.parse(args);

  // Check if file extension is supported
  const fileExtension = extname(parsedArgs.filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
    throw new Error(
      `Unsupported file type: ${fileExtension}. Supported types are:\n` +
        `Images: ${SUPPORTED_IMAGE_EXTENSIONS.join(", ")}\n` +
        `Text: ${SUPPORTED_TEXT_EXTENSIONS.join(", ")}\n` +
        `Documents: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}`,
    );
  }

  const geminiCliCmd = await decideGeminiCliCommand(allowNpx);

  // Build the prompt with file path
  let fullPrompt = `Analyze this file: ${parsedArgs.filePath}`;
  if (parsedArgs.prompt) {
    fullPrompt += `\n\n${parsedArgs.prompt}`;
  }

  const cliArgs = ["-p", fullPrompt];
  if (parsedArgs.sandbox) {
    cliArgs.push("-s");
  }
  if (parsedArgs.yolo) {
    cliArgs.push("-y");
  }
  if (parsedArgs.model) {
    cliArgs.push("-m", parsedArgs.model);
  }

  const result = await executeGeminiCli(geminiCliCmd, cliArgs);
  return result;
}

async function main() {
  // Check for --allow-npx argument
  const allowNpx = process.argv.includes("--allow-npx");

  // Check if gemini-cli is available at startup
  try {
    await decideGeminiCliCommand(allowNpx);
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(
      "Please install gemini-cli globally or use --allow-npx option.",
    );
    process.exit(1);
  }

  const server = new McpServer({
    name: "mcp-gemini-cli",
    version: "0.2.0",
  });

  // Register googleSearch tool
  server.registerTool(
    "googleSearch",
    {
      description:
        "Performs a Google search using gemini-cli and returns structured results.",
      inputSchema: {
        query: z.string().describe("The search query."),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of results to return (optional)."),
        raw: z
          .boolean()
          .optional()
          .describe(
            "Return raw search results with URLs and snippets (optional).",
          ),
        sandbox: z
          .boolean()
          .optional()
          .describe("Run gemini-cli in sandbox mode."),
        yolo: z
          .boolean()
          .optional()
          .describe("Automatically accept all actions (aka YOLO mode)."),
        model: z
          .string()
          .optional()
          .describe(
            'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
          ),
      },
    },
    async (args) => {
      const result = await executeGoogleSearch(args, allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Register geminiChat tool
  server.registerTool(
    "geminiChat",
    {
      description: "Engages in a chat conversation with gemini-cli.",
      inputSchema: {
        prompt: z.string().describe("The prompt for the chat conversation."),
        sandbox: z
          .boolean()
          .optional()
          .describe("Run gemini-cli in sandbox mode."),
        yolo: z
          .boolean()
          .optional()
          .describe("Automatically accept all actions (aka YOLO mode)."),
        model: z
          .string()
          .optional()
          .describe(
            'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
          ),
      },
    },
    async (args) => {
      const result = await executeGeminiChat(args, allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Register geminiAnalyzeFile tool
  server.registerTool(
    "geminiAnalyzeFile",
    {
      description:
        "Analyzes files using gemini-cli. Supported file types: Images (.png, .jpg, .jpeg, .gif, .webp, .svg, .bmp), Text (.txt, .md, .text), Documents (.pdf)",
      inputSchema: {
        filePath: z
          .string()
          .describe(
            "The absolute path to the file to analyze. Supported: .png, .jpg, .jpeg, .gif, .webp, .svg, .bmp, .pdf, .txt, .md, .text",
          ),
        prompt: z
          .string()
          .optional()
          .describe(
            "Additional instructions for analyzing the file. If not provided, Gemini will provide a general analysis.",
          ),
        sandbox: z
          .boolean()
          .optional()
          .describe("Run gemini-cli in sandbox mode."),
        yolo: z
          .boolean()
          .optional()
          .describe("Automatically accept all actions (aka YOLO mode)."),
        model: z
          .string()
          .optional()
          .describe(
            'The Gemini model to use. Recommended: "gemini-2.5-pro" (default) or "gemini-2.5-flash". Both models are confirmed to work with Google login.',
          ),
      },
    },
    async (args) => {
      const result = await executeGeminiAnalyzeFile(args, allowNpx);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );

  // Connect the server to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run main if this file is being executed directly
if (import.meta.main) {
  main().catch(console.error);
}
