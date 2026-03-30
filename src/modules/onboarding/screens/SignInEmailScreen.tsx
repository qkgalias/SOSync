/** Purpose: Support email sign-in and route unverified users into email OTP verification. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Pressable, Text, View } from "react-native";

import { AuthScreen } from "@/components/AuthScreen";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { goBackOrReplace } from "@/utils/helpers";
import { emailSignInSchema } from "@/utils/validators";

type SignInErrors = {
  email?: string;
  password?: string;
  general?: string;
};

export default function SignInEmailScreen() {
  const router = useRouter();
  const { sendEmailOtp, signInWithEmail } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});
  const [loading, setLoading] = useState(false);

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

  return (
    <AuthScreen
      scrollable={false}
      topSlot={<BackButton onPress={() => goBackOrReplace(router, "/(onboarding)/welcome")} />}
      hero={<Text className="text-center text-[32px] font-semibold tracking-[-0.03em] text-black">Sign In</Text>}
      sheetClassName="mt-4 flex-1 px-6 pt-6"
    >
      <View className="flex-1 justify-between">
        <View className="pt-1">
          <Text className="mb-5 text-center text-[23px] font-semibold text-white">Welcome! Enter your email</Text>
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
            inputClassName="rounded-[15px] border border-accent/80 bg-white"
            error={errors.email}
            errorClassName="text-[12px] leading-5 text-white/95"
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
            inputClassName="rounded-[15px] border border-accent/80 bg-white"
            rightSlot={(
              <Pressable hitSlop={10} onPress={() => setShowPassword((current) => !current)}>
                <MaterialCommunityIcons
                  color="#454040"
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={24}
                />
              </Pressable>
            )}
            error={errors.password}
            errorClassName="text-[12px] leading-5 text-white/95"
          />
        </View>
        <View>
          {errors.general ? <Text className="mb-3 text-center text-[12px] leading-5 text-white/95">{errors.general}</Text> : null}
          <Button
            label="Continue"
            loading={loading}
            onPress={handleSignIn}
            variant="secondary"
            className="mx-auto w-[202px] rounded-full"
          />
          <View className="mt-6 h-px bg-white/70" />
          <View className="mt-4 flex-row items-center justify-center">
            <Text className="text-[15px] leading-6 text-white">Need an account? </Text>
            <Pressable hitSlop={10} className="py-1" onPress={() => router.replace("/(onboarding)/signUp")}>
              <Text className="text-[15px] font-medium underline text-white">Create one</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AuthScreen>
  );
}
