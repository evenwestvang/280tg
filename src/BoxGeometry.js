import * as THREE from "three";

import { correctedPosition } from "./cubeFunctions";
import { fragment, vertex } from "./shaders.js";
import * as tome from "chromotome";

export default class BoxGeometry {
  constructor(scene) {
    this.scene = scene;
    this.SHRINKCUBE = 0.95;

    this.boxColors = tome.getRandom().colors;

    this.geometry = new THREE.Geometry();
    this.cubeShapeAxis = [];
    this.cubeSizes = [];

    this.boxQueue = [];
    this.stillAddingCubes = true;
    this.geometryAdded = false;
  }

  enqueueBoxes(boxes) {
    this.boxQueue = boxes;
  }

  tick(scrollDistance, initialOffset) {
    let addedGeometry = false;
    if (this.stillAddingCubes) {
      this.addCubeSlice();
    } else {
      if (!this.geometryAdded) {
        console.info("Done adding cubes");
        this.addGeometryToScene();
        this.geometryAdded = true;
        addedGeometry = true;
      }

      this.uniforms.time.value += 0.1;

      this.uniforms.scrollDistanceRaw.value = Math.min(0.8, scrollDistance);
      this.uniforms.scrollDistance.value = Math.min(
        0.8,
        scrollDistance + initialOffset
      );

      const clipScroll = Math.max(0, scrollDistance + initialOffset - 0.2);
      this.uniforms.scrollDistanceOffset.value =
        Math.pow(clipScroll * 0.05 + 1.0, 100.0) - 1.0;
    }
    return addedGeometry;
  }

  appearing() {
    return !this.geometryAdded;
  }

  addGeometryToScene() {
    const bufferGeometry = new THREE.BufferGeometry().fromGeometry(
      this.geometry
    );
    bufferGeometry.removeAttribute("color");
    bufferGeometry.removeAttribute("normal");
    bufferGeometry.removeAttribute("uv");

    // Define material & shaders
    this.uniforms = {
      time: { type: "f", value: 0 },
      scrollDistance: { type: "f", value: 0 },
      scrollDistanceRaw: { type: "f", value: 0 },
      scrollDistanceOffset: { type: "f", value: 0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      blending: THREE.CustomBlending,
      blendDst: THREE.OneMinusDstAlphaFactor,
      blendSrc: THREE.DstColorFactor
      // depthTest: false,
      // depthWrite: false
    });
    // Deduce vertex count
    const positionAttributes = bufferGeometry.getAttribute("position");
    const vertexCount =
      positionAttributes.array.length / positionAttributes.itemSize;

    // Custom attributes
    const colorArray = new Float32Array(vertexCount * 3);
    const exitMotionArray = new Float32Array(vertexCount * 3);
    const offsetArray = new Float32Array(vertexCount);

    // Define values

    const colorsAsVectors = [];
    const motionAsVectors = [];

    this.boxColors.forEach((color) => {
      colorsAsVectors.push(
        new THREE.Vector3(...new THREE.Color(color).toArray())
      );
    });

    motionAsVectors.push(new THREE.Vector3(1, 0.01, 0.01));
    motionAsVectors.push(new THREE.Vector3(0.01, -1, 0.01));
    motionAsVectors.push(new THREE.Vector3(0.01, 0.01, 1));

    let colorSelect = Math.floor(Math.random() * this.boxColors.length);
    let chosenColor = colorsAsVectors[colorSelect];

    let chosenVector = motionAsVectors[this.cubeShapeAxis[0]];
    let offset = 0.2;

    for (let i = 0, i3 = 0; i < vertexCount; i++, i3 += 3) {
      // 36 vertexes per cube (vertex soup)
      if (i % 36 === 0) {
        colorSelect = Math.floor(Math.random() * this.boxColors.length);
        chosenColor = colorsAsVectors[colorSelect];

        const chosenVecNr = this.cubeShapeAxis[Math.floor(i / 36)];

        chosenVector = motionAsVectors[chosenVecNr].clone();
        let direction = Math.random() < 0.0 ? -1 : 1;
        if (chosenVecNr == 1) {
          direction = 1;
        }
        chosenVector.multiplyScalar((Math.random() + 0.2) * 4 * direction);
        offset += 1;
      }

      colorArray[i3 + 0] = chosenColor.x;
      colorArray[i3 + 1] = chosenColor.y;
      colorArray[i3 + 2] = chosenColor.z;

      exitMotionArray[i3 + 0] = chosenVector.x;
      exitMotionArray[i3 + 1] = chosenVector.y;
      exitMotionArray[i3 + 2] = chosenVector.z;

      offsetArray[i] = offset / (vertexCount / 36);
    }

    bufferGeometry.addAttribute(
      "customColor",
      new THREE.BufferAttribute(colorArray, 3)
    );
    bufferGeometry.addAttribute(
      "exitMotion",
      new THREE.BufferAttribute(exitMotionArray, 3)
    );
    bufferGeometry.addAttribute(
      "offset",
      new THREE.BufferAttribute(offsetArray, 1)
    );

    const object = new THREE.Mesh(bufferGeometry, material);

    this.scene.add(object);
  }

  addCubeSlice() {
    if (this.boxQueue.length > 0) {
      this.createBoxes(this.boxQueue.splice(0, 100));
    } else {
      this.stillAddingCubes = false;
    }
  }

  createBox(cube) {
    const size = cube.size;
    const geometry = new THREE.BoxGeometry(
      size[0] * this.SHRINKCUBE,
      size[1] * this.SHRINKCUBE,
      size[2] * this.SHRINKCUBE
    );
    geometry.translate(...correctedPosition(cube));
    return geometry;
  }

  createBoxes(cubes) {
    cubes.forEach((cube) => {
      const mesh = this.createBox(cube);
      this.geometry.merge(mesh);
      const maxSize = Math.max(...cube.size);
      this.cubeShapeAxis.push(cube.size.indexOf(maxSize));
      // this.cubeSizes.push(maxSize)
    });
  }
}
