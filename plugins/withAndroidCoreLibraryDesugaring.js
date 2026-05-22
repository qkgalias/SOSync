const { withAppBuildGradle, withGradleProperties } = require("@expo/config-plugins");

const DESUGARING_FLAG = "coreLibraryDesugaringEnabled true";
const DESUGARING_DEPENDENCY = 'coreLibraryDesugaring("com.android.tools:desugar_jdk_libs_nio:2.0.4")';

function addCoreLibraryDesugaringFlag(buildGradle) {
  if (/coreLibraryDesugaringEnabled\s+true/.test(buildGradle)) {
    return buildGradle;
  }

  if (/compileOptions\s*\{/.test(buildGradle)) {
    return buildGradle.replace(/compileOptions\s*\{/, (match) => `${match}\n        ${DESUGARING_FLAG}`);
  }

  return buildGradle.replace(
    /(\n\s*)androidResources\s*\{/,
    `\n    compileOptions {\n        ${DESUGARING_FLAG}\n    }\n$1androidResources {`,
  );
}

function addCoreLibraryDesugaringDependency(buildGradle) {
  if (/coreLibraryDesugaring\s*\(?['"]com\.android\.tools:desugar_jdk_libs_nio:2\.0\.4['"]\)?/.test(buildGradle)) {
    return buildGradle;
  }

  return buildGradle.replace(/dependencies\s*\{/, (match) => `${match}\n    ${DESUGARING_DEPENDENCY}`);
}

module.exports = function withAndroidCoreLibraryDesugaring(config) {
  const withDesugaring = withAppBuildGradle(config, (nextConfig) => {
    if (nextConfig.modResults.language !== "groovy") {
      return nextConfig;
    }

    let contents = nextConfig.modResults.contents;
    contents = addCoreLibraryDesugaringFlag(contents);
    contents = addCoreLibraryDesugaringDependency(contents);

    nextConfig.modResults.contents = contents;
    return nextConfig;
  });

  return withGradleProperties(withDesugaring, (nextConfig) => {
    const properties = nextConfig.modResults;
    const setProperty = (name, value) => {
      const existingProperty = properties.find((property) => property.type === "property" && property.key === name);
      if (existingProperty) {
        existingProperty.value = value;
        return;
      }

      properties.push({
        type: "property",
        key: name,
        value,
      });
    };

    setProperty("android.enableJetifier", "true");
    return nextConfig;
  });
};
