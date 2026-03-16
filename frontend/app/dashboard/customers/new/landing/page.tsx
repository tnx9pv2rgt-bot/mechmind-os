'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Lock,
  CheckCircle,
  Zap,
  BadgeCheck,
  Users,
  Star,
  ArrowRight,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedIllustration } from '@/components/onboarding/animated-illustration';
import { ExitIntentModal } from '@/components/onboarding/exit-intent-modal';

/**
 * Landing Page - Empty State per onboarding clienti
 *
 * Design: Linear/Notion style
 * - Clean, minimal, focus sul value proposition
 * - Progressive disclosure
 * - Social proof e trust badges
 * - Animazioni fluide
 */

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    },
  },
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
};

// Components
function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className='group p-5 bg-white/50 dark:bg-[#2f2f2f]/50 backdrop-blur-sm rounded-2xl border border-gray-100/50 dark:border-[#424242]/50 hover:bg-white/80 dark:hover:bg-[#353535]/80 hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-100 dark:hover:border-blue-900/30 transition-all duration-300'
    >
      <div className='w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
        {icon}
      </div>
      <h3 className='font-semibold text-gray-900 dark:text-[#ececec] mb-1'>{title}</h3>
      <p className='text-sm text-gray-500 dark:text-[#636366]'>{description}</p>
    </motion.div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.span
      className='flex items-center gap-1.5 text-xs text-gray-500 dark:text-[#636366] bg-white/60 dark:bg-[#2f2f2f]/60 px-3 py-1.5 rounded-full border border-gray-100 dark:border-[#424242]'
      whileHover={{ scale: 1.05 }}
    >
      {icon}
      {label}
    </motion.span>
  );
}

function Avatar({ src, alt, delay = 0 }: { src: string; alt: string; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, x: -20 }}
      animate={{ scale: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300 }}
      className='w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-sm'
    >
      <div className='w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium'>
        {alt.charAt(0)}
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/dashboard/customers/new');
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 dark:from-[#212121] dark:via-[#212121] dark:to-[#212121] flex items-center justify-center p-4 sm:p-6 lg:p-8'>
      {/* Background decorations */}
      <div className='fixed inset-0 overflow-hidden pointer-events-none'>
        <motion.div
          className='absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className='absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl'
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Main content */}
      <motion.div
        className='relative z-10 max-w-3xl w-full'
        variants={containerVariants}
        initial='hidden'
        animate='visible'
      >
        {/* Logo/Brand */}
        <motion.div variants={itemVariants} className='text-center mb-8'>
          <div className='inline-flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-[#2f2f2f]/70 backdrop-blur-sm rounded-full border border-gray-100 dark:border-[#424242] shadow-sm'>
            <div className='w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center'>
              <Zap className='w-3.5 h-3.5 text-white' />
            </div>
            <span className='text-sm font-medium text-gray-700 dark:text-[#ececec]'>
              MechMind OS
            </span>
          </div>
        </motion.div>

        {/* Animated Illustration */}
        <motion.div variants={scaleVariants} className='mb-10'>
          <AnimatedIllustration className='w-56 h-56 sm:w-64 sm:h-64 mx-auto' />
        </motion.div>

        {/* Headline */}
        <motion.div variants={itemVariants} className='text-center mb-6'>
          <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-[#ececec] mb-4 leading-tight'>
            Iniziamo il tuo percorso con{' '}
            <span className='bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent'>
              MechMind
            </span>
          </h1>
        </motion.div>

        {/* Subtitle with time estimate */}
        <motion.p
          variants={itemVariants}
          className='text-lg text-gray-600 dark:text-[#636366] text-center mb-10 max-w-xl mx-auto'
        >
          Solo{' '}
          <span className='font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg'>
            2 minuti
          </span>{' '}
          per configurare il tuo account.
          <br className='hidden sm:block' />
          <span className='text-gray-500'>Nessuna carta di credito richiesta.</span>
        </motion.p>

        {/* Benefits Grid */}
        <motion.div variants={itemVariants} className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10'>
          <BenefitCard
            icon={<Zap className='w-6 h-6 text-blue-500' />}
            title='Setup rapido'
            description='60 secondi e sei operativo'
          />
          <BenefitCard
            icon={<Shield className='w-6 h-6 text-green-500' />}
            title='Sicuro'
            description='Crittografia AES-256'
          />
          <BenefitCard
            icon={<BadgeCheck className='w-6 h-6 text-purple-500' />}
            title='Verificato'
            description='P.IVA verificata in tempo reale'
          />
        </motion.div>

        {/* Social Proof */}
        <motion.div
          variants={itemVariants}
          className='bg-white/60 dark:bg-[#2f2f2f]/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-100/50 dark:border-[#424242]/50'
        >
          <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-4'>
            {/* Avatars */}
            <div className='flex items-center'>
              <div className='flex -space-x-3'>
                {['M', 'A', 'R', 'L'].map((letter, i) => (
                  <Avatar key={i} src='' alt={letter} delay={0.5 + i * 0.1} />
                ))}
              </div>
              <div className='w-10 h-10 rounded-full border-2 border-white dark:border-[#424242] bg-gray-100 dark:bg-[#353535] flex items-center justify-center text-xs text-gray-500 dark:text-[#636366] font-medium shadow-sm'>
                +10k
              </div>
            </div>

            <div className='text-center sm:text-left'>
              <p className='text-sm text-gray-700 dark:text-[#ececec]'>
                <strong className='text-gray-900 dark:text-white'>10.000+</strong> officine già
                iscritte
              </p>
              <div className='flex items-center justify-center sm:justify-start gap-1 mt-1'>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className='w-3.5 h-3.5 fill-amber-400 text-amber-400' />
                ))}
                <span className='text-xs text-gray-500 ml-1'>4.9/5</span>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className='text-center border-t border-gray-100 dark:border-[#424242] pt-4'>
            <p className='text-sm text-gray-600 dark:text-[#636366] italic'>
              &ldquo;Ho configurato tutto in 3 minuti. Il sistema è intuitivo e il supporto
              fantastico!&rdquo;
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
              — Marco R., Officina Rossi srl
            </p>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          variants={itemVariants}
          className='flex flex-wrap items-center justify-center gap-3 mb-10'
        >
          <TrustBadge
            icon={<Shield className='w-3.5 h-3.5 text-green-500' />}
            label='GDPR Compliant'
          />
          <TrustBadge icon={<Lock className='w-3.5 h-3.5 text-blue-500' />} label='ISO 27001' />
          <TrustBadge
            icon={<CheckCircle className='w-3.5 h-3.5 text-purple-500' />}
            label='Google Partner'
          />
          <TrustBadge
            icon={<Users className='w-3.5 h-3.5 text-orange-500' />}
            label='+10k utenti'
          />
        </motion.div>

        {/* CTA Section */}
        <motion.div variants={itemVariants} className='text-center'>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleStart}
              size='lg'
              className='h-14 px-10 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/25 font-semibold group'
            >
              Crea il mio account gratis
              <ArrowRight className='w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform' />
            </Button>
          </motion.div>

          {/* Secondary CTA */}
          <motion.button
            onClick={handleStart}
            className='mt-4 flex items-center justify-center gap-2 mx-auto text-gray-500 hover:text-blue-600 transition-colors text-sm'
            whileHover={{ scale: 1.02 }}
          >
            <Play className='w-4 h-4' />
            Guarda il video demo (30 sec)
          </motion.button>

          {/* Login link */}
          <p className='mt-6 text-sm text-gray-500'>
            Hai già un account?{' '}
            <Link
              href='/auth'
              className='text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors'
            >
              Accedi
            </Link>
          </p>
        </motion.div>

        {/* Footer note */}
        <motion.p
          variants={itemVariants}
          className='mt-12 text-xs text-center text-gray-500 dark:text-gray-400'
        >
          Cliccando su &ldquo;Crea account&rdquo; accetti i{' '}
          <Link href='#' className='underline hover:text-gray-600'>
            Termini di Servizio
          </Link>{' '}
          e la{' '}
          <Link href='#' className='underline hover:text-gray-600'>
            Privacy Policy
          </Link>
        </motion.p>
      </motion.div>

      {/* Exit Intent Modal */}
      <ExitIntentModal onContinue={handleStart} discountPercentage={10} />
    </div>
  );
}
