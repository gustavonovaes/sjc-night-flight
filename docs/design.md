# SJC Night Flight — Guardião do Vale do Paraíba

## Visão geral

**Tema:** São José dos Campos (SJC) e a famosa _Noite dos Discos Voadores_ de 19/05/1986, quando a FAB interceptou 21 OVNIs sobre o Vale do Paraíba.  
**Objetivo:** Pilotar um avião (Embraer) defendendo o Vale do Paraíba contra frentes frias, drones, araras, OVNIs e o chefe final (Monstro Climático).  
**Canvas lógico:** 800×450 pixels, escalado por CSS para preencher a tela mantendo a proporção 16:9.

---

## Mecânicas de jogo

### Movimento do jogador

- Teclado: setas ou WASD para mover em qualquer direção.
- Touch: joystick virtual desenhado no canvas — o toque inicial define o centro; arrastar define a direção e intensidade.
- O avião tem inércia suave (`vx/vy` com fator 0.84) e inclinação visual (`tilt`) proporcional à velocidade vertical.

### Tiro automático

- O jogador dispara automaticamente a cada `FIRE_N = 24` frames (modo normal) ou `FIRE_B = 7` frames (modo Boost).
- Modo Boost: tiro triplo (central + diagonal acima + diagonal abaixo). Com Boost **e** Asa Delta ativos simultaneamente: tiro quíntuplo (ângulos −0.16, −0.08, 0, +0.08, +0.16).

### Vidas e invencibilidade

- Cada avião define seu próprio `lives` (e `maxLives`); o HUD exibe `Math.max(maxLives, lives)` ícones. `MAX_LIVES = 3` é a constante legada, mas C-390 começa com 4.
- Cada acerto remove uma vida e ativa invencibilidade por `INV = 120` frames (o avião pisca).
- Com escudo ativo: absorve um acerto sem perder vida, ativa invencibilidade por 80 frames.
- Com 14-BIS ativo: imune a qualquer dano.
- VIDA +1 (`hp_up`): incrementa `player.lives` até `maxLives + 2`.

### Combo e pontuação

- Cada inimigo destruído incrementa o multiplicador de combo e reseta o timer para 130 frames.
- Combo máximo: ×10 em Aventura, ×50 em Radical.
- Se nenhum inimigo for destruído em 130 frames, o combo volta para 1.
- Pontos = valor base do inimigo × multiplicador de combo atual.
- Recordes por dificuldade em `localStorage` (`sjc_hi_aventura`, `sjc_hi_radical`).
- Pontuação **cumulativa** entre partidas salva em `sjc_total_score` — usada para desbloquear aviões.

### Grazing

- Voar muito próximo de um projétil inimigo (d < 22px, d > 14px) sem ser atingido marca `b.grazed = true` e concede `6 × combo` pontos.
- Cada graze reduz o cooldown do Pulso Avibras em 14 frames.

### Rádio SJC

- `radioText` + `radioT` exibem mensagens de Torre SJC/FAB/CEMADEN por 200 frames no canto inferior esquerdo.
- Mensagens são enfileiradas em `radioQueue` com delay opcional.
- Disparado em: início de cada wave, spawn de boss, evento OVNI, coleta de Avibras/14-BIS, HP crítico (1 vida).

### Eventos atmosféricos

### Modos de dificuldade

Selecionado no menu via ↑↓. Configuração persistida em `selectedDifficulty` (índice de `DIFFICULTIES`).

| Parâmetro           | 🌅 AVENTURA       | 🔥 RADICAL       |
| ------------------- | ----------------- | ---------------- |
| Combo máximo        | ×10               | ×50              |
| HP dos inimigos     | ×0.65             | ×1.1             |
| Spawn mínimo (f)    | 44                | 22               |
| Spawn base (f)      | 170               | 145              |
| spawnWaveMult       | 5                 | 15               |
| spawnTimeMult       | 300               | 270              |
| Interval boss (f)   | 4800 (~80s)       | 2400 (~40s)      |
| 2º boss na onda     | 18+               | 9+               |
| Mult. drops powerup | ×1.5              | ×0.85            |
| HS localStorage     | `sjc_hi_aventura` | `sjc_hi_radical` |

**Curva de spawn no Radical:** wave 0 = ~145f entre spawns → intensidade máxima (piso `spawnMin=22`) atingida apenas na wave 8.

`diffCfg` é definido em `startGame()` e referenciado em: spawn timer, boss interval, combo cap, double-boss wave, `Enemy` constructor (`hpMult`), `dropCollectibles` (`dropMult`).

### DDA — Dynamic Difficulty Adjustment

Baseado em **Flow Theory** (Csikszentmihalyi, 1975): a experiência ótima ocorre quando desafio ≈ habilidade do jogador. Abaixo → tédio; acima → ansiedade.

**Só ativo em Aventura.** Radical usa curva determinística — o jogador precisa evoluir, sem concessões.

`ddaStress ∈ [0, 1]` — índice de sobrecarga do jogador:

| Evento           | Δ `ddaStress`                            |
| ---------------- | ---------------------------------------- |
| Cada frame       | `−0.0007` (decai naturalmente ao neutro) |
| Combo ≥ 5        | `−0.0004` extra por frame                |
| Jogador leva hit | `+0.20`                                  |

Aplicado ao timer de spawn:

```
ddaAdjust = 1 + (ddaStress − 0.5) × 0.4   // [0.80 … 1.20]
spawnT    = max(spawnMin, baseSpawnT × ddaAdjust)
```

Stress ≈ 1 → spawns 20% mais lentos (janela de recuperação). Stress ≈ 0 → spawns 20% mais rápidos (pressão extra). Ajuste invisível ao jogador — cria o "flow channel" de Csikszentmihalyi. Resetado para `0.5` em `startGame()`.

### Missão CBERS

- Satélite entra pela direita a cada ~3800 frames; se escoltado off-screen esquerda concede +800 pontos.
- Inimigos que colidem com ele reduzem `cbersMission.hp`; ao chegar a 0 a missão falha.

### Aviões desbloqueáveis

| Avião                | accel | maxSpd | fireN | lives | unlock |
| -------------------- | ----- | ------ | ----- | ----- | ------ |
| EMB-314 Super Tucano | 0.30  | 4.0    | 24    | 3     | 0      |
| Embraer E2           | 0.25  | 5.0    | 20    | 2     | 3 000  |
| C-390 Millennium     | 0.20  | 3.2    | 30    | 4     | 8 000  |

`Player` recebe um `planeCfg` no construtor que substitui `accel`, `topSpd`, `_fireN` e `lives`. Seleção no menu via ← →.

---

## Power-ups

| ID            | Label         | Efeito                                                                                                | Duração (frames)     | Raro |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------- | -------------------- | ---- |
| `shield`      | ESCUDO        | Absorve o próximo acerto sem perder vida; acumula até 3×                                              | `SHIELD_DUR = 300`   |      |
| `boost`       | BOOST         | Tiro triplo + cadência máxima; acumula até 3×                                                         | `BOOST_DUR = 340`    |      |
| `14bis`       | 14-BIS        | Invencibilidade total; avião transforma-se no biplano de Santos-Dumont                                | `BIS_DUR = 480`      | ✓    |
| `avibras_pw`  | PULSO AVIBRAS | Dispara 2 mísseis teleguiados a cada 90 frames; prioriza OVNIs e chefe                                | `AVIBRAS_DUR = 540`  |      |
| `inpe_sat`    | SATÉLITE INPE | Ímã que atrai coletáveis num raio de 220px; revela barra de HP de todos os inimigos                   | `INPE_DUR = 420`     |      |
| `revap_pw`    | REVAP SHOCK   | Onda de choque instantânea: destrói projéteis inimigos num raio de 300px; mantém campo de 80px        | `REVAP_DUR = 260`    |      |
| `delta_pw`    | ASA DELTA     | Aceleração/frenagem quase instantâneas (accel 1.8, friction 0.22); combo não reseta; rastro arco-íris | `DELTA_DUR = 420`    |      |
| `ericsson_pw` | WINGMAN 5G    | Drone wingman que replica o tiro do jogador (diagonal duplo com Boost ativo)                          | `ERICSSON_DUR = 540` |      |
| `hp_up`       | VIDA +1       | +1 HP (máx. `maxLives + 2`). **Apenas drop de boss.** Chance base: 5% (cigarra 8%)                    | —                    | ✓ ✓  |

### Notas de implementação

- **14-BIS** é marcado como `rare: true` no array `CTYPES_PW`. Visual: biplano 14-Bis de Santos-Dumont com hélice traseira girando.
- **Pulso Avibras** cria instâncias de `HomingMissile` via `_findMissileTarget()`, que prioriza `ovni > boss > mais próximo`. Os mísseis ajustam direção gradualmente a cada frame (steering) com velocidade máxima 10.
- **Satélite INPE** move coletáveis 3.5px/frame em direção ao jogador quando dentro de 220px. A revelação de HP sobreescreve a condição `hp < mhp` no draw do inimigo.
- **Revap Shock** age no primeiro frame com raio de limpeza total (300px) e mantém campo de 80px pelo restante da duração.
- **Asa Delta** multiplica `accel × 4` e substitui `friction = 0.84` por `0.22` (frenagem mínima). O rastro usa `hue = (frame * 6) % 360` para efeito arco-íris.
- **Wingman 5G** dispara no mesmo frame que o jogador (quando `player.fireT === 1`) a partir da posição `(player.x+30, player.y+38)`.
- **VIDA +1** marcado como `rare: true`. Só consta na `DROP_TABLE` de bosses. Chance base 5% (cigarra 8%). Incrementa `player.lives` até `maxLives + 2` (permite HP acima do máximo original do avião).

### IDs no DROP_TABLE

Os IDs dos power-ups de Avibras, INPE, Revap, Delta e Ericsson usam sufixo `_pw` nos arrays `CTYPES_PW` e `DROP_TABLE` para não colidir com os IDs dos coletáveis de pontuação homônimos (`avibras`, `ericsson`, `revap` já existem como pontos).

---

## Inimigos

### Frente Fria (`cloud`)

- Movimento horizontal lento com oscilação vertical senoidal.
- HP: 4. Atira raios (`bolt`) periodicamente.
- Blobs pré-gerados no construtor (sem `Math.random` no draw).

### Drone DCTA (`drone`)

- Movimento horizontal rápido com oscilação senoidal (`phase`).
- HP: 1.

### Arara Real (`arara`)

- Perseguição suave do jogador via ajuste incremental de `vy`.
- HP: 1. Visual: arara azul com asas animadas por `wingP`.

### OVNI (`ovni`)

- **Apenas à noite** (`dayPhase < 0.26 || > 0.84`).
- Movimento errático (dois harmônicos senoidais).
- Raio trator: atrai o jogador quando dentro de `PULL_R = 160` pixels (sem escudo/14-BIS).
- Atira projéteis do tipo `beam` apontados para a posição atual do jogador.
- HP: 3. Pontuação: 320 (mais alto entre inimigos comuns).
- Evento especial `spawnOvniEvent`: aparece em grupo de 3–5 com mensagem "INCIDENTE 19/05/1986".

### Chefe — Monstro Climático (`boss`)

- Spawn a cada `bossInterval` frames — 4800 (~80s) em Aventura, 2400 (~40s) em Radical.
- HP: 42 + `waveNum*12`, R: 72. Fica parado no lado direito da tela (`x >= W - 210`).
- Dispara orbs direcionados ao jogador. Barra de HP exibida sobre o sprite. Destruição concede 2500 pontos.

### Chefe — Protótipo X (`prototipo_x`)

- Passa horizontalmente em velocidade alta, re-entra pela direita ao sair pela esquerda.
- HP: 28 + `waveNum*6`. Acelera a cada lap: `vx = -(5.5 + laps * 0.7)` (incremento reduzido para curva de dificuldade mais suave).
- Pausa entre dashes: `dashT = max(80, 170 - laps * 10)`. Spread: `0.18 + laps * 0.025`.
- Dispara spread de 5 orbs. Sonic boom: empurra o jogador ao cruzar próximo (< 40px).
- **Posição na rotação:** último (`index 4`), pois é o mais difícil de matar em laps avançados.

### Chefe — Olho do CEMADEN (`cemaden_eye`)

- Estacionário. Cicla entre fase **protegida** (invulnerável, 6 blobs rotatórios) e **vulnerável** (sem escudo).
- 3 modos de ataque em rotação: chuva de orbs, laser direcional giratório, microburst vertical no X do jogador.
- `hit()` retorna 0 se `!this.vulnerable`. HP: 35 + `waveNum*5`.

### Chefe — Grande Engrenagem (`engrenagem`)

- Sobe e desce verticalmente. Dispara steam bolts horizontais + orbs que **ricocheteiam** nas paredes (`b.bouncing = true`).
- A cada 5 ataques spawna um drone; orb ricocheteante a cada 3. HP: 55 + `waveNum*6`.

### Chefe — A Cigarra (`cigarra`)

- Morfa entre esfera / triângulo / elipse a cada 280 frames. No morph: inverte controles do jogador por 180 frames (`player.inverted`), puxa coletáveis e treme a tela.
- Dispara beam colorido (`b.hue = this.beamHue`) a cada 18 frames; hue cicla +2/frame.
- HP: 90 + `waveNum*10`. Pontuação: 5000.

### Rotação de chefes

`spawnBoss()` usa `BOSS_ROTATION = ["boss","cemaden_eye","engrenagem","cigarra","prototipo_x"]` com índice `waveNum % 5`. O Protótipo X foi movido para o último lugar por ser o mais difícil de matar em laps avançados. Após `doubleBossWave` (18 em Aventura, 9 em Radical), um segundo chefe entra 7s depois (`setTimeout(..., 7000)`).

`BOSS_TYPES` e `BOSS_ROTATION` são definidos e exportados de `src/constants.ts`.

---

## Fases e Waves (Hordas)

O jogo é dividido em **4 fases**, cada uma com 2 waves. Cada wave é anunciada no canvas e dispara uma **horda** — um burst de inimigos temáticos. Após a horda, o spawn contínuo normal retoma. A wave avança ao matar o chefe (boss).

### Fases

| Fase | Waves | Tema                             |
| ---- | ----- | -------------------------------- |
| 1    | 0–1   | Frente Fria e Patrulha DCTA      |
| 2    | 2–3   | Araras Furiosas + OVNIs noturnos |
| 3    | 4–5   | Invasão Coordenada               |
| 4    | 6+    | Caos Total / Batalha Final       |

> A música troca a cada wave (não por fase). Ver tabela completa em [Playlists e trilha dinâmica](#playlists-e-trilha-dinâmica).

### Waves e hordas

Cada fase apresenta apenas os inimigos temáticos relevantes. Novos tipos são introduzidos gradualmente.

| Wave | Nome                        | Fase | Horda (inimigos em burst)                                                                 |
| ---- | --------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| 0    | Frente Fria da Mantiqueira  | 1    | 3 clouds + 3 drones                                                                       |
| 1    | Patrulha de Drones DCTA     | 1    | 5 drones + 2 clouds + 2 araras                                                            |
| 2    | Bando de Araras Furiosas    | 2    | 5 araras + 3 drones + 1 cloud + 1 balao                                                   |
| 3    | Noite dos Discos Voadores   | 2    | 3 ovnis + 3 araras + 2 drones + 1 balao                                                   |
| 4    | Invasão Coordenada          | 3    | 4 ovnis + 3 araras + 3 drones + 1 cloud + 2 helicopteros                                  |
| 5    | Tempestade Total            | 3    | 4 ovnis + 4 araras + 3 drones + 2 clouds + 2 helicopteros + 2 balaos                      |
| 6    | Alerta CEMADEN — Nível Máx. | 4    | 5 ovnis + 4 araras + 4 drones + 2 clouds + 3 helicopteros + 3 tanajuras + 2 balaos        |
| 7    | Caos Sobre o Vale           | 4    | 6 ovnis + 5 araras + 4 drones + 3 clouds + 3 helicopteros + 4 tanajuras + 2 balaos        |
| 8+   | Batalha Final do Guardião   | 4    | 7 ovnis + 6 araras + 5 drones + 3 clouds + 4 helicopteros + 5 tanajuras + 3 balaos (loop) |

**Regra de spawn contínuo (`spawnEnemy`):** a distribuição de probabilidade muda a cada onda. OVNIs só aparecem a partir da onda 3 e apenas à noite. Helicópteros surgem no spawn contínuo a partir da onda 4. Tanajuras aparecem somente na horda da Fase 4.

### Mecânica de horda

- `hordeQueue`: array de `{type}` construído ao iniciar cada wave, **embaralhado** (`sort(() => Math.random() - 0.5)`).
- `hordeSpawnT`: countdown entre spawns da horda. Começa em 70 frames (delay inicial) e cai para 14 frames entre cada inimigo.
- No `update()`: a cada frame que `hordeSpawnT` chega a 0 com `hordeQueue.length > 0`, um inimigo é removido da fila e spawnado em Y aleatório.
- O spawn contínuo normal (`spawnT`) continua em paralelo durante a horda.

---

## Ciclo dia/noite

- `dayPhase` vai de 0 a 1, incrementado em `0.000034` por frame (~29 000 frames = ~8 min para um ciclo completo a 60 fps).
- `0 = meia-noite`, `0.25 = amanhecer`, `0.5 = meio-dia`, `0.75 = pôr-do-sol`.
- Array `SKY_KF` define keyframes com quatro cores de gradiente (`zenith`, `midhi`, `midlo`, `horizon`), visibilidade de sol, lua e estrelas.
- `getSky()` faz interpolação linear entre dois keyframes adjacentes.
- Funções auxiliares: `hexRgb()` converte hex para `[r,g,b]`; `lerpC()` interpola e retorna string `rgb(...)`.
- OVNIs só aparecem em fases noturnas: `dayPhase < 0.26 || dayPhase > 0.84`.

---

## Coletáveis

Definidos em `CTYPES`:

| ID        | Label    | Pontos | Tipo          |
| --------- | -------- | ------ | ------------- |
| `inpe`    | INPE     | 50     | pontuação     |
| `embraer` | EMBRAER  | 100    | pontuação     |
| `ita`     | ITA      | 75     | pontuação     |
| `tech`    | TECHPARK | 30     | pontuação     |
| `shield`  | ESCUDO   | 0      | power-up      |
| `boost`   | BOOST    | 0      | power-up      |
| `14bis`   | 14-BIS   | 0      | power-up raro |

Coletáveis surgem periodicamente (a cada ~220–380 frames). Ao destruir um inimigo, `dropCollectibles()` consulta a `DROP_TABLE` — cada entrada tem uma chance independente por tipo de inimigo, com **limite de drops por kill: 2 para inimigos comuns, 6 para bosses**.

### Raridade adaptativa de power-ups

Para cada power-up, a chance de drop é ajustada dinamicamente:

```
chance = base × diffCfg.dropMult / (1 + picks × 0.14)
```

onde `picks` = quantas vezes o jogador coletou aquele power-up nesta partida (via `playerStats.pw`). Coletáveis de pontuação (empresas) não sofrem saturação — suas chances são fixas por tipo de inimigo.

O `diffCfg.dropMult` amplifica ou reduz todos os drops de power-up por dificuldade (Aventura ×1.5, Radical ×0.85).

**Visual:** coletáveis de pontuação exibem o nome da empresa centralizado; power-ups exibem o emoji do item em tamanho grande, sem texto.

---

## Renderização

- **Canvas 2D** com dimensões lógicas fixas 800×450.
- **HiDPI/Retina:** canvas físico escalado por `DPR = min(devicePixelRatio, 2)` — `canvas.width = 800 * DPR`; `ctx.scale(DPR, DPR)` restaura o sistema de coordenadas lógico. Todo código de desenho usa coordenadas 0–800 × 0–450 sem alteração.
- CSS escala o elemento `<canvas>` para `min(100vw, 100dvh * 800/450)` (largura) e `min(100dvh, 100vw * 450/800)` (altura), ocupando todo o espaço disponível sem overflow, com suporte a `100dvh` para mobile.
- **Parallax de múltiplas camadas:**
  1. Gradiente de céu dinâmico (4 paradas, interpolado por `getSky()`).
  2. Estrelas e nebulosa (pré-geradas em `STARS`, animadas por `tw`).
  3. Sol e lua (posição calculada da fase do dia).
  4. Três faixas de montanhas (`MT1/MT2/MT3`) com velocidades diferentes.
  5. Parque da Cidade com 9 árvores (posições em `PARQUE_TREES`) e mirante piscante.
  6. Skyline de prédios (`BLDGS`, tileado em `W * 3 + 500`).
  7. Anel Viário com carros pré-gerados (`CARS`) nas duas faixas.
  8. Faixa de chão com marcações da Dutra.
- **Tileamento de dois ladrilhos:** ao desenhar montanhas e skyline, dois tiles consecutivos são renderizados para cobrir a transição sem salto visível.
- **Fade em `globalAlpha`:** edifícios e o Parque da Cidade recebem `globalAlpha` proporcional à distância da borda direita para suavizar a entrada na tela.
- **Dados estáticos pré-gerados:** `PARQUE_TREES`, `CARS`, `BLDGS` e `STARS` são criados uma única vez no início — nenhum `Math.random()` é chamado dentro de funções de desenho de fundo para evitar cintilação.
- **Stars:** ignoradas quando `sky.st < 0.02` (otimização para o dia claro).

---

## Arquitetura

O projeto é TypeScript estrito (`strict: true`, `isolatedModules: true`) compilado com **Vite** (`bun run build` → `dist/`). Entry point: `src/main.ts`.

### Módulos

| Arquivo              | Responsabilidade                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `src/types.ts`       | Enums (`ST`), interfaces (`PlaneCfg`, `DiffCfg`, `PlayerStats`…)                                  |
| `src/constants.ts`   | Dados imutáveis: `PLANES`, `DIFFICULTIES`, `WAVES`, `BOSS_TYPES`, `BOSS_ROTATION`, terrain, áudio |
| `src/state.ts`       | Singleton de estado mutável (`state`) — substitui globals espalhados                              |
| `src/world.ts`       | Canvas setup, `DPR`, `VERSION`, `getSky(dayPhase)`, interpolação de céu                           |
| `src/audio.ts`       | Web Audio API: SFX com throttle `_ok()`, playlists, `startMenuMusic(diffIdx)`                     |
| `src/entities.ts`    | Classes: `Player`, `Enemy`, `Bullet`, `HomingMissile`, `EBullet`, `Collectible`                   |
| `src/renderer.ts`    | Scroll offsets, `drawBg()`, `drawHUD()`, `drawMenu()`, overlays                                   |
| `src/dev.ts`         | Painel DEV; expõe callbacks via `setDevCallbacks()`                                               |
| `src/multiplayer.ts` | WebSocket, lobby, `RemotePlayer`, `drawLobby()`; expõe `setMpCallbacks()`                         |
| `src/game.ts`        | Loop principal, `startGame()`, `update()`, `render()`, event listeners, waves                     |
| `src/main.ts`        | Entry point: registra listeners, chama `mpAutoJoin()`                                             |
| `src/server.ts`      | Servidor Bun: HTTP estático (`dist/`) + WebSocket + game loop 30 ticks/s                          |

**Build:** `bun run build` → Vite empacota `src/main.ts` em `dist/`. Em dev, `bun run dev` sobe servidor Vite com proxy WebSocket.

**Deploy:**

- **fly.io:** `Dockerfile` multi-stage (stage `builder`: `bun install` + Vite build; stage runtime: Bun + `dist/` + `src/server.ts`). Configurado via `fly.toml`.
- **GitHub Pages:** GitHub Actions (`deploy.yml`) faz push para `main` → build → publica `dist/` na branch `gh-pages`.

### Inversão de dependência (callbacks)

Ciclos `game ↔ dev` e `game ↔ multiplayer` são quebrados via registro de callbacks em `game.ts`:

```ts
setDevCallbacks({ spawnBoss, spawnBossType }); // dev.ts
setMpCallbacks({ startGame, endGame, announce, radioSay }); // multiplayer.ts
```

Isso permite que `dev.ts` e `multiplayer.ts` chamem funções de `game.ts` sem importar `game.ts` diretamente.

### Classes

| Classe          | Responsabilidade                                            |
| --------------- | ----------------------------------------------------------- |
| `Player`        | Estado do jogador, movimento, tiro, power-ups, draw         |
| `Enemy`         | Todos os tipos de inimigos via `type` no construtor         |
| `Bullet`        | Projétil do jogador com rastro histórico                    |
| `HomingMissile` | Míssil teleguiado do Pulso Avibras com steering por frame   |
| `EBullet`       | Projétil inimigo (bolt / beam / orb)                        |
| `Collectible`   | Token coletável animado com tipo aleatório de `CTYPES`      |
| `RemotePlayer`  | Estado + interpolação de jogador remoto no modo multiplayer |

### Estados de jogo (`ST`)

| Estado  | Valor | Descrição                                |
| ------- | ----- | ---------------------------------------- |
| `MENU`  | 0     | Tela inicial                             |
| `PLAY`  | 1     | Jogo em andamento (solo)                 |
| `PAUSE` | 2     | Pausado (P ou ESC)                       |
| `OVER`  | 3     | Game over                                |
| `ABOUT` | 4     | Tela "Sobre o jogo" (tecla `I`)          |
| `LOBBY` | 5     | Lobby multiplayer (aguardando jogadores) |
| `MULTI` | 6     | Jogo multiplayer em andamento            |

### Loop principal

```
requestAnimationFrame → loop() → update() + render()
```

`update()` avança física, spawns e colisões; `render()` desenha tudo na ordem correta de camadas.

---

## Modo Multiplayer

### Arquitetura de rede

**Modelo:** servidor autoritativo + predição client-side.

| Responsabilidade                  | Onde fica                 |
| --------------------------------- | ------------------------- |
| Spawn de inimigos e coletáveis    | Servidor                  |
| HP dos inimigos                   | Servidor                  |
| Progressão de ondas e boss spawn  | Servidor                  |
| Mecânicas co-op (formação, SOS…)  | Servidor                  |
| Movimento do jogador local        | Cliente (60fps, predição) |
| Interpolação de jogadores remotos | Cliente                   |
| Renderização, áudio, partículas   | Cliente                   |

O servidor roda a **30 ticks/s** via `setInterval`. Clientes rodam a 60fps e enviam posição a cada 3 frames. Jogadores remotos são interpolados com delay de 100ms usando buffer circular de snapshots.

### Protocolo WebSocket (JSON)

**Cliente → Servidor:**

| Mensagem            | Campos                        | Descrição                            |
| ------------------- | ----------------------------- | ------------------------------------ |
| `join`              | `lobbyId?`                    | Cria ou entra em lobby               |
| `ship`              | `planeId`                     | Seleciona avião no lobby             |
| `ready`             | —                             | Alterna estado pronto (toggle)       |
| `start`             | —                             | Inicia partida (somente host)        |
| `pos`               | `x,y,vx,vy,tilt,shield,buffs` | Posição do jogador (a cada 3 frames) |
| `hit`               | `enemyId, dmg`                | Acertou inimigo                      |
| `collect`           | `collectibleId`               | Coletou item (ou balão SOS)          |
| `dead`              | —                             | Jogador morreu                       |
| `shield_relay_used` | `partnerId`                   | Escudo do parceiro absorveu hit      |

**Servidor → Cliente:**

| Mensagem                       | Campos                                       | Descrição                                              |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------ |
| `joined`                       | `playerId,lobbyId,isHost,shareUrl,players[]` | Confirmação de entrada no lobby                        |
| `player_join/leave/ship/ready` | `id,...`                                     | Mudanças de estado de outros jogadores                 |
| `new_host`                     | `id`                                         | Transferência de host                                  |
| `start`                        | —                                            | Partida iniciando                                      |
| `player_update`                | `id,x,y,vx,vy,tilt,lives,dead,buffs`         | Posição de jogador remoto                              |
| `enemy_spawn`                  | `id,etype,x,y,hp,isBoss?`                    | Servidor spawnou inimigo                               |
| `enemy_hp`                     | `id,hp`                                      | HP atualizado (hit validado)                           |
| `enemy_die`                    | `id,pts,killedBy,x,y`                        | Inimigo morreu ou saiu da tela (pts=0 se fora da tela) |
| `collect_spawn`                | `id,ctype,x,y`                               | Novo coletável                                         |
| `collect_take/expire`          | `id,playerId?,ctype?`                        | Coletável removido                                     |
| `player_dead`                  | `id`                                         | Jogador morreu                                         |
| `player_revive`                | `id,x,y,revivedBy`                           | Jogador revivido                                       |
| `sos_spawn`                    | `id,x,y,deadId`                              | Balão SOS apareceu                                     |
| `sos_take/expire`              | `id`                                         | Balão SOS removido                                     |
| `wave`                         | `num`                                        | Nova onda (boss morreu)                                |
| `boss_target`                  | `bossId,targetId`                            | Boss mudou de alvo                                     |
| `formation`                    | `playerIds[],active`                         | Bônus de formação ativado/desativado                   |
| `shield_relay`                 | `shielderId,protectedId`                     | Escudo absorveu hit de parceiro                        |
| `game_over`                    | —                                            | Todos os jogadores mortos                              |

### Mecânicas co-op

#### 1. Balão SOS (revive)

- Servidor recebe `dead` → spawna coletável especial `SOS` na última posição do morto
- Qualquer parceiro que se aproxime a < 36px envia `collect {collectibleId: sosId}`
- Servidor processa: morto revive com `lives=1` na posição do revivedor; broadcast `player_revive`
- Balão expira em **1500 ticks** (~50s a 30 tps) sem ser coletado

#### 2. Bônus de Formação

- Servidor verifica a cada 10 ticks: para cada par de jogadores vivos, calcula distância euclidiana
- Se distância < 80px: `formationPairs[key] += 10`. Ao atingir 180 frames → broadcast `formation active`
- Se distância > 120px: `formationPairs[key] -= 5`. Ao cair abaixo de 180 → broadcast `formation inactive`
- Cliente aplica multiplicador `×1.3` visualmente no HUD; pontuação por kill já é calculada com bônus

#### 3. Escudo Compartilhado

- Detecção **client-side**: antes de `tryHit()`, verifica `mp.players` por parceiro com `buffs.shield=true` a < 100px
- Se encontrado: cancela o hit, envia `shield_relay_used {partnerId}` ao servidor
- Servidor transmite `shield_relay {shielderId, protectedId}` para todos
- Parceiro (shielderId) recebe a mensagem e decrementa `player.shield -= SHIELD_DUR` localmente
- Local player recebe indicador visual verde ("relay absorvido")

#### 4. Boss Split Focus

- Servidor: a cada 120 ticks, para cada boss vivo em `lobby.enemies`, seleciona um jogador vivo diferente do alvo anterior
- Broadcast `boss_target {bossId, targetId}` para todos
- No cliente: se `targetId === mp.playerId`, ativa `mp.bossTargetId`; halo vermelho pulsante é desenhado em torno do jogador local na função `mpDrawBossTarget()`
- Chefes direcionados (beam da Cigarra, orbs do Monstro) miram o jogador alvo pois a física é simulada localmente com posições de servidor

### Lobby (`ST.LOBBY`)

`drawLobby()` em `src/multiplayer.ts`:

- Fundo idêntico ao menu (gradient + estrelas animadas)
- ID do lobby em destaque + URL de compartilhamento
- Lista de jogadores com cor individual (`MP_COLORS[]`), nave e status pronto; altura do box cresce automaticamente com o número de jogadores
- Seletor de nave (mesma lógica do menu solo)
- Botão **INICIAR PARTIDA** (host) ou **MARCAR PRONTO** (outros)
- URL `?lobby=ID` → auto-join via `mpAutoJoin()` no carregamento
- **Cap:** servidor rejeita conexões quando `lobby.players.size >= 4`

### Considerações de sincronização

**Inimigos:** Cliente cria instâncias `Enemy(type, x, y)` ao receber `enemy_spawn` e simula física localmente. **Limitação:** `vx` é gerado com `Math.random()` no construtor, independente por cliente — posições divergem entre jogadores após poucos segundos. O servidor não envia atualizações de posição periódicas. Correção futura: servidor deve transmitir snapshots de posição a cada N ticks ou usar semente determinística compartilhada para `Math.random()`.

**Coletáveis:** Mesmo padrão — criados localmente a partir de `collect_spawn`, removidos ao receber `collect_take` ou `collect_expire`. O tipo é determinado pelo servidor e sobrepõe o random local.

**Morte e respawn:** Ao morrer (`lives <= 0`), cliente envia `dead` e ativa `mp.localDead = true`. O player ainda é desenhado (semi-transparente) para outros verem. `endGame()` só é chamado quando servidor confirma `game_over` (todos os jogadores mortos).

---

## Controles touch

- O `canvas` captura `touchstart`, `touchmove`, `touchend` com `{ passive: false }` para poder chamar `e.preventDefault()` e evitar scroll.
- `toCanvas(touch)` converte coordenadas CSS (`getBoundingClientRect`) para coordenadas lógicas do canvas (0–800 × 0–450).
- `JOY_MAX = 82`: raio máximo do joystick virtual em unidades lógicas.
- O joystick é desenhado a cada frame sobre o canvas quando `touch.active === true`.
- Botão `#btn-pause-mobile` visível apenas em dispositivos com `pointer: coarse` (via CSS).

---

## Áudio

Implementado via **Web Audio API** (criado sob demanda por `ensureAC()` após gesto do usuário).

| Função       | Descrição                                      |
| ------------ | ---------------------------------------------- |
| `sfxShoot`   | Tom curto de tiro (square wave, 880 Hz)        |
| `sfxHit`     | Tom grave + ruído (dano ao jogador)            |
| `sfxBang`    | Explosão (ruído + sawtooth grave)              |
| `sfxCollect` | Arpegio ascendente (coletável)                 |
| `sfxPowerup` | Arpegio mais longo (power-up ativado)          |
| `sfxBossIn`  | Tom grave duplo (spawn de boss/OVNI event)     |
| `sfxDestroy` | Impacto grave + ruído longo (morte do jogador) |

**Throttle anti-empilhamento (`_ok`):** todas as funções SFX passam por `_ok(key, gapSec)` antes de disparar. Usa `AC.currentTime` para bloquear chamadas duplicadas dentro do intervalo mínimo (shoot 50ms, hit 80ms, bang 60ms, bossIn 250ms, destroy 250ms, collect 150ms). Evita saturação de osciladores Web Audio em rajadas.

**Música de menu por dificuldade:** `startMenuMusic(diffIdx)` seleciona playlist 11 ("Menu Arcade Fast") para Radical (`diffIdx === 1`) ou playlist 10 para Aventura.

### Playlists e trilha dinâmica

Música sintetizada via Web Audio API. 10 playlists, cada uma com notas e BPM próprios:

| Idx | Label            | Tempo  | Estilo          | Wave |
| --- | ---------------- | ------ | --------------- | ---- |
| 6   | Chill Hip-Hop I  | 350 ms | Dm pentatônica  | 0    |
| 0   | Arcade           | 280 ms | Pentatônica     | 1    |
| 7   | Chill Hip-Hop II | 310 ms | Am swing        | 2    |
| 1   | Tetris           | 280 ms | Korobeiniki     | 3    |
| 2   | Space Invaders   | 280 ms | Marcial         | 4    |
| 8   | Rock I           | 210 ms | Em power riff   | 5    |
| 3   | Galaga           | 280 ms | Arpejo menor    | 6    |
| 4   | Pac-Man          | 280 ms | Intro riff      | 7    |
| 9   | Rock II          | 180 ms | Heavy mode inf. | 8    |
| 5   | Mario            | 280 ms | Overworld       | 9+   |

**Troca automática:** a cada nova wave, `switchMusicForPhase(waveNum)` seleciona a trilha via `WAVE_PLAYLIST[wave % 10]`, reinicia o índice de nota e reinicia o loop com o novo tempo. Todas as 10 trilhas são utilizadas durante uma partida completa.

`PLAYLIST_TEMPOS[playlistIdx]` define o intervalo entre notas. `stopMusic()` + `startMusic()` fazem o crossover imediato.

---

## Céu dinâmico (detalhes técnicos)

```ts
// constants.ts
export const SKY_KF: SkyKeyframe[] = [
  /* 11 keyframes com t, c[], sun, moon, st */
];

// world.ts
const KFP: SkyKeyframeProcessed[] = SKY_KF.map((k) => ({
  ...k,
  cr: k.c.map(hexRgb),
}));

export function getSky(dayPhase: number): SkyValues {
  // busca os dois keyframes adjacentes a dayPhase
  // interpola linearmente todos os valores
  return { zenith, midhi, midlo, horizon, sun, moon, st };
}
```

`hexRgb(hex)` extrai `[r, g, b]` do hex. `lerpC(a, b, t)` retorna `"rgb(...)"` com valores inteiros via bitwise OR 0.

---

## Interface e UX

### Tela "Sobre" (`ST.ABOUT`)

Acessada pressionando `I` no menu (toque na tela em mobile volta ao menu). Exibe:

- Título com glow animado
- 4 blocos com fundo semi-transparente: O Jogo, Mecânicas, Power-ups, Inimigos
- Nota histórica sobre o incidente de 19/05/1986
- Instrução de retorno piscante

### Painel DEV

Ativado ao manter ESC pressionado por 4 segundos (240 frames). Uma barra de progresso aparece na borda inferior durante a contagem.

Após abrir, um `openCooldown` de 60 frames impede fechamento acidental por key-repeat. Navegação: `↑/↓` + `Enter/Space`. Fecha com `ESC` (após cooldown).

Recursos: god mode, sem projéteis, spawn de inimigos, todos os power-ups, velocidade do ciclo dia/noite, fixar cenário, trocar playlist.

### HUD de buffs

Cada buff ativo exibe ícone + segundos restantes + barra de progresso à direita da tela. Buffs acumuláveis (shield, boost, avibras, inpe, delta, ericsson) mostram progresso relativo ao máximo acumulável.

### Indicador de escudo no HUD de vidas

Quando `player.shield > 0`, ícones 🛡 em ciano são exibidos à esquerda dos ícones ✈ de vida, um por stack ativo (`Math.ceil(player.shield / SHIELD_DUR)`, máx. 3). Pulsam via `shadowBlur` animado. Comunicam visualmente a camada de proteção extra sem alterar o contador de HP.

### Contador de FPS

Exibido no canto inferior esquerdo com cor dinâmica: verde ≥ 55 fps, amarelo ≥ 40 fps, vermelho < 40 fps. Calculado a cada segundo via timestamp do `requestAnimationFrame`.

---

## Sistema de Estatísticas

`playerStats` é campo do singleton `state` em `src/state.ts`, com interface `PlayerStats` definida em `src/types.ts`. Resetado em `startGame()`:

```ts
// state.ts
state.playerStats = { pw: {}, kills: 0, hits: 0, grazes: 0, maxCombo: 1,
  shotsFired: 0, shotsHit: 0, bossKills: 0, shieldBlocks: 0, ... };
```

| Campo        | Incrementado em                                                                    |
| ------------ | ---------------------------------------------------------------------------------- |
| `kills`      | `dropCollectibles()` — quando inimigo morre (`pts > 0`)                            |
| `hits`       | `player.tryHit()` retorna `true` (dano real recebido)                              |
| `grazes`     | Graze detectado (projétil a 14–22px sem hit)                                       |
| `maxCombo`   | Quando `combo > playerStats.maxCombo`                                              |
| `shotsFired` | `nb.length` após `player.update()` (balas principais + mísseis) + balas Wingman 5G |
| `shotsHit`   | Toda colisão bullet→inimigo em `bullets.forEach`                                   |
| `pw[id]`     | Ao coletar qualquer power-up (`c.type.pw` truthy)                                  |

**Precisão:** `shotsHit / shotsFired × 100`. Ambos os contadores cobrem o mesmo conjunto de projéteis, portanto o resultado é sempre 0–100%.

### Persistência ao fim da partida

`endGame()` salva dois objetos no `localStorage`:

- **`sjc_last_stats`** — snapshot completo da última partida: score, wave, dificuldade, kills, hits, grazes, maxCombo, pw (contagens), timestamp.
- **`sjc_totals`** — acumulado de todas as partidas: kills, grazes, games. Base para achievements futuros.

```js
// Exemplo de leitura
const last = JSON.parse(localStorage.getItem("sjc_last_stats") ?? "{}");
const total = JSON.parse(localStorage.getItem("sjc_totals") ?? "{}");
```

---

## Notas de performance

- Estrelas ignoradas com `sky.st < 0.02` (dia claro — evita ~130 arcos desnecessários).
- Arrays `PARQUE_TREES`, `CARS` e `BLDGS` são criados uma única vez na inicialização; janelas de prédios usam um RNG seeded por `litSeed` (assim são determinísticas e podem ser recalculadas a cada frame sem cintilação).
- Trail do jogador usa `Math.random()` no `update()` (lógica, não desenho) — correto.
- Partículas de explosão usam `Math.random()` apenas no momento do spawn — correto.
- O loop usa `requestAnimationFrame` sem `setInterval`, garantindo sincronismo com o VSync do navegador.
- **Trail do player:** removido `createRadialGradient` por partícula — substituído por `fillStyle` sólido com `globalAlpha`. Evita criar ~30 objetos `CanvasGradient` por frame.
- **EBullet (orb):** removido `createRadialGradient` — substituído por cor sólida + `shadowBlur`. Reduz alocações de objeto por frame com muitos projéteis na tela.
- **`_findMissileTarget()`:** substituído `[...enemies].sort()` por `reduce()`, eliminando criação de array intermediário a cada disparo de míssil Avibras.
- **Cap de partículas:** array `particles` limitado a 180 entradas para evitar pico de GC em explosões encadeadas (ex.: boss + horda simultâneos).
- **`sfxBossIn()`:** chamado também pela Engrenagem e Cigarra a cada tiro — volume reduzido para não saturar o canal de áudio.

## Áudio — balanceamento de volumes

| Função          | Volume anterior | Volume atual  | Motivo                            |
| --------------- | --------------- | ------------- | --------------------------------- |
| Música de fundo | 0.032           | 0.062         | Muito baixa em relação aos SFX    |
| `sfxShoot`      | 0.050           | 0.022         | Tiro frequente — saturava o áudio |
| `sfxBang`       | 0.070 / 0.040   | 0.045 / 0.025 | Explosão mais suave               |
| `sfxHit`        | 0.110 / 0.070   | 0.090 / 0.050 | Dano ao jogador — mantido audível |
| `sfxBossIn`     | 0.140 / 0.090   | 0.110 / 0.070 | Chamado por múltiplos bosses      |
