# Manual de uso do vibe-git

O `vibe-git` é um CLI que lê as alterações do seu repositório, pede a uma IA um plano de commits atômicos e, se você quiser, executa esse plano: cria as branches, faz os commits, dá push e abre os Pull Requests.

Este manual está organizado por comando. Para cada um você encontra a sintaxe, os argumentos, as flags, o que ele lê, o que ele gera e os erros mais comuns.

## Sumário

- [Visão geral](#visão-geral)
- [Antes de começar](#antes-de-começar)
- [`vibe-git init`](#vibe-git-init)
- [`vibe-git run`](#vibe-git-run)
- [`vibe-git plan`](#vibe-git-plan)
- [`vibe-git exec`](#vibe-git-exec)
- [Arquivo de entrada](#arquivo-de-entrada)
- [Plano gerado](#plano-gerado)
- [Configuração](#configuração)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Fluxos completos](#fluxos-completos)
- [Solução de problemas](#solução-de-problemas)

## Visão geral

```text
vibe-git init
vibe-git run  <arquivo-de-entrada> [--ignore-pr-history]
vibe-git plan <arquivo-de-entrada>
vibe-git exec <arquivo-de-saída>   [--ignore-pr] [--auto-create-pr]
```

| Comando | Para que serve | Altera o Git? |
| --- | --- | --- |
| `init` | Cria a configuração e a área de trabalho no repositório. | Não |
| `run` | Gera um plano JSON editável e executável. | Não |
| `plan` | Gera um plano em Markdown com um script Git para rodar à mão. | Não |
| `exec` | Executa um plano JSON: branches, commits, push e PRs. | **Sim** |

Regras que valem para todos os comandos:

- Rode sempre a partir da raiz do repositório Git que você quer processar.
- O nome do arquivo pode ser passado com ou sem `.json`: `vibe-git run example` e `vibe-git run example.json` são equivalentes.
- As flags vêm **depois** do nome do arquivo.
- Chamar `vibe-git` sem comando, ou com um comando desconhecido, imprime o resumo de uso.

## Antes de começar

Você precisa de:

- Node.js com `fetch` nativo.
- Git instalado e um repositório com o remoto `origin`.
- Uma chave de API do Gemini, da OpenAI ou do Groq.
- Permissão de push no remoto, se for usar `exec`.
- Um token do GitHub, se quiser que os Pull Requests sejam criados automaticamente.

Instalação:

```bash
npm install -g @igoralbuquerque/vibe-git
```

---

## `vibe-git init`

Prepara o repositório para usar o `vibe-git`.

```bash
vibe-git init
```

**Argumentos:** nenhum.
**Flags:** nenhuma.

### O que ele cria

| Caminho | Conteúdo |
| --- | --- |
| `vibe-git.config.json` | Provedor de IA, regras de commit e de PR. |
| `vibe-git/entry/example.json` | Arquivo de entrada de exemplo. |
| `vibe-git/exit/` | Pasta onde os planos gerados são salvos. |
| `.env` | Recebe as linhas `VIBE_GIT_AI_API_KEY=` e `GITHUB_TOKEN=`. |
| `.gitignore` | Recebe a linha `vibe-git/`. |

### Cuidados

- `vibe-git.config.json` e `vibe-git/entry/example.json` são **sobrescritos** a cada execução. Se você já personalizou esses arquivos, rodar `init` de novo apaga as suas mudanças.
- `.env` e `.gitignore` não são sobrescritos: o comando só acrescenta as linhas que ainda não existem.

### Depois do `init`

1. Escolha o provedor em `vibe-git.config.json` (`aiProvider`).
2. Preencha a chave de API no `.env`.
3. Edite `vibe-git/entry/example.json` ou crie outro arquivo na mesma pasta.

---

## `vibe-git run`

Analisa as alterações do repositório e gera um plano **JSON** que pode ser revisado, editado e depois executado com `exec`.

```bash
vibe-git run <arquivo-de-entrada> [--ignore-pr-history]
```

### Argumentos

| Argumento | Obrigatório | Descrição |
| --- | --- | --- |
| `<arquivo-de-entrada>` | Sim | Nome de um arquivo dentro de `vibe-git/entry/`, com ou sem `.json`. |

### Flags

| Flag | Efeito |
| --- | --- |
| `--ignore-pr-history` | Gera o plano do zero. Não consulta PRs abertos no GitHub nem o plano anterior, e não arquiva nada em `prHistory`. |

### O que ele lê

- `vibe-git.config.json`.
- O arquivo de entrada em `vibe-git/entry/`.
- O resultado de `git diff HEAD` (alterações em arquivos já rastreados).
- A lista de arquivos não rastreados. Só os **nomes** desses arquivos são enviados à IA, não o conteúdo.

Se não houver diff nem arquivos novos, o comando avisa que não há nada para commitar e encerra.

### O que ele gera

Um arquivo em `vibe-git/exit/`:

- `<exitName>.json`, quando o arquivo de entrada define `exitName`;
- `plan-<timestamp>.json`, quando não define.

Ao final, o terminal mostra o caminho do arquivo e a contagem de tokens de entrada, saída e total.

### PRs incrementais

Por padrão, o `run` não escreve a descrição do PR do zero quando já existe uma. Para cada branch do arquivo de entrada, ele procura um corpo de PR existente nesta ordem:

1. **PR aberto no GitHub** para a branch. Exige `GITHUB_TOKEN`; sem o token, ou se a consulta falhar, essa etapa é ignorada sem interromper o comando.
2. **Plano anterior** no mesmo caminho de saída (`vibe-git/exit/<exitName>.json`).

Quando encontra um corpo, a IA é instruída a combinar o texto existente com as novas alterações, em vez de descartar o que já estava descrito.

Ao sobrescrever um plano anterior, o `pr` antigo de cada branch é guardado em `prHistory`, com a data em `archivedAt`:

```json
{
  "branchName": "feat/auth",
  "pr": { "title": "feat(auth): ...", "body": "...", "base": "main" },
  "prHistory": [
    {
      "title": "feat(auth): versão anterior",
      "body": "...",
      "base": "main",
      "archivedAt": "2026-10-05T12:00:00.000Z"
    }
  ],
  "commits": []
}
```

O histórico pelo plano anterior só funciona com `exitName` definido. Sem ele, cada execução gera um arquivo com nome novo e nunca há plano anterior para ler.

### Exemplos

```bash
# Gera o plano a partir de vibe-git/entry/example.json
vibe-git run example

# Gera do zero, ignorando PRs e planos anteriores
vibe-git run example --ignore-pr-history
```

### Erros comuns

| Mensagem | Causa |
| --- | --- |
| `Config file not found: vibe-git.config.json` | O comando não foi rodado na raiz, ou falta o `init`. |
| `No template file provided.` | Faltou o nome do arquivo de entrada. |
| `Template file not found: vibe-git/entry/...` | O arquivo não existe nessa pasta ou não é um JSON válido. |
| `AI returned invalid JSON. Try running again.` | A resposta da IA não pôde ser interpretada. Rode de novo ou troque de modelo. |
| `VIBE_GIT_AI_API_KEY must be set for the ... provider.` | Falta a chave de API no `.env`. |

---

## `vibe-git plan`

Gera um plano em **Markdown**, com a análise e um script Git pronto para você rodar manualmente. Não executa nenhum comando Git.

```bash
vibe-git plan <arquivo-de-entrada>
```

### Argumentos

| Argumento | Obrigatório | Descrição |
| --- | --- | --- |
| `<arquivo-de-entrada>` | Sim | Nome de um arquivo dentro de `vibe-git/entry/`, com ou sem `.json`. |

**Flags:** nenhuma.

### O que ele gera

Um arquivo `vibe-git/exit/<exitName>.md` (ou `plan-<timestamp>.md`) com três seções:

1. **Análise:** as camadas de dependência detectadas, em ordem de execução.
2. **Script de execução:** um bloco com `git checkout -b`, `git add`, `git commit` e `git push`.
3. **Dados de Pull Request:** uma descrição por branch. Só aparece quando `PRs.createPRs` é `true`.

### Quando usar `plan` em vez de `run`

- Você quer ler e executar os comandos por conta própria.
- Você quer só uma sugestão de como dividir os commits.
- Você não quer que nada seja executado automaticamente.

O arquivo Markdown não pode ser passado para o `exec`, que só aceita planos JSON.

### Exemplo

```bash
vibe-git plan example
```

Os erros são os mesmos do `run`, com exceção do erro de JSON inválido.

---

## `vibe-git exec`

Executa um plano JSON gerado pelo `run`.

> **Atenção:** este comando roda comandos Git reais e faz push. Revise o plano antes.

```bash
vibe-git exec <arquivo-de-saída> [--ignore-pr] [--auto-create-pr]
```

### Argumentos

| Argumento | Obrigatório | Descrição |
| --- | --- | --- |
| `<arquivo-de-saída>` | Sim | Nome de um plano dentro de `vibe-git/exit/`, com ou sem `.json`. |

### Flags

| Flag | Efeito |
| --- | --- |
| `--ignore-pr` | Não valida nem cria Pull Requests. Só branches, commits e push. Dispensa o `GITHUB_TOKEN`. |
| `--auto-create-pr` | Cria todos os PRs do plano sem perguntar, ou atualiza os que já estão abertos. Indicado para ambientes sem terminal interativo. |

Se as duas flags forem passadas, `--ignore-pr` vence e nenhum PR é criado nem atualizado.

Sem nenhuma flag, o comando pergunta no terminal, branch por branch, se deve criar o PR. Só a resposta `y` cria; qualquer outra pula.

Se a branch já tem um PR aberto no GitHub, o `exec` não tenta criar outro: a pergunta passa a ser se deve atualizar o PR existente, e a resposta `y` altera apenas o título e o corpo dele com o `pr.title` e o `pr.body` do plano. A branch de destino do PR aberto não é alterada.

### O que ele faz

Para cada branch do plano, nesta ordem:

1. Cria a branch com `git checkout -b`. Se ela já existir, faz checkout nela.
2. Para cada commit: roda `git add` em cada arquivo listado e depois `git commit` com a mensagem do plano.
3. Roda `git push origin <branch>`.
4. Se a branch tem `pr` e `--ignore-pr` não foi passada, cria o Pull Request ou, se a branch já tem um PR aberto, atualiza o título e o corpo dele (com ou sem confirmação).
5. Volta para a `sourceBranch` do plano antes de começar a próxima branch.

Depois da última branch o comando não troca de branch: você termina na última branch processada.

### Como ele trata falhas

O `exec` não para na primeira falha. Ele registra o problema e segue:

| Situação | Comportamento |
| --- | --- |
| Arquivo não pôde ser adicionado | Aviso; o commit continua com os demais arquivos. |
| Commit sem nada para commitar | Aviso; o commit é pulado. |
| Push falhou | Erro no terminal; a execução segue para o PR e para a próxima branch. |
| Checkout da branch falhou | Erro no terminal; a branch inteira é pulada. |
| Criação ou atualização do PR falhou | Erro no terminal; a execução segue para a próxima branch. |

Por isso, leia a saída até o fim antes de considerar a execução concluída.

### Validações antes de executar

O comando interrompe tudo, sem tocar no Git, quando:

- o plano não tem nenhuma branch;
- alguma branch tem `pr` sem `pr.base` (a não ser com `--ignore-pr`).

### Checklist antes de rodar

- Cada caminho de arquivo existe e aparece em um único commit.
- Os nomes das branches e as mensagens de commit estão corretos.
- Todo `pr` tem `base` preenchido.
- `sourceBranch` é a branch de onde as novas branches devem sair.
- O `GITHUB_TOKEN` está no `.env`, se você vai criar PRs.

### Exemplos

```bash
# Executa e pergunta sobre cada PR
vibe-git exec feature-auth-plan

# Só branches, commits e push
vibe-git exec feature-auth-plan --ignore-pr

# Cria todos os PRs sem perguntar
vibe-git exec feature-auth-plan --auto-create-pr
```

### Erros comuns

| Mensagem | Causa |
| --- | --- |
| `No plan file provided.` | Faltou o nome do plano. |
| `Plan file not found: vibe-git/exit/...` | O plano não existe nessa pasta ou não é um JSON válido. |
| `Invalid plan: must contain at least one branch.` | O plano está sem `branches`. |
| `The plan contains Pull Requests without a target branch (pr.base)...` | Preencha `pr.base` em cada branch ou use `--ignore-pr`. |
| `GITHUB_TOKEN is not set in environment variables.` | Adicione o token ao `.env` ou use `--ignore-pr`. |
| `Could not parse GitHub owner/repo from remote URL.` | O remoto `origin` não é um repositório do GitHub. |

---

## Arquivo de entrada

`run` e `plan` leem um JSON de `vibe-git/entry/`.

```json
{
  "exitName": "feature-auth-plan",
  "prBase": "main",
  "userSummary": [
    "Implementei autenticação JWT",
    "Criei a tela de login"
  ],
  "branches": [
    {
      "branchName": "feat/auth",
      "description": "Infraestrutura de autenticação e tela de login"
    }
  ]
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `exitName` | Não | Nome do arquivo de saída, sem extensão. Sem ele, o nome é `plan-<timestamp>`. |
| `prBase` | Não | Branch de destino dos PRs. Sem ele, preencha `pr.base` no plano antes do `exec`. |
| `userSummary` | Não | Lista do que você fez, em linguagem natural. Dá contexto à IA. |
| `branches` | Recomendado | Branches desejadas. Vazio ou ausente, a IA planeja uma única branch. |
| `branches[].branchName` | Sim, se usar `branches` | Nome exato da branch. |
| `branches[].description` | Sim, se usar `branches` | Objetivo e escopo da branch. |

## Plano gerado

Estrutura do JSON produzido pelo `run`:

```json
{
  "generatedAt": "2026-10-05T12:00:00.000Z",
  "sourceBranch": "main",
  "branches": [
    {
      "branchName": "feat/auth",
      "description": "Infraestrutura de autenticação",
      "pr": {
        "title": "feat(auth): add authentication infrastructure",
        "body": "# Description\n...",
        "base": "main"
      },
      "prHistory": [],
      "commits": [
        {
          "message": "feat(auth): add token service",
          "files": ["src/services/token.js"]
        }
      ]
    }
  ]
}
```

| Campo | Descrição |
| --- | --- |
| `generatedAt` | Data de geração do plano. |
| `sourceBranch` | Branch em que você estava ao rodar o `run`. O `exec` volta para ela entre as branches. |
| `branches[].pr` | Dados do PR. Não aparece quando `PRs.createPRs` é `false`. |
| `branches[].prHistory` | Versões anteriores do `pr`, preenchidas pelo próprio CLI. |
| `branches[].commits` | Commits na ordem em que serão criados. |

O plano é feito para ser editado: você pode mudar mensagens, mover arquivos entre commits, remover commits ou reescrever o PR antes de rodar o `exec`.

## Configuração

`vibe-git.config.json`:

| Chave | Valores | Descrição |
| --- | --- | --- |
| `aiProvider` | `gemini`, `openai`, `groq` | Provedor de IA. |
| `disableWarns` | `true`, `false` | Esconde os avisos do terminal. |
| `commits.useConventionalCommits` | `true`, `false` | Exige Conventional Commits. |
| `commits.conventionalCommitTypes` | Lista de textos | Tipos permitidos (`feat`, `fix`, ...). |
| `commits.idioma` | `en`, `pt-BR`, ... | Idioma das mensagens de commit. |
| `PRs.createPRs` | `true`, `false` | Inclui ou omite os dados de PR nos planos. |
| `PRs.model` | Markdown | Modelo que a IA segue para escrever o PR. |
| `PRs.idioma` | `en`, `pt-BR`, ... | Idioma do conteúdo do PR. |
| `llm-gemini-model.modelName` | Nome de modelo | Modelo usado com o Gemini. |
| `llm-openai-model.modelName` | Nome de modelo | Modelo usado com a OpenAI. |
| `llm-groq-model.modelName` | Nome de modelo | Modelo usado com o Groq. |

## Variáveis de ambiente

Definidas no `.env` da raiz do repositório:

| Variável | Uso |
| --- | --- |
| `VIBE_GIT_AI_API_KEY` | Chave de API compartilhada, usada por qualquer provedor. |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY` | Chave específica do provedor. Tem prioridade sobre a compartilhada. |
| `GITHUB_TOKEN` | Criação de PRs no `exec` e consulta de PRs abertos no `run`. |

Para o `GITHUB_TOKEN`, use um token *fine-grained* restrito aos repositórios necessários, com a permissão **Pull requests: Read and write**. Nunca versione o `.env`.

O token serve só para a API do GitHub. O push continua usando as suas credenciais Git.

## Fluxos completos

### Automático, com PRs

```bash
vibe-git init
# edite vibe-git.config.json, .env e vibe-git/entry/example.json
vibe-git run example
# revise vibe-git/exit/feature-auth-plan.json
vibe-git exec feature-auth-plan
```

### Só commits e push

```bash
vibe-git run example
vibe-git exec feature-auth-plan --ignore-pr
```

### Sem terminal interativo

```bash
vibe-git run example
vibe-git exec feature-auth-plan --auto-create-pr
```

### Manual, a partir do Markdown

```bash
vibe-git plan example
# abra vibe-git/exit/feature-auth-plan.md e rode os comandos que quiser
```

### Atualizando um PR que já existe

```bash
# novas alterações na mesma branch
vibe-git run example
# o novo pr.body parte do corpo do PR aberto ou do plano anterior

vibe-git exec feature-auth-plan
# os novos commits sobem para a branch e o PR aberto recebe o novo título e corpo
```

## Solução de problemas

| Problema | O que verificar |
| --- | --- |
| `Config file not found` | Rode `vibe-git init` na raiz do repositório. |
| `No changes detected in the repository` | Não há diff nem arquivos novos. |
| `AI returned invalid JSON` | Rode `run` de novo ou use um modelo mais confiável para JSON. |
| `LLM request failed (attempt x/3)` | A chamada à IA falhou. São feitas até três tentativas, com cinco segundos de intervalo. |
| `Unsupported AI provider` | `aiProvider` precisa ser `gemini`, `openai` ou `groq`. |
| `Model name for ... must be set` | Falta `llm-<provedor>-model.modelName` na configuração. |
| PR sem branch de destino | Defina `prBase` no arquivo de entrada ou edite `pr.base` no plano. |
| Push falha | Confira o remoto `origin`, as permissões e as suas credenciais Git. |
| API do GitHub retorna `403` | O token precisa ter acesso ao repositório e permissão de escrita em Pull Requests. |
| A descrição do PR não aproveita a anterior | Confira o `GITHUB_TOKEN`, o `exitName` e se `--ignore-pr-history` não foi passada. |
