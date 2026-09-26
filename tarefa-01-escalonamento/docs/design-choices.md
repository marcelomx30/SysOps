# Decisões de implementação

Este documento explica as decisões de implementação do simulador de escalonamento
de processos: as estruturas de dados, a organização do código em módulos e classes,
o padrão de projeto usado para plugar os sete algoritmos em um único laço de
simulação, a regra de desempate, a escala de prioridades e o envelhecimento, e como
um único motor atende tanto o CLI quanto a interface web.

O enunciado está em [`Tarefa 01 - Escalonamento de Processos.pdf`](Tarefa%2001%20-%20Escalonamento%20de%20Processos.pdf).
O código é escrito em TypeScript (o enunciado permite JavaScript); código e
comentários estão em inglês, enquanto tudo o que o programa imprime segue o texto
do enunciado, em português.

## Sumário

1. Requisitos do enunciado e onde são atendidos
2. Estruturas de dados
3. Organização em módulos
4. O laço de simulação e o padrão Strategy
5. Regra de desempate
6. Escala de prioridades e envelhecimento
7. A fila de prontos do Round-Robin
8. Métricas
9. Leitura da entrada e da configuração
10. Um motor para o CLI e a interface web
11. Testes

---

## 1. Requisitos do enunciado e onde são atendidos

| Requisito do enunciado | Onde está implementado | Seção |
|---|---|---|
| Sete algoritmos: FCFS, SJF, SRTF, prioridade sem e com preempção, Round-Robin, Round-Robin com prioridade e envelhecimento | `src/engine/policies/*.ts`, registrados em `src/engine/index.ts` | 4 |
| Quantum e envelhecimento lidos de um arquivo em texto plano (`quantum:2` / `aging:1`) | `parseConfiguration` em `src/engine/parser.ts`; `--config` em `src/cli/arguments.ts` | 9 |
| Round-Robin com envelhecimento: envelhecimento a cada quantum, sem preempção por prioridade | `src/engine/policies/round_robin_priority.ts` | 6 |
| Processos lidos da stdin, três inteiros por linha separados por um ou mais espaços, não necessariamente ordenados | `parseProcesses` em `src/engine/parser.ts`; leitura da stdin em `src/cli/main.ts` | 9 |
| Escala de prioridades positiva | Validada no parser; convenção na seção 6 | 6 |
| Para cada algoritmo, em stdout: tempo médio de vida (tt), tempo médio de espera (tw), trocas de contexto, diagrama de tempo | `src/engine/metrics.ts`, `src/cli/report.ts`, `src/cli/diagram.ts` | 8, 10 |
| Diagrama de tempo vertical, uma linha por segundo | `formatDiagram` em `src/cli/diagram.ts` | 10 |
| Código comentado e documento sobre classes, estruturas de dados e padrões de projeto | Este documento e os comentários de documentação em `src/` | todas |
| Estrutura de controle por processo (id, status, prioridade) descrita no documento | `Process` em `src/engine/types.ts` | 2 |
| Desempate: (i) processo que já está com o processador, (ii) menor tempo restante, (iii) aleatório | `breakTie` em `src/engine/simulator.ts` | 5 |
| Interface visual (bônus) | `src/ui/`, `src/app/` (Next.js + React) | 10 |

Os objetivos de aprendizagem do enunciado também citam a diferença entre abordagens
preemptivas e colaborativas, e os tempos de espera, de execução e de resposta. O
primeiro corresponde às flags `preemptive` / `usesQuantum` (seção 4). Os três tempos
são calculados por processo (seção 8); o tempo de resposta aparece na tabela por
processo da interface web.

## 2. Estruturas de dados

Todos os tipos compartilhados ficam em `src/engine/types.ts`. Esse arquivo é o
contrato entre o motor, o CLI e a interface web.

### 2.1 `Process` — a estrutura de controle do processo

Esta é a estrutura que o enunciado pede: ela guarda as informações de controle de
cada processo (id, status, prioridade) durante toda a simulação.

```ts
export type ProcessStatus = 'not-created' | 'ready' | 'running' | 'finished';

export interface Process {
  readonly id: number;             // 1 vira "P1" no diagrama
  readonly creationTime: number;   // da entrada
  readonly duration: number;       // tempo total de CPU; nunca muda
  readonly staticPriority: number; // da entrada; menor número = maior prioridade

  dynamicPriority: number;         // só difere de staticPriority com envelhecimento
  remainingTime: number;           // decrementado a cada segundo executado
  status: ProcessStatus;

  firstExecutionTime: number | null; // null enquanto não executou
  completionTime: number | null;     // null enquanto não terminou
}
```

Decisões por trás dela:

- **Campos somente leitura e campos mutáveis.** O que vem da entrada (`id`,
  `creationTime`, `duration`, `staticPriority`) é `readonly`, então o compilador
  recusa qualquer alteração acidental. Só os campos que a simulação precisa
  atualizar são mutáveis.
- **Duas prioridades.** `staticPriority` guarda o valor da entrada;
  `dynamicPriority` é a que o envelhecimento altera. Manter as duas é o que permite
  ao algoritmo com envelhecimento devolver ao processo sua prioridade original
  depois de atendido (seção 6). Os outros algoritmos por prioridade leem apenas
  `staticPriority`.
- **O id é a ordem da entrada.** `id` é `índice + 1` da linha na entrada
  (`createProcesses` em `src/engine/simulator.ts`), então a primeira linha é P1
  mesmo quando a entrada não está ordenada por instante de criação. Isso segue o
  exemplo do enunciado, em que cada linha é numerada na ordem em que aparece.
- **`not-created` é um status.** O processo existe desde o início da simulação,
  mas só passa a `ready` quando `creationTime <= instant`. É esse estado que
  produz as células vazias antes de um processo aparecer no diagrama.
- **Transições de status.** `not-created → ready` quando o processo é admitido,
  `ready ↔ running` quando ganha ou perde a CPU, e `running → finished` quando
  `remainingTime` chega a 0.

### 2.2 `ProcessInput` e `Configuration`

- `ProcessInput` — `{ creationTime, duration, priority }`: uma linha da entrada,
  como o parser a devolve, antes de virar um `Process`.
- `Configuration` — `{ quantum, aging }`: os valores do arquivo de configuração.

Separar `ProcessInput` de `Process` faz com que o parser devolva dados puros, e o
estado de controle (`status`, `remainingTime`, …) seja criado do zero por
`simulate()` a cada execução. Assim, todo algoritmo parte da mesma entrada intacta.

### 2.3 `TimeSlice` — a linha do tempo

```ts
export interface TimeSlice {
  readonly instant: number;           // cobre [instant, instant + 1)
  readonly running: number | null;    // id na CPU, ou null se ociosa
  readonly ready: readonly number[];  // ids aguardando a CPU
}
```

A simulação registra **um `TimeSlice` por segundo**. Essa lista é a fonte única de
verdade de tudo o que vem depois da simulação:

- o diagrama vertical do CLI (`src/cli/diagram.ts`),
- o diagrama da interface web (`src/ui/diagram_model.ts`),
- todas as métricas (`src/engine/metrics.ts`).

Como os três leem os mesmos registros, o diagrama impresso, o animado e as métricas
não podem divergir entre si.

### 2.4 `ProcessMetrics` e `SimulationResult`

- `ProcessMetrics` — por processo: `turnaroundTime`, `waitingTime`, `responseTime`.
- `SimulationResult` — por algoritmo: nome (`algorithm`), `timeline`, `perProcess`,
  `averageTurnaroundTime`, `averageWaitingTime`, `contextSwitches`.

`SimulationResult` é tudo de que o CLI e a interface web precisam para exibir um
algoritmo; nenhum dos dois calcula nada de escalonamento por conta própria.

## 3. Organização em módulos

```
src/
├── engine/                      motor de simulação — TypeScript puro, sem dependências de runtime
│   ├── types.ts                 contrato compartilhado (seção 2)
│   ├── scheduling_policy.ts     interface SchedulingPolicy + SelectionContext
│   ├── simulator.ts             o laço de simulação e a regra de desempate
│   ├── metrics.ts               métricas derivadas da linha do tempo
│   ├── parser.ts                leitura da entrada (stdin) e do arquivo de configuração
│   ├── index.ts                 ponto de entrada público + availablePolicies()
│   └── policies/
│       ├── first_come_first_serve.ts
│       ├── shortest_job_first.ts
│       ├── shortest_remaining_time_first.ts
│       ├── non_preemptive_priority.ts
│       ├── preemptive_priority.ts
│       ├── round_robin.ts
│       ├── round_robin_priority.ts
│       └── circular_queue.ts    fila de prontos compartilhada pelos dois Round-Robin
├── cli/                         casca stdin → stdout em volta do motor
│   ├── main.ts                  lê a stdin, imprime, converte erros em código de saída 1
│   ├── arguments.ts             --config / --help
│   ├── report.ts                bloco de saída de cada algoritmo
│   └── diagram.ts               diagrama de tempo vertical
├── ui/                          componentes React e seus modelos de visão puros
└── app/                         página e estilos do Next.js
```

Princípios de organização:

- **Um arquivo por algoritmo.** Cada política é uma classe em seu próprio arquivo.
  Além de deixar cada algoritmo fácil de ler isoladamente, isso permitiu que os
  três integrantes trabalhassem em algoritmos diferentes sem editar o mesmo arquivo.
- **O motor não sabe nada de E/S.** `src/engine/` não lê arquivos, não imprime e
  não renderiza. Ele recebe dados e devolve um `SimulationResult`. É isso que
  permite ao CLI e à interface web compartilhá-lo (seção 10).
- **Efeitos colaterais ficam nas bordas.** No CLI, só `main.ts` toca a stdin, a
  stdout e o código de saída; `arguments.ts`, `report.ts` e `diagram.ts` são funções
  puras, então os testes podem chamá-las diretamente. Importar `main.ts` executa o
  programa, por isso nada de que os testes precisam fica nele. A interface web segue
  a mesma ideia: `input_model.ts` e `diagram_model.ts` guardam a lógica como funções
  comuns, e os componentes `.tsx` apenas renderizam.

## 4. O laço de simulação e o padrão Strategy

### 4.1 Por que Strategy

Os sete algoritmos compartilham a maior parte do trabalho: avançar o relógio,
admitir os processos recém-criados, escolher quem ocupa a CPU, executá-lo por um
segundo, registrar a linha do tempo, detectar términos. O que muda entre eles é
**apenas o critério de escolha** e **quando a CPU pode ser retirada**.

Por isso o laço é escrito **uma única vez**, em `simulate()`
(`src/engine/simulator.ts`), e cada algoritmo é uma *estratégia* que implementa a
interface `SchedulingPolicy` (`src/engine/scheduling_policy.ts`). Esse é o padrão de
projeto Strategy. O ganho prático é que o registro da linha do tempo, a contagem de
trocas de contexto e a regra de desempate existem em um só lugar, e não em sete.

### 4.2 A interface `SchedulingPolicy`

```ts
export interface SchedulingPolicy {
  readonly name: string;
  readonly preemptive: boolean;   // um processo em execução pode perder a CPU antes de terminar?
  readonly usesQuantum: boolean;  // a CPU é reavaliada a cada `quantum` segundos?

  sort(context: SelectionContext): readonly Process[];
  areTied(first: Process, second: Process, context: SelectionContext): boolean;
  onSliceEnd?(context: SelectionContext, chosen: Process): void;
}
```

`SelectionContext` carrega os processos prontos, quem estava com a CPU no segundo
anterior, quantos segundos do quantum atual ele já usou, o instante atual e a
configuração.

**Por que `sort` + `areTied` em vez de um `choose()` que devolve um processo?**
A regra de desempate do enunciado precisa valer do mesmo jeito para todos os
algoritmos. Se cada política devolvesse um único processo, cada uma teria de
reimplementar a regra. Em vez disso, a política só informa *em que ordem* classifica
os candidatos e *quem conta como empatado* pelo seu critério; o laço pega o grupo
empatado no topo e aplica a regra (seção 5).

**Por que duas flags em vez de um método "devo preemptar?" em cada política?**
Com `preemptive` e `usesQuantum`, a função `keepsCpu()` do laço decide em um só
lugar se o processo em execução continua na CPU:

```ts
if (running === null || running.remainingTime === 0) return false;
if (policy.usesQuantum && quantumUsed >= configuration.quantum) return false;
return !policy.preemptive;
```

| Algoritmo | Classe | Critério do `sort` | `preemptive` | `usesQuantum` |
|---|---|---|---|---|
| FCFS | `FirstComeFirstServePolicy` | instante de criação, depois ordem da entrada | `false` | `false` |
| SJF | `ShortestJobFirstPolicy` | `duration` total | `false` | `false` |
| SRTF | `ShortestRemainingTimeFirstPolicy` | `remainingTime` | `true` | `false` |
| Prioridade, sem preempção | `NonPreemptivePriorityPolicy` | `staticPriority` | `false` | `false` |
| Prioridade, com preempção | `PreemptivePriorityPolicy` | `staticPriority` | `true` | `false` |
| Round-Robin | `RoundRobinPolicy` | posição na fila circular | `false` | `true` |
| Round-Robin com prioridade e envelhecimento | `RoundRobinPriorityPolicy` | `dynamicPriority`, depois posição na fila | `false` | `true` |

As duas flags descrevem a distinção entre abordagens preemptivas e colaborativas que
o enunciado pede que se entenda:

- `preemptive = false`, `usesQuantum = false` — colaborativo: o processo fica com a
  CPU até terminar (FCFS, SJF, prioridade sem preempção).
- `preemptive = true` — a CPU é reavaliada a cada segundo, então um candidato melhor
  a toma (SRTF, prioridade com preempção).
- `preemptive = false`, `usesQuantum = true` — o processo só é interrompido quando
  sua fatia de tempo termina, nunca por um candidato "melhor". É exatamente o "sem
  preempção por prioridade" que o enunciado exige para o Round-Robin com
  envelhecimento.

O gancho opcional `onSliceEnd` é chamado pelo laço ao fim de cada fatia de tempo de
uma política com quantum — quando o quantum se esgota ou, antes disso, quando o
processo termina. Só os dois Round-Robin o implementam.

### 4.3 Uma iteração do laço

Cada iteração simula um segundo:

1. **Admite** todo processo `not-created` cujo `creationTime <= instant`.
2. Se ninguém estiver pronto, registra uma fatia **ociosa** (`running: null`) e avança.
3. Decide se o processo em execução **continua com a CPU** (`keepsCpu`). Se não,
   **seleciona** um processo: `policy.sort()`, pega o grupo empatado com o líder via
   `policy.areTied()` e resolve com `breakTie()`.
4. **Registra** o `TimeSlice` deste segundo.
5. **Executa** um segundo: `remainingTime -= 1`, `quantumUsed += 1`.
6. Se uma fatia terminou (quantum esgotado ou processo concluído), chama
   `policy.onSliceEnd`.
7. Se `remainingTime` chegou a 0, marca o processo como `finished` e libera a CPU.

Dois detalhes não óbvios do laço:

- **O contador do quantum reinicia a cada reavaliação, mesmo que o mesmo processo
  vença.** Quando um processo é o único pronto, ele vence de novo a reavaliação ao
  fim do seu quantum. Sem zerar `quantumUsed` nesse caso, o contador continuaria
  crescendo, a CPU seria reavaliada a cada segundo e `onSliceEnd` dispararia fora dos
  limites do quantum (o que, no algoritmo com envelhecimento, envelheceria os
  processos com frequência demais).
- **Limite de segurança.** O laço lança um erro se passar de 100.000 instantes
  (`INSTANT_LIMIT`), para que um bug em uma política resulte em mensagem de erro, e
  não em um programa ou aba do navegador travados.

### 4.4 Como adicionar um algoritmo

Implementar `SchedulingPolicy` em um novo arquivo em `src/engine/policies/` e
adicioná-lo em `availablePolicies()` em `src/engine/index.ts`. Tanto o CLI quanto a
interface web percorrem essa função, então o novo algoritmo aparece nos dois sem
nenhuma outra alteração.

## 5. Regra de desempate

O enunciado diz que, havendo empate na escolha do processo que ocupará o
processador, deve-se alocar, nesta ordem: (i) o processo que já esteja com o
processador, para evitar troca de contexto; (ii) o processo com menor tempo
restante de processamento; (iii) em último caso, escolha aleatória.

### 5.1 Implementação

A regra é implementada **uma única vez**, em `breakTie()` em
`src/engine/simulator.ts`, e aplicada por `selectProcess()` ao grupo de candidatos
que a política informa como empatados com o líder:

```ts
const sorted = policy.sort(context);
const leader = sorted[0];
const tied = sorted.filter((candidate) => policy.areTied(candidate, leader, context));
return breakTie(tied, context.running, pickRandom);
```

Em seguida, `breakTie`:

1. devolve o candidato empatado que é o processo atualmente na CPU, se houver;
2. senão, mantém só os candidatos com o menor `remainingTime` e devolve esse
   candidato se houver apenas um;
3. senão, sorteia um dos candidatos restantes.

### 5.2 A aleatoriedade é injetável

A escolha aleatória passa por um parâmetro `RandomPicker` (`(count) => índice`) que
`simulate()` aceita como quarto argumento opcional. O padrão usa `Math.random()`. Os
testes passam um sorteador fixo, então um empate aleatório produz um resultado
previsível nos testes.

### 5.3 O que conta como empate em cada algoritmo

- **SJF** — mesma `duration`. **SRTF** — mesmo `remainingTime`. **As duas
  prioridades** — mesma `staticPriority`. Nos algoritmos preemptivos, a regra (i)
  garante que um empate nunca tira a CPU do processo em execução, então nunca causa
  troca de contexto.
- **FCFS e os dois Round-Robin — dois processos diferentes nunca empatam**
  (`areTied` devolve `first === second`). Processos criados no mesmo instante são
  ordenados pela ordem da entrada. É o que faz o próprio diagrama de tempo do
  enunciado: P1 e P2 são criados em t=0 e P1 executa primeiro. Se fossem tratados
  como empatados, a regra (ii) colocaria P2 primeiro (é mais curto), o que
  contradiria esse diagrama.
- **O Round-Robin precisa de uma ordem total também por outro motivo.** Se o
  processo que acabou de esgotar seu quantum pudesse empatar com o próximo da fila,
  a regra (i) devolveria a CPU a ele toda vez e o rodízio pararia.

## 6. Escala de prioridades e envelhecimento

### 6.1 Convenção: menor número = maior prioridade

O enunciado diz apenas que a escala de prioridades é positiva. A equipe adotou a
convenção do Unix/Linux (como no `nice`): **menor número significa maior
prioridade**. No exemplo do enunciado (`0 5 2`, `0 2 3`, `1 4 1`, `3 3 4`), P3
(prioridade 1) é o mais prioritário e P4 (prioridade 4) o menos.

No código:

- as políticas por prioridade ordenam a prioridade em ordem crescente;
- o parser rejeita prioridades `<= 0`, já que a escala é positiva
  (`src/engine/parser.ts`).

A convenção vale para os três algoritmos que usam prioridade.

### 6.2 Envelhecimento (Round-Robin com prioridade e envelhecimento)

O enunciado exige duas coisas deste algoritmo: o envelhecimento ocorre **a cada
quantum** e **não há preempção por prioridade**. Em `RoundRobinPriorityPolicy`
(`src/engine/policies/round_robin_priority.ts`):

- **Seleção.** Os processos prontos são ordenados por `dynamicPriority` (crescente);
  entre prioridades iguais, pela posição na fila circular, de modo que processos de
  mesma prioridade continuam se revezando.
- **A cada quantum → `onSliceEnd`.** O envelhecimento fica em `onSliceEnd`, que o
  laço só chama ao fim de uma fatia de tempo. Uma fatia encerrada antes porque o
  processo terminou também conta, já que a CPU é reavaliada nesse ponto como ao fim
  de um quantum completo.
- **O que acontece ao fim de uma fatia:**
  - todo processo pronto **exceto** o que foi atendido tem `aging` **subtraído** da
    sua `dynamicPriority`. Subtrair o aproxima do topo, por causa da escala
    invertida;
  - o processo atendido tem sua `dynamicPriority` restaurada para a
    `staticPriority` e vai para o fim da fila.
- **Sem preempção por prioridade → `preemptive = false`.** Um processo na CPU
  termina sua fatia mesmo que outro atinja uma prioridade maior no meio dela. Só o
  fim do quantum (`usesQuantum = true`) retira a CPU.

Duas escolhas que merecem explicação:

- **Sem piso para a prioridade dinâmica.** Ela pode chegar a zero ou a valores
  negativos. Um piso em 1 faria todo processo que esperou o bastante empatar de novo
  em 1, o que enfraquece a garantia contra *starvation* que o envelhecimento existe
  para dar.
- **A restauração acontece quando o processo devolve a CPU, e não quando a recebe.**
  O resultado é o mesmo, porque `dynamicPriority` não é consultada enquanto o
  processo está com a CPU, e `onSliceEnd` é o único gancho que a interface oferece.

O envelhecimento é o que resolve o *starvation* permitido pelo algoritmo de
prioridade com preempção: lá, só com prioridades estáticas, um processo de baixa
prioridade pode esperar indefinidamente enquanto processos mais prioritários
continuam chegando.

## 7. A fila de prontos do Round-Robin

A interface `SchedulingPolicy` entrega à política o conjunto de prontos do instante
atual, sempre na ordem da entrada; ela não tem noção de "quem é o próximo da fila".
Para os dois Round-Robin, a ordem circular é, portanto, estado que a política
precisa manter. Esse estado fica em `CircularQueue`
(`src/engine/policies/circular_queue.ts`), uma classe separada porque os dois
Round-Robin precisam exatamente da mesma fila.

Cada processo na fila tem um número de posição; quanto menor, mais perto da CPU. A
cada chamada de `sort()` a fila é sincronizada com o conjunto de prontos em três
passos, nesta ordem:

1. **saída** — processos que não estão mais prontos (terminaram) são removidos;
2. **entrada** — processos recém-criados são adicionados, ordenados por instante de
   criação e depois pela ordem da entrada;
3. **fim da fila** — o processo cuja fatia terminou é recolocado no fim.

Decisões deste desenho:

- **Os recém-chegados são ordenados, e não adicionados na ordem em que aparecem.**
  `sort()` só roda quando a CPU é reavaliada, então vários processos podem ter sido
  criados entre duas chamadas.
- **Um processo criado no mesmo instante em que outro esgota seu quantum entra na
  frente dele** (passo 2 antes do passo 3). É a convenção clássica do Round-Robin:
  quem devolve a CPU vai para o fim de uma fila que já inclui os recém-chegados.
  Para isso, `onSliceEnd` apenas *marca* o processo (`markSliceEnd`); a
  movimentação de fato acontece no próximo `sync()`, depois que os recém-chegados
  foram admitidos.
- **Chaveada pelo objeto `Process`, e não pelo id.** Cada chamada de `simulate()`
  cria novos objetos `Process`, então, se uma instância de política for reutilizada
  em uma segunda simulação, as entradas antigas são descartadas no primeiro `sync`
  em vez de se misturarem às novas. Ainda assim, `availablePolicies()` devolve
  instâncias novas a cada chamada, e esse é o uso pretendido.

Com o exemplo do enunciado e `quantum:2`, `RoundRobinPolicy` reproduz linha a linha
o diagrama de tempo impresso no enunciado (verificado por `round_robin.test.ts` e
executando o CLI sobre `exemplos/`).

## 8. Métricas

As métricas são calculadas por `calculateMetrics()` (`src/engine/metrics.ts`)
**apenas a partir da linha do tempo**. Nenhum algoritmo conta nada por conta própria,
e o cálculo não depende do estado que as políticas alteram durante o laço. Os sete
algoritmos passam pelo mesmo cálculo, que lê os mesmos dados que o diagrama mostra.

Por processo:

- **Tempo de vida (turnaround)** = término − criação, em que o término é o fim do
  último segundo em que o processo executou (`instant + 1` da sua última fatia).
- **Tempo de espera** = número de segundos em que o processo aparece em `ready`.
  É uma leitura da linha do tempo independente da do turnaround; a suíte de testes
  verifica que as duas batem pela identidade `waitingTime === turnaroundTime − duration`.
- **Tempo de resposta** = primeiro segundo de execução − criação.

Por algoritmo, as médias do tempo de vida (tt) e do tempo de espera (tw), além de:

- **Trocas de contexto** = número de vezes em que o processo na CPU muda de um
  processo para outro. Segundos ociosos são ignorados e não zeram o ocupante
  anterior, então: o primeiro processo a executar não conta como troca (não há
  contexto anterior a salvar), e ir do processo A para um intervalo ocioso e depois
  para o processo B conta como uma troca.

## 9. Leitura da entrada e da configuração

Os dois parsers ficam em `src/engine/parser.ts`.

**Processos (`parseProcesses`)** — um processo por linha, três inteiros separados
por um ou mais caracteres de espaço em branco: instante de criação, duração,
prioridade estática.

- Linhas vazias são ignoradas; as linhas têm os espaços das pontas removidos.
- Cada campo precisa casar com um padrão de número inteiro. `Number()` sozinho não
  foi usado porque aceita silenciosamente valores como `"1.5"`.
- Validação: criação `>= 0`, duração `> 0`, prioridade `> 0` (escala positiva).
- **A ordem original é preservada**, mesmo quando a entrada não está ordenada por
  instante de criação, porque é essa ordem que numera os processos P1, P2, …
- As mensagens de erro dizem qual linha está errada e o que era esperado.

**Configuração (`parseConfiguration`)** — o formato `chave:valor` do enunciado
(`quantum:2`, `aging:1`).

- Chaves ausentes assumem `quantum:2` e `aging:1`, o exemplo do enunciado. O CLI
  imprime um aviso na stderr quando nenhum `--config` é informado.
- Linhas em branco, linhas iniciadas por `#` e chaves desconhecidas são ignoradas;
  as chaves não diferenciam maiúsculas de minúsculas.
- Validação: `quantum > 0`, `aging >= 0`.

As mensagens de erro estão em português porque são exibidas ao usuário, como o
restante da saída do programa.

## 10. Um motor para o CLI e a interface web

`src/engine/index.ts` é o único ponto de entrada público do motor. Ele exporta os
parsers, `simulate()`, os tipos e `availablePolicies()`. As duas interfaces importam
apenas dele.

### 10.1 CLI

`npm run cli -- --config exemplos/config.txt < exemplos/entrada-exemplo.txt`

- `main.ts` lê a stdin, resolve a configuração e imprime o relatório. Qualquer erro
  é escrito na stderr, com código de saída 1.
- `report.ts` executa **todas as políticas devolvidas por `availablePolicies()`** e
  imprime, para cada uma, as quatro informações exigidas pelo enunciado, na ordem em
  que ele as lista: tt, tw, trocas de contexto, diagrama de tempo. O CLI não tem uma
  lista própria de algoritmos.
- `diagram.ts` imprime o diagrama vertical a partir da linha do tempo: `##` = na CPU,
  `--` = pronto, vazio = ainda não criado ou já encerrado. A largura do rótulo de
  tempo e de cada coluna é calculada a partir dos dados em vez de fixada em dois
  caracteres, porque o enunciado avisa que outras entradas podem ser usadas: com dez
  ou mais processos ou instantes de três dígitos, as colunas continuam alinhadas.

### 10.2 Interface web

A interface web (Next.js + React) importa o mesmo motor pelo alias de caminho `@/`
(`@/engine`).

- `input_model.ts` transforma o formulário em texto no mesmo formato da stdin e o
  valida com o **mesmo parser**, então a interface aplica as mesmas regras e mostra
  as mesmas mensagens de erro que o CLI.
- `evaluate()` executa **todos** os algoritmos de uma vez, também via
  `availablePolicies()`. Isso é proposital: empates podem ser resolvidos por sorteio,
  então simular separadamente o algoritmo selecionado e a tabela de comparação
  poderia mostrar dois resultados diferentes para a mesma entrada.
- `diagram_model.ts` apenas reindexa a linha do tempo em uma linha por processo para
  o diagrama horizontal. Ele não toma nenhuma decisão de escalonamento, então o
  diagrama web mostra os mesmos dados que o do CLI.
- A simulação roda no navegador, e a primeira execução acontece depois que o
  componente é montado (`useEffect`), e não durante a renderização no servidor. O
  motivo é, de novo, o desempate aleatório: um resultado calculado no servidor
  poderia diferir do calculado no navegador, e o React acusaria uma divergência de
  hidratação (*hydration mismatch*).

### 10.3 Por que essa divisão funciona

O motor é TypeScript puro, sem dependências de runtime e sem E/S, então o mesmo
código roda no Node (CLI, via `tsx`) e no navegador (Next.js). Com isso, um algoritmo
é implementado e testado uma única vez, e as duas interfaces mostram exatamente o que
o motor calculou.

## 11. Testes

A suíte usa Vitest (`npm test`). No momento em que este documento foi escrito, ela
tem 106 testes, todos passando. Ela cobre:

- `parser.test.ts` — leitura da entrada e da configuração, incluindo entradas
  inválidas;
- `simulator.test.ts` — como o laço trata a fatia do quantum;
- `metrics.test.ts` — as métricas, a identidade
  `waitingTime === turnaroundTime − duration` e a contagem de trocas de contexto;
- um arquivo de teste por grupo de algoritmos (`workstream_a_algorithms.test.ts`
  para FCFS, SJF e SRTF; `non_preemptive_priority.test.ts`,
  `preemptive_priority.test.ts`, `round_robin.test.ts`,
  `round_robin_priority.test.ts`). A regra de desempate é testada aqui, por meio dos
  algoritmos: manter o processo atual em um empate, desempatar pelo menor tempo
  restante e recorrer ao sorteio com um `RandomPicker` fixo;
- `src/cli/__tests__/` — formatação do relatório e layout do diagrama;
- `src/ui/__tests__/` e `src/ui/hero/__tests__/` — os modelos de visão puros da
  interface web.
