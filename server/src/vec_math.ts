import { cc } from "bun:ffi";
import source from "./vec_math.c" with { type: "file" };


const bindings = cc({
    source,
    symbols: {
        computeUniqueGridVertexNormals: { args: ["ptr", "int", "ptr", "int", "ptr", "int", "ptr"], returns: "void" },
    },
});

const fn = bindings.symbols;
export default fn;