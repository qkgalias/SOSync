/** Purpose: Attach Google Navigation SDK context on native builds while keeping web preview inert. */
import type { ComponentType, PropsWithChildren } from "react";
import { Platform } from "react-native";

export const NavigationSdkProvider = ({ children }: PropsWithChildren) => {
  if (Platform.OS === "web") {
    return <>{children}</>;
  }

  let NavigationProvider: ComponentType<any> | null = null;
  let taskRemovedBehavior: unknown;

  try {
    const navigationSdk = require("@googlemaps/react-native-navigation-sdk") as
      | typeof import("@googlemaps/react-native-navigation-sdk")
      | undefined;
    NavigationProvider = navigationSdk?.NavigationProvider ?? null;
    taskRemovedBehavior = navigationSdk?.TaskRemovedBehavior?.QUIT_SERVICE;
  } catch (error) {
    console.warn(
      "Rebuild Android dev build: Google Navigation SDK native module is missing.",
      error,
    );
  }

  if (!NavigationProvider) {
    return <>{children}</>;
  }

  return (
    <NavigationProvider
      taskRemovedBehavior={taskRemovedBehavior}
      termsAndConditionsDialogOptions={{
        companyName: "SOSync",
        showOnlyDisclaimer: false,
        title: "Navigation Terms",
        uiParams: {
          backgroundColor: "#FFFFFF",
          titleColor: "#7C2C2C",
        },
      }}
    >
      {children}
    </NavigationProvider>
  );
};
