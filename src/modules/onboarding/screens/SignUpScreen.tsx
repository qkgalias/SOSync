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
import { cn, goBackOrReplace } from "@/utils/helpers";
import { formatPhoneDigits } from "@/utils/input";
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
}: FormFieldProps) => (
  <View className={cn("mb-3", containerClassName)}>
    <View className="flex-row items-center rounded-[18px] border border-[#D8B1B1] bg-white px-5 py-1 shadow-soft">
      {leftSlot ? <View className="mr-3">{leftSlot}</View> : null}
      <TextInput
        autoCapitalize={autoCapitalize}
        className="min-h-[54px] flex-1 text-[18px] text-ink"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#918A8A"
        secureTextEntry={secureTextEntry}
        value={value}
      />
      {rightSlot ? <View className="ml-3">{rightSlot}</View> : null}
    </View>
    {error ? <Text className="mt-2 text-[12px] leading-5 text-white/95">{error}</Text> : null}
  </View>
);

type SignUpErrors = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

type LegalModalKey = "terms" | "privacy" | null;

const LEGAL_MODAL_CONTENT = {
  terms: {
    title: "Terms of Service",
    sections: [
      {
        title: "Using SOSync",
        body:
          "SOSync helps you create a private safety circle, verify your contact details, and coordinate with trusted people during emergencies.",
      },
      {
        title: "Your account",
        body:
          "You agree to provide accurate information, keep your login secure, and use SOSync only for lawful and safety-related purposes.",
      },
      {
        title: "Safety reminder",
        body:
          "SOSync supports coordination, but it is not a replacement for emergency responders, official alerts, or your own judgment during urgent situations.",
      },
      {
        title: "Account limits",
        body:
          "We may suspend or remove access if SOSync is abused, used to harass others, or used in a way that puts other members at risk.",
      },
      {
        title: "Support",
        body:
          "For now, SOSync legal and support contact details are managed in-app and may be updated as the product matures.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      {
        title: "What we collect",
        body:
          "SOSync stores the account details you provide in the app, including your name, email address, phone number, profile information, and trusted-circle data.",
      },
      {
        title: "Why we use it",
        body:
          "We use this information to create your account, verify your email, help you set up your profile, and support safety coordination features inside SOSync.",
      },
      {
        title: "Verification services",
        body:
          "Email verification is handled through Firebase Authentication and a transactional email provider so SOSync can send one-time verification codes to your inbox.",
      },
      {
        title: "How your data is stored",
        body:
          "Your account and app data are stored in SOSync's backend services. Access is restricted to the app flows and protections currently configured for the project.",
      },
      {
        title: "Your choices",
        body:
          "You can update your profile details in the app and request account deletion from the account settings flow when that action is available to your session.",
      },
    ],
  },
} satisfies Record<Exclude<LegalModalKey, null>, { title: string; sections: Array<{ title: string; body: string }> }>;

const LegalModal = ({
  visible,
  onClose,
  modalKey,
}: {
  visible: boolean;
  onClose: () => void;
  modalKey: Exclude<LegalModalKey, null>;
}) => {
  const content = LEGAL_MODAL_CONTENT[modalKey];

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/45 px-6 py-10">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="max-h-[78%] rounded-[28px] bg-white px-6 pt-6 pb-5">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[24px] font-semibold text-ink">{content.title}</Text>
              <Text className="mt-2 text-[13px] leading-5 text-muted">Local in-app copy for the current SOSync build.</Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose}>
              <MaterialCommunityIcons color="#2E2C2C" name="close" size={24} />
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [legalModal, setLegalModal] = useState<LegalModalKey>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const parsed = signUpFormSchema.safeParse({
      firstName,
      lastName,
      phoneNumber: phoneDigits,
      email,
      password,
      confirmPassword,
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
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
      await signUpWithEmail(fullName, parsed.data.email, parsed.data.password);
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
      hero={<Text className="text-center text-[32px] font-semibold tracking-[-0.03em] text-black">Create an Account</Text>}
      sheetClassName="mt-4 flex-1 px-6 pt-5"
    >
      <View className="flex-1 justify-between">
        <View>
          <View className="flex-row gap-2">
            <FormField
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
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
                setLastName(value);
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
                  color="#454040"
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
                  color="#454040"
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={24}
                />
              </Pressable>
            )}
            error={errors.confirmPassword}
          />
        </View>

        <View>
          {errors.general ? <Text className="mb-3 text-center text-[12px] leading-5 text-white/95">{errors.general}</Text> : null}
          <Button
            label="Continue"
            loading={loading}
            onPress={handleSignUp}
            variant="secondary"
            className="mx-auto min-h-[56px] w-[210px] rounded-full"
            textClassName="text-[18px]"
          />

          <Text className="mt-5 text-center text-[12px] leading-5 text-white/95">
            By continuing, you agree to our{" "}
            <Text className="underline" onPress={() => setLegalModal("terms")}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text className="underline" onPress={() => setLegalModal("privacy")}>
              Privacy Policy
            </Text>
          </Text>

          <View className="mt-5 h-px bg-white/75" />

          <View className="mt-4 flex-row items-center justify-center">
            <Text className="text-[15px] leading-6 text-white">Have an account? </Text>
            <Pressable hitSlop={10} className="py-1" onPress={() => router.replace("/(onboarding)/signInEmail")}>
              <Text className="text-[15px] font-medium underline text-white">Login Here</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {legalModal ? <LegalModal visible modalKey={legalModal} onClose={() => setLegalModal(null)} /> : null}
    </AuthScreen>
  );
}
