# SJC Night Flight — Instruções para AI

**Leia [docs/design.md](docs/design.md) antes de qualquer interação com este projeto.**

Ele contém a arquitetura completa, sistemas de jogo, decisões de design e histórico técnico.
Sem isso, sugestões de código podem quebrar invariantes já estabelecidas.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Cliente | TypeScript + Vite, canvas 2D, Web Audio API |
| Servidor | Bun + `src/server.ts` (HTTP estático + WebSocket) |
| Build | `bun run build` → `dist/` (não versionado) |
| Deploy | fly.io (Dockerfile multi-stage) + GitHub Pages (CI via Actions) |

## Estrutura

```
src/
  types.ts        — enums e interfaces
  constants.ts    — dados imutáveis (planos, dificuldades, waves)
  state.ts        — singleton de estado mutável
  world.ts        — canvas, getSky(), VERSION
  audio.ts        — SFX + música procedural (Web Audio)
  entities.ts     — Player, Enemy, Bullet, Collectible…
  renderer.ts     — drawBg(), drawHUD(), drawMenu()…
  dev.ts          — painel DEV (setDevCallbacks para evitar ciclo)
  multiplayer.ts  — WebSocket, RemotePlayer, lobby (setMpCallbacks)
  game.ts         — loop principal, input, ondas
  main.ts         — entry point
  server.ts       — servidor Bun
docs/
  design.md       — documento de design completo
public/
  assets/         — sprites PNG (cloud.png, cloud_gelo.png…) servidos como URL estática
```

## Convenções

- Dependências circulares quebradas via callback registration (`setDevCallbacks`, `setMpCallbacks`)
- `import type` para dependências apagadas em runtime
- `enum` (não `const enum`) — `isolatedModules: true`
- `src/server.ts` excluído do tsconfig (Bun-specific, usa `// @ts-ignore` para `Bun.*`)
- Sem framework, sem biblioteca de jogo — canvas 2D puro
