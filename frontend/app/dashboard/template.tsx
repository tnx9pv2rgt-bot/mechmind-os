'use client';

import { motion } from 'framer-motion';

/**
 * Page transition wrapper for all dashboard pages.
 * Next.js App Router re-renders template.tsx on every navigation,
 * triggering the entry animation for each page.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
