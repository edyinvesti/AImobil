import React, { useEffect, useRef, useState } from "react";
import { useSplashScreenAudio } from "../hooks/useSplashScreenAudio";
import { useSplashScreenWebGL } from "../hooks/useSplashScreenWebGL";
import "./SplashScreen.css";

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [stage, setStage] = useState<'splash' | 'main' | 'exiting'>('splash');
  const [typewriterStarted, setTypewriterStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  const { initAudio, playOpen, playKey, playEnter, playStartup } = useSplashScreenAudio();
  useSplashScreenWebGL(canvasRef as React.RefObject<HTMLCanvasElement>, stage);

  const startExp = () => {
    initAudio();
    playStartup();
    setStage('main');
    setTimeout(() => {
      playOpen(barsRef as React.RefObject<HTMLDivElement>);
      setTypewriterStarted(true);
    }, 600);
  };

  const enterApp = () => {
    playEnter();
    setStage('exiting');
    setTimeout(() => {
      onEnter();
    }, 1300);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (stage === 'splash') startExp();
        else if (stage === 'main') enterApp();
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [stage]);

  return (
    <div className="splash-root">
      <div className="root-inner">
        <div className={`splash ${stage !== 'splash' ? 'hide' : ''}`} onClick={startExp}>
          <div className="sp-ring" style={{ animationDelay: '0s' }}></div>
          <div className="sp-ring" style={{ animationDelay: '1.1s' }}></div>
          <div className="sp-ring" style={{ animationDelay: '2.2s' }}></div>
          <div className="sp-logo">
            <div className="sp-icon">
              <svg width="34" height="34" viewBox="0 0 110 110" fill="none">
                <path d="M55 8L100 48v52H10V48z" fill="none" stroke="#fff" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" opacity=".95" />
                <rect x="35" y="58" width="16" height="14" rx="3" fill="#fff" opacity=".9" />
                <rect x="59" y="58" width="16" height="14" rx="3" fill="#fff" opacity=".9" />
                <rect x="35" y="76" width="16" height="14" rx="3" fill="#fff" opacity=".9" />
                <rect x="59" y="76" width="16" height="14" rx="3" fill="#fff" opacity=".9" />
                <polygon points="55,1 62,11 48,11" fill="#fff" />
              </svg>
            </div>
            <div className="sp-brand">iAmobil</div>
          </div>
          <div className="sp-hint">▶ toque para entrar</div>
        </div>

        <div className={`main-view ${stage !== 'splash' ? 'show' : ''} ${stage === 'exiting' ? 'exit' : ''}`}>
          <canvas id="canvas3d" ref={canvasRef}></canvas>
          <div className="vignette"></div>

          <div className="content">
            <div className={`badge ${typewriterStarted ? 'show' : ''}`}>
              <div className="badge-dot"></div>
              <span className="badge-text">Goiás · Brasil</span>
            </div>

            <div className={`logo-row ${typewriterStarted ? 'show' : ''}`}>
              <div className="logo-icon">
                <svg width="40" height="40" viewBox="0 0 110 110" fill="none">
                  <path d="M55 8L100 48v52H10V48z" fill="none" stroke="#fff" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
                  <rect x="35" y="58" width="16" height="14" rx="3" fill="#fff" />
                  <rect x="59" y="58" width="16" height="14" rx="3" fill="#fff" />
                  <rect x="35" y="76" width="16" height="14" rx="3" fill="#fff" />
                  <rect x="59" y="76" width="16" height="14" rx="3" fill="#fff" />
                  <polygon points="55,1 62,11 48,11" fill="#fff" />
                </svg>
              </div>
              <div className="logo-texts">
                <div className="logo-name">
                  {"iAmobil".split('').map((char, i) => (
                    <TypewriterChar 
                      key={i} 
                      char={char} 
                      index={i} 
                      active={typewriterStarted} 
                      onComplete={i === 6 ? () => playKey(true) : () => playKey(false)}
                    />
                  ))}
                  <span className={`cursor ${typewriterStarted && stage === 'main' ? '' : 'off'}`}></span>
                </div>
                <div className={`logo-sub ${typewriterStarted ? 'show' : ''}`} style={{ transitionDelay: '1.2s' }}>Inteligência Imobiliária</div>
              </div>
            </div>

            <div className={`divider ${typewriterStarted ? 'show' : ''}`} style={{ transitionDelay: '1.5s' }}>
              <div className="div-line"></div>
              <div className="div-icon">⬡</div>
              <div className="div-line"></div>
            </div>

            <div className={`slogan ${typewriterStarted ? 'show' : ''}`} style={{ transitionDelay: '1.9s' }}>
              Sua <strong>carteira de imóveis</strong> com o poder de um<br />
              <span className="hl">robô de vendas 24h por dia</span>
            </div>

            <button 
              className={`btn-main ${typewriterStarted ? 'show' : ''}`} 
              style={{ transitionDelay: '2.3s' }}
              onClick={enterApp}
            >
              🔥 Acessar plataforma
            </button>
          </div>

          <div className="bars" ref={barsRef}>
            <div className="bar" style={{ animationDelay: '.00s' }}></div>
            <div className="bar" style={{ animationDelay: '.08s' }}></div>
            <div className="bar" style={{ animationDelay: '.16s' }}></div>
            <div className="bar" style={{ animationDelay: '.06s' }}></div>
            <div className="bar" style={{ animationDelay: '.12s' }}></div>
          </div>
          <div className="ver">v3.0 · iAmobil</div>
        </div>
      </div>
    </div>
  );
}

function TypewriterChar({ char, index, active, onComplete }: { char: string, index: number, active: boolean, onComplete: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        setShow(true);
        onComplete();
      }, 500 + index * 115);
      return () => clearTimeout(timer);
    }
  }, [active, index, onComplete]);

  return (
    <span className={`char orange ${show ? 'show' : ''}`}>
      {char}
    </span>
  );
}