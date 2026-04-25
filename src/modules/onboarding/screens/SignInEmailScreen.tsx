/** Purpose: Support email sign-in and route unverified users into email OTP verification. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Modal, Pressable, Text, View } from "react-native";

import { AuthScreen } from "@/components/AuthScreen";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { goBackOrReplace } from "@/utils/helpers";
import { emailSignInSchema, passwordResetSchema } from "@/utils/validators";

type SignInErrors = {
  email?: string;
  password?: string;
  general?: string;
};

const RESET_CONFIRMATION_ACCENT = "#650B11";

export default function SignInEmailScreen() {
  const router = useRouter();
  const { sendEmailOtp, sendPasswordReset, signInWithEmail } = useAuthSession();
  const { resolvedTheme, themeTokens } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetConfirmationVisible, setResetConfirmationVisible] = useState(false);
  const isDark = resolvedTheme === "dark";
  const sheetTitleClassName = isDark ? "text-ink" : "text-white";
  const supportTextClassName = isDark ? "text-secondary" : "text-white";
  const errorTextClassName = isDark ? "text-dangerText" : "text-white/95";

  const handleSignIn = async () => {
    const parsed = emailSignInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const nextUser = await signInWithEmail(parsed.data.email, parsed.data.password);
      if (!nextUser.emailVerified) {
        try {
          await sendEmailOtp();
        } catch (otpError) {
          Alert.alert(
            "Verification needed",
            `${
              otpError instanceof Error
                ? otpError.message
                : "We could not send your verification code yet."
            }\n\nYou can request another code from the verification screen.`,
          );
        }

        router.replace("/(onboarding)/verification");
        return;
      }

      router.replace("/");
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unable to sign in right now.";

      if (message === "Incorrect email or password.") {
        setErrors({ password: message });
      } else {
        setErrors({ general: message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const parsed = passwordResetSchema.safeParse({ email });
    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      setErrors((current) => ({
        ...current,
        email: fieldErrors.email?.[0],
        password: undefined,
        general: undefined,
      }));
      return;
    }

    setResetLoading(true);
    setErrors((current) => ({
      ...current,
      email: undefined,
      password: undefined,
      general: undefined,
    }));

    try {
      await sendPasswordReset(parsed.data.email);
      setResetConfirmationVisible(true);
    } catch (resetError) {
      setErrors((current) => ({
        ...current,
        general: resetError instanceof Error
          ? resetError.message
          : "We couldn't send a reset email right now. Try again in a moment.",
      }));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthScreen
      scrollable={false}
      topSlot={<BackButton onPress={() => goBackOrReplace(router, "/(onboarding)/welcome")} />}
      hero={<Text className="text-center text-[32px] font-semibold tracking-[-0.03em] text-ink">Sign In</Text>}
      sheetClassName="mt-4 flex-1 px-6 pt-6"
    >
      <View className="flex-1 justify-between">
        <View className="pt-1">
          <Text className={`mb-5 text-center text-[23px] font-semibold ${sheetTitleClassName}`}>Welcome! Enter your email</Text>
          <TextField
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setErrors((current) => ({ ...current, email: undefined, general: undefined }));
            }}
            keyboardType="email-address"
            hideLabel
            placeholder="example@gmail.com"
            containerClassName="mb-3"
            inputClassName="rounded-[15px] border border-line bg-input"
            error={errors.email}
            errorClassName={`text-[12px] leading-5 ${errorTextClassName}`}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setErrors((current) => ({ ...current, password: undefined, general: undefined }));
            }}
            secureTextEntry={!showPassword}
            hideLabel
            placeholder="Password"
            containerClassName="mb-0"
            inputClassName="rounded-[15px] border border-line bg-input"
            rightSlot={(
              <Pressable hitSlop={10} onPress={() => setShowPassword((current) => !current)}>
                <MaterialCommunityIcons
                  color={themeTokens.textMuted}
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={24}
                />
              </Pressable>
            )}
            error={errors.password}
            errorClassName={`text-[12px] leading-5 ${errorTextClassName}`}
          />
          <Pressable
            accessibilityRole="button"
            className="mt-3 self-end py-1"
            disabled={loading || resetLoading}
            hitSlop={10}
            onPress={handleForgotPassword}
          >
            <Text
              className={`text-[14px] font-medium underline ${
                isDark ? "text-ink" : "text-white"
              } ${loading || resetLoading ? "opacity-70" : ""}`}
            >
              {resetLoading ? "Sending reset link..." : "Forgot Password?"}
            </Text>
          </Pressable>
        </View>
        <View>
          {errors.general ? <Text className={`mb-3 text-center text-[12px] leading-5 ${errorTextClassName}`}>{errors.general}</Text> : null}
          <Button
            label="Continue"
            disabled={resetLoading}
            loading={loading}
            onPress={handleSignIn}
            variant={isDark ? "outline" : "secondary"}
            className={`mx-auto w-[202px] rounded-full ${isDark ? "border-0 bg-page" : ""}`}
            textClassName={isDark ? "text-accent" : undefined}
          />
          <View className={`mt-6 h-px ${isDark ? "bg-line" : "bg-white/70"}`} />
          <View className="mt-4 flex-row items-center justify-center">
            <Text className={`text-[15px] leading-6 ${supportTextClassName}`}>Need an account? </Text>
            <Pressable hitSlop={10} className="py-1" onPress={() => router.replace("/(onboarding)/signUp")}>
              <Text className={`text-[15px] font-medium underline ${isDark ? "text-ink" : "text-white"}`}>Create one</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setResetConfirmationVisible(false)}
        transparent
        visible={resetConfirmationVisible}
      >
        <View className="flex-1 justify-center bg-black/35 px-6 py-10">
          <Pressable className="absolute inset-0" onPress={() => setResetConfirmationVisible(false)} />
          <View className="rounded-[28px] bg-white px-6 py-6 shadow-lg">
            <View className="mb-5 h-1.5 w-16 rounded-full" style={{ backgroundColor: RESET_CONFIRMATION_ACCENT }} />
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-[#F5E7E8]">
              <MaterialCommunityIcons color={RESET_CONFIRMATION_ACCENT} name="email-check-outline" size={25} />
            </View>
            <Text className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Check your inbox</Text>
            <Text className="mt-3 text-[15px] leading-6 text-secondary">
              If this email is linked to a SOSync account, a password reset link has been sent. Please check your inbox or spam folder.
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-6 min-h-12 items-center justify-center rounded-full px-5"
              onPress={() => setResetConfirmationVisible(false)}
              style={{ backgroundColor: RESET_CONFIRMATION_ACCENT }}
            >
              <Text className="text-[16px] font-semibold text-white">Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AuthScreen>
  );
}
