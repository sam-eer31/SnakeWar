# Snake.io - Modular Offline Canvas Game (Next.js Static)

A high-performance, modular, and scalable **Slither.io / Worm.io style arena game** built completely with **Next.js**, **TypeScript**, **Tailwind CSS**, and **HTML5 Canvas 2D**.

---

## 🌟 Key Features

- **Decoupled Modular Architecture**: Game loop, physics, spatial partitioning, AI bots, and rendering are completely isolated from React.
- **Pure Client & Completely Static**: Exports directly to pure static HTML/JS (`output: 'export'`) for zero-server hosting (GitHub Pages, Vercel, Netlify, Cloudflare Pages, S3).
- **100% Offline with Zero External Asset Dependencies**:
  - Sound effects synthesized on-the-fly with the native **Web Audio API** (no missing audio assets or network lag).
  - High-res vector and procedural rendering with neon glow effects.
- **Smart Autonomous AI Bots**:
  - Raycasted collision avoidance fan.
  - Feeding, wandering, and aggressive player-hunting behaviors.
  - Automatic population management.
- **Spatial Hash Grid Partitioning**:
  - Efficient $O(1)$ collision checks allowing 1,200+ food orbs and 30+ snakes simultaneously at 60–120 FPS.
- **Power-Ups System**:
  - 🧲 **Magnet**: Attracts food from a wide radius.
  - ✖️2 **2X Multiplier**: Doubles mass gain.
  - ⚡ **Turbo Rush**: Boost speed with zero mass loss.
  - 👻 **Ghost Phase**: Invulnerability to body collisions for 5 seconds.
- **Customization & Settings**:
  - **Skins Wardrobe**: 8 vibrant skins with custom patterns, gradient segments, expressive tracking eyes, and accessories (Crowns, Horns, Halos, Sunglasses).
  - **Graphics Presets**: Ultra, High, Medium, Low (toggle glowing shadows, particle counts, and screen shake).
  - **Flexible Controls**: Mouse tracking, Arrow/WASD keys, and Mobile Virtual Joystick.
  - **HUD**: Real-time Minimap radar, dynamic leaderboard, boost gauge, score & kills counters, and FPS monitor.

---

## 🏗️ Modular Architecture Directory

```
src/
├── app/                      # Next.js App Router (layout, static page, 404)
├── components/
│   ├── GameView.tsx          # Master Game Orchestrator Component
│   ├── HUD/
│   │   ├── Minimap.tsx       # Circular arena radar with live entity blips
│   │   ├── Leaderboard.tsx   # Top 10 rank list with crowns & player highlight
│   │   ├── ScoreDisplay.tsx  # Score, length, kills, and high score badges
│   │   ├── BoostGauge.tsx    # Fuel & turbo status bar
│   │   └── PowerUpStatus.tsx # Active timers and progress rings
│   ├── Menus/
│   │   ├── StartMenu.tsx     # Serpent call-sign input, mode select & launcher
│   │   ├── GameOverModal.tsx # Post-match stats breakdown & retry
│   │   ├── SkinSelector.tsx  # Animated slithering skin preview wardrobe
│   │   └── SettingsModal.tsx # Graphics, audio, and control configuration
│   └── UI/
│       └── VirtualJoystick.tsx # Mobile/touch virtual joystick & boost button
└── game/
    ├── config/
    │   ├── constants.ts      # Game balance, speeds, arena dimensions
    │   ├── skins.ts          # Skin definitions, palettes, accessories
    │   └── settings.ts       # Settings schema & localStorage persistence
    ├── core/
    │   ├── Vector2D.ts       # High-performance 2D vector mathematics
    │   ├── SpatialHashGrid.ts# Fast O(1) spatial bucket collision detection
    │   ├── Camera.ts         # Viewport tracking, dynamic zoom & screen shake
    │   └── GameLoop.ts       # Delta-time requestAnimationFrame loop & FPS counter
    ├── entities/
    │   ├── Snake.ts          # Inverse kinematics body physics & steering
    │   ├── Food.ts           # Food orbs & attraction physics
    │   ├── FoodManager.ts    # Food lifecycle, corpse drops & replenishment
    │   └── PowerUp.ts        # Collectible buff entities
    ├── ai/
    │   ├── BotBrain.ts       # Sensor raycasting & decision state machine
    │   └── BotManager.ts     # Bot spawning & arena population balancer
    ├── audio/
    │   └── SoundManager.ts   # Web Audio API synthesizers (Eat, Boost, Death, PowerUp)
    ├── render/
    │   ├── CanvasRenderer.ts # Layered canvas renderer & view frustum culling
    │   └── ParticleSystem.ts # Boost trails, spark bursts & death explosions
    └── GameEngine.ts         # Master Engine coordinating all sub-modules
```

---

## 🚀 How to Run

### Development Mode:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Static Build:
```bash
npm run build
```
The static website will be exported directly to the `/out` directory, ready to be hosted anywhere.

