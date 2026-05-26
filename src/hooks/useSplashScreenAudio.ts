import { useRef, useEffect } from 'react';

export function useSplashScreenAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const initAudio = () => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return;
    }
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  };

  const playStartup = () => {
    const actx = audioCtxRef.current;
    if (!actx) return;
    const t = actx.currentTime;

    // 1. Deep Sub Impact
    const sub = actx.createOscillator(), subG = actx.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(60, t); sub.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    subG.gain.setValueAtTime(0.4, t); subG.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    sub.connect(subG); subG.connect(actx.destination);
    sub.start(t); sub.stop(t + 0.5);

    // 2. Cinematic Whoosh (Filtered Noise)
    const bufSize = actx.sampleRate * 1.2;
    const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = actx.createBufferSource(), noiseF = actx.createBiquadFilter(), noiseG = actx.createGain();
    noise.buffer = buf;
    noiseF.type = 'bandpass'; noiseF.frequency.setValueAtTime(400, t); noiseF.frequency.exponentialRampToValueAtTime(2500, t + 0.8); noiseF.Q.value = 1.0;
    noiseG.gain.setValueAtTime(0, t); noiseG.gain.linearRampToValueAtTime(0.15, t + 0.2); noiseG.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
    noise.connect(noiseF); noiseF.connect(noiseG); noiseG.connect(actx.destination);
    noise.start(t); noise.stop(t + 1.2);

    // 3. Harmonic Shimmer Tones
    [440, 660, 880].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t + i * 0.05); o.frequency.exponentialRampToValueAtTime(f * 1.2, t + i * 0.05 + 0.6);
      g.gain.setValueAtTime(0, t + i * 0.05); g.gain.linearRampToValueAtTime(0.05, t + i * 0.05 + 0.1); g.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      o.connect(g); g.connect(actx.destination);
      o.start(t + i * 0.05); o.stop(t + 0.8);
    });
  };

  const playOpen = (barsRef: React.RefObject<HTMLDivElement>) => {
    const actx = audioCtxRef.current;
    if (!actx) return;
    const t = actx.currentTime;
    [[164.81, .11], [246.94, .09], [329.63, .08], [493.88, .07], [659.25, .05]].forEach(([f, v], i) => {
      const o = actx.createOscillator(), g = actx.createGain(), fl = actx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .5, t); o.frequency.linearRampToValueAtTime(f, t + .8);
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(300, t); fl.frequency.linearRampToValueAtTime(2500, t + 1.5); fl.Q.value = 1.5;
      g.gain.setValueAtTime(0, t + i * .15); g.gain.linearRampToValueAtTime(v * .6, t + i * .15 + .5); g.gain.linearRampToValueAtTime(v * .3, t + 4); g.gain.linearRampToValueAtTime(0, t + 7);
      o.connect(fl); fl.connect(g); g.connect(actx.destination); o.start(t + i * .15); o.stop(t + 8);
    });
    const sub = actx.createOscillator(), sg = actx.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(80, t); sub.frequency.linearRampToValueAtTime(40, t + .3);
    sg.gain.setValueAtTime(.15, t); sg.gain.linearRampToValueAtTime(0, t + .5);
    sub.connect(sg); sg.connect(actx.destination); sub.start(t); sub.stop(t + .6);
    
    if (barsRef.current) barsRef.current.classList.add('on');
    setTimeout(() => { if (barsRef.current) barsRef.current.classList.remove('on'); }, 6000);
  };

  const playKey = (isLast: boolean) => {
    const actx = audioCtxRef.current;
    if (!actx) return;
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
    o.type = isLast ? 'sine' : 'square'; o.frequency.value = isLast ? 880 : 180 + Math.random() * 220;
    f.type = 'lowpass'; f.frequency.value = isLast ? 3500 : 1200;
    g.gain.setValueAtTime(.04, t); g.gain.linearRampToValueAtTime(0, t + (isLast ? .25 : .06));
    o.connect(f); f.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + (isLast ? .3 : .08));
  };

  const playEnter = () => {
    const actx = audioCtxRef.current;
    if (!actx) return;
    const t = actx.currentTime;
    const buf = actx.createBuffer(1, actx.sampleRate * .6, actx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = actx.createBufferSource(); ns.buffer = buf;
    const nf = actx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.setValueAtTime(500, t); nf.frequency.exponentialRampToValueAtTime(4000, t + .5);
    const ng = actx.createGain(); ng.gain.setValueAtTime(.3, t); ng.gain.linearRampToValueAtTime(0, t + .6);
    ns.connect(nf); nf.connect(ng); ng.connect(actx.destination); ns.start(t);
    [220, 330, 440, 660, 880].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * .06); g.gain.linearRampToValueAtTime(.09, t + i * .06 + .04); g.gain.linearRampToValueAtTime(0, t + i * .06 + .5);
      o.connect(g); g.connect(actx.destination); o.start(t + i * .06); o.stop(t + i * .06 + .6);
    });
  };

  return { initAudio, playOpen, playKey, playEnter, playStartup };
}
