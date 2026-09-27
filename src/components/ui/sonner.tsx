"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// The site is always dark; toasts sit bottom-left, clear of the search and
// back-to-top buttons on the right. Styles: .site-toast in site-chrome.css.
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-left"
    className="toaster group"
    toastOptions={{ classNames: { toast: "site-toast" } }}
    style={
      {
        "--normal-bg": "#0b1417",
        "--normal-text": "#dcebe5",
        "--normal-border": "#345148",
        "--border-radius": "0px",
      } as React.CSSProperties
    }
    {...props}
  />
)

export { Toaster }
