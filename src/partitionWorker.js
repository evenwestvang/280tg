/* eslint-disable */
// Weird name as codesandbox won't make JS avail as static files.

var STOP_AT_CUBE_SIZE,
  MINIMAL_SIZE,
  CHANCE_OF_SUBDIVISION,
  CHANCE_SKIP_DRAWING,
  resultCubes,
  cubeStack;

self.addEventListener("message", go);

function go(message) {
  var scaling = message.data.scaling;
  // STOP_AT_CUBE_SIZE = scaling / 400
  // MAXIMUM_SIZE = scaling / 2
  //
  // CHANCE_OF_SUBDIVISION = 0.4
  // CHANCE_SKIP_DRAWING = 0.5

  STOP_AT_CUBE_SIZE = scaling / 300;
  MAXIMUM_SIZE = scaling / 2;

  CHANCE_OF_SUBDIVISION = 0.2;
  CHANCE_SKIP_DRAWING = 0.00;

  resultCubes = [];
  cubeStack = [];

  var cubeSize = [100, 50, 100];
  var firstCube = new Cube(
    [-cubeSize[0] / 2, -cubeSize[1] / 2, -cubeSize[2] / 2],
    [cubeSize[0], cubeSize[1], cubeSize[2]]
  );

  cubeStack.push(firstCube);

  while (cubeStack.length > 0) {
    divide();
  }

  resultCubes = resultCubes.sort(function(aCube, bCube) {
    return bCube.position[1] - aCube.position[1];
  });

  // console.info("Divided into " + resultCubes.length + " cubes")

  self.postMessage({
    command: "done",
    resultCubes: JSON.stringify(resultCubes)
  });
}

function divide() {
  var cube = cubeStack.pop();

  if (cube.minEdgeSize() < STOP_AT_CUBE_SIZE) {
    return;
    resultCubes.push(cube);
  }

  const newCubes = cube.bisect();

  // 0 or 1 = draw respective cube. 2 = push both
  const choice = Math.floor(Math.random() * 3);

  // Larger than minimal face size? Push both for subdivision
  if (
    choice == 2 ||
    cube.maxEdgeSize() > MAXIMUM_SIZE ||
    Math.random() < CHANCE_OF_SUBDIVISION
  ) {
    cubeStack = cubeStack.concat(newCubes);
  } else {
    if (Math.random() > CHANCE_SKIP_DRAWING) {
      resultCubes.push(newCubes[choice]);
    }
    cubeStack.push(newCubes[choice == 0 ? 1 : 0]);
  }
}

function Cube(position, size) {
  this.position = position;
  this.size = size;

  this.minEdgeSize = function() {
    return Math.min(this.size[0], this.size[1], this.size[2]);
  };

  this.maxEdgeSize = function() {
    return Math.max(this.size[0], this.size[1], this.size[2]);
  };

  this.bisect = function() {
    const axis = Math.floor(Math.random() * 3);

    const positionLeft = this.position.slice();
    const sizeLeft = this.size.slice();
    const positionRight = this.position.slice();
    const sizeRight = this.size.slice();

    const newSize = sizeLeft.slice()[axis] / 2.001;

    sizeLeft[axis] = newSize;
    sizeRight[axis] = newSize;
    positionRight[axis] += newSize;

    const leftCube = new Cube(positionLeft, sizeLeft);
    const rightCube = new Cube(positionRight, sizeRight);

    return [leftCube, rightCube];
  };
}
