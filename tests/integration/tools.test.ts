import { describe, expect, test, beforeAll } from "bun:test";
import {
  decideGeminiCliCommand,
  executeGeminiCli,
  executeGoogleSearch,
  executeGeminiChat,
} from "../../index.ts";

// Check if gemini-cli is available
let isGeminiCliAvailable = false;

beforeAll(async () => {
  try {
    await decideGeminiCliCommand(false);
    isGeminiCliAvailable = true;
  } catch {
    isGeminiCliAvailable = false;
  }
});

describe("MCP Gemini CLI Integration Tests", () => {
  describe("gemini-cli detection", () => {
    test("decideGeminiCliCommand finds gemini-cli or falls back correctly", async () => {
      try {
        // Test without npx fallback
        const cmdWithoutNpx = await decideGeminiCliCommand(false);
        expect(cmdWithoutNpx.command).toBe("gemini");
        expect(cmdWithoutNpx.initialArgs).toEqual([]);
      } catch (error) {
        // If gemini-cli is not installed, it should throw the expected error
        expect(error instanceof Error && error.message).toContain(
          "gemini not found globally",
        );
      }

      // Test with npx fallback
      const cmdWithNpx = await decideGeminiCliCommand(true);
      expect(cmdWithNpx.command).toBeOneOf(["gemini", "npx"]);
      if (cmdWithNpx.command === "npx") {
        expect(cmdWithNpx.initialArgs).toEqual([
          "https://github.com/google-gemini/gemini-cli",
        ]);
      }
    });

    test("executeGeminiCli handles errors correctly", async () => {
      try {
        // Try to execute a command that will likely fail
        const result = await executeGeminiCli(
          { command: "gemini", initialArgs: [] },
          ["--invalid-flag-that-does-not-exist"],
        );
        // If it somehow succeeds, check that we got a string
        expect(typeof result).toBe("string");
      } catch (error) {
        // This is expected to fail
        expect(error).toBeInstanceOf(Error);
        expect(error instanceof Error && error.message).toMatch(
          /gemini exited with code|Executable not found/,
        );
      }
    });
  });

  describe("tool execution", () => {
    test.if(isGeminiCliAvailable)(
      "googleSearchTool executes without error",
      async () => {
        const result = await executeGoogleSearch({
          query: "test search",
          limit: 3,
          raw: true,
          sandbox: true,
          yolo: true, // Auto-accept to avoid hanging
          model: "gemini-2.5-flash",
        });

        // Check that we got some result
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      },
      30000,
    ); // 30 second timeout

    test.if(isGeminiCliAvailable)(
      "chatTool executes without error",
      async () => {
        const result = await executeGeminiChat({
          prompt: "Say hello",
          sandbox: true,
          yolo: true, // Auto-accept to avoid hanging
          model: "gemini-2.5-flash",
        });

        // Check that we got a response
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      },
      30000,
    ); // 30 second timeout

    if (!isGeminiCliAvailable) {
      test("gemini-cli not available", () => {
        expect(true).toBe(true);
      });
    }
  });
});
