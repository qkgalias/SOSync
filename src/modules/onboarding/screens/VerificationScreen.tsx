/** Purpose: Confirm email OTP verification before the user continues with onboarding. */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AuthScreen } from "@/components/AuthScreen";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { env } from "@/config/env";
import { useAuthSession } from "@/hooks/useAuthSession";
import { goBackOrReplace } from "@/utils/helpers";
import { resolveSignedInHref } from "@/utils/sessionRouting";
import { verificationCodeSchema } from "@/utils/validators";

const showDemoHint = env.appEnv === "demo" || env.firebaseProjectId === "demo-sosync";
const RESEND_COOLDOWN_MS = 60_000;

export default function VerificationScreen() {
  const router = useRouter();
  const {
    pendingVerificationEmail,
    profile,
    resendEmailOtp,
    verifyEmailOtp,
  } = useAuthSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [resendAvailableAt, setResendAvailableAt] = useState(Date.now() + RESEND_COOLDOWN_MS);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pendingVerificationEmail) {
      return;
    }

    setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
  }, [pendingVerificationEmail]);

  const copy = useMemo(() => {
    return {
      title: "OTP Verification",
      heading: "Enter OTP Code",
      body: pendingVerificationEmail
        ? `We’ve sent a one-time verification code to\n${pendingVerificationEmail}`
        : "Enter the latest 6-digit code from your email to continue.",
    };
  }, [pendingVerificationEmail]);

  const secondsRemaining = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const canResend = secondsRemaining === 0 && !resending;

  const handleVerify = async () => {
    const parsed = verificationCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const verifiedAt = new Date().toISOString();
      await verifyEmailOtp(parsed.data.code);

      if (!profile?.onboarding?.profileComplete) {
        router.replace("/(onboarding)/profileSetup");
        return;
      }

      router.replace(resolveSignedInHref(
        profile
          ? {
              ...profile,
              security: {
                ...(profile.security ?? {}),
                emailVerified: true,
                emailVerifiedAt: profile.security?.emailVerifiedAt ?? verifiedAt,
              },
            }
          : null,
      ));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The code could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) {
      return;
    }

    setResending(true);
    setError("");

    try {
      const response = await resendEmailOtp();
      const nextResendTime = Date.parse(response.resendAvailableAt);
      setCode("");
      setResendAvailableAt(Number.isNaN(nextResendTime) ? Date.now() + RESEND_COOLDOWN_MS : nextResendTime);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to resend the verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreen
      scrollable={false}
      topSlot={<BackButton onPress={() => goBackOrReplace(router, "/(onboarding)/signInEmail")} />}
      hero={<Text className="text-center text-[30px] font-semibold tracking-[-0.03em] text-black">{copy.title}</Text>}
      sheetClassName="mt-4 flex-1 px-6 pt-8"
    >
      <View className="flex-1 justify-between">
        <View className="items-center">
          <Text className="text-center text-[24px] font-semibold text-white">{copy.heading}</Text>
          <Text className="mt-3 text-center text-[14px] leading-6 text-white whitespace-pre-line">{copy.body}</Text>
          {showDemoHint ? (
            <Text className="mt-3 text-center text-[12px] leading-5 text-white/95">In demo mode, use 111111.</Text>
          ) : null}

          <View className="mt-10">
            <CodeInput
              value={code}
              onChangeValue={setCode}
              emptyState="none"
              rowClassName="flex-row justify-center gap-3"
              cellClassName="h-[70px] w-[52px] rounded-[16px] bg-white/85"
            />
          </View>

          <View className="mt-7 self-start">
            <Text className="text-[12px] leading-5 text-white/95">
              {secondsRemaining > 0 ? `You can resend the code in ${secondsRemaining}s` : "You can request a new code now"}
            </Text>
            <Pressable className="mt-2 self-start" disabled={!canResend} onPress={handleResend}>
              <Text className={`text-[15px] font-semibold ${canResend ? "text-white" : "text-white/60"}`}>
                {resending ? "Sending..." : "Resend Code"}
              </Text>
            </Pressable>
          </View>

          {error ? <Text className="mt-4 self-stretch text-sm leading-5 text-white">{error}</Text> : null}
        </View>

        <Button
          label="Verify"
          loading={loading}
          onPress={handleVerify}
          variant="secondary"
          className="mx-auto min-h-[58px] w-[202px] rounded-full"
          textClassName="text-[18px]"
        />
      </View>
    </AuthScreen>
  );
}
