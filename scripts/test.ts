#!/usr/bin/env -S deno run --allow-net --allow-env

// Test runner script for Anchor PDS
// Usage: deno run --allow-net --allow-env scripts/test.ts [options]

import { parseArgs } from "https://deno.land/std@0.208.0/cli/parse_args.ts";

const args = parseArgs(Deno.args, {
  boolean: ["help", "coverage", "watch", "quiet"],
  string: ["filter"],
  alias: {
    h: "help",
    c: "coverage",
    w: "watch",
    q: "quiet",
    f: "filter",
  },
});

if (args.help) {
  console.log(`
Anchor PDS Test Runner

Usage: deno run --allow-net --allow-env scripts/test.ts [options]

Options:
  -h, --help       Show this help message
  -c, --coverage   Run tests with coverage report
  -w, --watch      Run tests in watch mode
  -q, --quiet      Run tests in quiet mode
  -f, --filter     Filter tests by name pattern

Examples:
  scripts/test.ts                    # Run all tests
  scripts/test.ts --coverage         # Run with coverage
  scripts/test.ts --filter validation # Run only validation tests
  scripts/test.ts --watch            # Run in watch mode
`);
  Deno.exit(0);
}

// Build the deno test command
const cmd = ["deno", "test", "--allow-net", "--allow-env"];

if (args.coverage) {
  cmd.push("--coverage=coverage");
}

if (args.watch) {
  cmd.push("--watch");
}

if (args.quiet) {
  cmd.push("--quiet");
}

if (args.filter) {
  cmd.push("--filter", args.filter);
}

// Add test directory
cmd.push("test/");

console.log("🧪 Running Anchor PDS Tests...");
console.log(`Command: ${cmd.join(" ")}\n`);

// Run the tests
const process = new Deno.Command(cmd[0], {
  args: cmd.slice(1),
  stdout: "inherit",
  stderr: "inherit",
});

const { code } = await process.output();

if (args.coverage && code === 0) {
  console.log("\n📊 Generating coverage report...");
  const coverageProcess = new Deno.Command("deno", {
    args: ["coverage", "coverage"],
    stdout: "inherit",
    stderr: "inherit",
  });

  await coverageProcess.output();
}

if (code === 0) {
  console.log("\n✅ All tests passed!");
} else {
  console.log("\n❌ Some tests failed!");
}

Deno.exit(code);
