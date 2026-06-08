// Cycles through a list of words, "decoding" from one to the next with a glitch-scramble
// transition — the synthesis-engine motif in the hero. Pure rAF, no deps. Honors reduced motion.
import { useEffect, useState } from 'react';

const GLYPHS = '!<>-_\\/[]{}=+*^?#01·•';

export interface Scramble {
  text: string; // the live (possibly mid-decode) display string
  word: string; // the last fully-settled target word — safe to act on
}

export function useScramble(words: string[], holdMs = 1900, speed = 1.1): Scramble {
  const [text, setText] = useState(words[0] ?? '');
  const [word, setWord] = useState(words[0] ?? '');

  useEffect(() => {
    if (!words.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      let i = 0;
      setText(words[0]); setWord(words[0]);
      const id = setInterval(() => { i = (i + 1) % words.length; setText(words[i]); setWord(words[i]); }, holdMs);
      return () => clearInterval(id);
    }

    let raf = 0;
    let current = 0;
    let cancelled = false;

    type Slot = { from: string; to: string; start: number; end: number; glyph: string };

    function transition(from: string, to: string): Promise<void> {
      return new Promise((resolve) => {
        const len = Math.max(from.length, to.length);
        const slots: Slot[] = [];
        for (let i = 0; i < len; i++) {
          const start = Math.floor(Math.random() * 18);
          const end = start + 18 + Math.floor(Math.random() * 22);
          slots.push({ from: from[i] ?? '', to: to[i] ?? '', start, end, glyph: '' });
        }
        let frame = 0;
        const tick = () => {
          if (cancelled) return resolve();
          let out = '';
          let done = 0;
          for (const s of slots) {
            const t = frame - s.start;
            if (frame >= s.end) { out += s.to; done++; }
            else if (t < 0) { out += s.from; }
            else {
              if (!s.glyph || Math.random() < 0.28) s.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
              out += s.glyph;
            }
          }
          setText(out);
          if (done === slots.length) return resolve();
          frame += speed;
          raf = requestAnimationFrame(tick);
        };
        tick();
      });
    }

    async function loop() {
      while (!cancelled) {
        const next = (current + 1) % words.length;
        await transition(words[current], words[next]);
        current = next;
        setWord(words[current]);
        await new Promise<void>((r) => setTimeout(r, holdMs));
      }
    }
    loop();

    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [words, holdMs, speed]);

  return { text, word };
}
