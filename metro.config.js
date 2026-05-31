// Powered by OnSpace.AI
// Metro configuration with module aliases to shim broken/missing packages.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const SHIM_AUTH_SESSION = path.resolve(
  __dirname,
  'services/shims/expo-auth-session.ts'
);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-auth-session') {
    return {
      filePath: SHIM_AUTH_SESSION,
      type: 'sourceFile',
    };
  }
  if (typeof originalResolveRequest === 'function') {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
