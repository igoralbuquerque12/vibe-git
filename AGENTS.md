# AGENTS.md

## Projeto

`vibe-git` e um CLI Node.js que analisa alteracoes de um repositorio, gera planos de commits com IA e pode executar commits, push e criacao de Pull Requests.

- Runtime: Node.js com ES Modules.
- Dependencias principais: `chalk` e `dotenv`.
- Testes: runner nativo `node:test`.
- Alias de imports: `#*` aponta para `src/*`.

## Comandos

```bash
npm test
node bin/cli.js init
node bin/cli.js run <arquivo.json>
node bin/cli.js plan <arquivo.json>
node bin/cli.js exec <arquivo.json> [--ignore-pr] [--auto-create-pr]
```

Antes de concluir qualquer alteracao de codigo, execute `npm test`.

## Estrutura

- `bin/cli.js`: entrada do CLI e carregamento do ambiente.
- `src/router.js`: roteamento dos comandos.
- `src/commands/`: adaptadores dos comandos do CLI.
- `src/application/use-cases/`: regras de negocio.
- `src/providers/ai/`: factory e adapters dos provedores de IA.
- `src/services/`: integracoes com Git e GitHub.
- `src/builders/`, `src/parsers/` e `src/constants/`: construcao e interpretacao dos prompts.
- `src/shared/`: filesystem e logger compartilhados.
- `test/`: testes automatizados.

## Convencoes

- Preserve ES Modules e os aliases `#...` usados pelo projeto.
- Siga o estilo existente no arquivo alterado e mantenha mudancas pequenas e focadas.
- Coloque regras de negocio em `src/application/use-cases/`; comandos devem apenas orquestrar entradas.
- Ao adicionar um provedor de IA, crie um adapter e registre-o em `AiProviderFactory`.
- Adicione ou atualize testes em `test/` para toda mudanca de comportamento.
- Nao altere arquivos fora do escopo nem reverta mudancas existentes do usuario.

## Seguranca Operacional

- Nunca leia, exponha ou versione segredos de `.env`.
- `vibe-git/` e uma area gerada em runtime e ignorada pelo Git; nao dependa dela em testes.
- Nao execute comandos que criem commits, branches, push ou Pull Requests sem solicitacao explicita.
- Para testar fluxos Git/GitHub, prefira mocks ou funcoes injetaveis em vez de operar no repositorio real.
- Nao faca commit ou push das alteracoes automaticamente.

## Criterios de Conclusao

- O comportamento solicitado foi implementado sem ampliar desnecessariamente o escopo.
- Testes relevantes foram adicionados ou ajustados.
- `npm test` passa.
- Documentacao foi atualizada quando comandos, configuracao ou comportamento publico mudaram.

## Finalizacao via MCP vibe-git

Quando a tarefa estiver concluida, validada e com `npm test` passando, e houver autorizacao explicita para subir as alteracoes, finalize usando exclusivamente a tool MCP `vibe_git_finalize_delivery`.

A tool deve ser chamada com:
- `cwd`: caminho absoluto da raiz deste repositorio;
- `baseBranch`: `main`;
- `branchName`: nome curto e descritivo seguindo o tipo da tarefa, por exemplo `feat/...`, `fix/...`, `refactor/...`, `docs/...` ou `chore/...`;
- `taskSummary`: lista objetiva com o que foi implementado, validado e documentado;
- `createPullRequest`: `true` quando a entrega deve abrir PR, ou `false` quando deve apenas executar commit/push sem PR;
- `requireCleanVibeGitWorkspace`: `true`.

Mesmo neste repositorio sendo o proprio `vibe-git`, trate-o como qualquer outro projeto consumidor do MCP: nao execute `git add`, `git commit`, `git push` ou criacao de Pull Request manualmente.