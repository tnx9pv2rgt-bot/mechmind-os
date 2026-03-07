"use client"

import { motion } from "framer-motion"

/**
 * AnimatedIllustration - Componente animato stile Linear/Notion
 * 
 * Sostituisce Lottie con animazioni CSS/Framer Motion native
 * per prestazioni migliori e zero dipendenze esterne
 */

const gearVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

const counterGearVariants = {
  animate: {
    rotate: -360,
    transition: {
      duration: 15,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

const floatVariants = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

const checkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.8, ease: "easeInOut" },
      opacity: { duration: 0.2 }
    }
  }
}

export function AnimatedIllustration({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      className={`relative ${className}`}
      variants={floatVariants}
      animate="animate"
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background gradient orb */}
        <motion.circle
          cx="100"
          cy="100"
          r="80"
          fill="url(#gradient-orb)"
          variants={pulseVariants}
          animate="animate"
        />
        
        {/* Main gear */}
        <motion.g
          variants={gearVariants}
          animate="animate"
          style={{ transformOrigin: "100px 100px" }}
        >
          <circle cx="100" cy="100" r="35" fill="#3B82F6" />
          <circle cx="100" cy="100" r="20" fill="#1E40AF" />
          {/* Gear teeth */}
          {[...Array(8)].map((_, i) => (
            <rect
              key={i}
              x="95"
              y="55"
              width="10"
              height="15"
              fill="#3B82F6"
              rx="2"
              transform={`rotate(${i * 45} 100 100)`}
            />
          ))}
        </motion.g>
        
        {/* Counter-rotating smaller gear */}
        <motion.g
          variants={counterGearVariants}
          animate="animate"
          style={{ transformOrigin: "150px 60px" }}
        >
          <circle cx="150" cy="60" r="20" fill="#60A5FA" />
          <circle cx="150" cy="60" r="10" fill="#2563EB" />
          {[...Array(6)].map((_, i) => (
            <rect
              key={i}
              x="146"
              y="35"
              width="8"
              height="10"
              fill="#60A5FA"
              rx="1"
              transform={`rotate(${i * 60} 150 60)`}
            />
          ))}
        </motion.g>
        
        {/* Decorative circles */}
        <motion.circle
          cx="40"
          cy="140"
          r="15"
          fill="#93C5FD"
          variants={pulseVariants}
          animate="animate"
        />
        <motion.circle
          cx="160"
          cy="150"
          r="10"
          fill="#BFDBFE"
          variants={pulseVariants}
          animate="animate"
        />
        
        {/* Checkmark */}
        <motion.g
          initial="hidden"
          animate="visible"
        >
          <motion.circle
            cx="100"
            cy="100"
            r="50"
            stroke="#10B981"
            strokeWidth="4"
            fill="none"
            variants={checkVariants}
          />
          <motion.path
            d="M85 100 L95 110 L115 85"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            variants={checkVariants}
          />
        </motion.g>
        
        {/* Sparkles */}
        <motion.g
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <path
            d="M30 50 L32 55 L37 57 L32 59 L30 64 L28 59 L23 57 L28 55 Z"
            fill="#FBBF24"
          />
          <path
            d="M170 80 L172 85 L177 87 L172 89 L170 94 L168 89 L163 87 L168 85 Z"
            fill="#FBBF24"
          />
        </motion.g>
        
        {/* Gradients */}
        <defs>
          <radialGradient id="gradient-orb" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#BFDBFE" stopOpacity="0.3" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  )
}

/**
 * Simplified illustration for smaller sizes
 */
export function SimpleAnimatedIllustration({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      className={`relative ${className}`}
      animate={{ y: [-5, 5, -5] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          fill="#DBEAFE"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r="25"
          fill="#3B82F6"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50px 50px" }}
        />
        <motion.path
          d="M40 50 L47 57 L60 43"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </svg>
    </motion.div>
  )
}
