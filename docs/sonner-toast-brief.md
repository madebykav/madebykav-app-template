# @madebykav/ui -- Sonner/Toast Addition Request

**Date:** 2026-02-25
**From:** App Template (madebykav-app-template)
**Status:** Requested

## Summary

Out of the 17 component families used across platform apps, 16 are already available in @madebykav/ui. Toast notifications (via the Sonner library) are the only missing universal component. Every platform app needs toast notifications for user feedback after server actions -- save, delete, generate, export, and other async operations. Adding Sonner to the shared SDK eliminates per-app duplication and ensures consistent theming across the platform.

## Component Requested

- **Toaster** -- A themed wrapper component around the `sonner` library's `<Sonner />` component, pre-configured with platform design tokens.
- **toast** -- The imperative API re-exported from `sonner`, allowing components and server actions to trigger notifications programmatically.

## Why Platform-Wide

Toast notifications are not app-specific. Every app on the platform needs toast for user feedback:

- Save confirmations
- Delete confirmations
- Error messages from server actions
- Loading states for async operations (AI generation, export, etc.)
- Success/failure for form submissions

Without SDK support, each app maintains its own Sonner wrapper with identical theming code. Centralizing in @madebykav/ui ensures:

1. **Consistent theming** -- All toasts use platform design tokens automatically
2. **Zero per-app setup** -- Import and use, no wrapper code needed
3. **Single upgrade path** -- Sonner version updates happen once in the SDK

## Recommended Implementation

### Toaster Wrapper Component

The themed wrapper integrates Sonner with platform CSS variables. This code should live in @madebykav/ui alongside other components:

```tsx
"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={{
        "--normal-bg": "var(--color-background)",
        "--normal-text": "var(--color-foreground)",
        "--normal-border": "var(--color-border)",
      } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster };
```

## CSS Variable Integration

The wrapper maps three platform design tokens to Sonner's internal CSS variables:

| Sonner CSS Variable | Platform Token | Purpose |
|---------------------|----------------|---------|
| `--normal-bg` | `var(--color-background)` | Toast background color |
| `--normal-text` | `var(--color-foreground)` | Toast text color |
| `--normal-border` | `var(--color-border)` | Toast border color |

This ensures toasts match the platform theme without additional configuration. When the platform theme changes (e.g., future dark mode support), toasts automatically adapt via the CSS variables.

## Toaster Component Props

Key props to expose on the `<Toaster />` component:

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `theme` | `'light' \| 'dark' \| 'system'` | `'light'` | Platform uses light; expose for future dark mode |
| `position` | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | `'bottom-right'` | Let apps choose position |
| `richColors` | `boolean` | `false` | Recommend `true` for better success/error/warning UX |
| `closeButton` | `boolean` | `false` | Let apps opt-in to showing a close button |
| `duration` | `number` | `4000` | Reasonable default (milliseconds) |
| `expand` | `boolean` | `false` | Whether toasts expand on hover |
| `offset` | `string \| number` | `'32px'` | Distance from viewport edge |

All props are passed through to the underlying Sonner component via the spread (`{...props}`), so apps can override any prop as needed.

## toast() API Surface

The following functions should be re-exported from `sonner` for app usage:

| Function | Purpose |
|----------|---------|
| `toast(message)` | Default notification |
| `toast.success(message)` | Success with checkmark icon |
| `toast.error(message)` | Error with icon |
| `toast.info(message)` | Info notification |
| `toast.warning(message)` | Warning notification |
| `toast.loading(message)` | Loading spinner |
| `toast.promise(promise, opts)` | Auto-updates on resolve/reject |
| `toast.dismiss(id?)` | Dismiss specific or all toasts |

### toast.promise Example

```tsx
toast.promise(saveItem(data), {
  loading: "Saving...",
  success: "Item saved",
  error: "Failed to save item",
});
```

## Recommended Export Surface

From `@madebykav/ui`:

```tsx
// Re-export the themed Toaster wrapper
export { Toaster } from "./components/sonner";

// Re-export the toast imperative API from sonner
export { toast } from "sonner";
```

### App Usage Pattern

```tsx
// In root layout (once per app):
import { Toaster } from "@madebykav/ui";

// In components/actions (wherever needed):
import { toast } from "@madebykav/ui";
toast.success("Item saved");
```

## Dependency

Add `sonner` as a **direct dependency** of @madebykav/ui (NOT a peer dependency). Apps should not need to install sonner separately.

```json
{
  "dependencies": {
    "sonner": "^1.x"
  }
}
```

This is consistent with how @madebykav/ui handles other component libraries -- the SDK owns the dependency, and apps get it transitively.

## Integration Pattern

Apps place `<Toaster />` in their root layout, typically as the last child of `<body>`:

```tsx
// src/app/layout.tsx
import { Toaster } from "@madebykav/ui";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

Then in any component or server action:

```tsx
"use client";

import { toast } from "@madebykav/ui";

function SaveButton() {
  const handleSave = async () => {
    try {
      await saveItem(data);
      toast.success("Item saved");
    } catch {
      toast.error("Failed to save item");
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

## Source

This brief is based on the component gap analysis in [UI-COMPONENT-GAPS.md](../UI-COMPONENT-GAPS.md), which identified Sonner/Toast as the single missing universal component after auditing all 17 component families used across platform apps.
