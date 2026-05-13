# SJC Night Flight — Guardião do Vale do Paraíba

Shooter side-scrolling arcade ambientado em São José dos Campos (SJC), inspirado na famosa _Noite dos Discos Voadores_ de 19 de maio de 1986, quando a Força Aérea Brasileira interceptou 21 OVNIs sobre o Vale do Paraíba.

Pilote um avião Embraer defendendo o Vale contra frentes frias, drones, araras, OVNIs e chefes cada vez mais poderosos.

**[Jogar online →](https://gustavonovaes.github.io/sjc-night-flight/)**

---

## Controles

### Teclado

| Tecla               | Ação                     |
| ------------------- | ------------------------ |
| Setas / WASD        | Mover                    |
| Espaço / Enter      | Iniciar jogo             |
| P / Escape          | Pausar / Despausar       |
| M (na pausa)        | Voltar ao menu principal |
| ← → ou A D (menu)   | Trocar avião             |
| I (no menu)         | Tela Sobre               |
| Segurar Escape (4s) | Abrir painel DEV         |

### Touch / Mobile

- Toque para iniciar
- Arraste no canvas → joystick virtual (direção + intensidade)
- Botão ⏸ (centro superior) → pausar

---

## Power-ups

| Power-up         | Efeito                                                                                                     | Duração    |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| 🛡️ ESCUDO        | Absorve o próximo acerto sem perder vida; acumula até 3×                                                   | 240 frames |
| ⚡ BOOST         | Tiro triplo + cadência máxima; acumula até 3×                                                              | 280 frames |
| 🛩️ 14-BIS        | Invencibilidade total; avião se transforma no biplano de Santos-Dumont. Taxa de queda escala com combo ×10 | 420 frames |
| 🚀 PULSO AVIBRAS | Dispara 2 mísseis teleguiados a cada 90 frames; mira OVNIs e chefes primeiro                               | 480 frames |
| 📡 SATÉLITE INPE | Ímã: atrai coletáveis num raio de 220px; revela barras de HP dos inimigos                                  | 360 frames |
| ❄️ REVAP SHOCK   | Ondachoque: elimina projéteis inimigos num raio de 300px; mantém campo de 80px                             | 180 frames |
| 🪂 ASA DELTA     | Aceleração/desaceleração quase instantânea; combo nunca zera; rastro arco-íris                             | 400 frames |
| 📶 WINGMAN 5G    | Drone aliado espelha seus tiros + anel de escudo orbital que intercepta projéteis inimigos                 | 500 frames |

---

## Mecânicas Novas

### Rasante

Voe perto de balas inimigas (a ~22px) sem ser atingido para ganhar pontos bônus (`6 × combo`). Também reduz o cooldown do míssil Avibras em 14 frames por rasante.

### Diálogo de Rádio

Uma caixa de rádio aparece no canto inferior esquerdo com mensagens da Torre SJC, FAB, CEMADEN e Avibras reagindo ao início de ondas, aparição de chefes, coleta de power-ups e pouca vida.

### Eventos Atmosféricos

- **Vento lateral**: rajadas periódicas empurram o jogador horizontalmente (exibido no centro superior)
- **Raios**: flashes brancos aleatórios à noite com um breve tremor de câmera

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

Os chefes se revezam em sequência. A partir da onda 8, um segundo chefe aparece 4 segundos após o primeiro.

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
├── index.html          — Shell HTML, CSS, fullscreen API
├── README.md
├── js/
│   ├── world.js        — Canvas, sistema de céu, dados do mundo
│   ├── audio.js        — SFX Web Audio + música procedural
│   ├── entities.js     — Entidades do jogo (Player, Enemy, Bullet…) + definições de avião
│   ├── renderer.js     — Funções de desenho de fundo e UI
│   ├── dev.js          — Globais de estado + painel DEV
│   └── game.js         — Sistema de ondas, loop update/render, eventos
└── docs/
    └── design.md       — Documento de design completo
```

Sem bundler. Sem framework. JS vanilla puro carregado via `<script defer>` em ordem de dependência.

Para detalhes técnicos completos — arquitetura, sistemas de jogo, entidades, balanceamento e decisões de design — consulte [docs/design.md](docs/design.md).

---

## Rodando Localmente

Qualquer servidor de arquivos estáticos funciona:

```bash
python3 -m http.server 8080
# depois abra http://localhost:8080
```

Ou com Node:

```bash
npx serve .
```

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

### v0.0.1 — Lançamento inicial

- Jogo base: shooter side-scrolling em JS vanilla, sem bundler ou framework
- 3 aviões jogáveis (Super Tucano, Embraer E2, C-390) com stats distintos e desbloqueio por pontuação acumulada
- 7 tipos de inimigos: Frente Fria, Drone DCTA, Arara Real, Tanajura, Helicóptero, Balão, OVNI
- 5 chefes rotativos: Monstro Climático, Protótipo X, Olho do CEMADEN, Grande Engrenagem, A Cigarra
- 8 power-ups: Escudo, Boost, 14-BIS, Pulso Avibras, Satélite INPE, Revap Shock, Asa Delta, Wingman 5G
- Sistema de combo com multiplicador de pontos e bônus de queda do 14-BIS
- Mecânica de rasante: pontos bônus ao passar perto de projéteis sem ser atingido
- Missão CBERS: escolta de satélite por tempo limitado
- Eventos atmosféricos: vento lateral e raios noturnos
- Diálogo de rádio contextual (Torre SJC, FAB, CEMADEN, Avibras)
- Ciclo dia/noite com música procedural em 4 fases
- Painel DEV (Escape 4s) para testes em tempo real
