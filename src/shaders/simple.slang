// Vertex Shader
struct VSInput {
    float3 position : POSITION;
    float3 color : COLOR;
};

struct VSOutput {
    float4 position : SV_POSITION;
    float3 color : COLOR;
};

VSOutput vsMain(VSInput input) {
    VSOutput output;
    output.position = float4(input.position, 1.0);
    output.color = input.color;
    return output;
}

// Fragment Shader
float4 psMain(VSOutput input) : SV_TARGET {
    return float4(input.color, 1.0);
}