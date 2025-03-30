# VibeCraft

A block-based Minecraft clone built with Three.js and TypeScript.

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser and navigate to the URL displayed in the console (usually http://localhost:5173)

## Controls

- **WASD**: Move around
- **Mouse**: Look around
- **Space**: Jump
- **Ctrl+F**: Toggle fly mode
  - In fly mode, use **Space** to go up and **Shift** to go down
- **Left Click**: Break block
- **Right Click**: Place block
- **1-9 Keys**: Select block type
  1. Dirt
  2. Grass
  3. Stone
  4. Wood
  5. Leaves
  6. Water
  7. Sand
  8. Glass
  9. Brick

## Features

- Procedurally generated terrain using Perlin noise
- Efficient chunk-based world system
- Dynamic block placement and destruction
- Collision detection
- First-person controls
- Basic physics with gravity and jumping
- Different block types with unique textures

## Technical Details

The game is built using:

- Three.js for 3D rendering
- TypeScript for type safety
- Vite for fast development and bundling

The world is divided into chunks, and only visible faces are rendered to optimize performance. A custom SimplexNoise implementation is used for terrain generation.

## Future Improvements

- Optimized rendering with instanced meshes
- Save/load world functionality
- Multiplayer support
- More block types and biomes
- Sound effects and music
- Custom textures and models 