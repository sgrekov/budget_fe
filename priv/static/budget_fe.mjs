// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label2) => label2 in fields ? fields[label2] : this[label2]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array3, tail) {
    let t = tail || new Empty();
    for (let i = array3.length - 1; i >= 0; --i) {
      t = new NonEmpty(array3[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length4 = 0;
    while (current) {
      current = current.tail;
      length4++;
    }
    return length4 - 1;
  }
};
function prepend(element2, tail) {
  return new NonEmpty(element2, tail);
}
function toList(elements2, tail) {
  return List.fromArray(elements2, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index5) {
    if (index5 < 0 || index5 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index5);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a2 = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a2 !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a2 = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a2 >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index5) {
  if (bitOffset === 0) {
    return buffer[index5] ?? 0;
  } else {
    const a2 = buffer[index5] << bitOffset & 255;
    const b = buffer[index5 + 1] >> 8 - bitOffset;
    return a2 | b;
  }
}
var UtfCodepoint = class {
  constructor(value3) {
    this.value = value3;
  }
};
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name, message) {
  if (isBitArrayDeprecationMessagePrinted[name]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name} property used in JavaScript FFI code. ${message}.`
  );
  isBitArrayDeprecationMessagePrinted[name] = true;
}
function bitArraySlice(bitArray, start3, end) {
  end ??= bitArray.bitSize;
  bitArrayValidateRange(bitArray, start3, end);
  if (start3 === end) {
    return new BitArray(new Uint8Array());
  }
  if (start3 === 0 && end === bitArray.bitSize) {
    return bitArray;
  }
  start3 += bitArray.bitOffset;
  end += bitArray.bitOffset;
  const startByteIndex = Math.trunc(start3 / 8);
  const endByteIndex = Math.trunc((end + 7) / 8);
  const byteLength = endByteIndex - startByteIndex;
  let buffer;
  if (startByteIndex === 0 && byteLength === bitArray.rawBuffer.byteLength) {
    buffer = bitArray.rawBuffer;
  } else {
    buffer = new Uint8Array(
      bitArray.rawBuffer.buffer,
      bitArray.rawBuffer.byteOffset + startByteIndex,
      byteLength
    );
  }
  return new BitArray(buffer, end - start3, start3 % 8);
}
function bitArraySliceToInt(bitArray, start3, end, isBigEndian, isSigned) {
  bitArrayValidateRange(bitArray, start3, end);
  if (start3 === end) {
    return 0;
  }
  start3 += bitArray.bitOffset;
  end += bitArray.bitOffset;
  const isStartByteAligned = start3 % 8 === 0;
  const isEndByteAligned = end % 8 === 0;
  if (isStartByteAligned && isEndByteAligned) {
    return intFromAlignedSlice(
      bitArray,
      start3 / 8,
      end / 8,
      isBigEndian,
      isSigned
    );
  }
  const size = end - start3;
  const startByteIndex = Math.trunc(start3 / 8);
  const endByteIndex = Math.trunc((end - 1) / 8);
  if (startByteIndex == endByteIndex) {
    const mask2 = 255 >> start3 % 8;
    const unusedLowBitCount = (8 - end % 8) % 8;
    let value3 = (bitArray.rawBuffer[startByteIndex] & mask2) >> unusedLowBitCount;
    if (isSigned) {
      const highBit = 2 ** (size - 1);
      if (value3 >= highBit) {
        value3 -= highBit * 2;
      }
    }
    return value3;
  }
  if (size <= 53) {
    return intFromUnalignedSliceUsingNumber(
      bitArray.rawBuffer,
      start3,
      end,
      isBigEndian,
      isSigned
    );
  } else {
    return intFromUnalignedSliceUsingBigInt(
      bitArray.rawBuffer,
      start3,
      end,
      isBigEndian,
      isSigned
    );
  }
}
function intFromAlignedSlice(bitArray, start3, end, isBigEndian, isSigned) {
  const byteSize = end - start3;
  if (byteSize <= 6) {
    return intFromAlignedSliceUsingNumber(
      bitArray.rawBuffer,
      start3,
      end,
      isBigEndian,
      isSigned
    );
  } else {
    return intFromAlignedSliceUsingBigInt(
      bitArray.rawBuffer,
      start3,
      end,
      isBigEndian,
      isSigned
    );
  }
}
function intFromAlignedSliceUsingNumber(buffer, start3, end, isBigEndian, isSigned) {
  const byteSize = end - start3;
  let value3 = 0;
  if (isBigEndian) {
    for (let i = start3; i < end; i++) {
      value3 *= 256;
      value3 += buffer[i];
    }
  } else {
    for (let i = end - 1; i >= start3; i--) {
      value3 *= 256;
      value3 += buffer[i];
    }
  }
  if (isSigned) {
    const highBit = 2 ** (byteSize * 8 - 1);
    if (value3 >= highBit) {
      value3 -= highBit * 2;
    }
  }
  return value3;
}
function intFromAlignedSliceUsingBigInt(buffer, start3, end, isBigEndian, isSigned) {
  const byteSize = end - start3;
  let value3 = 0n;
  if (isBigEndian) {
    for (let i = start3; i < end; i++) {
      value3 *= 256n;
      value3 += BigInt(buffer[i]);
    }
  } else {
    for (let i = end - 1; i >= start3; i--) {
      value3 *= 256n;
      value3 += BigInt(buffer[i]);
    }
  }
  if (isSigned) {
    const highBit = 1n << BigInt(byteSize * 8 - 1);
    if (value3 >= highBit) {
      value3 -= highBit * 2n;
    }
  }
  return Number(value3);
}
function intFromUnalignedSliceUsingNumber(buffer, start3, end, isBigEndian, isSigned) {
  const isStartByteAligned = start3 % 8 === 0;
  let size = end - start3;
  let byteIndex = Math.trunc(start3 / 8);
  let value3 = 0;
  if (isBigEndian) {
    if (!isStartByteAligned) {
      const leadingBitsCount = 8 - start3 % 8;
      value3 = buffer[byteIndex++] & (1 << leadingBitsCount) - 1;
      size -= leadingBitsCount;
    }
    while (size >= 8) {
      value3 *= 256;
      value3 += buffer[byteIndex++];
      size -= 8;
    }
    if (size > 0) {
      value3 *= 2 ** size;
      value3 += buffer[byteIndex] >> 8 - size;
    }
  } else {
    if (isStartByteAligned) {
      let size2 = end - start3;
      let scale = 1;
      while (size2 >= 8) {
        value3 += buffer[byteIndex++] * scale;
        scale *= 256;
        size2 -= 8;
      }
      value3 += (buffer[byteIndex] >> 8 - size2) * scale;
    } else {
      const highBitsCount = start3 % 8;
      const lowBitsCount = 8 - highBitsCount;
      let size2 = end - start3;
      let scale = 1;
      while (size2 >= 8) {
        const byte = buffer[byteIndex] << highBitsCount | buffer[byteIndex + 1] >> lowBitsCount;
        value3 += (byte & 255) * scale;
        scale *= 256;
        size2 -= 8;
        byteIndex++;
      }
      if (size2 > 0) {
        const lowBitsUsed = size2 - Math.max(0, size2 - lowBitsCount);
        let trailingByte = (buffer[byteIndex] & (1 << lowBitsCount) - 1) >> lowBitsCount - lowBitsUsed;
        size2 -= lowBitsUsed;
        if (size2 > 0) {
          trailingByte *= 2 ** size2;
          trailingByte += buffer[byteIndex + 1] >> 8 - size2;
        }
        value3 += trailingByte * scale;
      }
    }
  }
  if (isSigned) {
    const highBit = 2 ** (end - start3 - 1);
    if (value3 >= highBit) {
      value3 -= highBit * 2;
    }
  }
  return value3;
}
function intFromUnalignedSliceUsingBigInt(buffer, start3, end, isBigEndian, isSigned) {
  const isStartByteAligned = start3 % 8 === 0;
  let size = end - start3;
  let byteIndex = Math.trunc(start3 / 8);
  let value3 = 0n;
  if (isBigEndian) {
    if (!isStartByteAligned) {
      const leadingBitsCount = 8 - start3 % 8;
      value3 = BigInt(buffer[byteIndex++] & (1 << leadingBitsCount) - 1);
      size -= leadingBitsCount;
    }
    while (size >= 8) {
      value3 *= 256n;
      value3 += BigInt(buffer[byteIndex++]);
      size -= 8;
    }
    if (size > 0) {
      value3 <<= BigInt(size);
      value3 += BigInt(buffer[byteIndex] >> 8 - size);
    }
  } else {
    if (isStartByteAligned) {
      let size2 = end - start3;
      let shift = 0n;
      while (size2 >= 8) {
        value3 += BigInt(buffer[byteIndex++]) << shift;
        shift += 8n;
        size2 -= 8;
      }
      value3 += BigInt(buffer[byteIndex] >> 8 - size2) << shift;
    } else {
      const highBitsCount = start3 % 8;
      const lowBitsCount = 8 - highBitsCount;
      let size2 = end - start3;
      let shift = 0n;
      while (size2 >= 8) {
        const byte = buffer[byteIndex] << highBitsCount | buffer[byteIndex + 1] >> lowBitsCount;
        value3 += BigInt(byte & 255) << shift;
        shift += 8n;
        size2 -= 8;
        byteIndex++;
      }
      if (size2 > 0) {
        const lowBitsUsed = size2 - Math.max(0, size2 - lowBitsCount);
        let trailingByte = (buffer[byteIndex] & (1 << lowBitsCount) - 1) >> lowBitsCount - lowBitsUsed;
        size2 -= lowBitsUsed;
        if (size2 > 0) {
          trailingByte <<= size2;
          trailingByte += buffer[byteIndex + 1] >> 8 - size2;
        }
        value3 += BigInt(trailingByte) << shift;
      }
    }
  }
  if (isSigned) {
    const highBit = 2n ** BigInt(end - start3 - 1);
    if (value3 >= highBit) {
      value3 -= highBit * 2n;
    }
  }
  return Number(value3);
}
function bitArrayValidateRange(bitArray, start3, end) {
  if (start3 < 0 || start3 > bitArray.bitSize || end < start3 || end > bitArray.bitSize) {
    const msg = `Invalid bit array slice: start = ${start3}, end = ${end}, bit size = ${bitArray.bitSize}`;
    throw new globalThis.Error(msg);
  }
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value3) {
    super();
    this[0] = value3;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values2 = [x, y];
  while (values2.length) {
    let a2 = values2.pop();
    let b = values2.pop();
    if (a2 === b) continue;
    if (!isObject(a2) || !isObject(b)) return false;
    let unequal = !structurallyCompatibleObjects(a2, b) || unequalDates(a2, b) || unequalBuffers(a2, b) || unequalArrays(a2, b) || unequalMaps(a2, b) || unequalSets(a2, b) || unequalRegExps(a2, b);
    if (unequal) return false;
    const proto = Object.getPrototypeOf(a2);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a2.equals(b)) continue;
        else return false;
      } catch {
      }
    }
    let [keys2, get3] = getters(a2);
    for (let k of keys2(a2)) {
      values2.push(get3(a2, k), get3(b, k));
    }
  }
  return true;
}
function getters(object3) {
  if (object3 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object3 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a2, b) {
  return a2 instanceof Date && (a2 > b || a2 < b);
}
function unequalBuffers(a2, b) {
  return !(a2 instanceof BitArray) && a2.buffer instanceof ArrayBuffer && a2.BYTES_PER_ELEMENT && !(a2.byteLength === b.byteLength && a2.every((n, i) => n === b[i]));
}
function unequalArrays(a2, b) {
  return Array.isArray(a2) && a2.length !== b.length;
}
function unequalMaps(a2, b) {
  return a2 instanceof Map && a2.size !== b.size;
}
function unequalSets(a2, b) {
  return a2 instanceof Set && (a2.size != b.size || [...a2].some((e) => !b.has(e)));
}
function unequalRegExps(a2, b) {
  return a2 instanceof RegExp && (a2.source !== b.source || a2.flags !== b.flags);
}
function isObject(a2) {
  return typeof a2 === "object" && a2 !== null;
}
function structurallyCompatibleObjects(a2, b) {
  if (typeof a2 !== "object" && typeof b !== "object" && (!a2 || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a2 instanceof c)) return false;
  return a2.constructor === b.constructor;
}
function remainderInt(a2, b) {
  if (b === 0) {
    return 0;
  } else {
    return a2 % b;
  }
}
function divideInt(a2, b) {
  return Math.trunc(divideFloat(a2, b));
}
function divideFloat(a2, b) {
  if (b === 0) {
    return 0;
  } else {
    return a2 / b;
  }
}
function makeError(variant, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra) error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
var Lt = class extends CustomType {
};
var Eq = class extends CustomType {
};
var Gt = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var None = class extends CustomType {
};
function to_result(option2, e) {
  if (option2 instanceof Some) {
    let a2 = option2[0];
    return new Ok(a2);
  } else {
    return new Error(e);
  }
}
function from_result(result) {
  if (result.isOk()) {
    let a2 = result[0];
    return new Some(a2);
  } else {
    return new None();
  }
}
function unwrap(option2, default$) {
  if (option2 instanceof Some) {
    let x = option2[0];
    return x;
  } else {
    return default$;
  }
}
function map(option2, fun) {
  if (option2 instanceof Some) {
    let x = option2[0];
    return new Some(fun(x));
  } else {
    return new None();
  }
}
function flatten(option2) {
  if (option2 instanceof Some) {
    let x = option2[0];
    return x;
  } else {
    return new None();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function do_has_key(key, dict3) {
  return !isEqual(map_get(dict3, key), new Error(void 0));
}
function has_key(dict3, key) {
  return do_has_key(key, dict3);
}
function insert(dict3, key, value3) {
  return map_insert(key, value3, dict3);
}
function reverse_and_concat(loop$remaining, loop$accumulator) {
  while (true) {
    let remaining = loop$remaining;
    let accumulator = loop$accumulator;
    if (remaining.hasLength(0)) {
      return accumulator;
    } else {
      let first2 = remaining.head;
      let rest = remaining.tail;
      loop$remaining = rest;
      loop$accumulator = prepend(first2, accumulator);
    }
  }
}
function do_keys_loop(loop$list, loop$acc) {
  while (true) {
    let list3 = loop$list;
    let acc = loop$acc;
    if (list3.hasLength(0)) {
      return reverse_and_concat(acc, toList([]));
    } else {
      let key = list3.head[0];
      let rest = list3.tail;
      loop$list = rest;
      loop$acc = prepend(key, acc);
    }
  }
}
function keys(dict3) {
  return do_keys_loop(map_to_list(dict3), toList([]));
}
function fold_loop(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list3 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list3.hasLength(0)) {
      return initial;
    } else {
      let k = list3.head[0];
      let v = list3.head[1];
      let rest = list3.tail;
      loop$list = rest;
      loop$initial = fun(initial, k, v);
      loop$fun = fun;
    }
  }
}
function fold(dict3, initial, fun) {
  return fold_loop(map_to_list(dict3), initial, fun);
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
var Continue = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Stop = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Ascending = class extends CustomType {
};
var Descending = class extends CustomType {
};
function length_loop(loop$list, loop$count) {
  while (true) {
    let list3 = loop$list;
    let count = loop$count;
    if (list3.atLeastLength(1)) {
      let list$1 = list3.tail;
      loop$list = list$1;
      loop$count = count + 1;
    } else {
      return count;
    }
  }
}
function length(list3) {
  return length_loop(list3, 0);
}
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix.hasLength(0)) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list3) {
  return reverse_and_prepend(list3, toList([]));
}
function contains(loop$list, loop$elem) {
  while (true) {
    let list3 = loop$list;
    let elem = loop$elem;
    if (list3.hasLength(0)) {
      return false;
    } else if (list3.atLeastLength(1) && isEqual(list3.head, elem)) {
      let first$1 = list3.head;
      return true;
    } else {
      let rest$1 = list3.tail;
      loop$list = rest$1;
      loop$elem = elem;
    }
  }
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list3 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list3.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list3.head;
      let rest$1 = list3.tail;
      let _block;
      let $ = fun(first$1);
      if ($) {
        _block = prepend(first$1, acc);
      } else {
        _block = acc;
      }
      let new_acc = _block;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list3, predicate) {
  return filter_loop(list3, predicate, toList([]));
}
function filter_map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list3 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list3.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list3.head;
      let rest$1 = list3.tail;
      let _block;
      let $ = fun(first$1);
      if ($.isOk()) {
        let first$2 = $[0];
        _block = prepend(first$2, acc);
      } else {
        _block = acc;
      }
      let new_acc = _block;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter_map(list3, fun) {
  return filter_map_loop(list3, fun, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list3 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list3.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list3.head;
      let rest$1 = list3.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map2(list3, fun) {
  return map_loop(list3, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first2 = loop$first;
    let second = loop$second;
    if (first2.hasLength(0)) {
      return second;
    } else {
      let first$1 = first2.head;
      let rest$1 = first2.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first2, second) {
  return append_loop(reverse(first2), second);
}
function prepend2(list3, item) {
  return prepend(item, list3);
}
function flatten_loop(loop$lists, loop$acc) {
  while (true) {
    let lists = loop$lists;
    let acc = loop$acc;
    if (lists.hasLength(0)) {
      return reverse(acc);
    } else {
      let list3 = lists.head;
      let further_lists = lists.tail;
      loop$lists = further_lists;
      loop$acc = reverse_and_prepend(list3, acc);
    }
  }
}
function flatten2(lists) {
  return flatten_loop(lists, toList([]));
}
function flat_map(list3, fun) {
  let _pipe = map2(list3, fun);
  return flatten2(_pipe);
}
function fold2(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list3 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list3.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list3.head;
      let rest$1 = list3.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function index_fold_loop(loop$over, loop$acc, loop$with, loop$index) {
  while (true) {
    let over = loop$over;
    let acc = loop$acc;
    let with$ = loop$with;
    let index5 = loop$index;
    if (over.hasLength(0)) {
      return acc;
    } else {
      let first$1 = over.head;
      let rest$1 = over.tail;
      loop$over = rest$1;
      loop$acc = with$(acc, first$1, index5);
      loop$with = with$;
      loop$index = index5 + 1;
    }
  }
}
function index_fold(list3, initial, fun) {
  return index_fold_loop(list3, initial, fun, 0);
}
function fold_until(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list3 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list3.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list3.head;
      let rest$1 = list3.tail;
      let $ = fun(initial, first$1);
      if ($ instanceof Continue) {
        let next_accumulator = $[0];
        loop$list = rest$1;
        loop$initial = next_accumulator;
        loop$fun = fun;
      } else {
        let b = $[0];
        return b;
      }
    }
  }
}
function find(loop$list, loop$is_desired) {
  while (true) {
    let list3 = loop$list;
    let is_desired = loop$is_desired;
    if (list3.hasLength(0)) {
      return new Error(void 0);
    } else {
      let first$1 = list3.head;
      let rest$1 = list3.tail;
      let $ = is_desired(first$1);
      if ($) {
        return new Ok(first$1);
      } else {
        loop$list = rest$1;
        loop$is_desired = is_desired;
      }
    }
  }
}
function unique_loop(loop$list, loop$seen, loop$acc) {
  while (true) {
    let list3 = loop$list;
    let seen = loop$seen;
    let acc = loop$acc;
    if (list3.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list3.head;
      let rest$1 = list3.tail;
      let $ = has_key(seen, first$1);
      if ($) {
        loop$list = rest$1;
        loop$seen = seen;
        loop$acc = acc;
      } else {
        loop$list = rest$1;
        loop$seen = insert(seen, first$1, void 0);
        loop$acc = prepend(first$1, acc);
      }
    }
  }
}
function unique(list3) {
  return unique_loop(list3, new_map(), toList([]));
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list3 = loop$list;
    let compare4 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list3.hasLength(0)) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list3.head;
      let rest$1 = list3.tail;
      let $ = compare4(prev, new$1);
      if ($ instanceof Gt && direction instanceof Descending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Lt && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Eq && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Gt && direction instanceof Ascending) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next2 = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare4(new$1, next2);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next2;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Lt && direction instanceof Descending) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next2 = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare4(new$1, next2);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next2;
          loop$acc = acc$1;
        }
      } else {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next2 = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare4(new$1, next2);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next2;
          loop$acc = acc$1;
        }
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list3 = list22;
      return reverse_and_prepend(list3, acc);
    } else if (list22.hasLength(0)) {
      let list3 = list1;
      return reverse_and_prepend(list3, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (sequences2.hasLength(0)) {
      return reverse(acc);
    } else if (sequences2.hasLength(1)) {
      let sequence = sequences2.head;
      return reverse(prepend(reverse(sequence), acc));
    } else {
      let ascending1 = sequences2.head;
      let ascending2 = sequences2.tail.head;
      let rest$1 = sequences2.tail.tail;
      let descending = merge_ascendings(
        ascending1,
        ascending2,
        compare4,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare4;
      loop$acc = prepend(descending, acc);
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list3 = list22;
      return reverse_and_prepend(list3, acc);
    } else if (list22.hasLength(0)) {
      let list3 = list1;
      return reverse_and_prepend(list3, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (sequences2.hasLength(0)) {
      return reverse(acc);
    } else if (sequences2.hasLength(1)) {
      let sequence = sequences2.head;
      return reverse(prepend(reverse(sequence), acc));
    } else {
      let descending1 = sequences2.head;
      let descending2 = sequences2.tail.head;
      let rest$1 = sequences2.tail.tail;
      let ascending = merge_descendings(
        descending1,
        descending2,
        compare4,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare4;
      loop$acc = prepend(ascending, acc);
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare4 = loop$compare;
    if (sequences2.hasLength(0)) {
      return toList([]);
    } else if (sequences2.hasLength(1) && direction instanceof Ascending) {
      let sequence = sequences2.head;
      return sequence;
    } else if (sequences2.hasLength(1) && direction instanceof Descending) {
      let sequence = sequences2.head;
      return reverse(sequence);
    } else if (direction instanceof Ascending) {
      let sequences$1 = merge_ascending_pairs(sequences2, compare4, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Descending();
      loop$compare = compare4;
    } else {
      let sequences$1 = merge_descending_pairs(sequences2, compare4, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Ascending();
      loop$compare = compare4;
    }
  }
}
function sort(list3, compare4) {
  if (list3.hasLength(0)) {
    return toList([]);
  } else if (list3.hasLength(1)) {
    let x = list3.head;
    return toList([x]);
  } else {
    let x = list3.head;
    let y = list3.tail.head;
    let rest$1 = list3.tail.tail;
    let _block;
    let $ = compare4(x, y);
    if ($ instanceof Lt) {
      _block = new Ascending();
    } else if ($ instanceof Eq) {
      _block = new Ascending();
    } else {
      _block = new Descending();
    }
    let direction = _block;
    let sequences$1 = sequences(
      rest$1,
      compare4,
      toList([x]),
      direction,
      y,
      toList([])
    );
    return merge_all(sequences$1, new Ascending(), compare4);
  }
}
function key_set_loop(loop$list, loop$key, loop$value, loop$inspected) {
  while (true) {
    let list3 = loop$list;
    let key = loop$key;
    let value3 = loop$value;
    let inspected = loop$inspected;
    if (list3.atLeastLength(1) && isEqual(list3.head[0], key)) {
      let k = list3.head[0];
      let rest$1 = list3.tail;
      return reverse_and_prepend(inspected, prepend([k, value3], rest$1));
    } else if (list3.atLeastLength(1)) {
      let first$1 = list3.head;
      let rest$1 = list3.tail;
      loop$list = rest$1;
      loop$key = key;
      loop$value = value3;
      loop$inspected = prepend(first$1, inspected);
    } else {
      return reverse(prepend([key, value3], inspected));
    }
  }
}
function key_set(list3, key, value3) {
  return key_set_loop(list3, key, value3, toList([]));
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function is_ok(result) {
  if (!result.isOk()) {
    return false;
  } else {
    return true;
  }
}
function map3(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    let e = result[0];
    return new Error(e);
  }
}
function map_error(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(x);
  } else {
    let error = result[0];
    return new Error(fun(error));
  }
}
function try$(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return fun(x);
  } else {
    let e = result[0];
    return new Error(e);
  }
}
function then$(result, fun) {
  return try$(result, fun);
}
function unwrap2(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic.mjs
var DecodeError = class extends CustomType {
  constructor(expected, found, path) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path;
  }
};
function map_errors(result, f) {
  return map_error(
    result,
    (_capture) => {
      return map2(_capture, f);
    }
  );
}
function string(data) {
  return decode_string(data);
}
function bool(data) {
  return decode_bool(data);
}
function do_any(decoders) {
  return (data) => {
    if (decoders.hasLength(0)) {
      return new Error(
        toList([new DecodeError("another type", classify_dynamic(data), toList([]))])
      );
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder(data);
      if ($.isOk()) {
        let decoded = $[0];
        return new Ok(decoded);
      } else {
        return do_any(decoders$1)(data);
      }
    }
  };
}
function push_path(error, name) {
  let name$1 = identity(name);
  let decoder = do_any(
    toList([
      decode_string,
      (x) => {
        return map3(decode_int(x), to_string);
      }
    ])
  );
  let _block;
  let $ = decoder(name$1);
  if ($.isOk()) {
    let name$22 = $[0];
    _block = name$22;
  } else {
    let _pipe = toList(["<", classify_dynamic(name$1), ">"]);
    let _pipe$1 = concat(_pipe);
    _block = identity(_pipe$1);
  }
  let name$2 = _block;
  let _record = error;
  return new DecodeError(
    _record.expected,
    _record.found,
    prepend(name$2, error.path)
  );
}
function field(name, inner_type) {
  return (value3) => {
    let missing_field_error = new DecodeError("field", "nothing", toList([]));
    return try$(
      decode_field(value3, name),
      (maybe_inner) => {
        let _pipe = maybe_inner;
        let _pipe$1 = to_result(_pipe, toList([missing_field_error]));
        let _pipe$2 = try$(_pipe$1, inner_type);
        return map_errors(
          _pipe$2,
          (_capture) => {
            return push_path(_capture, name);
          }
        );
      }
    );
  };
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = /* @__PURE__ */ new DataView(
  /* @__PURE__ */ new ArrayBuffer(8)
);
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a2, b) {
  return a2 ^ b + 2654435769 + (a2 << 6) + (a2 >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null) return 1108378658;
  if (u === void 0) return 1108378659;
  if (u === true) return 1108378657;
  if (u === false) return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root, shift, hash, key, val, addedLeaf) {
  switch (root.type) {
    case ARRAY_NODE:
      return assocArray(root, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root.size + 1,
      array: cloneAndSet(root.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root;
      }
      return {
        type: ARRAY_NODE,
        size: root.size,
        array: cloneAndSet(root.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root.size,
      array: cloneAndSet(
        root.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root;
  }
  return {
    type: ARRAY_NODE,
    size: root.size,
    array: cloneAndSet(root.array, idx, n)
  };
}
function assocIndex(root, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root.bitmap, bit);
  if ((root.bitmap & bit) !== 0) {
    const node = root.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root;
      }
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root;
      }
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap,
      array: cloneAndSet(
        root.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray2 = spliceIn(root.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap | bit,
        array: newArray2
      };
    }
  }
}
function assocCollision(root, shift, hash, key, val, addedLeaf) {
  if (hash === root.hash) {
    const idx = collisionIndexOf(root, key);
    if (idx !== -1) {
      const entry = root.array[idx];
      if (entry.v === val) {
        return root;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size = root.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root.array, size, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root.hash, shift),
      array: [root]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root, key) {
  const size = root.array.length;
  for (let i = 0; i < size; i++) {
    if (isEqual(key, root.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find2(root, shift, hash, key) {
  switch (root.type) {
    case ARRAY_NODE:
      return findArray(root, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root, key);
  }
}
function findArray(root, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find2(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root.bitmap, bit);
  const node = root.array[idx];
  if (node.type !== ENTRY) {
    return find2(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root, key) {
  const idx = collisionIndexOf(root, key);
  if (idx < 0) {
    return void 0;
  }
  return root.array[idx];
}
function without(root, shift, hash, key) {
  switch (root.type) {
    case ARRAY_NODE:
      return withoutArray(root, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root, key);
  }
}
function withoutArray(root, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    return root;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root;
    }
  }
  if (n === void 0) {
    if (root.size <= MIN_ARRAY_NODE) {
      const arr = root.array;
      const out = new Array(root.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root.size - 1,
      array: cloneAndSet(root.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root.size,
    array: cloneAndSet(root.array, idx, n)
  };
}
function withoutIndex(root, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root.bitmap & bit) === 0) {
    return root;
  }
  const idx = index(root.bitmap, bit);
  const node = root.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, n)
      };
    }
    if (root.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap ^ bit,
      array: spliceOut(root.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap ^ bit,
      array: spliceOut(root.array, idx)
    };
  }
  return root;
}
function withoutCollision(root, key) {
  const idx = collisionIndexOf(root, key);
  if (idx < 0) {
    return root;
  }
  if (root.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root.hash,
    array: spliceOut(root.array, idx)
  };
}
function forEach(root, fn) {
  if (root === void 0) {
    return;
  }
  const items = root.array;
  const size = items.length;
  for (let i = 0; i < size; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root, size) {
    this.root = root;
    this.size = size;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find2(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find2(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = /* @__PURE__ */ Symbol();

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
var NOT_FOUND = {};
function identity(x) {
  return x;
}
function parse_int(value3) {
  if (/^[-+]?(\d+)$/.test(value3)) {
    return new Ok(parseInt(value3));
  } else {
    return new Error(Nil);
  }
}
function to_string(term) {
  return term.toString();
}
function float_to_string(float4) {
  const string5 = float4.toString().replace("+", "");
  if (string5.indexOf(".") >= 0) {
    return string5;
  } else {
    const index5 = string5.indexOf("e");
    if (index5 >= 0) {
      return string5.slice(0, index5) + ".0" + string5.slice(index5);
    } else {
      return string5 + ".0";
    }
  }
}
function int_to_base_string(int4, base) {
  return int4.toString(base).toUpperCase();
}
function string_replace(string5, target, substitute) {
  if (typeof string5.replaceAll !== "undefined") {
    return string5.replaceAll(target, substitute);
  }
  return string5.replace(
    // $& means the whole matched string
    new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    substitute
  );
}
function string_length(string5) {
  if (string5 === "") {
    return 0;
  }
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    let i = 0;
    for (const _ of iterator) {
      i++;
    }
    return i;
  } else {
    return string5.match(/./gsu).length;
  }
}
function graphemes(string5) {
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    return List.fromArray(Array.from(iterator).map((item) => item.segment));
  } else {
    return List.fromArray(string5.match(/./gsu));
  }
}
var segmenter = void 0;
function graphemes_iterator(string5) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string5)[Symbol.iterator]();
  }
}
function pop_grapheme(string5) {
  let first2;
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    first2 = iterator.next().value?.segment;
  } else {
    first2 = string5.match(/./su)?.[0];
  }
  if (first2) {
    return new Ok([first2, string5.slice(first2.length)]);
  } else {
    return new Error(Nil);
  }
}
function lowercase(string5) {
  return string5.toLowerCase();
}
function split(xs, pattern) {
  return List.fromArray(xs.split(pattern));
}
function concat(xs) {
  let result = "";
  for (const x of xs) {
    result = result + x;
  }
  return result;
}
function string_slice(string5, idx, len) {
  if (len <= 0 || idx >= string5.length) {
    return "";
  }
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    while (idx-- > 0) {
      iterator.next();
    }
    let result = "";
    while (len-- > 0) {
      const v = iterator.next().value;
      if (v === void 0) {
        break;
      }
      result += v.segment;
    }
    return result;
  } else {
    return string5.match(/./gsu).slice(idx, idx + len).join("");
  }
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(
  `^[${unicode_whitespaces}]*`
);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function print_debug(string5) {
  if (typeof process === "object" && process.stderr?.write) {
    process.stderr.write(string5 + "\n");
  } else if (typeof Deno === "object") {
    Deno.stderr.writeSync(new TextEncoder().encode(string5 + "\n"));
  } else {
    console.log(string5);
  }
}
function floor(float4) {
  return Math.floor(float4);
}
function round2(float4) {
  return Math.round(float4);
}
function truncate(float4) {
  return Math.trunc(float4);
}
function random_uniform() {
  const random_uniform_result = Math.random();
  if (random_uniform_result === 1) {
    return random_uniform();
  }
  return random_uniform_result;
}
function new_map() {
  return Dict.new();
}
function map_to_list(map8) {
  return List.fromArray(map8.entries());
}
function map_get(map8, key) {
  const value3 = map8.get(key, NOT_FOUND);
  if (value3 === NOT_FOUND) {
    return new Error(Nil);
  }
  return new Ok(value3);
}
function map_insert(key, value3, map8) {
  return map8.set(key, value3);
}
function classify_dynamic(data) {
  if (typeof data === "string") {
    return "String";
  } else if (typeof data === "boolean") {
    return "Bool";
  } else if (data instanceof Result) {
    return "Result";
  } else if (data instanceof List) {
    return "List";
  } else if (data instanceof BitArray) {
    return "BitArray";
  } else if (data instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data)) {
    return "Int";
  } else if (Array.isArray(data)) {
    return `Tuple of ${data.length} elements`;
  } else if (typeof data === "number") {
    return "Float";
  } else if (data === null) {
    return "Null";
  } else if (data === void 0) {
    return "Nil";
  } else {
    const type = typeof data;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function decoder_error(expected, got) {
  return decoder_error_no_classify(expected, classify_dynamic(got));
}
function decoder_error_no_classify(expected, got) {
  return new Error(
    List.fromArray([new DecodeError(expected, got, List.fromArray([]))])
  );
}
function decode_string(data) {
  return typeof data === "string" ? new Ok(data) : decoder_error("String", data);
}
function decode_int(data) {
  return Number.isInteger(data) ? new Ok(data) : decoder_error("Int", data);
}
function decode_bool(data) {
  return typeof data === "boolean" ? new Ok(data) : decoder_error("Bool", data);
}
function decode_field(value3, name) {
  const not_a_map_error = () => decoder_error("Dict", value3);
  if (value3 instanceof Dict || value3 instanceof WeakMap || value3 instanceof Map) {
    const entry = map_get(value3, name);
    return new Ok(entry.isOk() ? new Some(entry[0]) : new None());
  } else if (value3 === null) {
    return not_a_map_error();
  } else if (Object.getPrototypeOf(value3) == Object.prototype) {
    return try_get_field(value3, name, () => new Ok(new None()));
  } else {
    return try_get_field(value3, name, not_a_map_error);
  }
}
function try_get_field(value3, field4, or_else) {
  try {
    return field4 in value3 ? new Ok(new Some(value3[field4])) : or_else();
  } catch {
    return or_else();
  }
}
function bitwise_and(x, y) {
  return Number(BigInt(x) & BigInt(y));
}
function bitwise_or(x, y) {
  return Number(BigInt(x) | BigInt(y));
}
function inspect(v) {
  const t = typeof v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null) return "//js(null)";
  if (v === void 0) return "Nil";
  if (t === "string") return inspectString(v);
  if (t === "bigint" || Number.isInteger(v)) return v.toString();
  if (t === "number") return float_to_string(v);
  if (Array.isArray(v)) return `#(${v.map(inspect).join(", ")})`;
  if (v instanceof List) return inspectList(v);
  if (v instanceof UtfCodepoint) return inspectUtfCodepoint(v);
  if (v instanceof BitArray) return `<<${bit_array_inspect(v, "")}>>`;
  if (v instanceof CustomType) return inspectCustomType(v);
  if (v instanceof Dict) return inspectDict(v);
  if (v instanceof Set) return `//js(Set(${[...v].map(inspect).join(", ")}))`;
  if (v instanceof RegExp) return `//js(${v})`;
  if (v instanceof Date) return `//js(Date("${v.toISOString()}"))`;
  if (v instanceof Function) {
    const args = [];
    for (const i of Array(v.length).keys())
      args.push(String.fromCharCode(i + 97));
    return `//fn(${args.join(", ")}) { ... }`;
  }
  return inspectObject(v);
}
function inspectString(str) {
  let new_str = '"';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    switch (char) {
      case "\n":
        new_str += "\\n";
        break;
      case "\r":
        new_str += "\\r";
        break;
      case "	":
        new_str += "\\t";
        break;
      case "\f":
        new_str += "\\f";
        break;
      case "\\":
        new_str += "\\\\";
        break;
      case '"':
        new_str += '\\"';
        break;
      default:
        if (char < " " || char > "~" && char < "\xA0") {
          new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
        } else {
          new_str += char;
        }
    }
  }
  new_str += '"';
  return new_str;
}
function inspectDict(map8) {
  let body = "dict.from_list([";
  let first2 = true;
  map8.forEach((value3, key) => {
    if (!first2) body = body + ", ";
    body = body + "#(" + inspect(key) + ", " + inspect(value3) + ")";
    first2 = false;
  });
  return body + "])";
}
function inspectObject(v) {
  const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${inspect(k)}: ${inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name === "Object" ? "" : name + " ";
  return `//js(${head}{${body}})`;
}
function inspectCustomType(record) {
  const props = Object.keys(record).map((label2) => {
    const value3 = inspect(record[label2]);
    return isNaN(parseInt(label2)) ? `${label2}: ${value3}` : value3;
  }).join(", ");
  return props ? `${record.constructor.name}(${props})` : record.constructor.name;
}
function inspectList(list3) {
  return `[${list3.toArray().map(inspect).join(", ")}]`;
}
function inspectUtfCodepoint(codepoint2) {
  return `//utfcodepoint(${String.fromCodePoint(codepoint2.value)})`;
}
function bit_array_inspect(bits, acc) {
  if (bits.bitSize === 0) {
    return acc;
  }
  for (let i = 0; i < bits.byteSize - 1; i++) {
    acc += bits.byteAt(i).toString();
    acc += ", ";
  }
  if (bits.byteSize * 8 === bits.bitSize) {
    acc += bits.byteAt(bits.byteSize - 1).toString();
  } else {
    const trailingBitsCount = bits.bitSize % 8;
    acc += bits.byteAt(bits.byteSize - 1) >> 8 - trailingBitsCount;
    acc += `:size(${trailingBitsCount})`;
  }
  return acc;
}

// build/dev/javascript/gleam_stdlib/gleam/float.mjs
function negate(x) {
  return -1 * x;
}
function round(x) {
  let $ = x >= 0;
  if ($) {
    return round2(x);
  } else {
    return 0 - round2(negate(x));
  }
}

// build/dev/javascript/gleam_stdlib/gleam/int.mjs
function absolute_value(x) {
  let $ = x >= 0;
  if ($) {
    return x;
  } else {
    return x * -1;
  }
}
function to_base16(x) {
  return int_to_base_string(x, 16);
}
function compare2(a2, b) {
  let $ = a2 === b;
  if ($) {
    return new Eq();
  } else {
    let $1 = a2 < b;
    if ($1) {
      return new Lt();
    } else {
      return new Gt();
    }
  }
}
function min(a2, b) {
  let $ = a2 < b;
  if ($) {
    return a2;
  } else {
    return b;
  }
}
function max(a2, b) {
  let $ = a2 > b;
  if ($) {
    return a2;
  } else {
    return b;
  }
}
function clamp(x, min_bound, max_bound) {
  let _pipe = x;
  let _pipe$1 = min(_pipe, max_bound);
  return max(_pipe$1, min_bound);
}
function random(max2) {
  let _pipe = random_uniform() * identity(max2);
  let _pipe$1 = floor(_pipe);
  return round(_pipe$1);
}
function divide(dividend, divisor) {
  if (divisor === 0) {
    return new Error(void 0);
  } else {
    let divisor$1 = divisor;
    return new Ok(divideInt(dividend, divisor$1));
  }
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function replace(string5, pattern, substitute) {
  let _pipe = string5;
  let _pipe$1 = identity(_pipe);
  let _pipe$2 = string_replace(_pipe$1, pattern, substitute);
  return identity(_pipe$2);
}
function slice(string5, idx, len) {
  let $ = len < 0;
  if ($) {
    return "";
  } else {
    let $1 = idx < 0;
    if ($1) {
      let translated_idx = string_length(string5) + idx;
      let $2 = translated_idx < 0;
      if ($2) {
        return "";
      } else {
        return string_slice(string5, translated_idx, len);
      }
    } else {
      return string_slice(string5, idx, len);
    }
  }
}
function concat2(strings) {
  let _pipe = strings;
  let _pipe$1 = concat(_pipe);
  return identity(_pipe$1);
}
function repeat_loop(loop$string, loop$times, loop$acc) {
  while (true) {
    let string5 = loop$string;
    let times = loop$times;
    let acc = loop$acc;
    let $ = times <= 0;
    if ($) {
      return acc;
    } else {
      loop$string = string5;
      loop$times = times - 1;
      loop$acc = acc + string5;
    }
  }
}
function repeat(string5, times) {
  return repeat_loop(string5, times, "");
}
function padding(size, pad_string) {
  let pad_string_length = string_length(pad_string);
  let num_pads = divideInt(size, pad_string_length);
  let extra = remainderInt(size, pad_string_length);
  return repeat(pad_string, num_pads) + slice(pad_string, 0, extra);
}
function pad_start(string5, desired_length, pad_string) {
  let current_length = string_length(string5);
  let to_pad_length = desired_length - current_length;
  let $ = to_pad_length <= 0;
  if ($) {
    return string5;
  } else {
    return padding(to_pad_length, pad_string) + string5;
  }
}
function pad_end(string5, desired_length, pad_string) {
  let current_length = string_length(string5);
  let to_pad_length = desired_length - current_length;
  let $ = to_pad_length <= 0;
  if ($) {
    return string5;
  } else {
    return string5 + padding(to_pad_length, pad_string);
  }
}
function drop_start(loop$string, loop$num_graphemes) {
  while (true) {
    let string5 = loop$string;
    let num_graphemes = loop$num_graphemes;
    let $ = num_graphemes > 0;
    if (!$) {
      return string5;
    } else {
      let $1 = pop_grapheme(string5);
      if ($1.isOk()) {
        let string$1 = $1[0][1];
        loop$string = string$1;
        loop$num_graphemes = num_graphemes - 1;
      } else {
        return string5;
      }
    }
  }
}
function split2(x, substring) {
  if (substring === "") {
    return graphemes(x);
  } else {
    let _pipe = x;
    let _pipe$1 = identity(_pipe);
    let _pipe$2 = split(_pipe$1, substring);
    return map2(_pipe$2, identity);
  }
}
function inspect2(term) {
  let _pipe = inspect(term);
  return identity(_pipe);
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib_decode_ffi.mjs
function index2(data, key) {
  if (data instanceof Dict || data instanceof WeakMap || data instanceof Map) {
    const token3 = {};
    const entry = data.get(key, token3);
    if (entry === token3) return new Ok(new None());
    return new Ok(new Some(entry));
  }
  const key_is_int = Number.isInteger(key);
  if (key_is_int && key >= 0 && key < 8 && data instanceof List) {
    let i = 0;
    for (const value3 of data) {
      if (i === key) return new Ok(new Some(value3));
      i++;
    }
    return new Error("Indexable");
  }
  if (key_is_int && Array.isArray(data) || data && typeof data === "object" || data && Object.getPrototypeOf(data) === Object.prototype) {
    if (key in data) return new Ok(new Some(data[key]));
    return new Ok(new None());
  }
  return new Error(key_is_int ? "Indexable" : "Dict");
}
function list(data, decode2, pushPath, index5, emptyList) {
  if (!(data instanceof List || Array.isArray(data))) {
    const error = new DecodeError2("List", classify_dynamic(data), emptyList);
    return [emptyList, List.fromArray([error])];
  }
  const decoded = [];
  for (const element2 of data) {
    const layer = decode2(element2);
    const [out, errors] = layer;
    if (errors instanceof NonEmpty) {
      const [_, errors2] = pushPath(layer, index5.toString());
      return [emptyList, errors2];
    }
    decoded.push(out);
    index5++;
  }
  return [List.fromArray(decoded), emptyList];
}
function dict(data) {
  if (data instanceof Dict) {
    return new Ok(data);
  }
  if (data instanceof Map || data instanceof WeakMap) {
    return new Ok(Dict.fromMap(data));
  }
  if (data == null) {
    return new Error("Dict");
  }
  if (typeof data !== "object") {
    return new Error("Dict");
  }
  const proto = Object.getPrototypeOf(data);
  if (proto === Object.prototype || proto === null) {
    return new Ok(Dict.fromObject(data));
  }
  return new Error("Dict");
}
function int(data) {
  if (Number.isInteger(data)) return new Ok(data);
  return new Error(0);
}
function string2(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error(0);
}
function is_null(data) {
  return data === null || data === void 0;
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
var DecodeError2 = class extends CustomType {
  constructor(expected, found, path) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path;
  }
};
var Decoder = class extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
};
function run(data, decoder) {
  let $ = decoder.function(data);
  let maybe_invalid_data = $[0];
  let errors = $[1];
  if (errors.hasLength(0)) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error(errors);
  }
}
function success(data) {
  return new Decoder((_) => {
    return [data, toList([])];
  });
}
function map4(decoder, transformer) {
  return new Decoder(
    (d) => {
      let $ = decoder.function(d);
      let data = $[0];
      let errors = $[1];
      return [transformer(data), errors];
    }
  );
}
function run_decoders(loop$data, loop$failure, loop$decoders) {
  while (true) {
    let data = loop$data;
    let failure = loop$failure;
    let decoders = loop$decoders;
    if (decoders.hasLength(0)) {
      return failure;
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder.function(data);
      let layer = $;
      let errors = $[1];
      if (errors.hasLength(0)) {
        return layer;
      } else {
        loop$data = data;
        loop$failure = failure;
        loop$decoders = decoders$1;
      }
    }
  }
}
function one_of(first2, alternatives) {
  return new Decoder(
    (dynamic_data) => {
      let $ = first2.function(dynamic_data);
      let layer = $;
      let errors = $[1];
      if (errors.hasLength(0)) {
        return layer;
      } else {
        return run_decoders(dynamic_data, layer, alternatives);
      }
    }
  );
}
function optional(inner) {
  return new Decoder(
    (data) => {
      let $ = is_null(data);
      if ($) {
        return [new None(), toList([])];
      } else {
        let $1 = inner.function(data);
        let data$1 = $1[0];
        let errors = $1[1];
        return [new Some(data$1), errors];
      }
    }
  );
}
function decode_error(expected, found) {
  return toList([
    new DecodeError2(expected, classify_dynamic(found), toList([]))
  ]);
}
function run_dynamic_function(data, name, f) {
  let $ = f(data);
  if ($.isOk()) {
    let data$1 = $[0];
    return [data$1, toList([])];
  } else {
    let zero = $[0];
    return [
      zero,
      toList([new DecodeError2(name, classify_dynamic(data), toList([]))])
    ];
  }
}
function decode_bool2(data) {
  let $ = isEqual(identity(true), data);
  if ($) {
    return [true, toList([])];
  } else {
    let $1 = isEqual(identity(false), data);
    if ($1) {
      return [false, toList([])];
    } else {
      return [false, decode_error("Bool", data)];
    }
  }
}
function decode_int2(data) {
  return run_dynamic_function(data, "Int", int);
}
var bool2 = /* @__PURE__ */ new Decoder(decode_bool2);
var int2 = /* @__PURE__ */ new Decoder(decode_int2);
function decode_string2(data) {
  return run_dynamic_function(data, "String", string2);
}
var string3 = /* @__PURE__ */ new Decoder(decode_string2);
function fold_dict(acc, key, value3, key_decoder, value_decoder) {
  let $ = key_decoder(key);
  if ($[1].hasLength(0)) {
    let key$1 = $[0];
    let $1 = value_decoder(value3);
    if ($1[1].hasLength(0)) {
      let value$1 = $1[0];
      let dict$1 = insert(acc[0], key$1, value$1);
      return [dict$1, acc[1]];
    } else {
      let errors = $1[1];
      return push_path2([new_map(), errors], toList(["values"]));
    }
  } else {
    let errors = $[1];
    return push_path2([new_map(), errors], toList(["keys"]));
  }
}
function dict2(key, value3) {
  return new Decoder(
    (data) => {
      let $ = dict(data);
      if (!$.isOk()) {
        return [new_map(), decode_error("Dict", data)];
      } else {
        let dict$1 = $[0];
        return fold(
          dict$1,
          [new_map(), toList([])],
          (a2, k, v) => {
            let $1 = a2[1];
            if ($1.hasLength(0)) {
              return fold_dict(a2, k, v, key.function, value3.function);
            } else {
              return a2;
            }
          }
        );
      }
    }
  );
}
function list2(inner) {
  return new Decoder(
    (data) => {
      return list(
        data,
        inner.function,
        (p, k) => {
          return push_path2(p, toList([k]));
        },
        0,
        toList([])
      );
    }
  );
}
function push_path2(layer, path) {
  let decoder = one_of(
    string3,
    toList([
      (() => {
        let _pipe = int2;
        return map4(_pipe, to_string);
      })()
    ])
  );
  let path$1 = map2(
    path,
    (key) => {
      let key$1 = identity(key);
      let $ = run(key$1, decoder);
      if ($.isOk()) {
        let key$2 = $[0];
        return key$2;
      } else {
        return "<" + classify_dynamic(key$1) + ">";
      }
    }
  );
  let errors = map2(
    layer[1],
    (error) => {
      let _record = error;
      return new DecodeError2(
        _record.expected,
        _record.found,
        append(path$1, error.path)
      );
    }
  );
  return [layer[0], errors];
}
function index3(loop$path, loop$position, loop$inner, loop$data, loop$handle_miss) {
  while (true) {
    let path = loop$path;
    let position = loop$position;
    let inner = loop$inner;
    let data = loop$data;
    let handle_miss = loop$handle_miss;
    if (path.hasLength(0)) {
      let _pipe = inner(data);
      return push_path2(_pipe, reverse(position));
    } else {
      let key = path.head;
      let path$1 = path.tail;
      let $ = index2(data, key);
      if ($.isOk() && $[0] instanceof Some) {
        let data$1 = $[0][0];
        loop$path = path$1;
        loop$position = prepend(key, position);
        loop$inner = inner;
        loop$data = data$1;
        loop$handle_miss = handle_miss;
      } else if ($.isOk() && $[0] instanceof None) {
        return handle_miss(data, prepend(key, position));
      } else {
        let kind = $[0];
        let $1 = inner(data);
        let default$ = $1[0];
        let _pipe = [
          default$,
          toList([new DecodeError2(kind, classify_dynamic(data), toList([]))])
        ];
        return push_path2(_pipe, reverse(position));
      }
    }
  }
}
function subfield(field_path, field_decoder, next2) {
  return new Decoder(
    (data) => {
      let $ = index3(
        field_path,
        toList([]),
        field_decoder.function,
        data,
        (data2, position) => {
          let $12 = field_decoder.function(data2);
          let default$ = $12[0];
          let _pipe = [
            default$,
            toList([new DecodeError2("Field", "Nothing", toList([]))])
          ];
          return push_path2(_pipe, reverse(position));
        }
      );
      let out = $[0];
      let errors1 = $[1];
      let $1 = next2(out).function(data);
      let out$1 = $1[0];
      let errors2 = $1[1];
      return [out$1, append(errors1, errors2)];
    }
  );
}
function field2(field_name, field_decoder, next2) {
  return subfield(toList([field_name]), field_decoder, next2);
}

// build/dev/javascript/gleam_json/gleam_json_ffi.mjs
function json_to_string(json) {
  return JSON.stringify(json);
}
function object(entries) {
  return Object.fromEntries(entries);
}
function identity2(x) {
  return x;
}
function do_null() {
  return null;
}
function decode(string5) {
  try {
    const result = JSON.parse(string5);
    return new Ok(result);
  } catch (err) {
    return new Error(getJsonDecodeError(err, string5));
  }
}
function getJsonDecodeError(stdErr, json) {
  if (isUnexpectedEndOfInput(stdErr)) return new UnexpectedEndOfInput();
  return toUnexpectedByteError(stdErr, json);
}
function isUnexpectedEndOfInput(err) {
  const unexpectedEndOfInputRegex = /((unexpected (end|eof))|(end of data)|(unterminated string)|(json( parse error|\.parse)\: expected '(\:|\}|\])'))/i;
  return unexpectedEndOfInputRegex.test(err.message);
}
function toUnexpectedByteError(err, json) {
  let converters = [
    v8UnexpectedByteError,
    oldV8UnexpectedByteError,
    jsCoreUnexpectedByteError,
    spidermonkeyUnexpectedByteError
  ];
  for (let converter of converters) {
    let result = converter(err, json);
    if (result) return result;
  }
  return new UnexpectedByte("", 0);
}
function v8UnexpectedByteError(err) {
  const regex = /unexpected token '(.)', ".+" is not valid JSON/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[1]);
  return new UnexpectedByte(byte, -1);
}
function oldV8UnexpectedByteError(err) {
  const regex = /unexpected token (.) in JSON at position (\d+)/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[1]);
  const position = Number(match[2]);
  return new UnexpectedByte(byte, position);
}
function spidermonkeyUnexpectedByteError(err, json) {
  const regex = /(unexpected character|expected .*) at line (\d+) column (\d+)/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const line = Number(match[2]);
  const column3 = Number(match[3]);
  const position = getPositionFromMultiline(line, column3, json);
  const byte = toHex(json[position]);
  return new UnexpectedByte(byte, position);
}
function jsCoreUnexpectedByteError(err) {
  const regex = /unexpected (identifier|token) "(.)"/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[2]);
  return new UnexpectedByte(byte, 0);
}
function toHex(char) {
  return "0x" + char.charCodeAt(0).toString(16).toUpperCase();
}
function getPositionFromMultiline(line, column3, string5) {
  if (line === 1) return column3 - 1;
  let currentLn = 1;
  let position = 0;
  string5.split("").find((char, idx) => {
    if (char === "\n") currentLn += 1;
    if (currentLn === line) {
      position = idx + column3;
      return true;
    }
    return false;
  });
  return position;
}

// build/dev/javascript/gleam_json/gleam/json.mjs
var UnexpectedEndOfInput = class extends CustomType {
};
var UnexpectedByte = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UnableToDecode = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
function do_parse(json, decoder) {
  return then$(
    decode(json),
    (dynamic_value) => {
      let _pipe = run(dynamic_value, decoder);
      return map_error(
        _pipe,
        (var0) => {
          return new UnableToDecode(var0);
        }
      );
    }
  );
}
function parse(json, decoder) {
  return do_parse(json, decoder);
}
function to_string2(json) {
  return json_to_string(json);
}
function string4(input2) {
  return identity2(input2);
}
function bool3(input2) {
  return identity2(input2);
}
function int3(input2) {
  return identity2(input2);
}
function null$() {
  return do_null();
}
function nullable(input2, inner_type) {
  if (input2 instanceof Some) {
    let value3 = input2[0];
    return inner_type(value3);
  } else {
    return null$();
  }
}
function object2(entries) {
  return object(entries);
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/io.mjs
function debug(term) {
  let _pipe = term;
  let _pipe$1 = inspect2(_pipe);
  print_debug(_pipe$1);
  return term;
}

// build/dev/javascript/gleam_regexp/gleam_regexp_ffi.mjs
function check(regex, string5) {
  regex.lastIndex = 0;
  return regex.test(string5);
}
function compile(pattern, options) {
  try {
    let flags = "gu";
    if (options.case_insensitive) flags += "i";
    if (options.multi_line) flags += "m";
    return new Ok(new RegExp(pattern, flags));
  } catch (error) {
    const number = (error.columnNumber || 0) | 0;
    return new Error(new CompileError(error.message, number));
  }
}

// build/dev/javascript/gleam_regexp/gleam/regexp.mjs
var CompileError = class extends CustomType {
  constructor(error, byte_index) {
    super();
    this.error = error;
    this.byte_index = byte_index;
  }
};
var Options = class extends CustomType {
  constructor(case_insensitive, multi_line) {
    super();
    this.case_insensitive = case_insensitive;
    this.multi_line = multi_line;
  }
};
function compile2(pattern, options) {
  return compile(pattern, options);
}
function check2(regexp, string5) {
  return check(regexp, string5);
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict3) {
    super();
    this.dict = dict3;
  }
};
function new$() {
  return new Set2(new_map());
}
function contains2(set2, member) {
  let _pipe = set2.dict;
  let _pipe$1 = map_get(_pipe, member);
  return is_ok(_pipe$1);
}
var token = void 0;
function from_list2(members) {
  let dict3 = fold2(
    members,
    new_map(),
    (m, k) => {
      return insert(m, k, token);
    }
  );
  return new Set2(dict3);
}

// build/dev/javascript/nibble/nibble/lexer.mjs
var Matcher = class extends CustomType {
  constructor(run4) {
    super();
    this.run = run4;
  }
};
var Keep = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Skip = class extends CustomType {
};
var Drop = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var NoMatch = class extends CustomType {
};
var Token = class extends CustomType {
  constructor(span, lexeme, value3) {
    super();
    this.span = span;
    this.lexeme = lexeme;
    this.value = value3;
  }
};
var Span = class extends CustomType {
  constructor(row_start, col_start, row_end, col_end) {
    super();
    this.row_start = row_start;
    this.col_start = col_start;
    this.row_end = row_end;
    this.col_end = col_end;
  }
};
var NoMatchFound = class extends CustomType {
  constructor(row, col, lexeme) {
    super();
    this.row = row;
    this.col = col;
    this.lexeme = lexeme;
  }
};
var Lexer = class extends CustomType {
  constructor(matchers) {
    super();
    this.matchers = matchers;
  }
};
var State = class extends CustomType {
  constructor(source, tokens, current, row, col) {
    super();
    this.source = source;
    this.tokens = tokens;
    this.current = current;
    this.row = row;
    this.col = col;
  }
};
function simple(matchers) {
  return new Lexer((_) => {
    return matchers;
  });
}
function keep(f) {
  return new Matcher(
    (mode, lexeme, lookahead) => {
      let _pipe = f(lexeme, lookahead);
      let _pipe$1 = map3(
        _pipe,
        (_capture) => {
          return new Keep(_capture, mode);
        }
      );
      return unwrap2(_pipe$1, new NoMatch());
    }
  );
}
function custom(f) {
  return new Matcher(f);
}
function do_match(mode, str, lookahead, matchers) {
  return fold_until(
    matchers,
    new NoMatch(),
    (_, matcher) => {
      let $ = matcher.run(mode, str, lookahead);
      if ($ instanceof Keep) {
        let match = $;
        return new Stop(match);
      } else if ($ instanceof Skip) {
        return new Stop(new Skip());
      } else if ($ instanceof Drop) {
        let match = $;
        return new Stop(match);
      } else {
        return new Continue(new NoMatch());
      }
    }
  );
}
function next_col(col, str) {
  if (str === "\n") {
    return 1;
  } else {
    return col + 1;
  }
}
function next_row(row, str) {
  if (str === "\n") {
    return row + 1;
  } else {
    return row;
  }
}
function do_run(loop$lexer, loop$mode, loop$state) {
  while (true) {
    let lexer2 = loop$lexer;
    let mode = loop$mode;
    let state = loop$state;
    let matchers = lexer2.matchers(mode);
    let $ = state.source;
    let $1 = state.current;
    if ($.hasLength(0) && $1[2] === "") {
      return new Ok(reverse(state.tokens));
    } else if ($.hasLength(0)) {
      let start_row = $1[0];
      let start_col = $1[1];
      let lexeme = $1[2];
      let $2 = do_match(mode, lexeme, "", matchers);
      if ($2 instanceof NoMatch) {
        return new Error(new NoMatchFound(start_row, start_col, lexeme));
      } else if ($2 instanceof Skip) {
        return new Error(new NoMatchFound(start_row, start_col, lexeme));
      } else if ($2 instanceof Drop) {
        return new Ok(reverse(state.tokens));
      } else {
        let value3 = $2[0];
        let span = new Span(start_row, start_col, state.row, state.col);
        let token$1 = new Token(span, lexeme, value3);
        return new Ok(reverse(prepend(token$1, state.tokens)));
      }
    } else {
      let lookahead = $.head;
      let rest = $.tail;
      let start_row = $1[0];
      let start_col = $1[1];
      let lexeme = $1[2];
      let row = next_row(state.row, lookahead);
      let col = next_col(state.col, lookahead);
      let $2 = do_match(mode, lexeme, lookahead, matchers);
      if ($2 instanceof Keep) {
        let value3 = $2[0];
        let mode$1 = $2[1];
        let span = new Span(start_row, start_col, state.row, state.col);
        let token$1 = new Token(span, lexeme, value3);
        loop$lexer = lexer2;
        loop$mode = mode$1;
        loop$state = new State(
          rest,
          prepend(token$1, state.tokens),
          [state.row, state.col, lookahead],
          row,
          col
        );
      } else if ($2 instanceof Skip) {
        loop$lexer = lexer2;
        loop$mode = mode;
        loop$state = new State(
          rest,
          state.tokens,
          [start_row, start_col, lexeme + lookahead],
          row,
          col
        );
      } else if ($2 instanceof Drop) {
        let mode$1 = $2[0];
        loop$lexer = lexer2;
        loop$mode = mode$1;
        loop$state = new State(
          rest,
          state.tokens,
          [state.row, state.col, lookahead],
          row,
          col
        );
      } else {
        loop$lexer = lexer2;
        loop$mode = mode;
        loop$state = new State(
          rest,
          state.tokens,
          [start_row, start_col, lexeme + lookahead],
          row,
          col
        );
      }
    }
  }
}
function run2(source, lexer2) {
  let _pipe = graphemes(source);
  let _pipe$1 = new State(_pipe, toList([]), [1, 1, ""], 1, 1);
  return ((_capture) => {
    return do_run(lexer2, void 0, _capture);
  })(_pipe$1);
}

// build/dev/javascript/nibble/glearray_ffi.mjs
function fromList(list3) {
  return list3.toArray();
}
function arrayLength(array3) {
  return array3.length;
}
function get(array3, index5) {
  return array3[index5];
}

// build/dev/javascript/nibble/nibble/vendor/glearray.mjs
function is_valid_index(array3, index5) {
  return index5 >= 0 && index5 < arrayLength(array3);
}
function get2(array3, index5) {
  let $ = is_valid_index(array3, index5);
  if ($) {
    return new Ok(get(array3, index5));
  } else {
    return new Error(void 0);
  }
}

// build/dev/javascript/nibble/nibble.mjs
var Parser = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Cont = class extends CustomType {
  constructor(x0, x1, x2) {
    super();
    this[0] = x0;
    this[1] = x1;
    this[2] = x2;
  }
};
var Fail = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var State2 = class extends CustomType {
  constructor(src, idx, pos, ctx) {
    super();
    this.src = src;
    this.idx = idx;
    this.pos = pos;
    this.ctx = ctx;
  }
};
var CanBacktrack = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var EndOfInput = class extends CustomType {
};
var Expected = class extends CustomType {
  constructor(x0, got) {
    super();
    this[0] = x0;
    this.got = got;
  }
};
var Unexpected = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var DeadEnd = class extends CustomType {
  constructor(pos, problem, context) {
    super();
    this.pos = pos;
    this.problem = problem;
    this.context = context;
  }
};
var Empty2 = class extends CustomType {
};
var Cons = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Append = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function runwrap(state, parser3) {
  let parse4 = parser3[0];
  return parse4(state);
}
function next(state) {
  let $ = get2(state.src, state.idx);
  if (!$.isOk()) {
    return [new None(), state];
  } else {
    let span$1 = $[0].span;
    let tok = $[0].value;
    return [
      new Some(tok),
      (() => {
        let _record = state;
        return new State2(_record.src, state.idx + 1, span$1, _record.ctx);
      })()
    ];
  }
}
function return$(value3) {
  return new Parser(
    (state) => {
      return new Cont(new CanBacktrack(false), value3, state);
    }
  );
}
function succeed(value3) {
  return return$(value3);
}
function backtrackable(parser3) {
  return new Parser(
    (state) => {
      let $ = runwrap(state, parser3);
      if ($ instanceof Cont) {
        let a2 = $[1];
        let state$1 = $[2];
        return new Cont(new CanBacktrack(false), a2, state$1);
      } else {
        let bag = $[1];
        return new Fail(new CanBacktrack(false), bag);
      }
    }
  );
}
function should_commit(a2, b) {
  let a$1 = a2[0];
  let b$1 = b[0];
  return new CanBacktrack(a$1 || b$1);
}
function do$(parser3, f) {
  return new Parser(
    (state) => {
      let $ = runwrap(state, parser3);
      if ($ instanceof Cont) {
        let to_a = $[0];
        let a2 = $[1];
        let state$1 = $[2];
        let $1 = runwrap(state$1, f(a2));
        if ($1 instanceof Cont) {
          let to_b = $1[0];
          let b = $1[1];
          let state$2 = $1[2];
          return new Cont(should_commit(to_a, to_b), b, state$2);
        } else {
          let to_b = $1[0];
          let bag = $1[1];
          return new Fail(should_commit(to_a, to_b), bag);
        }
      } else {
        let can_backtrack = $[0];
        let bag = $[1];
        return new Fail(can_backtrack, bag);
      }
    }
  );
}
function then$3(parser3, f) {
  return do$(parser3, f);
}
function map5(parser3, f) {
  return do$(parser3, (a2) => {
    return return$(f(a2));
  });
}
function take_while(predicate) {
  return new Parser(
    (state) => {
      let $ = next(state);
      let tok = $[0];
      let next_state = $[1];
      let $1 = map(tok, predicate);
      if (tok instanceof Some && $1 instanceof Some && $1[0]) {
        let tok$1 = tok[0];
        return runwrap(
          next_state,
          do$(
            take_while(predicate),
            (toks) => {
              return return$(prepend(tok$1, toks));
            }
          )
        );
      } else if (tok instanceof Some && $1 instanceof Some && !$1[0]) {
        return new Cont(new CanBacktrack(false), toList([]), state);
      } else {
        return new Cont(new CanBacktrack(false), toList([]), state);
      }
    }
  );
}
function take_exactly(parser3, count) {
  if (count === 0) {
    return return$(toList([]));
  } else {
    return do$(
      parser3,
      (x) => {
        return do$(
          take_exactly(parser3, count - 1),
          (xs) => {
            return return$(prepend(x, xs));
          }
        );
      }
    );
  }
}
function bag_from_state(state, problem) {
  return new Cons(new Empty2(), new DeadEnd(state.pos, problem, state.ctx));
}
function token2(tok) {
  return new Parser(
    (state) => {
      let $ = next(state);
      if ($[0] instanceof Some && isEqual(tok, $[0][0])) {
        let t = $[0][0];
        let state$1 = $[1];
        return new Cont(new CanBacktrack(true), void 0, state$1);
      } else if ($[0] instanceof Some) {
        let t = $[0][0];
        let state$1 = $[1];
        return new Fail(
          new CanBacktrack(false),
          bag_from_state(state$1, new Expected(inspect2(tok), t))
        );
      } else {
        let state$1 = $[1];
        return new Fail(
          new CanBacktrack(false),
          bag_from_state(state$1, new EndOfInput())
        );
      }
    }
  );
}
function eof() {
  return new Parser(
    (state) => {
      let $ = next(state);
      if ($[0] instanceof Some) {
        let tok = $[0][0];
        let state$1 = $[1];
        return new Fail(
          new CanBacktrack(false),
          bag_from_state(state$1, new Unexpected(tok))
        );
      } else {
        return new Cont(new CanBacktrack(false), void 0, state);
      }
    }
  );
}
function take_if(expecting, predicate) {
  return new Parser(
    (state) => {
      let $ = next(state);
      let tok = $[0];
      let next_state = $[1];
      let $1 = map(tok, predicate);
      if (tok instanceof Some && $1 instanceof Some && $1[0]) {
        let tok$1 = tok[0];
        return new Cont(new CanBacktrack(false), tok$1, next_state);
      } else if (tok instanceof Some && $1 instanceof Some && !$1[0]) {
        let tok$1 = tok[0];
        return new Fail(
          new CanBacktrack(false),
          bag_from_state(next_state, new Expected(expecting, tok$1))
        );
      } else {
        return new Fail(
          new CanBacktrack(false),
          bag_from_state(next_state, new EndOfInput())
        );
      }
    }
  );
}
function take_while1(expecting, predicate) {
  return do$(
    take_if(expecting, predicate),
    (x) => {
      return do$(
        take_while(predicate),
        (xs) => {
          return return$(prepend(x, xs));
        }
      );
    }
  );
}
function to_deadends(loop$bag, loop$acc) {
  while (true) {
    let bag = loop$bag;
    let acc = loop$acc;
    if (bag instanceof Empty2) {
      return acc;
    } else if (bag instanceof Cons && bag[0] instanceof Empty2) {
      let deadend = bag[1];
      return prepend(deadend, acc);
    } else if (bag instanceof Cons) {
      let bag$1 = bag[0];
      let deadend = bag[1];
      loop$bag = bag$1;
      loop$acc = prepend(deadend, acc);
    } else {
      let left = bag[0];
      let right = bag[1];
      loop$bag = left;
      loop$acc = to_deadends(right, acc);
    }
  }
}
function run3(src, parser3) {
  let init4 = new State2(
    fromList(src),
    0,
    new Span(1, 1, 1, 1),
    toList([])
  );
  let $ = runwrap(init4, parser3);
  if ($ instanceof Cont) {
    let a2 = $[1];
    return new Ok(a2);
  } else {
    let bag = $[1];
    return new Error(to_deadends(bag, toList([])));
  }
}
function add_bag_to_step(step, left) {
  if (step instanceof Cont) {
    let can_backtrack = step[0];
    let a2 = step[1];
    let state = step[2];
    return new Cont(can_backtrack, a2, state);
  } else {
    let can_backtrack = step[0];
    let right = step[1];
    return new Fail(can_backtrack, new Append(left, right));
  }
}
function one_of2(parsers) {
  return new Parser(
    (state) => {
      let init4 = new Fail(new CanBacktrack(false), new Empty2());
      return fold_until(
        parsers,
        init4,
        (result, next2) => {
          if (result instanceof Cont) {
            return new Stop(result);
          } else if (result instanceof Fail && result[0] instanceof CanBacktrack && result[0][0]) {
            return new Stop(result);
          } else {
            let bag = result[1];
            let _pipe = runwrap(state, next2);
            let _pipe$1 = add_bag_to_step(_pipe, bag);
            return new Continue(_pipe$1);
          }
        }
      );
    }
  );
}
function optional2(parser3) {
  return one_of2(
    toList([
      map5(parser3, (var0) => {
        return new Some(var0);
      }),
      return$(new None())
    ])
  );
}

// build/dev/javascript/rada/rada/date/parse.mjs
var Digit = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var WeekToken = class extends CustomType {
};
var Dash = class extends CustomType {
};
var TimeToken = class extends CustomType {
};
var Other = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
function lexer() {
  let options = new Options(false, true);
  let $ = compile2("^[0-9]+$", options);
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "rada/date/parse",
      14,
      "lexer",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  let digits_regex = $[0];
  let is_digits = (str) => {
    return check2(digits_regex, str);
  };
  return simple(
    toList([
      custom(
        (mode, lexeme, _) => {
          if (lexeme === "") {
            return new Drop(mode);
          } else if (lexeme === "W") {
            return new Keep(new WeekToken(), mode);
          } else if (lexeme === "T") {
            return new Keep(new TimeToken(), mode);
          } else if (lexeme === "-") {
            return new Keep(new Dash(), mode);
          } else {
            let $1 = is_digits(lexeme);
            if ($1) {
              return new Keep(new Digit(lexeme), mode);
            } else {
              return new Keep(new Other(lexeme), mode);
            }
          }
        }
      )
    ])
  );
}

// build/dev/javascript/rada/rada/date/pattern.mjs
var Field = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Literal = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Alpha = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Quote = class extends CustomType {
};
var EscapedQuote = class extends CustomType {
};
var Text = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
function is_alpha(token3) {
  if (token3 instanceof Alpha) {
    return true;
  } else {
    return false;
  }
}
function is_specific_alpha(char) {
  return (token3) => {
    if (token3 instanceof Alpha) {
      let c = token3[0];
      return c === char;
    } else {
      return false;
    }
  };
}
function is_text(token3) {
  if (token3 instanceof Text) {
    return true;
  } else {
    return false;
  }
}
function is_quote(token3) {
  if (token3 instanceof Quote) {
    return true;
  } else {
    return false;
  }
}
function extract_content(tokens) {
  if (tokens.hasLength(0)) {
    return "";
  } else {
    let token3 = tokens.head;
    let rest = tokens.tail;
    if (token3 instanceof Alpha) {
      let str = token3[0];
      return str + extract_content(rest);
    } else if (token3 instanceof Quote) {
      return "'" + extract_content(rest);
    } else if (token3 instanceof EscapedQuote) {
      return "'" + extract_content(rest);
    } else {
      let str = token3[0];
      return str + extract_content(rest);
    }
  }
}
function field3() {
  return do$(
    take_if("Expecting an Alpha token", is_alpha),
    (alpha) => {
      if (!(alpha instanceof Alpha)) {
        throw makeError(
          "let_assert",
          "rada/date/pattern",
          170,
          "",
          "Pattern match failed, no pattern matched the value.",
          { value: alpha }
        );
      }
      let char = alpha[0];
      return do$(
        take_while(is_specific_alpha(char)),
        (rest) => {
          return return$(new Field(char, length(rest) + 1));
        }
      );
    }
  );
}
function escaped_quote() {
  let _pipe = token2(new EscapedQuote());
  return then$3(
    _pipe,
    (_) => {
      return succeed(new Literal("'"));
    }
  );
}
function literal() {
  return do$(
    take_if("Expecting an Text token", is_text),
    (text3) => {
      return do$(
        take_while(is_text),
        (rest) => {
          let _block;
          let _pipe = map2(
            prepend(text3, rest),
            (entry) => {
              if (!(entry instanceof Text)) {
                throw makeError(
                  "let_assert",
                  "rada/date/pattern",
                  216,
                  "",
                  "Pattern match failed, no pattern matched the value.",
                  { value: entry }
                );
              }
              let text$1 = entry[0];
              return text$1;
            }
          );
          _block = concat2(_pipe);
          let joined = _block;
          return return$(new Literal(joined));
        }
      );
    }
  );
}
function quoted_help(result) {
  return one_of2(
    toList([
      do$(
        take_while1(
          "Expecting a non-Quote",
          (token3) => {
            return !is_quote(token3);
          }
        ),
        (tokens) => {
          let str = extract_content(tokens);
          return quoted_help(result + str);
        }
      ),
      (() => {
        let _pipe = token2(new EscapedQuote());
        return then$3(
          _pipe,
          (_) => {
            return quoted_help(result + "'");
          }
        );
      })(),
      succeed(result)
    ])
  );
}
function quoted() {
  return do$(
    take_if("Expecting an Quote", is_quote),
    (_) => {
      return do$(
        quoted_help(""),
        (text3) => {
          return do$(
            one_of2(
              toList([
                (() => {
                  let _pipe = take_if("Expecting an Quote", is_quote);
                  return map5(_pipe, (_2) => {
                    return void 0;
                  });
                })(),
                eof()
              ])
            ),
            (_2) => {
              return return$(new Literal(text3));
            }
          );
        }
      );
    }
  );
}
function finalize(tokens) {
  return fold2(
    tokens,
    toList([]),
    (tokens2, token3) => {
      if (token3 instanceof Literal && tokens2.atLeastLength(1) && tokens2.head instanceof Literal) {
        let x = token3[0];
        let y = tokens2.head[0];
        let rest = tokens2.tail;
        return prepend(new Literal(x + y), rest);
      } else {
        return prepend(token3, tokens2);
      }
    }
  );
}
function parser(tokens) {
  return one_of2(
    toList([
      (() => {
        let _pipe = one_of2(
          toList([field3(), literal(), escaped_quote(), quoted()])
        );
        return then$3(
          _pipe,
          (token3) => {
            return parser(prepend(token3, tokens));
          }
        );
      })(),
      succeed(finalize(tokens))
    ])
  );
}
function from_string2(str) {
  let _block;
  let _pipe = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let _pipe$1 = graphemes(_pipe);
  _block = from_list2(_pipe$1);
  let alpha = _block;
  let is_alpha$1 = (char) => {
    return contains2(alpha, char);
  };
  let l = simple(
    toList([
      keep(
        (lexeme, _) => {
          let $ = is_alpha$1(lexeme);
          if ($) {
            return new Ok(new Alpha(lexeme));
          } else {
            return new Error(void 0);
          }
        }
      ),
      custom(
        (mode, lexeme, next_grapheme) => {
          if (lexeme === "'") {
            if (next_grapheme === "'") {
              return new Skip();
            } else {
              return new Keep(new Quote(), mode);
            }
          } else if (lexeme === "''") {
            return new Keep(new EscapedQuote(), mode);
          } else {
            return new NoMatch();
          }
        }
      ),
      keep(
        (lexeme, _) => {
          if (lexeme === "") {
            return new Error(void 0);
          } else {
            return new Ok(new Text(lexeme));
          }
        }
      )
    ])
  );
  let tokens_result = run2(str, l);
  if (tokens_result.isOk()) {
    let tokens = tokens_result[0];
    let _pipe$2 = run3(tokens, parser(toList([])));
    return unwrap2(_pipe$2, toList([new Literal(str)]));
  } else {
    return toList([]);
  }
}

// build/dev/javascript/rada/rada_ffi.mjs
function get_year_month_day() {
  let date = /* @__PURE__ */ new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

// build/dev/javascript/rada/rada/date.mjs
var Jan = class extends CustomType {
};
var Feb = class extends CustomType {
};
var Mar = class extends CustomType {
};
var Apr = class extends CustomType {
};
var May = class extends CustomType {
};
var Jun = class extends CustomType {
};
var Jul = class extends CustomType {
};
var Aug = class extends CustomType {
};
var Sep = class extends CustomType {
};
var Oct = class extends CustomType {
};
var Nov = class extends CustomType {
};
var Dec = class extends CustomType {
};
var Mon = class extends CustomType {
};
var Tue = class extends CustomType {
};
var Wed = class extends CustomType {
};
var Thu = class extends CustomType {
};
var Fri = class extends CustomType {
};
var Sat = class extends CustomType {
};
var Sun = class extends CustomType {
};
var RD = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var OrdinalDate = class extends CustomType {
  constructor(year2, ordinal_day2) {
    super();
    this.year = year2;
    this.ordinal_day = ordinal_day2;
  }
};
var CalendarDate = class extends CustomType {
  constructor(year2, month2, day2) {
    super();
    this.year = year2;
    this.month = month2;
    this.day = day2;
  }
};
var WeekDate = class extends CustomType {
  constructor(week_year2, week_number2, weekday2) {
    super();
    this.week_year = week_year2;
    this.week_number = week_number2;
    this.weekday = weekday2;
  }
};
var Language = class extends CustomType {
  constructor(month_name, month_name_short, weekday_name, weekday_name_short, day_with_suffix) {
    super();
    this.month_name = month_name;
    this.month_name_short = month_name_short;
    this.weekday_name = weekday_name;
    this.weekday_name_short = weekday_name_short;
    this.day_with_suffix = day_with_suffix;
  }
};
var MonthAndDay = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var WeekAndWeekday = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var OrdinalDay = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Years = class extends CustomType {
};
var Months = class extends CustomType {
};
var Weeks = class extends CustomType {
};
function from_rata_die(rd) {
  return new RD(rd);
}
function to_rata_die(date) {
  let rd = date[0];
  return rd;
}
function string_take_right(str, count) {
  return slice(str, -1 * count, count);
}
function string_take_left(str, count) {
  return slice(str, 0, count);
}
function month_to_name(month2) {
  if (month2 instanceof Jan) {
    return "January";
  } else if (month2 instanceof Feb) {
    return "February";
  } else if (month2 instanceof Mar) {
    return "March";
  } else if (month2 instanceof Apr) {
    return "April";
  } else if (month2 instanceof May) {
    return "May";
  } else if (month2 instanceof Jun) {
    return "June";
  } else if (month2 instanceof Jul) {
    return "July";
  } else if (month2 instanceof Aug) {
    return "August";
  } else if (month2 instanceof Sep) {
    return "September";
  } else if (month2 instanceof Oct) {
    return "October";
  } else if (month2 instanceof Nov) {
    return "November";
  } else {
    return "December";
  }
}
function weekday_to_name(weekday2) {
  if (weekday2 instanceof Mon) {
    return "Monday";
  } else if (weekday2 instanceof Tue) {
    return "Tuesday";
  } else if (weekday2 instanceof Wed) {
    return "Wednesday";
  } else if (weekday2 instanceof Thu) {
    return "Thursday";
  } else if (weekday2 instanceof Fri) {
    return "Friday";
  } else if (weekday2 instanceof Sat) {
    return "Saturday";
  } else {
    return "Sunday";
  }
}
function parse_digit() {
  return take_if(
    "Expecting digit",
    (token3) => {
      if (token3 instanceof Digit) {
        return true;
      } else {
        return false;
      }
    }
  );
}
function int_4() {
  return do$(
    optional2(token2(new Dash())),
    (negative) => {
      let _block;
      let _pipe = negative;
      let _pipe$1 = map(_pipe, (_) => {
        return "-";
      });
      _block = unwrap(_pipe$1, "");
      let negative$1 = _block;
      return do$(
        (() => {
          let _pipe$2 = parse_digit();
          return take_exactly(_pipe$2, 4);
        })(),
        (tokens) => {
          let _block$1;
          let _pipe$2 = map2(
            tokens,
            (token3) => {
              if (!(token3 instanceof Digit)) {
                throw makeError(
                  "let_assert",
                  "rada/date",
                  1090,
                  "",
                  "Pattern match failed, no pattern matched the value.",
                  { value: token3 }
                );
              }
              let str2 = token3[0];
              return str2;
            }
          );
          _block$1 = concat2(_pipe$2);
          let str = _block$1;
          let $ = parse_int(negative$1 + str);
          if (!$.isOk()) {
            throw makeError(
              "let_assert",
              "rada/date",
              1095,
              "",
              "Pattern match failed, no pattern matched the value.",
              { value: $ }
            );
          }
          let int4 = $[0];
          return return$(int4);
        }
      );
    }
  );
}
function int_3() {
  return do$(
    (() => {
      let _pipe = parse_digit();
      return take_exactly(_pipe, 3);
    })(),
    (tokens) => {
      let _block;
      let _pipe = map2(
        tokens,
        (token3) => {
          if (!(token3 instanceof Digit)) {
            throw makeError(
              "let_assert",
              "rada/date",
              1108,
              "",
              "Pattern match failed, no pattern matched the value.",
              { value: token3 }
            );
          }
          let str2 = token3[0];
          return str2;
        }
      );
      _block = concat2(_pipe);
      let str = _block;
      let $ = parse_int(str);
      if (!$.isOk()) {
        throw makeError(
          "let_assert",
          "rada/date",
          1113,
          "",
          "Pattern match failed, no pattern matched the value.",
          { value: $ }
        );
      }
      let int4 = $[0];
      return return$(int4);
    }
  );
}
function parse_ordinal_day() {
  return do$(
    int_3(),
    (day2) => {
      return return$(new OrdinalDay(day2));
    }
  );
}
function int_2() {
  return do$(
    (() => {
      let _pipe = parse_digit();
      return take_exactly(_pipe, 2);
    })(),
    (tokens) => {
      let _block;
      let _pipe = map2(
        tokens,
        (token3) => {
          if (!(token3 instanceof Digit)) {
            throw makeError(
              "let_assert",
              "rada/date",
              1126,
              "",
              "Pattern match failed, no pattern matched the value.",
              { value: token3 }
            );
          }
          let str2 = token3[0];
          return str2;
        }
      );
      _block = concat2(_pipe);
      let str = _block;
      let $ = parse_int(str);
      if (!$.isOk()) {
        throw makeError(
          "let_assert",
          "rada/date",
          1131,
          "",
          "Pattern match failed, no pattern matched the value.",
          { value: $ }
        );
      }
      let int4 = $[0];
      return return$(int4);
    }
  );
}
function int_1() {
  return do$(
    (() => {
      let _pipe = parse_digit();
      return take_exactly(_pipe, 1);
    })(),
    (tokens) => {
      if (!tokens.hasLength(1) || !(tokens.head instanceof Digit)) {
        throw makeError(
          "let_assert",
          "rada/date",
          1142,
          "",
          "Pattern match failed, no pattern matched the value.",
          { value: tokens }
        );
      }
      let str = tokens.head[0];
      let $ = parse_int(str);
      if (!$.isOk()) {
        throw makeError(
          "let_assert",
          "rada/date",
          1144,
          "",
          "Pattern match failed, no pattern matched the value.",
          { value: $ }
        );
      }
      let int4 = $[0];
      return return$(int4);
    }
  );
}
function compare3(date1, date2) {
  let rd_1 = date1[0];
  let rd_2 = date2[0];
  return compare2(rd_1, rd_2);
}
function month_to_number(month2) {
  if (month2 instanceof Jan) {
    return 1;
  } else if (month2 instanceof Feb) {
    return 2;
  } else if (month2 instanceof Mar) {
    return 3;
  } else if (month2 instanceof Apr) {
    return 4;
  } else if (month2 instanceof May) {
    return 5;
  } else if (month2 instanceof Jun) {
    return 6;
  } else if (month2 instanceof Jul) {
    return 7;
  } else if (month2 instanceof Aug) {
    return 8;
  } else if (month2 instanceof Sep) {
    return 9;
  } else if (month2 instanceof Oct) {
    return 10;
  } else if (month2 instanceof Nov) {
    return 11;
  } else {
    return 12;
  }
}
function month_to_quarter(month2) {
  return divideInt(month_to_number(month2) + 2, 3);
}
function number_to_month(month_number2) {
  let $ = max(1, month_number2);
  if ($ === 1) {
    return new Jan();
  } else if ($ === 2) {
    return new Feb();
  } else if ($ === 3) {
    return new Mar();
  } else if ($ === 4) {
    return new Apr();
  } else if ($ === 5) {
    return new May();
  } else if ($ === 6) {
    return new Jun();
  } else if ($ === 7) {
    return new Jul();
  } else if ($ === 8) {
    return new Aug();
  } else if ($ === 9) {
    return new Sep();
  } else if ($ === 10) {
    return new Oct();
  } else if ($ === 11) {
    return new Nov();
  } else {
    return new Dec();
  }
}
function number_to_weekday(weekday_number2) {
  let $ = max(1, weekday_number2);
  if ($ === 1) {
    return new Mon();
  } else if ($ === 2) {
    return new Tue();
  } else if ($ === 3) {
    return new Wed();
  } else if ($ === 4) {
    return new Thu();
  } else if ($ === 5) {
    return new Fri();
  } else if ($ === 6) {
    return new Sat();
  } else {
    return new Sun();
  }
}
function pad_signed_int(value3, length4) {
  let _block;
  let $ = value3 < 0;
  if ($) {
    _block = "-";
  } else {
    _block = "";
  }
  let prefix = _block;
  let _block$1;
  let _pipe = value3;
  let _pipe$1 = absolute_value(_pipe);
  let _pipe$2 = to_string(_pipe$1);
  _block$1 = pad_start(_pipe$2, length4, "0");
  let suffix = _block$1;
  return prefix + suffix;
}
function floor_div(dividend, divisor) {
  let $ = (dividend > 0 && divisor < 0 || dividend < 0 && divisor > 0) && remainderInt(
    dividend,
    divisor
  ) !== 0;
  if ($) {
    return divideInt(dividend, divisor) - 1;
  } else {
    return divideInt(dividend, divisor);
  }
}
function days_before_year(year1) {
  let year$1 = year1 - 1;
  let leap_years = floor_div(year$1, 4) - floor_div(year$1, 100) + floor_div(
    year$1,
    400
  );
  return 365 * year$1 + leap_years;
}
function first_of_year(year2) {
  return new RD(days_before_year(year2) + 1);
}
function modulo_unwrap(dividend, divisor) {
  let remainder = remainderInt(dividend, divisor);
  let $ = remainder > 0 && divisor < 0 || remainder < 0 && divisor > 0;
  if ($) {
    return remainder + divisor;
  } else {
    return remainder;
  }
}
function is_leap_year(year2) {
  return modulo_unwrap(year2, 4) === 0 && modulo_unwrap(year2, 100) !== 0 || modulo_unwrap(
    year2,
    400
  ) === 0;
}
function weekday_number(date) {
  let rd = date[0];
  let $ = modulo_unwrap(rd, 7);
  if ($ === 0) {
    return 7;
  } else {
    let n = $;
    return n;
  }
}
function days_before_week_year(year2) {
  let jan4 = days_before_year(year2) + 4;
  return jan4 - weekday_number(new RD(jan4));
}
function is_53_week_year(year2) {
  let wdn_jan1 = weekday_number(first_of_year(year2));
  return wdn_jan1 === 4 || wdn_jan1 === 3 && is_leap_year(year2);
}
function weekday(date) {
  let _pipe = date;
  let _pipe$1 = weekday_number(_pipe);
  return number_to_weekday(_pipe$1);
}
function ordinal_suffix(value3) {
  let value_mod_100 = modulo_unwrap(value3, 100);
  let _block;
  let $ = value_mod_100 < 20;
  if ($) {
    _block = value_mod_100;
  } else {
    _block = modulo_unwrap(value_mod_100, 10);
  }
  let value$1 = _block;
  let $1 = min(value$1, 4);
  if ($1 === 1) {
    return "st";
  } else if ($1 === 2) {
    return "nd";
  } else if ($1 === 3) {
    return "rd";
  } else {
    return "th";
  }
}
function with_ordinal_suffix(value3) {
  return to_string(value3) + ordinal_suffix(value3);
}
function language_en() {
  return new Language(
    month_to_name,
    (val) => {
      let _pipe = val;
      let _pipe$1 = month_to_name(_pipe);
      return string_take_left(_pipe$1, 3);
    },
    weekday_to_name,
    (val) => {
      let _pipe = val;
      let _pipe$1 = weekday_to_name(_pipe);
      return string_take_left(_pipe$1, 3);
    },
    with_ordinal_suffix
  );
}
function days_in_month(year2, month2) {
  if (month2 instanceof Jan) {
    return 31;
  } else if (month2 instanceof Feb) {
    let $ = is_leap_year(year2);
    if ($) {
      return 29;
    } else {
      return 28;
    }
  } else if (month2 instanceof Mar) {
    return 31;
  } else if (month2 instanceof Apr) {
    return 30;
  } else if (month2 instanceof May) {
    return 31;
  } else if (month2 instanceof Jun) {
    return 30;
  } else if (month2 instanceof Jul) {
    return 31;
  } else if (month2 instanceof Aug) {
    return 31;
  } else if (month2 instanceof Sep) {
    return 30;
  } else if (month2 instanceof Oct) {
    return 31;
  } else if (month2 instanceof Nov) {
    return 30;
  } else {
    return 31;
  }
}
function to_calendar_date_helper(loop$year, loop$month, loop$ordinal_day) {
  while (true) {
    let year2 = loop$year;
    let month2 = loop$month;
    let ordinal_day2 = loop$ordinal_day;
    let month_days = days_in_month(year2, month2);
    let month_number$1 = month_to_number(month2);
    let $ = month_number$1 < 12 && ordinal_day2 > month_days;
    if ($) {
      loop$year = year2;
      loop$month = number_to_month(month_number$1 + 1);
      loop$ordinal_day = ordinal_day2 - month_days;
    } else {
      return new CalendarDate(year2, month2, ordinal_day2);
    }
  }
}
function div_with_remainder(a2, b) {
  return [floor_div(a2, b), modulo_unwrap(a2, b)];
}
function year(date) {
  let rd = date[0];
  let $ = div_with_remainder(rd, 146097);
  let n400 = $[0];
  let r400 = $[1];
  let $1 = div_with_remainder(r400, 36524);
  let n100 = $1[0];
  let r100 = $1[1];
  let $2 = div_with_remainder(r100, 1461);
  let n4 = $2[0];
  let r4 = $2[1];
  let $3 = div_with_remainder(r4, 365);
  let n1 = $3[0];
  let r1 = $3[1];
  let _block;
  let $4 = r1 === 0;
  if ($4) {
    _block = 0;
  } else {
    _block = 1;
  }
  let n = _block;
  return n400 * 400 + n100 * 100 + n4 * 4 + n1 + n;
}
function to_ordinal_date(date) {
  let rd = date[0];
  let year_ = year(date);
  return new OrdinalDate(year_, rd - days_before_year(year_));
}
function to_calendar_date(date) {
  let ordinal_date = to_ordinal_date(date);
  return to_calendar_date_helper(
    ordinal_date.year,
    new Jan(),
    ordinal_date.ordinal_day
  );
}
function to_week_date(date) {
  let rd = date[0];
  let weekday_number_ = weekday_number(date);
  let week_year$1 = year(new RD(rd + (4 - weekday_number_)));
  let week_1_day_1 = days_before_week_year(week_year$1) + 1;
  return new WeekDate(
    week_year$1,
    1 + divideInt(rd - week_1_day_1, 7),
    number_to_weekday(weekday_number_)
  );
}
function ordinal_day(date) {
  return to_ordinal_date(date).ordinal_day;
}
function month(date) {
  return to_calendar_date(date).month;
}
function month_number(date) {
  let _pipe = date;
  let _pipe$1 = month(_pipe);
  return month_to_number(_pipe$1);
}
function quarter(date) {
  let _pipe = date;
  let _pipe$1 = month(_pipe);
  return month_to_quarter(_pipe$1);
}
function day(date) {
  return to_calendar_date(date).day;
}
function week_year(date) {
  return to_week_date(date).week_year;
}
function week_number(date) {
  return to_week_date(date).week_number;
}
function format_field(loop$date, loop$language, loop$char, loop$length) {
  while (true) {
    let date = loop$date;
    let language = loop$language;
    let char = loop$char;
    let length4 = loop$length;
    if (char === "y") {
      if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = year(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        let _pipe$3 = pad_start(_pipe$2, 2, "0");
        return string_take_right(_pipe$3, 2);
      } else {
        let _pipe = date;
        let _pipe$1 = year(_pipe);
        return pad_signed_int(_pipe$1, length4);
      }
    } else if (char === "Y") {
      if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = week_year(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        let _pipe$3 = pad_start(_pipe$2, 2, "0");
        return string_take_right(_pipe$3, 2);
      } else {
        let _pipe = date;
        let _pipe$1 = week_year(_pipe);
        return pad_signed_int(_pipe$1, length4);
      }
    } else if (char === "Q") {
      if (length4 === 1) {
        let _pipe = date;
        let _pipe$1 = quarter(_pipe);
        return to_string(_pipe$1);
      } else if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = quarter(_pipe);
        return to_string(_pipe$1);
      } else if (length4 === 3) {
        let _pipe = date;
        let _pipe$1 = quarter(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        return ((str) => {
          return "Q" + str;
        })(_pipe$2);
      } else if (length4 === 4) {
        let _pipe = date;
        let _pipe$1 = quarter(_pipe);
        return with_ordinal_suffix(_pipe$1);
      } else if (length4 === 5) {
        let _pipe = date;
        let _pipe$1 = quarter(_pipe);
        return to_string(_pipe$1);
      } else {
        return "";
      }
    } else if (char === "M") {
      if (length4 === 1) {
        let _pipe = date;
        let _pipe$1 = month_number(_pipe);
        return to_string(_pipe$1);
      } else if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = month_number(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        return pad_start(_pipe$2, 2, "0");
      } else if (length4 === 3) {
        let _pipe = date;
        let _pipe$1 = month(_pipe);
        return language.month_name_short(_pipe$1);
      } else if (length4 === 4) {
        let _pipe = date;
        let _pipe$1 = month(_pipe);
        return language.month_name(_pipe$1);
      } else if (length4 === 5) {
        let _pipe = date;
        let _pipe$1 = month(_pipe);
        let _pipe$2 = language.month_name_short(_pipe$1);
        return string_take_left(_pipe$2, 1);
      } else {
        return "";
      }
    } else if (char === "w") {
      if (length4 === 1) {
        let _pipe = date;
        let _pipe$1 = week_number(_pipe);
        return to_string(_pipe$1);
      } else if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = week_number(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        return pad_start(_pipe$2, 2, "0");
      } else {
        return "";
      }
    } else if (char === "d") {
      if (length4 === 1) {
        let _pipe = date;
        let _pipe$1 = day(_pipe);
        return to_string(_pipe$1);
      } else if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = day(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        return pad_start(_pipe$2, 2, "0");
      } else if (length4 === 3) {
        let _pipe = date;
        let _pipe$1 = day(_pipe);
        return language.day_with_suffix(_pipe$1);
      } else {
        return "";
      }
    } else if (char === "D") {
      if (length4 === 1) {
        let _pipe = date;
        let _pipe$1 = ordinal_day(_pipe);
        return to_string(_pipe$1);
      } else if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = ordinal_day(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        return pad_start(_pipe$2, 2, "0");
      } else if (length4 === 3) {
        let _pipe = date;
        let _pipe$1 = ordinal_day(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        return pad_start(_pipe$2, 3, "0");
      } else {
        return "";
      }
    } else if (char === "E") {
      if (length4 === 1) {
        let _pipe = date;
        let _pipe$1 = weekday(_pipe);
        return language.weekday_name_short(_pipe$1);
      } else if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = weekday(_pipe);
        return language.weekday_name_short(_pipe$1);
      } else if (length4 === 3) {
        let _pipe = date;
        let _pipe$1 = weekday(_pipe);
        return language.weekday_name_short(_pipe$1);
      } else if (length4 === 4) {
        let _pipe = date;
        let _pipe$1 = weekday(_pipe);
        return language.weekday_name(_pipe$1);
      } else if (length4 === 5) {
        let _pipe = date;
        let _pipe$1 = weekday(_pipe);
        let _pipe$2 = language.weekday_name_short(_pipe$1);
        return string_take_left(_pipe$2, 1);
      } else if (length4 === 6) {
        let _pipe = date;
        let _pipe$1 = weekday(_pipe);
        let _pipe$2 = language.weekday_name_short(_pipe$1);
        return string_take_left(_pipe$2, 2);
      } else {
        return "";
      }
    } else if (char === "e") {
      if (length4 === 1) {
        let _pipe = date;
        let _pipe$1 = weekday_number(_pipe);
        return to_string(_pipe$1);
      } else if (length4 === 2) {
        let _pipe = date;
        let _pipe$1 = weekday_number(_pipe);
        return to_string(_pipe$1);
      } else {
        let _pipe = date;
        loop$date = _pipe;
        loop$language = language;
        loop$char = "E";
        loop$length = length4;
      }
    } else {
      return "";
    }
  }
}
function format_with_tokens(language, tokens, date) {
  return fold2(
    tokens,
    "",
    (formatted, token3) => {
      if (token3 instanceof Field) {
        let char = token3[0];
        let length4 = token3[1];
        return format_field(date, language, char, length4) + formatted;
      } else {
        let str = token3[0];
        return str + formatted;
      }
    }
  );
}
function format_with_language(date, language, pattern_text) {
  let _block;
  let _pipe = pattern_text;
  let _pipe$1 = from_string2(_pipe);
  _block = reverse(_pipe$1);
  let tokens = _block;
  return format_with_tokens(language, tokens, date);
}
function format(date, pattern) {
  return format_with_language(date, language_en(), pattern);
}
function to_months(rd) {
  let calendar_date = to_calendar_date(new RD(rd));
  let whole_months = 12 * (calendar_date.year - 1) + (month_to_number(
    calendar_date.month
  ) - 1);
  let fraction = divideFloat(identity(calendar_date.day), 100);
  return identity(whole_months) + fraction;
}
function diff(unit, date1, date2) {
  let rd1 = date1[0];
  let rd2 = date2[0];
  if (unit instanceof Years) {
    let _pipe = to_months(rd2) - to_months(rd1);
    let _pipe$1 = truncate(_pipe);
    let _pipe$2 = divide(_pipe$1, 12);
    return unwrap2(_pipe$2, 0);
  } else if (unit instanceof Months) {
    let _pipe = to_months(rd2) - to_months(rd1);
    return truncate(_pipe);
  } else if (unit instanceof Weeks) {
    let _pipe = divide(rd2 - rd1, 7);
    return unwrap2(_pipe, 0);
  } else {
    return rd2 - rd1;
  }
}
function is_between_int(value3, lower, upper) {
  return lower <= value3 && value3 <= upper;
}
function from_ordinal_parts(year2, ordinal) {
  let _block;
  let $ = is_leap_year(year2);
  if ($) {
    _block = 366;
  } else {
    _block = 365;
  }
  let days_in_year = _block;
  let $1 = !is_between_int(ordinal, 1, days_in_year);
  if ($1) {
    return new Error(
      "Invalid ordinal date: " + ("ordinal-day " + to_string(ordinal) + " is out of range") + (" (1 to " + to_string(
        days_in_year
      ) + ")") + (" for " + to_string(year2)) + ("; received (year " + to_string(
        year2
      ) + ", ordinal-day " + to_string(ordinal) + ")")
    );
  } else {
    return new Ok(new RD(days_before_year(year2) + ordinal));
  }
}
function from_week_parts(week_year2, week_number2, weekday_number2) {
  let _block;
  let $ = is_53_week_year(week_year2);
  if ($) {
    _block = 53;
  } else {
    _block = 52;
  }
  let weeks_in_year = _block;
  let $1 = is_between_int(week_number2, 1, weeks_in_year);
  let $2 = is_between_int(weekday_number2, 1, 7);
  if (!$1) {
    return new Error(
      "Invalid week date: " + ("week " + to_string(week_number2) + " is out of range") + (" (1 to " + to_string(
        weeks_in_year
      ) + ")") + (" for " + to_string(week_year2)) + ("; received (year " + to_string(
        week_year2
      ) + ", week " + to_string(week_number2) + ", weekday " + to_string(
        weekday_number2
      ) + ")")
    );
  } else if ($1 && !$2) {
    return new Error(
      "Invalid week date: " + ("weekday " + to_string(weekday_number2) + " is out of range") + " (1 to 7)" + ("; received (year " + to_string(
        week_year2
      ) + ", week " + to_string(week_number2) + ", weekday " + to_string(
        weekday_number2
      ) + ")")
    );
  } else {
    return new Ok(
      new RD(
        days_before_week_year(week_year2) + (week_number2 - 1) * 7 + weekday_number2
      )
    );
  }
}
function is_between(value3, lower, upper) {
  let value_rd = value3[0];
  let lower_rd = lower[0];
  let upper_rd = upper[0];
  return is_between_int(value_rd, lower_rd, upper_rd);
}
function bool_to_int(value3) {
  if (value3) {
    return 1;
  } else {
    return 0;
  }
}
function parse_month_and_day(extended) {
  return do$(
    int_2(),
    (month2) => {
      let dash_count = bool_to_int(extended);
      return do$(
        one_of2(
          toList([
            (() => {
              let _pipe = take_exactly(
                token2(new Dash()),
                dash_count
              );
              return then$3(_pipe, (_) => {
                return int_2();
              });
            })(),
            (() => {
              let _pipe = eof();
              return then$3(_pipe, (_) => {
                return succeed(1);
              });
            })()
          ])
        ),
        (day2) => {
          return return$(new MonthAndDay(month2, day2));
        }
      );
    }
  );
}
function parse_week_and_weekday(extended) {
  return do$(
    token2(new WeekToken()),
    (_) => {
      return do$(
        int_2(),
        (week) => {
          let dash_count = bool_to_int(extended);
          return do$(
            one_of2(
              toList([
                (() => {
                  let _pipe = take_exactly(
                    token2(new Dash()),
                    dash_count
                  );
                  return then$3(_pipe, (_2) => {
                    return int_1();
                  });
                })(),
                succeed(1)
              ])
            ),
            (day2) => {
              return return$(new WeekAndWeekday(week, day2));
            }
          );
        }
      );
    }
  );
}
function parse_day_of_year() {
  return one_of2(
    toList([
      (() => {
        let _pipe = token2(new Dash());
        return then$3(
          _pipe,
          (_) => {
            return one_of2(
              toList([
                backtrackable(parse_ordinal_day()),
                parse_month_and_day(true),
                parse_week_and_weekday(true)
              ])
            );
          }
        );
      })(),
      backtrackable(parse_month_and_day(false)),
      parse_ordinal_day(),
      parse_week_and_weekday(false),
      succeed(new OrdinalDay(1))
    ])
  );
}
function days_before_month(year2, month2) {
  let leap_days = bool_to_int(is_leap_year(year2));
  if (month2 instanceof Jan) {
    return 0;
  } else if (month2 instanceof Feb) {
    return 31;
  } else if (month2 instanceof Mar) {
    return 59 + leap_days;
  } else if (month2 instanceof Apr) {
    return 90 + leap_days;
  } else if (month2 instanceof May) {
    return 120 + leap_days;
  } else if (month2 instanceof Jun) {
    return 151 + leap_days;
  } else if (month2 instanceof Jul) {
    return 181 + leap_days;
  } else if (month2 instanceof Aug) {
    return 212 + leap_days;
  } else if (month2 instanceof Sep) {
    return 243 + leap_days;
  } else if (month2 instanceof Oct) {
    return 273 + leap_days;
  } else if (month2 instanceof Nov) {
    return 304 + leap_days;
  } else {
    return 334 + leap_days;
  }
}
function from_calendar_date(year2, month2, day2) {
  return new RD(
    days_before_year(year2) + days_before_month(year2, month2) + clamp(
      day2,
      1,
      days_in_month(year2, month2)
    )
  );
}
function from_calendar_parts(year2, month_number2, day2) {
  let $ = is_between_int(month_number2, 1, 12);
  let $1 = is_between_int(
    day2,
    1,
    days_in_month(year2, number_to_month(month_number2))
  );
  if (!$) {
    return new Error(
      "Invalid date: " + ("month " + to_string(month_number2) + " is out of range") + " (1 to 12)" + ("; received (year " + to_string(
        year2
      ) + ", month " + to_string(month_number2) + ", day " + to_string(
        day2
      ) + ")")
    );
  } else if ($ && !$1) {
    return new Error(
      "Invalid date: " + ("day " + to_string(day2) + " is out of range") + (" (1 to " + to_string(
        days_in_month(year2, number_to_month(month_number2))
      ) + ")") + (" for " + (() => {
        let _pipe = month_number2;
        let _pipe$1 = number_to_month(_pipe);
        return month_to_name(_pipe$1);
      })()) + (() => {
        let $2 = month_number2 === 2 && day2 === 29;
        if ($2) {
          return " (" + to_string(year2) + " is not a leap year)";
        } else {
          return "";
        }
      })() + ("; received (year " + to_string(year2) + ", month " + to_string(
        month_number2
      ) + ", day " + to_string(day2) + ")")
    );
  } else {
    return new Ok(
      new RD(
        days_before_year(year2) + days_before_month(
          year2,
          number_to_month(month_number2)
        ) + day2
      )
    );
  }
}
function from_year_and_day_of_year(year2, day_of_year) {
  if (day_of_year instanceof MonthAndDay) {
    let month_number$1 = day_of_year[0];
    let day$1 = day_of_year[1];
    return from_calendar_parts(year2, month_number$1, day$1);
  } else if (day_of_year instanceof WeekAndWeekday) {
    let week_number$1 = day_of_year[0];
    let weekday_number$1 = day_of_year[1];
    return from_week_parts(year2, week_number$1, weekday_number$1);
  } else {
    let ordinal_day$1 = day_of_year[0];
    return from_ordinal_parts(year2, ordinal_day$1);
  }
}
function parser2() {
  return do$(
    int_4(),
    (year2) => {
      return do$(
        parse_day_of_year(),
        (day_of_year) => {
          return return$(from_year_and_day_of_year(year2, day_of_year));
        }
      );
    }
  );
}
function from_iso_string(str) {
  let $ = run2(str, lexer());
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "rada/date",
      949,
      "from_iso_string",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  let tokens = $[0];
  let result = run3(
    tokens,
    (() => {
      let _pipe = parser2();
      return then$3(
        _pipe,
        (val) => {
          return one_of2(
            toList([
              (() => {
                let _pipe$1 = eof();
                return then$3(
                  _pipe$1,
                  (_) => {
                    return succeed(val);
                  }
                );
              })(),
              (() => {
                let _pipe$1 = token2(new TimeToken());
                return then$3(
                  _pipe$1,
                  (_) => {
                    return succeed(
                      new Error("Expected a date only, not a date and time")
                    );
                  }
                );
              })(),
              succeed(new Error("Expected a date only"))
            ])
          );
        }
      );
    })()
  );
  if (result.isOk() && result[0].isOk()) {
    let value3 = result[0][0];
    return new Ok(value3);
  } else if (result.isOk() && !result[0].isOk()) {
    let err = result[0][0];
    return new Error(err);
  } else {
    return new Error("Expected a date in ISO 8601 format");
  }
}
function today() {
  let $ = get_year_month_day();
  let year$1 = $[0];
  let month_number$1 = $[1];
  let day$1 = $[2];
  return from_calendar_date(year$1, number_to_month(month_number$1), day$1);
}

// build/dev/javascript/budget_shared/budget_shared.mjs
var User = class extends CustomType {
  constructor(id2, name) {
    super();
    this.id = id2;
    this.name = name;
  }
};
var CategoryGroup = class extends CustomType {
  constructor(id2, name, position, is_collapsed) {
    super();
    this.id = id2;
    this.name = name;
    this.position = position;
    this.is_collapsed = is_collapsed;
  }
};
var Category = class extends CustomType {
  constructor(id2, name, target, inflow, group_id) {
    super();
    this.id = id2;
    this.name = name;
    this.target = target;
    this.inflow = inflow;
    this.group_id = group_id;
  }
};
var Monthly = class extends CustomType {
  constructor(target) {
    super();
    this.target = target;
  }
};
var Custom = class extends CustomType {
  constructor(target, date) {
    super();
    this.target = target;
    this.date = date;
  }
};
var MonthInYear = class extends CustomType {
  constructor(month2, year2) {
    super();
    this.month = month2;
    this.year = year2;
  }
};
var Allocation = class extends CustomType {
  constructor(id2, amount, category_id, date) {
    super();
    this.id = id2;
    this.amount = amount;
    this.category_id = category_id;
    this.date = date;
  }
};
var AllocationForm = class extends CustomType {
  constructor(id2, amount, category_id, date) {
    super();
    this.id = id2;
    this.amount = amount;
    this.category_id = category_id;
    this.date = date;
  }
};
var Cycle = class extends CustomType {
  constructor(year2, month2) {
    super();
    this.year = year2;
    this.month = month2;
  }
};
var Transaction = class extends CustomType {
  constructor(id2, date, payee, category_id, value3, user_id) {
    super();
    this.id = id2;
    this.date = date;
    this.payee = payee;
    this.category_id = category_id;
    this.value = value3;
    this.user_id = user_id;
  }
};
var Money = class extends CustomType {
  constructor(value3) {
    super();
    this.value = value3;
  }
};
function id_decoder() {
  return field2(
    "id",
    string3,
    (id2) => {
      return success(id2);
    }
  );
}
function user_with_token_decoder() {
  return field2(
    "id",
    string3,
    (id2) => {
      return field2(
        "name",
        string3,
        (name) => {
          return field2(
            "token",
            string3,
            (token3) => {
              return success([new User(id2, name), token3]);
            }
          );
        }
      );
    }
  );
}
function category_group_encode(group) {
  return object2(
    toList([
      ["id", string4(group.id)],
      ["name", string4(group.name)],
      ["position", int3(group.position)],
      ["is_collapsed", bool3(group.is_collapsed)]
    ])
  );
}
function category_group_decoder() {
  return field2(
    "id",
    string3,
    (id2) => {
      return field2(
        "name",
        string3,
        (name) => {
          return field2(
            "position",
            int2,
            (position) => {
              return field2(
                "is_collapsed",
                bool2,
                (is_collapsed) => {
                  return success(
                    new CategoryGroup(id2, name, position, is_collapsed)
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function month_decoder() {
  return field2(
    "month",
    int2,
    (month2) => {
      return field2(
        "year",
        int2,
        (year2) => {
          return success(new MonthInYear(month2, year2));
        }
      );
    }
  );
}
function cycle_encode(cycle) {
  return object2(
    toList([
      ["year", int3(cycle.year)],
      [
        "month",
        (() => {
          let _pipe = cycle.month;
          let _pipe$1 = month_to_number(_pipe);
          return int3(_pipe$1);
        })()
      ]
    ])
  );
}
function month_in_year_encode(month2) {
  return object2(
    toList([["month", int3(month2.month)], ["year", int3(month2.year)]])
  );
}
function money_encode(money) {
  return object2(toList([["money_value", int3(money.value)]]));
}
function allocation_encode(a2) {
  return object2(
    toList([
      ["id", string4(a2.id)],
      ["amount", money_encode(a2.amount)],
      ["category_id", string4(a2.category_id)],
      ["date", cycle_encode(a2.date)]
    ])
  );
}
function allocation_form_encode(af) {
  return object2(
    toList([
      ["id", nullable(af.id, string4)],
      ["amount", money_encode(af.amount)],
      ["category_id", string4(af.category_id)],
      ["date", cycle_encode(af.date)]
    ])
  );
}
function target_encode(target) {
  if (target instanceof Monthly) {
    let money = target.target;
    return object2(
      toList([["type", string4("monthly")], ["money", money_encode(money)]])
    );
  } else {
    let money = target.target;
    let month2 = target.date;
    return object2(
      toList([
        ["type", string4("custom")],
        ["money", money_encode(money)],
        ["date", month_in_year_encode(month2)]
      ])
    );
  }
}
function category_encode(cat) {
  return object2(
    toList([
      ["id", string4(cat.id)],
      ["name", string4(cat.name)],
      ["target", nullable(cat.target, target_encode)],
      ["inflow", bool3(cat.inflow)],
      ["group_id", string4(cat.group_id)]
    ])
  );
}
function cycle_decoder() {
  let cycle_decoder$1 = field2(
    "month",
    int2,
    (month2) => {
      return field2(
        "year",
        int2,
        (year2) => {
          return success(
            new Cycle(
              year2,
              (() => {
                let _pipe = month2;
                return number_to_month(_pipe);
              })()
            )
          );
        }
      );
    }
  );
  return cycle_decoder$1;
}
function transaction_encode(t) {
  return object2(
    toList([
      ["id", string4(t.id)],
      [
        "date",
        (() => {
          let _pipe = to_rata_die(t.date);
          return int3(_pipe);
        })()
      ],
      ["payee", string4(t.payee)],
      ["category_id", string4(t.category_id)],
      ["value", money_encode(t.value)],
      ["user_id", string4(t.user_id)]
    ])
  );
}
function money_decoder() {
  let money_decoder$1 = field2(
    "money_value",
    int2,
    (value3) => {
      return success(new Money(value3));
    }
  );
  return money_decoder$1;
}
function target_decoder() {
  let monthly_decoder = field2(
    "money",
    money_decoder(),
    (money) => {
      return success(new Monthly(money));
    }
  );
  let custom_decoder = field2(
    "money",
    money_decoder(),
    (money) => {
      return field2(
        "date",
        month_decoder(),
        (date) => {
          return success(new Custom(money, date));
        }
      );
    }
  );
  let target_decoder$1 = field2(
    "type",
    string3,
    (tag) => {
      if (tag === "monthly") {
        return monthly_decoder;
      } else {
        return custom_decoder;
      }
    }
  );
  return target_decoder$1;
}
function category_decoder() {
  return field2(
    "id",
    string3,
    (id2) => {
      return field2(
        "name",
        string3,
        (name) => {
          return field2(
            "target",
            optional(target_decoder()),
            (target) => {
              return field2(
                "inflow",
                bool2,
                (inflow) => {
                  return field2(
                    "group_id",
                    string3,
                    (group_id) => {
                      return success(
                        new Category(id2, name, target, inflow, group_id)
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function category_suggestions_decoder() {
  return dict2(string3, category_decoder());
}
function allocation_decoder() {
  let allocation_decoder$1 = field2(
    "id",
    string3,
    (id2) => {
      return field2(
        "amount",
        money_decoder(),
        (amount) => {
          return field2(
            "category_id",
            string3,
            (category_id) => {
              return field2(
                "date",
                cycle_decoder(),
                (date) => {
                  return success(
                    new Allocation(id2, amount, category_id, date)
                  );
                }
              );
            }
          );
        }
      );
    }
  );
  return allocation_decoder$1;
}
function transaction_decoder() {
  return field2(
    "id",
    string3,
    (id2) => {
      return field2(
        "date",
        int2,
        (date) => {
          return field2(
            "payee",
            string3,
            (payee) => {
              return field2(
                "category_id",
                string3,
                (category_id) => {
                  return field2(
                    "value",
                    money_decoder(),
                    (value3) => {
                      return field2(
                        "user_id",
                        string3,
                        (user_id) => {
                          return success(
                            new Transaction(
                              id2,
                              from_rata_die(date),
                              payee,
                              category_id,
                              value3,
                              user_id
                            )
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function money_sum(a2, b) {
  return new Money(a2.value + b.value);
}
function target_amount(target) {
  if (target instanceof None) {
    return new None();
  } else if (target instanceof Some && target[0] instanceof Custom) {
    let amount = target[0].target;
    let _pipe = amount;
    return new Some(_pipe);
  } else {
    let amount = target[0].target;
    let _pipe = amount;
    return new Some(_pipe);
  }
}
function target_date(target) {
  if (target instanceof None) {
    return new None();
  } else if (target instanceof Some && target[0] instanceof Custom) {
    let date = target[0].date;
    let _pipe = date;
    return new Some(_pipe);
  } else {
    return new None();
  }
}
function is_target_custom(target) {
  if (target instanceof None) {
    return false;
  } else if (target instanceof Some && target[0] instanceof Custom) {
    return true;
  } else {
    return false;
  }
}
function cycle_decrease(c) {
  let mon_num = month_to_number(c.month);
  if (mon_num === 1) {
    return new Cycle(c.year - 1, new Dec());
  } else {
    return new Cycle(c.year, number_to_month(mon_num - 1));
  }
}
function cycle_increase(c) {
  let mon_num = month_to_number(c.month);
  if (mon_num === 12) {
    return new Cycle(c.year + 1, new Jan());
  } else {
    return new Cycle(c.year, number_to_month(mon_num + 1));
  }
}
function calculate_current_cycle() {
  let today2 = today();
  let last_day = 26;
  let cycle = new Cycle(
    year(today2),
    (() => {
      let _pipe = today2;
      return month(_pipe);
    })()
  );
  let $ = day(today2) > last_day;
  if (!$) {
    return cycle;
  } else {
    return cycle_increase(cycle);
  }
}
function divide_money(m, d) {
  return new Money(divideInt(m.value, d));
}
function string_to_money(raw) {
  let _block;
  let $1 = slice(raw, 0, 1);
  if ($1 === "-") {
    _block = [-1, slice(raw, 1, string_length(raw))];
  } else {
    _block = [1, raw];
  }
  let $ = _block;
  let is_neg = $[0];
  let s = $[1];
  let $2 = (() => {
    let _pipe = replace(s, ",", ".");
    return split2(_pipe, ".");
  })();
  if ($2.atLeastLength(2)) {
    let s$1 = $2.head;
    let b = $2.tail.head;
    let $3 = parse_int(s$1);
    let $4 = (() => {
      let _pipe = b;
      let _pipe$1 = pad_end(_pipe, 2, "0");
      let _pipe$2 = slice(_pipe$1, 0, 2);
      return parse_int(_pipe$2);
    })();
    if ($3.isOk() && $4.isOk()) {
      let s$2 = $3[0];
      let b$1 = $4[0];
      return new Money(is_neg * (s$2 * 100 + b$1));
    } else {
      return new Money(0);
    }
  } else if ($2.atLeastLength(1)) {
    let s$1 = $2.head;
    let $3 = parse_int(s$1);
    if ($3.isOk()) {
      let s$2 = $3[0];
      return new Money(is_neg * s$2 * 100);
    } else {
      return new Money(0);
    }
  } else {
    return new Money(0);
  }
}
function money_to_string_no_sign(m) {
  let _block;
  let _pipe = m.value;
  _block = absolute_value(_pipe);
  let value3 = _block;
  return (() => {
    let _pipe$1 = divideInt(value3, 100);
    return to_string(_pipe$1);
  })() + "." + (() => {
    let _pipe$1 = remainderInt(value3, 100);
    return to_string(_pipe$1);
  })();
}
function money_with_currency_no_sign(m) {
  let _block;
  let _pipe = m.value;
  _block = absolute_value(_pipe);
  let value3 = _block;
  return "\u20AC" + (() => {
    let _pipe$1 = divideInt(value3, 100);
    return to_string(_pipe$1);
  })() + "." + (() => {
    let _pipe$1 = remainderInt(value3, 100);
    return to_string(_pipe$1);
  })();
}
function sign_symbols(m) {
  let $ = m.value < 0;
  if ($) {
    return "-";
  } else {
    return "";
  }
}
function money_to_string(m) {
  let sign = sign_symbols(m);
  return sign + "\u20AC" + money_to_string_no_sign(m);
}
function is_zero_euro(m) {
  let $ = m.value;
  if ($ === 0) {
    return true;
  } else {
    return false;
  }
}

// build/dev/javascript/budget_shared/date_utils.mjs
function to_date_string(value3) {
  return format(value3, "dd.MM.yyyy");
}
function to_date_string_input(value3) {
  return format(value3, "yyyy-MM-dd");
}
function from_date_string(date_str) {
  return from_iso_string(date_str);
}
function month_to_name2(month2) {
  if (month2 instanceof Jan) {
    return "January";
  } else if (month2 instanceof Feb) {
    return "February";
  } else if (month2 instanceof Mar) {
    return "March";
  } else if (month2 instanceof Apr) {
    return "April";
  } else if (month2 instanceof May) {
    return "May";
  } else if (month2 instanceof Jun) {
    return "June";
  } else if (month2 instanceof Jul) {
    return "July";
  } else if (month2 instanceof Aug) {
    return "August";
  } else if (month2 instanceof Sep) {
    return "September";
  } else if (month2 instanceof Oct) {
    return "October";
  } else if (month2 instanceof Nov) {
    return "November";
  } else {
    return "December";
  }
}
function days_in_month2(_, month2) {
  if (month2 instanceof Jan) {
    return 31;
  } else if (month2 instanceof Feb) {
    return 28;
  } else if (month2 instanceof Mar) {
    return 31;
  } else if (month2 instanceof Apr) {
    return 30;
  } else if (month2 instanceof May) {
    return 31;
  } else if (month2 instanceof Jun) {
    return 30;
  } else if (month2 instanceof Jul) {
    return 31;
  } else if (month2 instanceof Aug) {
    return 31;
  } else if (month2 instanceof Sep) {
    return 30;
  } else if (month2 instanceof Oct) {
    return 31;
  } else if (month2 instanceof Nov) {
    return 30;
  } else {
    return 31;
  }
}
function month_by_number(month2) {
  if (month2 === 1) {
    return new Jan();
  } else if (month2 === 2) {
    return new Feb();
  } else if (month2 === 3) {
    return new Mar();
  } else if (month2 === 4) {
    return new Apr();
  } else if (month2 === 5) {
    return new May();
  } else if (month2 === 6) {
    return new Jun();
  } else if (month2 === 7) {
    return new Jul();
  } else if (month2 === 8) {
    return new Aug();
  } else if (month2 === 9) {
    return new Sep();
  } else if (month2 === 10) {
    return new Oct();
  } else if (month2 === 11) {
    return new Nov();
  } else if (month2 === 12) {
    return new Dec();
  } else {
    return new Jan();
  }
}
function date_to_month(d) {
  return new MonthInYear(
    (() => {
      let _pipe = d;
      return month_number(_pipe);
    })(),
    (() => {
      let _pipe = d;
      return year(_pipe);
    })()
  );
}
function date_string_to_month(date_str) {
  let _pipe = from_date_string(date_str);
  let _pipe$1 = map3(_pipe, (d) => {
    return date_to_month(d);
  });
  return unwrap2(_pipe$1, new MonthInYear(0, 0));
}
function month_in_year_to_str(month_in_year) {
  let date2 = from_calendar_date(
    month_in_year.year,
    month_by_number(month_in_year.month),
    1
  );
  return format(date2, "yyyy-MM-dd");
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(all) {
    super();
    this.all = all;
  }
};
function custom2(run4) {
  return new Effect(
    toList([
      (actions) => {
        return run4(actions.dispatch, actions.emit, actions.select, actions.root);
      }
    ])
  );
}
function from(effect) {
  return custom2((dispatch, _, _1, _2) => {
    return effect(dispatch);
  });
}
function none() {
  return new Effect(toList([]));
}
function batch(effects) {
  return new Effect(
    fold2(
      effects,
      toList([]),
      (b, _use1) => {
        let a2 = _use1.all;
        return append(b, a2);
      }
    )
  );
}

// build/dev/javascript/lustre/lustre/internals/vdom.mjs
var Text2 = class extends CustomType {
  constructor(content) {
    super();
    this.content = content;
  }
};
var Element = class extends CustomType {
  constructor(key, namespace, tag, attrs, children2, self_closing, void$) {
    super();
    this.key = key;
    this.namespace = namespace;
    this.tag = tag;
    this.attrs = attrs;
    this.children = children2;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Map2 = class extends CustomType {
  constructor(subtree) {
    super();
    this.subtree = subtree;
  }
};
var Attribute = class extends CustomType {
  constructor(x0, x1, as_property) {
    super();
    this[0] = x0;
    this[1] = x1;
    this.as_property = as_property;
  }
};
var Event = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function attribute_to_event_handler(attribute2) {
  if (attribute2 instanceof Attribute) {
    return new Error(void 0);
  } else {
    let name = attribute2[0];
    let handler = attribute2[1];
    let name$1 = drop_start(name, 2);
    return new Ok([name$1, handler]);
  }
}
function do_element_list_handlers(elements2, handlers2, key) {
  return index_fold(
    elements2,
    handlers2,
    (handlers3, element2, index5) => {
      let key$1 = key + "-" + to_string(index5);
      return do_handlers(element2, handlers3, key$1);
    }
  );
}
function do_handlers(loop$element, loop$handlers, loop$key) {
  while (true) {
    let element2 = loop$element;
    let handlers2 = loop$handlers;
    let key = loop$key;
    if (element2 instanceof Text2) {
      return handlers2;
    } else if (element2 instanceof Map2) {
      let subtree = element2.subtree;
      loop$element = subtree();
      loop$handlers = handlers2;
      loop$key = key;
    } else {
      let attrs = element2.attrs;
      let children2 = element2.children;
      let handlers$1 = fold2(
        attrs,
        handlers2,
        (handlers3, attr) => {
          let $ = attribute_to_event_handler(attr);
          if ($.isOk()) {
            let name = $[0][0];
            let handler = $[0][1];
            return insert(handlers3, key + "-" + name, handler);
          } else {
            return handlers3;
          }
        }
      );
      return do_element_list_handlers(children2, handlers$1, key);
    }
  }
}
function handlers(element2) {
  return do_handlers(element2, new_map(), "0");
}

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute(name, value3) {
  return new Attribute(name, identity(value3), false);
}
function property(name, value3) {
  return new Attribute(name, identity(value3), true);
}
function on(name, handler) {
  return new Event("on" + name, handler);
}
function style(properties) {
  return attribute(
    "style",
    fold2(
      properties,
      "",
      (styles, _use1) => {
        let name$1 = _use1[0];
        let value$1 = _use1[1];
        return styles + name$1 + ":" + value$1 + ";";
      }
    )
  );
}
function class$(name) {
  return attribute("class", name);
}
function id(name) {
  return attribute("id", name);
}
function role(name) {
  return attribute("role", name);
}
function type_(name) {
  return attribute("type", name);
}
function value(val) {
  return attribute("value", val);
}
function checked(is_checked) {
  return property("checked", is_checked);
}
function placeholder(text3) {
  return attribute("placeholder", text3);
}
function for$(id2) {
  return attribute("for", id2);
}
function href(uri) {
  return attribute("href", uri);
}

// build/dev/javascript/lustre/lustre/element.mjs
function element(tag, attrs, children2) {
  if (tag === "area") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "base") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "br") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "col") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "embed") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "hr") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "img") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "input") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "link") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "meta") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "param") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "source") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "track") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "wbr") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else {
    return new Element("", "", tag, attrs, children2, false, false);
  }
}
function text(content) {
  return new Text2(content);
}

// build/dev/javascript/lustre/lustre/internals/patch.mjs
var Diff = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Emit = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Init = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function is_empty_element_diff(diff3) {
  return isEqual(diff3.created, new_map()) && isEqual(
    diff3.removed,
    new$()
  ) && isEqual(diff3.updated, new_map());
}

// build/dev/javascript/lustre/lustre/internals/runtime.mjs
var Attrs = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Batch = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Debug = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Dispatch = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Emit2 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Event2 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Shutdown = class extends CustomType {
};
var Subscribe = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Unsubscribe = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ForceModel = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};

// build/dev/javascript/lustre/vdom.ffi.mjs
if (globalThis.customElements && !globalThis.customElements.get("lustre-fragment")) {
  globalThis.customElements.define(
    "lustre-fragment",
    class LustreFragment extends HTMLElement {
      constructor() {
        super();
      }
    }
  );
}
function morph(prev, next2, dispatch) {
  let out;
  let stack = [{ prev, next: next2, parent: prev.parentNode }];
  while (stack.length) {
    let { prev: prev2, next: next3, parent } = stack.pop();
    while (next3.subtree !== void 0) next3 = next3.subtree();
    if (next3.content !== void 0) {
      if (!prev2) {
        const created = document.createTextNode(next3.content);
        parent.appendChild(created);
        out ??= created;
      } else if (prev2.nodeType === Node.TEXT_NODE) {
        if (prev2.textContent !== next3.content) prev2.textContent = next3.content;
        out ??= prev2;
      } else {
        const created = document.createTextNode(next3.content);
        parent.replaceChild(created, prev2);
        out ??= created;
      }
    } else if (next3.tag !== void 0) {
      const created = createElementNode({
        prev: prev2,
        next: next3,
        dispatch,
        stack
      });
      if (!prev2) {
        parent.appendChild(created);
      } else if (prev2 !== created) {
        parent.replaceChild(created, prev2);
      }
      out ??= created;
    }
  }
  return out;
}
function createElementNode({ prev, next: next2, dispatch, stack }) {
  const namespace = next2.namespace || "http://www.w3.org/1999/xhtml";
  const canMorph = prev && prev.nodeType === Node.ELEMENT_NODE && prev.localName === next2.tag && prev.namespaceURI === (next2.namespace || "http://www.w3.org/1999/xhtml");
  const el = canMorph ? prev : namespace ? document.createElementNS(namespace, next2.tag) : document.createElement(next2.tag);
  let handlersForEl;
  if (!registeredHandlers.has(el)) {
    const emptyHandlers = /* @__PURE__ */ new Map();
    registeredHandlers.set(el, emptyHandlers);
    handlersForEl = emptyHandlers;
  } else {
    handlersForEl = registeredHandlers.get(el);
  }
  const prevHandlers = canMorph ? new Set(handlersForEl.keys()) : null;
  const prevAttributes = canMorph ? new Set(Array.from(prev.attributes, (a2) => a2.name)) : null;
  let className = null;
  let style2 = null;
  let innerHTML = null;
  if (canMorph && next2.tag === "textarea") {
    const innertText = next2.children[Symbol.iterator]().next().value?.content;
    if (innertText !== void 0) el.value = innertText;
  }
  const delegated = [];
  for (const attr of next2.attrs) {
    const name = attr[0];
    const value3 = attr[1];
    if (attr.as_property) {
      if (el[name] !== value3) el[name] = value3;
      if (canMorph) prevAttributes.delete(name);
    } else if (name.startsWith("on")) {
      const eventName = name.slice(2);
      const callback = dispatch(value3, eventName === "input");
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      if (canMorph) prevHandlers.delete(eventName);
    } else if (name.startsWith("data-lustre-on-")) {
      const eventName = name.slice(15);
      const callback = dispatch(lustreServerEventHandler);
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      el.setAttribute(name, value3);
      if (canMorph) {
        prevHandlers.delete(eventName);
        prevAttributes.delete(name);
      }
    } else if (name.startsWith("delegate:data-") || name.startsWith("delegate:aria-")) {
      el.setAttribute(name, value3);
      delegated.push([name.slice(10), value3]);
    } else if (name === "class") {
      className = className === null ? value3 : className + " " + value3;
    } else if (name === "style") {
      style2 = style2 === null ? value3 : style2 + value3;
    } else if (name === "dangerous-unescaped-html") {
      innerHTML = value3;
    } else {
      if (el.getAttribute(name) !== value3) el.setAttribute(name, value3);
      if (name === "value" || name === "selected") el[name] = value3;
      if (canMorph) prevAttributes.delete(name);
    }
  }
  if (className !== null) {
    el.setAttribute("class", className);
    if (canMorph) prevAttributes.delete("class");
  }
  if (style2 !== null) {
    el.setAttribute("style", style2);
    if (canMorph) prevAttributes.delete("style");
  }
  if (canMorph) {
    for (const attr of prevAttributes) {
      el.removeAttribute(attr);
    }
    for (const eventName of prevHandlers) {
      handlersForEl.delete(eventName);
      el.removeEventListener(eventName, lustreGenericEventHandler);
    }
  }
  if (next2.tag === "slot") {
    window.queueMicrotask(() => {
      for (const child of el.assignedElements()) {
        for (const [name, value3] of delegated) {
          if (!child.hasAttribute(name)) {
            child.setAttribute(name, value3);
          }
        }
      }
    });
  }
  if (next2.key !== void 0 && next2.key !== "") {
    el.setAttribute("data-lustre-key", next2.key);
  } else if (innerHTML !== null) {
    el.innerHTML = innerHTML;
    return el;
  }
  let prevChild = el.firstChild;
  let seenKeys = null;
  let keyedChildren = null;
  let incomingKeyedChildren = null;
  let firstChild = children(next2).next().value;
  if (canMorph && firstChild !== void 0 && // Explicit checks are more verbose but truthy checks force a bunch of comparisons
  // we don't care about: it's never gonna be a number etc.
  firstChild.key !== void 0 && firstChild.key !== "") {
    seenKeys = /* @__PURE__ */ new Set();
    keyedChildren = getKeyedChildren(prev);
    incomingKeyedChildren = getKeyedChildren(next2);
    for (const child of children(next2)) {
      prevChild = diffKeyedChild(
        prevChild,
        child,
        el,
        stack,
        incomingKeyedChildren,
        keyedChildren,
        seenKeys
      );
    }
  } else {
    for (const child of children(next2)) {
      stack.unshift({ prev: prevChild, next: child, parent: el });
      prevChild = prevChild?.nextSibling;
    }
  }
  while (prevChild) {
    const next3 = prevChild.nextSibling;
    el.removeChild(prevChild);
    prevChild = next3;
  }
  return el;
}
var registeredHandlers = /* @__PURE__ */ new WeakMap();
function lustreGenericEventHandler(event2) {
  const target = event2.currentTarget;
  if (!registeredHandlers.has(target)) {
    target.removeEventListener(event2.type, lustreGenericEventHandler);
    return;
  }
  const handlersForEventTarget = registeredHandlers.get(target);
  if (!handlersForEventTarget.has(event2.type)) {
    target.removeEventListener(event2.type, lustreGenericEventHandler);
    return;
  }
  handlersForEventTarget.get(event2.type)(event2);
}
function lustreServerEventHandler(event2) {
  const el = event2.currentTarget;
  const tag = el.getAttribute(`data-lustre-on-${event2.type}`);
  const data = JSON.parse(el.getAttribute("data-lustre-data") || "{}");
  const include = JSON.parse(el.getAttribute("data-lustre-include") || "[]");
  switch (event2.type) {
    case "input":
    case "change":
      include.push("target.value");
      break;
  }
  return {
    tag,
    data: include.reduce(
      (data2, property2) => {
        const path = property2.split(".");
        for (let i = 0, o = data2, e = event2; i < path.length; i++) {
          if (i === path.length - 1) {
            o[path[i]] = e[path[i]];
          } else {
            o[path[i]] ??= {};
            e = e[path[i]];
            o = o[path[i]];
          }
        }
        return data2;
      },
      { data }
    )
  };
}
function getKeyedChildren(el) {
  const keyedChildren = /* @__PURE__ */ new Map();
  if (el) {
    for (const child of children(el)) {
      const key = child?.key || child?.getAttribute?.("data-lustre-key");
      if (key) keyedChildren.set(key, child);
    }
  }
  return keyedChildren;
}
function diffKeyedChild(prevChild, child, el, stack, incomingKeyedChildren, keyedChildren, seenKeys) {
  while (prevChild && !incomingKeyedChildren.has(prevChild.getAttribute("data-lustre-key"))) {
    const nextChild = prevChild.nextSibling;
    el.removeChild(prevChild);
    prevChild = nextChild;
  }
  if (keyedChildren.size === 0) {
    stack.unshift({ prev: prevChild, next: child, parent: el });
    prevChild = prevChild?.nextSibling;
    return prevChild;
  }
  if (seenKeys.has(child.key)) {
    console.warn(`Duplicate key found in Lustre vnode: ${child.key}`);
    stack.unshift({ prev: null, next: child, parent: el });
    return prevChild;
  }
  seenKeys.add(child.key);
  const keyedChild = keyedChildren.get(child.key);
  if (!keyedChild && !prevChild) {
    stack.unshift({ prev: null, next: child, parent: el });
    return prevChild;
  }
  if (!keyedChild && prevChild !== null) {
    const placeholder2 = document.createTextNode("");
    el.insertBefore(placeholder2, prevChild);
    stack.unshift({ prev: placeholder2, next: child, parent: el });
    return prevChild;
  }
  if (!keyedChild || keyedChild === prevChild) {
    stack.unshift({ prev: prevChild, next: child, parent: el });
    prevChild = prevChild?.nextSibling;
    return prevChild;
  }
  el.insertBefore(keyedChild, prevChild);
  stack.unshift({ prev: keyedChild, next: child, parent: el });
  return prevChild;
}
function* children(element2) {
  for (const child of element2.children) {
    yield* forceChild(child);
  }
}
function* forceChild(element2) {
  if (element2.subtree !== void 0) {
    yield* forceChild(element2.subtree());
  } else {
    yield element2;
  }
}

// build/dev/javascript/lustre/lustre.ffi.mjs
var LustreClientApplication = class _LustreClientApplication {
  /**
   * @template Flags
   *
   * @param {object} app
   * @param {(flags: Flags) => [Model, Lustre.Effect<Msg>]} app.init
   * @param {(msg: Msg, model: Model) => [Model, Lustre.Effect<Msg>]} app.update
   * @param {(model: Model) => Lustre.Element<Msg>} app.view
   * @param {string | HTMLElement} selector
   * @param {Flags} flags
   *
   * @returns {Gleam.Ok<(action: Lustre.Action<Lustre.Client, Msg>>) => void>}
   */
  static start({ init: init4, update: update2, view: view2 }, selector, flags) {
    if (!is_browser()) return new Error(new NotABrowser());
    const root = selector instanceof HTMLElement ? selector : document.querySelector(selector);
    if (!root) return new Error(new ElementNotFound(selector));
    const app = new _LustreClientApplication(root, init4(flags), update2, view2);
    return new Ok((action) => app.send(action));
  }
  /**
   * @param {Element} root
   * @param {[Model, Lustre.Effect<Msg>]} init
   * @param {(model: Model, msg: Msg) => [Model, Lustre.Effect<Msg>]} update
   * @param {(model: Model) => Lustre.Element<Msg>} view
   *
   * @returns {LustreClientApplication}
   */
  constructor(root, [init4, effects], update2, view2) {
    this.root = root;
    this.#model = init4;
    this.#update = update2;
    this.#view = view2;
    this.#tickScheduled = window.setTimeout(
      () => this.#tick(effects.all.toArray(), true),
      0
    );
  }
  /** @type {Element} */
  root;
  /**
   * @param {Lustre.Action<Lustre.Client, Msg>} action
   *
   * @returns {void}
   */
  send(action) {
    if (action instanceof Debug) {
      if (action[0] instanceof ForceModel) {
        this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
        this.#queue = [];
        this.#model = action[0][0];
        const vdom = this.#view(this.#model);
        const dispatch = (handler, immediate = false) => (event2) => {
          const result = handler(event2);
          if (result instanceof Ok) {
            this.send(new Dispatch(result[0], immediate));
          }
        };
        const prev = this.root.firstChild ?? this.root.appendChild(document.createTextNode(""));
        morph(prev, vdom, dispatch);
      }
    } else if (action instanceof Dispatch) {
      const msg = action[0];
      const immediate = action[1] ?? false;
      this.#queue.push(msg);
      if (immediate) {
        this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
        this.#tick();
      } else if (!this.#tickScheduled) {
        this.#tickScheduled = window.setTimeout(() => this.#tick());
      }
    } else if (action instanceof Emit2) {
      const event2 = action[0];
      const data = action[1];
      this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
    } else if (action instanceof Shutdown) {
      this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
      this.#model = null;
      this.#update = null;
      this.#view = null;
      this.#queue = null;
      while (this.root.firstChild) {
        this.root.firstChild.remove();
      }
    }
  }
  /** @type {Model} */
  #model;
  /** @type {(model: Model, msg: Msg) => [Model, Lustre.Effect<Msg>]} */
  #update;
  /** @type {(model: Model) => Lustre.Element<Msg>} */
  #view;
  /** @type {Array<Msg>} */
  #queue = [];
  /** @type {number | undefined} */
  #tickScheduled;
  /**
   * @param {Lustre.Effect<Msg>[]} effects
   */
  #tick(effects = []) {
    this.#tickScheduled = void 0;
    this.#flush(effects);
    const vdom = this.#view(this.#model);
    const dispatch = (handler, immediate = false) => (event2) => {
      const result = handler(event2);
      if (result instanceof Ok) {
        this.send(new Dispatch(result[0], immediate));
      }
    };
    const prev = this.root.firstChild ?? this.root.appendChild(document.createTextNode(""));
    morph(prev, vdom, dispatch);
  }
  #flush(effects = []) {
    while (this.#queue.length > 0) {
      const msg = this.#queue.shift();
      const [next2, effect] = this.#update(this.#model, msg);
      effects = effects.concat(effect.all.toArray());
      this.#model = next2;
    }
    while (effects.length > 0) {
      const effect = effects.shift();
      const dispatch = (msg) => this.send(new Dispatch(msg));
      const emit2 = (event2, data) => this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
      const select2 = () => {
      };
      const root = this.root;
      effect({ dispatch, emit: emit2, select: select2, root });
    }
    if (this.#queue.length > 0) {
      this.#flush(effects);
    }
  }
};
var start = LustreClientApplication.start;
var LustreServerApplication = class _LustreServerApplication {
  static start({ init: init4, update: update2, view: view2, on_attribute_change }, flags) {
    const app = new _LustreServerApplication(
      init4(flags),
      update2,
      view2,
      on_attribute_change
    );
    return new Ok((action) => app.send(action));
  }
  constructor([model, effects], update2, view2, on_attribute_change) {
    this.#model = model;
    this.#update = update2;
    this.#view = view2;
    this.#html = view2(model);
    this.#onAttributeChange = on_attribute_change;
    this.#renderers = /* @__PURE__ */ new Map();
    this.#handlers = handlers(this.#html);
    this.#tick(effects.all.toArray());
  }
  send(action) {
    if (action instanceof Attrs) {
      for (const attr of action[0]) {
        const decoder = this.#onAttributeChange.get(attr[0]);
        if (!decoder) continue;
        const msg = decoder(attr[1]);
        if (msg instanceof Error) continue;
        this.#queue.push(msg);
      }
      this.#tick();
    } else if (action instanceof Batch) {
      this.#queue = this.#queue.concat(action[0].toArray());
      this.#tick(action[1].all.toArray());
    } else if (action instanceof Debug) {
    } else if (action instanceof Dispatch) {
      this.#queue.push(action[0]);
      this.#tick();
    } else if (action instanceof Emit2) {
      const event2 = new Emit(action[0], action[1]);
      for (const [_, renderer] of this.#renderers) {
        renderer(event2);
      }
    } else if (action instanceof Event2) {
      const handler = this.#handlers.get(action[0]);
      if (!handler) return;
      const msg = handler(action[1]);
      if (msg instanceof Error) return;
      this.#queue.push(msg[0]);
      this.#tick();
    } else if (action instanceof Subscribe) {
      const attrs = keys(this.#onAttributeChange);
      const patch = new Init(attrs, this.#html);
      this.#renderers = this.#renderers.set(action[0], action[1]);
      action[1](patch);
    } else if (action instanceof Unsubscribe) {
      this.#renderers = this.#renderers.delete(action[0]);
    }
  }
  #model;
  #update;
  #queue;
  #view;
  #html;
  #renderers;
  #handlers;
  #onAttributeChange;
  #tick(effects = []) {
    this.#flush(effects);
    const vdom = this.#view(this.#model);
    const diff3 = elements(this.#html, vdom);
    if (!is_empty_element_diff(diff3)) {
      const patch = new Diff(diff3);
      for (const [_, renderer] of this.#renderers) {
        renderer(patch);
      }
    }
    this.#html = vdom;
    this.#handlers = diff3.handlers;
  }
  #flush(effects = []) {
    while (this.#queue.length > 0) {
      const msg = this.#queue.shift();
      const [next2, effect] = this.#update(this.#model, msg);
      effects = effects.concat(effect.all.toArray());
      this.#model = next2;
    }
    while (effects.length > 0) {
      const effect = effects.shift();
      const dispatch = (msg) => this.send(new Dispatch(msg));
      const emit2 = (event2, data) => this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
      const select2 = () => {
      };
      const root = null;
      effect({ dispatch, emit: emit2, select: select2, root });
    }
    if (this.#queue.length > 0) {
      this.#flush(effects);
    }
  }
};
var start_server_application = LustreServerApplication.start;
var is_browser = () => globalThis.window && window.document;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init4, update2, view2, on_attribute_change) {
    super();
    this.init = init4;
    this.update = update2;
    this.view = view2;
    this.on_attribute_change = on_attribute_change;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init4, update2, view2) {
  return new App(init4, update2, view2, new None());
}
function start2(app, selector, flags) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, flags);
    }
  );
}

// build/dev/javascript/gleam_stdlib/gleam/uri.mjs
var Uri = class extends CustomType {
  constructor(scheme, userinfo, host, port, path, query, fragment) {
    super();
    this.scheme = scheme;
    this.userinfo = userinfo;
    this.host = host;
    this.port = port;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
  }
};
function remove_dot_segments_loop(loop$input, loop$accumulator) {
  while (true) {
    let input2 = loop$input;
    let accumulator = loop$accumulator;
    if (input2.hasLength(0)) {
      return reverse(accumulator);
    } else {
      let segment = input2.head;
      let rest = input2.tail;
      let _block;
      if (segment === "") {
        let accumulator$12 = accumulator;
        _block = accumulator$12;
      } else if (segment === ".") {
        let accumulator$12 = accumulator;
        _block = accumulator$12;
      } else if (segment === ".." && accumulator.hasLength(0)) {
        _block = toList([]);
      } else if (segment === ".." && accumulator.atLeastLength(1)) {
        let accumulator$12 = accumulator.tail;
        _block = accumulator$12;
      } else {
        let segment$1 = segment;
        let accumulator$12 = accumulator;
        _block = prepend(segment$1, accumulator$12);
      }
      let accumulator$1 = _block;
      loop$input = rest;
      loop$accumulator = accumulator$1;
    }
  }
}
function remove_dot_segments(input2) {
  return remove_dot_segments_loop(input2, toList([]));
}
function path_segments(path) {
  return remove_dot_segments(split2(path, "/"));
}
function to_string3(uri) {
  let _block;
  let $ = uri.fragment;
  if ($ instanceof Some) {
    let fragment = $[0];
    _block = toList(["#", fragment]);
  } else {
    _block = toList([]);
  }
  let parts = _block;
  let _block$1;
  let $1 = uri.query;
  if ($1 instanceof Some) {
    let query = $1[0];
    _block$1 = prepend("?", prepend(query, parts));
  } else {
    _block$1 = parts;
  }
  let parts$1 = _block$1;
  let parts$2 = prepend(uri.path, parts$1);
  let _block$2;
  let $2 = uri.host;
  let $3 = starts_with(uri.path, "/");
  if ($2 instanceof Some && !$3 && $2[0] !== "") {
    let host = $2[0];
    _block$2 = prepend("/", parts$2);
  } else {
    _block$2 = parts$2;
  }
  let parts$3 = _block$2;
  let _block$3;
  let $4 = uri.host;
  let $5 = uri.port;
  if ($4 instanceof Some && $5 instanceof Some) {
    let port = $5[0];
    _block$3 = prepend(":", prepend(to_string(port), parts$3));
  } else {
    _block$3 = parts$3;
  }
  let parts$4 = _block$3;
  let _block$4;
  let $6 = uri.scheme;
  let $7 = uri.userinfo;
  let $8 = uri.host;
  if ($6 instanceof Some && $7 instanceof Some && $8 instanceof Some) {
    let s = $6[0];
    let u = $7[0];
    let h = $8[0];
    _block$4 = prepend(
      s,
      prepend(
        "://",
        prepend(u, prepend("@", prepend(h, parts$4)))
      )
    );
  } else if ($6 instanceof Some && $7 instanceof None && $8 instanceof Some) {
    let s = $6[0];
    let h = $8[0];
    _block$4 = prepend(s, prepend("://", prepend(h, parts$4)));
  } else if ($6 instanceof Some && $7 instanceof Some && $8 instanceof None) {
    let s = $6[0];
    _block$4 = prepend(s, prepend(":", parts$4));
  } else if ($6 instanceof Some && $7 instanceof None && $8 instanceof None) {
    let s = $6[0];
    _block$4 = prepend(s, prepend(":", parts$4));
  } else if ($6 instanceof None && $7 instanceof None && $8 instanceof Some) {
    let h = $8[0];
    _block$4 = prepend("//", prepend(h, parts$4));
  } else {
    _block$4 = parts$4;
  }
  let parts$5 = _block$4;
  return concat2(parts$5);
}

// build/dev/javascript/modem/modem.ffi.mjs
var defaults = {
  handle_external_links: false,
  handle_internal_links: true
};
var initial_location = globalThis?.window?.location?.href;
var do_init = (dispatch, options = defaults) => {
  document.addEventListener("click", (event2) => {
    const a2 = find_anchor(event2.target);
    if (!a2) return;
    try {
      const url = new URL(a2.href);
      const uri = uri_from_url(url);
      const is_external = url.host !== window.location.host;
      if (!options.handle_external_links && is_external) return;
      if (!options.handle_internal_links && !is_external) return;
      event2.preventDefault();
      if (!is_external) {
        window.history.pushState({}, "", a2.href);
        window.requestAnimationFrame(() => {
          if (url.hash) {
            document.getElementById(url.hash.slice(1))?.scrollIntoView();
          }
        });
      }
      return dispatch(uri);
    } catch {
      return;
    }
  });
  window.addEventListener("popstate", (e) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    const uri = uri_from_url(url);
    window.requestAnimationFrame(() => {
      if (url.hash) {
        document.getElementById(url.hash.slice(1))?.scrollIntoView();
      }
    });
    dispatch(uri);
  });
  window.addEventListener("modem-push", ({ detail }) => {
    dispatch(detail);
  });
  window.addEventListener("modem-replace", ({ detail }) => {
    dispatch(detail);
  });
};
var find_anchor = (el) => {
  if (!el || el.tagName === "BODY") {
    return null;
  } else if (el.tagName === "A") {
    return el;
  } else {
    return find_anchor(el.parentElement);
  }
};
var uri_from_url = (url) => {
  return new Uri(
    /* scheme   */
    url.protocol ? new Some(url.protocol.slice(0, -1)) : new None(),
    /* userinfo */
    new None(),
    /* host     */
    url.hostname ? new Some(url.hostname) : new None(),
    /* port     */
    url.port ? new Some(Number(url.port)) : new None(),
    /* path     */
    url.pathname,
    /* query    */
    url.search ? new Some(url.search.slice(1)) : new None(),
    /* fragment */
    url.hash ? new Some(url.hash.slice(1)) : new None()
  );
};

// build/dev/javascript/modem/modem.mjs
function init2(handler) {
  return from(
    (dispatch) => {
      return guard(
        !is_browser(),
        void 0,
        () => {
          return do_init(
            (uri) => {
              let _pipe = uri;
              let _pipe$1 = handler(_pipe);
              return dispatch(_pipe$1);
            }
          );
        }
      );
    }
  );
}

// build/dev/javascript/gleam_http/gleam/http.mjs
var Get = class extends CustomType {
};
var Post = class extends CustomType {
};
var Head = class extends CustomType {
};
var Put = class extends CustomType {
};
var Delete = class extends CustomType {
};
var Trace = class extends CustomType {
};
var Connect = class extends CustomType {
};
var Options2 = class extends CustomType {
};
var Patch = class extends CustomType {
};
var Http = class extends CustomType {
};
var Https = class extends CustomType {
};
function method_to_string(method) {
  if (method instanceof Connect) {
    return "connect";
  } else if (method instanceof Delete) {
    return "delete";
  } else if (method instanceof Get) {
    return "get";
  } else if (method instanceof Head) {
    return "head";
  } else if (method instanceof Options2) {
    return "options";
  } else if (method instanceof Patch) {
    return "patch";
  } else if (method instanceof Post) {
    return "post";
  } else if (method instanceof Put) {
    return "put";
  } else if (method instanceof Trace) {
    return "trace";
  } else {
    let s = method[0];
    return s;
  }
}
function scheme_to_string(scheme) {
  if (scheme instanceof Http) {
    return "http";
  } else {
    return "https";
  }
}

// build/dev/javascript/gleam_http/gleam/http/request.mjs
var Request = class extends CustomType {
  constructor(method, headers, body, scheme, host, port, path, query) {
    super();
    this.method = method;
    this.headers = headers;
    this.body = body;
    this.scheme = scheme;
    this.host = host;
    this.port = port;
    this.path = path;
    this.query = query;
  }
};
function to_uri(request) {
  return new Uri(
    new Some(scheme_to_string(request.scheme)),
    new None(),
    new Some(request.host),
    request.port,
    request.path,
    request.query,
    new None()
  );
}
function set_header(request, key, value3) {
  let headers = key_set(request.headers, lowercase(key), value3);
  let _record = request;
  return new Request(
    _record.method,
    headers,
    _record.body,
    _record.scheme,
    _record.host,
    _record.port,
    _record.path,
    _record.query
  );
}
function set_body(req, body) {
  let method = req.method;
  let headers = req.headers;
  let scheme = req.scheme;
  let host = req.host;
  let port = req.port;
  let path = req.path;
  let query = req.query;
  return new Request(method, headers, body, scheme, host, port, path, query);
}
function set_method(req, method) {
  let _record = req;
  return new Request(
    method,
    _record.headers,
    _record.body,
    _record.scheme,
    _record.host,
    _record.port,
    _record.path,
    _record.query
  );
}
function new$3() {
  return new Request(
    new Get(),
    toList([]),
    "",
    new Https(),
    "localhost",
    new None(),
    "",
    new None()
  );
}
function set_scheme(req, scheme) {
  let _record = req;
  return new Request(
    _record.method,
    _record.headers,
    _record.body,
    scheme,
    _record.host,
    _record.port,
    _record.path,
    _record.query
  );
}
function set_host(req, host) {
  let _record = req;
  return new Request(
    _record.method,
    _record.headers,
    _record.body,
    _record.scheme,
    host,
    _record.port,
    _record.path,
    _record.query
  );
}
function set_port(req, port) {
  let _record = req;
  return new Request(
    _record.method,
    _record.headers,
    _record.body,
    _record.scheme,
    _record.host,
    new Some(port),
    _record.path,
    _record.query
  );
}
function set_path(req, path) {
  let _record = req;
  return new Request(
    _record.method,
    _record.headers,
    _record.body,
    _record.scheme,
    _record.host,
    _record.port,
    path,
    _record.query
  );
}

// build/dev/javascript/gleam_http/gleam/http/response.mjs
var Response = class extends CustomType {
  constructor(status, headers, body) {
    super();
    this.status = status;
    this.headers = headers;
    this.body = body;
  }
};

// build/dev/javascript/gleam_javascript/gleam_javascript_ffi.mjs
var PromiseLayer = class _PromiseLayer {
  constructor(promise) {
    this.promise = promise;
  }
  static wrap(value3) {
    return value3 instanceof Promise ? new _PromiseLayer(value3) : value3;
  }
  static unwrap(value3) {
    return value3 instanceof _PromiseLayer ? value3.promise : value3;
  }
};
function resolve(value3) {
  return Promise.resolve(PromiseLayer.wrap(value3));
}
function then_await(promise, fn) {
  return promise.then((value3) => fn(PromiseLayer.unwrap(value3)));
}
function map_promise(promise, fn) {
  return promise.then(
    (value3) => PromiseLayer.wrap(fn(PromiseLayer.unwrap(value3)))
  );
}
function rescue(promise, fn) {
  return promise.catch((error) => fn(error));
}

// build/dev/javascript/gleam_javascript/gleam/javascript/promise.mjs
function tap(promise, callback) {
  let _pipe = promise;
  return map_promise(
    _pipe,
    (a2) => {
      callback(a2);
      return a2;
    }
  );
}
function try_await(promise, callback) {
  let _pipe = promise;
  return then_await(
    _pipe,
    (result) => {
      if (result.isOk()) {
        let a2 = result[0];
        return callback(a2);
      } else {
        let e = result[0];
        return resolve(new Error(e));
      }
    }
  );
}

// build/dev/javascript/gleam_fetch/ffi.mjs
async function raw_send(request) {
  try {
    return new Ok(await fetch(request));
  } catch (error) {
    return new Error(new NetworkError(error.toString()));
  }
}
function from_fetch_response(response) {
  return new Response(
    response.status,
    List.fromArray([...response.headers]),
    response
  );
}
function to_fetch_request(request) {
  let url = to_string3(to_uri(request));
  let method = method_to_string(request.method).toUpperCase();
  let options = {
    headers: make_headers(request.headers),
    method
  };
  if (method !== "GET" && method !== "HEAD") options.body = request.body;
  return new globalThis.Request(url, options);
}
function make_headers(headersList) {
  let headers = new globalThis.Headers();
  for (let [k, v] of headersList) headers.append(k.toLowerCase(), v);
  return headers;
}
async function read_text_body(response) {
  let body;
  try {
    body = await response.body.text();
  } catch (error) {
    return new Error(new UnableToReadBody());
  }
  return new Ok(response.withFields({ body }));
}

// build/dev/javascript/gleam_fetch/gleam/fetch.mjs
var NetworkError = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UnableToReadBody = class extends CustomType {
};
function send(request) {
  let _pipe = request;
  let _pipe$1 = to_fetch_request(_pipe);
  let _pipe$2 = raw_send(_pipe$1);
  return try_await(
    _pipe$2,
    (resp) => {
      return resolve(new Ok(from_fetch_response(resp)));
    }
  );
}

// build/dev/javascript/lustre_http/lustre_http.mjs
var InternalServerError = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var JsonError = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var NetworkError2 = class extends CustomType {
};
var NotFound = class extends CustomType {
};
var OtherError = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Unauthorized = class extends CustomType {
};
var ExpectTextResponse = class extends CustomType {
  constructor(run4) {
    super();
    this.run = run4;
  }
};
function do_send(req, expect, dispatch) {
  let _pipe = send(req);
  let _pipe$1 = try_await(_pipe, read_text_body);
  let _pipe$2 = map_promise(
    _pipe$1,
    (response) => {
      if (response.isOk()) {
        let res = response[0];
        return expect.run(new Ok(res));
      } else {
        return expect.run(new Error(new NetworkError2()));
      }
    }
  );
  let _pipe$3 = rescue(
    _pipe$2,
    (_) => {
      return expect.run(new Error(new NetworkError2()));
    }
  );
  tap(_pipe$3, dispatch);
  return void 0;
}
function send2(req, expect) {
  return from((_capture) => {
    return do_send(req, expect, _capture);
  });
}
function response_to_result(response) {
  if (response instanceof Response && (200 <= response.status && response.status <= 299)) {
    let status = response.status;
    let body = response.body;
    return new Ok(body);
  } else if (response instanceof Response && response.status === 401) {
    return new Error(new Unauthorized());
  } else if (response instanceof Response && response.status === 404) {
    return new Error(new NotFound());
  } else if (response instanceof Response && response.status === 500) {
    let body = response.body;
    return new Error(new InternalServerError(body));
  } else {
    let code = response.status;
    let body = response.body;
    return new Error(new OtherError(code, body));
  }
}
function expect_json(decoder, to_msg) {
  return new ExpectTextResponse(
    (response) => {
      let _pipe = response;
      let _pipe$1 = then$(_pipe, response_to_result);
      let _pipe$2 = then$(
        _pipe$1,
        (body) => {
          let $ = parse(body, decoder);
          if ($.isOk()) {
            let json = $[0];
            return new Ok(json);
          } else {
            let json_error = $[0];
            return new Error(new JsonError(json_error));
          }
        }
      );
      return to_msg(_pipe$2);
    }
  );
}

// build/dev/javascript/budget_fe/budget_fe/internals/msg.mjs
var Home = class extends CustomType {
};
var TransactionsRoute = class extends CustomType {
};
var OnRouteChange = class extends CustomType {
  constructor(route) {
    super();
    this.route = route;
  }
};
var LoginPassword = class extends CustomType {
  constructor(login, pass) {
    super();
    this.login = login;
    this.pass = pass;
  }
};
var LoginSubmit = class extends CustomType {
};
var LoginResult = class extends CustomType {
  constructor(user, cycle) {
    super();
    this.user = user;
    this.cycle = cycle;
  }
};
var Categories = class extends CustomType {
  constructor(cats) {
    super();
    this.cats = cats;
  }
};
var Transactions = class extends CustomType {
  constructor(trans) {
    super();
    this.trans = trans;
  }
};
var Suggestions = class extends CustomType {
  constructor(trans) {
    super();
    this.trans = trans;
  }
};
var Allocations = class extends CustomType {
  constructor(a2) {
    super();
    this.a = a2;
  }
};
var SelectCategory = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var ShowAddCategoryUI = class extends CustomType {
  constructor(group_id) {
    super();
    this.group_id = group_id;
  }
};
var UserUpdatedCategoryName = class extends CustomType {
  constructor(cat_name) {
    super();
    this.cat_name = cat_name;
  }
};
var AddCategory = class extends CustomType {
  constructor(group_id) {
    super();
    this.group_id = group_id;
  }
};
var AddCategoryResult = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var AddTransaction = class extends CustomType {
};
var UserUpdatedTransactionDate = class extends CustomType {
  constructor(date) {
    super();
    this.date = date;
  }
};
var UserUpdatedTransactionPayee = class extends CustomType {
  constructor(payee) {
    super();
    this.payee = payee;
  }
};
var UserUpdatedTransactionCategory = class extends CustomType {
  constructor(cat) {
    super();
    this.cat = cat;
  }
};
var UserUpdatedTransactionAmount = class extends CustomType {
  constructor(amount) {
    super();
    this.amount = amount;
  }
};
var UserUpdatedTransactionIsInflow = class extends CustomType {
  constructor(is_inflow) {
    super();
    this.is_inflow = is_inflow;
  }
};
var AddTransactionResult = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var StartEditTarget = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var SaveTarget = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var DeleteTarget = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var UserTargetUpdateAmount = class extends CustomType {
  constructor(amount) {
    super();
    this.amount = amount;
  }
};
var EditTargetCadence = class extends CustomType {
  constructor(is_monthly) {
    super();
    this.is_monthly = is_monthly;
  }
};
var UserTargetUpdateCustomDate = class extends CustomType {
  constructor(date) {
    super();
    this.date = date;
  }
};
var CategorySaveTarget = class extends CustomType {
  constructor(a2) {
    super();
    this.a = a2;
  }
};
var SelectTransaction = class extends CustomType {
  constructor(t) {
    super();
    this.t = t;
  }
};
var EditTransaction = class extends CustomType {
  constructor(t, category_name) {
    super();
    this.t = t;
    this.category_name = category_name;
  }
};
var UpdateTransaction = class extends CustomType {
};
var DeleteTransaction = class extends CustomType {
  constructor(t_id) {
    super();
    this.t_id = t_id;
  }
};
var TransactionDeleteResult = class extends CustomType {
  constructor(a2) {
    super();
    this.a = a2;
  }
};
var TransactionEditResult = class extends CustomType {
  constructor(a2) {
    super();
    this.a = a2;
  }
};
var UserTransactionEditPayee = class extends CustomType {
  constructor(p) {
    super();
    this.p = p;
  }
};
var UserTransactionEditDate = class extends CustomType {
  constructor(d) {
    super();
    this.d = d;
  }
};
var UserTransactionEditCategory = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var UserTransactionEditAmount = class extends CustomType {
  constructor(a2) {
    super();
    this.a = a2;
  }
};
var UserEditTransactionIsInflow = class extends CustomType {
  constructor(is_inflow) {
    super();
    this.is_inflow = is_inflow;
  }
};
var UserInputCategoryUpdateName = class extends CustomType {
  constructor(n) {
    super();
    this.n = n;
  }
};
var UpdateCategoryName = class extends CustomType {
  constructor(cat) {
    super();
    this.cat = cat;
  }
};
var DeleteCategory = class extends CustomType {
};
var CategoryDeleteResult = class extends CustomType {
  constructor(a2) {
    super();
    this.a = a2;
  }
};
var SaveAllocation = class extends CustomType {
  constructor(allocation) {
    super();
    this.allocation = allocation;
  }
};
var SaveAllocationResult = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserAllocationUpdate = class extends CustomType {
  constructor(amount) {
    super();
    this.amount = amount;
  }
};
var CycleShift = class extends CustomType {
  constructor(shift) {
    super();
    this.shift = shift;
  }
};
var UserInputShowAllTransactions = class extends CustomType {
  constructor(show) {
    super();
    this.show = show;
  }
};
var AllocateNeeded = class extends CustomType {
  constructor(cat, needed_amount, alloc) {
    super();
    this.cat = cat;
    this.needed_amount = needed_amount;
    this.alloc = alloc;
  }
};
var ShowAddCategoryGroupUI = class extends CustomType {
};
var UserUpdatedCategoryGroupName = class extends CustomType {
  constructor(name) {
    super();
    this.name = name;
  }
};
var CreateCategoryGroup = class extends CustomType {
};
var AddCategoryGroupResult = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var CategoryGroups = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var ChangeGroupForCategory = class extends CustomType {
  constructor(cat) {
    super();
    this.cat = cat;
  }
};
var UserInputCategoryGroupChange = class extends CustomType {
  constructor(group_name) {
    super();
    this.group_name = group_name;
  }
};
var CollapseGroup = class extends CustomType {
  constructor(group) {
    super();
    this.group = group;
  }
};
var Model2 = class extends CustomType {
  constructor(login_form, current_user, cycle, route, cycle_end_day, show_all_transactions, categories_groups, categories, transactions, allocations, selected_category, show_add_category_ui, user_category_name_input, transaction_add_input, target_edit_form, selected_transaction, transaction_edit_form, suggestions, show_add_category_group_ui, new_category_group_name, category_group_change_input) {
    super();
    this.login_form = login_form;
    this.current_user = current_user;
    this.cycle = cycle;
    this.route = route;
    this.cycle_end_day = cycle_end_day;
    this.show_all_transactions = show_all_transactions;
    this.categories_groups = categories_groups;
    this.categories = categories;
    this.transactions = transactions;
    this.allocations = allocations;
    this.selected_category = selected_category;
    this.show_add_category_ui = show_add_category_ui;
    this.user_category_name_input = user_category_name_input;
    this.transaction_add_input = transaction_add_input;
    this.target_edit_form = target_edit_form;
    this.selected_transaction = selected_transaction;
    this.transaction_edit_form = transaction_edit_form;
    this.suggestions = suggestions;
    this.show_add_category_group_ui = show_add_category_group_ui;
    this.new_category_group_name = new_category_group_name;
    this.category_group_change_input = category_group_change_input;
  }
};
var SelectedCategory = class extends CustomType {
  constructor(id2, input_name, allocation) {
    super();
    this.id = id2;
    this.input_name = input_name;
    this.allocation = allocation;
  }
};
var TransactionForm = class extends CustomType {
  constructor(date, payee, category, amount, is_inflow) {
    super();
    this.date = date;
    this.payee = payee;
    this.category = category;
    this.amount = amount;
    this.is_inflow = is_inflow;
  }
};
var LoginForm = class extends CustomType {
  constructor(login, pass, is_loading) {
    super();
    this.login = login;
    this.pass = pass;
    this.is_loading = is_loading;
  }
};
var ShiftLeft = class extends CustomType {
};
var ShiftRight = class extends CustomType {
};
var TransactionEditForm = class extends CustomType {
  constructor(id2, date, payee, category_name, amount, is_inflow) {
    super();
    this.id = id2;
    this.date = date;
    this.payee = payee;
    this.category_name = category_name;
    this.amount = amount;
    this.is_inflow = is_inflow;
  }
};
var TargetEditForm = class extends CustomType {
  constructor(cat_id, target_amount2, target_custom_date, is_custom) {
    super();
    this.cat_id = cat_id;
    this.target_amount = target_amount2;
    this.target_custom_date = target_custom_date;
    this.is_custom = is_custom;
  }
};

// build/dev/javascript/budget_fe/budget_fe/internals/uuid.mjs
function format_uuid(src) {
  return slice(src, 0, 8) + "-" + slice(src, 8, 4) + "-" + slice(
    src,
    12,
    4
  ) + "-" + slice(src, 16, 4) + "-" + slice(src, 20, 12);
}
function guidv4() {
  let _block;
  let _pipe = random(4294967295);
  let _pipe$1 = to_base16(_pipe);
  _block = pad_start(_pipe$1, 8, "0");
  let a2 = _block;
  let _block$1;
  let _pipe$2 = random(4294967295);
  let _pipe$3 = bitwise_and(_pipe$2, 1073741823);
  let _pipe$4 = bitwise_or(_pipe$3, 0);
  let _pipe$5 = to_base16(_pipe$4);
  _block$1 = pad_start(_pipe$5, 8, "0");
  let b = _block$1;
  let _block$2;
  let _pipe$6 = random(4294967295);
  let _pipe$7 = bitwise_and(_pipe$6, 1073741823);
  let _pipe$8 = bitwise_or(_pipe$7, 2147483648);
  let _pipe$9 = to_base16(_pipe$8);
  _block$2 = pad_start(_pipe$9, 8, "0");
  let c = _block$2;
  let _block$3;
  let _pipe$10 = random(4294967295);
  let _pipe$11 = to_base16(_pipe$10);
  _block$3 = pad_start(_pipe$11, 8, "0");
  let d = _block$3;
  let concatened = a2 + b + c + d;
  return format_uuid(concatened);
}

// build/dev/javascript/budget_fe/budget_fe/internals/gleam.mjs
var CustomType2 = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label2) => label2 in fields ? fields[label2] : this[label2]
    );
    return new this.constructor(...properties);
  }
};
var Result2 = class _Result extends CustomType2 {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok2 = class extends Result2 {
  constructor(value3) {
    super();
    this[0] = value3;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error2 = class extends Result2 {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};

// build/dev/javascript/budget_fe/budget_fe/internals/app.ffi.mjs
function read_localstorage(key) {
  const value3 = window.localStorage.getItem(key);
  return value3 ? new Ok2(value3) : new Error2(void 0);
}
function write_localstorage(key, value3) {
  window.localStorage.setItem(key, value3);
}

// build/dev/javascript/budget_fe/budget_fe/internals/effects.mjs
function uri_to_route(uri) {
  let $ = path_segments(uri.path);
  if ($.hasLength(1) && $.head === "transactions") {
    return new TransactionsRoute();
  } else {
    return new Home();
  }
}
function on_route_change(uri) {
  let route = uri_to_route(uri);
  return new OnRouteChange(route);
}
function write_localstorage2(key, value3) {
  return from((_) => {
    return write_localstorage(key, value3);
  });
}
var is_prod = true;
function request_with_auth() {
  let _block;
  let _pipe = read_localstorage("jwt");
  echo(_pipe, "src/budget_fe/internals/effects.gleam", 35);
  _block = unwrap2(_pipe, "");
  let jwt = _block;
  let _block$1;
  let $ = is_prod;
  if ($) {
    let _pipe$12 = new$3();
    let _pipe$22 = set_host(_pipe$12, "budget-be.fly.dev");
    let _pipe$32 = set_port(_pipe$22, 443);
    _block$1 = set_scheme(_pipe$32, new Https());
  } else {
    let _pipe$12 = new$3();
    let _pipe$22 = set_host(_pipe$12, "127.0.0.1");
    let _pipe$32 = set_port(_pipe$22, 8080);
    _block$1 = set_scheme(_pipe$32, new Http());
  }
  let req = _block$1;
  let _pipe$1 = req;
  let _pipe$2 = set_method(_pipe$1, new Get());
  let _pipe$3 = set_header(_pipe$2, "Content-Type", "application/json");
  let _pipe$4 = set_header(_pipe$3, "Accept", "application/json");
  return set_header(_pipe$4, "Authorization", "Bearer " + jwt);
}
function make_request(method, path, json, decoder, to_msg) {
  let _block;
  let _pipe = request_with_auth();
  let _pipe$1 = set_method(_pipe, method);
  _block = set_path(_pipe$1, path);
  let req = _block;
  let _block$1;
  if (json instanceof Some) {
    let json$1 = json[0];
    let _pipe$2 = req;
    _block$1 = set_body(_pipe$2, json$1);
  } else {
    _block$1 = req;
  }
  let req_with_body = _block$1;
  return send2(
    req_with_body,
    expect_json(decoder, to_msg)
  );
}
function load_user_eff() {
  return make_request(
    new Get(),
    "user",
    new None(),
    user_with_token_decoder(),
    (user_with_token) => {
      return new LoginResult(user_with_token, calculate_current_cycle());
    }
  );
}
function make_post(path, json, decoder, to_msg) {
  return make_request(
    new Post(),
    path,
    new Some(json),
    decoder,
    to_msg
  );
}
function add_transaction_eff(transaction_form, amount, cat) {
  let t = new Transaction(
    guidv4(),
    (() => {
      let _pipe = transaction_form.date;
      let _pipe$1 = from_date_string(_pipe);
      return unwrap2(_pipe$1, today());
    })(),
    transaction_form.payee,
    cat.id,
    amount,
    ""
  );
  return make_post(
    "transaction/add",
    to_string2(transaction_encode(t)),
    transaction_decoder(),
    (var0) => {
      return new AddTransactionResult(var0);
    }
  );
}
function add_category(name, group_id) {
  return make_post(
    "category/add",
    to_string2(
      object2(
        toList([
          ["name", string4(name)],
          ["group_id", string4(group_id)]
        ])
      )
    ),
    id_decoder(),
    (var0) => {
      return new AddCategoryResult(var0);
    }
  );
}
function get_allocations() {
  let path = "allocations";
  let decoder = list2(allocation_decoder());
  return send2(
    (() => {
      let _pipe = request_with_auth();
      return set_path(_pipe, path);
    })(),
    expect_json(
      decoder,
      (var0) => {
        return new Allocations(var0);
      }
    )
  );
}
function get_categories() {
  let path = "categories";
  let decoder = list2(category_decoder());
  return send2(
    (() => {
      let _pipe = request_with_auth();
      return set_path(_pipe, path);
    })(),
    expect_json(
      decoder,
      (var0) => {
        return new Categories(var0);
      }
    )
  );
}
function get_transactions() {
  let path = "transactions";
  let decoder = list2(transaction_decoder());
  return send2(
    (() => {
      let _pipe = request_with_auth();
      return set_path(_pipe, path);
    })(),
    expect_json(
      decoder,
      (var0) => {
        return new Transactions(var0);
      }
    )
  );
}
function get_category_groups() {
  let path = "category/groups";
  let decoder = list2(category_group_decoder());
  return send2(
    (() => {
      let _pipe = request_with_auth();
      return set_path(_pipe, path);
    })(),
    expect_json(
      decoder,
      (var0) => {
        return new CategoryGroups(var0);
      }
    )
  );
}
function add_new_group_eff(name) {
  return make_post(
    "category/group/add",
    to_string2(object2(toList([["name", string4(name)]]))),
    id_decoder(),
    (var0) => {
      return new AddCategoryGroupResult(var0);
    }
  );
}
function update_group_eff(group) {
  return make_request(
    new Put(),
    "category/group",
    (() => {
      let _pipe = to_string2(category_group_encode(group));
      return new Some(_pipe);
    })(),
    id_decoder(),
    (var0) => {
      return new AddCategoryGroupResult(var0);
    }
  );
}
function create_allocation_eff(money, category_id, cycle) {
  return make_post(
    "allocation/add",
    to_string2(
      allocation_form_encode(
        new AllocationForm(new None(), money, category_id, cycle)
      )
    ),
    id_decoder(),
    (var0) => {
      return new SaveAllocationResult(var0);
    }
  );
}
function update_allocation_eff(a2, amount) {
  return make_request(
    new Put(),
    "allocation/" + a2.id,
    (() => {
      let _pipe = to_string2(
        allocation_encode(
          new Allocation(a2.id, amount, a2.category_id, a2.date)
        )
      );
      return new Some(_pipe);
    })(),
    id_decoder(),
    (var0) => {
      return new SaveAllocationResult(var0);
    }
  );
}
function save_allocation_eff(alloc, money, category_id, cycle) {
  if (alloc instanceof Some) {
    let allocation = alloc[0];
    return update_allocation_eff(allocation, money);
  } else {
    return create_allocation_eff(money, category_id, cycle);
  }
}
function delete_category_eff(c_id) {
  return make_request(
    new Delete(),
    "category/" + c_id,
    new None(),
    id_decoder(),
    (var0) => {
      return new CategoryDeleteResult(var0);
    }
  );
}
function update_transaction_eff(t) {
  return make_request(
    new Put(),
    "transaction/" + t.id,
    (() => {
      let _pipe = to_string2(transaction_encode(t));
      return new Some(_pipe);
    })(),
    id_decoder(),
    (var0) => {
      return new TransactionEditResult(var0);
    }
  );
}
function delete_transaction_eff(t_id) {
  return make_request(
    new Delete(),
    "transaction/" + t_id,
    new None(),
    id_decoder(),
    (var0) => {
      return new TransactionDeleteResult(var0);
    }
  );
}
function update_category_target_eff(category, target_edit) {
  let _block;
  let _pipe = target_edit;
  _block = map(
    _pipe,
    (target_edit_form) => {
      let $ = target_edit_form.is_custom;
      if ($) {
        return new Custom(
          (() => {
            let _pipe$1 = target_edit_form.target_amount;
            return string_to_money(_pipe$1);
          })(),
          (() => {
            let _pipe$1 = target_edit_form.target_custom_date;
            let _pipe$2 = map(
              _pipe$1,
              (str) => {
                return date_string_to_month(str);
              }
            );
            return unwrap(_pipe$2, new MonthInYear(0, 0));
          })()
        );
      } else {
        return new Monthly(
          (() => {
            let _pipe$1 = target_edit_form.target_amount;
            return string_to_money(_pipe$1);
          })()
        );
      }
    }
  );
  let target = _block;
  return make_request(
    new Put(),
    "category/" + category.id,
    (() => {
      let _pipe$1 = to_string2(
        category_encode(
          (() => {
            let _record = category;
            return new Category(
              _record.id,
              _record.name,
              target,
              _record.inflow,
              _record.group_id
            );
          })()
        )
      );
      return new Some(_pipe$1);
    })(),
    id_decoder(),
    (var0) => {
      return new CategorySaveTarget(var0);
    }
  );
}
function update_category_eff(category) {
  return make_request(
    new Put(),
    "category/" + category.id,
    (() => {
      let _pipe = to_string2(category_encode(category));
      return new Some(_pipe);
    })(),
    id_decoder(),
    (var0) => {
      return new CategorySaveTarget(var0);
    }
  );
}
function delete_target_eff(category) {
  return make_request(
    new Delete(),
    "category/target/" + category.id,
    new None(),
    id_decoder(),
    (var0) => {
      return new CategorySaveTarget(var0);
    }
  );
}
function login_eff(login, pass) {
  return make_post(
    "login",
    to_string2(
      object2(
        toList([["login", string4(login)], ["pass", string4(pass)]])
      )
    ),
    user_with_token_decoder(),
    (user_with_token) => {
      return new LoginResult(user_with_token, calculate_current_cycle());
    }
  );
}
function get_category_suggestions() {
  let path = "category/suggestions";
  let decoder = category_suggestions_decoder();
  return send2(
    (() => {
      let _pipe = request_with_auth();
      return set_path(_pipe, path);
    })(),
    expect_json(
      decoder,
      (var0) => {
        return new Suggestions(var0);
      }
    )
  );
}
function echo(value3, file, line) {
  const grey = "\x1B[90m";
  const reset_color = "\x1B[39m";
  const file_line = `${file}:${line}`;
  const string_value = echo$inspect(value3);
  if (globalThis.process?.stderr?.write) {
    const string5 = `${grey}${file_line}${reset_color}
${string_value}
`;
    process.stderr.write(string5);
  } else if (globalThis.Deno) {
    const string5 = `${grey}${file_line}${reset_color}
${string_value}
`;
    globalThis.Deno.stderr.writeSync(new TextEncoder().encode(string5));
  } else {
    const string5 = `${file_line}
${string_value}`;
    globalThis.console.log(string5);
  }
  return value3;
}
function echo$inspectString(str) {
  let new_str = '"';
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    if (char == "\n") new_str += "\\n";
    else if (char == "\r") new_str += "\\r";
    else if (char == "	") new_str += "\\t";
    else if (char == "\f") new_str += "\\f";
    else if (char == "\\") new_str += "\\\\";
    else if (char == '"') new_str += '\\"';
    else if (char < " " || char > "~" && char < "\xA0") {
      new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
    } else {
      new_str += char;
    }
  }
  new_str += '"';
  return new_str;
}
function echo$inspectDict(map8) {
  let body = "dict.from_list([";
  let first2 = true;
  let key_value_pairs = [];
  map8.forEach((value3, key) => {
    key_value_pairs.push([key, value3]);
  });
  key_value_pairs.sort();
  key_value_pairs.forEach(([key, value3]) => {
    if (!first2) body = body + ", ";
    body = body + "#(" + echo$inspect(key) + ", " + echo$inspect(value3) + ")";
    first2 = false;
  });
  return body + "])";
}
function echo$inspectCustomType(record) {
  const props = globalThis.Object.keys(record).map((label2) => {
    const value3 = echo$inspect(record[label2]);
    return isNaN(parseInt(label2)) ? `${label2}: ${value3}` : value3;
  }).join(", ");
  return props ? `${record.constructor.name}(${props})` : record.constructor.name;
}
function echo$inspectObject(v) {
  const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${echo$inspect(k)}: ${echo$inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name === "Object" ? "" : name + " ";
  return `//js(${head}{${body}})`;
}
function echo$inspect(v) {
  const t = typeof v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null) return "//js(null)";
  if (v === void 0) return "Nil";
  if (t === "string") return echo$inspectString(v);
  if (t === "bigint" || t === "number") return v.toString();
  if (globalThis.Array.isArray(v))
    return `#(${v.map(echo$inspect).join(", ")})`;
  if (v instanceof List)
    return `[${v.toArray().map(echo$inspect).join(", ")}]`;
  if (v instanceof UtfCodepoint)
    return `//utfcodepoint(${String.fromCodePoint(v.value)})`;
  if (v instanceof BitArray) return echo$inspectBitArray(v);
  if (v instanceof CustomType) return echo$inspectCustomType(v);
  if (echo$isDict(v)) return echo$inspectDict(v);
  if (v instanceof Set)
    return `//js(Set(${[...v].map(echo$inspect).join(", ")}))`;
  if (v instanceof RegExp) return `//js(${v})`;
  if (v instanceof Date) return `//js(Date("${v.toISOString()}"))`;
  if (v instanceof Function) {
    const args = [];
    for (const i of Array(v.length).keys())
      args.push(String.fromCharCode(i + 97));
    return `//fn(${args.join(", ")}) { ... }`;
  }
  return echo$inspectObject(v);
}
function echo$inspectBitArray(bitArray) {
  let endOfAlignedBytes = bitArray.bitOffset + 8 * Math.trunc(bitArray.bitSize / 8);
  let alignedBytes = bitArraySlice(
    bitArray,
    bitArray.bitOffset,
    endOfAlignedBytes
  );
  let remainingUnalignedBits = bitArray.bitSize % 8;
  if (remainingUnalignedBits > 0) {
    let remainingBits = bitArraySliceToInt(
      bitArray,
      endOfAlignedBytes,
      bitArray.bitSize,
      false,
      false
    );
    let alignedBytesArray = Array.from(alignedBytes.rawBuffer);
    let suffix = `${remainingBits}:size(${remainingUnalignedBits})`;
    if (alignedBytesArray.length === 0) {
      return `<<${suffix}>>`;
    } else {
      return `<<${Array.from(alignedBytes.rawBuffer).join(", ")}, ${suffix}>>`;
    }
  } else {
    return `<<${Array.from(alignedBytes.rawBuffer).join(", ")}>>`;
  }
}
function echo$isDict(value3) {
  try {
    return value3 instanceof Dict;
  } catch {
    return false;
  }
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text2(content) {
  return text(content);
}
function div(attrs, children2) {
  return element("div", attrs, children2);
}
function a(attrs, children2) {
  return element("a", attrs, children2);
}
function table(attrs, children2) {
  return element("table", attrs, children2);
}
function tbody(attrs, children2) {
  return element("tbody", attrs, children2);
}
function td(attrs, children2) {
  return element("td", attrs, children2);
}
function th(attrs, children2) {
  return element("th", attrs, children2);
}
function thead(attrs, children2) {
  return element("thead", attrs, children2);
}
function tr(attrs, children2) {
  return element("tr", attrs, children2);
}
function button(attrs, children2) {
  return element("button", attrs, children2);
}
function datalist(attrs, children2) {
  return element("datalist", attrs, children2);
}
function input(attrs) {
  return element("input", attrs, toList([]));
}
function label(attrs, children2) {
  return element("label", attrs, children2);
}
function option(attrs, label2) {
  return element("option", attrs, toList([text(label2)]));
}
function select(attrs, children2) {
  return element("select", attrs, children2);
}

// build/dev/javascript/lustre/lustre/event.mjs
function on2(name, handler) {
  return on(name, handler);
}
function on_click(msg) {
  return on2("click", (_) => {
    return new Ok(msg);
  });
}
function value2(event2) {
  let _pipe = event2;
  return field("target", field("value", string))(
    _pipe
  );
}
function on_input(msg) {
  return on2(
    "input",
    (event2) => {
      let _pipe = value2(event2);
      return map3(_pipe, msg);
    }
  );
}
function checked2(event2) {
  let _pipe = event2;
  return field("target", field("checked", bool))(
    _pipe
  );
}
function on_check(msg) {
  return on2(
    "change",
    (event2) => {
      let _pipe = checked2(event2);
      return map3(_pipe, msg);
    }
  );
}

// build/dev/javascript/budget_fe/budget_fe/internals/view.mjs
function auth_screen(form) {
  return div(
    toList([class$("mt-3 rounded-3 p-2")]),
    toList([
      text2("Log in:"),
      input(
        toList([
          on_input(
            (login) => {
              return new LoginPassword(
                new Some(login),
                new None()
              );
            }
          ),
          placeholder("Login"),
          class$("form-control"),
          type_("text"),
          style(toList([["width", "120px"]])),
          value(
            (() => {
              let _pipe = form.login;
              return unwrap(_pipe, "");
            })()
          )
        ])
      ),
      input(
        toList([
          on_input(
            (pass) => {
              return new LoginPassword(
                new None(),
                new Some(pass)
              );
            }
          ),
          placeholder("Password"),
          class$("form-control"),
          type_("password"),
          style(toList([["width", "120px"]])),
          value(
            (() => {
              let _pipe = form.pass;
              return unwrap(_pipe, "");
            })()
          )
        ])
      ),
      button(
        toList([
          class$("mt-1"),
          on_click(new LoginSubmit())
        ]),
        toList([text("Login")])
      )
    ])
  );
}
function section_buttons(route) {
  let _block;
  if (route instanceof Home) {
    _block = ["active", ""];
  } else {
    _block = ["", "active"];
  }
  let $ = _block;
  let cat_active = $[0];
  let transactions_active = $[1];
  return div(
    toList([
      class$("btn-group "),
      style(toList([["height", "fit-content"]]))
    ]),
    toList([
      a(
        toList([
          attribute("aria-current", "page"),
          class$("btn btn-primary " + cat_active),
          href("/")
        ]),
        toList([text2("Budget")])
      ),
      a(
        toList([
          class$("btn btn-primary " + transactions_active),
          href("/transactions")
        ]),
        toList([text2("Transactions")])
      )
    ])
  );
}
function row2(class$2, style2, fun) {
  return div(
    toList([
      class$("d-flex flex-row " + class$2),
      style(style2)
    ]),
    fun()
  );
}
function column2(class$2, style2, fun) {
  return div(
    toList([
      class$("d-flex flex-column  p-1" + class$2),
      style(style2)
    ]),
    fun()
  );
}
function column(fun) {
  return column2("", toList([]), fun);
}
function category_cycle_allocation(allocations, cycle, c) {
  let _pipe = allocations;
  let _pipe$1 = filter(_pipe, (a2) => {
    return isEqual(a2.date, cycle);
  });
  let _pipe$2 = find(_pipe$1, (a2) => {
    return a2.category_id === c.id;
  });
  return from_result(_pipe$2);
}
function get_selected_category(model) {
  let _pipe = model.selected_category;
  let _pipe$1 = map(
    _pipe,
    (selected_cat) => {
      let _pipe$12 = model.categories;
      let _pipe$2 = find(
        _pipe$12,
        (cat) => {
          return cat.id === selected_cat.id;
        }
      );
      return from_result(_pipe$2);
    }
  );
  return flatten(_pipe$1);
}
function transaction_category_name(t, cats) {
  let $ = find(cats, (c) => {
    return c.id === t.category_id;
  });
  if ($.isOk()) {
    let c = $[0];
    return c.name;
  } else {
    return "not found";
  }
}
function cycle_to_text(c) {
  return (() => {
    let _pipe = c.month;
    return month_to_name2(_pipe);
  })() + " " + (() => {
    let _pipe = c.year;
    return to_string(_pipe);
  })();
}
function prev_month(year2, month2) {
  let mon_num = month_to_number(month2);
  if (mon_num === 1) {
    return [year2 - 1, 12];
  } else {
    return [year2, mon_num - 1];
  }
}
function cycle_bounds(c, cycle_end_day) {
  if (cycle_end_day instanceof None) {
    return [
      from_calendar_date(c.year, c.month, 1),
      from_calendar_date(
        c.year,
        c.month,
        days_in_month2(c.year, c.month)
      )
    ];
  } else {
    let last_day = cycle_end_day[0];
    let $ = prev_month(c.year, c.month);
    let prev_year = $[0];
    let prev_month$1 = $[1];
    return [
      from_calendar_date(
        prev_year,
        month_by_number(prev_month$1),
        last_day + 1
      ),
      from_calendar_date(c.year, c.month, last_day)
    ];
  }
}
function current_cycle_bounds(model) {
  let $ = cycle_bounds(model.cycle, model.cycle_end_day);
  let start3 = $[0];
  let end = $[1];
  return (() => {
    let _pipe = start3;
    return to_date_string(_pipe);
  })() + " - " + (() => {
    let _pipe = end;
    return to_date_string(_pipe);
  })();
}
function cycle_display(model) {
  return row2(
    "",
    toList([["height", "fit-content"]]),
    () => {
      return toList([
        button(
          toList([
            class$("btn btn-secondary mt-2 me-2"),
            style(toList([["height", "fit-content"]])),
            on_click(new CycleShift(new ShiftLeft()))
          ]),
          toList([text("<")])
        ),
        column(
          () => {
            return toList([
              div(
                toList([
                  class$("text-center fs-4"),
                  style(
                    toList([["justify-content", "center"], ["width", "170px"]])
                  )
                ]),
                toList([
                  text(
                    (() => {
                      let _pipe = model.cycle;
                      return cycle_to_text(_pipe);
                    })()
                  )
                ])
              ),
              div(
                toList([
                  class$("text-start fs-6"),
                  style(toList([["width", "200px"]]))
                ]),
                toList([text(current_cycle_bounds(model))])
              )
            ]);
          }
        ),
        button(
          toList([
            class$("btn btn-secondary mt-2 "),
            style(toList([["height", "fit-content"]])),
            on_click(new CycleShift(new ShiftRight()))
          ]),
          toList([text(">")])
        )
      ]);
    }
  );
}
function current_cycle_transactions(model) {
  let $ = cycle_bounds(model.cycle, model.cycle_end_day);
  let start3 = $[0];
  let end = $[1];
  return filter(
    model.transactions,
    (t) => {
      return is_between(t.date, start3, end);
    }
  );
}
function category_activity(cat, transactions) {
  let _pipe = transactions;
  let _pipe$1 = filter(_pipe, (t) => {
    return t.category_id === cat.id;
  });
  return fold2(
    _pipe$1,
    new Money(0),
    (m, t) => {
      return money_sum(m, t.value);
    }
  );
}
function target_switcher_ui(et) {
  let _block;
  let $1 = et.is_custom;
  if ($1) {
    _block = ["", "active"];
  } else {
    _block = ["active", ""];
  }
  let $ = _block;
  let monthly = $[0];
  let custom3 = $[1];
  return div(
    toList([
      attribute("aria-label", "Basic example"),
      role("group"),
      class$("btn-group mt-1")
    ]),
    toList([
      button(
        toList([
          on_click(new EditTargetCadence(true)),
          class$("btn btn-primary" + monthly),
          type_("button")
        ]),
        toList([text2("Monthly")])
      ),
      button(
        toList([
          on_click(new EditTargetCadence(false)),
          class$("btn btn-primary" + custom3),
          type_("button")
        ]),
        toList([text2("Custom")])
      )
    ])
  );
}
function custom_target_money_in_month(m, date) {
  let final_date = from_calendar_date(
    date.year,
    number_to_month(date.month),
    28
  );
  let months_count = diff(new Months(), today(), final_date) + 1;
  return divide_money(m, months_count);
}
function target_money(category) {
  let $ = category.target;
  if ($ instanceof None) {
    return new Money(0);
  } else if ($ instanceof Some && $[0] instanceof Custom) {
    let amount = $[0].target;
    let date_till = $[0].date;
    return custom_target_money_in_month(amount, date_till);
  } else {
    let amount = $[0].target;
    return amount;
  }
}
function ready_to_assign_money(transactions, allocations, cycle, categories) {
  let _block;
  let _pipe = categories;
  _block = filter_map(
    _pipe,
    (c) => {
      let $ = c.inflow;
      if ($) {
        return new Ok(c.id);
      } else {
        return new Error("");
      }
    }
  );
  let income_cat_ids = _block;
  let _block$1;
  let _pipe$1 = transactions;
  let _pipe$2 = filter(
    _pipe$1,
    (t) => {
      let _pipe$22 = income_cat_ids;
      return contains(_pipe$22, t.category_id);
    }
  );
  _block$1 = fold2(
    _pipe$2,
    new Money(0),
    (m, t) => {
      return money_sum(m, t.value);
    }
  );
  let income = _block$1;
  let _block$2;
  let _pipe$3 = allocations;
  let _pipe$4 = filter_map(
    _pipe$3,
    (a2) => {
      let $ = isEqual(a2.date, cycle);
      if ($) {
        return new Ok(a2.amount);
      } else {
        return new Error("");
      }
    }
  );
  _block$2 = fold2(
    _pipe$4,
    new Money(0),
    (m, t) => {
      return money_sum(m, t);
    }
  );
  let outcome = _block$2;
  let _pipe$5 = new Money(income.value - outcome.value);
  return money_to_string(_pipe$5);
}
function ready_to_assign(model) {
  return div(
    toList([
      class$(" text-black rounded-3 p-2"),
      style(
        toList([
          ["width", "200px"],
          ["height", "fit-content"],
          ["background-color", "rgb(187, 235, 156)"]
        ])
      )
    ]),
    toList([
      div(
        toList([class$("text-center fs-3 fw-bold")]),
        toList([
          text(
            ready_to_assign_money(
              current_cycle_transactions(model),
              model.allocations,
              model.cycle,
              model.categories
            )
          )
        ])
      ),
      div(
        toList([class$("text-center")]),
        toList([text("Ready to Assign")])
      )
    ])
  );
}
function check_box(label2, is_checked, msg) {
  return div(
    toList([class$("ms-2"), class$("form-check")]),
    toList([
      input(
        toList([
          id("flexCheckDefault"),
          on_check(msg),
          type_("checkbox"),
          class$("form-check-input"),
          checked(is_checked)
        ])
      ),
      label(
        toList([
          for$("flexCheckDefault"),
          class$("form-check-label")
        ]),
        toList([text2(label2)])
      )
    ])
  );
}
function manage_transaction_buttons(t, selected_id, category_name, is_edit) {
  let $ = selected_id === t.id;
  if (!$) {
    return text2("");
  } else {
    return div(
      toList([class$("mt-1")]),
      toList([
        (() => {
          if (is_edit) {
            return button(
              toList([on_click(new UpdateTransaction())]),
              toList([text("Save")])
            );
          } else {
            return button(
              toList([
                on_click(new EditTransaction(t, category_name))
              ]),
              toList([text("Edit")])
            );
          }
        })(),
        button(
          toList([
            class$("ms-1"),
            on_click(new DeleteTransaction(t.id))
          ]),
          toList([text("Delete")])
        )
      ])
    );
  }
}
function transaction_edit_ui(transaction, category_name, active_class, tef, model) {
  return tr(
    toList([class$(active_class)]),
    toList([
      td(
        toList([]),
        toList([
          input(
            toList([
              on_input(
                (var0) => {
                  return new UserTransactionEditDate(var0);
                }
              ),
              placeholder("date"),
              value(tef.date),
              class$("form-control"),
              type_("date"),
              style(toList([["width", "140px"]]))
            ])
          )
        ])
      ),
      td(
        toList([]),
        toList([
          input(
            toList([
              on_input(
                (var0) => {
                  return new UserTransactionEditPayee(var0);
                }
              ),
              placeholder("payee"),
              value(tef.payee),
              class$("form-control"),
              type_("text"),
              style(toList([["width", "160px"]])),
              attribute("list", "payees_list")
            ])
          ),
          datalist(
            toList([id("payees_list")]),
            (() => {
              let _pipe = model.transactions;
              let _pipe$1 = map2(_pipe, (t) => {
                return t.payee;
              });
              return map2(
                _pipe$1,
                (p) => {
                  return option(toList([value(p)]), "");
                }
              );
            })()
          )
        ])
      ),
      td(
        toList([]),
        toList([
          input(
            toList([
              on_input(
                (var0) => {
                  return new UserTransactionEditCategory(var0);
                }
              ),
              placeholder("category"),
              value(tef.category_name),
              class$("form-control"),
              type_("text"),
              style(toList([["width", "160px"]])),
              attribute("list", "categories_list")
            ])
          ),
          datalist(
            toList([id("categories_list")]),
            (() => {
              let _pipe = model.categories;
              let _pipe$1 = map2(_pipe, (c) => {
                return c.name;
              });
              return map2(
                _pipe$1,
                (p) => {
                  return option(toList([value(p)]), "");
                }
              );
            })()
          )
        ])
      ),
      td(
        toList([]),
        toList([
          input(
            toList([
              on_input(
                (var0) => {
                  return new UserTransactionEditAmount(var0);
                }
              ),
              placeholder("amount"),
              value(tef.amount),
              class$("form-control"),
              type_("text"),
              style(toList([["width", "160px"]]))
            ])
          ),
          check_box(
            "is inflow",
            tef.is_inflow,
            (var0) => {
              return new UserEditTransactionIsInflow(var0);
            }
          ),
          (() => {
            let _block;
            let _pipe = model.selected_transaction;
            _block = unwrap(_pipe, "");
            let selected_id = _block;
            return manage_transaction_buttons(
              transaction,
              selected_id,
              category_name,
              true
            );
          })()
        ])
      )
    ])
  );
}
function transaction_list_item_html(t, model) {
  let _block;
  let _pipe = model.selected_transaction;
  _block = unwrap(_pipe, "");
  let selected_id = _block;
  let _block$1;
  let $ = selected_id === t.id;
  if ($) {
    _block$1 = "table-active";
  } else {
    _block$1 = "";
  }
  let active_class = _block$1;
  let _block$2;
  let _pipe$1 = model.transaction_edit_form;
  let _pipe$2 = map(_pipe$1, (tef) => {
    return tef.id;
  });
  _block$2 = unwrap(_pipe$2, "-1");
  let transaction_edit_id = _block$2;
  let is_edit_mode = transaction_edit_id === t.id;
  let category_name = transaction_category_name(t, model.categories);
  let $1 = model.transaction_edit_form;
  if (is_edit_mode && $1 instanceof Some) {
    let tef = $1[0];
    return transaction_edit_ui(t, category_name, active_class, tef, model);
  } else {
    return tr(
      toList([
        on_click(new SelectTransaction(t)),
        class$(active_class)
      ]),
      toList([
        td(
          toList([]),
          toList([text2(to_date_string(t.date))])
        ),
        td(toList([]), toList([text2(t.payee)])),
        td(toList([]), toList([text2(category_name)])),
        td(
          toList([]),
          toList([
            text2(
              (() => {
                let _pipe$3 = t.value;
                return money_to_string(_pipe$3);
              })()
            ),
            manage_transaction_buttons(t, selected_id, category_name, false)
          ])
        )
      ])
    );
  }
}
function add_transaction_ui(transactions, categories, transaction_edit_form) {
  return tr(
    toList([]),
    toList([
      td(
        toList([]),
        toList([
          input(
            toList([
              on_input(
                (var0) => {
                  return new UserUpdatedTransactionDate(var0);
                }
              ),
              placeholder("date"),
              id("addTransactionDateId"),
              class$("form-control"),
              type_("date"),
              value(transaction_edit_form.date)
            ])
          )
        ])
      ),
      td(
        toList([]),
        toList([
          input(
            toList([
              on_input(
                (var0) => {
                  return new UserUpdatedTransactionPayee(var0);
                }
              ),
              placeholder("payee"),
              id("addTransactionPayeeId"),
              class$("form-control"),
              type_("text"),
              attribute("list", "payees_list"),
              value(transaction_edit_form.payee)
            ])
          ),
          datalist(
            toList([id("payees_list")]),
            (() => {
              let _pipe = transactions;
              let _pipe$1 = map2(_pipe, (t) => {
                return t.payee;
              });
              let _pipe$2 = unique(_pipe$1);
              return map2(
                _pipe$2,
                (p) => {
                  return option(toList([value(p)]), "");
                }
              );
            })()
          )
        ])
      ),
      td(
        toList([]),
        toList([
          select(
            toList([
              on_input(
                (var0) => {
                  return new UserUpdatedTransactionCategory(var0);
                }
              ),
              class$("form-select"),
              value(
                (() => {
                  let _pipe = transaction_edit_form.category;
                  let _pipe$1 = map(_pipe, (c) => {
                    return c.name;
                  });
                  return unwrap(_pipe$1, "");
                })()
              )
            ]),
            (() => {
              let _pipe = categories;
              let _pipe$1 = map2(_pipe, (c) => {
                return c.name;
              });
              return map2(
                _pipe$1,
                (p) => {
                  return option(toList([value(p)]), p);
                }
              );
            })()
          )
        ])
      ),
      td(
        toList([class$("d-flex flex-row")]),
        toList([
          input(
            toList([
              on_input(
                (var0) => {
                  return new UserUpdatedTransactionAmount(var0);
                }
              ),
              placeholder("amount"),
              id("addTransactionAmountId"),
              class$("form-control"),
              type_("text"),
              style(toList([["width", "120px"]])),
              value(transaction_edit_form.amount)
            ])
          ),
          check_box(
            "is inflow",
            transaction_edit_form.is_inflow,
            (var0) => {
              return new UserUpdatedTransactionIsInflow(var0);
            }
          ),
          button(
            toList([
              class$("ms-1"),
              on_click(new AddTransaction())
            ]),
            toList([text("Add")])
          )
        ])
      )
    ])
  );
}
function budget_transactions(model) {
  return div(
    toList([class$("d-flex flex-column flex-fill")]),
    toList([
      check_box(
        "Show all transactions",
        model.show_all_transactions,
        (var0) => {
          return new UserInputShowAllTransactions(var0);
        }
      ),
      table(
        toList([class$("table table-sm table-hover")]),
        toList([
          thead(
            toList([]),
            toList([
              tr(
                toList([]),
                toList([
                  th(toList([]), toList([text2("Date")])),
                  th(toList([]), toList([text2("Payee")])),
                  th(toList([]), toList([text2("Category")])),
                  th(toList([]), toList([text2("Amount")]))
                ])
              )
            ])
          ),
          tbody(
            toList([]),
            flatten2(
              toList([
                toList([
                  add_transaction_ui(
                    model.transactions,
                    model.categories,
                    model.transaction_add_input
                  )
                ]),
                (() => {
                  let $ = model.show_all_transactions;
                  if (!$) {
                    let _pipe = current_cycle_transactions(model);
                    return map2(
                      _pipe,
                      (_capture) => {
                        return transaction_list_item_html(_capture, model);
                      }
                    );
                  } else {
                    let _pipe = model.transactions;
                    return map2(
                      _pipe,
                      (_capture) => {
                        return transaction_list_item_html(_capture, model);
                      }
                    );
                  }
                })()
              ])
            )
          )
        ])
      )
    ])
  );
}
function category_assigned(c, allocations, cycle) {
  let _pipe = allocations;
  let _pipe$1 = filter(_pipe, (a2) => {
    return isEqual(a2.date, cycle);
  });
  let _pipe$2 = filter(_pipe$1, (a2) => {
    return a2.category_id === c.id;
  });
  return fold2(
    _pipe$2,
    new Money(0),
    (m, t) => {
      return money_sum(m, t.amount);
    }
  );
}
function category_details_allocate_needed_ui(cat, allocation, model) {
  let target_money$1 = target_money(cat);
  let assigned = category_assigned(cat, model.allocations, model.cycle);
  let add_diff = new Money(assigned.value - target_money$1.value);
  let new_amount = new Money(
    assigned.value + (() => {
      let _pipe = add_diff.value;
      return absolute_value(_pipe);
    })()
  );
  let $ = add_diff.value < 0;
  if (!$) {
    return text2("");
  } else {
    return div(
      toList([class$("mt-3")]),
      toList([
        button(
          toList([
            on_click(
              new AllocateNeeded(cat, new_amount, allocation)
            )
          ]),
          toList([
            text(
              "Allocate needed " + (() => {
                let _pipe = add_diff;
                return money_to_string_no_sign(_pipe);
              })()
            )
          ])
        )
      ])
    );
  }
}
function category_details_cover_overspent_ui(cat, model, allocation) {
  let activity = category_activity(cat, current_cycle_transactions(model));
  let assigned = category_assigned(cat, model.allocations, model.cycle);
  let balance = money_sum(assigned, activity);
  let $ = balance.value < 0;
  if (!$) {
    return text2("");
  } else {
    return div(
      toList([class$("mt-3")]),
      toList([
        button(
          toList([
            on_click(
              new AllocateNeeded(
                cat,
                new Money(
                  assigned.value + (() => {
                    let _pipe = balance.value;
                    return absolute_value(_pipe);
                  })()
                ),
                allocation
              )
            )
          ]),
          toList([
            text(
              "Cover overspent " + (() => {
                let _pipe = balance;
                return money_to_string_no_sign(_pipe);
              })()
            )
          ])
        )
      ])
    );
  }
}
function div_context(text3, color) {
  return div(
    toList([
      class$("ms-2 p-1"),
      style(
        toList([["background-color", color], ["width", "fit-content"]])
      )
    ]),
    toList([text2(text3)])
  );
}
function category_balance(cat, model) {
  let target_money$1 = target_money(cat);
  let activity = category_activity(cat, current_cycle_transactions(model));
  let allocated = category_assigned(cat, model.allocations, model.cycle);
  let balance = money_sum(allocated, activity);
  let _block;
  let $ = (() => {
    let _pipe = balance;
    return is_zero_euro(_pipe);
  })();
  if ($) {
    _block = "rgb(137, 143, 138)";
  } else {
    let $12 = balance.value < 0;
    if ($12) {
      _block = "rgb(231, 41, 12)";
    } else {
      _block = "rgba(64,185,78,1)";
    }
  }
  let color = _block;
  let add_alloc_diff = new Money(allocated.value - target_money$1.value);
  let _block$1;
  let $1 = add_alloc_diff.value < 0;
  if (!$1) {
    _block$1 = text2("");
  } else {
    _block$1 = div_context(
      " Add more " + (() => {
        let _pipe = add_alloc_diff;
        return money_with_currency_no_sign(_pipe);
      })(),
      "rgb(235, 199, 16)"
    );
  }
  let warn_text = _block$1;
  return div(
    toList([class$("d-flex flex-row")]),
    toList([
      div_context(
        (() => {
          let _pipe = balance;
          return money_to_string(_pipe);
        })(),
        color
      ),
      warn_text
    ])
  );
}
function category_list_item_ui(categories, model, group) {
  let _pipe = categories;
  let _pipe$1 = filter(
    _pipe,
    (c) => {
      return !c.inflow && c.group_id === group.id;
    }
  );
  return map2(
    _pipe$1,
    (c) => {
      let _block;
      let $ = model.selected_category;
      if ($ instanceof None) {
        _block = "";
      } else {
        let selected_cat = $[0];
        let $1 = selected_cat.id === c.id;
        if ($1) {
          _block = "table-active";
        } else {
          _block = "";
        }
      }
      let active_class = _block;
      return tr(
        toList([
          on_click(new SelectCategory(c)),
          class$(active_class)
        ]),
        toList([
          td(toList([]), toList([text2(c.name)])),
          td(toList([]), toList([category_balance(c, model)]))
        ])
      );
    }
  );
}
function group_ui(group, model) {
  let _block;
  let $ = model.show_add_category_ui;
  if ($ instanceof Some) {
    let group_id = $[0];
    _block = group.id === group_id;
  } else {
    _block = false;
  }
  let is_current_group_active_add_ui = _block;
  let _block$1;
  if (!is_current_group_active_add_ui) {
    _block$1 = text2("");
  } else {
    _block$1 = tr(
      toList([]),
      toList([
        td(
          toList([]),
          toList([
            input(
              toList([
                on_input(
                  (var0) => {
                    return new UserUpdatedCategoryName(var0);
                  }
                ),
                placeholder("category name"),
                id("exampleFormControlInput1"),
                class$("form-control"),
                type_("text"),
                value(model.user_category_name_input)
              ])
            )
          ])
        ),
        td(
          toList([]),
          toList([
            button(
              toList([on_click(new AddCategory(group.id))]),
              toList([text("Add")])
            )
          ])
        )
      ])
    );
  }
  let add_cat_ui = _block$1;
  let _block$2;
  {
    let _block$32;
    if (is_current_group_active_add_ui) {
      _block$32 = "-";
    } else {
      _block$32 = "+";
    }
    let btn_label = _block$32;
    _block$2 = button(
      toList([
        class$("ms-1"),
        on_click(new ShowAddCategoryUI(group.id))
      ]),
      toList([text(btn_label)])
    );
  }
  let add_btn = _block$2;
  let _block$3;
  {
    let _block$42;
    let $12 = group.is_collapsed;
    if ($12) {
      _block$42 = " \u032C";
    } else {
      _block$42 = ">";
    }
    let btn_label = _block$42;
    _block$3 = button(
      toList([
        class$("ms-1"),
        on_click(new CollapseGroup(group))
      ]),
      toList([text(btn_label)])
    );
  }
  let collapse_ui = _block$3;
  let group_ui$1 = tr(
    toList([
      style(toList([["background-color", "rgb(199, 208, 201)"]]))
    ]),
    toList([
      td(
        toList([]),
        toList([text2(group.name), add_btn, collapse_ui])
      ),
      td(toList([]), toList([]))
    ])
  );
  let _block$4;
  let $1 = group.is_collapsed;
  if (!$1) {
    _block$4 = toList([]);
  } else {
    _block$4 = category_list_item_ui(model.categories, model, group);
  }
  let cats = _block$4;
  let _pipe = cats;
  let _pipe$1 = prepend2(_pipe, add_cat_ui);
  return prepend2(_pipe$1, group_ui$1);
}
function category_group_list_item_ui(groups, model) {
  let _pipe = groups;
  return flat_map(_pipe, (group) => {
    return group_ui(group, model);
  });
}
function budget_categories(model) {
  let _block;
  let $ = model.selected_category;
  if ($ instanceof None) {
    _block = "";
  } else {
    _block = "w-75";
  }
  let size = _block;
  return table(
    toList([class$(size + " table table-sm table-hover")]),
    toList([
      thead(
        toList([]),
        toList([
          tr(
            toList([]),
            toList([
              th(
                toList([]),
                toList([
                  text2("Categories groups"),
                  (() => {
                    let _block$1;
                    let $1 = model.show_add_category_group_ui;
                    if ($1) {
                      _block$1 = "-";
                    } else {
                      _block$1 = "+";
                    }
                    let btn_label = _block$1;
                    return button(
                      toList([
                        class$("ms-2"),
                        on_click(new ShowAddCategoryGroupUI())
                      ]),
                      toList([text(btn_label)])
                    );
                  })()
                ])
              ),
              th(toList([]), toList([text2("Balance")]))
            ])
          )
        ])
      ),
      tbody(
        toList([]),
        (() => {
          let categories_groups_ui = category_group_list_item_ui(
            model.categories_groups,
            model
          );
          let _block$1;
          let $1 = model.show_add_category_group_ui;
          if (!$1) {
            _block$1 = toList([]);
          } else {
            _block$1 = toList([
              tr(
                toList([]),
                toList([
                  td(
                    toList([]),
                    toList([
                      input(
                        toList([
                          on_input(
                            (var0) => {
                              return new UserUpdatedCategoryGroupName(var0);
                            }
                          ),
                          placeholder("Category group name"),
                          class$("form-control"),
                          type_("text")
                        ])
                      )
                    ])
                  ),
                  td(
                    toList([]),
                    toList([
                      button(
                        toList([on_click(new CreateCategoryGroup())]),
                        toList([text("Create group")])
                      )
                    ])
                  )
                ])
              )
            ]);
          }
          let add_cat_group_ui = _block$1;
          return flatten2(toList([add_cat_group_ui, categories_groups_ui]));
        })()
      )
    ])
  );
}
function month_to_string(value3) {
  return (() => {
    let _pipe = value3.month;
    let _pipe$1 = to_string(_pipe);
    return pad_start(_pipe$1, 2, "0");
  })() + "." + (() => {
    let _pipe = value3.year;
    let _pipe$1 = to_string(_pipe);
    return pad_start(_pipe$1, 2, "0");
  })();
}
function target_string(category) {
  let $ = category.target;
  if ($ instanceof None) {
    return "";
  } else if ($ instanceof Some && $[0] instanceof Custom) {
    let amount = $[0].target;
    let date_till = $[0].date;
    return "Monthly: " + (() => {
      let _pipe = custom_target_money_in_month(amount, date_till);
      return money_to_string(_pipe);
    })() + "\n till date: " + month_to_string(date_till) + " Total amount: " + money_to_string(
      amount
    );
  } else {
    let amount = $[0].target;
    return "Monthly: " + money_to_string(amount);
  }
}
var edit_name_side_panel_color = "rgb(227, 216, 241)";
function category_details_name_ui(category, sc) {
  return div(
    toList([
      class$("rounded-3 p-2 mt-3"),
      style(
        toList([
          ["height", "fit-content"],
          ["background-color", edit_name_side_panel_color]
        ])
      )
    ]),
    toList([
      input(
        toList([
          on_input(
            (var0) => {
              return new UserInputCategoryUpdateName(var0);
            }
          ),
          placeholder("category name"),
          class$("form-control"),
          type_("text"),
          style(toList([["width", "200px"]])),
          value(sc.input_name),
          class$("mb-2")
        ])
      ),
      button(
        toList([
          class$("me-3"),
          on_click(new UpdateCategoryName(category))
        ]),
        toList([text("Update")])
      ),
      button(
        toList([on_click(new DeleteCategory())]),
        toList([text("Delete")])
      )
    ])
  );
}
function category_details_change_group_ui(cat, model) {
  return div(
    toList([
      class$("mt-3 rounded-3 p-2"),
      style(
        toList([["background-color", edit_name_side_panel_color]])
      )
    ]),
    toList([
      text2("Change group"),
      input(
        toList([
          on_input(
            (var0) => {
              return new UserInputCategoryGroupChange(var0);
            }
          ),
          placeholder("group"),
          class$("form-control"),
          type_("text"),
          style(toList([["width", "160px"]])),
          attribute("list", "group_list")
        ])
      ),
      datalist(
        toList([id("group_list")]),
        (() => {
          let _pipe = model.categories_groups;
          let _pipe$1 = map2(_pipe, (t) => {
            return t.name;
          });
          return map2(
            _pipe$1,
            (p) => {
              return option(toList([value(p)]), "");
            }
          );
        })()
      ),
      button(
        toList([
          class$("mt-1"),
          on_click(new ChangeGroupForCategory(cat))
        ]),
        toList([text("Change group")])
      )
    ])
  );
}
var side_panel_color = "rgb(134, 217, 192)";
function category_details_allocation_ui(sc, allocation) {
  return div(
    toList([
      class$("mt-3 rounded-3 p-2"),
      style(toList([["background-color", side_panel_color]]))
    ]),
    toList([
      text2("Allocated: "),
      input(
        toList([
          on_input(
            (var0) => {
              return new UserAllocationUpdate(var0);
            }
          ),
          placeholder("amount"),
          class$("form-control"),
          type_("text"),
          style(toList([["width", "120px"]])),
          value(sc.allocation)
        ])
      ),
      button(
        toList([
          class$("mt-1"),
          on_click(new SaveAllocation(allocation))
        ]),
        toList([text("Save")])
      )
    ])
  );
}
function category_details_target_ui(cat, target_edit_option) {
  return div(
    toList([
      class$("mt-3 rounded-3 p-2 col mt-3"),
      style(toList([["background-color", side_panel_color]]))
    ]),
    (() => {
      if (target_edit_option instanceof Some) {
        let target_edit = target_edit_option[0];
        return toList([
          div(
            toList([]),
            toList([
              text2("Target"),
              button(
                toList([
                  class$("ms-3 me-1"),
                  on_click(new SaveTarget(cat))
                ]),
                toList([text("Save")])
              ),
              button(
                toList([on_click(new DeleteTarget(cat))]),
                toList([text("Delete")])
              )
            ])
          ),
          target_switcher_ui(target_edit),
          (() => {
            let $ = target_edit.is_custom;
            if ($) {
              debug(target_edit.target_custom_date);
              let _block;
              let _pipe = target_edit.target_custom_date;
              _block = unwrap(_pipe, "");
              let target_date2 = _block;
              return div(
                toList([class$("mt-1")]),
                toList([
                  text2("Amount needed for date: "),
                  input(
                    toList([
                      on_input(
                        (var0) => {
                          return new UserTargetUpdateAmount(var0);
                        }
                      ),
                      placeholder("amount"),
                      class$("form-control"),
                      type_("text"),
                      style(toList([["width", "120px"]])),
                      value(target_edit.target_amount)
                    ])
                  ),
                  input(
                    toList([
                      on_input(
                        (var0) => {
                          return new UserTargetUpdateCustomDate(var0);
                        }
                      ),
                      placeholder("date"),
                      class$("form-control mt-1"),
                      type_("date"),
                      value(target_date2)
                    ])
                  )
                ])
              );
            } else {
              return div(
                toList([class$("mt-1")]),
                toList([
                  text2("Amount monthly: "),
                  input(
                    toList([
                      on_input(
                        (var0) => {
                          return new UserTargetUpdateAmount(var0);
                        }
                      ),
                      placeholder("amount"),
                      class$("form-control"),
                      type_("text"),
                      style(toList([["width", "120px"]])),
                      value(target_edit.target_amount)
                    ])
                  )
                ])
              );
            }
          })()
        ]);
      } else {
        return toList([
          div(
            toList([]),
            toList([
              text2("Target"),
              button(
                toList([
                  class$("ms-3"),
                  on_click(new StartEditTarget(cat))
                ]),
                toList([text("Edit")])
              )
            ])
          ),
          div(
            toList([class$("mt-2")]),
            toList([text2(target_string(cat))])
          )
        ]);
      }
    })()
  );
}
var activity_side_panel_color = "rgb(197, 219, 212)";
function category_activity_ui(cat, model) {
  return div(
    toList([
      class$("mt-3 rounded-3 p-2"),
      style(
        toList([["background-color", activity_side_panel_color]])
      )
    ]),
    toList([
      div(
        toList([class$("col")]),
        toList([
          div(toList([]), toList([text2("Activity")])),
          div(
            toList([]),
            toList([
              text2(
                (() => {
                  let _pipe = category_activity(
                    cat,
                    current_cycle_transactions(model)
                  );
                  return money_to_string(_pipe);
                })()
              )
            ])
          )
        ])
      )
    ])
  );
}
function category_details(category, model, sc, allocation) {
  return div(
    toList([class$("col p-3")]),
    toList([
      category_activity_ui(category, model),
      category_details_target_ui(category, model.target_edit_form),
      category_details_allocation_ui(sc, allocation),
      category_details_allocate_needed_ui(category, allocation, model),
      category_details_cover_overspent_ui(category, model, allocation),
      category_details_name_ui(category, sc),
      category_details_change_group_ui(category, model)
    ])
  );
}
function category_details_ui(model) {
  let selected_cat = get_selected_category(model);
  let $ = model.route;
  let $1 = model.selected_category;
  if (selected_cat instanceof Some && $ instanceof Home && $1 instanceof Some) {
    let c = selected_cat[0];
    let sc = $1[0];
    return category_details(
      c,
      model,
      sc,
      category_cycle_allocation(model.allocations, model.cycle, c)
    );
  } else {
    return text2("");
  }
}
function view(model) {
  return div(
    toList([class$("container-fluid")]),
    toList([
      div(
        toList([class$("col")]),
        toList([
          div(
            toList([class$("d-flex flex-row p-3")]),
            toList([
              cycle_display(model),
              div(
                toList([
                  class$("d-flex flex-row  justify-content-center"),
                  style(toList([["width", "100%"]]))
                ]),
                toList([ready_to_assign(model)])
              ),
              div(
                toList([
                  class$("d-flex align-items-center fs-5"),
                  style(toList([]))
                ]),
                toList([
                  (() => {
                    let $ = model.current_user;
                    if ($ instanceof None) {
                      return text2("");
                    } else {
                      let user = $[0];
                      return text2(user.name);
                    }
                  })()
                ])
              )
            ])
          ),
          div(
            toList([class$("d-flex flex-row")]),
            toList([section_buttons(model.route)])
          ),
          div(
            toList([class$("d-flex flex-row")]),
            toList([
              (() => {
                let $ = model.current_user;
                if ($ instanceof None) {
                  return auth_screen(model.login_form);
                } else {
                  let $1 = model.route;
                  if ($1 instanceof Home) {
                    return budget_categories(model);
                  } else {
                    return budget_transactions(model);
                  }
                }
              })(),
              div(toList([]), toList([category_details_ui(model)]))
            ])
          )
        ])
      )
    ])
  );
}

// build/dev/javascript/budget_fe/budget_fe.mjs
function init3(_) {
  return [
    new Model2(
      new LoginForm(new None(), new None(), false),
      new None(),
      calculate_current_cycle(),
      new Home(),
      new Some(26),
      false,
      toList([]),
      toList([]),
      toList([]),
      toList([]),
      new None(),
      new None(),
      "",
      new TransactionForm("", "", new None(), "", false),
      new None(),
      new None(),
      new None(),
      new_map(),
      false,
      "",
      ""
    ),
    batch(
      toList([init2(on_route_change), load_user_eff()])
    )
  ];
}
function to_money(tf) {
  let _block;
  let _pipe = tf.amount;
  _block = string_to_money(_pipe);
  let money = _block;
  let _block$1;
  let $ = tf.is_inflow;
  if ($) {
    _block$1 = 1;
  } else {
    _block$1 = -1;
  }
  let sign = _block$1;
  return new Money(
    (() => {
      let _pipe$1 = money.value;
      return absolute_value(_pipe$1);
    })() * sign
  );
}
function money_value(m) {
  return m.value;
}
function transaction_form_to_transaction(tef, categories) {
  let _block;
  let _pipe = tef.date;
  let _pipe$1 = from_date_string(_pipe);
  _block = from_result(_pipe$1);
  let date_option = _block;
  let _block$1;
  let $ = tef.is_inflow;
  if ($) {
    _block$1 = 1;
  } else {
    _block$1 = -1;
  }
  let sign = _block$1;
  let amount = new Money(
    (() => {
      let _pipe$22 = tef.amount;
      let _pipe$32 = string_to_money(_pipe$22);
      return money_value(_pipe$32);
    })() * sign
  );
  let _block$2;
  let _pipe$2 = categories;
  let _pipe$3 = find(
    _pipe$2,
    (c) => {
      return c.name === tef.category_name;
    }
  );
  _block$2 = from_result(_pipe$3);
  let category = _block$2;
  if (date_option instanceof Some && category instanceof Some) {
    let date = date_option[0];
    let category$1 = category[0];
    return new Some(
      new Transaction(tef.id, date, tef.payee, category$1.id, amount, "")
    );
  } else {
    return new None();
  }
}
function find_alloc_by_cat_id(cat_id, cycle, allocations) {
  let _pipe = allocations;
  return find(
    _pipe,
    (a2) => {
      return a2.category_id === cat_id && isEqual(a2.date, cycle);
    }
  );
}
function update(model, msg) {
  debug(msg);
  if (msg instanceof OnRouteChange) {
    let route = msg.route;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof LoginSubmit) {
    return [
      (() => {
        let _record = model;
        return new Model2(
          new LoginForm(new None(), new None(), true),
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      login_eff(
        (() => {
          let _pipe = model.login_form.login;
          return unwrap(_pipe, "");
        })(),
        (() => {
          let _pipe = model.login_form.pass;
          return unwrap(_pipe, "");
        })()
      )
    ];
  } else if (msg instanceof LoginPassword) {
    let l = msg.login;
    let p = msg.pass;
    let _block;
    if (l instanceof Some) {
      let l$1 = l[0];
      _block = new Some(l$1);
    } else {
      _block = model.login_form.login;
    }
    let login = _block;
    let _block$1;
    if (p instanceof Some) {
      let p$1 = p[0];
      _block$1 = new Some(p$1);
    } else {
      _block$1 = model.login_form.pass;
    }
    let pass = _block$1;
    return [
      (() => {
        let _record = model;
        return new Model2(
          (() => {
            let _record$1 = model.login_form;
            return new LoginForm(login, pass, _record$1.is_loading);
          })(),
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof LoginResult && msg.user.isOk()) {
    let user = msg.user[0][0];
    let token3 = msg.user[0][1];
    let cycle = msg.cycle;
    let _block;
    if (token3 === "") {
      _block = none();
    } else {
      _block = write_localstorage2("jwt", token3);
    }
    let save_token_eff = _block;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          new Some(user),
          cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      batch(
        toList([
          save_token_eff,
          get_category_groups(),
          get_categories(),
          get_transactions(),
          get_allocations(),
          get_category_suggestions()
        ])
      )
    ];
  } else if (msg instanceof LoginResult && !msg.user.isOk()) {
    let err = msg.user[0];
    debug(err);
    return [model, none()];
  } else if (msg instanceof Categories && msg.cats.isOk()) {
    let cats = msg.cats[0];
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          cats,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      get_transactions()
    ];
  } else if (msg instanceof Categories && !msg.cats.isOk()) {
    return [model, none()];
  } else if (msg instanceof Transactions && msg.trans.isOk()) {
    let t = msg.trans[0];
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          (() => {
            let _pipe = t;
            return sort(
              _pipe,
              (t1, t2) => {
                return compare3(t2.date, t1.date);
              }
            );
          })(),
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof Transactions && !msg.trans.isOk()) {
    return [model, none()];
  } else if (msg instanceof Allocations && msg.a.isOk()) {
    let a2 = msg.a[0];
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          a2,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof Allocations && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof SelectCategory) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          new Some(
            new SelectedCategory(
              c.id,
              c.name,
              (() => {
                let _pipe = find_alloc_by_cat_id(
                  c.id,
                  model.cycle,
                  model.allocations
                );
                let _pipe$1 = map3(
                  _pipe,
                  (a2) => {
                    let _pipe$12 = a2.amount;
                    return money_to_string_no_sign(_pipe$12);
                  }
                );
                return unwrap2(_pipe$1, "");
              })()
            )
          ),
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          new None(),
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          (() => {
            let _pipe = model.categories_groups;
            let _pipe$1 = find(
              _pipe,
              (g) => {
                return g.id === c.group_id;
              }
            );
            let _pipe$2 = map3(_pipe$1, (g) => {
              return g.name;
            });
            return unwrap2(_pipe$2, "");
          })()
        );
      })(),
      none()
    ];
  } else if (msg instanceof ShowAddCategoryUI) {
    let group_id = msg.group_id;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          (() => {
            let $ = model.show_add_category_ui;
            if ($ instanceof None) {
              return new Some(group_id);
            } else {
              let current_group_id = $[0];
              let $1 = current_group_id === group_id;
              if ($1) {
                return new None();
              } else {
                return new Some(group_id);
              }
            }
          })(),
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof AddCategory) {
    let group_id = msg.group_id;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          "",
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      add_category(model.user_category_name_input, group_id)
    ];
  } else if (msg instanceof UserUpdatedCategoryName) {
    let name = msg.cat_name;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          name,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof AddCategoryResult && msg.c.isOk()) {
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          "",
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      get_categories()
    ];
  } else if (msg instanceof AddCategoryResult && !msg.c.isOk()) {
    return [model, none()];
  } else if (msg instanceof AddTransaction) {
    let $ = model.transaction_add_input.category;
    let $1 = (() => {
      let _pipe = model.transaction_add_input.amount;
      return string_to_money(_pipe);
    })();
    if ($ instanceof Some) {
      let cat = $[0];
      return [
        (() => {
          let _record = model;
          return new Model2(
            _record.login_form,
            _record.current_user,
            _record.cycle,
            _record.route,
            _record.cycle_end_day,
            _record.show_all_transactions,
            _record.categories_groups,
            _record.categories,
            _record.transactions,
            _record.allocations,
            _record.selected_category,
            _record.show_add_category_ui,
            _record.user_category_name_input,
            new TransactionForm(
              model.transaction_add_input.date,
              "",
              new None(),
              "",
              false
            ),
            _record.target_edit_form,
            _record.selected_transaction,
            _record.transaction_edit_form,
            _record.suggestions,
            _record.show_add_category_group_ui,
            _record.new_category_group_name,
            _record.category_group_change_input
          );
        })(),
        add_transaction_eff(
          model.transaction_add_input,
          (() => {
            let _pipe = model.transaction_add_input;
            return to_money(_pipe);
          })(),
          cat
        )
      ];
    } else {
      return [model, none()];
    }
  } else if (msg instanceof AddTransactionResult && msg.c.isOk()) {
    let t = msg.c[0];
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          (() => {
            let _pipe = flatten2(toList([model.transactions, toList([t])]));
            return sort(
              _pipe,
              (t1, t2) => {
                return compare3(t2.date, t1.date);
              }
            );
          })(),
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof AddTransactionResult && !msg.c.isOk()) {
    return [model, none()];
  } else if (msg instanceof UserUpdatedTransactionCategory) {
    let category_name = msg.cat;
    let _block;
    let _pipe = model.categories;
    let _pipe$1 = find(_pipe, (c) => {
      return c.name === category_name;
    });
    _block = from_result(_pipe$1);
    let category = _block;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          (() => {
            let _record$1 = model.transaction_add_input;
            return new TransactionForm(
              _record$1.date,
              _record$1.payee,
              category,
              _record$1.amount,
              _record$1.is_inflow
            );
          })(),
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionDate) {
    let date = msg.date;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          (() => {
            let _record$1 = model.transaction_add_input;
            return new TransactionForm(
              date,
              _record$1.payee,
              _record$1.category,
              _record$1.amount,
              _record$1.is_inflow
            );
          })(),
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionPayee) {
    let payee = msg.payee;
    let _block;
    let _pipe = model.suggestions;
    _block = map_get(_pipe, payee);
    let category = _block;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          (() => {
            let _record$1 = model.transaction_add_input;
            return new TransactionForm(
              _record$1.date,
              payee,
              (() => {
                let _pipe$1 = category;
                return from_result(_pipe$1);
              })(),
              _record$1.amount,
              _record$1.is_inflow
            );
          })(),
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionAmount) {
    let amount = msg.amount;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          (() => {
            let _record$1 = model.transaction_add_input;
            return new TransactionForm(
              _record$1.date,
              _record$1.payee,
              _record$1.category,
              amount,
              _record$1.is_inflow
            );
          })(),
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionIsInflow) {
    let is_inflow = msg.is_inflow;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          (() => {
            let _record$1 = model.transaction_add_input;
            return new TransactionForm(
              _record$1.date,
              _record$1.payee,
              _record$1.category,
              _record$1.amount,
              is_inflow
            );
          })(),
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof StartEditTarget) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          (() => {
            let _pipe = new TargetEditForm(
              c.id,
              (() => {
                let _pipe2 = target_amount(c.target);
                let _pipe$1 = map(_pipe2, money_to_string_no_sign);
                return unwrap(_pipe$1, "");
              })(),
              (() => {
                let _pipe2 = target_date(c.target);
                return map(_pipe2, month_in_year_to_str);
              })(),
              is_target_custom(c.target)
            );
            return new Some(_pipe);
          })(),
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof SaveTarget) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          new None(),
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      update_category_target_eff(c, model.target_edit_form)
    ];
  } else if (msg instanceof DeleteTarget) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          new None(),
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      delete_target_eff(c)
    ];
  } else if (msg instanceof UserTargetUpdateAmount) {
    let amount = msg.amount;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          (() => {
            let _pipe = model.target_edit_form;
            return map(
              _pipe,
              (form) => {
                let _record$1 = form;
                return new TargetEditForm(
                  _record$1.cat_id,
                  amount,
                  _record$1.target_custom_date,
                  _record$1.is_custom
                );
              }
            );
          })(),
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof EditTargetCadence) {
    let is_monthly = msg.is_monthly;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          (() => {
            let _pipe = model.target_edit_form;
            return map(
              _pipe,
              (form) => {
                let _record$1 = form;
                return new TargetEditForm(
                  _record$1.cat_id,
                  _record$1.target_amount,
                  _record$1.target_custom_date,
                  !is_monthly
                );
              }
            );
          })(),
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserTargetUpdateCustomDate) {
    let date = msg.date;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          (() => {
            let _pipe = model.target_edit_form;
            return map(
              _pipe,
              (form) => {
                let _record$1 = form;
                return new TargetEditForm(
                  _record$1.cat_id,
                  _record$1.target_amount,
                  (() => {
                    let _pipe$1 = date;
                    return new Some(_pipe$1);
                  })(),
                  _record$1.is_custom
                );
              }
            );
          })(),
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof CategorySaveTarget && msg.a.isOk()) {
    return [model, get_categories()];
  } else if (msg instanceof CategorySaveTarget && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof SelectTransaction) {
    let t = msg.t;
    let _block;
    let _pipe = model.selected_transaction;
    _block = unwrap(_pipe, "");
    let cur_selected_transaction = _block;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          new Some(t.id),
          (() => {
            let $ = cur_selected_transaction === t.id;
            if ($) {
              return model.transaction_edit_form;
            } else {
              return new None();
            }
          })(),
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof DeleteTransaction) {
    let id2 = msg.t_id;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          new None(),
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      delete_transaction_eff(id2)
    ];
  } else if (msg instanceof EditTransaction) {
    let t = msg.t;
    let category_name = msg.category_name;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          new Some(
            new TransactionEditForm(
              t.id,
              (() => {
                let _pipe = t.date;
                return to_date_string_input(_pipe);
              })(),
              t.payee,
              category_name,
              (() => {
                let _pipe = t.value;
                return money_to_string_no_sign(_pipe);
              })(),
              t.value.value >= 0
            )
          ),
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof TransactionDeleteResult && msg.a.isOk()) {
    return [model, get_transactions()];
  } else if (msg instanceof TransactionDeleteResult && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof TransactionEditResult && msg.a.isOk()) {
    return [model, get_transactions()];
  } else if (msg instanceof TransactionEditResult && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof UserTransactionEditPayee) {
    let payee = msg.p;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          (() => {
            let _pipe = model.transaction_edit_form;
            return map(
              _pipe,
              (tef) => {
                let _record$1 = tef;
                return new TransactionEditForm(
                  _record$1.id,
                  _record$1.date,
                  payee,
                  _record$1.category_name,
                  _record$1.amount,
                  _record$1.is_inflow
                );
              }
            );
          })(),
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserTransactionEditDate) {
    let d = msg.d;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          (() => {
            let _pipe = model.transaction_edit_form;
            return map(
              _pipe,
              (tef) => {
                let _record$1 = tef;
                return new TransactionEditForm(
                  _record$1.id,
                  d,
                  _record$1.payee,
                  _record$1.category_name,
                  _record$1.amount,
                  _record$1.is_inflow
                );
              }
            );
          })(),
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserTransactionEditAmount) {
    let a2 = msg.a;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          (() => {
            let _pipe = model.transaction_edit_form;
            return map(
              _pipe,
              (tef) => {
                let _record$1 = tef;
                return new TransactionEditForm(
                  _record$1.id,
                  _record$1.date,
                  _record$1.payee,
                  _record$1.category_name,
                  a2,
                  _record$1.is_inflow
                );
              }
            );
          })(),
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserEditTransactionIsInflow) {
    let is_inflow = msg.is_inflow;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          (() => {
            let _pipe = model.transaction_edit_form;
            return map(
              _pipe,
              (tef) => {
                let _record$1 = tef;
                return new TransactionEditForm(
                  _record$1.id,
                  _record$1.date,
                  _record$1.payee,
                  _record$1.category_name,
                  _record$1.amount,
                  is_inflow
                );
              }
            );
          })(),
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserTransactionEditCategory) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          (() => {
            let _pipe = model.transaction_edit_form;
            return map(
              _pipe,
              (tef) => {
                let _record$1 = tef;
                return new TransactionEditForm(
                  _record$1.id,
                  _record$1.date,
                  _record$1.payee,
                  c,
                  _record$1.amount,
                  _record$1.is_inflow
                );
              }
            );
          })(),
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UpdateTransaction) {
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          new None(),
          new None(),
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      (() => {
        let $ = (() => {
          let _pipe = model.transaction_edit_form;
          let _pipe$1 = map(
            _pipe,
            (tef) => {
              return transaction_form_to_transaction(tef, model.categories);
            }
          );
          return flatten(_pipe$1);
        })();
        if ($ instanceof None) {
          return none();
        } else {
          let transaction = $[0];
          return update_transaction_eff(transaction);
        }
      })()
    ];
  } else if (msg instanceof DeleteCategory) {
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          new None(),
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      (() => {
        let $ = model.selected_category;
        if ($ instanceof None) {
          return none();
        } else {
          let sc = $[0];
          return delete_category_eff(sc.id);
        }
      })()
    ];
  } else if (msg instanceof UpdateCategoryName) {
    let cat = msg.cat;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          new None(),
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      (() => {
        let $ = model.selected_category;
        if ($ instanceof Some) {
          let sc = $[0];
          return update_category_eff(
            (() => {
              let _record = cat;
              return new Category(
                _record.id,
                sc.input_name,
                _record.target,
                _record.inflow,
                _record.group_id
              );
            })()
          );
        } else {
          return none();
        }
      })()
    ];
  } else if (msg instanceof UserInputCategoryUpdateName) {
    let name = msg.n;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          (() => {
            let _pipe = model.selected_category;
            return map(
              _pipe,
              (sc) => {
                let _record$1 = sc;
                return new SelectedCategory(
                  _record$1.id,
                  name,
                  _record$1.allocation
                );
              }
            );
          })(),
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof CategoryDeleteResult && msg.a.isOk()) {
    return [model, get_categories()];
  } else if (msg instanceof CategoryDeleteResult && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof SaveAllocation) {
    let alloc = msg.allocation;
    return [
      model,
      (() => {
        let $ = model.selected_category;
        if ($ instanceof Some) {
          let sc = $[0];
          return save_allocation_eff(
            alloc,
            (() => {
              let _pipe = sc.allocation;
              return string_to_money(_pipe);
            })(),
            sc.id,
            model.cycle
          );
        } else {
          return none();
        }
      })()
    ];
  } else if (msg instanceof SaveAllocationResult && msg[0].isOk()) {
    return [model, get_allocations()];
  } else if (msg instanceof SaveAllocationResult && !msg[0].isOk()) {
    return [model, none()];
  } else if (msg instanceof UserAllocationUpdate) {
    let a2 = msg.amount;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          (() => {
            let _pipe = model.selected_category;
            return map(
              _pipe,
              (sc) => {
                let _record$1 = sc;
                return new SelectedCategory(
                  _record$1.id,
                  _record$1.input_name,
                  a2
                );
              }
            );
          })(),
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof CycleShift) {
    let shift = msg.shift;
    let _block;
    if (shift instanceof ShiftLeft) {
      _block = cycle_decrease(model.cycle);
    } else {
      _block = cycle_increase(model.cycle);
    }
    let new_cycle = _block;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          new_cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      batch(toList([get_transactions(), get_allocations()]))
    ];
  } else if (msg instanceof UserInputShowAllTransactions) {
    let show = msg.show;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          show,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof Suggestions && msg.trans.isOk()) {
    let suggestions = msg.trans[0];
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof Suggestions && !msg.trans.isOk()) {
    return [model, none()];
  } else if (msg instanceof AllocateNeeded) {
    let cat = msg.cat;
    let amount_needed = msg.needed_amount;
    let alloc = msg.alloc;
    return [
      model,
      save_allocation_eff(alloc, amount_needed, cat.id, model.cycle)
    ];
  } else if (msg instanceof ShowAddCategoryGroupUI) {
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          !model.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedCategoryGroupName) {
    let input_group_name = msg.name;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          input_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof CreateCategoryGroup) {
    return [model, add_new_group_eff(model.new_category_group_name)];
  } else if (msg instanceof AddCategoryGroupResult && msg.c.isOk()) {
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          false,
          "",
          _record.category_group_change_input
        );
      })(),
      get_category_groups()
    ];
  } else if (msg instanceof AddCategoryGroupResult && !msg.c.isOk()) {
    return [model, none()];
  } else if (msg instanceof CategoryGroups && msg.c.isOk()) {
    let groups = msg.c[0];
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input
        );
      })(),
      none()
    ];
  } else if (msg instanceof CollapseGroup) {
    let group = msg.group;
    return [
      model,
      update_group_eff(
        (() => {
          let _record = group;
          return new CategoryGroup(
            _record.id,
            _record.name,
            _record.position,
            !group.is_collapsed
          );
        })()
      )
    ];
  } else if (msg instanceof CategoryGroups && !msg.c.isOk()) {
    return [model, none()];
  } else if (msg instanceof ChangeGroupForCategory) {
    let cat = msg.cat;
    let _block;
    let _pipe = model.categories_groups;
    _block = find(
      _pipe,
      (g) => {
        return g.name === model.category_group_change_input;
      }
    );
    let new_group = _block;
    if (!new_group.isOk()) {
      return [model, none()];
    } else {
      let group = new_group[0];
      return [
        (() => {
          let _record = model;
          return new Model2(
            _record.login_form,
            _record.current_user,
            _record.cycle,
            _record.route,
            _record.cycle_end_day,
            _record.show_all_transactions,
            _record.categories_groups,
            _record.categories,
            _record.transactions,
            _record.allocations,
            _record.selected_category,
            _record.show_add_category_ui,
            _record.user_category_name_input,
            _record.transaction_add_input,
            _record.target_edit_form,
            _record.selected_transaction,
            _record.transaction_edit_form,
            _record.suggestions,
            _record.show_add_category_group_ui,
            _record.new_category_group_name,
            ""
          );
        })(),
        update_category_eff(
          (() => {
            let _record = cat;
            return new Category(
              _record.id,
              _record.name,
              _record.target,
              _record.inflow,
              group.id
            );
          })()
        )
      ];
    }
  } else {
    let group_name = msg.group_name;
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.login_form,
          _record.current_user,
          _record.cycle,
          _record.route,
          _record.cycle_end_day,
          _record.show_all_transactions,
          _record.categories_groups,
          _record.categories,
          _record.transactions,
          _record.allocations,
          _record.selected_category,
          _record.show_add_category_ui,
          _record.user_category_name_input,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          group_name
        );
      })(),
      none()
    ];
  }
}
function main() {
  let app = application(init3, update, view);
  let $ = start2(app, "#app", void 0);
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "budget_fe",
      23,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
