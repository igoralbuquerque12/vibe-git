# gen-commit 🚀

> **Seu Arquiteto de Software via Linha de Comando.**  
> Transforme alterações caóticas em um histórico de Git limpo, atômico e profissional usando IA (Gemini ou OpenAI).

[![npm version](https://img.shields.io/npm/v/gen-commit.svg?style=flat-square)](https://www.npmjs.com/package/gen-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-blue?style=flat-square)](https://aistudio.google.com/)
[![Powered by OpenAI](https://img.shields.io/badge/Powered%20by-OpenAI-green?style=flat-square)](https://platform.openai.com/)

---

## 🎯 O Que é o gen-commit?

O **gen-commit** não é apenas um gerador de mensagens de commit.  
Ele é uma **CLI (Command Line Interface)** inteligente que atua como um **Arquiteto de Software sênior** diretamente no seu terminal.

Quando você codifica o dia todo e termina com dezenas de arquivos modificados (Backend, Frontend, Banco de Dados e Configurações), o `gen-commit`:

1. Analisa profundamente o `git diff` de todas as mudanças.
2. Entende a **ordem de dependência técnica**  
   (ex.: o banco de dados precisa existir antes da API; a API antes do Frontend).
3. Gera um **Plano de Execução** com commits **atômicos e semânticos**.
4. Divide mudanças complexas em **múltiplas branches**, se necessário.
5. Cria **descrições de Pull Requests** seguindo exatamente o template da sua empresa.

**Resultado:**  
Um histórico de Git que conta uma história clara, facilita Code Reviews e permite **reverts seguros**.

---

## 🆚 Antes vs. Depois

| O Jeito "Preguiçoso" | O Jeito gen-commit |
|---------------------|-------------------|
| `git commit -m "fiz o cadastro e arrumei bugs"` | **Commit 1:** `chore(deps): install prisma`  \
| | **Commit 2:** `feat(db): add user schema` \
| | **Commit 3:** `feat(api): implement auth controller` \
| | **Commit 4:** `feat(ui): create login form` |
| ❌ Impossível reverter só o CSS sem quebrar o banco | ✅ Commits **atômicos e reversíveis** |
| ❌ Code Review caótico | ✅ Review **passo-a-passo** |

---

## 🛠️ Instalação e Configuração

### 1. Instalação

Use diretamente via `npx` ou instale globalmente:

```bash
npm install -g gen-commit
```

### 2. Inicialização

Na raiz do seu projeto:

```bash
gen-commit init
```

Isso criará automaticamente:

- `gen-commit.config.json` → Preferências de IA e templates  
- `.env` → Chaves de API  
- `gen-commit/entry` → Onde você descreve brevemente o que fez

### 3. Configuração da IA 

Independe da sua escolha de provedor, coloque sua respectiva chave na sua `.env`.

1.  Abra o arquivo `.env` gerado na raiz.
2.  Cole sua chave de API na variável `GEN_COMMIT_AI_API_KEY`:
    ```env
    GEN_COMMIT_AI_API_KEY=sk-sua-chave-aqui
    ```
3.  Abra o arquivo `gen-commit.config.json` e informe qual provedor você está usando:
    ```json
    {
      "aiProvider": "gemini || openai" 
    }
    ```

**Onde pegar sua chave?**
* **Google Gemini (Grátis/Recomendado):** [Google AI Studio](https://aistudio.google.com/app/apikey)
* **OpenAI (ChatGPT):** [OpenAI Platform](https://platform.openai.com/api-keys)

## 🚀 Como Usar

Fluxo simples: **Descreva → Planeje → Execute**

### Passo 1: Descreva e Estruture a Estratégia
Edite o arquivo `gen-commit/entry/example.json`. Aqui você define o que fez e como quer separar o código.

**Definindo as Branches:**
Você decide a granularidade. No campo `branches`, adicione um objeto para cada branch que deseja criar.
* **branchName**: O nome técnico da branch (ex: `feat/backend`).
* **description**: A instrução para a IA. Explique **o que deve entrar nessa branch**. A IA lerá isso e moverá os arquivos corretos para ela automaticamente.

Exemplo de configuração para separar Back e Front:

```bash
{
  "userSummary": [
    "Implementei autenticação completa com JWT",
    "Criei formulários de Login e Cadastro"
  ],
  "branches": [
    {
      "branchName": "feat/auth-core",
      "description": "Infraestrutura, Banco de Dados e Lógica de Backend (API)"
    },
    {
      "branchName": "feat/auth-ui",
      "description": "Interfaces visuais (React), componentes de formulário e CSS"
    }
  ]
}
```

### Passo 2: Gere o Plano

```bash
gen-commit run example.json
```

### Passo 3: Execute o Plano

O gen-commit irá gerar um arquivo Markdown em:

```
gen-commit/exit/plan-123.md
```

1. Abra o arquivo gerado
2. Revise o plano (a IA ajuda, você decide)
3. Copie o script Bash e execute no terminal

✨ **Pronto!** Seu trabalho de horas vira commits profissionais em segundos.

---

## 💻 Área do Desenvolvedor (Contribuindo)

Contribuições são muito bem-vindas!  
Este projeto é ideal para estudar:

- Engenharia de Prompt
- Manipulação de AST e Git
- Arquitetura de CLIs profissionais

### Rodando Localmente

Clone o repositório:

```bash
git clone https://github.com/seu-usuario/gen-commit.git
cd gen-commit
```

Instale as dependências:

```bash
npm install
```

Crie o link simbólico (essencial):

```bash
npm link
```

Agora qualquer alteração no código reflete instantaneamente no comando `gen-commit` global.

### Estrutura do Projeto

```
src/commands   → comandos CLI (init, run)
src/services   → Git, Gemini e OpenAI
src/constants  → prompts do sistema (a alma da IA)
```

---

## 📄 Licença

Este projeto está sob a licença **MIT**.  
Use, modifique e distribua livremente.
