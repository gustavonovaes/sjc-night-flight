# SJC Night Flight — Guardião do Vale do Paraíba

Shooter side-scrolling arcade ambientado em São José dos Campos (SJC), inspirado na famosa _Noite dos Discos Voadores_ de 19 de maio de 1986, quando a Força Aérea Brasileira interceptou 21 OVNIs sobre o Vale do Paraíba.

Pilote um avião Embraer defendendo o Vale do Paraíba contra frentes frias, drones, araras, OVNIs e chefes cada vez mais poderosos. Modo multiplayer co-op para até 4 jogadores com lobby compartilhável por link.

**[Jogar online →](https://sjc-night-flight.fly.dev/)**

---

## Changelog

### v0.0.10 — Tela Cheia Mobile, HUD Redesenhado, Missão CBERS com Satélites INPE, Assets e Correções _(2026-05-17)_

- **Interface mobile:** botão `⛶` flutuante em `index.html` aparece apenas em dispositivos touch; auto-fullscreen no primeiro toque; oculta ao entrar em tela cheia.
- **Música de level-up:** `sfxLevelUp()` toca fanfarra ascendente ao matar boss; `startLevelUpMusic()` inicia tema triunfal em lá maior (playlist 12) durante `ST.LEVELUP`; música retorna à fase ao confirmar perk (`src/audio.ts`).
- **Playlists expandidas:** 13 trilhas agora (era 12); melodias de Arcade (Ode à Alegria), Tetris (Korobeiniki), Galáxia e Rock I/II reescritas com mais notas e variação; tempos ajustados por trilha (`src/constants.ts`).
- **Painel DEV — 3 colunas:** spawn individual de todos os 7 inimigos e 5 chefes por tipo; toggles Hitboxes e Debug Overlay; +10 000 pts / zerar score; aplicação direta de qualquer perk; telemetria em tempo real (frame, enemies, eBullets, DDA stress, countdown de boss, pos/vel/inv do player) com barras de progresso (`src/dev.ts`).
- **Debug overlay visual:** hitboxes de player (branco), projéteis inimigos (laranja) e inimigos (vermelho) com vetor de velocidade; raios de graze de projétil (amarelo tracejado) e de inimigo (laranja tracejado) — ativado pelo toggle no painel DEV (`src/renderer.ts`).
- **Graze refinado:** raio de detecção calculado sobre hitbox real do projétil (`collDist = 13 + b.hb().r`), eliminando falsos rasantes dentro do raio de colisão; rasante de inimigo agora incrementa corretamente `grazeCount`, `playerStats.grazes` e `_curGrazeStreak` (`src/game.ts`).
- **HUD de aprimoramentos:** perks ativos listados no canto esquerdo durante o jogo (`⭐ NV.N` + ícone + nome); tela Game Over exibe caixa extra com todos os perks conquistados na partida (`src/renderer.ts`).
- **Correção:** `chosenPerks` resetado ao iniciar nova partida; `applyPerk` adiciona perk à lista e restaura música da fase; `mp.bossTargetId` limpo ao confirmar morte de boss em multiplayer.
- **Limpeza:** `drawParqueDaCidade` removida do renderer; interface `Blob` removida de `src/types.ts`; `CTYPES_SCORE` e `CTYPES_PW` deixaram de ser exportados externamente; string `VERSION` em `src/world.ts` usa `substring(0,14)` para formato mais curto.
- **HUD redesenhado:** modo de dificuldade exibido no topo central (ícone + nome com glow na cor da dificuldade); rádio SJC reposicionado para o centro da tela com fade-in de 20f e slide-up de 22px; barra de especial no canto inferior esquerdo com ícone circular, arco de progresso e barra gradiente azul→verde com pulso quando pronta (`src/renderer.ts`).
- **Missão CBERS — 3 variantes:** sorteia CBERS-4 (HP 5, bônus 1 000), CBERS-4A (HP 6, bônus 1 400) ou Amazônia-1 (HP 8, bônus 2 000); cada variante tem arte própria (retangular/hexagonal/octogonal); movimento senoidal duplo `baseY + sin(age×0.022)×38 + sin(age×0.008)×18`; sucesso ativa `inpe_sat` diretamente no jogador + bônus multiplicado pelo combo (`src/game.ts`).
- **Sistema de assets:** `src/assets.ts` com `preloadImages()` e `getOrBake()` para sprites carregados/baked via OffscreenCanvas; `public/assets/cloud.png` e `cloud_freeze.png` servidos como estáticos.
- **Frente Fria:** usa sprite `cloud.png` escalonado (`r×2.4/width`); arte de carregamento de raio removida — aparência sempre calma; barra de HP corrigida (posição `overrideTopY`, sem duplicata para tipo `cloud`).
- **Barras de HP padronizadas:** largura `Math.round(r×2.2)`, altura 5px em todos os inimigos; drone reposicionado para `y - r×2 - 4` evitando sobreposição com sprite (`src/entities.ts`).
- **Correção de renderização:** efeitos do player (Wingman 5G, Avibras, INPE, REVAP, Ericsson body) agora renderizados dentro do contexto `translate(x, y)` — remoção do `ctx.restore()` prematuro que os jogava para (0,0) (`src/entities.ts`).
- **Console logs de depuração:** logs `[START]`, `[BOSS]`, `[BOSS KILL]`, `[ESPECIAL]`, `[PERK]`, `[HIT]`, `[POWERUP]` e `[DDA]` (a cada 25% de stress) adicionados ao loop principal (`src/game.ts`).

### v0.0.9 — Level-Up, Perks Permanentes, Graze, Balanceamento e HUD _(2026-05-16)_

- **Sistema de level-up:** ao derrotar um chefe o jogo pausa e exibe 3 cards de aprimoramento permanente aleatórios; escolha por tecla 1/2/3 ou clique.
- **9 perks disponíveis:** Colete Balístico (+30% dodge de projéteis), Chassi Reforçado (+30% dodge de colisões), Munição Perfurante (+1 dano/tiro), Motor Aprimorado (+0.8 velocidade), Veterano (+1 vida), Gatilho Afiado (cadência +15%), Rasante Habilidoso (raio de graze +35%), Foco Total (tempo de combo +30%), Reflexos Aguçados (invulnerabilidade pós-dano +50%).
- **Graze sempre dispara míssil:** qualquer rasante (projétil ou inimigo) dispara `HomingMissile` para o inimigo mais próximo — sem necessidade de Pulso Avibras ativo.
- **HUD — sinergias movidas:** indicadores de sinergia de power-ups (`⚡🛡️ FORTALEZA` etc.) foram movidos do lado esquerdo para abaixo da lista de buffs no lado direito, evitando sobreposição com o contador de combo.
- **Cigarra — câmera lenta:** enquanto a Cigarra estiver viva o jogo roda a ~50% de velocidade com vinheta roxa nas bordas; efeito dissolve ao matá-la.
- **Cigarra — invulnerabilidade no morph:** ao mudar de forma, jogador fica invulnerável por 180 frames; inversão afeta apenas eixo Y.
- **Cigarra — HP reduzido:** `90 + wave×15` → `55 + wave×8`.
- **Protótipo X — nerfs:** aceleração por lap `0.7` → `0.4`; dashT `max(80,170-lap×10)` → `max(90,190-lap×8)`; shootT mín. `22` → `30`; spread 5 orbs → 3 orbs.
- **Arara Real — nerfs:** velocidade base `3.8+rand×2.0` → `2.8+rand×1.4`; bônus por wave `0.07` → `0.04`; spawn probabilities reduzidas ~20%.
- **design.md:** atualizado para TypeScript/Vite, sistema de level-up documentado.

### v0.0.8 — Migração TypeScript + Vite, Balanceamento e CI/CD _(2026-05-16)_

- **Migração:** todo o código JS vanilla migrado para TypeScript em `src/`. Vite como bundler (`bun run build` → `dist/`); entry point `src/main.ts`; tipos em `src/types.ts`.
- **Servidor:** `server.js` → `src/server.ts` (Bun + TypeScript); serve estáticos de `dist/` via `STATIC_DIR`; suporte a `PORT` via env var.
- **Deploy:** `Dockerfile` reescrito com multi-stage (stage builder: Vite build; stage runtime: Bun); GitHub Actions (`deploy.yml`) faz build e publica `dist/` no GitHub Pages automaticamente no push para `main`.
- **Balanceamento Radical:** curva de spawn agora gradual — `spawnBase` 100→145, `spawnWaveMult` 7→15; intensidade máxima atingida apenas na wave 8. `bossInterval` 1800→2400, `hpMult` 1.35→1.1.
- **Gameplay:** cap de 22 projéteis inimigos simultâneos; intervalos de tiro aumentados em cloud (75→120 frames), helicóptero (85→130), e cigarra (18→28 frames).
- **Áudio:** throttle por SFX via `_ok(key, gapSec)` em `src/audio.ts` — evita empilhamento de osciladores Web Audio em rajadas (shoot 50ms, bossIn 250ms, destroy 250ms).
- **Infraestrutura:** `CLAUDE.md` e `GEMINI.md` adicionados; `CLAUDE.md` lido automaticamente pelo Claude Code. Skill `/gerar-release` em `.claude/commands/`.

### v0.0.7 — Correções Multiplayer _(2026-05-16)_

- **Precisão corrigida:** `shotsFired` agora contabilizado corretamente; cálculo `shotsHit/shotsFired` não ultrapassa 100%.
- **Cap de jogadores:** servidor rejeita entrada no lobby após 4 jogadores com mensagem de erro.
- **Lobby responsivo:** altura da lista de jogadores é dinâmica; sem overflow com 3–4 jogadores.
- **Unpause multiplayer:** `mp.gameStarted` agora é definido ao iniciar partida; `P/Escape` retorna ao estado correto.
- **Nave local no lobby:** nave selecionada refletida imediatamente na lista do próprio jogador.
- **Música ao desconectar:** volta ao menu e reinicia música ao fechar conexão WebSocket em ST.LOBBY ou ST.MULTI.
- **Inimigos fora da tela:** `enemy_die` broadcast para inimigos que saem pela esquerda sem ser abatidos (sem pontos).
- **Segundo boss:** timeout do segundo boss limpo corretamente ao encerrar partida (sem vazamento).

### v0.0.6 — Melhorias de Segurança e Performance _(2026-05-15)_

- **Segurança:** Implementação de proteção contra path traversal no servidor estático e substituição da geração de IDs de lobby por `crypto.randomBytes()`.
- **Performance:** Otimização do tráfego de rede multiplayer com envio apenas de dados delta (buffs e escudos enviados apenas quando alterados).
- **Consistência:** Sincronização do multiplicador de HP dos inimigos (`diffCfg.hpMult`) entre servidor e cliente.

### v0.0.5 — Modo Multiplayer Co-op _(2026-05-15)_

**Servidor**

- `server.js`: servidor Bun que serve os arquivos estáticos E gerencia lobbies via WebSocket na mesma porta
- Modelo autoritativo: servidor controla spawn de inimigos, HP, coletáveis, progressão de ondas e mecânicas co-op
- Game loop do servidor a 30 ticks/s; clientes rodam a 60fps com predição local e reconciliação
- Lobbies com ID único de 6 caracteres — compartilháveis via link `/?lobby=ID`; até 4 jogadores
- Auto-transferência de host ao desconectar

**Modo Multiplayer (cliente)**

- Novo estado `ST.LOBBY` (tela de seleção/espera) e `ST.MULTI` (jogo em andamento)
- `RemotePlayer`: renderização de outros jogadores com interpolação de posição (buffer de 100ms para suavidade)
- Inimigos e coletáveis vêm do servidor — spawn local desativado em `ST.MULTI`
- Hit de inimigo reportado ao servidor; morte de inimigo confirmada pelo servidor e propagada a todos
- Morte local entra em modo fantasma; `endGame()` só chamado quando servidor confirma `game_over` (todos mortos)

**Mecânicas co-op**

- 🆘 **Balão SOS**: servidor spawna ao receber `dead`; qualquer parceiro coleta → `player_revive` com 1 HP + 120f de invencibilidade na posição do revivedor; expira em 25s
- ◈ **Bônus de Formação**: servidor verifica distância entre pares a cada 10 ticks; < 80px por 3s → broadcast `formation active`; HUD mostra `◈ FORMAÇÃO ×1.3`; quebra ao ultrapassar 120px
- 🛡️ **Escudo Compartilhado**: cliente detecta parceiro com shield a < 100px antes do `tryHit()`; cancela hit, envia `shield_relay_used {partnerId}`; servidor retransmite para decrementar shield do parceiro
- ⚠️ **Boss Split Focus**: servidor alterna alvo de cada boss a cada 120 ticks entre jogadores vivos; jogador alvo recebe halo vermelho pulsante com marcadores de mira

**Interface**

- Botão `🌐 MULTIJOGADOR` pulsante no menu principal (abaixo do seletor de dificuldade)
- Tela de lobby: lista de jogadores com cor individual, seleção de nave, link de compartilhamento, botões INICIAR/PRONTO
- HUD de multiplayer: indicador de formação, overlay "ABATIDO" com contagem regressiva do balão SOS
- Teclado: `M` no menu abre lobby; `←→` selecionam nave no lobby; `Enter` copia link
- URL `?lobby=ID` carrega e conecta automaticamente ao lobby

---

### v0.0.4 — Visuais, Física e Estatísticas _(2026-05-14)_

**Efeitos de céu e ambientação**

- Sol: halo atmosférico duplo (raio 160px), raios dinâmicos animados durante nascer/pôr (12 wedges com rotação lenta)
- Sol: disco renderizado com gradient radial suave, glow maior no horizonte (32px vs 18px anteriores)
- Lua: halo duplo com gradiente de cor, crateras sutis, sombra de fase refinada
- Estrelas: cintilação real animada (`sin(tw + frame × spd)`) — antes eram estáticas
- Horizonte: faixa dourada fina + glow laranja-vermelho durante nascer/pôr do sol

**Física da nave**

- Aceleração reduzida ~33%: Tucano 0.45→0.30, E2 0.38→0.25, C-390 0.30→0.20
- Velocidade máxima reduzida: Tucano 5.5→4.0, E2 6.8→5.0, C-390 4.2→3.2
- Touch: multiplicador de sensibilidade 0.65× (era 1.0×)

**Mecânicas e feedback**

- Escudo absorve 1 carga por acerto (era: zeravam todos os stacks)
- Fumaça de dano crítico: partículas laranja-amarronzadas saem da nave com 1 HP
- Som de destruição (`sfxDestroy`) ao morrer: impacto grave + ruído longo
- Música de menu toca no primeiro click no canvas (não só no keydown)

**Estatísticas expandidas**

- Novos contadores: `bossKills`, `shieldBlocks`, `nearDeathHits`, `comboKills`, `longestGrazeStreak`, `wavesWithoutHit`, `shotsFired`, `timeSurvived`
- Tela de Game Over: 6 linhas de estatísticas com precisão (kills/tiros) e tempo formatado `mm:ss`
- `timeSurvived` congela ao morrer (era calculado com `frame` em tempo real)

**Tráfego**

- Carros na rodovia 3× mais lentos no início (spd 0.5–1.4, era 1.5–3.9)

**Infraestrutura**

- `v=0.0.4` em todos os scripts (cache busting)

---

### v0.0.3 — DDA, Música e Estatísticas _(2026-05-14)_

**Dificuldade**

- DDA (Dynamic Difficulty Adjustment) baseado em Flow Theory (Csikszentmihalyi 1975): Aventura ajusta spawn rate ±20% conforme `ddaStress` do jogador — sobe em acertos, decai com tempo e combo alto
- Radical permanece determinístico sem DDA — curva de dificuldade linear e sem concessões
- Aventura: `spawnMin=44`, `spawnBase=170`, `bossInterval=4800 (~80s)`, `doubleBossWave=18`
- Radical: `spawnMin=22`, `spawnBase=100`, `bossInterval=1800 (~30s)`, `doubleBossWave=5` — curva corrigida para ser linear (era muito fácil no início e impossível no final)

**Estatísticas do jogador**

- `playerStats` acumula kills, hits, grazes, maxCombo e coletas por powerup durante a partida
- Ao final: `sjc_last_stats` salva snapshot completo; `sjc_totals` acumula kills/grazes/partidas em localStorage (base para achievements futuros)

**Raridade adaptativa de power-ups**

- Fórmula de saturação: `chance *= dropMult / (1 + picks * 0.14)` — power-ups coletados em excesso ficam progressivamente mais raros
- ❤️ HP: chance muito baixa (0.05), exclusivo de chefes, diminui a cada coleta
- Coletáveis de pontos não são afetados pela saturação

**Áudio**

- Música de menu com melodia arcade estilo título clássico 8-bit (32 notas em Dó maior)
- Aventura: 235ms/nota; Radical: 185ms/nota (mais intenso)
- Música toca no menu, na tela "Sobre", na tela de Game Over e ao pausar+voltar ao menu
- Ícone `🔇 !` no canto da tela se AudioContext falhar (ex: bloqueio do navegador)

**Interface**

- Indicador de escudo: ícones 🛡 em ciano após as vidas — até 3 stacks visíveis no HUD
- Versão exibida no canto inferior direito da tela de menu

**Infraestrutura**

- Scripts carregados com query string de versão (`?v=0.0.3`) para forçar cache busting em updates

---

### v0.0.2 — Balanceamento e Performance _(2026-05-14)_

**Dificuldade e progressão**

- Hordas redesenhadas por fase: Fase 1 só tem nuvens/drones; Fase 2 introduz araras e OVNIs noturnos; Fase 3 adiciona helicópteros; Fase 4 é o caos total com todos os inimigos
- `spawnEnemy()` respeita a mesma progressão: nenhum inimigo novo aparece fora da sua fase
- Protótipo X movido para o **último lugar** na rotação de chefes — é o mais difícil de matar em laps avançados
- Protótipo X: aceleração por lap reduzida (`laps * 0.7`, era `1.5`); pausa entre dashes aumentada; spread de orbs mais suave
- Intervalo entre bosses aumentado: ~47s (2800 frames), era ~30s (1800 frames)

**Coletáveis**

- Spawn periódico reduzido: a cada 220–380 frames (era 95–180 frames)
- DROP_TABLE: chances reduzidas em ~50% para inimigos comuns
- Limite de drops por kill: 2 para inimigos comuns, 6 para bosses — evita poluição visual

**Power-ups — duração aumentada**

- Escudo: 240 → 300 frames | Boost: 280 → 340 | 14-BIS: 420 → 480 | Avibras: 480 → 540
- REVAP Shock: 180 → 260 frames (era muito curto) | INPE: 360 → 420 | Asa Delta: 400 → 420 | Wingman: 500 → 540

**Performance**

- Trail do player: removido `createRadialGradient` por partícula (~30 objetos/frame economizados)
- Projéteis orb inimigos: removido `createRadialGradient`, substituído por cor sólida
- `_findMissileTarget()`: substituído `[...enemies].sort()` por `reduce()` sem alocação intermediária
- Cap de 180 partículas simultâneas para evitar pico de GC em explosões encadeadas

**Áudio**

- Volume da música de fundo aumentado: 0.032 → 0.062
- Volume do tiro (`sfxShoot`) reduzido: 0.050 → 0.022 (era o som mais frequente do jogo)
- Explosões e boss sounds levemente reduzidos para equilibrar com a música

**Interface**

- Contador de FPS no canto inferior esquerdo: verde ≥ 55, amarelo ≥ 40, vermelho < 40
- Constante `BOSS_TYPES` extraída para evitar repetição inline em `game.js`
- Código: comentários em português nas funções principais; variáveis mantidas em inglês

---

### v0.0.1 — Lançamento inicial _(2026-05-13)_

- Jogo base: shooter side-scrolling em JS vanilla, sem bundler ou framework
- 3 aviões jogáveis (Super Tucano, Embraer E2, C-390) com stats distintos e desbloqueio por pontuação acumulada
- 7 tipos de inimigos: Frente Fria, Drone DCTA, Arara Real, Tanajura, Helicóptero, Balão, OVNI
- 5 chefes rotativos: Monstro Climático, Protótipo X, Olho do CEMADEN, Grande Engrenagem, A Cigarra
- 8 power-ups: Escudo, Boost, 14-BIS, Pulso Avibras, Satélite INPE, Revap Shock, Asa Delta, Wingman 5G
- Sistema de combo com multiplicador de pontos e bônus de queda do 14-BIS
- Mecânica de rasante: pontos bônus ao passar perto de projéteis sem ser atingido
- Missão CBERS: escolta de satélite por tempo limitado
- Dois modos de dificuldade: Aventura e Radical
- Diálogo de rádio contextual (Torre SJC, FAB, CEMADEN, Avibras)
- Ciclo dia/noite com música procedural em 4 fases
- Painel DEV (Escape 4s) para testes em tempo real

---

## Controles

### Teclado

| Tecla               | Ação                     |
| ------------------- | ------------------------ |
| Setas / WASD        | Mover                    |
| Espaço / Enter      | Iniciar jogo             |
| P / Escape          | Pausar / Despausar       |
| M (no menu)         | Abrir lobby multiplayer  |
| M (na pausa)        | Voltar ao menu principal |
| ← → ou A D (menu)   | Trocar avião             |
| ↑ ↓ ou W S (menu)   | Trocar dificuldade       |
| I (no menu)         | Tela Sobre               |
| Segurar Escape (4s) | Abrir painel DEV         |

### Lobby Multiplayer

| Tecla        | Ação                 |
| ------------ | -------------------- |
| ← → ou A D   | Trocar avião         |
| Enter        | Copiar link do lobby |
| Enter (host) | Iniciar partida      |
| Escape       | Sair do lobby        |

### Touch / Mobile

- Toque para iniciar
- Arraste no canvas → joystick virtual (direção + intensidade)
- Botão ⏸ (centro superior) → pausar

---

## Power-ups

| Power-up         | Efeito                                                                                                     | Duração    |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| 🛡️ ESCUDO        | Absorve o próximo acerto sem perder vida; acumula até 3×                                                   | 300 frames |
| ⚡ BOOST         | Tiro triplo + cadência máxima; acumula até 3×                                                              | 340 frames |
| 🛩️ 14-BIS        | Invencibilidade total; avião transforma-se no biplano de Santos-Dumont. Taxa de queda escala com combo ×10 | 480 frames |
| 🚀 PULSO AVIBRAS | Dispara 2 mísseis teleguiados a cada 90 frames; mira OVNIs e chefes primeiro                               | 540 frames |
| 📡 SATÉLITE INPE | Ímã: atrai coletáveis num raio de 220px; revela barras de HP dos inimigos                                  | 420 frames |
| ❄️ REVAP SHOCK   | Ondachoque: elimina projéteis inimigos num raio de 300px; mantém campo de 80px                             | 260 frames |
| 🪂 ASA DELTA     | Aceleração/desaceleração quase instantânea; combo nunca zera; rastro arco-íris                             | 420 frames |
| 📶 WINGMAN 5G    | Drone aliado espelha seus tiros + anel de escudo orbital que intercepta projéteis inimigos                 | 540 frames |
| ❤️ VIDA +1       | +1 HP (máx. `maxLives + 2`). **Drop raro exclusivo de chefes.** Chance diminui a cada vez coletado.        | —          |

> Power-ups têm raridade adaptativa: cada coleta reduz levemente a chance do próximo drop do mesmo tipo. Em Aventura os drops são 50% mais frequentes; em Radical, 35% mais raros.

---

## Mecânicas Novas

### Rasante

Voe perto de balas inimigas (a ~22px) sem ser atingido para ganhar pontos bônus (`6 × combo`). Também reduz o cooldown do míssil Avibras em 14 frames por rasante.

### Diálogo de Rádio

Uma caixa de rádio aparece no canto inferior esquerdo com mensagens da Torre SJC, FAB, CEMADEN e Avibras reagindo ao início de ondas, aparição de chefes, coleta de power-ups e pouca vida.

### Modos de Dificuldade

| Modo            | Inimigos                         | Powerups   | Combo máx | Boss a cada | 2º boss  |
| --------------- | -------------------------------- | ---------- | --------- | ----------- | -------- |
| 🌅 **AVENTURA** | HP ×0.65, spawn suave, DDA ativo | +50% drops | ×10       | ~80s        | Onda 18+ |
| 🔥 **RADICAL**  | HP ×1.6, spawn linear até fase 4 | -35% drops | ×50       | ~30s        | Onda 5+  |

Troque no menu com ↑↓. Recordes são separados por dificuldade.

> **Aventura** usa DDA (Dynamic Difficulty Adjustment): o spawn rate se ajusta ±20% conforme o stress do jogador, mantendo o estado de flow. **Radical** tem curva determinística sem concessões.

### Eventos atmosféricos

### Missão Satélite CBERS

Um satélite CBERS-4 entra pela direita a cada ~1 minuto. Escorte-o até sair pela esquerda sem que inimigos o atinjam e ganhe +800 pontos.

---

## Tipos de Inimigos

| Inimigo        | Descrição                                                                            |
| -------------- | ------------------------------------------------------------------------------------ |
| ☁️ Frente Fria | Nuvem horizontal lenta com movimento senoidal vertical. Dispara raios. HP: 4         |
| 🤖 Drone DCTA  | Drone horizontal rápido com oscilação de fase. HP: 1                                 |
| 🦜 Arara Real  | Persegue o jogador verticalmente. HP: 1                                              |
| 🛸 OVNI        | Somente à noite. Movimento errático, raio trator, disparo direcional em feixe. HP: 3 |
| 🐜 Tanajura    | Pequeno, rápido, comportamento em enxame. HP: 1                                      |
| 🚁 Helicóptero | Paira e metraha. HP: 2                                                               |
| 🎈 Balão       | Inimigo flutuante lento. Libera drones ao morrer. HP: 1                              |

---

## Chefes

| Chefe                | Descrição                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ⚠️ Monstro Climático | Clássico. Lado direito, spread rápido de orbes. HP: 42+                                                                 |
| 🚀 Protótipo X       | Chefe de velocidade. Paira e faz passes rasantes; acelera a cada lapso; spread de tiros. HP: 28+                        |
| 👁️ Olho do CEMADEN   | Chefe de fases. Escudo invulnerável rotaciona; ataca em 3 modos (granizo, laser, microburst). HP: 35+                   |
| ⚙️ Grande Engrenagem | Chefe de pressão. Sobe e desce, dispara orbes ricocheteantes, spawna drones. HP: 55+                                    |
| 🦗 A Cigarra         | Chefe final. Muda de forma a cada ~5s, inverte os controles do jogador ao transformar, tiros em feixe colorido. HP: 90+ |

Os chefes se revezam em sequência. Em Aventura, um segundo chefe aparece a partir da onda 12; em Radical, a partir da onda 5.

---

## Aviões Desbloqueáveis

| Avião                  | Velocidade | HP  | Cadência  | Desbloquear          |
| ---------------------- | ---------- | --- | --------- | -------------------- |
| ✈ EMB-314 Super Tucano | 5,5        | 3   | 24 frames | Grátis               |
| 🛫 Embraer E2          | 6,8        | 2   | 20 frames | 3.000 pts acumulados |
| 🚀 C-390 Millennium    | 4,2        | 4   | 30 frames | 8.000 pts acumulados |

A pontuação acumulada soma todas as partidas e é salva no `localStorage`.

---

## Ondas e Fases

| Onda | Nome                       | Música           | Tema              |
| ---- | -------------------------- | ---------------- | ----------------- |
| 0    | Frente Fria da Mantiqueira | Chill Hip-Hop I  | Entrada calma     |
| 1    | Patrulha de Drones DCTA    | Arcade           | Ritmo sobe        |
| 2    | Bando de Araras Furiosas   | Chill Hip-Hop II | Noite começa      |
| 3    | Noite dos Discos Voadores  | Tetris           | OVNIs, mistério   |
| 4    | Invasão Coordenada         | Space Invaders   | Pressão crescente |
| 5    | Tempestade Total           | Rock I           | Escalada total    |
| 6    | Alerta CEMADEN             | Galaga           | Modo batalha      |
| 7    | Caos Sobre o Vale          | Pac-Man          | Caos máximo       |
| 8    | Batalha Final do Guardião  | Rock II          | Batalha final     |
| 9+   | _(cicla)_                  | Mario            | Loop infinito     |

---

## Estrutura de Arquivos

```
/
├── index.html                    — Shell HTML, CSS, fullscreen API
├── CLAUDE.md / GEMINI.md         — Instruções para AI (leia docs/design.md)
├── Dockerfile                    — Multi-stage: Vite build + Bun runtime
├── fly.toml                      — Configuração fly.io
├── vite.config.ts                — Bundler cliente
├── tsconfig.json
├── src/
│   ├── types.ts                  — Enums (ST) e interfaces
│   ├── constants.ts              — Dados imutáveis (planos, dificuldades, waves)
│   ├── state.ts                  — Singleton de estado mutável
│   ├── world.ts                  — Canvas, getSky(), VERSION
│   ├── audio.ts                  — SFX Web Audio + música procedural
│   ├── entities.ts               — Player, Enemy, Bullet, Collectible…
│   ├── renderer.ts               — drawBg(), drawHUD(), drawMenu()…
│   ├── dev.ts                    — Painel DEV
│   ├── multiplayer.ts            — WebSocket, lobby, RemotePlayer, co-op
│   ├── game.ts                   — Loop principal, input, ondas
│   ├── main.ts                   — Entry point
│   └── server.ts                 — Servidor Bun (HTTP estático + WebSocket)
├── .github/workflows/deploy.yml  — CI/CD: build + GitHub Pages
└── docs/
    └── design.md                 — Documento de design completo
```

TypeScript + Vite. Sem framework de jogo — canvas 2D puro.

Para detalhes técnicos completos — arquitetura, sistemas de jogo, entidades, balanceamento e decisões de design — consulte [docs/design.md](docs/design.md).
