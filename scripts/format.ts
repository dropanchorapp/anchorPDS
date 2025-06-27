#!/usr/bin/env -S deno run --allow-read --allow-write

// Format script for Anchor PDS
// Usage: deno run --allow-read --allow-write scripts/format.ts [options]

import { parseArgs } from "https://deno.land/std@0.208.0/cli/parse_args.ts";

const args = parseArgs(Deno.args, {
  boolean: ["help", "check"],
  alias: {
    h: "help",
    c: "check",
  },
});

if (args.help) {
  console.log(`
Anchor PDS Code Formatter

Usage: deno run --allow-read --allow-write scripts/format.ts [options]

Options:
  -h, --help    Show this help message
  -c, --check   Check formatting without making changes

Examples:
  scripts/format.ts          # Format all TypeScript files
  scripts/format.ts --check  # Check formatting only
`);
  Deno.exit(0);
}

// Build the deno fmt command
const cmd = ["deno", "fmt"];

if (args.check) {
  cmd.push("--check");
}

// Add directories to format
cmd.push("backend/", "shared/", "test/", "scripts/");

console.log("🎨 Formatting TypeScript files...");
console.log(`Command: ${cmd.join(" ")}\n`);

// Run the formatter
const process = new Deno.Command(cmd[0], {
  args: cmd.slice(1),
  stdout: "inherit",
  stderr: "inherit",
});

const { code } = await process.output();

if (code === 0) {
  if (args.check) {
    console.log("\n✅ All files are properly formatted!");
  } else {
    console.log("\n✅ Formatting complete!");
  }
} else {
  if (args.check) {
    console.log("\n❌ Some files need formatting!");
  } else {
    console.log("\n❌ Formatting failed!");
  }
}

Deno.exit(code);
