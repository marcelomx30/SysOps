# Tarefa 01 — Simulador de Escalonamento de Processos

Simulador dos principais algoritmos de escalonamento de processador, com **interface
web animada** (bônus previsto no enunciado) e **CLI compatível com stdin/stdout**
(exigência literal do enunciado).

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

_A ser preenchido conforme a implementação avança._

## Entregáveis

- [ ] Código comentado
- [ ] Documento de decisões de implementação (classes, estruturas de dados, padrões de projeto) → [`docs/decisoes-de-implementacao.md`](docs/)
- [ ] Interface visual (bônus)
