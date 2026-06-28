#!/usr/bin/env node
"use strict";

/*
 * vulcan — branded launcher for the opencode runtime.
 *
 * Resolves the installed `opencode-ai` runtime portably (no machine-specific
 * absolute paths) and forwards every argument to the runtime's `opencode`
 * binary, inheriting stdio and preserving exit status / signal.
 *
 * Override the runtime binary with the `VULCAN_RUNTIME` env var, e.g.
 *   VULCAN_RUNTIME=/usr/local/bin/opencode vulcan --version
 */

var spawn = require("child_process").spawn;
var path = require("path");
var fs = require("fs");

function fail(message) {
  process.stderr.write(String(message).replace(/\s+$/, "") + "\n");
  process.exit(1);
}

// Conventional POSIX mapping for a small set of terminating signals, used only
// to produce a sensible exit code when the runtime dies from a signal.
var SIGNAL_NUMBERS = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGQUIT: 3,
  SIGILL: 4,
  SIGTRAP: 5,
  SIGABRT: 6,
  SIGBUS: 7,
  SIGFPE: 8,
  SIGKILL: 9,
  SIGSEGV: 11,
  SIGTERM: 15,
};

function resolveRuntime() {
  // 1) Explicit override (local branded build / debugging).
  var override = process.env.VULCAN_RUNTIME;
  if (override && override.trim()) {
    return { command: override, label: override };
  }

  // 2) Resolve the installed runtime via its package.json, then read whatever
  //    `opencode` bin entry the runtime declares. This follows the package's
  //    own metadata instead of hard-coding a path, so it stays portable.
  var pkgPath;
  try {
    pkgPath = require.resolve("opencode-ai/package.json");
  } catch (err) {
    fail(
      "vulcan: could not find the opencode runtime (opencode-ai).\n" +
        "Package dependencies appear to be missing or not fully installed.\n" +
        "Reinstall VulcanCode, for example:\n" +
        "  npm install -g github:slades01/Vulcan-code\n" +
        "or, from a local clone:  npm install -g .\n" +
        "You can also point vulcan at a runtime with the VULCAN_RUNTIME env var."
    );
  }

  var pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch (err) {
    fail("vulcan: the opencode runtime package.json at " + pkgPath + " is unreadable: " + (err && err.message));
  }

  var binField = pkg && pkg.bin && (pkg.bin.opencode || (typeof pkg.bin === "string" ? pkg.bin : null));
  if (!binField) {
    fail("vulcan: the opencode runtime (" + pkgPath + ") does not declare an `opencode` bin entry.");
  }

  var binPath = path.resolve(path.dirname(pkgPath), binField);
  return { command: binPath, label: binPath };
}

// vulcan reports its own brand and version for --version/-v instead of
// forwarding those flags to the opencode runtime (which would print
// "opencode <version>"). Brand and display version are read from
// VulcanCode's own package.json (`vulcan.brand` / `vulcan.displayVersion`),
// falling back to hardcoded defaults if the file is unreadable. This runs
// before runtime resolution so `vulcan --version` works even when the
// opencode runtime is not installed.
var VULCAN_DEFAULT_BRAND = "VulcanCode";
var VULCAN_DEFAULT_VERSION = "1.0";

function readBranding() {
  try {
    var pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8"));
    var meta = (pkg && pkg.vulcan) || {};
    return {
      brand: meta.brand || VULCAN_DEFAULT_BRAND,
      version: meta.displayVersion || VULCAN_DEFAULT_VERSION,
    };
  } catch (err) {
    return { brand: VULCAN_DEFAULT_BRAND, version: VULCAN_DEFAULT_VERSION };
  }
}

function isVersionRequest(args) {
  return args.some(function (a) {
    return a === "--version" || a === "-v" || a.indexOf("--version=") === 0;
  });
}

var args = process.argv.slice(2);

if (isVersionRequest(args)) {
  var branding = readBranding();
  process.stdout.write(branding.brand + " " + branding.version + "\n");
  process.exit(0);
}

var runtime = resolveRuntime();

var child = spawn(runtime.command, args, {
  stdio: "inherit",
  env: process.env,
});

child.on("error", function (err) {
  var code = err && err.code;
  if (code === "ENOENT") {
    fail(
      "vulcan: runtime executable not found: " + runtime.label + "\n" +
        "The opencode runtime binary is missing. The most common cause is that the\n" +
        "opencode-ai postinstall step (which installs the platform binary) did not\n" +
        "run -- e.g. an install done with --ignore-scripts -- or the platform\n" +
        "package failed to download. Reinstall normally:\n" +
        "  npm install -g github:slades01/Vulcan-code   (or: npm install -g .)\n" +
        "You can also point vulcan at a runtime via the VULCAN_RUNTIME env var."
    );
  }
  fail("vulcan: failed to launch runtime (" + runtime.label + "): " + (err && err.message ? err.message : err));
});

child.on("close", function (code, signal) {
  if (signal) {
    var num = SIGNAL_NUMBERS[signal];
    process.exit(num ? 128 + num : 1);
  }
  process.exit(code == null ? 1 : code);
});
