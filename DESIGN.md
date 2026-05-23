---
name: Structure & Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-md:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for the construction and architecture industry, emphasizing structural integrity, clarity, and technological advancement. It targets project managers, site engineers, and architects who require high-density information without cognitive fatigue.

The style is **Corporate / Modern** with a focus on **Minimalism**. It utilizes a systematic approach to whitespace and information architecture to mirror the precision of a blueprint. The UI should evoke a sense of reliability, efficiency, and professional rigor, balancing the heavy nature of construction with a lightweight, responsive digital experience.

## Colors
The palette is rooted in a **Deep Professional Blue** (#0F172A) which provides the structural foundation for navigation and headers. This is contrasted by a **Cyan secondary** (#06B6D4) used for primary calls to action and interactive states, signaling progress and innovation.

**Emerald** (#10B981) serves as a functional tertiary color for success states, safety certifications, and "on-track" project indicators. The background and surface layers utilize **Slate Grays** (ranging from #F8FAFC for backgrounds to #64748B for secondary text), ensuring a sophisticated, low-strain environment for long-term usage.

## Typography
This design system utilizes **Inter** for all functional and display text to ensure maximum legibility across technical data. The typographic scale is highly disciplined, using tight tracking on larger headlines to maintain a "built" feel. 

For technical specifications, dimensions, or coordinate data, **JetBrains Mono** is introduced as a secondary mono-spaced font. Line heights are generous in body text to prevent dense construction logs from becoming unreadable, while labels use all-caps with increased letter-spacing to denote metadata and categories.

## Layout & Spacing
The layout follows a **12-column fluid grid** for desktop and a **4-column grid** for mobile. A strict 8px base unit (the "module") governs all spatial relationships. 

- **Desktop:** 40px side margins with 24px gutters. Use "Surface Containers" to group related technical data into logical zones.
- **Mobile:** 16px side margins. Horizontal scrolling is permitted for wide data tables or blueprint previews.
- **Density:** Provide two density modes—"Standard" for general navigation and "Compact" for data-heavy inspection logs and inventory management.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Low-contrast outlines** rather than heavy shadows. In this design system, the background is the lowest layer (Slate 50). 

Cards and primary containers use a white surface with a subtle 1px border (Slate 200). Elevated states (like a card being dragged or a modal) use a single, highly-diffused ambient shadow with a Slate-tinted hue (e.g., `0 10px 15px -3px rgba(15, 23, 42, 0.08)`). This maintains the "clean" aesthetic while providing enough visual affordance for hierarchy.

## Shapes
The shape language balances professional rigidity with modern accessibility. All primary UI elements (buttons, input fields, cards) use a **0.5rem (8px)** corner radius. 

Larger containers or promotional sections may scale up to **1rem (16px)**. This specific radius is chosen to feel "engineered" yet approachable—avoiding the clinical sharpness of 0px while staying away from the overly casual nature of pill shapes.

## Components
- **Buttons:** Primary buttons use the Cyan secondary color with white text. Ghost buttons use the Deep Blue for text and a Slate 200 border. High-emphasis "Alert" buttons (for safety issues) use a soft red background, never orange.
- **Inputs:** Use a 1px Slate 200 border that transitions to Cyan 500 on focus. Labels should always be visible above the field in `label-md` style.
- **Chips:** Used for project status (e.g., "In Progress," "Pending Inspection"). Use low-saturation background tints of the status color with high-saturation text for readability.
- **Data Tables:** These are the core of the IA app. Use a "Zebra" striping pattern with Slate 50. Row heights should be 48px for standard and 40px for compact.
- **Cards:** Used for project overviews. Must include a `title-md` header, a 1px divider, and a padding of 24px for content.
- **Status Indicators:** Small 8px dots (Emerald for active, Slate for inactive, Red for blocked) to indicate real-time site status.
