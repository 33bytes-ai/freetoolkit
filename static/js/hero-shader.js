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
    "  vec3 color = vec3(0.0);",
    "  for (int j = 0; j < 3; j++) {",
    "    for (int i = 0; i < 5; i++) {",
    "      color[j] += lw * float(i * i) / abs(",
    "        fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0",
    "        - length(uv)",
    "        + mod(uv.x + uv.y, 0.2)",
    "      );",
    "    }",
    "  }",
    "  gl_FragColor = vec4(color[0], color[1], color[2], 1.0);",
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

  function resize() {
    var hero = canvas.parentElement;
    canvas.width = hero ? hero.offsetWidth : window.innerWidth;
    canvas.height = hero ? hero.offsetHeight : window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  var t = 1.0;
  var raf;
  function render() {
    t += 0.05;
    gl.uniform1f(timeLoc, t);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(render);
  }

  // Pause when not visible to save CPU
  var observer = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      render();
    } else {
      cancelAnimationFrame(raf);
    }
  }, { threshold: 0 });
  observer.observe(canvas);
})();
