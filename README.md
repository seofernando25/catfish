# Catfish 🎣😺

A 3D multiplayer fishing game built with modern web technologies.

## Technology Stack

- **Frontend**: Three.js, Preact, Socket.IO
- **Backend**: Bun, Socket.IO
- **Shared**: Entity Component System (ECS) architecture
- **Features**:
  - 3D rendering with Three.js
  - Real-time multiplayer with Socket.IO
  - Procedural world generation
  - Chunk-based world system
  - Reactive state management with Preact Signals
  - Entity Component System for game logic

## Project Structure

- `client/`: Three.js-based game client
- `server/`: Bun-based game server
- `common/`: Shared code between client and server
  - ECS implementation
  - Game systems
  - World generation
  - Network synchronization
- `assets/`: Game assets
- `tools/`: Development utilities

## Running locally 

This project requires [Bun](https://bun.sh/) to run.

```bash
# Install dependencies
bun install
```

```bash
# Start the backend server (localhost:3000)
bun run server
```

```bash
# Start the game client (localhost:1234)
bun run client
```

## Development

The project uses a monorepo structure with workspace packages. Key features include:

- Hot reloading for both client and server
- Shared TypeScript code between client and server
- Entity Component System for game logic
- Chunk-based world system
- Procedural content generation
- Real-time multiplayer support

