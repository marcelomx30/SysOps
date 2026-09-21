# Tarefa 01 — Simulador de Escalonamento de Processos

Simulador dos principais algoritmos de escalonamento de processador, com **interface
web animada** (bônus previsto no enunciado) e **CLI compatível com stdin/stdout**
(exigência literal do enunciado).

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
tempo     P1    P2     P3   P4
 0- 1     ##    --
 1- 2     ##    --     --
 2- 3     --    ##     --
```

`##` = processo ocupando o processador · `--` = processo pronto, aguardando · vazio = ainda não criado ou já encerrado.

## Regra de desempate

Havendo empate na escolha do processo que ocupará o processador, aplicar **nesta ordem**:

1. o processo que **já está com o processador** (evita troca de contexto);
2. o processo com **menor tempo restante** de processamento;
3. escolha **aleatória**.

## Stack

- **Motor de simulação**: TypeScript puro, sem dependências de runtime — compartilhado entre CLI e web
- **Interface web**: Next.js + React + TypeScript, deploy na Vercel
- **Testes**: Vitest

## Como rodar

```bash
npm install     # instala as dependências
npm test        # roda a suíte de testes
npm run dev     # sobe a interface web em http://localhost:3000
npm run build   # build de produção
```

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
| Prioridade (com e sem preempção) | #8, #9 | ⬜ frente B |
| Round-Robin (com e sem aging) | #10, #11 | ⬜ frente C |
| CLI stdin/stdout | #13 | ⬜ frente C |
| Interface web | #14, #15 | ⬜ frente B |

## Entregáveis

- [ ] Código comentado
- [ ] Documento de decisões de implementação (classes, estruturas de dados, padrões de projeto) → [`docs/decisoes-de-implementacao.md`](docs/)
- [ ] Interface visual (bônus)
