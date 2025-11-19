const MAJOR_TYPES = {
  UNSIGNED: 0,
  NEGATIVE: 1,
  BYTE_STRING: 2,
  TEXT_STRING: 3,
  ARRAY: 4,
  MAP: 5,
  TAG: 6,
  SIMPLE_FLOAT: 7,
};

class ByteWriter {
  constructor() {
    this.bytes = [];
  }

  push(byte) {
    this.bytes.push(byte & 0xff);
  }

  pushBytes(arr) {
    for (const b of arr) {
      this.bytes.push(b & 0xff);
    }
  }

  pushUInt(value, byteLength) {
    for (let i = byteLength - 1; i >= 0; i--) {
      this.push((value >> (8 * i)) & 0xff);
    }
  }

  pushBigUInt(value, byteLength) {
    let temp = BigInt(value);
    const bytes = new Array(byteLength);
    for (let i = byteLength - 1; i >= 0; i--) {
      bytes[i] = Number(temp & 0xffn);
      temp >>= 8n;
    }
    this.pushBytes(bytes);
  }

  result() {
    return Uint8Array.from(this.bytes);
  }
}

function encodeUnsigned(writer, majorType, value) {
  if (typeof value === 'bigint') {
    if (value <= 0xffffffffffffffffn) {
      // up to 64-bit
      if (value < 0n) {
        throw new Error('Negative bigint not supported here');
      }
      const prefix = encodeMajorType(majorType, 27);
      writer.push(prefix);
      writer.pushBigUInt(value, 8);
      return;
    }
    throw new Error('BigInt too large');
  }

  if (value < 24) {
    writer.push(encodeMajorType(majorType, value));
  } else if (value < 256) {
    writer.push(encodeMajorType(majorType, 24));
    writer.push(value);
  } else if (value < 65536) {
    writer.push(encodeMajorType(majorType, 25));
    writer.pushUInt(value, 2);
  } else if (value < 0x1_0000_0000) {
    writer.push(encodeMajorType(majorType, 26));
    writer.pushUInt(value, 4);
  } else {
    writer.push(encodeMajorType(majorType, 27));
    writer.pushBigUInt(BigInt(value), 8);
  }
}

function encodeMajorType(type, additional) {
  return (type << 5) | (additional & 31);
}

function encodeItem(writer, value) {
  if (value === null) {
    writer.push(0xf6);
    return;
  }
  if (value === undefined) {
    writer.push(0xf7);
    return;
  }
  if (typeof value === 'boolean') {
    writer.push(value ? 0xf5 : 0xf4);
    return;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      if (value >= 0) {
        encodeUnsigned(writer, MAJOR_TYPES.UNSIGNED, value);
      } else {
        encodeUnsigned(writer, MAJOR_TYPES.NEGATIVE, -1 - value);
      }
      return;
    }
    // float64
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, value, false);
    writer.push(encodeMajorType(MAJOR_TYPES.SIMPLE_FLOAT, 27));
    writer.pushBytes(new Uint8Array(buf));
    return;
  }
  if (typeof value === 'bigint') {
    if (value >= 0n) {
      encodeUnsigned(writer, MAJOR_TYPES.UNSIGNED, value);
    } else {
      encodeUnsigned(writer, MAJOR_TYPES.NEGATIVE, -1n - value);
    }
    return;
  }
  if (value instanceof Uint8Array) {
    encodeUnsigned(writer, MAJOR_TYPES.BYTE_STRING, value.length);
    writer.pushBytes(value);
    return;
  }
  if (typeof value === 'string') {
    const utf8 = Buffer.from(value, 'utf-8');
    encodeUnsigned(writer, MAJOR_TYPES.TEXT_STRING, utf8.length);
    writer.pushBytes(utf8);
    return;
  }
  if (Array.isArray(value)) {
    encodeUnsigned(writer, MAJOR_TYPES.ARRAY, value.length);
    for (const item of value) {
      encodeItem(writer, item);
    }
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    encodeUnsigned(writer, MAJOR_TYPES.MAP, entries.length);
    for (const [key, val] of entries) {
      encodeItem(writer, key);
      encodeItem(writer, val);
    }
    return;
  }
  throw new Error(`Unsupported type: ${typeof value}`);
}

export function encodeDagCbor(value) {
  const writer = new ByteWriter();
  encodeItem(writer, value);
  return writer.result();
}
