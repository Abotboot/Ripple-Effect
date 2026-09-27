"use client"

import type { ReactNode } from "react"
import { toast as sonner } from "sonner"

// Toasts are shown by Sonner (github.com/emilkowalski/sonner, MIT): they stack,
// expand on hover and swipe away. This keeps the older call shape used across
// the sections: toast({ title, description, variant }).

type Toast = {
  title?: ReactNode
  description?: ReactNode
  variant?: "default" | "destructive" | null
}

function toast({ title, description, variant }: Toast) {
  const id = variant === "destructive"
    ? sonner.error(title ?? "Something went wrong", { description })
    : sonner.success(title ?? "", { description })
  return { id, dismiss: () => sonner.dismiss(id) }
}

function useToast() {
  return { toast, dismiss: (id?: string | number) => sonner.dismiss(id) }
}

export { useToast, toast }
