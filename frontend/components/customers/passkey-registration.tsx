"use client";

/**
 * Passkey Registration Component
 * Handles WebAuthn/FIDO2 passkey registration for passwordless authentication
 */

import React, { useState, useCallback, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  ScanFace,
  Smartphone,
  CheckCircle,
  X,
  Loader2,
  Shield,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  fetchRegistrationChallenge,
  savePasskeyToServer,
  getPasskeyErrorMessage,
  PasskeyError,
} from "@/lib/auth/webauthn";
import { analytics } from "@/lib/analytics/segment";

interface PasskeyRegistrationProps {
  userId: string;
  email: string;
  onSuccess?: () => void;
  onSkip?: () => void;
}

type RegistrationState =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "registering"
  | "success"
  | "error";

interface PasskeyInfo {
  platform: "ios" | "android" | "macos" | "windows" | "unknown";
  authenticatorType: "face" | "fingerprint" | "pin" | "unknown";
  deviceName: string;
}

function detectPlatform(): PasskeyInfo["platform"] {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  if (/macintosh|mac os x/.test(userAgent)) return "macos";
  if (/windows nt/.test(userAgent)) return "windows";
  return "unknown";
}

function getAuthenticatorIcon(type: PasskeyInfo["authenticatorType"]) {
  switch (type) {
    case "face":
      return ScanFace;
    case "fingerprint":
      return Fingerprint;
    default:
      return Smartphone;
  }
}

function getAuthenticatorName(platform: PasskeyInfo["platform"]) {
  const names: Record<string, { name: string; type: PasskeyInfo["authenticatorType"] }> = {
    ios: { name: "Face ID / Touch ID", type: "face" },
    android: { name: "Impronta digitale / PIN", type: "fingerprint" },
    macos: { name: "Touch ID", type: "fingerprint" },
    windows: { name: "Windows Hello", type: "face" },
    unknown: { name: "Autenticatore del dispositivo", type: "unknown" },
  };
  return names[platform] || names.unknown;
}

export const PasskeyRegistration = memo(function PasskeyRegistration({
  userId,
  email,
  onSuccess,
  onSkip,
}: PasskeyRegistrationProps) {
  const [state, setState] = useState<RegistrationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [passkeyInfo, setPasskeyInfo] = useState<PasskeyInfo | null>(null);

  // Check support on mount
  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    setState("checking");

    const supported = isWebAuthnSupported();
    if (!supported) {
      setState("unavailable");
      return;
    }

    const available = await isPlatformAuthenticatorAvailable();
    if (!available) {
      setState("unavailable");
      return;
    }

    const platform = detectPlatform();
    const { name, type } = getAuthenticatorName(platform);

    setPasskeyInfo({
      platform,
      authenticatorType: type,
      deviceName: name,
    });

    setState("available");
  };

  const handleRegister = async () => {
    setState("registering");
    setError(null);

    try {
      // Fetch challenge from server
      const challenge = await fetchRegistrationChallenge();

      // Register passkey
      const credentialData = await registerPasskey({
        userId,
        email,
        challenge,
      });

      // Save to server
      await savePasskeyToServer(credentialData, {
        deviceName: passkeyInfo?.deviceName,
        platform: passkeyInfo?.platform,
      });

      // Track success
      analytics.track("Passkey Registered", {
        platform: passkeyInfo?.platform,
        method: passkeyInfo?.authenticatorType,
      });

      setState("success");
      onSuccess?.();
    } catch (err) {
      console.error("Passkey registration failed:", err);
      setError(getPasskeyErrorMessage(err));
      setState("error");

      analytics.track("Passkey Registration Failed", {
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const Icon = passkeyInfo
    ? getAuthenticatorIcon(passkeyInfo.authenticatorType)
    : Smartphone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6"
    >
      <AnimatePresence mode="wait">
        {state === "checking" && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8"
          >
            <Loader2 className="w-12 h-12 text-apple-blue animate-spin mb-4" />
            <p className="text-gray-600">Verifica del dispositivo...</p>
          </motion.div>
        )}

        {state === "unavailable" && (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Dispositivo non supportato
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Il tuo dispositivo non supporta l&apos;autenticazione senza password.
              Puoi comunque usare email e password.
            </p>
            <Button onClick={onSkip} variant="outline" className="w-full">
              Continua con password
            </Button>
          </motion.div>
        )}

        {state === "available" && (
          <motion.div
            key="available"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Attiva l&apos;accesso senza password
                </h3>
                <p className="text-gray-500 text-sm">
                  Usa {passkeyInfo?.deviceName} per accedere in modo sicuro e
                  veloce al tuo account.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <span>Più sicuro della password</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Fingerprint className="w-4 h-4 text-blue-600" />
                </div>
                <span>Accesso istantaneo con biometria</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                </div>
                <span>Niente più password da ricordare</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRegister}
                className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium"
              >
                Attiva {passkeyInfo?.deviceName}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button onClick={onSkip} variant="ghost" className="h-12">
                Salta per ora
              </Button>
            </div>
          </motion.div>
        )}

        {state === "registering" && (
          <motion.div
            key="registering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8"
          >
            <div className="relative mb-6">
              <motion.div
                className="w-20 h-20 rounded-full border-4 border-blue-200"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Configurazione in corso...
            </h3>
            <p className="text-gray-500 text-center text-sm">
              Segui le istruzioni sul tuo dispositivo per completare la
              configurazione
            </p>
          </motion.div>
        )}

        {state === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Passkey attivato!
            </h3>
            <p className="text-gray-500 text-center text-sm mb-4">
              Da ora puoi accedere a MechMind usando {passkeyInfo?.deviceName}
            </p>
            <Button onClick={onSuccess} className="w-full">
              Continua
            </Button>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-6"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Attivazione fallita
            </h3>
            <p className="text-red-500 text-center text-sm mb-4">{error}</p>
            <div className="flex gap-3 w-full">
              <Button onClick={handleRegister} variant="outline" className="flex-1">
                Riprova
              </Button>
              <Button onClick={onSkip} variant="ghost" className="flex-1">
                Salta
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// Compact version for inline use in forms
export const PasskeyToggle = memo(function PasskeyToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supported = isWebAuthnSupported();
      if (supported) {
        const available = await isPlatformAuthenticatorAvailable();
        setIsAvailable(available);
      }
    };
    check();
  }, []);

  if (!isAvailable) return null;

  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left",
        checked
          ? "border-green-500 bg-green-50"
          : "border-gray-200 hover:border-gray-300 bg-white/50"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
          checked ? "bg-green-500" : "bg-gray-100"
        )}
      >
        {checked ? (
          <CheckCircle className="w-6 h-6 text-white" />
        ) : (
          <Fingerprint className="w-6 h-6 text-gray-500" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">Accesso senza password</p>
        <p className="text-sm text-gray-500">
          {checked
            ? "Passkey verrà attivato dopo la registrazione"
            : "Attiva per usare Face ID o impronta digitale"}
        </p>
      </div>
    </button>
  );
});

export default PasskeyRegistration;
