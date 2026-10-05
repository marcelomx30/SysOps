# SysOps — Sistemas Operacionais (UFC)

Repositório das atividades práticas da disciplina de Sistemas Operacionais.

## Atividades

| Tarefa | Tema | Status | Demo |
|--------|------|--------|------|
| [Tarefa 01](tarefa-01-escalonamento/) | Escalonamento de Processos | 🚧 Em desenvolvimento | [sysops-escalonamento.vercel.app](https://sysops-escalonamento.vercel.app) |

## Rodar a Tarefa 01

Precisa do [Node.js](https://nodejs.org/) 22.12 ou mais novo.

```bash
cd tarefa-01-escalonamento
npm install
npm run cli -- --config exemplos/config.txt < exemplos/entrada-exemplo.txt
```

No PowerShell do Windows, a última linha é
`Get-Content exemplos\entrada-exemplo.txt | npx tsx src/cli/main.ts --config exemplos/config.txt`.
Passo a passo completo, formato dos arquivos e problemas comuns em
[`tarefa-01-escalonamento/README.md`](tarefa-01-escalonamento/README.md#como-rodar).

## Estrutura

Cada tarefa vive em sua própria pasta, autocontida, com o enunciado original em `docs/`,
o código-fonte e o documento de decisões de implementação exigido pelo enunciado.
