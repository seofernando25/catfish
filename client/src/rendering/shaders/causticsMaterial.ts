import { globalTicker } from "@catfish/common/Ticker.js";
import { effect } from "@preact/signals";
import {
    ShaderMaterial,
    UniformsUtils,
    Vector2,
    UniformsLib,
    AdditiveBlending,
    NormalBlending,
    MultiplyBlending,
    Color,
} from "three";

export const causticsMaterial = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
        {
            time: { value: 0 },
            scale1: { value: 10.0 },
            scale2: { value: 5.0 },
            distortion1Strength: { value: 0.1 },
            distortion2Strength: { value: 0.15 },
            distortion1Frequency: { value: 5.0 },
            distortion2Frequency: { value: 4.0 },
            distortion1Speed: { value: 2.0 },
            distortion2Speed: { value: 1.5 },
            edge1ThresholdMin: { value: 0.02 },
            edge1ThresholdMax: { value: 0.05 },
            edge2ThresholdMin: { value: 0.03 },
            edge2ThresholdMax: { value: 0.07 },
            mainBlue: { value: new Color(0.1, 0.2, 0.3) },
            darkBlue: { value: new Color(0.08, 0.18, 0.28) },
            foamColor: { value: new Color(0.9, 0.9, 0.9) },
        },
        {
            causticsOffset: { value: new Vector2(0, 0) },
        },
        UniformsLib.common,
    ]),
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
            vUv = uv;
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz; // Correctly pass world position
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform vec2 causticsOffset;
        uniform float scale1;
        uniform float scale2;
        uniform float distortion1Strength;
        uniform float distortion2Strength;
        uniform float distortion1Frequency;
        uniform float distortion2Frequency;
        uniform float distortion1Speed;
        uniform float distortion2Speed;
        uniform float edge1ThresholdMin;
        uniform float edge1ThresholdMax;
        uniform float edge2ThresholdMin;
        uniform float edge2ThresholdMax;
        uniform vec3 mainBlue;
        uniform vec3 darkBlue;
        uniform vec3 foamColor;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        // Voronoi Function
        float voronoi(vec2 uv, out vec2 cellCoord) {
            vec2 i = floor(uv);
            vec2 f = fract(uv);
            float minDist1 = 1.0;
            float minDist2 = 1.0;
            cellCoord = vec2(0.0);
            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    vec2 neighbor = vec2(float(x), float(y));
                    vec2 point = vec2(fract(sin(dot(i + neighbor, vec2(127.1, 311.7))) * 43758.5453));
                    vec2 diff = neighbor + point - f;
                    float dist = length(diff);
                    if (dist < minDist1) {
                        minDist2 = minDist1;
                        minDist1 = dist;
                        cellCoord = neighbor + point;
                    } else if (dist < minDist2) {
                        minDist2 = dist;
                    }
                }
            }
            return minDist2 - minDist1;
        }

        float noise(vec2 p){
            return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = vUv + causticsOffset;

            // Scale UVs for two layers
            vec2 uv1 = uv * scale1 + vec2(time * 0.1, time * 0.1); // Add time-based movement
            vec2 uv2 = uv * scale2 + vec2(time * 0.05, time * 0.05);

            // Apply distortions based on time
            vec2 distortedUV1 = uv1 + vec2(
                sin(time * distortion1Speed + uv1.y * distortion1Frequency) * distortion1Strength,
                cos(time * distortion1Speed + uv1.x * distortion1Frequency) * distortion1Strength
            );

            vec2 distortedUV2 = uv2 + vec2(
                cos(time * distortion2Speed + uv2.y * distortion2Frequency) * distortion2Strength,
                sin(time * distortion2Speed + uv2.x * distortion2Frequency) * distortion2Strength
            );

            // Compute Voronoi distances
            vec2 cellCoord1;
            float edgeDist1 = voronoi(distortedUV1, cellCoord1);
            float edges1 = smoothstep(edge1ThresholdMin, edge1ThresholdMax, edgeDist1);

            vec2 cellCoord2;
            float edgeDist2 = voronoi(distortedUV2, cellCoord2);
            float edges2 = smoothstep(edge2ThresholdMin, edge2ThresholdMax, edgeDist2);

            // Determine color based on Voronoi edges
            vec3 e = vec3(0.0);
            if (edges2 > 0.5) {
                e = mainBlue;
            } else {
                e = darkBlue;
            }

            if (edges1 <= 0.5) {
                e = foamColor;
            }

            // Calculate distance from camera to fragment
            float distance = length(cameraPosition - vWorldPosition);
            // When distance is 0, intensity is 0; when distance is 30, intensity is 1
            float intensity = smoothstep(0.0, 30.0, distance);

            // Final color blending
            vec3 finalColor = e * intensity;

            // Output color with opacity
            gl_FragColor = vec4(finalColor, opacity);
        }
    `,
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
});
