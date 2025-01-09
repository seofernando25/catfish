let iota = 0;

// Type Tags Definition
const TYPE_TAGS = {
    UNDEFINED: iota++,
    STRING: iota++,
    NUMBER: iota++,
    BOOLEAN: iota++,
    UINT8ARRAY: iota++,
    INT16ARRAY: iota++,
    FLOAT32ARRAY: iota++,
    FLOAT64ARRAY: iota++,
    ARRAY: iota++,
    OBJECT: iota++,
} as const;

// MarshalHandler Definition
type MarshalHandler<T> = {
    tag: number;
    is: (value: any) => value is T;
    serialize: (buff: Uint8Array, value: T, offset: number) => number;
    deserialize: (buff: Uint8Array, offset: number) => [T, number];
};

// Marshal Handler Mapping
const marshalHandlerMapping = new Map<number, MarshalHandler<any>>();

// Helper functions for writing and reading 4-byte lengths
function writeUInt32(buff: Uint8Array, offset: number, value: number): number {
    buff[offset++] = (value >>> 24) & 0xff;
    buff[offset++] = (value >>> 16) & 0xff;
    buff[offset++] = (value >>> 8) & 0xff;
    buff[offset++] = value & 0xff;
    return offset;
}

function readUInt32(buff: Uint8Array, offset: number): [number, number] {
    const value =
        (buff[offset] << 24) |
        (buff[offset + 1] << 16) |
        (buff[offset + 2] << 8) |
        buff[offset + 3];
    return [value >>> 0, offset + 4];
}

// String Handler
const stringHandler: MarshalHandler<string> = {
    tag: TYPE_TAGS.STRING,
    is: (value: any): value is string => typeof value === "string",
    serialize: (buff, value: string, offset) => {
        buff[offset++] = stringHandler.tag;
        if (value.length > 4294967295) throw new Error("String too long");
        offset = writeUInt32(buff, offset, value.length);
        for (let i = 0; i < value.length; i++) {
            buff[offset++] = value.charCodeAt(i);
        }
        return offset;
    },
    deserialize: (buff, offset): [string, number] => {
        if (buff[offset++] !== stringHandler.tag)
            throw new Error("Type mismatch for string");
        const [length, newOffset] = readUInt32(buff, offset);
        offset = newOffset;
        let str = "";
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(buff[offset++]);
        }
        return [str, offset];
    },
};
marshalHandlerMapping.set(stringHandler.tag, stringHandler);

// Number Handler
const numberHandler: MarshalHandler<number> = {
    tag: TYPE_TAGS.NUMBER,
    is: (value: any): value is number => typeof value === "number",
    serialize: (buff, value: number, offset) => {
        buff[offset++] = numberHandler.tag;
        const view = new DataView(buff.buffer, buff.byteOffset + offset, 8);
        view.setFloat64(0, value);
        return offset + 8;
    },
    deserialize: (buff, offset): [number, number] => {
        if (buff[offset++] !== numberHandler.tag)
            throw new Error("Type mismatch for number");
        const view = new DataView(buff.buffer, buff.byteOffset + offset, 8);
        const num = view.getFloat64(0);
        return [num, offset + 8];
    },
};
marshalHandlerMapping.set(numberHandler.tag, numberHandler);

// Boolean Handler
const booleanHandler: MarshalHandler<boolean> = {
    tag: TYPE_TAGS.BOOLEAN,
    is: (value: any): value is boolean => typeof value === "boolean",
    serialize: (buff, value: boolean, offset) => {
        buff[offset++] = booleanHandler.tag;
        buff[offset++] = value ? 1 : 0;
        return offset;
    },
    deserialize: (buff, offset): [boolean, number] => {
        if (buff[offset++] !== booleanHandler.tag)
            throw new Error("Type mismatch for boolean");
        const bool = buff[offset++] === 1;
        return [bool, offset];
    },
};
marshalHandlerMapping.set(booleanHandler.tag, booleanHandler);

// Uint8Array Handler
const uint8ArrayHandler: MarshalHandler<Uint8Array> = {
    tag: TYPE_TAGS.UINT8ARRAY,
    is: (value: any): value is Uint8Array => value instanceof Uint8Array,
    serialize: (buff, value: Uint8Array, offset) => {
        buff[offset++] = uint8ArrayHandler.tag;
        if (value.length > 4294967295) throw new Error("Uint8Array too long");
        offset = writeUInt32(buff, offset, value.length);
        buff.set(value, offset);
        return offset + value.length;
    },
    deserialize: (buff, offset): [Uint8Array, number] => {
        if (buff[offset++] !== uint8ArrayHandler.tag)
            throw new Error("Type mismatch for Uint8Array");
        const [length, newOffset] = readUInt32(buff, offset);
        offset = newOffset;
        const arr = buff.slice(offset, offset + length);
        return [arr, offset + length];
    },
};
marshalHandlerMapping.set(uint8ArrayHandler.tag, uint8ArrayHandler);

// Int16Array Handler
const int16ArrayHandler: MarshalHandler<Int16Array> = {
    tag: TYPE_TAGS.INT16ARRAY,
    is: (value: any): value is Int16Array => value instanceof Int16Array,
    serialize: (buff, value: Int16Array, offset) => {
        buff[offset++] = int16ArrayHandler.tag;
        if (value.length > 4294967295) throw new Error("Int16Array too long");
        offset = writeUInt32(buff, offset, value.length);
        const view = new DataView(
            buff.buffer,
            buff.byteOffset + offset,
            value.length * 2
        );
        for (let i = 0; i < value.length; i++) {
            view.setInt16(i * 2, value[i], false); // Big-endian
        }
        return offset + value.length * 2;
    },
    deserialize: (buff, offset): [Int16Array, number] => {
        if (buff[offset++] !== int16ArrayHandler.tag)
            throw new Error("Type mismatch for Int16Array");
        const [length, newOffset] = readUInt32(buff, offset);
        offset = newOffset;
        const arr = new Int16Array(length);
        const view = new DataView(
            buff.buffer,
            buff.byteOffset + offset,
            length * 2
        );
        for (let i = 0; i < length; i++) {
            arr[i] = view.getInt16(i * 2, false); // Big-endian
        }
        return [arr, offset + length * 2];
    },
};
marshalHandlerMapping.set(int16ArrayHandler.tag, int16ArrayHandler);

// Float32Array Handler
const float32ArrayHandler: MarshalHandler<Float32Array> = {
    tag: TYPE_TAGS.FLOAT32ARRAY,
    is: (value: any): value is Float32Array => value instanceof Float32Array,
    serialize: (buff, value: Float32Array, offset) => {
        buff[offset++] = float32ArrayHandler.tag;
        if (value.length > 4294967295)
            throw new Error("Float32Array too long: " + value.length);
        offset = writeUInt32(buff, offset, value.length);
        const view = new DataView(
            buff.buffer,
            buff.byteOffset + offset,
            value.length * 4
        );
        for (let i = 0; i < value.length; i++) {
            view.setFloat32(i * 4, value[i], false); // Big-endian
        }
        return offset + value.length * 4;
    },
    deserialize: (buff, offset): [Float32Array, number] => {
        if (buff[offset++] !== float32ArrayHandler.tag)
            throw new Error("Type mismatch for Float32Array");
        const [length, newOffset] = readUInt32(buff, offset);
        offset = newOffset;
        const arr = new Float32Array(length);
        const view = new DataView(
            buff.buffer,
            buff.byteOffset + offset,
            length * 4
        );
        for (let i = 0; i < length; i++) {
            arr[i] = view.getFloat32(i * 4, false); // Big-endian
        }
        return [arr, offset + length * 4];
    },
};
marshalHandlerMapping.set(float32ArrayHandler.tag, float32ArrayHandler);

// Float64Array Handler
const float64ArrayHandler: MarshalHandler<Float64Array> = {
    tag: TYPE_TAGS.FLOAT64ARRAY,
    is: (value: any): value is Float64Array => value instanceof Float64Array,
    serialize: (buff, value: Float64Array, offset) => {
        buff[offset++] = float64ArrayHandler.tag;
        if (value.length > 4294967295)
            throw new Error("Float64Array too long: " + value.length);
        offset = writeUInt32(buff, offset, value.length);
        const view = new DataView(
            buff.buffer,
            buff.byteOffset + offset,
            value.length * 8
        );
        for (let i = 0; i < value.length; i++) {
            view.setFloat64(i * 8, value[i], false); // Big-endian
        }
        return offset + value.length * 8;
    },
    deserialize: (buff, offset): [Float64Array, number] => {
        if (buff[offset++] !== float64ArrayHandler.tag)
            throw new Error("Type mismatch for Float64Array");
        const [length, newOffset] = readUInt32(buff, offset);
        offset = newOffset;
        const arr = new Float64Array(length);
        const view = new DataView(
            buff.buffer,
            buff.byteOffset + offset,
            length * 8
        );
        for (let i = 0; i < length; i++) {
            arr[i] = view.getFloat64(i * 8, false); // Big-endian
        }
        return [arr, offset + length * 8];
    },
};
marshalHandlerMapping.set(float64ArrayHandler.tag, float64ArrayHandler);

// Array Handler
const arrayHandler: MarshalHandler<any[]> = {
    tag: TYPE_TAGS.ARRAY,
    is: (value: any): value is any[] => Array.isArray(value),
    serialize: (buff, value: any[], offset) => {
        buff[offset++] = arrayHandler.tag;
        if (value.length > 4294967295) throw new Error("Array too long");
        offset = writeUInt32(buff, offset, value.length);
        for (const val of value) {
            offset = serializeValue(buff, val, offset);
        }
        return offset;
    },
    deserialize: (buff, offset): [any[], number] => {
        if (buff[offset++] !== arrayHandler.tag)
            throw new Error("Type mismatch for array");
        const [length, newOffset] = readUInt32(buff, offset);
        offset = newOffset;
        const arr: any[] = [];
        for (let i = 0; i < length; i++) {
            const [val, newOffset2] = deserializeValue(buff, offset);
            arr.push(val);
            offset = newOffset2;
        }
        return [arr, offset];
    },
};
marshalHandlerMapping.set(arrayHandler.tag, arrayHandler);

// Object Handler
const objectHandler: MarshalHandler<Record<string, any>> = {
    tag: TYPE_TAGS.OBJECT,
    is: (value: any): value is Record<string, any> =>
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Uint8Array) &&
        !(value instanceof Int16Array) &&
        !(value instanceof Float32Array) &&
        !(value instanceof Float64Array),
    serialize: (buff, value: Record<string, any>, offset) => {
        buff[offset++] = objectHandler.tag;
        const keys = Object.keys(value);
        if (keys.length > 4294967295) throw new Error("Object too large");
        offset = writeUInt32(buff, offset, keys.length);
        for (const [key, val] of Object.entries(value)) {
            // Serialize the key as a string
            offset = serializeValue(buff, key, offset);
            // Serialize the value
            offset = serializeValue(buff, val, offset);
        }
        return offset;
    },
    deserialize: (buff, offset): [Record<string, any>, number] => {
        if (buff[offset++] !== objectHandler.tag)
            throw new Error("Type mismatch for object");
        const [numEntries, newOffset] = readUInt32(buff, offset);
        offset = newOffset;
        const obj: Record<string, any> = {};
        for (let i = 0; i < numEntries; i++) {
            // Deserialize key
            const [key, newOffset1] = deserializeValue(buff, offset);
            if (typeof key !== "string")
                throw new Error("Invalid key type: " + typeof key + " " + key);
            offset = newOffset1;
            // Deserialize value
            const [val, newOffset2] = deserializeValue(buff, offset);
            obj[key] = val;
            offset = newOffset2;
        }
        return [obj, offset];
    },
};
marshalHandlerMapping.set(objectHandler.tag, objectHandler);

// Undefined Handler (Optional)
const undefinedHandler: MarshalHandler<undefined> = {
    tag: TYPE_TAGS.UNDEFINED,
    is: (value: any): value is undefined => value === undefined,
    serialize: (buff, value: undefined, offset) => {
        buff[offset++] = undefinedHandler.tag;
        return offset;
    },
    deserialize: (buff, offset): [undefined, number] => {
        if (buff[offset++] !== undefinedHandler.tag)
            throw new Error("Type mismatch for undefined");
        return [undefined, offset];
    },
};
marshalHandlerMapping.set(undefinedHandler.tag, undefinedHandler);

// Serialize Value Helper
function serializeValue(buff: Uint8Array, value: any, offset: number): number {
    let currentHandler: MarshalHandler<any> | undefined;
    for (const handler of marshalHandlerMapping.values()) {
        if (handler.is(value)) {
            currentHandler = handler;
            break;
        }
    }
    if (!currentHandler)
        throw new Error("No handler registered for value: " + value);
    return currentHandler.serialize(buff, value, offset);
}

// Deserialize Value Helper
function deserializeValue(buff: Uint8Array, offset: number): [any, number] {
    const typeTag = buff[offset];
    const handler = marshalHandlerMapping.get(typeTag);
    if (!handler) throw new Error(`Unknown type tag: ${typeTag}`);
    return handler.deserialize(buff, offset);
}

const BUFFER_SIZE = 10 * 1024 * 1024; // 1MB
const buffer = new Uint8Array(BUFFER_SIZE);

export function serializeObject(obj: object): Uint8Array {
    const offset = serializeValue(buffer, obj, 0);
    return buffer.slice(0, offset);
}

// Deserialize Object Function
export function deserializeObject(buff: Uint8Array): Record<string, any> {
    const [obj, _] = deserializeValue(buff, 0);
    if (typeof obj !== "object" || obj === null)
        throw new Error("Deserialized value is not an object");
    return obj;
}
