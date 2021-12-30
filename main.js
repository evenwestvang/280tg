import './style.css'

document.querySelector('#app').innerHTML = `
  <h1>Hello Vite!</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`

import SceneKeeper from "./src/SceneKeeper";

let sceneKeeper;

document.getElementById("app").innerHTML = `
<h1>Scroll me</h1>
<div>
</div>
<canvas id="canvas"/>
`;

if (webglSupport()) {
  sceneKeeper = new SceneKeeper();
  tick();
}

function tick() {
  sceneKeeper.tick(false);
  window.requestAnimationFrame(tick);
}

function webglSupport() {
  try {
    const canvas = document.createElement("canvas");
    return (
      !!window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (err) {
    return false;
  }
}
