import { useEffect, useRef } from 'react';

export function useSplashScreenWebGL(canvasRef: React.RefObject<HTMLCanvasElement>, stage: 'splash' | 'main' | 'exiting') {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || (canvas as any).getContext('experimental-webgl');
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let animationFrame: number;

    if (gl) {
      const vs = `attribute vec3 aPos;attribute float aSize;attribute float aAlpha;uniform mat4 uMVP;uniform float uTime;varying float vAlpha;void main(){vec3 p=aPos;p.y+=sin(uTime*.8+aPos.x*3.)*.04;p.x+=cos(uTime*.6+aPos.z*2.)*.03;gl_Position=uMVP*vec4(p,1.);gl_PointSize=aSize*(1./(gl_Position.z+2.))*60.;vAlpha=aAlpha;}`;
      const fs = `precision mediump float;uniform vec3 uColor;varying float vAlpha;void main(){float d=distance(gl_PointCoord,vec2(.5));if(d>.5)discard;float a=(1.-d*2.)*vAlpha;gl_FragColor=vec4(uColor,a);}`;
      
      const mkS = (type: number, src: string) => {
        const sh = gl.createShader(type);
        if (!sh) return null;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return sh;
      };

      const prog = gl.createProgram();
      if (!prog) return () => { window.removeEventListener('resize', resizeCanvas); };
      
      const vsShader = mkS(gl.VERTEX_SHADER, vs);
      const fsShader = mkS(gl.FRAGMENT_SHADER, fs);
      if (!vsShader || !fsShader) return () => { window.removeEventListener('resize', resizeCanvas); };
      
      gl.attachShader(prog, vsShader);
      gl.attachShader(prog, fsShader);
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const N = 220;
      const pos = new Float32Array(N * 3);
      const sz = new Float32Array(N);
      const al = new Float32Array(N);

      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 3.5;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 2.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
        sz[i] = 0.3 + Math.random() * 1.4;
        al[i] = 0.15 + Math.random() * 0.55;
      }

      const mkB = (data: Float32Array, loc: number, size: number) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      };

      mkB(pos, gl.getAttribLocation(prog, 'aPos'), 3);
      mkB(sz, gl.getAttribLocation(prog, 'aSize'), 1);
      mkB(al, gl.getAttribLocation(prog, 'aAlpha'), 1);

      const uMVP = gl.getUniformLocation(prog, 'uMVP');
      const uTime = gl.getUniformLocation(prog, 'uTime');
      const uColor = gl.getUniformLocation(prog, 'uColor');

      const nr = (v: number[]) => { const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
      const sb = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      const cr = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const dt = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

      const mp = (fov: number, asp: number, n: number, f: number) => {
        const t = 1 / Math.tan(fov / 2);
        const nf = 1 / (n - f);
        return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
      };

      const ml = (eye: number[], c: number[], up: number[]) => {
        const z = nr(sb(eye, c));
        const x = nr(cr(up, z));
        const y = cr(z, x);
        return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dt(x, eye), -dt(y, eye), -dt(z, eye), 1]);
      };

      const mm = (a: Float32Array, b: Float32Array) => {
        const r = new Float32Array(16);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          let s = 0; for (let k = 0; k < 4; k++) s += a[i + k * 4] * b[k + j * 4]; r[i + j * 4] = s;
        }
        return r;
      };

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.clearColor(0, 0, 0, 0);

      const t0 = performance.now();
      const draw = () => {
        if (stage === 'splash') {
          animationFrame = requestAnimationFrame(draw);
          return;
        }
        resizeCanvas();
        const t = (performance.now() - t0) / 1000;
        gl.clear(gl.COLOR_BUFFER_BIT);
        const mvp = mm(mp(0.9, canvas.width / canvas.height, 0.1, 20), ml([Math.sin(t * .12) * .3, .1, 3.5], [0, 0, 0], [0, 1, 0]));
        gl.uniformMatrix4fv(uMVP, false, mvp);
        gl.uniform1f(uTime, t);
        gl.uniform3f(uColor, .98, .57, .24);
        gl.drawArrays(gl.POINTS, 0, N);
        animationFrame = requestAnimationFrame(draw);
      };
      draw();
    } else {
      // 2D Fallback
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return () => { window.removeEventListener('resize', resizeCanvas); };
      
      const c2 = ctx2d;
      const pts = Array.from({ length: 180 }, () => ({
        x: Math.random(), y: Math.random(), 
        vx: (Math.random() - 0.5) * 0.0003, vy: (Math.random() - 0.5) * 0.0003, 
        r: 1 + Math.random() * 3, a: 0.1 + Math.random() * 0.5
      }));
      const d2 = () => {
        if (stage === 'splash') {
          animationFrame = requestAnimationFrame(d2);
          return;
        }
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.offsetWidth;
          canvas.height = parent.offsetHeight;
        }
        c2.clearRect(0, 0, canvas.width, canvas.height);
        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > 1) p.vx *= -1;
          if (p.y < 0 || p.y > 1) p.vy *= -1;
          c2.beginPath(); c2.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
          c2.fillStyle = `rgba(251, 146, 60, ${p.a})`; c2.fill();
        });
        animationFrame = requestAnimationFrame(d2);
      };
      d2();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, [stage]);
}
