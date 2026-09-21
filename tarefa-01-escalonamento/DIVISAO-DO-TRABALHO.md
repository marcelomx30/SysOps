# Divisão do trabalho — 3 pessoas

Todos os três trabalham no **core** (os algoritmos de escalonamento), porque todos
precisam defender o assunto na apresentação. Cada pessoa leva um **eixo conceitual**
diferente dos sete algoritmos, mais uma fatia periférica.

## Quem leva o quê

| | Eixo no core | Algoritmos | Periferia |
|---|---|---|---|
| 🔵 **Pessoa A** | Ordem de chegada e duração — não-preemptivo vs. preemptivo por tempo | FCFS (#5), SJF (#6), SRTF (#7) | Parser de entrada e config (#3) |
| 🟠 **Pessoa B** | Prioridade e o problema do *starvation* | Prioridade sem (#8) e com preempção (#9) | Interface web (#14, #15) |
| 🟢 **Pessoa C** | Fatiamento de tempo — quantum e envelhecimento | Round-Robin (#10), RR com aging (#11) | Métricas (#12), CLI (#13), deploy (#17) |
| 🟣 **Mob** | Contrato comum | — | Setup (#1), tipos (#2), laço + desempate (#4), documento final (#16) |

O encadeamento dos eixos conta uma história na apresentação: A mostra que decidir só por
tempo pode ser injusto → B mostra que prioridade resolve isso mas cria *starvation* →
C mostra que quantum + envelhecimento resolvem o *starvation*.

## Grafo de dependências

```
        #1 setup ──► #2 tipos ──┬──────────────► #3 parser (A) ──┐
         (mob)        (mob)     │                                │
                                │                                │
                                └──► #4 laço + desempate (mob)   │
                                          │                      │
             ┌────────────────────────────┼──────────────┐       │
             ▼                            ▼              ▼       │
      A: #5 FCFS               B: #8 prio s/ preemp   C: #10 RR  │
         #6 SJF                     │                     │      │
         #7 SRTF                    ▼                     ▼      │
             │                  #9 prio c/ preemp     #11 RR+aging
             │                      │                     │      │
             └──────────────────────┴─────────┬───────────┘      │
                                              ▼                  │
                                        #12 métricas (C)         │
                                              │                  │
                          ┌───────────────────┼──────────────────┘
                          ▼                   ▼
                   #14 web (B) ────► #13 CLI (C)
                          │
                          ├──► #15 animação (B)
                          └──► #17 deploy (C)

                     #16 documento (mob) ◄── tudo
```

## Ordem de execução

### Fase 0 — mob, bloqueia todo mundo
`#1` setup → `#2` tipos → `#4` laço e regra de desempate.

Os três juntos, na mesma sessão. É aqui que se define o **contrato** — os tipos de `#2`
e a assinatura da política de escalonamento de `#4`. Depois disso as três frentes não
precisam mais se coordenar. Vale gastar tempo aqui: um contrato mal definido custa
retrabalho nas três frentes.

### Fase 1 — três frentes em paralelo, sem colisão
| 🔵 A | 🟠 B | 🟢 C |
|---|---|---|
| #3 parser | #8 prioridade | #10 round-robin |
| #5 FCFS | #9 prio. c/ preempção | #11 RR + aging |
| #6 SJF | #14 interface web¹ | #12 métricas |
| #7 SRTF | | |

¹ B começa a UI com uma linha do tempo *mockada* (dado fixo no formato de `#2`), sem
esperar algoritmo nenhum ficar pronto. Quando os algoritmos chegarem, troca o mock pela
chamada real.

Cada pessoa mexe só nos seus arquivos: um arquivo por algoritmo em `src/engine/policies/`,
o parser em `src/engine/parser.ts`, a UI em `src/app/`. **Ninguém edita `#2` e `#4` nesta
fase** — se algo precisar mudar no contrato, avisa os outros dois antes.

### Fase 2 — integração
- `#13` CLI (C) — precisa dos 7 algoritmos e do parser
- `#15` animação e comparação (B) — precisa dos 7 algoritmos
- `#17` deploy (C) — precisa da UI

### Fase 3 — entrega
`#16` documento de decisões, em mob. Cada um escreve a seção do seu eixo; a parte de
estruturas de dados e padrões de projeto sai da discussão dos três, já que veio do mob da Fase 0.

## Convenções para não conflitar

- **Uma branch por issue**: `feat/5-fcfs`, `feat/14-interface-web`
- **Um arquivo por algoritmo** — assim dois algoritmos nunca colidem no mesmo arquivo
- **Ninguém commita direto na `main`** — PR com pelo menos 1 revisor das outras frentes
  (revisar o código dos outros é o que garante que todos entendam o core inteiro na apresentação)
- Mudou o contrato de `#2` ou `#4`? Avisa os outros dois **antes** de abrir o PR
