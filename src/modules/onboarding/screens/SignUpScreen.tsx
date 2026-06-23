/** Purpose: Create an email account, capture name + phone, and start email OTP verification. */
import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { AuthScreen } from "@/components/AuthScreen";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { useAuthSession } from "@/hooks/useAuthSession";
import { SIGN_UP_LEGAL_MODAL_CONTENT } from "@/modules/onboarding/signUpLegalContent";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { cn, goBackOrReplace } from "@/utils/helpers";
import { formatPhoneDigits, sanitizeSignupName } from "@/utils/input";
import { signUpFormSchema } from "@/utils/validators";

type FormFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  autoCapitalize?: "none" | "sentences" | "words";
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  containerClassName?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

const FormField = ({
  autoCapitalize = "none",
  containerClassName,
  error,
  keyboardType = "default",
  leftSlot,
  onChangeText,
  placeholder,
  rightSlot,
  secureTextEntry,
  value,
}: FormFieldProps) => {
  const { resolvedTheme, themeTokens } = useAppTheme();

  return (
    <View className={cn("mb-3", containerClassName)}>
      <View className="flex-row items-center rounded-[18px] border border-line bg-input px-5 py-1 shadow-soft">
        {leftSlot ? <View className="mr-3">{leftSlot}</View> : null}
        <TextInput
          autoCapitalize={autoCapitalize}
          className="min-h-[54px] flex-1 text-[18px] text-ink"
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={themeTokens.textMuted}
          secureTextEntry={secureTextEntry}
          value={value}
        />
        {rightSlot ? <View className="ml-3">{rightSlot}</View> : null}
      </View>
      {error ? (
        <Text className={cn("mt-2 text-[12px] leading-5", resolvedTheme === "dark" ? "text-dangerText" : "text-white/95")}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

type SignUpErrors = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedLegalTerms?: string;
  general?: string;
};

type LegalModalKey = "terms" | "privacy" | null;

const LegalModal = ({
  visible,
  onClose,
  modalKey,
}: {
  visible: boolean;
  onClose: () => void;
  modalKey: Exclude<LegalModalKey, null>;
}) => {
  const { themeTokens } = useAppTheme();
  const content = SIGN_UP_LEGAL_MODAL_CONTENT[modalKey];

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/45 px-6 py-10">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="max-h-[78%] rounded-[28px] bg-panel px-6 pb-5 pt-6">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[24px] font-semibold text-ink">{content.title}</Text>
              <Text className="mt-2 text-[13px] leading-5 text-muted">Local in-app copy for the current SOSync build.</Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose}>
              <MaterialCommunityIcons color={themeTokens.accentPrimary} name="close" size={24} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {content.sections.map((section) => (
              <View key={section.title} className="mb-5">
                <Text className="text-[15px] font-semibold text-ink">{section.title}</Text>
                <Text className="mt-2 text-[14px] leading-6 text-muted">{section.body}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function SignUpScreen() {
  const router = useRouter();
  const { saveProfile, sendEmailOtp, signUpWithEmail } = useAuthSession();
  const { resolvedTheme, themeTokens } = useAppTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [legalModal, setLegalModal] = useState<LegalModalKey>(null);
  const [loading, setLoading] = useState(false);
  const isDark = resolvedTheme === "dark";
  const supportTextClassName = isDark ? "text-secondary" : "text-white";
  const errorTextClassName = isDark ? "text-dangerText" : "text-white/95";

  const handleSignUp = async () => {
    const parsed = signUpFormSchema.safeParse({
      firstName,
      lastName,
      phoneNumber: phoneDigits,
      email,
      password,
      confirmPassword,
      acceptedLegalTerms,
    });

    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      setErrors({
        firstName: fieldErrors.firstName?.[0],
        lastName: fieldErrors.lastName?.[0],
        phoneNumber: fieldErrors.phoneNumber?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
        acceptedLegalTerms: fieldErrors.acceptedLegalTerms?.[0],
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
      await signUpWithEmail(fullName, parsed.data.email, parsed.data.password);

      try {
        await saveProfile({
          name: fullName,
          email: parsed.data.email,
          phoneNumber: parsed.data.phoneNumber,
          onboarding: {
            currentStep: "verify",
            profileComplete: false,
            circleComplete: false,
            permissionsComplete: false,
          },
          security: {
            emailVerified: false,
          },
        });
      } catch (profileError) {
        console.warn("Initial profile setup will resume after verification.", profileError);
      }

      try {
        await sendEmailOtp();
      } catch (otpError) {
        Alert.alert(
          "Account created",
          `${
            otpError instanceof Error
              ? otpError.message
              : "We could not send your verification code yet."
          }\n\nYou can request another code from the next screen.`,
        );
      }

      router.replace("/(onboarding)/verification");
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unable to create your account.";

      if (message.includes("already in use")) {
        setErrors({ email: message });
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
      hero={<Text className="text-center text-[32px] font-semibold tracking-[-0.03em] text-ink">Create an Account</Text>}
      sheetClassName="mt-4 flex-1 px-6 pt-5"
    >
      <View className="flex-1 justify-between">
        <View>
          <View className="flex-row gap-2">
            <FormField
              value={firstName}
              onChangeText={(value) => {
                setFirstName(sanitizeSignupName(value));
                setErrors((current) => ({ ...current, firstName: undefined, general: undefined }));
              }}
              placeholder="First Name"
              autoCapitalize="words"
              containerClassName="flex-1"
              error={errors.firstName}
            />
            <FormField
              value={lastName}
              onChangeText={(value) => {
                setLastName(sanitizeSignupName(value));
                setErrors((current) => ({ ...current, lastName: undefined, general: undefined }));
              }}
              placeholder="Last Name"
              autoCapitalize="words"
              containerClassName="flex-1"
              error={errors.lastName}
            />
          </View>

          <FormField
            value={formatPhoneDigits(phoneDigits)}
            onChangeText={(value) => {
              setPhoneDigits(formatPhoneDigits(value));
              setErrors((current) => ({ ...current, phoneNumber: undefined, general: undefined }));
            }}
            placeholder="912 345 6789"
            keyboardType="phone-pad"
            leftSlot={<Text className="text-[18px] text-ink">PH +63</Text>}
            error={errors.phoneNumber}
          />

          <FormField
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setErrors((current) => ({ ...current, email: undefined, general: undefined }));
            }}
            placeholder="Email"
            keyboardType="email-address"
            error={errors.email}
          />

          <FormField
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setErrors((current) => ({ ...current, password: undefined, confirmPassword: undefined, general: undefined }));
            }}
            placeholder="Password"
            secureTextEntry={!showPassword}
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
          />

          <FormField
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setErrors((current) => ({ ...current, confirmPassword: undefined, general: undefined }));
            }}
            placeholder="Confirm Password"
            secureTextEntry={!showConfirmPassword}
            rightSlot={(
              <Pressable hitSlop={10} onPress={() => setShowConfirmPassword((current) => !current)}>
                <MaterialCommunityIcons
                  color={themeTokens.textMuted}
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={24}
                />
              </Pressable>
            )}
            error={errors.confirmPassword}
          />
        </View>

        <View>
          {errors.general ? <Text className={`mb-3 text-center text-[12px] leading-5 ${errorTextClassName}`}>{errors.general}</Text> : null}
          <Button
            label="Continue"
            loading={loading}
            onPress={handleSignUp}
            variant={isDark ? "outline" : "secondary"}
            className={`mx-auto min-h-[56px] w-[210px] rounded-full ${isDark ? "border-0 bg-page" : ""}`}
            textClassName={`text-[18px] ${isDark ? "text-accent" : ""}`}
          />

          <View className="mt-5">
            <View className="mx-auto flex-row items-start justify-start px-1">
              <Pressable
                accessibilityLabel="Agree to Terms of Service and Privacy Policy"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedLegalTerms }}
                className="mr-2 mt-[2px]"
                hitSlop={10}
                onPress={() => {
                  setAcceptedLegalTerms((current) => !current);
                  setErrors((current) => ({ ...current, acceptedLegalTerms: undefined, general: undefined }));
                }}
              >
                <MaterialCommunityIcons
                  color="#FFFFFF"
                  name={acceptedLegalTerms ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={18}
                />
              </Pressable>
              <Text className={`max-w-[360px] text-left text-[12px] leading-5 ${errorTextClassName}`}>
                By continuing, you agree to our{" "}
                <Text className="underline" onPress={() => setLegalModal("terms")}>
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text className="underline" onPress={() => setLegalModal("privacy")}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
            {errors.acceptedLegalTerms ? (
              <Text className={`mt-2 text-center text-[12px] leading-5 ${errorTextClassName}`}>
                {errors.acceptedLegalTerms}
              </Text>
            ) : null}
          </View>

          <View className={`mt-5 h-px ${isDark ? "bg-line" : "bg-white/75"}`} />

          <View className="mt-4 flex-row items-center justify-center">
            <Text className={`text-[15px] leading-6 ${supportTextClassName}`}>Have an account? </Text>
            <Pressable hitSlop={10} className="py-1" onPress={() => router.replace("/(onboarding)/signInEmail")}>
              <Text className={`text-[15px] font-medium underline ${isDark ? "text-ink" : "text-white"}`}>Login Here</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {legalModal ? <LegalModal visible modalKey={legalModal} onClose={() => setLegalModal(null)} /> : null}
    </AuthScreen>
  );
}
