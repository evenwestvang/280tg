import * as THREE from "three";
import chroma from "chroma-js";

import BoxGeometry from "./BoxGeometry";

const LOWFPSWARN = 40;

export default class SceneKeeper {
  constructor() {
    this.scaling = 130;
    this.softTopValue = 0;
    this.lastSoftTopValue = -10;
    this.lastScrollDist = -10;
    this.orthoMultiplier = 0.45;
    this.scrollHint = true;

    this.offsetInitial = 0;
    this.offsetInitialD = 0;

    this.frameTimeStamp = new Date().getTime();
    this.avgFps = 60;

    this.initScene();
    window.addEventListener("resize", () => this.onWindowResize(), false);

    const partitioner = new Worker("./src/partitionWorker.js");
    console.info("Starting", partitioner);
    this.startPartitioningTime = new Date().getTime();
    partitioner.addEventListener(
      "message",
      (message) => this.handlePartitionDone(message),
      false
    );
    partitioner.postMessage({
      scaling: this.scaling
    });
  }

  handlePartitionDone(message) {
    if (message.data.command === "done") {
      const boxes = JSON.parse(message.data.resultCubes);

      this.boxGeometry = new BoxGeometry(this.scene);
      this.boxGeometry.enqueueBoxes(boxes);
      this.timeElapsed = new Date().getTime() - this.startPartitioningTime;
      console.info("Boxgeo is a thing");
    }
  }

  initScene() {
    this.canvas = document.getElementById("canvas");
    this.scene = new THREE.Scene();

    const height = this.scaling * this.orthoMultiplier;
    const width =
      this.scaling *
      this.orthoMultiplier *
      (window.innerWidth / window.innerHeight);
    this.camera = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      -1000,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setClearColor(0xebdfc8);
    this.renderer.context.getShaderInfoLog = () => {
      return "";
    }; // Squelch Safari error
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.targetRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
    this.currentRatio = this.targetRatio;
    this.renderer.setPixelRatio(this.targetRatio);
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const renderHeight = this.renderer.getSize().height;
    const windowHeight = window.innerHeight * 1.2;

    const renderWidth = this.renderer.getSize().width;
    const windowWidth = window.innerWidth;

    // If we have less than 30% diff just bail
    if (
      Math.abs(renderHeight - windowHeight) / windowHeight < 0.1 &&
      renderWidth === windowWidth
    ) {
      return;
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight * 1.2);
    this.tick(true);
  }

  // -6 -> 6 | (0.5 = )
  sigmoid(tval) {
    return 1 / (1 + Math.pow(Math.E, -tval));
  }

  scollProgress() {
    const range = document.body.clientHeight * 0.7;
    const animationRange = range;
    const normalizedDistance = this.softTopValue / range;
    const animationLength = animationRange / range;

    const animProgress = Math.sin(
      (Math.PI * normalizedDistance) / animationLength
    );

    return {
      normalizedDistance: normalizedDistance,
      animProgress: animProgress
    };
  }

  topDelta() {
    const top = window.scrollY;
    const delta = this.softTopValue - top;
    this.softTopValue -= delta / 10;
  }

  geometryCompleted() {
    if (window.scrollY > 0) {
      this.offsetInitial = 10;
      this.offsetInitialD = 0;
    }
  }

  tick(force) {
    const geometryBuilding = !this.boxGeometry || this.boxGeometry.appearing();
    const animatingIn = Math.abs(this.offsetInitial > 0.0001);
    const stillAnimating = geometryBuilding || animatingIn;

    if (window.tick % 100 === 0) {
      console.info("gotcha");
    }

    if (animatingIn) {
      this.offsetInitialD =
        (this.offsetInitialD - this.offsetInitial / 10) * 0.5;
      this.offsetInitial += this.offsetInitialD;
    }

    this.topDelta();

    // Check if the view is standing still and that we aren't animating in
    if (
      !force &&
      Math.abs(this.lastSoftTopValue - this.softTopValue) < 0.00001 &&
      !stillAnimating
    ) {
      this.lastSoftTopValue = this.softTopValue;
      return;
    }

    this.lastSoftTopValue = this.softTopValue;

    // Use value from last frame so that we don't glitch out
    const { animProgress, normalizedDistance } = this.scollProgress();

    // Don't render if we're invisible either. Use last frame value so we don't skip blank.
    // if (!force && normalizedDistance > 1.2 && !stillAnimating) {
    //   return
    // }

    // Camera handling
    let camWidth =
      this.scaling *
      this.orthoMultiplier *
      (window.innerWidth / window.innerHeight) *
      0.5;
    let camHeight = this.scaling * this.orthoMultiplier * 0.5;

    camWidth += camWidth * normalizedDistance * 14;
    camHeight += camHeight * normalizedDistance * 10;

    // Camera zoom
    this.camera.left = camWidth / -2;
    this.camera.right = camWidth / 2;
    this.camera.top = camHeight / 2;
    this.camera.bottom = camHeight / -2;

    const sig = this.sigmoid(normalizedDistance);
    this.camera.position.x =
      this.scaling * Math.sin((0.5 + normalizedDistance * 0.1) * Math.PI);
    this.camera.position.y = this.scaling + normalizedDistance * 0.5;
    this.camera.position.z =
      this.scaling * Math.sin((0.5 + normalizedDistance * 0.1) * Math.PI);

    // this.camera.lookAt(new THREE.Vector3(0, 0, 0))
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.updateProjectionMatrix();

    if (this.boxGeometry) {
      // Skip adaptive resolution when adding geometry. Sry.
      if (!this.boxGeometry.tick(animProgress, this.offsetInitial)) {
        this.adaptiveResolution();
        this.renderer.render(this.scene, this.camera);
      } else {
        this.geometryCompleted();
      }
    }
  }

  adaptiveResolution() {
    if (this.resolutionLowered) {
      return;
    }

    const timePerFrame = new Date().getTime() - this.frameTimeStamp;
    const fps = 1000 / timePerFrame;

    this.avgFps = this.avgFps - (this.avgFps - fps) / 10;

    if (this.avgFps < LOWFPSWARN) {
      this.resolutionLowered = true;
      this.currentRatio = this.currentRatio / 2;
      this.renderer.setPixelRatio(this.currentRatio);
    }

    this.frameTimeStamp = new Date().getTime();
  }
}
