import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Every filled variant is a keycap (see `key` in globals.css): it
        // sits on a lip and travels down when pressed. The primary action is
        // the one colored cap on a panel; everything else is a neutral cap.
        default: "key key-primary text-primary-foreground",
        destructive: "key key-danger text-destructive-foreground",
        outline: "key text-secondary-foreground",
        secondary: "key text-secondary-foreground",
        ghost:
          "text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Taller on touch screens, toward the 44px target guideline; compact
        // on desktop via sm:.
        default: "h-10 px-4 py-2 sm:h-9",
        sm: "h-9 px-3 text-xs sm:h-8",
        lg: "h-11 px-8",
        icon: "h-10 w-10 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
