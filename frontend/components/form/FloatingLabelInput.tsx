'use client';

import { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const isActive = isFocused || (props.value && String(props.value).length > 0);

    return (
      <div className="relative mb-6">
        <div className="relative">
          {/* Icona sinistra */}
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              {icon}
            </div>
          )}

          {/* Input con animazione */}
          <motion.input
            ref={ref}
            {...props}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full bg-white/60 backdrop-blur-sm border rounded-xl px-4 py-4",
              "text-gray-900 placeholder-transparent",
              "focus:outline-none focus:ring-4 focus:ring-blue-500/20",
              "transition-all duration-200",
              icon && "pl-12",
              error 
                ? "border-red-300 focus:border-red-500" 
                : "border-gray-200 focus:border-blue-500",
              className
            )}
            animate={{
              scale: isFocused ? 1.02 : 1,
              boxShadow: isFocused 
                ? "0 0 0 4px rgba(59, 130, 246, 0.15)" 
                : "0 0 0 0px rgba(59, 130, 246, 0)"
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25
            }}
          />

          {/* Floating Label */}
          <motion.label
            className={cn(
              "absolute left-4 pointer-events-none origin-left",
              "text-gray-500 font-medium",
              icon && "left-12"
            )}
            animate={{
              y: isActive ? -32 : 16,
              scale: isActive ? 0.85 : 1,
              color: error 
                ? "#EF4444" 
                : isActive 
                  ? "#3B82F6" 
                  : "#6B7280",
              backgroundColor: isActive ? "rgba(255, 255, 255, 0.9)" : "transparent"
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
            style={{
              padding: isActive ? "0 8px" : "0",
              borderRadius: isActive ? "4px" : "0"
            }}
          >
            {label}
          </motion.label>
        </div>

        {/* Error Message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm mt-1 ml-1"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';
