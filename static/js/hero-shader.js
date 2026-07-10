(function () {
  "use strict";

  var canvas = document.getElementById("hero-shader-canvas");
  if (!canvas) return;

  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) { canvas.style.display = "none"; return; }

  var VS = [
    "attribute vec2 aPos;",
    "void main() { gl_Position = vec4(aPos, 0.0, 1.0); }"
  ].join("\n");

  var FS = [
    "precision highp float;",
    "uniform vec2 resolution;",
    "uniform float time;",
    "void main(void) {",
    "  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);",
    "  float t = time * 0.05;",
    "  float lw = 0.002;",
    "  float intensity = 0.0;",
    "  for (int i = 0; i < 5; i++) {",
    "    intensity += lw * float(i * i) / abs(",
    "      fract(t + float(i) * 0.01) * 5.0",
    "      - length(uv)",
    "      + mod(uv.x + uv.y, 0.2)",
    "    );",
    "  }",
    // Tinted with the site's own accent blue (#2563eb) instead of independent
    // RGB channels -- the old per-channel phase offset is what produced the
    // rainbow effect that clashed with the rest of the (blue/neutral) page.
    "  vec3 tint = vec3(0.145, 0.388, 0.922);",
    "  gl_FragColor = vec4(intensity * tint, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s); return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VS);
  var fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { canvas.style.display = "none"; return; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = "none"; return; }

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  gl.useProgram(prog);
  var posLoc = gl.getAttribLocation(prog, "aPos");
  var timeLoc = gl.getUniformLocation(prog, "time");
  var resLoc = gl.getUniformLocation(prog, "resolution");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Render at a fraction of the on-screen size (canvas is CSS-scaled back up
  // to 100%) -- this is a per-pixel fragment shader, so the full-resolution
  // canvas was measured burning ~9s of main-thread time under Lighthouse's
  // throttled CPU, tanking the homepage performance score. Cutting the pixel
  // count this way is much cheaper than optimizing the shader math itself.
  var RENDER_SCALE = 0.2;
  var MAX_DIM = 360;
  function resize() {
    var hero = canvas.parentElement;
    var w = hero ? hero.offsetWidth : window.innerWidth;
    var h = hero ? hero.offsetHeight : window.innerHeight;
    canvas.width = Math.min(MAX_DIM, Math.max(1, Math.round(w * RENDER_SCALE)));
    canvas.height = Math.min(MAX_DIM, Math.max(1, Math.round(h * RENDER_SCALE)));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  // Random phase offset so the animation doesn't look identical on every
  // page load/visit -- otherwise every visitor sees the exact same opening
  // seconds of the pattern each time.
  var t = 1.0 + Math.random() * 200;
  var raf;
  var FRAME_INTERVAL = 1000 / 24; // this is a slow, ambient background -- 24fps is plenty
  var lastFrameTime = 0;
  function render(now) {
    raf = requestAnimationFrame(render);
    if (now - lastFrameTime < FRAME_INTERVAL) return;
    lastFrameTime = now;
    t += 0.05;
    gl.uniform1f(timeLoc, t);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function start() {
    // Pause when not visible to save CPU
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        render();
      } else {
        cancelAnimationFrame(raf);
      }
    }, { threshold: 0 });
    observer.observe(canvas);
  }

  // Defer the first frame until the page has settled so this decorative
  // background doesn't compete with the initial render/TTI.
  if ("requestIdleCallback" in window) {
    requestIdleCallback(start, { timeout: 2000 });
  } else {
    window.addEventListener("load", start);
  }
})();
