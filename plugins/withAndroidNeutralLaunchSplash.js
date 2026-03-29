const fs = require("fs/promises");

const { AndroidConfig, withAndroidManifest, withAndroidStyles, withDangerousMod } = require("@expo/config-plugins");

const splashThemeGroup = { name: "Theme.App.SplashScreen" };

module.exports = function withAndroidNeutralLaunchSplash(config) {
  const withLauncherIconAlignment = withAndroidManifest(config, (nextConfig) => {
    const application = nextConfig.modResults.manifest.application?.[0];

    if (application?.$) {
      application.$["android:roundIcon"] = "@mipmap/ic_launcher";
    }

    return nextConfig;
  });

  const withNeutralSplashTheme = withAndroidStyles(withLauncherIconAlignment, (nextConfig) => {
    let styles = nextConfig.modResults;

    styles = AndroidConfig.Styles.removeStylesItem({
      xml: styles,
      parent: splashThemeGroup,
      name: "android:windowSplashScreenBehavior",
    });

    styles = AndroidConfig.Styles.assignStylesValue(styles, {
      add: true,
      parent: splashThemeGroup,
      name: "windowSplashScreenAnimatedIcon",
      value: "@drawable/splashscreen_empty",
    });

    styles = AndroidConfig.Styles.removeStylesItem({
      xml: styles,
      parent: splashThemeGroup,
      name: "windowSplashScreenIconBackgroundColor",
    });

    styles = AndroidConfig.Styles.assignStylesValue(styles, {
      add: true,
      parent: splashThemeGroup,
      name: "windowSplashScreenBackground",
      value: "@color/splashscreen_background",
    });

    styles = AndroidConfig.Styles.assignStylesValue(styles, {
      add: true,
      parent: splashThemeGroup,
      name: "postSplashScreenTheme",
      value: "@style/AppTheme",
    });

    nextConfig.modResults = styles;
    return nextConfig;
  });

  return withDangerousMod(withNeutralSplashTheme, [
    "android",
    async (nextConfig) => {
      const filePath = await AndroidConfig.Paths.getResourceXMLPathAsync(nextConfig.modRequest.projectRoot, {
        name: "ic_launcher_background",
        kind: "drawable",
      });

      await fs.writeFile(
        filePath,
        `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>
</layer-list>
`,
      );

      const emptySplashDrawablePath = await AndroidConfig.Paths.getResourceXMLPathAsync(nextConfig.modRequest.projectRoot, {
        name: "splashscreen_empty",
        kind: "drawable",
      });

      await fs.writeFile(
        emptySplashDrawablePath,
        `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="@android:color/transparent"/>
</shape>
`,
      );

      return nextConfig;
    },
  ]);
};
