import React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Search } from "lucide-react"
import { cx, focusRing } from "@/lib/utils"

// Context for Command state
interface CommandContextValue {
  search: string
  setSearch: (value: string) => void
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  items: React.RefObject<HTMLDivElement[]>
  onItemSelect?: (value: string) => void
  // Track visible item count for Empty state
  visibleCount: number
  registerVisibleItem: () => () => void
}

const CommandContext = React.createContext<CommandContextValue | null>(null)

function useCommand() {
  const context = React.useContext(CommandContext)
  if (!context) {
    throw new Error("Command components must be used within a Command.Root")
  }
  return context
}

// Root component
interface CommandRootProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect?: (value: string) => void
  children?: React.ReactNode
}

function CommandRoot({
  open,
  onOpenChange,
  onSelect,
  children,
}: CommandRootProps) {
  const [search, setSearch] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [visibleCount, setVisibleCount] = React.useState(0)
  const itemsRef = React.useRef<HTMLDivElement[]>([])

  // Reset search and selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearch("")
      setSelectedIndex(0)
      itemsRef.current = []
      setVisibleCount(0)
    }
  }, [open])

  const registerVisibleItem = React.useCallback(() => {
    setVisibleCount((c) => c + 1)
    return () => setVisibleCount((c) => c - 1)
  }, [])

  const contextValue = React.useMemo(
    () => ({
      search,
      setSearch,
      selectedIndex,
      setSelectedIndex,
      items: itemsRef,
      onItemSelect: onSelect,
      visibleCount,
      registerVisibleItem,
    }),
    [search, selectedIndex, onSelect, visibleCount, registerVisibleItem]
  )

  return (
    <CommandContext.Provider value={contextValue}>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog.Root>
    </CommandContext.Provider>
  )
}
CommandRoot.displayName = "Command"

// Trigger component
const CommandTrigger = React.forwardRef<
  React.ComponentRef<typeof Dialog.Trigger>,
  React.ComponentPropsWithoutRef<typeof Dialog.Trigger>
>(({ className, ...props }, forwardedRef) => (
  <Dialog.Trigger
    ref={forwardedRef as React.Ref<HTMLButtonElement>}
    className={cx(
      "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
      "border border-gray-200 dark:border-gray-700",
      "bg-white dark:bg-gray-900",
      "text-gray-700 dark:text-gray-300",
      "hover:bg-gray-50 hover:dark:bg-gray-800",
      focusRing(),
      className
    )}
    {...props}
  />
))
CommandTrigger.displayName = "CommandTrigger"

// Content (wraps Dialog.Portal + Popup)
interface CommandContentProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Popup> {
  overlayClassName?: string
}

const CommandContent = React.forwardRef<
  React.ComponentRef<typeof Dialog.Popup>,
  CommandContentProps
>(({ className, overlayClassName, children, ...props }, forwardedRef) => {
  const { search, selectedIndex, setSelectedIndex, items, onItemSelect } =
    useCommand()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const itemElements = items.current
      if (!itemElements || itemElements.length === 0) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex(
            selectedIndex < itemElements.length - 1 ? selectedIndex + 1 : 0
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex(
            selectedIndex > 0 ? selectedIndex - 1 : itemElements.length - 1
          )
          break
        case "Enter":
          e.preventDefault()
          const selectedItem = itemElements[selectedIndex]
          if (selectedItem) {
            const value = selectedItem.getAttribute("data-value")
            if (value && onItemSelect) {
              onItemSelect(value)
            }
            selectedItem.click()
          }
          break
        case "Home":
          e.preventDefault()
          setSelectedIndex(0)
          break
        case "End":
          e.preventDefault()
          setSelectedIndex(itemElements.length - 1)
          break
      }
    },
    [selectedIndex, setSelectedIndex, items, onItemSelect]
  )

  // Scroll selected item into view
  React.useEffect(() => {
    const itemElements = items.current
    if (itemElements && itemElements[selectedIndex]) {
      itemElements[selectedIndex].scrollIntoView({
        block: "nearest",
        behavior: "instant",
      })
    }
  }, [selectedIndex, items])

  return (
    <Dialog.Portal>
      <Dialog.Backdrop
        className={cx(
          "fixed inset-0 z-50 min-h-dvh",
          "bg-black/50",
          "transition-opacity duration-150",
          "data-[starting-style]:opacity-0",
          "data-[ending-style]:opacity-0",
          overlayClassName
        )}
      />
      <Dialog.Popup
        ref={forwardedRef}
        onKeyDown={handleKeyDown}
        className={cx(
          // Position
          "fixed left-1/2 top-[15%] z-50",
          "-translate-x-1/2",
          // Size
          "w-[90vw] max-w-lg",
          // Layout
          "flex flex-col overflow-hidden rounded-lg",
          // Colors
          "bg-white dark:bg-gray-900",
          "border border-gray-200 dark:border-gray-700",
          "shadow-2xl",
          // Transitions
          "transition-opacity duration-150",
          "data-[starting-style]:opacity-0",
          "data-[ending-style]:opacity-0",
          focusRing(),
          className
        )}
        {...props}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  )
})
CommandContent.displayName = "CommandContent"

// Input component
interface CommandInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  onValueChange?: (value: string) => void
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, placeholder = "Type a command or search...", onValueChange, ...props }, forwardedRef) => {
    const { search, setSearch, setSelectedIndex, items } = useCommand()
    const internalRef = React.useRef<HTMLInputElement>(null)
    const ref = forwardedRef || internalRef

    // Auto-focus input when mounted
    React.useEffect(() => {
      const input = typeof ref === 'function' ? null : ref?.current
      if (input) {
        // Small delay to ensure dialog is fully open
        const timer = setTimeout(() => input.focus(), 50)
        return () => clearTimeout(timer)
      }
    }, [ref])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearch(value)
      setSelectedIndex(0) // Reset selection when search changes
      // Clear items array so they re-register in new order
      items.current = []
      onValueChange?.(value)
    }

    return (
      <div className="flex items-center border-b border-gray-200 px-3 dark:border-gray-700">
        <Search
          className="mr-2 size-4 shrink-0 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="text"
          value={search}
          onChange={handleChange}
          placeholder={placeholder}
          className={cx(
            "flex h-12 w-full bg-transparent py-3 text-sm outline-none",
            "text-gray-900 dark:text-gray-50",
            "placeholder:text-gray-400 placeholder:dark:text-gray-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
CommandInput.displayName = "CommandInput"

// List component
interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {}

const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(
  ({ className, children, ...props }, forwardedRef) => {
    const { items } = useCommand()

    // Reset items array when children change
    React.useEffect(() => {
      items.current = []
    }, [children, items])

    return (
      <div
        ref={forwardedRef}
        role="listbox"
        className={cx(
          "max-h-80 overflow-y-auto overflow-x-hidden p-1",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CommandList.displayName = "CommandList"

// Group component
interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string
}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children, ...props }, forwardedRef) => {
    const { visibleCount, search } = useCommand()

    // Hide the group heading when searching and no results
    // But always render children so they can register/unregister visibility
    const showHeading = !search || visibleCount > 0

    return (
      <div
        ref={forwardedRef}
        role="group"
        className={cx("overflow-hidden", className)}
        {...props}
      >
        {heading && showHeading && (
          <div
            className={cx(
              "px-2 py-1.5 text-xs font-medium",
              "text-gray-500 dark:text-gray-400"
            )}
          >
            {heading}
          </div>
        )}
        {children}
      </div>
    )
  }
)
CommandGroup.displayName = "CommandGroup"

// Item component
interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  disabled?: boolean
  onSelect?: () => void
  keywords?: string[]
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  (
    { className, value, disabled, onSelect, keywords = [], children, ...props },
    forwardedRef
  ) => {
    const { search, selectedIndex, setSelectedIndex, items, onItemSelect, registerVisibleItem } =
      useCommand()
    const itemRef = React.useRef<HTMLDivElement>(null)
    const [itemIndex, setItemIndex] = React.useState(-1)

    // Filter based on search
    const searchValue = value || (typeof children === "string" ? children : "")
    const allKeywords = [searchValue.toLowerCase(), ...keywords.map((k) => k.toLowerCase())]
    const isMatch =
      !search || allKeywords.some((k) => k.includes(search.toLowerCase()))

    // Register as visible item for Empty state tracking
    React.useEffect(() => {
      if (isMatch && !disabled) {
        return registerVisibleItem()
      }
    }, [isMatch, disabled, registerVisibleItem])

    // Register item in the items array for keyboard navigation
    React.useLayoutEffect(() => {
      if (!isMatch || disabled) {
        setItemIndex(-1)
        return
      }
      
      const el = itemRef.current
      if (el) {
        // Add to items array
        const idx = items.current.push(el) - 1
        setItemIndex(idx)
        
        return () => {
          const currentIdx = items.current.indexOf(el)
          if (currentIdx > -1) {
            items.current.splice(currentIdx, 1)
          }
        }
      }
    }, [isMatch, disabled, items, search])

    if (!isMatch) {
      return null
    }

    const isSelected = itemIndex === selectedIndex && !disabled

    const handleClick = () => {
      if (disabled) return
      if (value && onItemSelect) {
        onItemSelect(value)
      }
      onSelect?.()
    }

    const handleMouseEnter = () => {
      if (!disabled && itemIndex >= 0) {
        setSelectedIndex(itemIndex)
      }
    }

    return (
      <div
        ref={(node) => {
          ;(itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof forwardedRef === "function") {
            forwardedRef(node)
          } else if (forwardedRef) {
            forwardedRef.current = node
          }
        }}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        data-value={value}
        data-highlighted={isSelected ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        className={cx(
          "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
          "text-foreground",
          "data-[highlighted]:bg-muted",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CommandItem.displayName = "CommandItem"

// Empty component
interface CommandEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

const CommandEmpty = React.forwardRef<HTMLDivElement, CommandEmptyProps>(
  ({ className, children, ...props }, forwardedRef) => {
    const { visibleCount, search } = useCommand()

    // Show empty state when:
    // 1. User has typed something (search is not empty)
    // 2. No items are visible
    if (!search || visibleCount > 0) {
      return null
    }

    return (
      <div
        ref={forwardedRef}
        className={cx(
          "py-6 text-center text-sm",
          "text-gray-500 dark:text-gray-400",
          className
        )}
        {...props}
      >
        {children ?? "No results found."}
      </div>
    )
  }
)
CommandEmpty.displayName = "CommandEmpty"

// Separator component
interface CommandSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

const CommandSeparator = React.forwardRef<HTMLDivElement, CommandSeparatorProps>(
  ({ className, ...props }, forwardedRef) => (
    <div
      ref={forwardedRef}
      className={cx("-mx-1 my-1 h-px bg-gray-100 dark:bg-gray-800", className)}
      {...props}
    />
  )
)
CommandSeparator.displayName = "CommandSeparator"

// Shortcut component (for displaying keyboard shortcuts)
interface CommandShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

const CommandShortcut = React.forwardRef<HTMLSpanElement, CommandShortcutProps>(
  ({ className, ...props }, forwardedRef) => (
    <span
      ref={forwardedRef}
      className={cx(
        "ml-auto text-xs tracking-widest",
        "text-gray-400 dark:text-gray-500",
        className
      )}
      {...props}
    />
  )
)
CommandShortcut.displayName = "CommandShortcut"

// Footer component (for keyboard hints)
interface CommandFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CommandFooter = React.forwardRef<HTMLDivElement, CommandFooterProps>(
  ({ className, children, ...props }, forwardedRef) => (
    <div
      ref={forwardedRef}
      className={cx(
        "flex items-center gap-4 border-t border-gray-200 px-3 py-2 dark:border-gray-700",
        "text-xs text-gray-500 dark:text-gray-400",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-800">
              ↑↓
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-800">
              ↵
            </kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-800">
              esc
            </kbd>
            Close
          </span>
        </>
      )}
    </div>
  )
)
CommandFooter.displayName = "CommandFooter"

// Dialog close for use inside Command
const CommandClose = Dialog.Close
CommandClose.displayName = "CommandClose"

// Compound export
export const Command = Object.assign(CommandRoot, {
  Trigger: CommandTrigger,
  Content: CommandContent,
  Input: CommandInput,
  List: CommandList,
  Group: CommandGroup,
  Item: CommandItem,
  Empty: CommandEmpty,
  Separator: CommandSeparator,
  Shortcut: CommandShortcut,
  Footer: CommandFooter,
  Close: CommandClose,
})

export {
  CommandRoot,
  CommandTrigger,
  CommandContent,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
  CommandShortcut,
  CommandFooter,
  CommandClose,
}
