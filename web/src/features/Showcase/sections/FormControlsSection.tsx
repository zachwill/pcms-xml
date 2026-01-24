import React from "react";
import { Field } from "@base-ui/react/field";
import { Section, SectionGroup } from "../components";
import {
  Checkbox,
  CheckboxGroup,
  CheckboxGroupItem,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  Input,
  Label,
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  Radio,
  RadioGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
} from "@/components/ui";

const frameworks = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "angular", label: "Angular" },
  { value: "svelte", label: "Svelte" },
  { value: "solid", label: "SolidJS" },
  { value: "qwik", label: "Qwik" },
];

export function FormControlsSection() {
  const [switchChecked, setSwitchChecked] = React.useState(false);
  const [checkboxChecked, setCheckboxChecked] = React.useState(false);
  const [indeterminate, setIndeterminate] = React.useState(true);
  const [radioValue, setRadioValue] = React.useState("option1");
  const [sliderValue, setSliderValue] = React.useState<readonly number[]>([50]);
  const [selectedFramework, setSelectedFramework] = React.useState<typeof frameworks[number] | null>(null);

  return (
    <SectionGroup
      id="form-controls"
      label="03"
      title="Form Controls"
      description="Input components for data collection and user preferences."
    >
      {/* Text Inputs */}
      <Section
        title="Input"
        description="Text input fields with various states and variants."
      >
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field.Root>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="you@example.com" type="email" />
              </div>
            </Field.Root>
            <Field.Root>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
            </Field.Root>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">States</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input placeholder="Default" />
              <Input disabled placeholder="Disabled" />
              <Input hasError placeholder="Error" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Underline Variant</p>
            <Input variant="underline" placeholder="Search or type a command..." />
          </div>
        </div>
      </Section>

      {/* NumberField */}
      <Section
        title="NumberField"
        description="Numeric input with increment/decrement controls."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Quantity</Label>
            <NumberField defaultValue={1} min={0} max={100}>
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
          </div>
          <div className="space-y-2">
            <Label>Price</Label>
            <NumberField defaultValue={99} min={0} step={1}>
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
          </div>
        </div>
      </Section>

      {/* Select */}
      <Section
        title="Select"
        description="Dropdown selection from a list of options."
      >
        <div className="space-y-2">
          <Label>Framework</Label>
          <Select 
            defaultValue="react"
            items={[
              { value: "react", label: "React" },
              { value: "vue", label: "Vue" },
              { value: "angular", label: "Angular" },
              { value: "svelte", label: "Svelte" },
              { value: "solid", label: "Solid (coming soon)" },
            ]}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="vue">Vue</SelectItem>
              <SelectItem value="angular">Angular</SelectItem>
              <SelectItem value="svelte">Svelte</SelectItem>
              <SelectItem value="solid" disabled>
                Solid (coming soon)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* Combobox */}
      <Section
        title="Combobox"
        description="Searchable dropdown with autocomplete."
      >
        <div className="space-y-2">
          <Label>Search Frameworks</Label>
          <Combobox
            items={frameworks}
            value={selectedFramework}
            onValueChange={(value) => setSelectedFramework(value)}
          >
            <div className="relative w-full sm:w-64">
              <ComboboxInput placeholder="Type to search..." />
              <ComboboxTrigger className="absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
            <ComboboxContent>
              <ComboboxEmpty>No framework found.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item.value} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {selectedFramework && (
            <p className="text-sm text-muted-foreground">
              Selected: <span className="text-foreground">{selectedFramework.label}</span>
            </p>
          )}
        </div>
      </Section>

      {/* Switch & Checkbox */}
      <Section
        title="Switch & Checkbox"
        description="Toggle controls for binary choices."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Switch</p>
            <div className="flex flex-wrap gap-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={switchChecked}
                  onCheckedChange={setSwitchChecked}
                />
                <span className="text-sm text-foreground">Enabled</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch size="small" defaultChecked />
                <span className="text-sm text-foreground">Small</span>
              </label>
              <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
                <Switch disabled />
                <span className="text-sm text-muted-foreground">Disabled</span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Checkbox</p>
            <div className="flex flex-wrap gap-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={checkboxChecked}
                  onCheckedChange={setCheckboxChecked}
                />
                <span className="text-sm text-foreground">Checked</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  indeterminate={indeterminate}
                  onCheckedChange={() => setIndeterminate(false)}
                />
                <span className="text-sm text-foreground">Indeterminate</span>
              </label>
              <label className="flex items-center gap-3 cursor-not-allowed">
                <Checkbox disabled />
                <span className="text-sm text-muted-foreground">Disabled</span>
              </label>
            </div>
          </div>
        </div>
      </Section>

      {/* CheckboxGroup */}
      <Section
        title="Checkbox Group"
        description="Multiple selection from a list."
      >
        <CheckboxGroup defaultValue={["email"]}>
          <p className="text-sm font-medium text-foreground mb-1">
            Notifications
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Choose what you'd like to be notified about.
          </p>
          <div className="space-y-3">
            <CheckboxGroupItem value="email" label="Email notifications" />
            <CheckboxGroupItem value="sms" label="SMS notifications" />
            <CheckboxGroupItem value="push" label="Push notifications" />
            <CheckboxGroupItem value="marketing" label="Marketing updates" disabled />
          </div>
        </CheckboxGroup>
      </Section>

      {/* Radio Group */}
      <Section
        title="Radio Group"
        description="Single selection from a list."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Vertical</p>
            <RadioGroup value={radioValue} onValueChange={setRadioValue}>
              <label className="flex items-center gap-3 cursor-pointer">
                <Radio value="option1" />
                <span className="text-sm text-foreground">Starter Plan</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Radio value="option2" />
                <span className="text-sm text-foreground">Pro Plan</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Radio value="option3" disabled />
                <span className="text-sm text-muted-foreground">Enterprise (Contact us)</span>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Horizontal</p>
            <RadioGroup orientation="horizontal" defaultValue="monthly">
              <label className="flex items-center gap-2 cursor-pointer">
                <Radio value="monthly" />
                <span className="text-sm">Monthly</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Radio value="yearly" />
                <span className="text-sm">Yearly</span>
              </label>
            </RadioGroup>
          </div>
        </div>
      </Section>

      {/* Slider */}
      <Section
        title="Slider"
        description="Range selection with visual feedback."
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <Slider
              label="Volume"
              showValue
              value={sliderValue as number[]}
              onValueChange={(val) => setSliderValue(val as readonly number[])}
            />
            <Slider
              label="Brightness"
              showValue
              defaultValue={[75]}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Range</p>
            <Slider
              label="Price Range"
              showValue
              defaultValue={[20, 80]}
            />
          </div>
        </div>
      </Section>
    </SectionGroup>
  );
}
