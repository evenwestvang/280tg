export function correctedPosition(cube) {
  return [
    cube.position[0] + cube.size[0] / 2,
    cube.position[1] + cube.size[1] / 2,
    cube.position[2] + cube.size[2] / 2
  ];
}
