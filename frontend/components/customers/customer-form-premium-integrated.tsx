"use client";

// ============================================================================
// CUSTOMER FORM PREMIUM - INTEGRATED VERSION
// ============================================================================
// Architettura: Code splitting, Lazy loading, Optimized state management
// Design: Apple 2026 Liquid Glass (900×900px glassmorphism)
// Performance target: 60fps, <100ms interaction
// ============================================================================

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useReducer,
  createContext,
  useContext,
  lazy,
  Suspense,
  memo,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useForm, FormProvider, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDebounce } from "use-debounce";
import PhoneInput from "react-phone-number-input";
import { zxcvbnOptions, zxcvbnAsync } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnItPackage from "@zxcvbn-ts/language-it";
import { isValidPhoneNumber } from "libphonenumber-js";
import "react-phone-number-input/style.css";
import { IMaskInput } from 'react-imask';
import { maskConfigs } from '@/lib/maskConfigs';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';
import { ConfettiCelebration, useCelebration } from '@/components/microinteractions/ConfettiCelebration';
import { FloatingLabelInput } from '@/components/form/FloatingLabelInput';

// ============================================================================
// LAZY LOADED COMPONENTS - Code Splitting
// ============================================================================
const FormAnalyticsDashboard = lazy(
  () => import("@/components/analytics/FormAnalyticsDashboard")
);

// Dynamic imports for heavy features
const AIAssistantPanel = lazy(() =>
  import("./ai-assistant-panel").then((mod) => ({
    default: mod.AIAssistantPanel,
  }))
);

const PasskeyRegistration = lazy(() =>
  import("./passkey-registration").then((mod) => ({
    default: mod.PasskeyRegistration,
  }))
);

// ============================================================================
// ICONS
// ============================================================================
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Building2,
  User,
  Shield,
  FileText,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Phone,
  CreditCard,
  AlertCircle,
  Sparkles,
  LockKeyhole,
  BadgeCheck,
  Globe,
  Send,
  MessageSquare,
  Wifi,
  WifiOff,
  Activity,
  Bug,
} from "lucide-react";

// ============================================================================
// UI COMPONENTS
// ============================================================================
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ============================================================================
// HOOKS
// ============================================================================
import { useA11yAnnouncer, useFormAnnouncer } from "@/hooks/useA11yAnnouncer";
import { useFormFunnel } from "@/hooks/useFormFunnel";
import { useABTesting, useExperiment } from "@/lib/analytics/abTesting";
import { useFormPersistence } from "@/hooks/form-persistence";
import { useOfflineQueue } from "@/hooks/form-persistence/useOfflineQueue";
import { useReducedMotion as useReducedMotionPref } from "@/hooks/useReducedMotion";

// ============================================================================
// LIB
// ============================================================================
import { abTesting } from "@/lib/analytics/abTesting";
import { errorTracker } from "@/lib/analytics/errorTracking";
import { analytics } from "@/lib/analytics/segment";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  PasskeyError,
} from "@/lib/auth/webauthn";

// ============================================================================
// FORM PERSISTENCE COMPONENTS
// ============================================================================
import {
  FormResumeBanner,
  OfflineIndicator,
  DataRestoreModal,
} from "@/components/form-persistence";

// ============================================================================
// ZXCVRBN INITIALIZATION
// ============================================================================
const zxcvbnTsOptions = {
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnItPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  useLevenshteinDistance: true,
};
zxcvbnTsOptions.setOptions?.(zxcvbnOptions);

// ============================================================================
// TYPES
// ============================================================================
type CustomerType = "private" | "business";
type Step = 1 | 2 | 3 | 4;
type EmailStatus = "idle" | "checking" | "available" | "taken";
type PivaStatus = "idle" | "checking" | "valid" | "invalid";
type FormStatus = "idle" | "submitting" | "success" | "error";

interface PasswordStrength {
  score: number;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTimeDisplay: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const emailSchema = z.string().email("Inserisci un'email valida");

const passwordSchema = z
  .string()
  .min(8, "La password deve essere di almeno 8 caratteri")
  .regex(/[A-Z]/, "Deve contenere almeno una maiuscola")
  .regex(/[a-z]/, "Deve contenere almeno una minuscola")
  .regex(/[0-9]/, "Deve contenere almeno un numero")
  .regex(/[^A-Za-z0-9]/, "Deve contenere almeno un carattere speciale");

const baseSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  phone: z
    .string()
    .min(1, "Il numero di telefono è obbligatorio")
    .refine(isValidPhoneNumber, "Numero di telefono non valido"),
  customerType: z.enum(["private", "business"]),
  // Private fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fiscalCode: z.string().optional(),
  // Business fields
  companyName: z.string().optional(),
  companyType: z.string().optional(),
  vatNumber: z.string().optional(),
  pec: z.string().optional(),
  sdiCode: z.string().optional(),
  // Address
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zipCode: z.string().optional(),
  // Privacy
  consentData: z.boolean().refine((val) => val === true, {
    message: "Devi accettare il trattamento dei dati",
  }),
  consentPrivacy: z.boolean().refine((val) => val === true, {
    message: "Devi accettare la privacy policy",
  }),
  consentNewsletter: z.boolean().optional(),
  consentMarketing: z.boolean().optional(),
  marketingChannels: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    phone: z.boolean().optional(),
  }),
  consentProfiling: z.boolean().optional(),
  consentPartners: z.boolean().optional(),
  confirmData: z.boolean().refine((val) => val === true, {
    message: "Devi confermare che i dati sono corretti",
  }),
  // Passkey
  usePasskey: z.boolean().optional(),
});

type FormData = z.infer<typeof baseSchema>;

// ============================================================================
// FORM CONTEXT & STATE MANAGEMENT
// ============================================================================
interface FormContextType {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  form: UseFormReturn<FormData>;
}

interface FormState {
  step: Step;
  direction: number;
  status: FormStatus;
  emailStatus: EmailStatus;
  pivaStatus: PivaStatus;
  passwordStrength: PasswordStrength | null;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isVerifyingPiva: boolean;
  customerNumber: string;
  isOnline: boolean;
  pendingSync: boolean;
  hasRestorableData: boolean;
  showRestoreModal: boolean;
  passkeySupported: boolean;
  passkeyAvailable: boolean;
  abVariant: string | null;
}

type FormAction =
  | { type: "SET_STEP"; step: Step; direction?: number }
  | { type: "SET_EMAIL_STATUS"; status: EmailStatus }
  | { type: "SET_PIVA_STATUS"; status: PivaStatus }
  | { type: "SET_PASSWORD_STRENGTH"; strength: PasswordStrength | null }
  | { type: "TOGGLE_PASSWORD_VISIBILITY" }
  | { type: "TOGGLE_CONFIRM_PASSWORD_VISIBILITY" }
  | { type: "SET_VERIFYING_PIVA"; verifying: boolean }
  | { type: "SET_STATUS"; status: FormStatus }
  | { type: "SET_CUSTOMER_NUMBER"; number: string }
  | { type: "SET_ONLINE"; isOnline: boolean }
  | { type: "SET_PENDING_SYNC"; pending: boolean }
  | { type: "SET_RESTORABLE_DATA"; hasData: boolean }
  | { type: "SET_SHOW_RESTORE_MODAL"; show: boolean }
  | { type: "SET_PASSKEY_SUPPORTED"; supported: boolean }
  | { type: "SET_PASSKEY_AVAILABLE"; available: boolean }
  | { type: "SET_AB_VARIANT"; variant: string | null }
  | { type: "RESET_FORM" };

const initialState: FormState = {
  step: 1,
  direction: 0,
  status: "idle",
  emailStatus: "idle",
  pivaStatus: "idle",
  passwordStrength: null,
  showPassword: false,
  showConfirmPassword: false,
  isVerifyingPiva: false,
  customerNumber: "",
  isOnline: true,
  pendingSync: false,
  hasRestorableData: false,
  showRestoreModal: false,
  passkeySupported: false,
  passkeyAvailable: false,
  abVariant: null,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        step: action.step,
        direction: action.direction ?? (action.step > state.step ? 1 : -1),
      };
    case "SET_EMAIL_STATUS":
      return { ...state, emailStatus: action.status };
    case "SET_PIVA_STATUS":
      return { ...state, pivaStatus: action.status };
    case "SET_PASSWORD_STRENGTH":
      return { ...state, passwordStrength: action.strength };
    case "TOGGLE_PASSWORD_VISIBILITY":
      return { ...state, showPassword: !state.showPassword };
    case "TOGGLE_CONFIRM_PASSWORD_VISIBILITY":
      return { ...state, showConfirmPassword: !state.showConfirmPassword };
    case "SET_VERIFYING_PIVA":
      return { ...state, isVerifyingPiva: action.verifying };
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "SET_CUSTOMER_NUMBER":
      return { ...state, customerNumber: action.number };
    case "SET_ONLINE":
      return { ...state, isOnline: action.isOnline };
    case "SET_PENDING_SYNC":
      return { ...state, pendingSync: action.pending };
    case "SET_RESTORABLE_DATA":
      return { ...state, hasRestorableData: action.hasData };
    case "SET_SHOW_RESTORE_MODAL":
      return { ...state, showRestoreModal: action.show };
    case "SET_PASSKEY_SUPPORTED":
      return { ...state, passkeySupported: action.supported };
    case "SET_PASSKEY_AVAILABLE":
      return { ...state, passkeyAvailable: action.available };
    case "SET_AB_VARIANT":
      return { ...state, abVariant: action.variant };
    case "RESET_FORM":
      return initialState;
    default:
      return state;
  }
}

const FormContext = createContext<FormContextType | null>(null);

function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within FormProvider");
  }
  return context;
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
class FormErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Form Error:", error, errorInfo);
    errorTracker.captureError(error, { errorInfo });
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-[900px] h-[900px] bg-white/80 backdrop-blur-3xl rounded-[40px] shadow-2xl border border-white/50 p-10 flex flex-col items-center justify-center text-center"
        >
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-semibold text-apple-dark mb-2">
            Si è verificato un errore
          </h3>
          <p className="text-apple-gray mb-8 max-w-md">
            Non siamo riusciti a caricare il form. I tuoi dati sono al sicuro.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => window.location.reload()}
              className="h-12 px-6 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-apple-lg"
            >
              Ricarica il form
            </Button>
            <Button
              onClick={() => (window.location.href = "/dashboard")}
              variant="outline"
              className="h-12 px-6 rounded-apple-lg border-apple-border"
            >
              Torna alla dashboard
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left overflow-auto max-w-full">
              <p className="text-xs font-mono text-red-600">
                {this.state.error.message}
              </p>
            </div>
          )}
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// GLASSMORPHISM LOADER
// ============================================================================
const GlassmorphismLoader = memo(() => (
  <div className="flex items-center justify-center h-full">
    <motion.div
      className="relative"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
    >
      <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-apple-blue" />
    </motion.div>
  </div>
));
GlassmorphismLoader.displayName = "GlassmorphismLoader";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const getPasswordStrengthColor = (score: number): string => {
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#15803d"];
  return colors[score] || colors[0];
};

const getPasswordStrengthLabel = (score: number): string => {
  const labels = ["Molto debole", "Debole", "Media", "Forte", "Eccellente"];
  return labels[score] || labels[0];
};

const validatePIVA = (piva: string): boolean => {
  if (!piva || piva.length !== 11) return false;
  if (!/^\d{11}$/.test(piva)) return false;

  let x = 0;
  let y = 0;
  for (let i = 0; i < 11; i++) {
    const num = parseInt(piva.charAt(i), 10);
    if ((i + 1) % 2 === 0) {
      x += num;
    } else {
      let d = num * 2;
      y += d > 9 ? d - 9 : d;
    }
  }
  const t = (x + y) % 10;
  const c = (10 - t) % 10;
  return c === 0;
};

const generateCustomerNumber = (): string => {
  const prefix = "MM";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 250 : -250,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 250 : -250,
    opacity: 0,
    transition: { duration: 0.25 },
  }),
};

// ============================================================================
// MEMOIZED INPUT COMPONENT
// ============================================================================
interface MemoizedInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}

const MemoizedInput = memo(
  ({ value, onChange, error, placeholder, type = "text", icon }: MemoizedInputProps) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray">
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-14 bg-white/50 border-apple-border rounded-apple-lg transition-all duration-200",
            "focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20",
            icon && "pl-12",
            error && "border-red-500 focus:border-red-500"
          )}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.error === next.error &&
    prev.placeholder === next.placeholder
);
MemoizedInput.displayName = "MemoizedInput";

// ============================================================================
// DEBOUNCED FIELD HOOK
// ============================================================================
function useDebouncedField(field: string, delay: number = 300) {
  const [value, setValue] = useState("");
  const [debouncedValue] = useDebounce(value, delay);

  useEffect(() => {
    // Validazione/AI call solo su debounced
    if (debouncedValue) {
      validateField(field, debouncedValue);
    }
  }, [debouncedValue, field]);

  return [value, setValue, debouncedValue] as const;
}

async function validateField(field: string, value: string): Promise<boolean> {
  // Simulazione validazione asincrona
  await new Promise((resolve) => setTimeout(resolve, 50));
  return value.length > 0;
}

// ============================================================================
// SMART DEFAULTS BADGE
const SmartDefaultsBadge = memo(() => {
  const defaults = useSmartDefaults();
  if (defaults.isLoading) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/60 backdrop-blur-sm rounded-full text-xs text-gray-600 border border-white/50 shadow-sm"
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{defaults.location?.city ? `📍 ${defaults.location.city}` : `📍 ${defaults.deviceType}`}</span>
    </motion.div>
  );
});
SmartDefaultsBadge.displayName = 'SmartDefaultsBadge';

// SKIP LINK COMPONENT (A11y)
// ============================================================================
const SkipLink = memo(() => (
  <a
    href="#form-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-apple-blue text-white px-4 py-2 rounded-lg"
  >
    Salta al contenuto del form
  </a>
));
SkipLink.displayName = "SkipLink";

// ============================================================================
// STEP COMPONENTS
// ============================================================================
const Step1Credentials = memo(() => {
  const { form, state, dispatch } = useFormContext();
  const { announceFieldSuccess, announceFieldError } = useFormAnnouncer({
    formName: "customer-form",
    totalSteps: 4,
  });

  const email = form.watch("email");
  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");

  const [debouncedEmail] = useDebounce(email, 500);

  // Debounced email validation
  useEffect(() => {
    const checkEmail = async () => {
      if (!debouncedEmail || !emailSchema.safeParse(debouncedEmail).success) {
        dispatch({ type: "SET_EMAIL_STATUS", status: "idle" });
        return;
      }

      dispatch({ type: "SET_EMAIL_STATUS", status: "checking" });

      try {
        // Simulate API call - replace with actual API
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (debouncedEmail.toLowerCase().includes("taken")) {
          dispatch({ type: "SET_EMAIL_STATUS", status: "taken" });
          announceFieldError("email", "Email già registrata");
        } else {
          dispatch({ type: "SET_EMAIL_STATUS", status: "available" });
          announceFieldSuccess("email");
        }
      } catch (error) {
        dispatch({ type: "SET_EMAIL_STATUS", status: "idle" });
      }
    };

    checkEmail();
  }, [debouncedEmail, dispatch, announceFieldSuccess, announceFieldError]);

  // Password strength calculation
  useEffect(() => {
    const calculateStrength = async () => {
      if (!password || password.length < 1) {
        dispatch({ type: "SET_PASSWORD_STRENGTH", strength: null });
        return;
      }

      try {
        const result = await zxcvbnAsync(password);
        dispatch({
          type: "SET_PASSWORD_STRENGTH",
          strength: {
            score: result.score,
            feedback: result.feedback,
            crackTimeDisplay:
              result.crackTimesDisplay.offlineSlowHashing1e4PerSecond,
          },
        });
      } catch (error) {
        dispatch({ type: "SET_PASSWORD_STRENGTH", strength: null });
      }
    };

    calculateStrength();
  }, [password, dispatch]);

  const passwordRequirements = useMemo(
    () => [
      { label: "Almeno 8 caratteri", met: password?.length >= 8 },
      { label: "Una maiuscola", met: /[A-Z]/.test(password || "") },
      { label: "Una minuscola", met: /[a-z]/.test(password || "") },
      { label: "Un numero", met: /[0-9]/.test(password || "") },
      {
        label: "Un carattere speciale",
        met: /[^A-Za-z0-9]/.test(password || ""),
      },
    ],
    [password]
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-semibold text-apple-dark mb-2">
          Credenziali di accesso
        </h2>
        <p className="text-apple-gray text-body">
          Crea le credenziali per il tuo account MechMind
        </p>
      </motion.div>

      {/* Email Field */}
      <motion.div variants={itemVariants}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-apple-dark font-medium">Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray" />
                  <Input
                    {...field}
                    type="email"
                    placeholder="nome@esempio.it"
                    className={cn(
                      "pl-12 pr-12 h-14 text-body bg-white/50 border-apple-border rounded-apple-lg",
                      "focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20",
                      "transition-all duration-200",
                      state.emailStatus === "available" &&
                        "border-green-500 focus:border-green-500",
                      state.emailStatus === "taken" &&
                        "border-red-500 focus:border-red-500"
                    )}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {state.emailStatus === "checking" && (
                      <Loader2 className="w-5 h-5 text-apple-blue animate-spin" />
                    )}
                    {state.emailStatus === "available" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    {state.emailStatus === "taken" && (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </motion.div>

      {/* Password Field */}
      <motion.div variants={itemVariants}>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-apple-dark font-medium">
                Password
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray" />
                  <Input
                    {...field}
                    type={state.showPassword ? "text" : "password"}
                    placeholder="Crea una password sicura"
                    className="pl-12 pr-12 h-14 text-body bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "TOGGLE_PASSWORD_VISIBILITY" })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-apple-gray hover:text-apple-dark transition-colors"
                  >
                    {state.showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </FormControl>

              {/* Password Strength Bar */}
              {state.passwordStrength && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-apple-gray">
                        Sicurezza:{" "}
                        <span
                          style={{
                            color: getPasswordStrengthColor(
                              state.passwordStrength.score
                            ),
                          }}
                        >
                          {getPasswordStrengthLabel(state.passwordStrength.score)}
                        </span>
                      </span>
                      <span className="text-xs text-apple-gray">
                        Crack: ~{state.passwordStrength.crackTimeDisplay}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: getPasswordStrengthColor(
                            state.passwordStrength.score
                          ),
                          width: `${(state.passwordStrength.score + 1) * 20}%`,
                        }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(state.passwordStrength.score + 1) * 20}%`,
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </FormItem>
          )}
        />

        {/* Password Requirements Checklist */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 grid grid-cols-2 gap-2"
        >
          {passwordRequirements.map((req, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors duration-200",
                req.met ? "text-green-600" : "text-apple-gray"
              )}
            >
              <motion.div
                initial={false}
                animate={req.met ? { scale: [1, 1.2, 1] } : {}}
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                  req.met ? "bg-green-500" : "border border-gray-300"
                )}
              >
                {req.met && <Check className="w-2.5 h-2.5 text-white" />}
              </motion.div>
              <span className="text-xs">{req.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Confirm Password Field */}
      <motion.div variants={itemVariants}>
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-apple-dark font-medium">
                Conferma Password
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray" />
                  <Input
                    {...field}
                    type={state.showConfirmPassword ? "text" : "password"}
                    placeholder="Ripeti la password"
                    className={cn(
                      "pl-12 pr-12 h-14 text-body bg-white/50 border-apple-border rounded-apple-lg",
                      "focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20",
                      "transition-all duration-200",
                      confirmPassword &&
                        confirmPassword === password &&
                        "border-green-500 focus:border-green-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "TOGGLE_CONFIRM_PASSWORD_VISIBILITY" })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-apple-gray hover:text-apple-dark transition-colors"
                  >
                    {state.showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </FormControl>
              {confirmPassword && confirmPassword === password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-green-600 flex items-center gap-1 mt-1"
                >
                  <Check className="w-4 h-4" />
                  Password coincidente
                </motion.p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </motion.div>

      {/* Phone Field */}
      <motion.div variants={itemVariants}>
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-apple-dark font-medium">
                Telefono
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray z-10" />
                  <PhoneInput
                    international
                    defaultCountry="IT"
                    countries={[
                      "IT",
                      "FR",
                      "DE",
                      "ES",
                      "GB",
                      "US",
                      "CH",
                      "AT",
                      "NL",
                      "BE",
                      "PT",
                      "PL",
                      "RO",
                      "GR",
                      "CZ",
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    className="phone-input-premium"
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs text-apple-gray">
                Riceverai un SMS di verifica
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </motion.div>
    </motion.div>
  );
});
Step1Credentials.displayName = "Step1Credentials";

// ============================================================================
// MAIN COMPONENT
// ============================================================================
interface CustomerFormPremiumIntegratedProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CustomerFormPremiumIntegrated: React.FC<
  CustomerFormPremiumIntegratedProps
> = ({ onSuccess, onCancel }) => {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotionPref();
  const [state, dispatch] = useReducer(formReducer, initialState);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      customerType: "private",
      firstName: "",
      lastName: "",
      fiscalCode: "",
      companyName: "",
      companyType: "",
      vatNumber: "",
      pec: "",
      sdiCode: "",
      address: "",
      city: "",
      province: "",
      zipCode: "",
      consentData: false,
      consentPrivacy: false,
      consentNewsletter: false,
      consentMarketing: false,
      marketingChannels: {
        email: false,
        sms: false,
        whatsapp: false,
        phone: false,
      },
      consentProfiling: false,
      consentPartners: false,
      confirmData: false,
      usePasskey: false,
    },
    mode: "onChange",
  });

  // Hooks
  const { announceStepChange, announceFormSuccess, announceFormError } =
    useFormAnnouncer({ formName: "customer-form", totalSteps: 4 });

  const funnel = useFormFunnel("customer-form-premium");
  const { isCelebrating, trigger: triggerCelebration, stop: stopCelebration } = useCelebration();
  const smartDefaults = useSmartDefaults();

  const { variant: abVariant } = useExperiment("form-headline-001");

  const persistence = useFormPersistence(form, {
    formId: "customer-form-premium",
    version: 1,
    expirationDays: 7,
    autoSaveInterval: 30000,
    onRestore: () => {
      analytics.track("Form Restored", {});
    },
  });

  const offlineQueue = useOfflineQueue({
    formId: "customer-form-premium",
    onSyncStart: () => dispatch({ type: "SET_PENDING_SYNC", pending: true }),
    onSyncComplete: () => dispatch({ type: "SET_PENDING_SYNC", pending: false }),
  });

  // Context value memoized
  const contextValue = useMemo(
    () => ({ state, dispatch, form }),
    [state, form]
  );

  // Check passkey support
  useEffect(() => {
    const checkPasskeySupport = async () => {
      const supported = isWebAuthnSupported();
      dispatch({ type: "SET_PASSKEY_SUPPORTED", supported });

      if (supported) {
        const available = await isPlatformAuthenticatorAvailable();
        dispatch({ type: "SET_PASSKEY_AVAILABLE", available });
      }
    };

    checkPasskeySupport();
  }, []);

  // Auto-fill smart defaults from IP geolocation
  useEffect(() => {
    if (smartDefaults.isLoading || !smartDefaults.location) return;
    
    const { location } = smartDefaults;
    
    // Only fill if fields are empty
    if (location.zip && !form.getValues('zipCode')) {
      form.setValue('zipCode', location.zip, { shouldValidate: false });
    }
    if (location.city && !form.getValues('city')) {
      form.setValue('city', location.city, { shouldValidate: false });
    }
    if (location.region && !form.getValues('province')) {
      // Extract province code from region if possible
      const province = location.region.substring(0, 2).toUpperCase();
      form.setValue('province', province, { shouldValidate: false });
    }
  }, [smartDefaults, form]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: "SET_ONLINE", isOnline: true });
      offlineQueue.sync();
    };
    const handleOffline = () => dispatch({ type: "SET_ONLINE", isOnline: false });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [offlineQueue]);

  // Track step changes
  useEffect(() => {
    const stepTitles: Record<Step, string> = {
      1: "Credenziali di accesso",
      2: "Dati cliente",
      3: "Consensi privacy",
      4: "Riepilogo",
    };
    announceStepChange(state.step, stepTitles[state.step]);
    funnel.startStep(state.step, stepTitles[state.step]);
  }, [state.step, announceStepChange, funnel]);

  // A/B Test variant
  useEffect(() => {
    if (abVariant) {
      dispatch({ type: "SET_AB_VARIANT", variant: abVariant });
      abTesting.trackEvent("form-headline-001", "variant_shown", {
        variant: abVariant,
      });
    }
  }, [abVariant]);

  // Progress calculation
  const progress = useMemo(() => ((state.step - 1) / 3) * 100, [state.step]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const isValid = await form.trigger();
    if (isValid && state.step < 4) {
      funnel.completeStep(state.step, Object.keys(form.getValues()));
      dispatch({ type: "SET_STEP", step: ((state.step + 1) as Step) });
    }
  }, [form, state.step, funnel]);

  const handleBack = useCallback(() => {
    if (state.step > 1) {
      dispatch({ type: "SET_STEP", step: ((state.step - 1) as Step) });
    } else if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }, [state.step, onCancel, router]);

  const handleSubmit = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      announceFormError("Controlla i campi evidenziati");
      return;
    }

    dispatch({ type: "SET_STATUS", status: "submitting" });

    const values = form.getValues();
    const customerNumber = generateCustomerNumber();

    try {
      // If offline, queue the submission
      if (!state.isOnline) {
        offlineQueue.saveOffline({
          ...values,
          customerNumber,
        });
        dispatch({ type: "SET_STATUS", status: "success" });
        dispatch({ type: "SET_CUSTOMER_NUMBER", number: customerNumber });
        announceFormSuccess();
        funnel.completeForm(customerNumber, values.customerType);
        triggerCelebration();
        onSuccess?.();
        return;
      }

      // Simulate API call - replace with actual API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Handle passkey registration if requested
      if (values.usePasskey && state.passkeySupported) {
        try {
          const challenge = "mock-challenge"; // Replace with actual server challenge
          await registerPasskey({
            userId: customerNumber,
            email: values.email,
            challenge,
          });
          analytics.track("Passkey Registered", {});
        } catch (passkeyError) {
          console.error("Passkey registration failed:", passkeyError);
        }
      }

      dispatch({ type: "SET_STATUS", status: "success" });
      dispatch({ type: "SET_CUSTOMER_NUMBER", number: customerNumber });
      announceFormSuccess();
      funnel.completeForm(customerNumber, values.customerType);
      persistence.clearSavedData();
      onSuccess?.();
    } catch (error) {
      dispatch({ type: "SET_STATUS", status: "error" });
      announceFormError("Errore durante la registrazione");
      errorTracker.captureError(error as Error, { step: state.step });
    }
  }, [
    form,
    state.isOnline,
    state.step,
    state.passkeySupported,
    offlineQueue,
    funnel,
    announceFormSuccess,
    announceFormError,
    persistence,
    onSuccess,
  ]);

  // Success view
  if (state.status === "success") {
    return (
      <div className="min-h-[calc(100vh-2.25rem)] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="relative w-[min(900px,95vw)] h-[min(900px,95vh)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 p-10 flex flex-col justify-center"
          >
            <SuccessView
              email={form.getValues("email")}
              customerNumber={state.customerNumber}
              onGoToDashboard={() => (window.location.href = "/dashboard")}
              onCreateNew={() => {
                form.reset();
                dispatch({ type: "RESET_FORM" });
              }}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfettiCelebration isActive={isCelebrating} onComplete={stopCelebration} />
      <FormErrorBoundary>
      <FormContext.Provider value={contextValue}>
        {/* Main Container - Big Tech Layout (No Fixed Positioning) */}
        <div className="min-h-[calc(100vh-2.25rem)] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="relative w-[min(900px,95vw)] h-[min(900px,95vh)]">
            
            {/* Background Icon/Illustration */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-br from-blue-100/40 via-purple-100/30 to-pink-100/40 blur-3xl" />
              <motion.div 
                className="absolute pointer-events-none"
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                <User className="w-[45%] h-[45%] text-blue-200/30" strokeWidth={0.5} />
              </motion.div>
            </div>
            
            {/* Glass Card Container */}
            <motion.div 
              className="relative w-full h-full bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 overflow-hidden flex flex-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
          <SkipLink />
          <SmartDefaultsBadge />

          {/* Offline Indicator */}
          {!state.isOnline && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-700 text-sm">
              <WifiOff className="w-4 h-4" />
              <span>Sei offline. I dati verranno sincronizzati automaticamente.</span>
            </div>
          )}

          {/* Progress Header */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-100 p-6 border-b border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-semibold text-apple-dark">
                {abVariant === "variant-a"
                  ? "Crea il tuo account in 4 semplici passi"
                  : "Nuovo Cliente"}
              </h1>
              <Badge variant="secondary" className="text-sm">
                Step {state.step} di 4
              </Badge>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-apple-blue to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.4,
                  ease: [0.4, 0, 0.2, 1],
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-apple-gray">
              <span className={state.step >= 1 ? "text-apple-blue font-medium" : ""}>
                Credenziali
              </span>
              <span className={state.step >= 2 ? "text-apple-blue font-medium" : ""}>
                Dati
              </span>
              <span className={state.step >= 3 ? "text-apple-blue font-medium" : ""}>
                Privacy
              </span>
              <span className={state.step >= 4 ? "text-apple-blue font-medium" : ""}>
                Riepilogo
              </span>
            </div>
          </div>

          {/* Form Content */}
          <div id="form-content" className="flex-1 p-10 overflow-y-auto">
            <Form {...form}>
              <form className="space-y-6">
                <AnimatePresence mode="wait" custom={state.direction}>
                  <motion.div
                    key={state.step}
                    custom={state.direction}
                    variants={prefersReducedMotion ? {} : slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {state.step === 1 && <Step1Credentials />}
                    {state.step === 2 && <Step2Data />}
                    {state.step === 3 && <Step3Privacy />}
                    {state.step === 4 && (
                      <Step4Review onSubmit={handleSubmit} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </form>
            </Form>
          </div>

          {/* Navigation Footer */}
          <div className="p-6 bg-gradient-to-r from-slate-50 to-gray-100 border-t border-gray-100">
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="h-12 px-6 rounded-apple-lg border-apple-border"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                {state.step === 1 ? "Annulla" : "Indietro"}
              </Button>

              {state.step < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="h-12 px-8 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-apple-lg font-medium"
                >
                  Avanti
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={state.status === "submitting"}
                  className="h-14 px-10 bg-gradient-to-r from-apple-blue to-blue-600 hover:from-apple-blue-hover hover:to-blue-700 text-white rounded-apple-lg font-semibold text-lg shadow-lg shadow-blue-500/30"
                >
                  {state.status === "submitting" ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creazione in corso...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Crea il mio account MechMind
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* CSS for Phone Input */}
          <style jsx global>{`
            .phone-input-premium {
              --react-phone-number-input-height: 56px;
              --react-phone-number-input-border-radius: 20px;
              --react-phone-number-input-padding-horizontal: 48px;
              --react-phone-number-input-border-color: #d2d2d7;
              --react-phone-number-input-focus-border-color: #0071e3;
            }

            .phone-input-premium input {
              height: 56px !important;
              border-radius: 20px !important;
              padding-left: 48px !important;
              padding-right: 16px !important;
              background: rgba(255, 255, 255, 0.5) !important;
              border: 1px solid #d2d2d7 !important;
              font-size: 17px !important;
              transition: all 0.2s ease !important;
            }

            .phone-input-premium input:focus {
              border-color: #0071e3 !important;
              box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.2) !important;
              outline: none !important;
            }

            .phone-input-premium .PhoneInputCountry {
              position: absolute;
              left: 48px;
              z-index: 10;
            }

            .phone-input-premium .PhoneInputInput {
              padding-left: 80px !important;
            }
          `}</style>
            </motion.div>
          </div>
        </div>

        {/* Debug Panel (solo dev) */}
        {process.env.NODE_ENV === "development" && (
          <Suspense fallback={null}>
            <div className="fixed bottom-4 right-4 z-50">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/80 backdrop-blur"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                  <FormAnalyticsDashboard formId="customer-form-premium" />
                </DialogContent>
              </Dialog>
            </div>
          </Suspense>
        )}

        {/* Restore Data Modal */}
        <DataRestoreModal
          isOpen={persistence.showRestoreModal}
          onClose={persistence.dismissRestoreModal}
          onRestore={persistence.restoreForm}
          onClear={persistence.clearSavedData}
          lastSavedText={persistence.lastSavedText}
          daysSinceSave={persistence.daysSinceSave}
        />
      </FormContext.Provider>
    </FormErrorBoundary>
    </>
  );
};

// ============================================================================
// SUCCESS VIEW COMPONENT
// ============================================================================
const SuccessView = memo(
  ({
    email,
    customerNumber,
    onGoToDashboard,
    onCreateNew,
  }: {
    email: string;
    customerNumber: string;
    onGoToDashboard: () => void;
    onCreateNew: () => void;
  }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center py-8"
    >
      <CheckmarkAnimation />

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-apple-dark mb-4"
      >
        Benvenuto nella famiglia MechMind! 🎉
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-apple-lg inline-block">
          <p className="text-sm text-apple-gray mb-1">Numero cliente</p>
          <p className="text-2xl font-bold text-apple-blue tracking-wider">
            {customerNumber}
          </p>
        </div>

        <p className="text-apple-gray">
          Abbiamo inviato un&apos;email di conferma a{" "}
          <strong className="text-apple-dark">{email}</strong>
        </p>

        <p className="text-sm text-apple-gray">
          Clicca sul link nella email per attivare il tuo account
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
      >
        <Button
          onClick={onGoToDashboard}
          className="h-14 px-8 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-apple-lg font-medium"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Vai alla dashboard
        </Button>
        <Button
          onClick={onCreateNew}
          variant="outline"
          className="h-14 px-8 border-apple-border rounded-apple-lg font-medium"
        >
          <User className="w-5 h-5 mr-2" />
          Crea nuovo cliente
        </Button>
      </motion.div>
    </motion.div>
  )
);
SuccessView.displayName = "SuccessView";

// ============================================================================
// CHECKMARK ANIMATION COMPONENT
// ============================================================================
const CheckmarkAnimation = memo(() => (
  <motion.div
    className="w-32 h-32 mx-auto mb-6"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 15 }}
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="#22c55e"
        strokeWidth="4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <motion.path
        d="M30 52 L45 67 L70 35"
        fill="none"
        stroke="#22c55e"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
      />
    </svg>
  </motion.div>
));
CheckmarkAnimation.displayName = "CheckmarkAnimation";

// ============================================================================
// STEP 2: DATA COMPONENT
// ============================================================================
const Step2Data = memo(() => {
  const { form, state, dispatch } = useFormContext();
  const customerType = form.watch("customerType");
  const vatNumber = form.watch("vatNumber");

  const handleVerifyPiva = useCallback(async () => {
    if (!vatNumber || vatNumber.length !== 11) return;

    dispatch({ type: "SET_VERIFYING_PIVA", verifying: true });
    dispatch({ type: "SET_PIVA_STATUS", status: "checking" });

    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (validatePIVA(vatNumber)) {
      dispatch({ type: "SET_PIVA_STATUS", status: "valid" });
      form.setValue("companyName", "Rossi S.r.l.");
      form.setValue("address", "Via Roma 123");
      form.setValue("city", "Milano");
      form.setValue("province", "MI");
      form.setValue("zipCode", "20121");
      form.setValue("pec", "rossisrl@pec.it");
    } else {
      dispatch({ type: "SET_PIVA_STATUS", status: "invalid" });
    }

    dispatch({ type: "SET_VERIFYING_PIVA", verifying: false });
  }, [vatNumber, form, dispatch]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-semibold text-apple-dark mb-2">
          Dati cliente
        </h2>
        <p className="text-apple-gray text-body">
          Inserisci i dati anagrafici del cliente
        </p>
      </motion.div>

      {/* Customer Type Selection */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => form.setValue("customerType", "private")}
          className={cn(
            "p-6 rounded-apple-lg border-2 transition-all duration-200 flex flex-col items-center gap-3",
            customerType === "private"
              ? "border-apple-blue bg-apple-blue/5"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <User
            className={cn(
              "w-8 h-8",
              customerType === "private" ? "text-apple-blue" : "text-apple-gray"
            )}
          />
          <span
            className={cn(
              "font-medium",
              customerType === "private"
                ? "text-apple-blue"
                : "text-apple-dark"
            )}
          >
            Privato
          </span>
        </button>

        <button
          type="button"
          onClick={() => form.setValue("customerType", "business")}
          className={cn(
            "p-6 rounded-apple-lg border-2 transition-all duration-200 flex flex-col items-center gap-3",
            customerType === "business"
              ? "border-apple-blue bg-apple-blue/5"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <Building2
            className={cn(
              "w-8 h-8",
              customerType === "business"
                ? "text-apple-blue"
                : "text-apple-gray"
            )}
          />
          <span
            className={cn(
              "font-medium",
              customerType === "business"
                ? "text-apple-blue"
                : "text-apple-dark"
            )}
          >
            Azienda
          </span>
        </button>
      </motion.div>

      {/* Private Fields */}
      {customerType === "private" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-apple-dark font-medium">
                    Nome
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Mario"
                      className="h-14 bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-apple-dark font-medium">
                    Cognome
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Rossi"
                      className="h-14 bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="fiscalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-apple-dark font-medium">
                  Codice Fiscale{" "}
                  <span className="text-apple-gray font-normal">(opzionale)</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray" />
                    <Input
                      {...field}
                      placeholder="RSSMRA80A01H501U"
                      maxLength={16}
                      className="pl-12 h-14 bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 uppercase"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>
      )}

      {/* Business Fields */}
      {customerType === "business" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-apple-dark font-medium">
                  Ragione Sociale
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray" />
                    <Input
                      {...field}
                      placeholder="Rossi S.r.l."
                      className="pl-12 h-14 bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-apple-dark font-medium">
                  Tipo Azienda
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-14 bg-white/50 border-apple-border rounded-apple-lg">
                      <SelectValue placeholder="Seleziona tipo azienda" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ditta">Ditta Individuale</SelectItem>
                    <SelectItem value="srl">SRL</SelectItem>
                    <SelectItem value="spa">SPA</SelectItem>
                    <SelectItem value="snc">SNC</SelectItem>
                    <SelectItem value="sas">SAS</SelectItem>
                    <SelectItem value="coop">Cooperativa</SelectItem>
                    <SelectItem value="other">Altro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* P.IVA with verification */}
          <FormField
            control={form.control}
            name="vatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-apple-dark font-medium">
                  Partita IVA
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-apple-gray font-medium">
                      <span className="text-sm">IT</span>
                      <Separator orientation="vertical" className="h-4" />
                    </div>
                    <IMaskInput
                      {...field}
                      mask="IT 00000000000"
                      lazy={false}
                      placeholder="IT 12345678901"
                      className={cn(
                        "pl-4 pr-28 h-14 bg-white/50 border-apple-border rounded-apple-lg w-full",
                        "focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20",
                        "placeholder:text-gray-400",
                        state.pivaStatus === "valid" && "border-green-500",
                        state.pivaStatus === "invalid" && "border-red-500"
                      )}
                      onAccept={(value: string) => field.onChange(value.replace('IT ', ''))}
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyPiva}
                      disabled={
                        state.isVerifyingPiva ||
                        !field.value ||
                        field.value.length !== 11
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-3 text-xs"
                      variant="outline"
                    >
                      {state.isVerifyingPiva ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Verifica"
                      )}
                    </Button>
                  </div>
                </FormControl>
                {state.pivaStatus === "valid" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-1"
                  >
                    <BadgeCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">
                      ✓ Verificata Agenzia Entrate
                    </span>
                  </motion.div>
                )}
                {state.pivaStatus === "invalid" && (
                  <p className="text-sm text-red-500 mt-1">
                    Partita IVA non valida
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>
      )}

      {/* Address Fields (Common) */}
      <motion.div variants={itemVariants} className="space-y-4 pt-4">
        <Separator />
        <h3 className="font-medium text-apple-dark">Indirizzo</h3>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-apple-dark font-medium">
                Via / Piazza
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray" />
                  <Input
                    {...field}
                    placeholder="Via Roma 123"
                    className="pl-12 h-14 bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-apple-dark font-medium">CAP</FormLabel>
                <FormControl>
                  <IMaskInput
                    {...field}
                    mask="00000"
                    lazy={true}
                    placeholder="20121"
                    className="h-14 bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 w-full placeholder:text-gray-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel className="text-apple-dark font-medium">Città</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Milano"
                    className="h-14 bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="province"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-apple-dark font-medium">
                Provincia
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="MI"
                  maxLength={2}
                  className="h-14 bg-white/50 border-apple-border rounded-apple-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 uppercase"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </motion.div>
    </motion.div>
  );
});
Step2Data.displayName = "Step2Data";

// ============================================================================
// STEP 3: PRIVACY COMPONENT
// ============================================================================
const Step3Privacy = memo(() => {
  const { form } = useFormContext();
  const consentMarketing = form.watch("consentMarketing");

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-semibold text-apple-dark mb-2">
          Consensi privacy
        </h2>
        <p className="text-apple-gray text-body">
          Gestisci i tuoi consensi per il trattamento dei dati
        </p>
      </motion.div>

      {/* Trust Signals Banner */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-apple-lg border border-blue-100"
      >
        <div className="flex items-center gap-3 text-sm text-blue-800">
          <LockKeyhole className="w-5 h-5" />
          <span>
            🔒 Crittografia AES-256 | ✅ GDPR Compliant | 🛡️ ISO 27001
          </span>
        </div>
      </motion.div>

      {/* Consents */}
      <motion.div variants={itemVariants} className="space-y-3">
        {/* Mandatory: Data Treatment */}
        <FormField
          control={form.control}
          name="consentData"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-apple-lg border border-apple-border bg-white/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-medium text-apple-dark">
                  Accetto il trattamento dei dati per registrazione account{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormDescription className="text-xs text-apple-gray">
                  Necessario per creare e gestire il tuo account
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Mandatory: Privacy Policy */}
        <FormField
          control={form.control}
          name="consentPrivacy"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-apple-lg border border-apple-border bg-white/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-medium text-apple-dark">
                  Accetto la Privacy Policy{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-xs text-apple-blue hover:underline"
                    >
                      Leggi la Privacy Policy
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">
                        Privacy Policy
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm text-gray-600">
                      <p>
                        <strong>1. Titolare del trattamento</strong>
                        <br />
                        MechMind S.r.l. - Via Esempio 123, Milano
                      </p>
                      <p>
                        <strong>2. Finalità del trattamento</strong>
                        <br />
                        I dati raccolti sono utilizzati per la gestione del tuo
                        account, l&apos;erogazione dei servizi e il rispetto degli
                        obblighi legali.
                      </p>
                      <p>
                        <strong>3. Base giuridica</strong>
                        <br />
                        Esecuzione di un contratto, obblighi legali, consenso
                        dell&apos;interessato.
                      </p>
                      <p>
                        <strong>4. Diritti dell&apos;interessato</strong>
                        <br />
                        Hai diritto di accesso, retifica, cancellazione,
                        limitazione, opposizione e portabilità dei dati.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </FormItem>
          )}
        />

        <Separator className="my-4" />

        {/* Optional: Newsletter */}
        <FormField
          control={form.control}
          name="consentNewsletter"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-apple-lg border border-apple-border bg-white/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-medium text-apple-dark">
                  Newsletter con offerte e novità
                </FormLabel>
                <FormDescription className="text-xs text-apple-gray">
                  Ricevi aggiornamenti su promozioni e nuovi servizi
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Optional: Marketing */}
        <FormField
          control={form.control}
          name="consentMarketing"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-apple-lg border border-apple-border bg-white/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-medium text-apple-dark">
                  Marketing personalizzato
                </FormLabel>
                <FormDescription className="text-xs text-apple-gray">
                  Ricevi comunicazioni personalizzate in base alle tue
                  preferenze
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Marketing Channels (conditional) */}
        <AnimatePresence>
          {consentMarketing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-7 pl-4 border-l-2 border-apple-border space-y-3"
            >
              <p className="text-sm text-apple-gray">Scegli i canali:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "email", label: "Email", icon: Mail },
                  { key: "sms", label: "SMS", icon: MessageSquare },
                  { key: "whatsapp", label: "WhatsApp", icon: Phone },
                  { key: "phone", label: "Telefono", icon: Phone },
                ].map(({ key, label, icon: Icon }) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={`marketingChannels.${key}` as const}
                    render={({ field: channelField }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={channelField.value}
                            onCheckedChange={channelField.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal flex items-center gap-1">
                          <Icon className="w-4 h-4" />
                          {label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional: Profiling */}
        <FormField
          control={form.control}
          name="consentProfiling"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-apple-lg border border-apple-border bg-white/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-medium text-apple-dark">
                  Profilazione per raccomandazioni personalizzate
                </FormLabel>
                <FormDescription className="text-xs text-apple-gray">
                  Permettici di analizzare le tue preferenze per suggerirti
                  servizi pertinenti
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </motion.div>
    </motion.div>
  );
});
Step3Privacy.displayName = "Step3Privacy";

// ============================================================================
// STEP 4: REVIEW COMPONENT
// ============================================================================
const Step4Review = memo(({ onSubmit }: { onSubmit: () => void }) => {
  const { form, state } = useFormContext();
  const values = form.getValues();
  const customerType = values.customerType;

  const sections = [
    {
      title: "Credenziali",
      icon: Lock,
      fields: [
        { label: "Email", value: values.email },
        { label: "Telefono", value: values.phone },
      ],
    },
    {
      title: customerType === "private" ? "Dati personali" : "Dati aziendali",
      icon: customerType === "private" ? User : Building2,
      fields:
        customerType === "private"
          ? [
              {
                label: "Nome",
                value: `${values.firstName} ${values.lastName}`,
              },
              ...(values.fiscalCode
                ? [{ label: "Codice Fiscale", value: values.fiscalCode }]
                : []),
            ]
          : [
              { label: "Ragione Sociale", value: values.companyName },
              {
                label: "Partita IVA",
                value: `IT ${values.vatNumber}`,
                verified: state.pivaStatus === "valid",
              },
              ...(values.pec ? [{ label: "PEC", value: values.pec }] : []),
            ],
    },
    {
      title: "Indirizzo",
      icon: MapPin,
      fields: [
        {
          label: "Indirizzo completo",
          value: `${values.address}, ${values.zipCode} ${values.city} (${values.province})`,
        },
      ],
    },
    {
      title: "Consensi",
      icon: Shield,
      fields: [
        { label: "Trattamento dati", value: "✓ Accettato" },
        { label: "Privacy Policy", value: "✓ Accettato" },
        ...(values.consentNewsletter
          ? [{ label: "Newsletter", value: "✓ Accettato" }]
          : []),
        ...(values.consentMarketing
          ? [{ label: "Marketing", value: "✓ Accettato" }]
          : []),
      ],
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-semibold text-apple-dark mb-2">
          Riepilogo
        </h2>
        <p className="text-apple-gray text-body">
          Verifica che tutti i dati siano corretti prima di procedere
        </p>
      </motion.div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {sections.map((section, index) => (
          <motion.div
            key={section.title}
            variants={itemVariants}
            className="bg-white/70 backdrop-blur rounded-apple-lg p-4 border border-apple-border"
          >
            <div className="flex items-center gap-2 mb-3">
              <section.icon className="w-5 h-5 text-apple-blue" />
              <h3 className="font-semibold text-apple-dark">{section.title}</h3>
            </div>
            <div className="space-y-2">
              {section.fields.map((field) => (
                <div key={field.label} className="flex justify-between text-sm">
                  <span className="text-apple-gray">{field.label}:</span>
                  <span className="font-medium flex items-center gap-2">
                    {field.value}
                    {"verified" in field && field.verified && (
                      <BadgeCheck className="w-4 h-4 text-green-600" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Final Confirmation */}
      <motion.div variants={itemVariants}>
        <FormField
          control={form.control}
          name="confirmData"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-apple-lg border border-apple-border bg-white/50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-medium text-apple-dark">
                  Confermo che tutti i dati inseriti sono corretti{" "}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormDescription className="text-xs text-apple-gray">
                  Dichiaro di aver verificato l&apos;accuratezza delle informazioni
                  fornite
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </motion.div>

      {/* Passkey Option */}
      {state.passkeyAvailable && (
        <motion.div variants={itemVariants}>
          <FormField
            control={form.control}
            name="usePasskey"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-apple-lg border border-green-200 bg-green-50/50">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-medium text-green-800">
                    🔐 Attiva accesso senza password (Passkey)
                  </FormLabel>
                  <FormDescription className="text-xs text-green-600">
                    Accedi con Face ID, Touch ID o PIN del dispositivo
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </motion.div>
      )}
    </motion.div>
  );
});
Step4Review.displayName = "Step4Review";

export default CustomerFormPremiumIntegrated;
