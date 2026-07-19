# UI Design System
## Chat World v2

This document defines the visual design system, CSS variables, spacing scales, typography, and interactive state components for Chat World v2.

---

### 1. Color System (HSL Tokens)

The UI utilizes CSS Custom Properties with HSL values to support dark (default) and light themes seamlessly.

```css
/* Dark Mode Colors (Default) */
:root[data-theme="dark"] {
  --background: 224 71% 4%;     /* Deep Slate Blue */
  --foreground: 210 40% 98%;    /* Off-white text */
  --card: 224 71% 7%;           /* Dark Card Background */
  --card-border: 224 71% 15%;   /* Subtle Border */
  --primary: 263 70% 50%;       /* Royal Violet */
  --primary-foreground: 210 40% 98%;
  --accent: 190 90% 50%;        /* Cyan Highlight */
  --muted: 215 15% 65%;         /* Soft Slate Text */
  --success: 142 70% 45%;       /* Emerald Green */
  --warning: 35 92% 50%;        /* Amber Yellow */
  --error: 0 84% 60%;           /* Crimson Red */
}

/* Light Mode Colors */
:root[data-theme="light"] {
  --background: 210 40% 98%;    /* Light off-grey */
  --foreground: 222 47% 11%;    /* Deep Navy text */
  --card: 0 0% 100%;            /* Pure White Card */
  --card-border: 214 32% 91%;   /* Light Grey Border */
  --primary: 262 80% 48%;       /* High Contrast Violet */
  --primary-foreground: 210 40% 98%;
  --accent: 190 95% 35%;        /* Darker Cyan */
  --muted: 215 16% 47%;         /* Darker Slate Text */
  --success: 142 76% 36%;       /* Darker Emerald */
  --warning: 38 92% 50%;
  --error: 0 84% 60%;
}
```

---

### 2. Glassmorphism Properties
To achieve a premium modern aesthetic, cards and panels use background filters:
*   **Blur Strength:** `backdrop-filter: blur(12px) saturate(180%)`
*   **Background Opacity:** `rgba(15, 23, 42, 0.65)` in Dark Mode, `rgba(255, 255, 255, 0.75)` in Light Mode.
*   **Border:** `1px solid var(--card-border)`.

---

### 3. Typography (Google Fonts)

*   **Primary Font Family:** `Inter`, Sans-serif (for UI elements, code, message input).
*   **Display Font Family:** `Outfit`, Sans-serif (for headers, channels titles, brand logo).
*   **Font Weights:** Regular (`400`), Medium (`500`), Semi-Bold (`600`), Bold (`700`).
*   **Line Heights:** Standard (`1.2` for headings, `1.5` for message text).

---

### 4. Spacing Scale (8px Grid)

The system uses an 8px grid spacing system matching Tailwind spacing classes:
*   `space-1`: `4px` (0.25rem)
*   `space-2`: `8px` (0.5rem)
*   `space-3`: `12px` (0.75rem)
*   `space-4`: `16px` (1rem)
*   `space-6`: `24px` (1.5rem)
*   `space-8`: `32px` (2rem)

---

### 5. Interactive States & Accessibility (WCAG 2.1)

*   **Hover State:** Transitions must have a duration of `150ms ease-in-out` (e.g. background opacity transitions).
*   **Focus Ring Indicator:** Clear focus ring with high-contrast outlines for keyboard users:
    ```css
    .focus-ring:focus-visible {
      outline: 2px solid hsl(var(--primary));
      outline-offset: 2px;
    }
    ```
*   **Active States:** Element drops size by `1%` on click using transitions to convey a mechanical press feel.
*   **Status Indicator Dots:** Color blind accessible: Status is indicated by a color dot (green/grey) paired with screen reader text (e.g. `<span class="sr-only">User is online</span>`).
