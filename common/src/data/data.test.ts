// import { describe, expect, it } from "bun:test";
// import { fallback, is, object, string } from "valibot";
// import { deserializeObject, serializeObject } from "../serializer";
// import { catBlueprint } from "./cat";

// describe("data", () => {
//     it("should be able to get data", () => {
//         const p = catBlueprint();
//         expect(p.name).toBe("Cat");
//     });

//     it.only("should compress", () => {
//         const obj = {
//             lorem: "ipsum",
//             dolor: "sit",
//             amet: "consectetur",
//             a: [5, 6, 7],
//             buff: new Uint8Array(3).map((_, i) => i),
//             buff2: new Uint8Array(3).map((_, i) => i),
//             b: [1, 2, 2, 3],
//             // fArr: new Float64Array(3).map((_, i) => i * 0.75),
//             // fArr2: new Float32Array(64 * 3).map((_, i) => i * 0.33),
//             sub: {
//                 foo: "bar",
//                 baz: "qux",
//                 quux: "quuz",
//                 corge: "grault",
//                 garply: "waldo",
//                 fred: "plugh",
//                 xyzzy: "thud",
//             },
//         };
//         // console.log(obj);
//         const customSerialization = serializeObject(obj);
//         const jsonSerialization = new Uint8Array(
//             new TextEncoder().encode(JSON.stringify(obj, null, 0))
//         );

//         let deserialized = deserializeObject(customSerialization);
//         console.log(deserialized);

//         const customCompressed = Bun.gzipSync(customSerialization);
//         const jsonCompressed = Bun.gzipSync(jsonSerialization);
//         console.log("Custom compressed:", customCompressed.length);
//         console.log("JSON compressed:", jsonCompressed.length);
//         const ratio = customCompressed.length / jsonCompressed.length;
//         console.log("Compression ratio:", ratio);

//         console.log("Custom size:", customSerialization.length);
//         console.log("JSON size:", jsonSerialization.length);
//         const ratio2 = customSerialization.length / jsonSerialization.length;
//         console.log("Uncompressed ratio:", ratio2);

//         // Compression gains
//         const customGains =
//             1 - customCompressed.length / customSerialization.length;
//         const jsonGains = 1 - jsonCompressed.length / jsonSerialization.length;

//         console.log("Custom gains:", customGains);
//         console.log("JSON gains:", jsonGains);

//         // check if fArr and fArr2 are preserved
//         // console.log(obj);
//         console.log(Object.keys(obj));
//         console.log(Object.keys(deserialized));
//     });

//     it("Valibot", () => {
//         const namedSchema = object({
//             name: string(),
//             description: fallback(string(), "Unknown entity"),
//         });

//         const obj = {
//             foo: "bar",
//             name: "Entity",
//         };

//         if (is(namedSchema, obj)) {
//             console.log(obj);
//             console.log(
//                 obj.description ?? namedSchema.entries.description.fallback
//             );
//             console.log("Is named schema");
//         } else {
//             console.log(obj);
//             console.log("Is not named schema");
//         }
//     });
// });
