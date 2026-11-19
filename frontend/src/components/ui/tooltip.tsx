import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

interface TooltipContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextType>({
  open: false,
  setOpen: () => {},
})

const TooltipProvider: React.FC<{ children: React.ReactNode; delayDuration?: number }> = ({ children }) => {
  return <>{children}</>
}

const Tooltip: React.FC<{
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}> = ({ children, open: controlledOpen, onOpenChange }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    },
    [isControlled, onOpenChange]
  )

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ asChild, children, onMouseEnter, onMouseLeave, onFocus, onBlur, ...props }, ref) => {
  const { setOpen } = React.useContext(TooltipContext)
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref as any}
      onMouseEnter={(e: any) => {
        setOpen(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e: any) => {
        setOpen(false)
        onMouseLeave?.(e)
      }}
      onFocus={(e: any) => {
        setOpen(true)
        onFocus?.(e)
      }}
      onBlur={(e: any) => {
        setOpen(false)
        onBlur?.(e)
      }}
      {...props}
    >
      {children}
    </Comp>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", sideOffset = 4, children, ...props }, ref) => {
    const { open } = React.useContext(TooltipContext)
    if (!open) return null

    const positionClasses: Record<string, string> = {
      top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
      bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
      left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
      right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
    }

    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          "absolute z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none whitespace-nowrap dark:bg-slate-100 dark:text-slate-900",
          positionClasses[side] || positionClasses.top,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
