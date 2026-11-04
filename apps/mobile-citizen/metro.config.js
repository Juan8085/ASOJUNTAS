const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch only this app and shared packages (avoid crawling web-admin or api)
config.watchFolders = [
  projectRoot,
  path.resolve(monorepoRoot, "packages"),
];

// 2. Resolve modules from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Blocklist other apps and caches
config.resolver.blockList = [
  /.*\/apps\/web-admin\/.*/,
  /.*\/apps\/api\/.*/,
  /.*\\apps\\web-admin\\.*/,
  /.*\\apps\\api\\.*/,
  /.*\.next\/.*/,
  /.*\.turbo\/.*/,
];

module.exports = config;
