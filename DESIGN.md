---
name: LexiLift Minimalist
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#376850'
  on-secondary: '#ffffff'
  secondary-container: '#b7ebce'
  on-secondary-container: '#3c6c54'
  tertiary: '#a43a3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#baeed1'
  secondary-fixed-dim: '#9ed2b5'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#1e4f3a'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1120px
  gutter: 24px
---

## Brand & Style
The design system is anchored in a philosophy of "Essentialism for Intelligence." Designed specifically for a RAG (Retrieval-Augmented Generation) knowledge-base SaaS, the interface prioritizes clarity of thought and ease of reading. The brand personality is intellectual, calm, and hyper-focused, acting as a quiet vessel for the user's data.

The design style is **Minimalism** with subtle **Glassmorphism** influences. It utilizes heavy whitespace to reduce cognitive load, a strictly controlled color palette to prevent distraction, and high-quality typography to ensure the knowledge base remains the primary focus. The emotional response should be one of "digital serenity"—a workspace where complex information feels manageable and light.

## Colors
This design system employs a monochromatic grayscale foundation to maintain a professional, academic atmosphere. 

- **Primary:** A soft emerald green used exclusively for high-intent actions, success states, and indicating "active" intelligence or citations.
- **Neutrals:** A spectrum of cool grays provides depth without adding visual noise. The background uses a slightly off-white "Paper" tint to reduce eye strain.
- **Accents:** Usage of color is restricted. Functional colors (red for errors, amber for warnings) should be desaturated to fit the minimalist aesthetic.

## Typography
The typographic scale is designed for long-form reading and technical density. 

- **Headlines:** Manrope provides a modern, balanced geometric feel that remains professional.
- **Body:** Inter is used for its exceptional legibility in SaaS environments and systematic utility.
- **Technical/Metadata:** JetBrains Mono is used for citations, source code, and RAG metadata to differentiate "system data" from "user knowledge."

Maintain generous line heights (1.5x - 1.6x for body text) to ensure the content feels airy and accessible.

## Layout & Spacing
The layout follows a **Fixed Grid** model for document-centric views to maintain a comfortable reading width (max 720px for text blocks), transitioning to a **Fluid Grid** for dashboard views.

- **Desktop:** 12-column grid with 48px margins and 24px gutters. Content should be centered with significant "dead space" on the flanks to drive focus.
- **Tablet:** 8-column grid with 32px margins. 
- **Mobile:** 4-column grid with 16px margins. 

Use an 8px linear scale. For content-heavy RAG responses, prioritize vertical rhythm by using `spacing.lg` between major sections to allow the user's eyes to rest.

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layers** and **Low-contrast Outlines** rather than heavy shadows.

- **Level 0 (Background):** #FAFAFA.
- **Level 1 (Cards/Sidebar):** White surface with a 1px border (#E5E7EB). No shadow.
- **Level 2 (Modals/Popovers):** White surface with a very soft, diffused ambient shadow (0px 4px 20px rgba(0,0,0,0.04)) and a 1px border.
- **Interactivity:** Use subtle backdrop blurs (8px - 12px) for sticky headers to maintain the "airy" feel while scrolling through deep knowledge bases.

## Shapes
The shape language is "Soft-Modern." Elements use a 4px (0.25rem) base radius to appear precise and structured without being harsh. 

- **Small elements (Checkboxes, Tags):** 2px radius.
- **Standard elements (Buttons, Inputs, Cards):** 4px radius.
- **Large elements (Search Bars, Modals):** 8px radius.

Avoid pill-shapes or fully rounded circles except for user avatars, as the geometric precision of the soft-cornered rectangle better suits the "Knowledge-Base" narrative.

## Components
- **Buttons:** The primary button is Emerald Green with white text. Secondary buttons use a white fill with a light gray border and dark gray text. Terse, uppercase labels in JetBrains Mono can be used for utility actions.
- **Inputs:** Search bars are a central component. They should be oversized with a `headline-md` font size, a 1px light gray border, and a subtle inner glow on focus.
- **Citations/Chips:** Displayed in JetBrains Mono. Use a light emerald-tinted background (#ECFDF5) for citations that have been verified by the RAG system.
- **Cards:** Used for individual knowledge chunks or search results. Cards should have no shadow, only a 1px border that slightly darkens on hover.
- **Source Panel:** A slide-out panel using a subtle backdrop blur to overlay the main content, allowing the user to view original documents without losing their place in the AI-generated summary.