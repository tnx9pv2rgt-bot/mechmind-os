import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--brand)] text-[var(--text-on-brand)] hover:bg-[var(--brand)]/80",
        secondary:
          "border-transparent bg-[var(--surface-secondary)] text-[var(--text-secondary)]-foreground hover:bg-[var(--surface-secondary)]/80",
        destructive:
          "border-transparent bg-[var(--status-error)] text-[var(--status-error)]-foreground hover:bg-[var(--status-error)]/80",
        outline: "text-[var(--text-primary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
