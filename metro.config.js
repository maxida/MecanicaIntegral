const { getDefaultConfig } = require("expo/metro-config");

// IMPORTACIÓN DIRECTA (Saltando el alias que está roto)
const { withNativeWind } = require("nativewind/dist/metro"); 

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuración de SVGs (para tus iconos del taller)
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...config.resolver.sourceExts, "svg"],
};

// Exportar con el input de tu CSS global
module.exports = withNativeWind(config, { input: "./global.css" });