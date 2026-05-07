const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Block Metro from watching .local — Replit creates and removes temp dirs
// inside .local which causes FallbackWatcher ENOENT crashes.
// posixPathMatchesPattern tests the regex against the absolute file path.
const localDir = path.join(__dirname, ".local");

const existingBlockList = config.resolver.blockList;
const newPattern = new RegExp(
  "^" + localDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(/.*)?$"
);

config.resolver.blockList = existingBlockList
  ? Array.isArray(existingBlockList)
    ? [...existingBlockList, newPattern]
    : [existingBlockList, newPattern]
  : newPattern;

module.exports = config;
