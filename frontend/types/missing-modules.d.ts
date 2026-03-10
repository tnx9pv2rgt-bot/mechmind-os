/**
 * Type declarations for modules that are referenced but not yet implemented
 * or third-party modules without type definitions.
 */

declare module '@react-email/components' {
  import { ComponentType, ReactNode } from 'react';

  interface EmailBaseProps {
    children?: ReactNode;
    style?: Record<string, unknown>;
    className?: string;
  }

  export const Html: ComponentType<EmailBaseProps & { lang?: string }>;
  export const Head: ComponentType<{ children?: ReactNode }>;
  export const Body: ComponentType<EmailBaseProps>;
  export const Container: ComponentType<EmailBaseProps>;
  export const Section: ComponentType<EmailBaseProps>;
  export const Row: ComponentType<EmailBaseProps>;
  export const Column: ComponentType<EmailBaseProps>;
  export const Text: ComponentType<EmailBaseProps>;
  export const Button: ComponentType<EmailBaseProps & { href?: string }>;
  export const Link: ComponentType<EmailBaseProps & { href?: string }>;
  export const Img: ComponentType<EmailBaseProps & { src?: string; alt?: string; width?: number; height?: number }>;
  export const Hr: ComponentType<EmailBaseProps>;
  export const Preview: ComponentType<{ children?: ReactNode }>;
  export const Heading: ComponentType<EmailBaseProps & { as?: string }>;
  export const Font: ComponentType<{ fontFamily?: string; fallbackFontFamily?: string; webFont?: { url: string; format: string } }>;
  export const Tailwind: ComponentType<{ children?: ReactNode; config?: Record<string, unknown> }>;
}

declare module 'framer/react' {
  export { motion, AnimatePresence } from 'framer-motion';
}
