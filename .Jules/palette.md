## 2024-05-08 - Accessible Header Hamburger Menu & Search Trigger
**Learning:** `div` and `label` elements acting as interactive UI components like buttons often lack semantic accessibility for screen readers and keyboard users.
**Action:** Always ensure custom interactive UI elements have `role="button"`, `tabindex="0"`, `aria-label`, and keyboard event handlers (for 'Enter' and 'Space') to guarantee accessibility compliance.
