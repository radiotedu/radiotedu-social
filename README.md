# RadioTEDU Social

> 2.5D isometric virtual campus and study world for TED University students, powered by RadioTEDU.

RadioTEDU Social is an interactive, pixel-art campus experience built for the web. Students can meet in authentic TEDU campus spaces (TEDU A Blok Library, Ahmet Ersan Auditorium, Bilgisayar Laboratuvarı, Orta Bahçe / Çim Alan, Swimming Pool), study together, use moderated room chat, customize avatars in the Exclusive Store, and listen to synchronized RadioTEDU broadcasts.

---

## 🎮 Features

- **Authored 2.5D Isometric Campus Rooms:** Authentic TED University locations with precise collision meshes, depth sorting, and occlusion masks.
- **Customizable Avatar System:** 8-direction layered sprite rendering (skin tones, hairstyles, shirts, hoodies, varsity jackets, trousers, shoes, accessories).
- **Interactive Multi-Room Seating:** Over 50+ authored study chairs and auditorium seating with natural occupant silhouettes.
- **Real-Time Study & Pomodoro Tracking:** Server-synchronized focus timers, streak milestones, and live presence.
- **Gold & Rewards Economy:** Earn Gold by studying and participating in campus activities, spendable in the campus wardrobe and store.
- **Deep Dive Arcade Mini-Game:** Integrated pool mini-game with custom jump physics and choreography.
- **Multi-Device Responsive Design:** Fully responsive layout with custom mobile touch HUD and desktop viewport scaling.

---

## 🛠️ Tech Stack

- **Frontend & Game Engine:** TypeScript, Vite, Phaser 4 / Canvas 2D, Lucide Icons
- **Testing & QA:** Vitest (unit & contract testing), Playwright (E2E & visual regression testing)
- **Image Processing:** Sharp, Node.js tooling

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v20.x or higher
- **npm:** v10.x or higher

### Installation

```bash
# Clone repository
git clone https://github.com/radiotedu/radiotedu-social.git
cd radiotedu-social

# Install dependencies
npm install
```

### Development

```bash
# Start local Vite development server
npm run dev
```

### Building for Production

```bash
# Build seat layers, gear previews, and compile production bundle
npm run build
```

### Testing

```bash
# Run unit and contract tests
npm test

# Run Playwright E2E tests
npm run test:e2e
```

---

## 📄 License & Attributions

Please see [ATTRIBUTIONS.md](ATTRIBUTIONS.md) and [SECURITY.md](SECURITY.md) for licensing, asset credits, and security policies.

Published with ❤️ by [RadioTEDU](https://radiotedu.com) & TED University.
