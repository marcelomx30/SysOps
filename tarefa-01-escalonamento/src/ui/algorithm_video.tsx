const VIDEO = '/video/escalonamento.mp4';
const POSTER = '/video/escalonamento-poster.jpg';

/**
 * The Manim-rendered walkthrough of the seven algorithms.
 *
 * The clip is generated from this very engine: `video/exportar.ts` runs
 * `simulate()` over the assignment's example and writes `video/dados.json`,
 * which the Manim scene draws. The figures on screen are therefore the same
 * ones the simulator below computes, not hand-written values.
 *
 * Served from `public/` rather than embedded from a video host so the
 * presentation keeps working without network access.
 */
export function AlgorithmVideo() {
  return (
    <section id="video" className="page" aria-labelledby="video-title">
      <h2 id="video-title">Os sete algoritmos em vídeo</h2>
      <p className="hint">
        Gerado com Manim a partir do mesmo motor que roda no simulador abaixo — os
        blocos e as métricas são a execução real de cada algoritmo.
      </p>
      {/* No autoplay: during the presentation the video starts when the
          presenter decides, not when the page loads. */}
      <video className="algorithm-video" controls preload="metadata" poster={POSTER} playsInline>
        <source src={VIDEO} type="video/mp4" />
        Seu navegador não reproduz vídeo HTML5.
      </video>
    </section>
  );
}
