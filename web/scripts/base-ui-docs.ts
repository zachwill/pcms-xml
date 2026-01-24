import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const BASE_URL = "https://base-ui.com";
const OUTPUT_DIR = "reference/base-ui";

const files = [
  // Overview
  "react/overview/quick-start.md",
  "react/overview/accessibility.md",
  "react/overview/releases.md",
  "react/overview/about.md",

  // Handbook
  "react/handbook/styling.md",
  "react/handbook/animation.md",
  "react/handbook/composition.md",
  "react/handbook/customization.md",
  "react/handbook/forms.md",
  "react/handbook/typescript.md",

  // Components
  "react/components/accordion.md",
  "react/components/alert-dialog.md",
  "react/components/autocomplete.md",
  "react/components/avatar.md",
  "react/components/button.md",
  "react/components/checkbox.md",
  "react/components/checkbox-group.md",
  "react/components/collapsible.md",
  "react/components/combobox.md",
  "react/components/context-menu.md",
  "react/components/dialog.md",
  "react/components/field.md",
  "react/components/fieldset.md",
  "react/components/form.md",
  "react/components/input.md",
  "react/components/menu.md",
  "react/components/menubar.md",
  "react/components/meter.md",
  "react/components/navigation-menu.md",
  "react/components/number-field.md",
  "react/components/popover.md",
  "react/components/preview-card.md",
  "react/components/progress.md",
  "react/components/radio.md",
  "react/components/scroll-area.md",
  "react/components/select.md",
  "react/components/separator.md",
  "react/components/slider.md",
  "react/components/switch.md",
  "react/components/tabs.md",
  "react/components/toast.md",
  "react/components/toggle.md",
  "react/components/toggle-group.md",
  "react/components/toolbar.md",
  "react/components/tooltip.md",

  // Utilities
  "react/utils/csp-provider.md",
  "react/utils/direction-provider.md",
  "react/utils/merge-props.md",
  "react/utils/use-render.md",
];

async function downloadFile(path: string): Promise<{ path: string; success: boolean; error?: string }> {
  const url = `${BASE_URL}/${path}`;
  const outputPath = join(OUTPUT_DIR, path.replace("react/", ""));

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { path, success: false, error: `HTTP ${response.status}` };
    }

    const content = await response.text();
    await mkdir(dirname(outputPath), { recursive: true });
    await Bun.write(outputPath, content);

    return { path, success: true };
  } catch (error) {
    return { path, success: false, error: String(error) };
  }
}

async function main() {
  console.log(`Downloading ${files.length} files to ${OUTPUT_DIR}/...\n`);

  const results = await Promise.all(files.map(downloadFile));

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✓ Downloaded ${succeeded.length} files`);

  if (failed.length > 0) {
    console.log(`✗ Failed ${failed.length} files:`);
    for (const f of failed) {
      console.log(`  - ${f.path}: ${f.error}`);
    }
  }
}

main();
