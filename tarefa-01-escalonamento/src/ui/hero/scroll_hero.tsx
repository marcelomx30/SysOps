'use client';

import { useEffect, useRef, useState } from 'react';
import {
  HERO_ACTS,
  actStartProgress,
  activeActIndex,
  progressToTime,
  scrollProgress,
} from './hero_model';

const LANDSCAPE_VIDEO = '/hero/hero-horizontal.mp4';
const PORTRAIT_VIDEO = '/hero/hero-vertical.mp4';

/** Share of the remaining distance covered per frame; smooths out wheel steps. */
const EASING = 0.18;
/** Seeking on every frame is wasteful when the target moved less than this. */
const SEEK_THRESHOLD_SECONDS = 1 / 60;
/** Lands just inside an act when jumping to it, clear of float rounding at the boundary. */
const ACT_JUMP_NUDGE = 0.001;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Full-screen intro whose video is driven by the scroll position: the stage
 * stays pinned while the page scrolls through it, and the scroll progress
 * becomes the video's `currentTime` (the video never plays on its own).
 *
 * With reduced motion the video is not scrubbed; the stage shows the poster
 * and all five acts as plain text (see hero.css).
 */
export function ScrollHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeAct, setActiveAct] = useState(0);
  const [videoSource, setVideoSource] = useState<string | null>(null);

  useEffect(() => {
    const portrait = window.matchMedia('(orientation: portrait)');
    const choose = () => setVideoSource(portrait.matches ? PORTRAIT_VIDEO : LANDSCAPE_VIDEO);
    choose();
    portrait.addEventListener('change', choose);
    return () => portrait.removeEventListener('change', choose);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video || !videoSource) return;
    if (window.matchMedia(REDUCED_MOTION).matches) return;

    let target = 0;
    let shown = 0;
    let frame = 0;

    const step = () => {
      frame = 0;
      shown += (target - shown) * EASING;
      if (Math.abs(target - shown) < 0.0005) shown = target;
      const seconds = progressToTime(shown);
      if (Math.abs(video.currentTime - seconds) > SEEK_THRESHOLD_SECONDS) {
        video.currentTime = seconds;
      }
      setActiveAct(activeActIndex(seconds));
      if (shown !== target) frame = requestAnimationFrame(step);
    };

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      target = scrollProgress(rect.top, rect.height, window.innerHeight);
      if (!frame) frame = requestAnimationFrame(step);
    };

    // iOS Safari only decodes frames for seeking after the video has played once.
    const unlock = () => {
      video.play().then(() => video.pause()).catch(() => undefined);
      onScroll();
    };

    onScroll();
    video.addEventListener('loadedmetadata', unlock);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      video.removeEventListener('loadedmetadata', unlock);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [videoSource]);

  const jumpToAct = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const scrollable = section.offsetHeight - window.innerHeight;
    const top =
      section.getBoundingClientRect().top +
      window.scrollY +
      (actStartProgress(index) + ACT_JUMP_NUDGE) * scrollable;
    const smooth = !window.matchMedia(REDUCED_MOTION).matches;
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  };

  return (
    <section ref={sectionRef} className="hero" aria-label="Introdução ao escalonamento de processos">
      <div className="hero-stage">
        <video
          ref={videoRef}
          className="hero-video"
          src={videoSource ?? undefined}
          poster="/hero/poster-horizontal.jpg"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
        />
        <div className="hero-shade" />
        <a className="hero-skip" href="#simulador">Pular para o simulador</a>

        <ol className="hero-progress" aria-label="Atos da introdução">
          {HERO_ACTS.map((act, index) => (
            <li key={act.title}>
              <button
                type="button"
                className={index <= activeAct ? 'filled' : undefined}
                aria-label={`Ato ${index + 1}: ${act.title}`}
                aria-current={index === activeAct ? 'step' : undefined}
                onClick={() => jumpToAct(index)}
              />
            </li>
          ))}
        </ol>

        <div className="hero-copy">
          {HERO_ACTS.map((act, index) => (
            <article
              key={act.title}
              className={index === activeAct ? 'hero-act active' : 'hero-act'}
              aria-hidden={index !== activeAct}
            >
              <p className="hero-kicker">Ato {index + 1} de {HERO_ACTS.length}</p>
              <p className="hero-act-title">{act.title}</p>
              <p>{act.summary}</p>
              {index === HERO_ACTS.length - 1 && (
                <a className="hero-cta" href="#simulador" tabIndex={index === activeAct ? 0 : -1}>
                  Ir para o simulador
                </a>
              )}
            </article>
          ))}
        </div>

        <p className={activeAct === 0 ? 'hero-hint' : 'hero-hint hidden'} aria-hidden="true">
          Role para avançar
        </p>
      </div>
    </section>
  );
}
