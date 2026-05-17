Gere uma nova entrada de release no README.md e em docs/design.md com base nas mudanças desta sessão.

## Passos

1. **Descubra a versão atual** lendo a primeira entrada `### v` do Changelog em README.md. Verifique também a data dessa entrada.
   - Se a data da última entrada **for hoje** (`YYYY-MM-DD` atual): **não crie uma nova entrada** — edite a entrada existente:
     - **Título:** reescreva para resumir o conjunto completo de mudanças (antigas + novas). Não descarte o conteúdo anterior — amplie-o.
     - **Bullets:** mantenha todos os bullets existentes e acrescente os novos ao final.
     - A versão permanece a mesma. Não altere `package.json`.
   - Se a data da última entrada **for anterior a hoje**: incremente o patch (ex: v0.0.1 → v0.0.2) e crie uma nova entrada.

2. **Levante as mudanças** combinando:
   - `git diff HEAD` e `git log --oneline -20` para mudanças não commitadas e commits recentes. Pergunte até qual commit vai o range dos commits verificados.
   - O contexto desta conversa (o que foi discutido e implementado)

3. **Formato da entrada** (nova ou existente):

```
### vX.Y.Z — <título curto que resume o tema da release> _(YYYY-MM-DD)_

- **<Categoria>:** <descrição objetiva da mudança e seu impacto>
- ...
```

A data `YYYY-MM-DD` é a data atual (hoje). Categorias comuns: Migração, Balanceamento, Gameplay, Deploy, Áudio, Performance, Segurança, Correção, Infraestrutura.

4. **Atualize docs/design.md** somente se houver mudanças estruturais (nova mecânica, mudança de arquitetura, stack nova). **Não adicione entradas de changelog em docs/design.md** — o histórico de versões fica exclusivamente no README.md.

5. **Atualize a seção `## Estrutura de Arquivos`** no README.md se arquivos foram movidos, criados ou removidos.

6. **Atualize `package.json`** — se uma nova versão foi criada, altere o campo `"version"` para o novo número (ex: `"0.0.9"`), sem o `v` prefixado. Se a entrada existente foi atualizada, não altere.

7. **Não commite** — apenas edite os arquivos. O usuário fará o commit.

## Estilo

- Português brasileiro
- Objetivo e direto — sem "foi implementado", use "adiciona", "corrige", "move", "ajusta"
- Mencione arquivos afetados quando relevante (`src/audio.ts`, `Dockerfile`, etc.)
- Organize em bullets apenas as principais mudanças por release — agrupe mudanças pequenas relacionadas
