#include <math.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

// Inline cross product of two vectors (a x b) stored in out
inline void crossVec(const float* a, const float* b, float* out) {
    out[0] = a[1] * b[2] - a[2] * b[1];
    out[1] = a[2] * b[0] - a[0] * b[2];
    out[2] = a[0] * b[1] - a[1] * b[0];
}

// Inline normalize a vector (in-place)
inline void normalize(float* v) {
    float len = sqrtf(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len > 0.0f) {
        v[0] /= len;
        v[1] /= len;
        v[2] /= len;
    }
}

// Subtract two vectors (a - b) stored in out
inline void subVectors(const float* a, const float* b, float* out) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
}

// Add one vector to another (v added to out)
inline void addVec(float* a, float* b, float* out) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
}

// Compute the dot product of two 2D vectors
inline float dot(float x1, float y1, float x2, float y2) {
    return x1 * x2 + y1 * y2;
}

// Compute the fractional part of a float
inline float fract(float x) {
    return x - floorf(x);
}

// Hash function for 3D coordinates
unsigned int hash3(float x, float y, float z) {
    float p3X = fract(x * 0.1031f);
    float p3Y = fract(y * 0.1031f);
    float p3Z = fract(z * 0.1031f);

    float dotX = dot(p3X, p3Y, p3Z + 31.32f, 31.32f);
    float dotY = dot(p3Y, p3Z, p3X + 31.32f, 31.32f);
    float dotZ = dot(p3Z, p3X, p3Y + 31.32f, 31.32f);

    p3X += dotX;
    p3Y += dotY;
    p3Z += dotZ;

    return (unsigned int)(fract((p3X + p3Y) * p3Z) * 4294967296.0f); // Scale to unsigned int
}

// Compute unique grid vertex normals
void computeUniqueGridVertexNormals(
    float* positions, int positionCount,
    float* normals, int normalCount,
    int* vertexNormalsOffsets, int vertexNormalOffsetsSize,
    float* normalsAcc
    ) {
    float computedNormal[3];
    float e1[3], e2[3];

    size_t i = 0;

    size_t offsetIndex = 0;

    for (size_t i = 0; i < positionCount; i += 9) {
        float* v0 = &positions[i];
        float* v1 = &positions[i + 3];
        float* v2 = &positions[i + 6];

        subVectors(v1, v0, e1);
        subVectors(v2, v0, e2);

        crossVec(e1, e2, computedNormal);
        normalize(computedNormal);

        for (size_t j = 0; j < 3; ++j) {
            size_t vertexIndex = (i / 3) + j;
            unsigned int key = hash3(
                positions[vertexIndex * 3],
                positions[vertexIndex * 3 + 1],
                positions[vertexIndex * 3 + 2]
            );

            if (vertexNormalsOffsets[key % vertexNormalOffsetsSize] == -1) {
                vertexNormalsOffsets[key % vertexNormalOffsetsSize] = offsetIndex++;
            }

            int currentNormalIndex = vertexNormalsOffsets[key % vertexNormalOffsetsSize] * 3;

            addVec(computedNormal, &normalsAcc[currentNormalIndex], &normalsAcc[currentNormalIndex]);
        }
    }

    for (size_t i = 0; i < positionCount / 3; i++) {
        unsigned int key = hash3(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2]
        );

        int normalIndex = vertexNormalsOffsets[key % vertexNormalOffsetsSize];
        if (normalIndex >= 0) {
            float* normal = &normalsAcc[normalIndex * 3];
            normalize(normal);

            normals[i * 3] = normal[0];
            normals[i * 3 + 1] = normal[1];
            normals[i * 3 + 2] = normal[2];
        }
    }
}
