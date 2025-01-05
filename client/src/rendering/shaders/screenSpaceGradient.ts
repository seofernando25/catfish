import { ShaderMaterial, Color, Vector2, Vector3 } from "three";

const vertexShader = `
varying vec2 vUv;
uniform vec2 uvScale;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv =  gl_Position.xy ;
}
`;

const fragmentShader = `
uniform vec3 colorA; 
uniform vec3 colorB; 
varying vec2 vUv;
uniform float fogDensity;
uniform vec3 fogColor;

void main() {
    vec3 color = mix(colorA, colorB, vUv.y);
    gl_FragColor = vec4(color, 1.0);

    // Fog
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    const float LOG2 = 1.442695;
    float fogFactor = exp2(-fogDensity * fogDensity * depth * depth * LOG2);
    fogFactor = 1.0 - clamp(fogFactor, 0.0, 1.0);
    gl_FragColor = mix(vec4(color, 1.0), vec4(fogColor, 1.0), fogFactor);
}
`;

// Create the shader material
export const screenSpaceGradientMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        colorA: { value: new Color(1.0, 0.0, 0.0) },
        colorB: { value: new Color(0.0, 0.0, 1.0) },
        uvScale: { value: new Vector2(1, 1) },
        fogDensity: { value: 0.45 },
        fogColor: { value: new Vector3(0, 0, 0) },
    },
});
