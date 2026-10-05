# Tarefa 01 — Simulador de Escalonamento de Processos

Simulador dos principais algoritmos de escalonamento de processador, com **interface
web animada** (bônus previsto no enunciado) e **CLI compatível com stdin/stdout**
(exigência literal do enunciado).

🔗 **Interface web:** https://sysops-escalonamento.vercel.app

> Divisão do trabalho entre os 3 integrantes e grafo de dependências das tasks: [`DIVISAO-DO-TRABALHO.md`](DIVISAO-DO-TRABALHO.md)
>
> Enunciado original: [`docs/Tarefa 01 - Escalonamento de Processos.pdf`](docs/)

## Algoritmos exigidos

1. FCFS (First Come, First Served)
2. SJF (Shortest Job First)
3. SRTF (Shortest Remaining Time First)
4. Prioridade, sem preempção
5. Prioridade, com preempção por prioridade
6. Round-Robin com quantum, sem prioridade
7. Round-Robin com prioridade e envelhecimento (aging a cada quantum, **sem** preempção por prioridade)

## Formato de entrada

Processos vêm da **entrada padrão**, um por linha, inteiros separados por um ou mais espaços:

```
<instante de criação> <duração em segundos> <prioridade estática>
```

Exemplo (a listagem **não** precisa estar ordenada por data de criação):

```
0 5 2
0 2 3
1 4 1
3 3 4
```

Quantum e taxa de envelhecimento vêm de um arquivo de configuração em texto plano:

```
quantum:2
aging:1
```

## Convenção da escala de prioridades

A escala é **positiva com menor número = maior prioridade**, seguindo a convenção do
Unix/Linux (`nice`). No exemplo acima, P3 (prioridade 1) é o mais prioritário e
P4 (prioridade 4) o menos. Vale para todos os algoritmos com prioridade.

## Formato de saída

Para **cada** algoritmo, em stdout:

- tempo médio de vida (turnaround time, `tt`)
- tempo médio de espera (waiting time, `tw`)
- número de trocas de contexto
- diagrama de tempo da execução (vertical, uma linha por segundo)

Diagrama no formato:

```
tempo  P1 P2 P3 P4
 0- 1  -- ##
 1- 2  -- ## --
 2- 3  ##    --
```

`##` = processo ocupando o processador · `--` = processo pronto, aguardando · vazio = ainda não criado ou já encerrado.

## Regra de desempate

Havendo empate na escolha do processo que ocupará o processador, aplicar **nesta ordem**:

1. o processo que **já está com o processador** (evita troca de contexto);
2. o processo com **menor tempo restante** de processamento;
3. escolha **aleatória**.

Processos criados no mesmo instante **não** são tratados como empate no FCFS nem nos
dois Round-Robin: eles entram na fila **na ordem da entrada**, como no diagrama de tempo
do enunciado (P1 e P2 criados em t=0, P1 executa primeiro). A regra acima vale para os
demais critérios — duração no SJF, tempo restante no SRTF e prioridade nos algoritmos
por prioridade.

No Round-Robin com prioridade e envelhecimento, o envelhecimento é aplicado ao fim de
cada fatia de tempo: quando o quantum se esgota ou, antes disso, quando o processo termina.

## Stack

- **Motor de simulação**: TypeScript puro, sem dependências de runtime — compartilhado entre CLI e web
- **Interface web**: Next.js + React + TypeScript, deploy na Vercel
- **Testes**: Vitest

## Como rodar

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) **22.12 ou mais novo** (confira com `node --version`)
- Git

### 2. Baixar e instalar (só na primeira vez)

```bash
git clone https://github.com/marcelomx30/SysOps.git
cd SysOps/tarefa-01-escalonamento
npm install
```

**Todos os comandos a partir daqui rodam dentro da pasta `tarefa-01-escalonamento/`.**
Na raiz do repositório não há `package.json`, e o `npm` dá erro.

### 3. Rodar o simulador (CLI: stdin → stdout)

Linux, macOS, Git Bash ou Prompt de Comando (`cmd`) do Windows:

```bash
npm run cli -- --config exemplos/config.txt < exemplos/entrada-exemplo.txt
```

PowerShell do Windows (o PowerShell não aceita o `<`):

```powershell
Get-Content exemplos\entrada-exemplo.txt | npx tsx src/cli/main.ts --config exemplos/config.txt
```

| Parte do comando | O que é |
|---|---|
| `npm run cli` | executa o simulador (`src/cli/main.ts`) |
| `--` | separa as opções do `npm` das opções do simulador |
| `--config exemplos/config.txt` | arquivo de configuração com o **quantum** e o **aging** |
| `< exemplos/entrada-exemplo.txt` | manda o arquivo de **processos** para a entrada padrão (stdin) |

O simulador roda a mesma entrada nos **7 algoritmos** e imprime, para cada um: tempo
médio de vida (tt), tempo médio de espera (tw), número de trocas de contexto e o
diagrama de tempo. Trecho da saída:

```
=== Round-Robin with quantum, without priority ===
tempo médio de vida (tt):   9.75
tempo médio de espera (tw): 6.25
trocas de contexto:         7

tempo  P1 P2 P3 P4
 0- 1  ## --
 1- 2  ## -- --
 2- 3  -- ## --
...
```

### 4. Rodar com outra entrada

Os dois arquivos são texto puro e podem ser editados ou trocados:

- **Processos** (`exemplos/entrada-exemplo.txt`): um processo por linha, com
  `<instante de criação> <duração> <prioridade>`. A primeira linha é P1, a segunda P2 e
  assim por diante.
- **Configuração** (`exemplos/config.txt`): `quantum:<n>` e `aging:<n>`, um por linha.
  Sem `--config`, valem `quantum:2` e `aging:1`.

Para testar uma entrada rápida sem criar arquivo (Linux, macOS ou Git Bash):

```bash
printf '0 5 2\n0 2 3\n1 4 1\n3 3 4\n' | npm run cli -- --config exemplos/config.txt
```

Uma entrada inválida (por exemplo, uma letra no lugar de um número) mostra qual linha
está errada e termina com código de saída 1.

### 5. Interface web

- Online: https://sysops-escalonamento.vercel.app
- Local: `npm run dev` e abrir http://localhost:3000

### 6. Testes

```bash
npm test
```

### Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `npm error ... package.json` | o comando foi rodado na raiz do repositório. Entre em `tarefa-01-escalonamento/` |
| `tsx: not found` ou `Cannot find module` | faltou o `npm install` dentro de `tarefa-01-escalonamento/` |
| `Entrada padrão vazia` | faltou o `< exemplos/entrada-exemplo.txt` no fim do comando |
| PowerShell reclama do operador `<` | use o comando do PowerShell da seção 3 |

## Estado da implementação

| Parte | Issue | Status |
|---|---|---|
| Setup do projeto | #1 | ✅ |
| Tipos do contrato | #2 | ✅ |
| Laço de simulação e desempate | #4 | ✅ |
| Parser de entrada e config | #3 | ✅ |
| FCFS | #5 | ✅ |
| SJF | #6 | ✅ |
| SRTF | #7 | ✅ |
| Métricas | #12 | ✅ |
| Round-Robin com quantum | #10 | ✅ |
| Round-Robin com prioridade e envelhecimento | #11 | ✅ |
| CLI stdin/stdout | #13 | ✅ |
| Prioridade sem preempção | #8 | ✅ |
| Prioridade com preempção | #9 | ✅ |
| Interface web | #14, #15 | ⬜ frente B |
| Deploy na Vercel | #17 | 🟡 URL no ar; falta o deploy automático |

## Deploy

A interface está publicada em https://sysops-escalonamento.vercel.app (projeto
`enzzos-projects/sysops-escalonamento`, Root Directory `tarefa-01-escalonamento/`).

O **deploy automático a cada push na `main` ainda não está ligado**: conectar o
repositório exige permissão de admin em `marcelomx30/SysOps` para instalar o app da
Vercel. Até lá a publicação é manual, de dentro desta pasta:

```bash
npx vercel --prod
```

## Entregáveis

- [ ] Código comentado
- [ ] Documento de decisões de implementação (classes, estruturas de dados, padrões de projeto) → [`docs/decisoes-de-implementacao.md`](docs/)
- [ ] Interface visual (bônus)
