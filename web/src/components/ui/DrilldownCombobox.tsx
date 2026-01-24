import React from "react"
import { Combobox } from "@base-ui/react/combobox"
import {
  Building2,
  ChevronLeft,
  Globe,
  Package,
  Plus,
  X,
} from "lucide-react"
import { cx, focusRing, focusInput } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

export interface DrilldownComboboxItem {
  id: string
  label: string
  domain: string
  icon?: string | React.ReactNode
}

type ViewState = "list" | "form"

// ============================================================================
// Props
// ============================================================================

export interface DrilldownComboboxProps {
  /** Items to display in the list */
  items: DrilldownComboboxItem[]
  /** Controlled value */
  value?: DrilldownComboboxItem | null
  /** Default value (uncontrolled) */
  defaultValue?: DrilldownComboboxItem | null
  /** Called when value changes */
  onValueChange?: (value: DrilldownComboboxItem | null) => void
  /** Placeholder text for the input */
  placeholder?: string
  /** Text for the "create" action button */
  createLabel?: string
  /** Title shown in the creation form */
  formTitle?: string
  /** Submit button label in the creation form */
  submitLabel?: string
  /** Called when the creation form is submitted */
  onCreateSubmit?: (data: { name: string; domain: string }) => void
  /** Additional class name for the container */
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function DrilldownCombobox({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Search companies...",
  createLabel = "Create company",
  formTitle = "Add a company",
  submitLabel = "Add",
  onCreateSubmit,
  className,
}: DrilldownComboboxProps) {
  const [view, setView] = React.useState<ViewState>("list")
  const [internalValue, setInternalValue] =
    React.useState<DrilldownComboboxItem | null>(defaultValue ?? null)
  const formNameRef = React.useRef<HTMLInputElement>(null)

  const isControlled = value !== undefined
  const selectedValue = isControlled ? value : internalValue

  const handleValueChange = React.useCallback(
    (newValue: DrilldownComboboxItem | null) => {
      if (!isControlled) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [isControlled, onValueChange]
  )

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      // Delay reset so close animation can play
      setTimeout(() => setView("list"), 150)
    }
  }, [])

  // Focus name input when switching to form view
  React.useEffect(() => {
    if (view === "form") {
      const timer = setTimeout(() => {
        formNameRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [view])

  // Render selected icon for trigger
  const renderSelectedIcon = () => {
    if (!selectedValue?.icon) {
      return <Package className="size-5 text-gray-400 dark:text-gray-500" />
    }
    if (typeof selectedValue.icon === "string") {
      return (
        <img
          src={selectedValue.icon}
          alt=""
          className="size-5 shrink-0 rounded object-contain"
        />
      )
    }
    return selectedValue.icon
  }

  return (
    <div className={className}>
      <Combobox.Root
        items={items}
        value={selectedValue}
        onValueChange={handleValueChange}
        onOpenChange={handleOpenChange}
        autoHighlight
      >
        {/* Trigger */}
        <div
          className={cx(
            "relative flex items-center",
            "[&>input]:pr-[calc(0.5rem+3rem)]",
            "has-[[data-combobox-clear]]:[&>input]:pr-[calc(0.5rem+4.5rem)]"
          )}
        >
          <div className="pointer-events-none absolute left-3 z-10 flex items-center">
            {renderSelectedIcon()}
          </div>

          <Combobox.Input
            placeholder={selectedValue ? selectedValue.label : placeholder}
            className={cx(
              "h-10 w-full rounded-lg border pl-10 pr-12 text-sm outline-none transition-colors",
              "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
              "text-gray-900 dark:text-gray-50",
              "placeholder:text-gray-500 dark:placeholder:text-gray-400",
              "hover:border-gray-300 dark:hover:border-gray-600",
              ...focusInput
            )}
          />

          <div className="absolute right-2 flex items-center gap-0.5">
            <Combobox.Clear
              className={cx(
                "flex size-6 items-center justify-center rounded",
                "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
                "transition-colors outline-none",
                focusRing()
              )}
              aria-label="Clear selection"
              data-combobox-clear
            >
              <X className="size-4" />
            </Combobox.Clear>
            <Combobox.Trigger
              className={cx(
                "flex size-6 items-center justify-center rounded",
                "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
                "transition-colors outline-none",
                focusRing()
              )}
              aria-label="Toggle popup"
            >
              <ChevronDownIcon className="size-4" />
            </Combobox.Trigger>
          </div>
        </div>

        {/* Popup */}
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={6}>
            <Combobox.Popup
              className={cx(
                "w-[var(--anchor-width)] min-w-[280px]",
                "rounded-xl",
                "bg-white dark:bg-gray-900",
                "border border-gray-200 dark:border-gray-700",
                "shadow-lg shadow-gray-200/50 dark:shadow-none",
                "overflow-hidden",
                "origin-[var(--transform-origin)]",
                "transition-[transform,opacity] duration-150",
                "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
                "data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
              )}
            >
              {/* Sliding container */}
              <div
                className={cx(
                  "flex transition-transform duration-200 ease-out",
                  view === "form" && "-translate-x-1/2"
                )}
                style={{ width: "200%" }}
              >
                {/* List View */}
                <div className="w-1/2 shrink-0">
                  <Combobox.List
                    className={cx(
                      "max-h-[280px] overflow-y-auto py-1 outline-none",
                      "scroll-py-1 overscroll-contain"
                    )}
                  >
                    {(item: DrilldownComboboxItem) => (
                      <ItemRow key={item.id} item={item} />
                    )}
                  </Combobox.List>

                  <Combobox.Empty className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No companies found
                  </Combobox.Empty>

                  {/* Create action */}
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setView("form")}
                      className={cx(
                        "flex w-full items-center gap-2.5 px-3 py-2.5",
                        "text-sm text-gray-600 dark:text-gray-400",
                        "hover:bg-gray-50 dark:hover:bg-gray-800",
                        "transition-colors outline-none",
                        focusRing()
                      )}
                    >
                      <span
                        className={cx(
                          "flex size-5 items-center justify-center rounded",
                          "bg-gray-100 dark:bg-gray-800",
                          "text-gray-500 dark:text-gray-400"
                        )}
                      >
                        <Plus className="size-3.5" />
                      </span>
                      <span>{createLabel}</span>
                    </button>
                  </div>
                </div>

                {/* Form View */}
                <CreationForm
                  title={formTitle}
                  submitLabel={submitLabel}
                  onSubmit={onCreateSubmit}
                  onBack={() => setView("list")}
                  nameInputRef={formNameRef}
                />
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  )
}

DrilldownCombobox.displayName = "DrilldownCombobox"

// ============================================================================
// Item Row
// ============================================================================

interface ItemRowProps {
  item: DrilldownComboboxItem
}

function ItemRow({ item }: ItemRowProps) {
  const renderIcon = () => {
    if (item.icon) {
      if (typeof item.icon === "string") {
        return (
          <img
            src={item.icon}
            alt=""
            className="size-5 shrink-0 rounded object-contain"
          />
        )
      }
      return item.icon
    }
    // Fallback: first letter
    return (
      <div
        className={cx(
          "flex size-5 shrink-0 items-center justify-center rounded",
          "bg-gray-100 dark:bg-gray-800",
          "text-xs font-medium text-gray-600 dark:text-gray-400"
        )}
      >
        {item.label.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <Combobox.Item
      value={item}
      className={cx(
        // Layout
        "flex w-full cursor-default items-center gap-2.5 px-3 py-2",
        "text-sm outline-none select-none",
        // Base colors
        "text-gray-900 dark:text-gray-50",
        // Highlighted state (keyboard nav + hover)
        "data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-800"
      )}
    >
      {renderIcon()}
      <span className="flex-1 truncate">{item.label}</span>
      <span className="text-xs text-muted-foreground">
        {item.domain}
      </span>
      <Combobox.ItemIndicator className="ml-1">
        <CheckIcon className="size-4 text-foreground" />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  )
}

// ============================================================================
// Creation Form
// ============================================================================

interface CreationFormProps {
  title: string
  submitLabel: string
  onSubmit?: (data: { name: string; domain: string }) => void
  onBack: () => void
  nameInputRef: React.RefObject<HTMLInputElement | null>
}

function CreationForm({
  title,
  submitLabel,
  onSubmit,
  onBack,
  nameInputRef,
}: CreationFormProps) {
  const [name, setName] = React.useState("")
  const [domain, setDomain] = React.useState("")

  const canSubmit = name.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    onSubmit?.({ name: name.trim(), domain: domain.trim() })

    // Reset form
    setName("")
    setDomain("")
  }

  const handleBack = () => {
    setName("")
    setDomain("")
    onBack()
  }

  return (
    <div className="w-1/2 shrink-0" role="dialog" aria-label={title}>
      {/* Header */}
      <div
        className={cx(
          "flex items-center gap-2 px-3 py-2.5",
          "border-b border-gray-100 dark:border-gray-800"
        )}
      >
        <button
          type="button"
          onClick={handleBack}
          className={cx(
            "flex size-6 items-center justify-center rounded",
            "text-gray-500 hover:text-gray-700",
            "dark:text-gray-400 dark:hover:text-gray-200",
            "transition-colors outline-none",
            focusRing()
          )}
          aria-label="Go back"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-50">
          {title}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cx(
            "rounded-full px-3 py-1 text-xs font-medium",
            "transition-colors outline-none",
            canSubmit
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
            focusRing()
          )}
        >
          {submitLabel}
        </button>
      </div>

      {/* Form fields */}
      <form onSubmit={handleSubmit} className="space-y-1 p-2">
        <FormField
          ref={nameInputRef}
          icon={<Building2 className="size-4" />}
          value={name}
          onChange={setName}
          placeholder="Name"
        />
        <FormField
          icon={<Globe className="size-4" />}
          value={domain}
          onChange={setDomain}
          placeholder="company.com"
          suffix="Optional"
        />
      </form>
    </div>
  )
}

// ============================================================================
// Form Field
// ============================================================================

interface FormFieldProps {
  icon?: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suffix?: string
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ icon, value, onChange, placeholder, suffix }, ref) => {
    return (
      <div
        className={cx(
          "flex items-center gap-2.5 rounded-lg px-3 py-2.5",
          "bg-gray-50 dark:bg-gray-800/50"
        )}
      >
        {icon && (
          <span className="shrink-0 text-gray-400 dark:text-gray-500">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cx(
            "flex-1 bg-transparent text-sm outline-none",
            "text-gray-900 dark:text-gray-50",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500"
          )}
        />
        {suffix && (
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

// ============================================================================
// Icons
// ============================================================================

function ChevronDownIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg fill="currentColor" viewBox="0 0 10 10" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  )
}
