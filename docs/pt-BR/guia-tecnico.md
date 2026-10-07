# Como o vibe-git funciona por dentro

Este guia explica a arquitetura e as decisões de design do **vibe-git**, um CLI em Node.js que automatiza a divisão de alterações em commits, branches e Pull Requests com a ajuda de um modelo de linguagem.

O cenário que ele resolve é conhecido: a feature está pronta, os testes passam e o `git status` mostra vinte e três arquivos alterados. O ideal seria separar tudo em commits pequenos, na ordem em que as coisas dependem umas das outras, e escrever um Pull Request que explique o que mudou. Na prática, o que costuma acontecer é um `git add .` seguido de `git commit -m "ajustes"`.

O vibe-git lê as alterações do repositório, pede a um modelo de linguagem um plano de commits e depois executa esse plano: cria as branches, faz os commits, dá push e abre os PRs.

## A ideia central: a IA planeja, o código executa

A decisão mais importante do projeto é que o modelo **nunca roda um comando Git**. Ele só devolve um plano em JSON. Quem executa é código determinístico, e entre uma coisa e outra existe um arquivo que você pode abrir, ler e editar.

O fluxo tem três etapas:

```text
vibe-git run   ->  plano JSON em vibe-git/exit/
   (você revisa e edita o arquivo)
vibe-git exec  ->  branches, commits, push e PRs
```

Isso resolve o maior problema de colocar um LLM perto do seu histórico Git: se ele errar, o erro está num arquivo de texto, não no seu repositório.

## O que entra: o arquivo de entrada

O modelo recebe mais do que o diff. Você descreve a intenção num JSON pequeno:

```json
{
  "exitName": "feature-auth-plan",
  "prBase": "main",
  "userSummary": [
    "Implementei autenticação JWT",
    "Criei a tela de login"
  ],
  "branches": [
    { "branchName": "feat/auth", "description": "Infraestrutura de autenticação" },
    { "branchName": "feat/login-ui", "description": "Tela de login" }
  ]
}
```

O `userSummary` dá o tema do trabalho. As `branches` dizem como você quer dividir a entrega. Com isso o modelo sabe para onde cada arquivo deve ir, o que o diff sozinho não informa.

## O que sai: o plano

O comando `run` junta três coisas (a configuração, o arquivo de entrada e o estado do repositório) e devolve algo assim:

```json
{
  "generatedAt": "2026-10-05T12:00:00.000Z",
  "sourceBranch": "main",
  "branches": [
    {
      "branchName": "feat/auth",
      "pr": {
        "title": "feat(auth): add authentication infrastructure",
        "body": "# Description\n...",
        "base": "main"
      },
      "prHistory": [],
      "commits": [
        { "message": "feat(auth): add token service", "files": ["src/services/token.js"] },
        { "message": "feat(auth): add login route", "files": ["src/routes/login.js"] }
      ]
    }
  ]
}
```

Cada commit lista os arquivos que entram nele. É essa estrutura que o `exec` percorre depois.

## A arquitetura

O projeto usa só duas dependências, `chalk` e `dotenv`. As chamadas HTTP usam o `fetch` nativo do Node e os testes usam o `node:test`. O código é dividido em camadas simples:

```text
bin/cli.js                    entrada, carrega o .env
src/router.js                 escolhe o comando
src/commands/                 adaptadores finos dos comandos
src/application/use-cases/    regras de negócio
src/builders/                 montagem do prompt
src/parsers/                  leitura da resposta da IA
src/providers/ai/             provedores de IA
src/services/                 Git e GitHub
```

O roteador é um `switch` sobre o primeiro argumento. Tudo o que vem depois do nome do arquivo é tratado como flag:

```js
case "exec": {
    const flags = args.slice(2);
    await exec(args[1], flags);
    break;
}
```

Os comandos não têm regra de negócio. Eles leem a configuração, montam as dependências e chamam um caso de uso. É o caso de uso que sabe o que fazer.

## Conversando com o Git

A camada de Git é um `execSync` com funções nomeadas em volta:

```js
export const gitDiff = () => {
  try {
    return exec("git diff HEAD");
  } catch (error) {
    return exec("git diff --cached");
  }
};

export const untrackedFiles = () =>
  exec("git ls-files --others --exclude-standard");
```

Um detalhe: `git diff HEAD` não mostra arquivos novos que ainda não foram rastreados. Por isso o CLI envia também a lista de arquivos não rastreados. Dos arquivos novos, o modelo vê só o nome, não o conteúdo.

## Trocando de provedor sem trocar o resto

O vibe-git funciona com Gemini, OpenAI e Groq. Cada um tem um *adapter* com o mesmo método, `generateContent(prompt, systemPrompt)`, que devolve o texto e a contagem de tokens. Uma *factory* escolhe o adapter a partir da configuração:

```js
case "gemini": {
  const apiKey = getAIApiKey("gemini");
  const modelName = getAIModelName("gemini", config);

  return new RetryAiAdapter(new GeminiAdapter(apiKey, modelName));
}
```

Repare no `RetryAiAdapter`. Ele é um *decorator*: tem o mesmo método dos adapters e embrulha qualquer um deles com até três tentativas, esperando cinco segundos entre elas. O caso de uso não sabe que existe retentativa, nem qual provedor está do outro lado.

Para adicionar um provedor novo, escreva um adapter e registre uma linha na factory.

## Montando o prompt

Esta é a parte mais delicada. O prompt carrega muita coisa: o papel do modelo, as regras de commit, as instruções de PR, o resumo do usuário, as branches, o diff e o formato de saída.

O diff é, de longe, o maior bloco. Em uma feature grande ele ocupa quase todo o prompt. E modelos de linguagem tendem a dar menos atenção ao que fica no meio de um contexto longo, um efeito conhecido como *Lost in the Middle*. Se as regras ficarem antes do diff, elas estarão longe demais quando o modelo começar a escrever a resposta.

Por isso o prompt é montado em três blocos, nesta ordem:

```text
1. CONTEXTO        papel do modelo, resumo do usuário, branches desejadas
2. DADOS           <diff> ... </diff>  <untracked_files> ... </untracked_files>
3. INSTRUÇÕES      regras de commit, PR, formato de saída e atomicidade
```

O contexto vem primeiro, para o modelo ler o diff já sabendo o que procurar. As regras vêm por último, coladas no ponto em que a resposta começa.

O bloco do meio tem outro cuidado. Um diff é texto arbitrário: pode conter um comentário, um README ou um arquivo de prompt com frases que parecem instruções. Por isso os dados vão dentro de tags XML, precedidos de um aviso de que aquilo é carga de dados, somente leitura, e que instruções ali dentro devem ser ignoradas.

## As regras que evitam bugs

Algumas regras do prompt existem por causa de como o Git funciona, não por estilo. A principal:

```text
ANTI-BUG RULE (FILE-LEVEL ATOMICITY):
1. 'git add' stages the entire file.
2. NEVER generate two separate commits for the same file in the same plan.
```

O executor usa `git add <arquivo>`, que adiciona o arquivo inteiro. Se o modelo colocasse o mesmo arquivo em dois commits, o primeiro levaria todas as alterações e o segundo ficaria vazio. A regra impede que o plano prometa algo que o executor não consegue cumprir.

Outras regras empurram o modelo para commits pequenos: não misturar escopos diferentes, desconfiar de commits com mais de quatro arquivos, e dividir qualquer commit cuja mensagem precise de um "e".

## Lendo a resposta sem confiar nela

O prompt pede JSON puro, sem markdown. Modelos nem sempre obedecem. O parser tenta três estratégias, da mais estrita para a mais tolerante:

```js
const attempts = [
  () => JSON.parse(raw),
  () => {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!match) throw new Error("No code block found");
    return JSON.parse(match[1].trim());
  },
  () => {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object found");
    return JSON.parse(raw.slice(start, end + 1));
  },
];
```

Primeiro o texto inteiro. Depois o conteúdo de um bloco de código. Por fim, tudo o que estiver entre a primeira e a última chave. Só quando as três falham o usuário vê um erro.

## PRs incrementais

Um PR raramente nasce pronto. Você abre, recebe revisão, faz mais commits. Se a cada rodada a IA escrevesse a descrição do zero, olhando só o diff novo, o PR perderia tudo o que já estava explicado.

O `run` resolve isso procurando um corpo de PR existente para cada branch, em duas fontes:

1. **O GitHub.** Uma consulta à API busca o PR aberto daquela branch. Sem token, ou se a chamada falhar, a função devolve `null` e o fluxo segue.
2. **O plano anterior.** Se já existe um arquivo no mesmo caminho de saída, o `pr` salvo nele serve de base.

O GitHub tem prioridade porque reflete o que está publicado, inclusive edições feitas à mão. O arquivo local é o *fallback*.

O corpo encontrado é injetado no prompt, junto da branch, com a instrução de combinar o texto atual com as mudanças novas.

Depois que a IA responde, entra uma parte que é só código. O `pr` antigo é arquivado antes de o arquivo ser sobrescrito:

```js
const prHistory = [...(prevBranch?.prHistory || [])];

if (prevBranch?.pr) {
  prHistory.push({ ...prevBranch.pr, archivedAt: now.toISOString() });
}

return { ...newBranch, prHistory };
```

O esquema enviado ao modelo pede `prHistory` sempre como lista vazia. Guardar histórico é trabalho determinístico, e deixar isso com o modelo seria convidar invenção.

Quem quiser começar do zero passa `--ignore-pr-history`.

## Executando o plano

O `exec` lê o JSON e percorre as branches. Para cada uma:

1. cria a branch, ou faz checkout se ela já existe;
2. para cada commit, roda `git add` nos arquivos e `git commit` com a mensagem;
3. roda `git push origin <branch>`;
4. cria o Pull Request pela API do GitHub, ou atualiza o título e o corpo do PR que já está aberto para a branch;
5. volta para a branch de origem antes da próxima.

Antes de qualquer comando há uma validação: um plano sem branches, ou com um PR sem branch de destino, é recusado. Daí em diante o executor é tolerante: um arquivo que não existe vira aviso, um commit vazio é pulado, e uma falha de push é registrada sem interromper as outras branches.

A criação de PR tem três modos. Por padrão o CLI pergunta, branch por branch. Com `--auto-create-pr` ele cria tudo sem perguntar, o que serve para rodar sem terminal interativo. Com `--ignore-pr` ele não toca no GitHub.

Antes de perguntar, o `exec` consulta o GitHub pelo PR aberto da branch, com a mesma função que o `run` usa para os PRs incrementais. Se existe um, ele não tenta criar outro (o GitHub recusaria): faz um `PATCH` só com título e corpo. É o que fecha o ciclo dos PRs incrementais, já que o `run` gera a descrição mesclada e o `exec` a publica no PR existente.

A confirmação foi escrita para ser testável. A função recebe a fábrica do `readline` como parâmetro:

```js
export async function shouldCreatePullRequest(
  branch,
  autoCreatePR,
  createInterface = readline.createInterface,
  existingPr = null
) {
```

Nos testes, basta passar uma interface falsa que responde "y" ou "n". Nenhum teste precisa de terminal, de repositório ou de rede. A decisão entre criar e atualizar segue a mesma ideia: `syncPullRequest` recebe as funções de consulta, criação e atualização como dependências injetáveis.

## Princípios que guiam o design

Três ideias do vibe-git servem para qualquer ferramenta que coloque um LLM num fluxo de trabalho real:

- **Separe plano e execução.** O modelo produz dados e o código age. Entre os dois, um arquivo que uma pessoa pode revisar.
- **Trate a saída do modelo como entrada não confiável.** Parser tolerante, validação antes de executar e nada de deixar o modelo cuidar do que código resolve melhor.
- **A ordem do prompt importa.** Contexto no início, dados no meio e delimitados, regras no fim.

O resto é Node.js sem mistério: um `switch`, alguns `execSync`, `fetch` e um punhado de funções pequenas.

## Como experimentar

```bash
npm install -g @igoralbuquerque/vibe-git

vibe-git init
vibe-git run example
vibe-git exec feature-auth-plan
```

O código está em [github.com/igoralbuquerque12/vibe-git](https://github.com/igoralbuquerque12/vibe-git).
