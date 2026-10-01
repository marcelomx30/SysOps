const VIDEO = '/video/escalonamento.mp4';
const POSTER = '/video/escalonamento-poster.jpg';

/**
 * The page's opening: a Manim walkthrough of the seven algorithms.
 *
 * The clip is generated from this very engine — `video/exportar.ts` runs
 * `simulate()` over the assignment's example and writes `video/dados.json`,
 * which the Manim scene draws — so its blocks and figures are the same ones
 * the simulator below computes, not hand-written values.
 *
 * Served from `public/` rather than embedded from a video host so the
 * presentation keeps working without network access.
 */
export function AlgorithmVideo() {
  return (
    <header className="intro">
      <div className="intro-inner">
        <p className="eyebrow">Sistemas Operacionais · UFC</p>
        <h1>Escalonamento de Processos</h1>
        <p className="intro-lead">
          Sete algoritmos disputando um processador. Veja cada um decidir, e depois
          rode você mesmo no simulador.
        </p>
        {/* No autoplay: during the presentation the video starts when the
            presenter decides, not when the page loads. */}
        <video
          className="algorithm-video"
          controls
          preload="metadata"
          poster={POSTER}
          playsInline
        >
          <source src={VIDEO} type="video/mp4" />
          Seu navegador não reproduz vídeo HTML5.
        </video>
        <a className="intro-skip" href="#simulador">
          Ir para o simulador ↓
        </a>
      </div>
    </header>
  );
}
