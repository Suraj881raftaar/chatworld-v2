# UI Wireframes & Layout Specs
## Chat World v2

This document details wireframes, accessibility tokens (WCAG 2.1), and light/dark theme rules.

---

### 1. Light and Dark Theme Contrast Layouts

The application supports both a standard dark theme (default) and a crisp light theme. Colors follow a curated CSS variables token set defined in `frontend/src/assets/index.css`.

#### 1.1 Contrast Verification (WCAG AA Compliance)
*   **Text vs Background Contrast:** Must achieve a minimum ratio of `4.5:1` (or `3:1` for text size `>= 18pt`).
*   **Focus Ring Indicator:** Every active element (`input`, `button`, interactive list elements) must display a clear, high-contrast focus outline when traversed via keyboard Tab navigation.
*   **Semantic Landmarks:** Main views wrap inside `<header>`, `<nav>`, `<main>`, and `<aside>` structural elements.

---

### 2. Main Desktop UI Wireframe (Light/Dark Mode Tokens)

```text
+-------------------------------------------------------------------------------------------------------------------+
| [CW v2] | Search Chats... [ Q ] | # General Channel                                               | (i) ROOM INFO |
+---------+-----------------------+-----------------------------------------------------------------+---------------+
| (o) User| ROOMS/DIRECT CHATS    | [Avatar] ChatMaster: Welcome to Chat World v2!      [13:21]     | # General     |
| Profile | +-------------------+ | [Avatar] Suraj: Rebuilding this with FastAPI + React [13:22]     |               |
| Settings| | # General       # | | [Avatar] Guest12: Awesome, real-time latency is low! [13:23]   | Description:  |
|         | | # AI Engineers  # | |                                                               | Main community|
| [Status]| | @ Avi (Direct)    | | [TanStack Query State: Syncing Offline Cached Messages...]      | chat channel. |
|  Busy   | | @ Jane (Direct)   | |                                                               |               |
|         | +-------------------+ |                                                               | MEMBERS:      |
| [Theme] |                       |                                                               | - ChatMaster  |
| [Dark]  |                       |                                                               | - Suraj       |
|         |                       |                                                               | - Guest12     |
| [Logout]|                       |                                                               |               |
|         |                       |                                                               |               |
|         |                       |                                                               |               |
|         |                       | +-------------------------------------------------------------+               |
|         |                       | | [ + Attachment ] [ Type your message here...           ] [>]| [Leave Room]  |
+---------+-----------------------+-----------------------------------------------------------------+---------------+
```

#### Layout Theme Color Tokens
*   **Dark Mode (Default):**
    *   Primary Background: HSL `224, 71%, 4%` (Deep Slate Blue)
    *   Surface Color: HSL `224, 71%, 7%` (Glass card base)
    *   Primary Text: HSL `210, 40%, 98%` (High contrast off-white)
    *   Accent Color: HSL `263, 70%, 50%` (Vibrant Violet, contrast-tested)
*   **Light Mode:**
    *   Primary Background: HSL `210, 40%, 98%` (Light soft grey-blue)
    *   Surface Color: HSL `0, 0%, 100%` (Pure white card base)
    *   Primary Text: HSL `222, 47%, 11%` (Deep navy blue-black)
    *   Accent Color: HSL `262, 80%, 48%` (High contrast violet)

---

### 3. Screen State Transitions (Zustand & TanStack Query states)

#### 3.1 Network Disconnected / Reconnecting banner
When connection drops, a system banner appears globally at the top of the interface:
```text
+-------------------------------------------------------------------------+
| [⚠️ Reconnecting to server... (Attempt 3/5 with exponential delay)]     |
+-------------------------------------------------------------------------+
```

#### 3.2 Loading Skeletons (For channel content hydration)
While TanStack query resolves REST calls:
```text
  [=== Skeleton Avatar ===]   [=== Skeleton Username Loading... ===]
  [==================== Skeleton Message Content =====================]
  [===================================================================]
```

#### 3.3 Offline State Support
Messages written while offline are cached in local memory. They show a **Clock indicator** (`⏳`) next to the message, which switches to a **Checkmark** (`✓`) once WebSockets push reconnects and synchronizes the packet.
