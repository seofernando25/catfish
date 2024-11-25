const SandShader = `
precision mediump float;

vec2 hash22(vec2 p) {
    float n = sin(dot(p, vec2(113, 1)));
    p = fract(vec2(2097152.0, 262144.0) * n) * 2.0 - 1.0;
    return p;
}

float gradN2D(in vec2 f) {
    const vec2 e = vec2(0.0, 1.0);
    vec2 p = floor(f);
    f -= p; // Fractional position within the cube.

    // Smoothing 
    vec2 w = f * f * (3.0 - 2.0 * f); 

    float c = mix(
        mix(dot(hash22(p + e.xx), f - e.xx), dot(hash22(p + e.yx), f - e.yx), w.x),
        mix(dot(hash22(p + e.xy), f - e.xy), dot(hash22(p + e.yy), f - e.yy), w.x),
        w.y
    );

    return c * 0.5 + 0.5; // Range: [0, 1].
}

// Fractal Brownian Motion (FBM)
float fBm(in vec2 p) {
    return gradN2D(p) * 0.57 + gradN2D(p * 2.0) * 0.28 + gradN2D(p * 4.0) * 0.15;
}

void main() {
    const float scale = 0.0000002;
    vec2 st = vec2(gl_FragColor.xy) * scale;

    vec3 color = vec3(0.0);
    
    color = mix(vec3(1.0, 0.95, 0.7), vec3(0.9, 0.6, 0.4), fBm(st.xy * 16.0));
    color = mix(color, color * 0.9, fBm(st.xy * 32.0 - 0.5));
    color = mix(color, vec3(0.2, 0.4, 0.6), 0.1); // Soft blue tint for underwater
    
    gl_FragColor = vec4(color, 1.0);
}

`;

export class SandShaderPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
    constructor(game: Phaser.Game) {
        super({
            game: game,
            fragShader: SandShader, // The GLSL fragment shader
        });
        // Set resolution uniform
    }
}