# SJC Night Flight — Guardião do Vale do Paraíba

## Visão geral

**Tema:** São José dos Campos (SJC) e a famosa *Noite dos Discos Voadores* de 19/05/1986, quando a FAB interceptou 21 OVNIs sobre o Vale do Paraíba.  
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
- Modo Boost: tiro triplo (central + diagonal acima + diagonal abaixo).

### Vidas e invencibilidade
- `MAX_LIVES = 3`. Cada acerto remove uma vida e ativa invencibilidade por `INV = 120` frames (o avião pisca).
- Com escudo ativo: absorve um acerto sem perder vida, ativa invencibilidade por 80 frames.
- Com 14-BIS ativo: imune a qualquer dano.

### Combo e pontuação
- Cada inimigo destruído incrementa o multiplicador de combo (máximo ×10) e reseta o timer de combo para 130 frames.
- Se nenhum inimigo for destruído em 130 frames, o combo volta para 1.
- Pontos = valor base do inimigo × multiplicador de combo atual.
- Recordes são salvos em `localStorage` com a chave `sjc_flight_hs`.
- Pontuação **cumulativa** entre partidas salva em `sjc_total_score` — usada para desbloquear aviões.

### Grazing
- Voar muito próximo de um projétil inimigo (d < 22px, d > 14px) sem ser atingido marca `b.grazed = true` e concede `6 × combo` pontos.
- Cada graze reduz o cooldown do Pulso Avibras em 14 frames.

### Rádio SJC
- `radioText` + `radioT` exibem mensagens de Torre SJC/FAB/CEMADEN por 200 frames no canto inferior esquerdo.
- Mensagens são enfileiradas em `radioQueue` com delay opcional.
- Disparado em: início de cada wave, spawn de boss, evento OVNI, coleta de Avibras/14-BIS, HP crítico (1 vida).

### Eventos atmosféricos
- **Vento lateral** (`windX`): a cada ~1400–2600 frames `windX` é definido aleatoriamente (±0.32), dura 9s e aplica `player.vx += windX * 0.1` por frame. Indicador visual exibido no topo do HUD.
- **Relâmpago** (apenas à noite): chance de 0.06%/frame de flash branco 3 frames + shake +4.

### Missão CBERS
- Satélite entra pela direita a cada ~3800 frames; se escoltado off-screen esquerda concede +800 pontos.
- Inimigos que colidem com ele reduzem `cbersMission.hp`; ao chegar a 0 a missão falha.

### Aviões desbloqueáveis
| Avião | accel | maxSpd | fireN | lives | unlock |
|-------|-------|--------|-------|-------|--------|
| EMB-314 Super Tucano | 0.45 | 5.5 | 24 | 3 | 0 |
| Embraer E2 | 0.38 | 6.8 | 20 | 2 | 3 000 |
| C-390 Millennium | 0.30 | 4.2 | 30 | 4 | 8 000 |

`Player` recebe um `planeCfg` no construtor que substitui `accel`, `topSpd`, `_fireN` e `lives`. Seleção no menu via ← →.

---

## Power-ups

| ID            | Label           | Efeito                                                                        | Duração (frames)     |
|---------------|-----------------|-------------------------------------------------------------------------------|----------------------|
| `shield`      | ESCUDO          | Absorve o próximo acerto sem perder vida; acumula até 3×                      | `SHIELD_DUR = 300`   |
| `boost`       | BOOST           | Tiro triplo + cadência máxima; acumula até 3×                                 | `BOOST_DUR = 340`    |
| `14bis`       | 14-BIS          | Invencibilidade total; avião transforma-se no biplano de Santos-Dumont        | `BIS_DUR = 480`      |
| `avibras_pw`  | PULSO AVIBRAS   | Dispara 2 mísseis teleguiados a cada 90 frames; prioriza OVNIs e chefe        | `AVIBRAS_DUR = 540`  |
| `inpe_sat`    | SATÉLITE INPE   | Ímã que atrai coletáveis num raio de 220px; revela barra de HP de todos os inimigos | `INPE_DUR = 420` |
| `revap_pw`    | REVAP SHOCK     | Onda de choque instantânea: destrói projéteis inimigos num raio de 300px; mantém campo de 80px | `REVAP_DUR = 260` |
| `delta_pw`    | ASA DELTA       | Aceleração/frenagem quase instantâneas (accel 1.8, friction 0.22); combo não reseta; rastro arco-íris | `DELTA_DUR = 420` |
| `ericsson_pw` | WINGMAN 5G      | Drone wingman que replica o tiro do jogador (diagonal duplo com Boost ativo)  | `ERICSSON_DUR = 540` |

### Notas de implementação

- **14-BIS** é marcado como `rare: true` no array `CTYPES_PW`. Visual: biplano 14-Bis de Santos-Dumont com hélice traseira girando.
- **Pulso Avibras** cria instâncias de `HomingMissile` via `_findMissileTarget()`, que prioriza `ovni > boss > mais próximo`. Os mísseis ajustam direção gradualmente a cada frame (steering) com velocidade máxima 10.
- **Satélite INPE** move coletáveis 3.5px/frame em direção ao jogador quando dentro de 220px. A revelação de HP sobreescreve a condição `hp < mhp` no draw do inimigo.
- **Revap Shock** age no primeiro frame com raio de limpeza total (300px) e mantém campo de 80px pelo restante da duração.
- **Asa Delta** substitui `accel = 0.45` e `friction = 0.84` pelos valores agile. O rastro usa `hue = (frame * 6) % 360` para efeito arco-íris.
- **Wingman 5G** dispara no mesmo frame que o jogador (quando `player.fireT === 1`) a partir da posição `(player.x+30, player.y+38)`.

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
- Spawn a cada **2800 frames** (~47s — intervalo aumentado para o jogador ter tempo de respirar).
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
`spawnBoss()` usa `BOSS_ROTATION = ["boss","cemaden_eye","engrenagem","cigarra","prototipo_x"]` com índice `waveNum % 5`. O Protótipo X foi movido para o último lugar por ser o mais difícil de matar em laps avançados. Após wave 8, um segundo chefe entra 4s depois.

A constante `BOSS_TYPES` (definida em `game.js`) lista todos os tipos de chefe e é usada em múltiplos pontos para verificar colisões e drops.

---

## Fases e Waves (Hordas)

O jogo é dividido em **4 fases**, cada uma com 2 waves. Cada wave é anunciada no canvas e dispara uma **horda** — um burst de inimigos temáticos. Após a horda, o spawn contínuo normal retoma. A wave avança ao matar o chefe (boss).

### Fases

| Fase | Waves | Tema                          |
|------|-------|-------------------------------|
| 1    | 0–1   | Frente Fria e Patrulha DCTA   |
| 2    | 2–3   | Araras Furiosas + OVNIs noturnos |
| 3    | 4–5   | Invasão Coordenada            |
| 4    | 6+    | Caos Total / Batalha Final    |

> A música troca a cada wave (não por fase). Ver tabela completa em [Playlists e trilha dinâmica](#playlists-e-trilha-dinâmica).

### Waves e hordas

Cada fase apresenta apenas os inimigos temáticos relevantes. Novos tipos são introduzidos gradualmente.

| Wave | Nome                         | Fase | Horda (inimigos em burst)                                         |
|------|------------------------------|------|-------------------------------------------------------------------|
| 0    | Frente Fria da Mantiqueira   | 1    | 3 clouds + 3 drones                                               |
| 1    | Patrulha de Drones DCTA      | 1    | 5 drones + 2 clouds + 2 araras                                    |
| 2    | Bando de Araras Furiosas     | 2    | 5 araras + 3 drones + 1 cloud + 1 balao                           |
| 3    | Noite dos Discos Voadores    | 2    | 3 ovnis + 3 araras + 2 drones + 1 balao                           |
| 4    | Invasão Coordenada           | 3    | 4 ovnis + 3 araras + 3 drones + 1 cloud + 2 helicopteros          |
| 5    | Tempestade Total             | 3    | 4 ovnis + 4 araras + 3 drones + 2 clouds + 2 helicopteros + 2 balaos |
| 6    | Alerta CEMADEN — Nível Máx.  | 4    | 5 ovnis + 4 araras + 4 drones + 2 clouds + 3 helicopteros + 3 tanajuras + 2 balaos |
| 7    | Caos Sobre o Vale            | 4    | 6 ovnis + 5 araras + 4 drones + 3 clouds + 3 helicopteros + 4 tanajuras + 2 balaos |
| 8+   | Batalha Final do Guardião    | 4    | 7 ovnis + 6 araras + 5 drones + 3 clouds + 4 helicopteros + 5 tanajuras + 3 balaos (loop) |

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

| ID       | Label    | Pontos | Tipo       |
|----------|----------|--------|------------|
| `inpe`   | INPE     | 50     | pontuação  |
| `embraer`| EMBRAER  | 100    | pontuação  |
| `ita`    | ITA      | 75     | pontuação  |
| `tech`   | TECHPARK | 30     | pontuação  |
| `shield` | ESCUDO   | 0      | power-up   |
| `boost`  | BOOST    | 0      | power-up   |
| `14bis`  | 14-BIS   | 0      | power-up raro |

Coletáveis surgem periodicamente (a cada ~220–380 frames). Ao destruir um inimigo, `dropCollectibles()` consulta a `DROP_TABLE` — cada entrada tem uma chance independente por tipo de inimigo, com **limite de drops por kill: 2 para inimigos comuns, 6 para bosses**. Isso evita que matar um único inimigo polua a tela de coletáveis.

**Visual:** coletáveis de pontuação exibem o nome da empresa centralizado; power-ups exibem o emoji do item em tamanho grande, sem texto.

---

## Renderização

- **Canvas 2D** com dimensões lógicas fixas 800×450.
- CSS escala o elemento `<canvas>` para `min(100vw, (100vh - 28px) * 800/450)`, preservando proporção.
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

O código é dividido em 6 módulos carregados via `<script defer>` em ordem de dependência — equivalente a um arquivo concatenado, sem bundler, compatível com GitHub Pages.

### Módulos

| Arquivo            | Responsabilidade                                                              |
|--------------------|-------------------------------------------------------------------------------|
| `js/world.js`      | Canvas setup, RNGs, interpolação de céu, estrelas, montanhas, prédios, carros |
| `js/audio.js`      | Web Audio API: SFX, playlists, loop de música, troca por fase                 |
| `js/entities.js`   | Constantes de duração, helpers (`circ`, `explode`…), classes de entidades     |
| `js/renderer.js`   | Scroll offsets, funções de desenho de fundo e UI (HUD, menus, overlays)       |
| `js/dev.js`        | Estado de jogo, globals, painel DEV e funções de debug                        |
| `js/game.js`       | Waves, `startGame`, `update`, `render`, event listeners, loop principal       |

**Ordem de carregamento em `index.html`:**
```html
<script src="js/world.js" defer></script>
<script src="js/audio.js" defer></script>
<script src="js/entities.js" defer></script>
<script src="js/renderer.js" defer></script>
<script src="js/dev.js" defer></script>
<script src="js/game.js" defer></script>
```

Todos os arquivos usam `"use strict"` e compartilham escopo global — sem ES modules, sem bundler.

### Classes
| Classe        | Responsabilidade                                      |
|---------------|-------------------------------------------------------|
| `Player`      | Estado do jogador, movimento, tiro, power-ups, draw   |
| `Enemy`       | Todos os tipos de inimigos via `type` no construtor   |
| `Bullet`      | Projétil do jogador com rastro histórico              |
| `EBullet`     | Projétil inimigo (bolt / beam / orb)                  |
| `Collectible` | Token coletável animado com tipo aleatório de `CTYPES`|

### Estados de jogo (`ST`)
| Estado  | Valor | Descrição                          |
|---------|-------|------------------------------------|
| `MENU`  | 0     | Tela inicial                       |
| `PLAY`  | 1     | Jogo em andamento                  |
| `PAUSE` | 2     | Pausado (P ou ESC)                 |
| `OVER`  | 3     | Game over                          |
| `SOBRE` | 4     | Tela "Sobre o jogo" (tecla `I`)    |

### Loop principal
```
requestAnimationFrame → loop() → update() + render()
```
`update()` avança física, spawns e colisões; `render()` desenha tudo na ordem correta de camadas.

---

## Controles touch

- O `canvas` captura `touchstart`, `touchmove`, `touchend` com `{ passive: false }` para poder chamar `e.preventDefault()` e evitar scroll.
- `toCanvas(touch)` converte coordenadas CSS (`getBoundingClientRect`) para coordenadas lógicas do canvas (0–800 × 0–450).
- `JOY_MAX = 70`: raio máximo do joystick virtual em unidades lógicas.
- O joystick é desenhado a cada frame sobre o canvas quando `touch.active === true`.
- Botão `#btn-pause-mobile` visível apenas em dispositivos com `pointer: coarse` (via CSS).

---

## Áudio

Implementado via **Web Audio API** (criado sob demanda por `ensureAC()` após gesto do usuário).

| Função       | Descrição                                      |
|--------------|------------------------------------------------|
| `sfxShoot`   | Tom curto de tiro (square wave, 880 Hz)        |
| `sfxHit`     | Tom grave + ruído (dano ao jogador)            |
| `sfxBang`    | Explosão (ruído + sawtooth grave)              |
| `sfxCollect` | Arpegio ascendente (coletável)                 |
| `sfxPowerup` | Arpegio mais longo (power-up ativado)          |
| `sfxBossIn`  | Tom grave duplo (spawn de boss/OVNI event)     |

### Playlists e trilha dinâmica

Música sintetizada via Web Audio API. 10 playlists, cada uma com notas e BPM próprios:

| Idx | Label           | Tempo  | Estilo         | Wave |
|-----|-----------------|--------|----------------|------|
| 6   | Chill Hip-Hop I | 350 ms | Dm pentatônica | 0    |
| 0   | Arcade          | 280 ms | Pentatônica    | 1    |
| 7   | Chill Hip-Hop II| 310 ms | Am swing       | 2    |
| 1   | Tetris          | 280 ms | Korobeiniki    | 3    |
| 2   | Space Invaders  | 280 ms | Marcial        | 4    |
| 8   | Rock I          | 210 ms | Em power riff  | 5    |
| 3   | Galaga          | 280 ms | Arpejo menor   | 6    |
| 4   | Pac-Man         | 280 ms | Intro riff     | 7    |
| 9   | Rock II         | 180 ms | Heavy mode inf.| 8    |
| 5   | Mario           | 280 ms | Overworld      | 9+   |

**Troca automática:** a cada nova wave, `switchMusicForPhase(waveNum)` seleciona a trilha via `WAVE_PLAYLIST[wave % 10]`, reinicia o índice de nota e reinicia o loop com o novo tempo. Todas as 10 trilhas são utilizadas durante uma partida completa.

`PLAYLIST_TEMPOS[playlistIdx]` define o intervalo entre notas. `stopMusic()` + `startMusic()` fazem o crossover imediato.

---

## Céu dinâmico (detalhes técnicos)

```js
const SKY_KF = [ /* 11 keyframes com t, c[], sun, moon, st */ ];
const _KFP = SKY_KF.map(k => ({ ...k, cr: k.c.map(hexRgb) }));

function getSky() {
  // busca os dois keyframes adjacentes à dayPhase atual
  // interpola linearmente todos os valores
  return { zenith, midhi, midlo, horizon, sun, moon, st };
}
```

`hexRgb(hex)` extrai `[r, g, b]` do hex. `lerpC(a, b, t)` retorna `"rgb(...)"` com valores inteiros via bitwise OR 0.

---

## Interface e UX

### Tela "Sobre" (`ST.SOBRE`)
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

### Contador de FPS
Exibido no canto inferior esquerdo com cor dinâmica: verde ≥ 55 fps, amarelo ≥ 40 fps, vermelho < 40 fps. Calculado a cada segundo via timestamp do `requestAnimationFrame`.

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

| Função        | Volume anterior | Volume atual | Motivo                             |
|---------------|-----------------|--------------|------------------------------------|
| Música de fundo | 0.032         | 0.062        | Muito baixa em relação aos SFX     |
| `sfxShoot`    | 0.050           | 0.022        | Tiro frequente — saturava o áudio  |
| `sfxBang`     | 0.070 / 0.040   | 0.045 / 0.025| Explosão mais suave                |
| `sfxHit`      | 0.110 / 0.070   | 0.090 / 0.050| Dano ao jogador — mantido audível  |
| `sfxBossIn`   | 0.140 / 0.090   | 0.110 / 0.070| Chamado por múltiplos bosses       |
