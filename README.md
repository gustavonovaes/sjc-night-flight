# SJC Night Flight — Guardião do Vale do Paraíba

Shooter side-scrolling arcade ambientado em São José dos Campos (SJC), inspirado na famosa _Noite dos Discos Voadores_ de 19 de maio de 1986, quando a Força Aérea Brasileira interceptou 21 OVNIs sobre o Vale do Paraíba.

Pilote um avião Embraer defendendo o Vale contra frentes frias, drones, araras, OVNIs e chefes cada vez mais poderosos. Modo multiplayer co-op para até 4 jogadores com lobby compartilhável por link.

**[Jogar online →](https://gustavonovaes.github.io/sjc-night-flight/)**

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

| Tecla         | Ação                              |
| ------------- | --------------------------------- |
| ← → ou A D    | Trocar avião                      |
| Enter         | Copiar link do lobby              |
| Enter (host)  | Iniciar partida                   |
| Escape        | Sair do lobby                     |

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
| 🛩️ 14-BIS        | Invencibilidade total; avião se transforma no biplano de Santos-Dumont. Taxa de queda escala com combo ×10 | 480 frames |
| 🚀 PULSO AVIBRAS | Dispara 2 mísseis teleguiados a cada 90 frames; mira OVNIs e chefes primeiro                               | 540 frames |
| 📡 SATÉLITE INPE | Ímã: atrai coletáveis num raio de 220px; revela barras de HP dos inimigos                                  | 420 frames |
| ❄️ REVAP SHOCK   | Ondachoque: elimina projéteis inimigos num raio de 300px; mantém campo de 80px                             | 260 frames |
| 🪂 ASA DELTA     | Aceleração/desaceleração quase instantânea; combo nunca zera; rastro arco-íris                             | 420 frames |
| 📶 WINGMAN 5G    | Drone aliado espelha seus tiros + anel de escudo orbital que intercepta projéteis inimigos                 | 540 frames |
| ❤️ VIDA +1       | +1 HP (máx. `maxLives + 2`). **Drop raro exclusivo de chefes.** Chance diminui a cada vez coletado.       | —          |

> Power-ups têm raridade adaptativa: cada coleta reduz levemente a chance do próximo drop do mesmo tipo. Em Aventura os drops são 50% mais frequentes; em Radical, 35% mais raros.

---

## Mecânicas Novas

### Rasante

Voe perto de balas inimigas (a ~22px) sem ser atingido para ganhar pontos bônus (`6 × combo`). Também reduz o cooldown do míssil Avibras em 14 frames por rasante.

### Diálogo de Rádio

Uma caixa de rádio aparece no canto inferior esquerdo com mensagens da Torre SJC, FAB, CEMADEN e Avibras reagindo ao início de ondas, aparição de chefes, coleta de power-ups e pouca vida.

### Modos de Dificuldade

| Modo | Inimigos | Powerups | Combo máx | Boss a cada | 2º boss |
|------|----------|----------|-----------|-------------|---------|
| 🌅 **AVENTURA** | HP ×0.65, spawn suave, DDA ativo | +50% drops | ×10 | ~80s | Onda 18+ |
| 🔥 **RADICAL** | HP ×1.6, spawn linear até fase 4 | -35% drops | ×50 | ~30s | Onda 5+ |

Troque no menu com ↑↓. Recordes são separados por dificuldade.

> **Aventura** usa DDA (Dynamic Difficulty Adjustment): o spawn rate se ajusta ±20% conforme o stress do jogador, mantendo o estado de flow. **Radical** tem curva determinística sem concessões.

### Eventos Atmosféricos

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

| Onda | Nome                        | Música          | Tema                        |
| ---- | --------------------------- | --------------- | --------------------------- |
| 0    | Frente Fria da Mantiqueira  | Chill Hip-Hop I | Entrada calma               |
| 1    | Patrulha de Drones DCTA     | Arcade          | Ritmo sobe                  |
| 2    | Bando de Araras Furiosas    | Chill Hip-Hop II| Noite começa                |
| 3    | Noite dos Discos Voadores   | Tetris          | OVNIs, mistério             |
| 4    | Invasão Coordenada          | Space Invaders  | Pressão crescente           |
| 5    | Tempestade Total            | Rock I          | Escalada total              |
| 6    | Alerta CEMADEN              | Galaga          | Modo batalha                |
| 7    | Caos Sobre o Vale           | Pac-Man         | Caos máximo                 |
| 8    | Batalha Final do Guardião   | Rock II         | Batalha final               |
| 9+   | *(cicla)*                   | Mario           | Loop infinito               |

---

## Estrutura de Arquivos

```
/
├── index.html            — Shell HTML, CSS, fullscreen API
├── server.js             — Servidor Bun (HTTP estático + WebSocket multiplayer)
├── README.md
├── js/
│   ├── world.js          — Canvas, sistema de céu, dados do mundo
│   ├── audio.js          — SFX Web Audio + música procedural
│   ├── entities.js       — Entidades do jogo (Player, Enemy, Bullet…) + definições de avião
│   ├── renderer.js       — Funções de desenho de fundo e UI
│   ├── dev.js            — Globais de estado + painel DEV
│   ├── multiplayer.js    — Cliente WebSocket, lobby, RemotePlayer, mecânicas co-op
│   └── game.js           — Sistema de ondas, loop update/render, eventos
└── docs/
    └── design.md         — Documento de design completo
```

Sem bundler. Sem framework. JS vanilla puro carregado via `<script defer>` em ordem de dependência.

Para detalhes técnicos completos — arquitetura, sistemas de jogo, entidades, balanceamento e decisões de design — consulte [docs/design.md](docs/design.md).

---

## Modo Multiplayer

Até 4 jogadores co-op aventura num mesmo lobby.

**Como jogar:**
1. No menu, clique em **MULTIJOGADOR** ou pressione **M**
2. Um lobby com ID único é criado automaticamente
3. Copie o link e envie para seus parceiros
4. Selecione sua nave e aguarde — quem criou o lobby clica em **INICIAR PARTIDA**

**Mecânicas co-op exclusivas:**

| Mecânica | Descrição |
|---|---|
| 🆘 Balão SOS | Ao morrer, um balão vermelho cai na sua posição. Parceiro coleta → você revive com 1 HP. Expira em 25s. |
| ◈ Bônus de Formação | Voe junto (< 80px) por 3s → +30% pontos para a dupla. HUD mostra indicador ativo. |
| 🛡️ Escudo Compartilhado | Parceiro com escudo próximo (< 100px) absorve o hit antes de você perder vida. |
| ⚠️ Boss Split Focus | Chefes alternam o alvo entre jogadores. Quem está na mira recebe halo vermelho pulsante. |

**Rodando o servidor (requer [Bun](https://bun.sh)):**

```bash
bun server.js
# Abre http://localhost:3000
```

Variáveis de ambiente opcionais:
- `PORT` — porta do servidor (padrão: 3000)
- `HOST` — host usado nos links de compartilhamento (padrão: `localhost:PORT`)

---

## Rodando Localmente (solo)

Qualquer servidor de arquivos estáticos funciona:

```bash
python3 -m http.server 8080
# depois abra http://localhost:8080
```

Ou com Node:

```bash
npx serve .
```

> Para multiplayer é necessário o servidor Bun acima.

---

## Sobre SJC

São José dos Campos é a capital aeroespacial do Brasil:

- **Embraer** — 3ª maior fabricante de aviões comerciais do mundo
- **INPE** — Instituto Nacional de Pesquisas Espaciais e climáticas, fundado em 1961
- **ITA** — Universidade de engenharia aeronáutica de elite
- **DCTA** — Maior complexo aeroespacial da América Latina
- **Parque Tecnológico** — Um dos maiores parques tecnológicos da América Latina
- **Serra da Mantiqueira** — Reserva da Biosfera pela UNESCO

E em 19 de maio de 1986 — a noite em que 21 OVNIs foram interceptados sobre o Vale do Paraíba pela Força Aérea Brasileira.

---

## Changelog

### v0.0.5 — Modo Multiplayer Co-op

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
- 🛡️ **Escudo Compartilhado**: cliente detecta parceiro com shield a < 100px antes do `tryHit()`; cancela hit, envia `shield_relay_used`; servidor retransmite para decrementar shield do parceiro
- ⚠️ **Boss Split Focus**: servidor alterna alvo de cada boss a cada 120 ticks entre jogadores vivos; jogador alvo recebe halo vermelho pulsante com marcadores de mira

**Interface**
- Botão `🌐 MULTIJOGADOR` pulsante no menu principal (abaixo do seletor de dificuldade)
- Tela de lobby: lista de jogadores com cor individual, seleção de nave, link de compartilhamento, botões INICIAR/PRONTO
- HUD de multiplayer: indicador de formação, overlay "ABATIDO" com contagem regressiva do balão SOS
- Teclado: `M` no menu abre lobby; `←→` selecionam nave no lobby; `Enter` copia link
- URL `?lobby=ID` carrega e conecta automaticamente ao lobby

---

### v0.0.4 — Visuais, Física e Estatísticas

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

### v0.0.3 — DDA, Música e Estatísticas

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

### v0.0.2 — Balanceamento e Performance

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

### v0.0.1 — Lançamento inicial

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
