export const vertex = `

  uniform float scrollDistanceOffset;
  uniform float scrollDistance;
  uniform float time;

  attribute vec3 customColor;
  attribute vec3 exitMotion;
  attribute float offset;

  // Outputs
  varying vec3  vCustomColor;

  mat4 rotationMatrix(vec3 axis, float angle)
  {
      axis = normalize(axis);
      float s = sin(angle);
      float c = cos(angle);
      float oc = 1.0 - c;

      return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                  oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                  oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                  0.0,                                0.0,                                0.0,                                1.0);
  }

	void main()
	{
    vCustomColor = customColor;

    vec4 pos = projectionMatrix * modelViewMatrix * vec4(position + (scrollDistanceOffset * exitMotion * 180.0 * offset * (offset + 0.1) ), 1.0);
    gl_Position = pos;
	}
`;
export const fragment = `
  uniform float time;
  uniform float scrollDistance;
  uniform float scrollDistanceRaw;

  varying vec3  vCustomColor;

	void main(void) {
    // float timeAlpha = clamp(time * 2.0 - (2.0 * vOffset), 0.0, 1.0);
    // float correctedAlpha = clamp(0.8 - (scrollDistance * 0.7), 0.05, timeAlpha);
    // float alpha = 1.0 - clamp(time * 1.0 - (4.0 * vOffset), 0.0, 1.0 - (scrollDistance * 0.5) - 0.5);

    // Fade in
    gl_FragColor = vec4(vCustomColor, 1.0);

    // float alpha = 1.0 - clamp(time * 1.0 - (4.0 * vOffset), 0.0, 1.0 - (scrollDistance * 0.5) - 0.5);
    // gl_FragColor = vec4(vCustomColor, 1.0);

	}
`;
