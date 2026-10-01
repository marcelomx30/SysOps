"""
Cena do Manim para o vídeo do simulador de escalonamento.

A cena **não implementa escalonamento**: ela lê `dados.json`, que é a saída
real de `simular()` em TypeScript. É isso que garante que o vídeo mostre o
algoritmo do trabalho, e não uma animação ilustrativa — se o motor mudar,
basta reexportar e rerenderizar.

Uso:
    uv run --python 3.12 --with manim manim -qh video/cena.py Escalonamento
"""

import json
from pathlib import Path

import numpy as np
from manim import (
    DOWN,
    PI,
    RIGHT,
    UP,
    Circle,
    Create,
    Arrow,
    FadeIn,
    FadeOut,
    Rectangle,
    Rotate,
    Scene,
    Text,
    VGroup,
    Write,
    config,
)

# Paleta oficial do Manim, a mesma da interface web (src/app/components/paleta.ts).
CORES = ["#58C4DD", "#FC6255", "#5CD0B3", "#F7D96F", "#9A72AC", "#83C167"]
CINZA = "#444444"
CLARO = "#BBBBBB"

# Off-white em vez de branco puro: o texto do canal lê como giz em quadro,
# não como slide. O mesmo vale para o fundo — o `custom_config.yml` do 3b1b
# declara preto, mas o que aparece nos vídeos publicados é um azul-marinho
# bem escuro, que cansa menos a vista em vídeo longo.
GIZ = "#ECECEC"
FUNDO = "#0E1525"

DADOS = json.loads((Path(__file__).parent / "dados.json").read_text())

config.background_color = FUNDO


def cor_do_processo(pid: int) -> str:
    """Cor estável de um processo, igual à da interface web."""
    return CORES[(pid - 1) % len(CORES)]


class Escalonamento(Scene):
    """Desenha cada algoritmo preenchendo sua linha do tempo segundo a segundo."""

    def construct(self) -> None:
        self.abertura()
        for indice, cena in enumerate(DADOS["cenas"]):
            # Só o primeiro algoritmo é construído devagar: depois dele o
            # espectador já sabe ler o diagrama, e repetir a explicação
            # cansaria. É a progressão de ritmo que o canal usa.
            # As métricas aparecem onde dizem algo novo: no primeiro, que as
            # apresenta, e nos round-robin, onde o salto de trocas é o ponto.
            mostra_metricas = indice == 0 or cena["algoritmo"].startswith("Round-Robin")
            self.desenhar_algoritmo(
                cena, ensinar=(indice == 0), com_metricas=mostra_metricas
            )
        self.fila_circular()

    def abertura(self) -> None:
        """
        Abre com o problema, não com o título.

        A ordem é a do canal: mostra a situação concreta primeiro — quatro
        processos querendo uma CPU só — e deixa a pergunta no ar antes de
        nomear o assunto.
        """
        # Quatro blocos coloridos disputando um retângulo central: a situação
        # inteira em uma imagem, antes de qualquer palavra.
        cpu = Rectangle(
            width=2.0, height=1.0, stroke_color=GIZ, stroke_width=2
        ).shift(DOWN * 1.6)
        rotulo_cpu = Text("CPU", font_size=24, color=GIZ).move_to(cpu)

        pedidos = VGroup()
        for i in range(4):
            bloco = Rectangle(
                width=0.85,
                height=0.55,
                stroke_width=0,
                fill_color=CORES[i],
                fill_opacity=1,
            )
            pedidos.add(bloco)
        pedidos.arrange(RIGHT, buff=0.45).shift(UP * 1.5)

        self.play(FadeIn(pedidos, shift=DOWN * 0.3), run_time=1.0)
        self.play(FadeIn(cpu), FadeIn(rotulo_cpu), run_time=0.8)

        # As setas convergindo mostram a disputa sem precisar dizê-la.
        # Cada seta mira um ponto diferente do topo da CPU: miradas no mesmo
        # ponto, as pontas viram um borrão.
        largura_cpu = cpu.get_width()
        setas = VGroup(
            *[
                Arrow(
                    start=b.get_bottom(),
                    end=cpu.get_top()
                    + np.array([(i - 1.5) / 3 * largura_cpu * 0.7, 0.0, 0.0]),
                    buff=0.18,
                    stroke_width=3,
                    max_tip_length_to_length_ratio=0.12,
                    color=CINZA,
                )
                for i, b in enumerate(pedidos)
            ]
        )
        self.play(FadeIn(setas), run_time=0.8)
        self.wait(1.0)

        pergunta = Text("Quem vai primeiro?", font_size=32, color=GIZ).shift(DOWN * 3.0)
        self.play(Write(pergunta), run_time=1.2)
        self.wait(1.6)

        self.play(
            FadeOut(pedidos),
            FadeOut(setas),
            FadeOut(cpu),
            FadeOut(rotulo_cpu),
            FadeOut(pergunta),
            run_time=0.8,
        )

    def desenhar_algoritmo(
        self, cena: dict, ensinar: bool = False, com_metricas: bool = True
    ) -> None:
        linha = cena["linhaDoTempo"]
        total = len(linha)
        ids = [p["id"] for p in DADOS["processos"]]

        nome = Text(
            cena["algoritmo"], font="CMU Serif", font_size=34, color=GIZ
        ).to_edge(UP, buff=0.6)
        self.play(FadeIn(nome), run_time=0.8)
        self.wait(0.5 if ensinar else 0.2)

        largura = 11.0 / total
        altura = 0.52
        x0 = -5.5
        y0 = 1.4

        # Rótulos P1..Pn e as trilhas de fundo, uma por processo.
        rotulos = VGroup()
        trilhas: dict[int, list[Rectangle]] = {}
        for i, pid in enumerate(ids):
            y = y0 - i * (altura + 0.22)
            rot = Text(f"P{pid}", font="CMU Serif", font_size=24, color=cor_do_processo(pid))
            rot.move_to([x0 - 0.55, y, 0])
            rotulos.add(rot)

            celulas = []
            for t in range(total):
                cel = Rectangle(
                    width=largura * 0.9,
                    height=altura,
                    stroke_width=1,
                    stroke_color="#1E2A3E",
                    fill_color="#141C2E",
                    fill_opacity=1,
                )
                cel.move_to([x0 + (t + 0.5) * largura, y, 0])
                celulas.append(cel)
            trilhas[pid] = celulas
            self.add(*celulas)

        self.play(FadeIn(rotulos), run_time=0.6)

        # Antes do primeiro bloco, explica o que cada preenchimento significa.
        # "Geometria antes da álgebra": o espectador vê a forma e só depois
        # recebe o nome dela.
        if ensinar:
            self.wait(0.6)
            legenda_exec = self.legenda_de_amostra(
                CORES[0], 1.0, "ocupando o processador", y=-2.3, x=-3.4
            )
            self.play(FadeIn(legenda_exec), run_time=0.7)
            self.wait(1.2)
            legenda_pronto = self.legenda_de_amostra(
                CORES[0], 0.22, "pronto, esperando a vez", y=-2.3, x=0.9
            )
            self.play(FadeIn(legenda_pronto), run_time=0.7)
            self.wait(1.4)
        else:
            legenda_exec = legenda_pronto = None

        # Preenche segundo a segundo: é aqui que o dado real do motor aparece.
        # O primeiro algoritmo avança devagar o bastante para acompanhar a
        # decisão; os demais correm, porque a leitura já foi ensinada.
        ritmo = 0.55 if ensinar else 0.26
        for t, fatia in enumerate(linha):
            animacoes = []
            executando = fatia["executando"]

            if executando is not None:
                cel = trilhas[executando][t]
                animacoes.append(
                    cel.animate.set_fill(cor_do_processo(executando), opacity=1).set_stroke(
                        cor_do_processo(executando), width=2
                    )
                )

            # Quem está pronto mas não executa aparece esmaecido — o '--' do enunciado.
            for pid in fatia["prontos"]:
                cel = trilhas[pid][t]
                animacoes.append(
                    cel.animate.set_fill(cor_do_processo(pid), opacity=0.22).set_stroke(
                        cor_do_processo(pid), width=1
                    )
                )

            if animacoes:
                self.play(*animacoes, run_time=ritmo)

            # Pausa no instante da primeira troca de contexto: é a ideia que o
            # vídeo precisa deixar assentar, então ela ganha um tempo morto.
            if ensinar and t > 0:
                anterior = linha[t - 1]["executando"]
                if anterior is not None and executando is not None and anterior != executando:
                    self.wait(0.9)

        if legenda_exec is not None:
            self.play(FadeOut(legenda_exec), FadeOut(legenda_pronto), run_time=0.5)

        # O resultado fica parado antes das métricas: sem essa pausa, o
        # espectador lê os números sem ter visto o desenho inteiro.
        self.wait(1.2 if ensinar else 0.6)
        if com_metricas:
            self.mostrar_metricas(cena)

        self.play(
            *[FadeOut(c) for cels in trilhas.values() for c in cels],
            FadeOut(rotulos),
            FadeOut(nome),
            run_time=0.7,
        )

    def legenda_de_amostra(
        self, cor: str, opacidade: float, texto: str, y: float, x: float
    ) -> VGroup:
        """Amostra colorida + rótulo, para explicar a notação do diagrama."""
        amostra = Rectangle(
            width=0.5,
            height=0.32,
            stroke_width=2 if opacidade >= 1.0 else 1,
            stroke_color=cor if opacidade >= 1.0 else "#1E2A3E",
            fill_color=cor,
            fill_opacity=opacidade,
        )
        rotulo = Text(texto, font_size=19, color=CLARO).next_to(amostra, RIGHT, buff=0.25)
        return VGroup(amostra, rotulo).move_to([x, y, 0])

    def mostrar_metricas(self, cena: dict) -> None:
        """As três métricas que o enunciado exige na saída."""
        itens = [
            ("tempo médio de vida", f"{cena['turnaroundMedio']:.2f}", CORES[0]),
            ("tempo médio de espera", f"{cena['esperaMedia']:.2f}", CORES[3]),
            ("trocas de contexto", str(cena["trocasDeContexto"]), CORES[1]),
        ]

        grupo = VGroup()
        for rotulo, valor, cor in itens:
            bloco = VGroup(
                Text(rotulo, font_size=19, color=CLARO),
                Text(valor, font="CMU Serif", font_size=40, color=cor),
            ).arrange(DOWN, buff=0.18)
            grupo.add(bloco)

        grupo.arrange(RIGHT, buff=1.4).to_edge(DOWN, buff=0.9)
        self.play(FadeIn(grupo, shift=UP * 0.25), run_time=0.8)
        self.wait(1.8)
        self.play(FadeOut(grupo), run_time=0.5)

    def fila_circular(self) -> None:
        """
        A fila circular do Round-Robin.

        Mescla a narrativa do canal com a didática: a cena faz uma pergunta,
        constrói o anel peça por peça, roda **uma** volta devagar explicando
        cada passo, e só então acelera — quando o espectador já sabe ler o
        movimento. O ritmo carrega a explicação em vez de substituí-la.

        A rotação em si é ilustrativa — mostra a estrutura da fila. A execução
        real do Round-Robin aparece nas cenas de diagrama, essas sim lidas do
        motor, onde as 7 trocas de contexto contrastam com as 3 do FCFS.
        """
        ids = [p["id"] for p in DADOS["processos"]]
        raio = 1.7
        centro = np.array([-3.4, -0.4, 0.0])

        # --- 1. A pergunta que a cena responde -------------------------------
        # Os algoritmos anteriores deixaram P4 esperando até o fim; é desse
        # problema concreto que o Round-Robin nasce.
        pergunta = Text("E se ninguém pudesse monopolizar a CPU?", font_size=30, color=GIZ)
        self.play(Write(pergunta), run_time=1.4)
        self.wait(1.5)
        self.play(FadeOut(pergunta), run_time=0.6)

        titulo = Text("Round-Robin", font="CMU Serif", font_size=38, color=GIZ)
        titulo.to_edge(UP, buff=0.6)
        self.play(FadeIn(titulo), run_time=0.7)
        self.wait(0.4)

        # --- 2. O anel se forma peça por peça --------------------------------
        anel = Circle(radius=raio, stroke_color=CINZA, stroke_width=2).move_to(centro)
        self.play(Create(anel), run_time=1.0)

        nos = VGroup()
        posicoes = []
        for i, pid in enumerate(ids):
            ang = PI / 2 - i * (2 * PI / len(ids))
            pos = centro + np.array([raio * np.cos(ang), raio * np.sin(ang), 0.0])
            posicoes.append(pos)
            no = VGroup(
                Circle(
                    radius=0.34,
                    stroke_color=cor_do_processo(pid),
                    stroke_width=3,
                    fill_color=FUNDO,
                    fill_opacity=1,
                ),
                Text(f"P{pid}", font="CMU Serif", font_size=22, color=cor_do_processo(pid)),
            ).move_to(pos)
            nos.add(no)

        # Um de cada vez: o espectador vê a fila sendo montada, não pronta.
        for no in nos:
            self.play(FadeIn(no, scale=0.7), run_time=0.3)
        self.wait(0.6)

        legenda_fila = Text(
            "todos na fila, em círculo", font_size=21, color=CLARO
        ).next_to(anel, DOWN, buff=0.45)
        self.play(FadeIn(legenda_fila), run_time=0.6)
        self.wait(1.2)
        self.play(FadeOut(legenda_fila), run_time=0.4)

        # --- 3. O quantum: a fatia de tempo que cada um recebe ---------------
        quantum = DADOS["config"]["quantum"]
        rotulo_quantum = Text(
            f"cada um roda por {quantum}s — o quantum", font_size=22, color=CORES[3]
        ).next_to(anel, DOWN, buff=0.45)
        self.play(FadeIn(rotulo_quantum), run_time=0.7)
        self.wait(1.4)

        ponteiro = Arrow(
            start=centro, end=posicoes[0], buff=0.38, stroke_width=5, color=CORES[3]
        )
        self.play(FadeIn(ponteiro), run_time=0.5)
        self.wait(0.8)
        self.play(FadeOut(rotulo_quantum), run_time=0.4)

        # --- 4. A tira linear: para onde a rotação vai -----------------------
        largura = 0.58
        altura = 0.5
        tira_x = 1.0
        tira_y = -0.4

        rotulo_tira = Text("linha do tempo", font_size=20, color=CLARO)
        rotulo_tira.move_to([tira_x + 1.6, tira_y + 0.85, 0])
        self.play(FadeIn(rotulo_tira), run_time=0.5)

        voltas = 2
        blocos = []
        total_passos = len(ids) * voltas

        for passo in range(total_passos):
            indice = passo % len(ids)
            pid = ids[indice]
            # A primeira volta é explicada; a segunda corre, porque a essa
            # altura o movimento já se explica sozinho.
            primeira_volta = passo < len(ids)
            giro = 0.75 if primeira_volta else 0.3
            pouso = 0.5 if primeira_volta else 0.22

            self.play(
                Rotate(ponteiro, angle=-2 * PI / len(ids), about_point=centro),
                nos[indice][0].animate.set_stroke(width=7),
                run_time=giro,
            )

            bloco = Rectangle(
                width=largura * 0.9,
                height=altura,
                stroke_width=2,
                stroke_color=cor_do_processo(pid),
                fill_color=cor_do_processo(pid),
                fill_opacity=1,
            ).move_to([tira_x + passo * largura, tira_y, 0])
            blocos.append(bloco)

            self.play(
                FadeIn(bloco, shift=RIGHT * 0.15),
                nos[indice][0].animate.set_stroke(width=3),
                run_time=pouso,
            )

            # Pausa ao fechar a primeira volta: é o instante em que a ideia
            # "deu a volta inteira e ninguém ficou de fora" fica visível.
            if passo == len(ids) - 1:
                self.wait(0.5)
                volta_completa = Text(
                    "deu a volta — ninguém ficou de fora", font_size=21, color=CLARO
                ).next_to(anel, DOWN, buff=0.45)
                self.play(FadeIn(volta_completa), run_time=0.6)
                self.wait(1.6)
                self.play(FadeOut(volta_completa), run_time=0.4)

        self.wait(0.8)

        # --- 5. A ideia que fica ---------------------------------------------
        fecho = Text(
            "a fila dá a volta; o tempo, não", font_size=26, color=GIZ
        ).move_to([0.8, -3.0, 0])
        self.play(Write(fecho), run_time=1.2)
        self.wait(2.0)

        # --- 6. O preço do rodízio -------------------------------------------
        # O contraste com o FCFS é o fecho honesto da ideia: o rodízio é mais
        # justo, mas troca de contexto custa. O número vem do motor.
        rr = next(
            (c for c in DADOS["cenas"] if c["algoritmo"].startswith("Round-Robin with quantum")),
            None,
        )
        fcfs = next((c for c in DADOS["cenas"] if c["algoritmo"].startswith("FCFS")), None)
        if rr is not None and fcfs is not None:
            custo = Text(
                f"{rr['trocasDeContexto']} trocas de contexto, "
                f"contra {fcfs['trocasDeContexto']} do FCFS — justiça custa",
                font_size=19,
                color=CINZA,
            ).move_to([0.8, -3.7, 0])
            self.play(FadeIn(custo), run_time=0.7)
            self.wait(2.4)
        else:
            custo = None

        self.play(
            FadeOut(anel),
            FadeOut(nos),
            FadeOut(ponteiro),
            FadeOut(rotulo_tira),
            *[FadeOut(b) for b in blocos],
            FadeOut(titulo),
            FadeOut(fecho),
            *([FadeOut(custo)] if custo is not None else []),
            run_time=1.0,
        )
