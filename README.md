# 🪐 Orrery — Interactive WebGL Solar System

A real-time, interactive 3D solar system built from scratch in raw WebGL — no Three.js, no game engine, no shortcuts. Features all 8 planets with real NASA texture maps, Keplerian orbital mechanics, per-planet glowing orbit rings, and three camera modes including a top-down rainbow orrery view.

Live demo: [serenren13.github.io/orrery](https://serenren13.github.io/orrery)

---

## Table of Contents

1. [Project Description](#project-description)
2. [Installation](#installation)
3. [How to Use](#how-to-use)
4. [Major Components and Features](#major-components-and-features)
5. [Feature Status](#feature-status)
6. [The Math — WebGL, Orbits, and Rendering](#the-math--webgl-orbits-and-rendering)
7. [Credits](#credits)

---

## Project Description

Orrery is an interactive solar system simulator built entirely in raw WebGL (no abstraction libraries). It renders all 8 planets with real 2K NASA texture maps, physically-motivated Keplerian orbital speeds, and a custom ribbon-quad glow ring system for orbit paths. The project supports three view modes (Solar, System, Orrery), a Grand Tour automation mode, live and simulated time with a date scrubber from 1900–2100, and per-planet info cards.

This project was built on top of a WebGL sphere renderer originally written for **COMP 590: Introduction to Computer Graphics** at UNC Chapel Hill. The original codebase provided the sphere mesh geometry, shader infrastructure, and texture pipeline. Everything else — the orbital simulation, camera system, UI, ring rendering, Kepler math, and interaction layer — was designed and built from scratch as an independent extension.

---

## Installation

This is a static web project. No build step, no npm, no dependencies to install locally.

**To run locally:**
```bash
git clone https://github.com/serenren13/orrery.git
cd orrery
# open index.html in a browser, or use a local server:
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or whatever port your server uses).

**To deploy:**
The project is deployed via GitHub Pages from the `main` branch root. Push to `main` and it auto-deploys.

**External dependencies (CDN, no install needed):**
- `initShaders.js` and `MV.js` — from Angel & Shreiner's *Interactive Computer Graphics* (UNM mirror)
- `msphere.js` — sphere mesh geometry (Brent Munsell, via jsDelivr)

**Texture files** must be present in the project root. They are sourced from NASA's Solar System Exploration texture library (2K resolution):
```
2k_stars_milky_way.jpg, 2k_sun.jpg, 2k_mercury.jpg,
2k_venus_surface.jpg, 2k_venus_atmosphere.jpg, 2k_earth_daymap.jpg,
2k_mars.jpg, 2k_jupiter.jpg, 2k_saturn.jpg,
2k_uranus.jpg, 2k_neptune.jpg, 2k_moon.jpg
```

---

## How to Use

| Control | Action |
|---|---|
| **SOLAR / SYSTEM / ORRERY** buttons | Switch between camera views |
| **Planet symbol bar** (top) | Select a planet — updates info card and highlights its ring |
| **Click a planet** in the scene | Select and fly to it (in Solar view) |
| **Hover a planet** | Shows name label |
| **GRAND TOUR** button | Auto-cycles through all 8 planets |
| **SIMULATED / LIVE** toggle | Switch between real-time clock and scrubable simulation |
| **Date scrubber** | Drag to any date between 1900 and 2100 |
| **SNAP TO TODAY** | Resets simulation date to today |
| **Camera sliders** (X, Y, Z, FOV) | Manual camera control |
| **SPEED slider** | Adjust orbital animation speed (0–10x) |

---

## Major Components and Features

### `fp.js` — Core Renderer and Simulation Loop
The main file. Manages the WebGL draw loop, planet animation, camera lerp system, planet selection, time simulation, and all rendering calls. Planets are animated using angular velocity derived from real orbital periods. The draw loop runs at ~30fps via `setInterval`.

### `kepler.js` — Orbital Mechanics
Implements Kepler's equation for real planetary positions when Live mode or the date scrubber is active. Solves the eccentric anomaly iteratively and converts to heliocentric (x, z) coordinates in the simulation's scaled coordinate system.

### `index.html` — Shaders and UI
Contains the GLSL vertex and fragment shaders as inline `<script>` tags. The vertex shader handles sphere scaling, Y-axis rotation, and translation in a single pass using the `props` and `trans` uniforms. The fragment shader supports two rendering modes: Phong-shaded texture sampling (planets) and flat solid-color output (orbit rings), toggled via the `use_solid_color` uniform.

### `fp.css` — UI Styling
All HUD panels, info cards, planet symbol bar, time panel, and view toggles. Designed for a dark space aesthetic with monospace type and per-planet CSS custom properties for color theming.

### `listeners.js` — Camera Sliders
Event listeners for the camera position (X/Y/Z), FOV, and orbit speed range inputs.

### `helpers.js` — Geometry Utilities
From the original COMP 590 codebase. Provides `flipz()` and `setVOriginToZero()` for mesh geometry manipulation.

### Orbit Ring System
Each orbit path is rendered as a WebGL ribbon quad strip (`TRIANGLE_STRIP`) — a thin band of triangles forming a ring at each planet's orbital radius. In Solar and System views, only the selected planet's ring gets a 3-pass glow effect (wide soft pass, medium pass, crisp bright pass). In Orrery view, all 8 rings glow simultaneously in their planet's color, producing the rainbow top-down view.

### Camera System
Three preset views (Solar, System, Orrery) with smooth cubic ease-in-out camera interpolation (`flyToPosition`). Clicking a planet in Solar view triggers a fly-to animation that positions the camera behind the planet at a proportional offset. The Grand Tour automates this across all 8 planets on a timer.

---

## Feature Status

| Feature | Status |
|---|---|
| All 8 planets with 2K NASA textures | ✅ Complete |
| Moon orbiting Earth | ✅ Complete |
| Venus atmospheric layer | ✅ Complete |
| Milky Way skybox | ✅ Complete |
| Phong lighting model (sun as light source) | ✅ Complete |
| Per-planet orbit rings (ribbon quad strip) | ✅ Complete |
| Per-planet ring glow color | ✅ Complete |
| Rainbow orrery mode (all rings glowing) | ✅ Complete |
| Three camera view modes | ✅ Complete |
| Camera lerp with ease-in-out | ✅ Complete |
| Planet selection (click + symbol bar) | ✅ Complete |
| Grand Tour automation | ✅ Complete |
| Info card per planet | ✅ Complete |
| Live time mode | ✅ Complete |
| Simulated time with date scrubber (1900–2100) | ✅ Complete |
| Keplerian real positions | ✅ Complete |
| Hover label on mouseover | ✅ Complete |
| Fly-to camera for outer planets (Uranus/Neptune) | ⚠️ Needs offset scaling |
| Favicon | ⚠️ Missing (404) |

---

## The Math — WebGL, Orbits, and Rendering

### Raw WebGL Pipeline
There is no scene graph or abstraction layer. Every frame, the JavaScript manually:
1. Clears the depth and color buffers
2. Computes the view matrix (`lookAt`) and projection matrix (`perspective`)
3. Uploads uniform values to the GPU (camera position, light position, transform props)
4. Binds the correct VBOs (vertex, normal, texcoord) and draws with `gl.TRIANGLES`

The vertex shader receives `props` as a `vec4` where `.w` is the uniform scale and `.y` is the Y-rotation angle. It builds rotation and translation matrices inline in GLSL and applies them per vertex — no model matrix uniform, everything derived from `props` and `trans` at draw time.

### Sphere Geometry
Sphere vertices, normals, and faces come from `msphere.js` (a precomputed icosphere subdivision). Texture coordinates are computed analytically from vertex positions using spherical projection:
```
θ = atan2(x, z)         → maps to U: (θ + π) / 2π
φ = atan2(√(x²+z²), y) → maps to V: φ / π
```

### Orbital Animation
In simulated mode, each planet accumulates an angle each frame proportional to its real orbital period relative to Earth's:
```
angular_velocity = base_speed × (Earth_period / planet_period)
```
In Live/scrubber mode, `kepler.js` solves Kepler's equation for the true anomaly given a Julian date, returning heliocentric (x, z) in AU scaled to the simulation's coordinate space.

### Phong Lighting
The fragment shader implements Phong shading with ambient, diffuse, and specular components. The sun is the light source at the origin. Shininess is fixed at 800.0 (high specular for the wet-look planet surfaces). The specular term is zeroed when `dot(L, N) < 0` to avoid backface highlights.

### Orbit Ring Rendering
Each ring is a `TRIANGLE_STRIP` of 258 vertices (129 pairs of inner/outer points at radii 0.97 and 1.03, scaled by the planet's orbital radius uniform). The selected ring uses three draw passes at slightly different radii and alpha values to fake a glow blur in screen space — a pure GPU approach with no post-processing or 2D canvas overlay.

The fragment shader routes ring draws through a `use_solid_color` uniform branch, bypassing texture sampling entirely and outputting `vec4(color.rgb, u_alpha)` directly.

---

## Credits

- **Serenity Phillips** — orbital simulation, camera system, ring renderer, UI, shaders, Kepler math, all extensions beyond the base sphere renderer
- **Base sphere renderer** — adapted from COMP 590: Introduction to Computer Graphics coursework, UNC Chapel Hill
- **Shader infrastructure** (`initShaders.js`, `MV.js`) — Edward Angel & Dave Shreiner, *Interactive Computer Graphics*, 7th ed.
- **Sphere mesh** (`msphere.js`) — Brent Munsell
- **Textures** — NASA Solar System Exploration (public domain, 2K series)
