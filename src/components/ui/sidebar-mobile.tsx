"use client"

import * as React from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const SIDEBAR_WIDTH_MOBILE = "18rem"

type SidebarMobileProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: "left" | "right"
  children: React.ReactNode
}

/**
 * The sidebar as a slide-over drawer, for narrow screens. It is its own
 * module so the dialog machinery behind it is only downloaded on a phone,
 * and only once the drawer is about to be used.
 */
export default function SidebarMobile({ open, onOpenChange, side, children }: SidebarMobileProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-sidebar="sidebar"
        data-mobile="true"
        className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
          } as React.CSSProperties
        }
        side={side}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Sidebar</SheetTitle>
          <SheetDescription>Displays the mobile sidebar.</SheetDescription>
        </SheetHeader>
        <div className="flex h-full w-full flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
