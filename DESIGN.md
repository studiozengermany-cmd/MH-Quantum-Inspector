# Design System: MH-Quantum Inspector

## 1. Visual Theme & Atmosphere
An **Editorial Luxury** interface with ethereal nuances. A restrained, gallery-airy environment featuring confident Double-Bezel (Doppelrand) architecture and fluid spring-physics motion. The atmosphere is clinical yet deeply tactile—like a meticulously printed design magazine transposed into a digital software interface.

## 2. Color Palette & Roles
- **Editorial Cream** (`#F4F2EC`) — Primary canvas background. Imparts warmth and physical texture.
- **Pure Surface** (`#FDFBF7`) — Outer shell container background.
- **Absolute White** (`#FFFFFF`) — Inner core container fill.
- **Deep Charcoal Ink** (`#0F1115`) — Primary text, primary CTA fill, tactical icons.
- **Muted Steel** (`#6B7280` & `#9CA3AF`) — Secondary text, instruction descriptions, eyebrow tags.
- **Electric Blue Accent** (`#2563EB`) — The MH-Quantum Target Logo stroke. Highly controlled usage.
- **Emerald Pulse** (`#10B981`) — System Online status indicator.
- **Crimson Alert** (`#EF4444`) — Stop/Deactivate destructive active state.

*(Mandatory constraint: Max 1 accent color per context. No pure black `#000000`. No purple/neon gradients.)*

## 3. Typography Rules
- **Display / Brand Identity:** `Playfair Display` (Serif) — Track-tight (`letter-spacing: -0.03em`), elegant, high-contrast. Used exclusively for the Brand Name to evoke supreme editorial authority.
- **Interface / Body / Dashboard:** `Geist` (Sans-Serif) — Relaxed leading, neutral secondary color, utilized for all functional UI text, buttons, and instructions.
- **Mono:** System `monospace` — Reserved exclusively for keyboard shortcuts (e.g., `Ctrl+Shift+X`) and raw data outputs.
- **Banned:** `Inter`, generic system fonts, and generic serifs (`Times New Roman`). Serifs are banned in the general Dashboard UI (allowed strictly for the Logo).

## 4. Component Stylings
- **Buttons (Button-in-Button):** Deep Charcoal fill, fully pill-shaped (`border-radius: 9999px`). Includes an inner circular icon wrapper. Tactile active state with scale-down (`scale: 0.96`) and Y-translation (`translateY: 2px`). Hover states trigger diagonal translation (`translate(4px, -1px)`) for the inner icon. Flat design, no outer glow.
- **Double-Bezel Architecture (Doppelrand):** Cards and control panels are never flat. 
  - *Outer Shell:* 1px structural line (`rgba(15, 17, 21, 0.04)`), 8px padding, `32px` radius.
  - *Inner Core:* Absolute White, `24px` radius, inset white shadow (`inset 0 1px 1px rgba(255,255,255,1)`) to mimic edge refraction.
- **Eyebrow Tags:** Micro-hierarchy indicators above functional areas (`text-[9px] uppercase tracking-[0.25em] font-bold`).
- **Texture:** A fixed CSS film grain noise overlay (`opacity: 0.04`) applies physical texture to break digital flatness across the entire viewport.

## 5. Layout Principles
- **Spatial Rhythm:** Generous vertical padding and whitespace maximization. Every element occupies its own clear spatial zone. No overlapping elements.
- **Centering:** The Dashboard strictly centers content vertically and horizontally within the constrained extension popup viewport (360px width).
- **Hierarchy:** Established through depth (Double-Bezel), typography scale, and extreme contrast (Charcoal vs. Cream).

## 6. Motion & Interaction
- **Physics Engine:** Spring physics (`var(--spring): cubic-bezier(0.32, 0.72, 0, 1)`) for all interactive transitions, mimicking weighty, natural momentum.
- **Staggered Orchestration:** `revealUp` entry animations cascading from top to bottom (0ms, 100ms, 200ms delays) combining Y-axis translation with opacity fade. Never mount everything at once.
- **Perpetual Micro-Interactions:** Continuous `pulse` animation for the online status dot.
- **Hardware Acceleration:** Animate exclusively via `transform` and `opacity`. 

## 7. Anti-Patterns (Banned)
- No emojis anywhere.
- No `Inter` font.
- No generic serif fonts (`Times New Roman`, `Georgia`).
- No pure black (`#000000`).
- No neon/outer glow shadows.
- No oversaturated accents.
- No excessive gradient text on large headers.
- No custom mouse cursors.
- No 3-column equal card layouts.
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen").
- No flat, textureless backgrounds.
