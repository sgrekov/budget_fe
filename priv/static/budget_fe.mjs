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
function prepend(element3, tail) {
  return new NonEmpty(element3, tail);
}
function toList(elements, tail) {
  return List.fromArray(elements, tail);
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
function bitArrayPrintDeprecationWarning(name2, message) {
  if (isBitArrayDeprecationMessagePrinted[name2]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name2} property used in JavaScript FFI code. ${message}.`
  );
  isBitArrayDeprecationMessagePrinted[name2] = true;
}
function bitArraySlice(bitArray, start4, end) {
  end ??= bitArray.bitSize;
  bitArrayValidateRange(bitArray, start4, end);
  if (start4 === end) {
    return new BitArray(new Uint8Array());
  }
  if (start4 === 0 && end === bitArray.bitSize) {
    return bitArray;
  }
  start4 += bitArray.bitOffset;
  end += bitArray.bitOffset;
  const startByteIndex = Math.trunc(start4 / 8);
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
  return new BitArray(buffer, end - start4, start4 % 8);
}
function bitArraySliceToInt(bitArray, start4, end, isBigEndian, isSigned) {
  bitArrayValidateRange(bitArray, start4, end);
  if (start4 === end) {
    return 0;
  }
  start4 += bitArray.bitOffset;
  end += bitArray.bitOffset;
  const isStartByteAligned = start4 % 8 === 0;
  const isEndByteAligned = end % 8 === 0;
  if (isStartByteAligned && isEndByteAligned) {
    return intFromAlignedSlice(
      bitArray,
      start4 / 8,
      end / 8,
      isBigEndian,
      isSigned
    );
  }
  const size2 = end - start4;
  const startByteIndex = Math.trunc(start4 / 8);
  const endByteIndex = Math.trunc((end - 1) / 8);
  if (startByteIndex == endByteIndex) {
    const mask2 = 255 >> start4 % 8;
    const unusedLowBitCount = (8 - end % 8) % 8;
    let value3 = (bitArray.rawBuffer[startByteIndex] & mask2) >> unusedLowBitCount;
    if (isSigned) {
      const highBit = 2 ** (size2 - 1);
      if (value3 >= highBit) {
        value3 -= highBit * 2;
      }
    }
    return value3;
  }
  if (size2 <= 53) {
    return intFromUnalignedSliceUsingNumber(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  } else {
    return intFromUnalignedSliceUsingBigInt(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  }
}
function intFromAlignedSlice(bitArray, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  if (byteSize <= 6) {
    return intFromAlignedSliceUsingNumber(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  } else {
    return intFromAlignedSliceUsingBigInt(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  }
}
function intFromAlignedSliceUsingNumber(buffer, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  let value3 = 0;
  if (isBigEndian) {
    for (let i = start4; i < end; i++) {
      value3 *= 256;
      value3 += buffer[i];
    }
  } else {
    for (let i = end - 1; i >= start4; i--) {
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
function intFromAlignedSliceUsingBigInt(buffer, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  let value3 = 0n;
  if (isBigEndian) {
    for (let i = start4; i < end; i++) {
      value3 *= 256n;
      value3 += BigInt(buffer[i]);
    }
  } else {
    for (let i = end - 1; i >= start4; i--) {
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
function intFromUnalignedSliceUsingNumber(buffer, start4, end, isBigEndian, isSigned) {
  const isStartByteAligned = start4 % 8 === 0;
  let size2 = end - start4;
  let byteIndex = Math.trunc(start4 / 8);
  let value3 = 0;
  if (isBigEndian) {
    if (!isStartByteAligned) {
      const leadingBitsCount = 8 - start4 % 8;
      value3 = buffer[byteIndex++] & (1 << leadingBitsCount) - 1;
      size2 -= leadingBitsCount;
    }
    while (size2 >= 8) {
      value3 *= 256;
      value3 += buffer[byteIndex++];
      size2 -= 8;
    }
    if (size2 > 0) {
      value3 *= 2 ** size2;
      value3 += buffer[byteIndex] >> 8 - size2;
    }
  } else {
    if (isStartByteAligned) {
      let size3 = end - start4;
      let scale = 1;
      while (size3 >= 8) {
        value3 += buffer[byteIndex++] * scale;
        scale *= 256;
        size3 -= 8;
      }
      value3 += (buffer[byteIndex] >> 8 - size3) * scale;
    } else {
      const highBitsCount = start4 % 8;
      const lowBitsCount = 8 - highBitsCount;
      let size3 = end - start4;
      let scale = 1;
      while (size3 >= 8) {
        const byte = buffer[byteIndex] << highBitsCount | buffer[byteIndex + 1] >> lowBitsCount;
        value3 += (byte & 255) * scale;
        scale *= 256;
        size3 -= 8;
        byteIndex++;
      }
      if (size3 > 0) {
        const lowBitsUsed = size3 - Math.max(0, size3 - lowBitsCount);
        let trailingByte = (buffer[byteIndex] & (1 << lowBitsCount) - 1) >> lowBitsCount - lowBitsUsed;
        size3 -= lowBitsUsed;
        if (size3 > 0) {
          trailingByte *= 2 ** size3;
          trailingByte += buffer[byteIndex + 1] >> 8 - size3;
        }
        value3 += trailingByte * scale;
      }
    }
  }
  if (isSigned) {
    const highBit = 2 ** (end - start4 - 1);
    if (value3 >= highBit) {
      value3 -= highBit * 2;
    }
  }
  return value3;
}
function intFromUnalignedSliceUsingBigInt(buffer, start4, end, isBigEndian, isSigned) {
  const isStartByteAligned = start4 % 8 === 0;
  let size2 = end - start4;
  let byteIndex = Math.trunc(start4 / 8);
  let value3 = 0n;
  if (isBigEndian) {
    if (!isStartByteAligned) {
      const leadingBitsCount = 8 - start4 % 8;
      value3 = BigInt(buffer[byteIndex++] & (1 << leadingBitsCount) - 1);
      size2 -= leadingBitsCount;
    }
    while (size2 >= 8) {
      value3 *= 256n;
      value3 += BigInt(buffer[byteIndex++]);
      size2 -= 8;
    }
    if (size2 > 0) {
      value3 <<= BigInt(size2);
      value3 += BigInt(buffer[byteIndex] >> 8 - size2);
    }
  } else {
    if (isStartByteAligned) {
      let size3 = end - start4;
      let shift = 0n;
      while (size3 >= 8) {
        value3 += BigInt(buffer[byteIndex++]) << shift;
        shift += 8n;
        size3 -= 8;
      }
      value3 += BigInt(buffer[byteIndex] >> 8 - size3) << shift;
    } else {
      const highBitsCount = start4 % 8;
      const lowBitsCount = 8 - highBitsCount;
      let size3 = end - start4;
      let shift = 0n;
      while (size3 >= 8) {
        const byte = buffer[byteIndex] << highBitsCount | buffer[byteIndex + 1] >> lowBitsCount;
        value3 += BigInt(byte & 255) << shift;
        shift += 8n;
        size3 -= 8;
        byteIndex++;
      }
      if (size3 > 0) {
        const lowBitsUsed = size3 - Math.max(0, size3 - lowBitsCount);
        let trailingByte = (buffer[byteIndex] & (1 << lowBitsCount) - 1) >> lowBitsCount - lowBitsUsed;
        size3 -= lowBitsUsed;
        if (size3 > 0) {
          trailingByte <<= size3;
          trailingByte += buffer[byteIndex + 1] >> 8 - size3;
        }
        value3 += BigInt(trailingByte) << shift;
      }
    }
  }
  if (isSigned) {
    const highBit = 2n ** BigInt(end - start4 - 1);
    if (value3 >= highBit) {
      value3 -= highBit * 2n;
    }
  }
  return Number(value3);
}
function bitArrayValidateRange(bitArray, start4, end) {
  if (start4 < 0 || start4 > bitArray.bitSize || end < start4 || end > bitArray.bitSize) {
    const msg = `Invalid bit array slice: start = ${start4}, end = ${end}, bit size = ${bitArray.bitSize}`;
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
  let values3 = [x, y];
  while (values3.length) {
    let a2 = values3.pop();
    let b = values3.pop();
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
    let [keys2, get4] = getters(a2);
    for (let k of keys2(a2)) {
      values3.push(get4(a2, k), get4(b, k));
    }
  }
  return true;
}
function getters(object4) {
  if (object4 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object4 instanceof globalThis.Error ? ["message"] : [];
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
function fold_loop(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4.hasLength(0)) {
      return initial;
    } else {
      let k = list4.head[0];
      let v = list4.head[1];
      let rest = list4.tail;
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
    let list4 = loop$list;
    let count = loop$count;
    if (list4.atLeastLength(1)) {
      let list$1 = list4.tail;
      loop$list = list$1;
      loop$count = count + 1;
    } else {
      return count;
    }
  }
}
function length(list4) {
  return length_loop(list4, 0);
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
function reverse(list4) {
  return reverse_and_prepend(list4, toList([]));
}
function contains(loop$list, loop$elem) {
  while (true) {
    let list4 = loop$list;
    let elem = loop$elem;
    if (list4.hasLength(0)) {
      return false;
    } else if (list4.atLeastLength(1) && isEqual(list4.head, elem)) {
      let first$1 = list4.head;
      return true;
    } else {
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$elem = elem;
    }
  }
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
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
function filter(list4, predicate) {
  return filter_loop(list4, predicate, toList([]));
}
function filter_map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
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
function filter_map(list4, fun) {
  return filter_map_loop(list4, fun, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map2(list4, fun) {
  return map_loop(list4, fun, toList([]));
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
function prepend2(list4, item) {
  return prepend(item, list4);
}
function flatten_loop(loop$lists, loop$acc) {
  while (true) {
    let lists = loop$lists;
    let acc = loop$acc;
    if (lists.hasLength(0)) {
      return reverse(acc);
    } else {
      let list4 = lists.head;
      let further_lists = lists.tail;
      loop$lists = further_lists;
      loop$acc = reverse_and_prepend(list4, acc);
    }
  }
}
function flatten2(lists) {
  return flatten_loop(lists, toList([]));
}
function flat_map(list4, fun) {
  let _pipe = map2(list4, fun);
  return flatten2(_pipe);
}
function fold2(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function fold_until(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
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
    let list4 = loop$list;
    let is_desired = loop$is_desired;
    if (list4.hasLength(0)) {
      return new Error(void 0);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
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
    let list4 = loop$list;
    let seen = loop$seen;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
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
function unique(list4) {
  return unique_loop(list4, new_map(), toList([]));
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let compare5 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list4.hasLength(0)) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = compare5(prev, new$1);
      if ($ instanceof Gt && direction instanceof Descending) {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Lt && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Eq && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare5;
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
          let $1 = compare5(new$1, next2);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
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
          let $1 = compare5(new$1, next2);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
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
          let $1 = compare5(new$1, next2);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
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
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22.hasLength(0)) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare5(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare5 = loop$compare;
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
        compare5,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare5;
      loop$acc = prepend(descending, acc);
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22.hasLength(0)) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare5(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare5 = loop$compare;
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
        compare5,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare5;
      loop$acc = prepend(ascending, acc);
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare5 = loop$compare;
    if (sequences2.hasLength(0)) {
      return toList([]);
    } else if (sequences2.hasLength(1) && direction instanceof Ascending) {
      let sequence = sequences2.head;
      return sequence;
    } else if (sequences2.hasLength(1) && direction instanceof Descending) {
      let sequence = sequences2.head;
      return reverse(sequence);
    } else if (direction instanceof Ascending) {
      let sequences$1 = merge_ascending_pairs(sequences2, compare5, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Descending();
      loop$compare = compare5;
    } else {
      let sequences$1 = merge_descending_pairs(sequences2, compare5, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Ascending();
      loop$compare = compare5;
    }
  }
}
function sort(list4, compare5) {
  if (list4.hasLength(0)) {
    return toList([]);
  } else if (list4.hasLength(1)) {
    let x = list4.head;
    return toList([x]);
  } else {
    let x = list4.head;
    let y = list4.tail.head;
    let rest$1 = list4.tail.tail;
    let _block;
    let $ = compare5(x, y);
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
      compare5,
      toList([x]),
      direction,
      y,
      toList([])
    );
    return merge_all(sequences$1, new Ascending(), compare5);
  }
}
function key_set_loop(loop$list, loop$key, loop$value, loop$inspected) {
  while (true) {
    let list4 = loop$list;
    let key = loop$key;
    let value3 = loop$value;
    let inspected = loop$inspected;
    if (list4.atLeastLength(1) && isEqual(list4.head[0], key)) {
      let k = list4.head[0];
      let rest$1 = list4.tail;
      return reverse_and_prepend(inspected, prepend([k, value3], rest$1));
    } else if (list4.atLeastLength(1)) {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$key = key;
      loop$value = value3;
      loop$inspected = prepend(first$1, inspected);
    } else {
      return reverse(prepend([key, value3], inspected));
    }
  }
}
function key_set(list4, key, value3) {
  return key_set_loop(list4, key, value3, toList([]));
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
function assoc(root3, shift, hash, key, val, addedLeaf) {
  switch (root3.type) {
    case ARRAY_NODE:
      return assocArray(root3, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root3, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root3, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root3, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size + 1,
      array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: ARRAY_NODE,
        size: root3.size,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root3;
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function assocIndex(root3, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root3.bitmap, bit);
  if ((root3.bitmap & bit) !== 0) {
    const node = root3.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root3.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root3.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root3.array[j++];
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
      const newArray2 = spliceIn(root3.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap | bit,
        array: newArray2
      };
    }
  }
}
function assocCollision(root3, shift, hash, key, val, addedLeaf) {
  if (hash === root3.hash) {
    const idx = collisionIndexOf(root3, key);
    if (idx !== -1) {
      const entry = root3.array[idx];
      if (entry.v === val) {
        return root3;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size2 = root3.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root3.array, size2, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root3.hash, shift),
      array: [root3]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root3, key) {
  const size2 = root3.array.length;
  for (let i = 0; i < size2; i++) {
    if (isEqual(key, root3.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find2(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return findArray(root3, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root3, key);
  }
}
function findArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
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
function findIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    return find2(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return void 0;
  }
  return root3.array[idx];
}
function without(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return withoutArray(root3, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root3, key);
  }
}
function withoutArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return root3;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root3;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
  }
  if (n === void 0) {
    if (root3.size <= MIN_ARRAY_NODE) {
      const arr = root3.array;
      const out = new Array(root3.size - 1);
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
      size: root3.size - 1,
      array: cloneAndSet(root3.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function withoutIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return root3;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  return root3;
}
function withoutCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return root3;
  }
  if (root3.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root3.hash,
    array: spliceOut(root3.array, idx)
  };
}
function forEach(root3, fn) {
  if (root3 === void 0) {
    return;
  }
  const items = root3.array;
  const size2 = items.length;
  for (let i = 0; i < size2; i++) {
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
  constructor(root3, size2) {
    this.root = root3;
    this.size = size2;
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
    const root3 = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root3, 0, getHash(key), key, val, addedLeaf);
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
function float_to_string(float2) {
  const string5 = float2.toString().replace("+", "");
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
function int_to_base_string(int5, base) {
  return int5.toString(base).toUpperCase();
}
var int_base_patterns = {
  2: /[^0-1]/,
  3: /[^0-2]/,
  4: /[^0-3]/,
  5: /[^0-4]/,
  6: /[^0-5]/,
  7: /[^0-6]/,
  8: /[^0-7]/,
  9: /[^0-8]/,
  10: /[^0-9]/,
  11: /[^0-9a]/,
  12: /[^0-9a-b]/,
  13: /[^0-9a-c]/,
  14: /[^0-9a-d]/,
  15: /[^0-9a-e]/,
  16: /[^0-9a-f]/,
  17: /[^0-9a-g]/,
  18: /[^0-9a-h]/,
  19: /[^0-9a-i]/,
  20: /[^0-9a-j]/,
  21: /[^0-9a-k]/,
  22: /[^0-9a-l]/,
  23: /[^0-9a-m]/,
  24: /[^0-9a-n]/,
  25: /[^0-9a-o]/,
  26: /[^0-9a-p]/,
  27: /[^0-9a-q]/,
  28: /[^0-9a-r]/,
  29: /[^0-9a-s]/,
  30: /[^0-9a-t]/,
  31: /[^0-9a-u]/,
  32: /[^0-9a-v]/,
  33: /[^0-9a-w]/,
  34: /[^0-9a-x]/,
  35: /[^0-9a-y]/,
  36: /[^0-9a-z]/
};
function int_from_base_string(string5, base) {
  if (int_base_patterns[base].test(string5.replace(/^-/, "").toLowerCase())) {
    return new Error(Nil);
  }
  const result = parseInt(string5, base);
  if (isNaN(result)) {
    return new Error(Nil);
  }
  return new Ok(result);
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
function lowercase(string5) {
  return string5.toLowerCase();
}
function split(xs, pattern) {
  return List.fromArray(xs.split(pattern));
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
function floor(float2) {
  return Math.floor(float2);
}
function round2(float2) {
  return Math.round(float2);
}
function truncate(float2) {
  return Math.trunc(float2);
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
function map_to_list(map7) {
  return List.fromArray(map7.entries());
}
function map_get(map7, key) {
  const value3 = map7.get(key, NOT_FOUND);
  if (value3 === NOT_FOUND) {
    return new Error(Nil);
  }
  return new Ok(value3);
}
function map_insert(key, value3, map7) {
  return map7.set(key, value3);
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
function inspectDict(map7) {
  let body = "dict.from_list([";
  let first2 = true;
  map7.forEach((value3, key) => {
    if (!first2) body = body + ", ";
    body = body + "#(" + inspect(key) + ", " + inspect(value3) + ")";
    first2 = false;
  });
  return body + "])";
}
function inspectObject(v) {
  const name2 = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${inspect(k)}: ${inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name2 === "Object" ? "" : name2 + " ";
  return `//js(${head}{${body}})`;
}
function inspectCustomType(record) {
  const props = Object.keys(record).map((label2) => {
    const value3 = inspect(record[label2]);
    return isNaN(parseInt(label2)) ? `${label2}: ${value3}` : value3;
  }).join(", ");
  return props ? `${record.constructor.name}(${props})` : record.constructor.name;
}
function inspectList(list4) {
  return `[${list4.toArray().map(inspect).join(", ")}]`;
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
function base_parse(string5, base) {
  let $ = base >= 2 && base <= 36;
  if ($) {
    return int_from_base_string(string5, base);
  } else {
    return new Error(void 0);
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
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings.atLeastLength(1)) {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string5;
    } else {
      return accumulator;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
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
function join_loop(loop$strings, loop$separator, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let separator = loop$separator;
    let accumulator = loop$accumulator;
    if (strings.hasLength(0)) {
      return accumulator;
    } else {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$separator = separator;
      loop$accumulator = accumulator + separator + string5;
    }
  }
}
function join(strings, separator) {
  if (strings.hasLength(0)) {
    return "";
  } else {
    let first$1 = strings.head;
    let rest = strings.tail;
    return join_loop(rest, separator, first$1);
  }
}
function padding(size2, pad_string) {
  let pad_string_length = string_length(pad_string);
  let num_pads = divideInt(size2, pad_string_length);
  let extra = remainderInt(size2, pad_string_length);
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
  for (const element3 of data) {
    const layer = decode2(element3);
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
function string(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error("");
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
    let failure2 = loop$failure;
    let decoders = loop$decoders;
    if (decoders.hasLength(0)) {
      return failure2;
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
        loop$failure = failure2;
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
function run_dynamic_function(data, name2, f) {
  let $ = f(data);
  if ($.isOk()) {
    let data$1 = $[0];
    return [data$1, toList([])];
  } else {
    let zero = $[0];
    return [
      zero,
      toList([new DecodeError2(name2, classify_dynamic(data), toList([]))])
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
var bool = /* @__PURE__ */ new Decoder(decode_bool2);
var int2 = /* @__PURE__ */ new Decoder(decode_int2);
function decode_string2(data) {
  return run_dynamic_function(data, "String", string);
}
var string2 = /* @__PURE__ */ new Decoder(decode_string2);
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
      return push_path([new_map(), errors], toList(["values"]));
    }
  } else {
    let errors = $[1];
    return push_path([new_map(), errors], toList(["keys"]));
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
        (p2, k) => {
          return push_path(p2, toList([k]));
        },
        0,
        toList([])
      );
    }
  );
}
function push_path(layer, path) {
  let decoder = one_of(
    string2,
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
      return push_path(_pipe, reverse(position));
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
        return push_path(_pipe, reverse(position));
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
          return push_path(_pipe, reverse(position));
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
function field(field_name, field_decoder, next2) {
  return subfield(toList([field_name]), field_decoder, next2);
}

// build/dev/javascript/gleam_json/gleam_json_ffi.mjs
function json_to_string(json2) {
  return JSON.stringify(json2);
}
function object(entries) {
  return Object.fromEntries(entries);
}
function identity2(x) {
  return x;
}
function array(list4) {
  return list4.toArray();
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
function getJsonDecodeError(stdErr, json2) {
  if (isUnexpectedEndOfInput(stdErr)) return new UnexpectedEndOfInput();
  return toUnexpectedByteError(stdErr, json2);
}
function isUnexpectedEndOfInput(err) {
  const unexpectedEndOfInputRegex = /((unexpected (end|eof))|(end of data)|(unterminated string)|(json( parse error|\.parse)\: expected '(\:|\}|\])'))/i;
  return unexpectedEndOfInputRegex.test(err.message);
}
function toUnexpectedByteError(err, json2) {
  let converters = [
    v8UnexpectedByteError,
    oldV8UnexpectedByteError,
    jsCoreUnexpectedByteError,
    spidermonkeyUnexpectedByteError
  ];
  for (let converter of converters) {
    let result = converter(err, json2);
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
function spidermonkeyUnexpectedByteError(err, json2) {
  const regex = /(unexpected character|expected .*) at line (\d+) column (\d+)/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const line = Number(match[2]);
  const column3 = Number(match[3]);
  const position = getPositionFromMultiline(line, column3, json2);
  const byte = toHex(json2[position]);
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
function do_parse(json2, decoder) {
  return then$(
    decode(json2),
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
function parse(json2, decoder) {
  return do_parse(json2, decoder);
}
function to_string2(json2) {
  return json_to_string(json2);
}
function string3(input2) {
  return identity2(input2);
}
function bool2(input2) {
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
function preprocessed_array(from2) {
  return array(from2);
}
function array2(entries, inner_type) {
  let _pipe = entries;
  let _pipe$1 = map2(_pipe, inner_type);
  return preprocessed_array(_pipe$1);
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
function insert2(set2, member) {
  return new Set2(insert(set2.dict, member, token));
}
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
function fromList(list4) {
  return list4.toArray();
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
function runwrap(state, parser2) {
  let parse4 = parser2[0];
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
function should_commit(a2, b) {
  let a$1 = a2[0];
  let b$1 = b[0];
  return new CanBacktrack(a$1 || b$1);
}
function do$(parser2, f) {
  return new Parser(
    (state) => {
      let $ = runwrap(state, parser2);
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
function then$3(parser2, f) {
  return do$(parser2, f);
}
function map5(parser2, f) {
  return do$(parser2, (a2) => {
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
function run3(src, parser2) {
  let init3 = new State2(
    fromList(src),
    0,
    new Span(1, 1, 1, 1),
    toList([])
  );
  let $ = runwrap(init3, parser2);
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
      let init3 = new Fail(new CanBacktrack(false), new Empty2());
      return fold_until(
        parsers,
        init3,
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
function field2() {
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
    (text4) => {
      return do$(
        take_while(is_text),
        (rest) => {
          let _block;
          let _pipe = map2(
            prepend(text4, rest),
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
        (text4) => {
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
              return return$(new Literal(text4));
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
          toList([field2(), literal(), escaped_quote(), quoted()])
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
function today() {
  let $ = get_year_month_day();
  let year$1 = $[0];
  let month_number$1 = $[1];
  let day$1 = $[2];
  return from_calendar_date(year$1, number_to_month(month_number$1), day$1);
}

// build/dev/javascript/budget_shared/budget_shared.mjs
var ImportTransaction = class extends CustomType {
  constructor(id2, date, payee, transaction_type, value3, reference) {
    super();
    this.id = id2;
    this.date = date;
    this.payee = payee;
    this.transaction_type = transaction_type;
    this.value = value3;
    this.reference = reference;
  }
};
var User = class extends CustomType {
  constructor(id2, name2) {
    super();
    this.id = id2;
    this.name = name2;
  }
};
var CategoryGroup = class extends CustomType {
  constructor(id2, name2, position, is_collapsed) {
    super();
    this.id = id2;
    this.name = name2;
    this.position = position;
    this.is_collapsed = is_collapsed;
  }
};
var Category = class extends CustomType {
  constructor(id2, name2, target, inflow, group_id) {
    super();
    this.id = id2;
    this.name = name2;
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
  return field(
    "id",
    string2,
    (id2) => {
      return success(id2);
    }
  );
}
function hash_decoder() {
  return field(
    "hash",
    string2,
    (id2) => {
      return success(id2);
    }
  );
}
function user_with_token_decoder() {
  return field(
    "id",
    string2,
    (id2) => {
      return field(
        "name",
        string2,
        (name2) => {
          return field(
            "token",
            string2,
            (token3) => {
              return success([new User(id2, name2), token3]);
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
      ["id", string3(group.id)],
      ["name", string3(group.name)],
      ["position", int3(group.position)],
      ["is_collapsed", bool2(group.is_collapsed)]
    ])
  );
}
function category_group_decoder() {
  return field(
    "id",
    string2,
    (id2) => {
      return field(
        "name",
        string2,
        (name2) => {
          return field(
            "position",
            int2,
            (position) => {
              return field(
                "is_collapsed",
                bool,
                (is_collapsed) => {
                  return success(
                    new CategoryGroup(id2, name2, position, is_collapsed)
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
  return field(
    "month",
    int2,
    (month2) => {
      return field(
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
function encode_import_transaction(import_transaction) {
  let id2 = import_transaction.id;
  let date = import_transaction.date;
  let payee = import_transaction.payee;
  let transaction_type = import_transaction.transaction_type;
  let value3 = import_transaction.value;
  let reference = import_transaction.reference;
  return object2(
    toList([
      ["id", string3(id2)],
      [
        "date",
        (() => {
          let _pipe = to_rata_die(import_transaction.date);
          return int3(_pipe);
        })()
      ],
      ["payee", string3(payee)],
      ["transaction_type", string3(transaction_type)],
      ["value", money_encode(import_transaction.value)],
      ["reference", string3(reference)]
    ])
  );
}
function allocation_encode(a2) {
  return object2(
    toList([
      ["id", string3(a2.id)],
      ["amount", money_encode(a2.amount)],
      ["category_id", string3(a2.category_id)],
      ["date", cycle_encode(a2.date)]
    ])
  );
}
function allocation_form_encode(af) {
  return object2(
    toList([
      ["id", nullable(af.id, string3)],
      ["amount", money_encode(af.amount)],
      ["category_id", string3(af.category_id)],
      ["date", cycle_encode(af.date)]
    ])
  );
}
function target_encode(target) {
  if (target instanceof Monthly) {
    let money = target.target;
    return object2(
      toList([["type", string3("monthly")], ["money", money_encode(money)]])
    );
  } else {
    let money = target.target;
    let month2 = target.date;
    return object2(
      toList([
        ["type", string3("custom")],
        ["money", money_encode(money)],
        ["date", month_in_year_encode(month2)]
      ])
    );
  }
}
function category_encode(cat) {
  return object2(
    toList([
      ["id", string3(cat.id)],
      ["name", string3(cat.name)],
      ["target", nullable(cat.target, target_encode)],
      ["inflow", bool2(cat.inflow)],
      ["group_id", string3(cat.group_id)]
    ])
  );
}
function cycle_decoder() {
  let cycle_decoder$1 = field(
    "month",
    int2,
    (month2) => {
      return field(
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
      ["id", string3(t.id)],
      [
        "date",
        (() => {
          let _pipe = to_rata_die(t.date);
          return int3(_pipe);
        })()
      ],
      ["payee", string3(t.payee)],
      ["category_id", string3(t.category_id)],
      ["value", money_encode(t.value)],
      ["user_id", string3(t.user_id)]
    ])
  );
}
function money_decoder() {
  let money_decoder$1 = field(
    "money_value",
    int2,
    (value3) => {
      return success(new Money(value3));
    }
  );
  return money_decoder$1;
}
function import_transaction_decoder() {
  return field(
    "id",
    string2,
    (id2) => {
      return field(
        "date",
        int2,
        (date) => {
          return field(
            "payee",
            string2,
            (payee) => {
              return field(
                "transaction_type",
                string2,
                (transaction_type) => {
                  return field(
                    "value",
                    money_decoder(),
                    (value3) => {
                      return field(
                        "reference",
                        string2,
                        (reference) => {
                          return success(
                            new ImportTransaction(
                              id2,
                              from_rata_die(date),
                              payee,
                              transaction_type,
                              value3,
                              reference
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
function target_decoder() {
  let monthly_decoder = field(
    "money",
    money_decoder(),
    (money) => {
      return success(new Monthly(money));
    }
  );
  let custom_decoder = field(
    "money",
    money_decoder(),
    (money) => {
      return field(
        "date",
        month_decoder(),
        (date) => {
          return success(new Custom(money, date));
        }
      );
    }
  );
  let target_decoder$1 = field(
    "type",
    string2,
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
  return field(
    "id",
    string2,
    (id2) => {
      return field(
        "name",
        string2,
        (name2) => {
          return field(
            "target",
            optional(target_decoder()),
            (target) => {
              return field(
                "inflow",
                bool,
                (inflow) => {
                  return field(
                    "group_id",
                    string2,
                    (group_id) => {
                      return success(
                        new Category(id2, name2, target, inflow, group_id)
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
  return dict2(string2, category_decoder());
}
function allocation_decoder() {
  let allocation_decoder$1 = field(
    "id",
    string2,
    (id2) => {
      return field(
        "amount",
        money_decoder(),
        (amount) => {
          return field(
            "category_id",
            string2,
            (category_id) => {
              return field(
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
  return field(
    "id",
    string2,
    (id2) => {
      return field(
        "date",
        int2,
        (date) => {
          return field(
            "payee",
            string2,
            (payee) => {
              return field(
                "category_id",
                string2,
                (category_id) => {
                  return field(
                    "value",
                    money_decoder(),
                    (value3) => {
                      return field(
                        "user_id",
                        string2,
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
function list_to_date(list4) {
  if (list4.hasLength(3)) {
    let year2 = list4.head;
    let month2 = list4.tail.head;
    let day2 = list4.tail.tail.head;
    let _pipe = base_parse(year2, 10);
    let _pipe$1 = map_error(_pipe, (_) => {
      return "Invalid year";
    });
    return try$(
      _pipe$1,
      (y) => {
        let _pipe$2 = base_parse(month2, 10);
        let _pipe$3 = map_error(
          _pipe$2,
          (_) => {
            return "Invalid month";
          }
        );
        return try$(
          _pipe$3,
          (m_int) => {
            let month22 = month_by_number(m_int);
            let _pipe$4 = base_parse(day2, 10);
            let _pipe$5 = map_error(
              _pipe$4,
              (_) => {
                return "Invalid day";
              }
            );
            return map3(
              _pipe$5,
              (d) => {
                return from_calendar_date(y, month22, d);
              }
            );
          }
        );
      }
    );
  } else {
    return new Error("Invalid date format");
  }
}
function string_to_date(date) {
  let _pipe = date;
  let _pipe$1 = split2(_pipe, "-");
  return list_to_date(_pipe$1);
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
  let _pipe = string_to_date(date_str);
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

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity3(x) {
  return x;
}

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var EMPTY_DICT = /* @__PURE__ */ Dict.new();
function empty_dict() {
  return EMPTY_DICT;
}
var EMPTY_SET = /* @__PURE__ */ new$();
function empty_set() {
  return EMPTY_SET;
}
var document2 = globalThis?.document;
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var DOCUMENT_FRAGMENT_NODE = 11;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = /* @__PURE__ */ toList([]);
var option_none = /* @__PURE__ */ new None();

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ new Gt();
var LT = /* @__PURE__ */ new Lt();
var EQ = /* @__PURE__ */ new Eq();
function compare4(a2, b) {
  if (a2.name === b.name) {
    return EQ;
  } else if (a2.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
var Attribute = class extends CustomType {
  constructor(kind, name2, value3) {
    super();
    this.kind = kind;
    this.name = name2;
    this.value = value3;
  }
};
var Property = class extends CustomType {
  constructor(kind, name2, value3) {
    super();
    this.kind = kind;
    this.name = name2;
    this.value = value3;
  }
};
var Event2 = class extends CustomType {
  constructor(kind, name2, handler, include, prevent_default, stop_propagation, immediate2, limit) {
    super();
    this.kind = kind;
    this.name = name2;
    this.handler = handler;
    this.include = include;
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.immediate = immediate2;
    this.limit = limit;
  }
};
var NoLimit = class extends CustomType {
  constructor(kind) {
    super();
    this.kind = kind;
  }
};
var Debounce = class extends CustomType {
  constructor(kind, delay) {
    super();
    this.kind = kind;
    this.delay = delay;
  }
};
var Throttle = class extends CustomType {
  constructor(kind, delay) {
    super();
    this.kind = kind;
    this.delay = delay;
  }
};
function limit_equals(a2, b) {
  if (a2 instanceof NoLimit && b instanceof NoLimit) {
    return true;
  } else if (a2 instanceof Debounce && b instanceof Debounce && a2.delay === b.delay) {
    let d1 = a2.delay;
    let d2 = b.delay;
    return true;
  } else if (a2 instanceof Throttle && b instanceof Throttle && a2.delay === b.delay) {
    let d1 = a2.delay;
    let d2 = b.delay;
    return true;
  } else {
    return false;
  }
}
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes.hasLength(0)) {
      return merged;
    } else if (attributes.atLeastLength(2) && attributes.head instanceof Attribute && attributes.head.name === "class" && attributes.tail.head instanceof Attribute && attributes.tail.head.name === "class") {
      let kind = attributes.head.kind;
      let class1 = attributes.head.value;
      let class2 = attributes.tail.head.value;
      let rest = attributes.tail.tail;
      let value3 = class1 + " " + class2;
      let attribute$1 = new Attribute(kind, "class", value3);
      loop$attributes = prepend(attribute$1, rest);
      loop$merged = merged;
    } else if (attributes.atLeastLength(2) && attributes.head instanceof Attribute && attributes.head.name === "style" && attributes.tail.head instanceof Attribute && attributes.tail.head.name === "style") {
      let kind = attributes.head.kind;
      let style1 = attributes.head.value;
      let style2 = attributes.tail.head.value;
      let rest = attributes.tail.tail;
      let value3 = style1 + ";" + style2;
      let attribute$1 = new Attribute(kind, "style", value3);
      loop$attributes = prepend(attribute$1, rest);
      loop$merged = merged;
    } else {
      let attribute$1 = attributes.head;
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = prepend(attribute$1, merged);
    }
  }
}
function prepare(attributes) {
  if (attributes.hasLength(0)) {
    return attributes;
  } else if (attributes.hasLength(1)) {
    return attributes;
  } else {
    let _pipe = attributes;
    let _pipe$1 = sort(_pipe, (a2, b) => {
      return compare4(b, a2);
    });
    return merge(_pipe$1, empty_list);
  }
}
var attribute_kind = 0;
function attribute(name2, value3) {
  return new Attribute(attribute_kind, name2, value3);
}
var property_kind = 1;
function property(name2, value3) {
  return new Property(property_kind, name2, value3);
}
var event_kind = 2;
function event(name2, handler, include, prevent_default, stop_propagation, immediate2, limit) {
  return new Event2(
    event_kind,
    name2,
    handler,
    include,
    prevent_default,
    stop_propagation,
    immediate2,
    limit
  );
}
var debounce_kind = 1;
var throttle_kind = 2;

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name2, value3) {
  return attribute(name2, value3);
}
function property2(name2, value3) {
  return property(name2, value3);
}
function boolean_attribute(name2, value3) {
  if (value3) {
    return attribute2(name2, "");
  } else {
    return property2(name2, bool2(false));
  }
}
function class$(name2) {
  return attribute2("class", name2);
}
function id(value3) {
  return attribute2("id", value3);
}
function do_styles(loop$properties, loop$styles) {
  while (true) {
    let properties = loop$properties;
    let styles2 = loop$styles;
    if (properties.hasLength(0)) {
      return styles2;
    } else if (properties.atLeastLength(1) && properties.head[0] === "") {
      let rest = properties.tail;
      loop$properties = rest;
      loop$styles = styles2;
    } else if (properties.atLeastLength(1) && properties.head[1] === "") {
      let rest = properties.tail;
      loop$properties = rest;
      loop$styles = styles2;
    } else {
      let name$1 = properties.head[0];
      let value$1 = properties.head[1];
      let rest = properties.tail;
      loop$properties = rest;
      loop$styles = styles2 + name$1 + ":" + value$1 + ";";
    }
  }
}
function styles(properties) {
  return attribute2("style", do_styles(properties, ""));
}
function href(url) {
  return attribute2("href", url);
}
function accept(values3) {
  return attribute2("accept", join(values3, ","));
}
function checked(is_checked) {
  return boolean_attribute("checked", is_checked);
}
function for$(id2) {
  return attribute2("for", id2);
}
function placeholder(text4) {
  return attribute2("placeholder", text4);
}
function type_(control_type) {
  return attribute2("type", control_type);
}
function value(control_value) {
  return attribute2("value", control_value);
}
function role(name2) {
  return attribute2("role", name2);
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(synchronous, before_paint2, after_paint) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint2;
    this.after_paint = after_paint;
  }
};
var empty = /* @__PURE__ */ new Effect(
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([])
);
function none() {
  return empty;
}
function from(effect) {
  let task = (actions) => {
    let dispatch = actions.dispatch;
    return effect(dispatch);
  };
  let _record = empty;
  return new Effect(toList([task]), _record.before_paint, _record.after_paint);
}
function batch(effects) {
  return fold2(
    effects,
    empty,
    (acc, eff) => {
      return new Effect(
        fold2(eff.synchronous, acc.synchronous, prepend2),
        fold2(eff.before_paint, acc.before_paint, prepend2),
        fold2(eff.after_paint, acc.after_paint, prepend2)
      );
    }
  );
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty2() {
  return null;
}
function get3(map7, key) {
  const value3 = map7?.get(key);
  if (value3 != null) {
    return new Ok(value3);
  } else {
    return new Error(void 0);
  }
}
function insert4(map7, key, value3) {
  map7 ??= /* @__PURE__ */ new Map();
  map7.set(key, value3);
  return map7;
}
function remove(map7, key) {
  map7?.delete(key);
  return map7;
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
var Root = class extends CustomType {
};
var Key = class extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
};
var Index = class extends CustomType {
  constructor(index5, parent) {
    super();
    this.index = index5;
    this.parent = parent;
  }
};
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path = loop$path;
    let candidates = loop$candidates;
    if (candidates.hasLength(0)) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path, candidate);
      if ($) {
        return true;
      } else {
        loop$path = path;
        loop$candidates = rest;
      }
    }
  }
}
function add2(parent, index5, key) {
  if (key === "") {
    return new Index(index5, parent);
  } else {
    return new Key(key, parent);
  }
}
var root2 = /* @__PURE__ */ new Root();
var separator_index = "\n";
var separator_key = "	";
function do_to_string(loop$path, loop$acc) {
  while (true) {
    let path = loop$path;
    let acc = loop$acc;
    if (path instanceof Root) {
      if (acc.hasLength(0)) {
        return "";
      } else {
        let segments = acc.tail;
        return concat2(segments);
      }
    } else if (path instanceof Key) {
      let key = path.key;
      let parent = path.parent;
      loop$path = parent;
      loop$acc = prepend(separator_key, prepend(key, acc));
    } else {
      let index5 = path.index;
      let parent = path.parent;
      loop$path = parent;
      loop$acc = prepend(
        separator_index,
        prepend(to_string(index5), acc)
      );
    }
  }
}
function to_string3(path) {
  return do_to_string(path, toList([]));
}
function matches(path, candidates) {
  if (candidates.hasLength(0)) {
    return false;
  } else {
    return do_matches(to_string3(path), candidates);
  }
}
var separator_event = "\f";
function event2(path, event4) {
  return do_to_string(path, toList([separator_event, event4]));
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
var Fragment = class extends CustomType {
  constructor(kind, key, mapper, children, keyed_children, children_count) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.children = children;
    this.keyed_children = keyed_children;
    this.children_count = children_count;
  }
};
var Element = class extends CustomType {
  constructor(kind, key, mapper, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Text2 = class extends CustomType {
  constructor(kind, key, mapper, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.content = content;
  }
};
var UnsafeInnerHtml = class extends CustomType {
  constructor(kind, key, mapper, namespace, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
};
function is_void_element(tag, namespace) {
  if (namespace === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function advance(node) {
  if (node instanceof Fragment) {
    let children_count = node.children_count;
    return 1 + children_count;
  } else {
    return 1;
  }
}
var fragment_kind = 0;
function fragment(key, mapper, children, keyed_children, children_count) {
  return new Fragment(
    fragment_kind,
    key,
    mapper,
    children,
    keyed_children,
    children_count
  );
}
var element_kind = 1;
function element(key, mapper, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(
    element_kind,
    key,
    mapper,
    namespace,
    tag,
    prepare(attributes),
    children,
    keyed_children,
    self_closing,
    void$ || is_void_element(tag, namespace)
  );
}
var text_kind = 2;
function text(key, mapper, content) {
  return new Text2(text_kind, key, mapper, content);
}
var unsafe_inner_html_kind = 3;
function set_fragment_key(loop$key, loop$children, loop$index, loop$new_children, loop$keyed_children) {
  while (true) {
    let key = loop$key;
    let children = loop$children;
    let index5 = loop$index;
    let new_children = loop$new_children;
    let keyed_children = loop$keyed_children;
    if (children.hasLength(0)) {
      return [reverse(new_children), keyed_children];
    } else if (children.atLeastLength(1) && children.head instanceof Fragment && children.head.key === "") {
      let node = children.head;
      let children$1 = children.tail;
      let child_key = key + "::" + to_string(index5);
      let $ = set_fragment_key(
        child_key,
        node.children,
        0,
        empty_list,
        empty2()
      );
      let node_children = $[0];
      let node_keyed_children = $[1];
      let _block;
      let _record = node;
      _block = new Fragment(
        _record.kind,
        _record.key,
        _record.mapper,
        node_children,
        node_keyed_children,
        _record.children_count
      );
      let new_node = _block;
      let new_children$1 = prepend(new_node, new_children);
      let index$1 = index5 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children;
    } else if (children.atLeastLength(1) && children.head.key !== "") {
      let node = children.head;
      let children$1 = children.tail;
      let child_key = key + "::" + node.key;
      let keyed_node = to_keyed(child_key, node);
      let new_children$1 = prepend(keyed_node, new_children);
      let keyed_children$1 = insert4(
        keyed_children,
        child_key,
        keyed_node
      );
      let index$1 = index5 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children$1;
    } else {
      let node = children.head;
      let children$1 = children.tail;
      let new_children$1 = prepend(node, new_children);
      let index$1 = index5 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children;
    }
  }
}
function to_keyed(key, node) {
  if (node instanceof Element) {
    let _record = node;
    return new Element(
      _record.kind,
      key,
      _record.mapper,
      _record.namespace,
      _record.tag,
      _record.attributes,
      _record.children,
      _record.keyed_children,
      _record.self_closing,
      _record.void
    );
  } else if (node instanceof Text2) {
    let _record = node;
    return new Text2(_record.kind, key, _record.mapper, _record.content);
  } else if (node instanceof UnsafeInnerHtml) {
    let _record = node;
    return new UnsafeInnerHtml(
      _record.kind,
      key,
      _record.mapper,
      _record.namespace,
      _record.tag,
      _record.attributes,
      _record.inner_html
    );
  } else {
    let children = node.children;
    let $ = set_fragment_key(
      key,
      children,
      0,
      empty_list,
      empty2()
    );
    let children$1 = $[0];
    let keyed_children = $[1];
    let _record = node;
    return new Fragment(
      _record.kind,
      key,
      _record.mapper,
      children$1,
      keyed_children,
      _record.children_count
    );
  }
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
var Patch = class extends CustomType {
  constructor(index5, removed, changes, children) {
    super();
    this.index = index5;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
};
var ReplaceText = class extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
};
var ReplaceInnerHtml = class extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
};
var Update = class extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
};
var Move = class extends CustomType {
  constructor(kind, key, before, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
    this.count = count;
  }
};
var RemoveKey = class extends CustomType {
  constructor(kind, key, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.count = count;
  }
};
var Replace = class extends CustomType {
  constructor(kind, from2, count, with$) {
    super();
    this.kind = kind;
    this.from = from2;
    this.count = count;
    this.with = with$;
  }
};
var Insert = class extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
};
var Remove = class extends CustomType {
  constructor(kind, from2, count) {
    super();
    this.kind = kind;
    this.from = from2;
    this.count = count;
  }
};
function new$4(index5, removed, changes, children) {
  return new Patch(index5, removed, changes, children);
}
var replace_text_kind = 0;
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
var replace_inner_html_kind = 1;
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
var update_kind = 2;
function update(added, removed) {
  return new Update(update_kind, added, removed);
}
var move_kind = 3;
function move(key, before, count) {
  return new Move(move_kind, key, before, count);
}
var remove_key_kind = 4;
function remove_key(key, count) {
  return new RemoveKey(remove_key_kind, key, count);
}
var replace_kind = 5;
function replace3(from2, count, with$) {
  return new Replace(replace_kind, from2, count, with$);
}
var insert_kind = 6;
function insert5(children, before) {
  return new Insert(insert_kind, children, before);
}
var remove_kind = 7;
function remove2(from2, count) {
  return new Remove(remove_kind, from2, count);
}

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
var Diff = class extends CustomType {
  constructor(patch, events) {
    super();
    this.patch = patch;
    this.events = events;
  }
};
var AttributeChange = class extends CustomType {
  constructor(added, removed, events) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events;
  }
};
function is_controlled(events, namespace, tag, path) {
  if (tag === "input" && namespace === "") {
    return has_dispatched_events(events, path);
  } else if (tag === "select" && namespace === "") {
    return has_dispatched_events(events, path);
  } else if (tag === "textarea" && namespace === "") {
    return has_dispatched_events(events, path);
  } else {
    return false;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$mapper, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path = loop$path;
    let mapper = loop$mapper;
    let events = loop$events;
    let old = loop$old;
    let new$9 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (old.hasLength(0) && new$9.hasLength(0)) {
      return new AttributeChange(added, removed, events);
    } else if (old.atLeastLength(1) && old.head instanceof Event2 && new$9.hasLength(0)) {
      let prev = old.head;
      let name2 = old.head.name;
      let old$1 = old.tail;
      let removed$1 = prepend(prev, removed);
      let events$1 = remove_event(events, path, name2);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events$1;
      loop$old = old$1;
      loop$new = new$9;
      loop$added = added;
      loop$removed = removed$1;
    } else if (old.atLeastLength(1) && new$9.hasLength(0)) {
      let prev = old.head;
      let old$1 = old.tail;
      let removed$1 = prepend(prev, removed);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events;
      loop$old = old$1;
      loop$new = new$9;
      loop$added = added;
      loop$removed = removed$1;
    } else if (old.hasLength(0) && new$9.atLeastLength(1) && new$9.head instanceof Event2) {
      let next2 = new$9.head;
      let name2 = new$9.head.name;
      let handler = new$9.head.handler;
      let new$1 = new$9.tail;
      let added$1 = prepend(next2, added);
      let events$1 = add_event(events, mapper, path, name2, handler);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events$1;
      loop$old = old;
      loop$new = new$1;
      loop$added = added$1;
      loop$removed = removed;
    } else if (old.hasLength(0) && new$9.atLeastLength(1)) {
      let next2 = new$9.head;
      let new$1 = new$9.tail;
      let added$1 = prepend(next2, added);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events;
      loop$old = old;
      loop$new = new$1;
      loop$added = added$1;
      loop$removed = removed;
    } else {
      let prev = old.head;
      let remaining_old = old.tail;
      let next2 = new$9.head;
      let remaining_new = new$9.tail;
      let $ = compare4(prev, next2);
      if (prev instanceof Attribute && $ instanceof Eq && next2 instanceof Attribute) {
        let _block;
        let $1 = next2.name;
        if ($1 === "value") {
          _block = controlled || prev.value !== next2.value;
        } else if ($1 === "checked") {
          _block = controlled || prev.value !== next2.value;
        } else if ($1 === "selected") {
          _block = controlled || prev.value !== next2.value;
        } else {
          _block = prev.value !== next2.value;
        }
        let has_changes = _block;
        let _block$1;
        if (has_changes) {
          _block$1 = prepend(next2, added);
        } else {
          _block$1 = added;
        }
        let added$1 = _block$1;
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Property && $ instanceof Eq && next2 instanceof Property) {
        let _block;
        let $1 = next2.name;
        if ($1 === "scrollLeft") {
          _block = true;
        } else if ($1 === "scrollRight") {
          _block = true;
        } else if ($1 === "value") {
          _block = controlled || !isEqual(prev.value, next2.value);
        } else if ($1 === "checked") {
          _block = controlled || !isEqual(prev.value, next2.value);
        } else if ($1 === "selected") {
          _block = controlled || !isEqual(prev.value, next2.value);
        } else {
          _block = !isEqual(prev.value, next2.value);
        }
        let has_changes = _block;
        let _block$1;
        if (has_changes) {
          _block$1 = prepend(next2, added);
        } else {
          _block$1 = added;
        }
        let added$1 = _block$1;
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Eq && next2 instanceof Event2) {
        let name2 = next2.name;
        let handler = next2.handler;
        let has_changes = prev.prevent_default !== next2.prevent_default || prev.stop_propagation !== next2.stop_propagation || prev.immediate !== next2.immediate || !limit_equals(
          prev.limit,
          next2.limit
        );
        let _block;
        if (has_changes) {
          _block = prepend(next2, added);
        } else {
          _block = added;
        }
        let added$1 = _block;
        let events$1 = add_event(events, mapper, path, name2, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Eq) {
        let name2 = prev.name;
        let added$1 = prepend(next2, added);
        let removed$1 = prepend(prev, removed);
        let events$1 = remove_event(events, path, name2);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Eq && next2 instanceof Event2) {
        let name2 = next2.name;
        let handler = next2.handler;
        let added$1 = prepend(next2, added);
        let removed$1 = prepend(prev, removed);
        let events$1 = add_event(events, mapper, path, name2, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Eq) {
        let added$1 = prepend(next2, added);
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Gt && next2 instanceof Event2) {
        let name2 = next2.name;
        let handler = next2.handler;
        let added$1 = prepend(next2, added);
        let events$1 = add_event(events, mapper, path, name2, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if ($ instanceof Gt) {
        let added$1 = prepend(next2, added);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Lt) {
        let name2 = prev.name;
        let removed$1 = prepend(prev, removed);
        let events$1 = remove_event(events, path, name2);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = new$9;
        loop$added = added;
        loop$removed = removed$1;
      } else {
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = new$9;
        loop$added = added;
        loop$removed = removed$1;
      }
    }
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$path, loop$changes, loop$children, loop$mapper, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$9 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let path = loop$path;
    let changes = loop$changes;
    let children = loop$children;
    let mapper = loop$mapper;
    let events = loop$events;
    if (old.hasLength(0) && new$9.hasLength(0)) {
      return new Diff(
        new Patch(patch_index, removed, changes, children),
        events
      );
    } else if (old.atLeastLength(1) && new$9.hasLength(0)) {
      let prev = old.head;
      let old$1 = old.tail;
      let _block;
      let $ = prev.key === "" || !contains2(moved, prev.key);
      if ($) {
        _block = removed + advance(prev);
      } else {
        _block = removed;
      }
      let removed$1 = _block;
      let events$1 = remove_child(events, path, node_index, prev);
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$9;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed$1;
      loop$node_index = node_index;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events$1;
    } else if (old.hasLength(0) && new$9.atLeastLength(1)) {
      let events$1 = add_children(
        events,
        mapper,
        path,
        node_index,
        new$9
      );
      let insert6 = insert5(new$9, node_index - moved_offset);
      let changes$1 = prepend(insert6, changes);
      return new Diff(
        new Patch(patch_index, removed, changes$1, children),
        events$1
      );
    } else if (old.atLeastLength(1) && new$9.atLeastLength(1) && old.head.key !== new$9.head.key) {
      let prev = old.head;
      let old_remaining = old.tail;
      let next2 = new$9.head;
      let new_remaining = new$9.tail;
      let next_did_exist = get3(old_keyed, next2.key);
      let prev_does_exist = get3(new_keyed, prev.key);
      let prev_has_moved = contains2(moved, prev.key);
      if (prev_does_exist.isOk() && next_did_exist.isOk() && prev_has_moved) {
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new$9;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset - advance(prev);
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events;
      } else if (prev_does_exist.isOk() && next_did_exist.isOk()) {
        let match = next_did_exist[0];
        let count = advance(next2);
        let before = node_index - moved_offset;
        let move2 = move(next2.key, before, count);
        let changes$1 = prepend(move2, changes);
        let moved$1 = insert2(moved, next2.key);
        let moved_offset$1 = moved_offset + count;
        loop$old = prepend(match, old);
        loop$old_keyed = old_keyed;
        loop$new = new$9;
        loop$new_keyed = new_keyed;
        loop$moved = moved$1;
        loop$moved_offset = moved_offset$1;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events;
      } else if (!prev_does_exist.isOk() && next_did_exist.isOk()) {
        let count = advance(prev);
        let moved_offset$1 = moved_offset - count;
        let events$1 = remove_child(events, path, node_index, prev);
        let remove3 = remove_key(prev.key, count);
        let changes$1 = prepend(remove3, changes);
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new$9;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset$1;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      } else if (prev_does_exist.isOk() && !next_did_exist.isOk()) {
        let before = node_index - moved_offset;
        let count = advance(next2);
        let events$1 = add_child(events, mapper, path, node_index, next2);
        let insert6 = insert5(toList([next2]), before);
        let changes$1 = prepend(insert6, changes);
        loop$old = old;
        loop$old_keyed = old_keyed;
        loop$new = new_remaining;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset + count;
        loop$removed = removed;
        loop$node_index = node_index + count;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      } else {
        let prev_count = advance(prev);
        let next_count = advance(next2);
        let change = replace3(node_index - moved_offset, prev_count, next2);
        let _block;
        let _pipe = events;
        let _pipe$1 = remove_child(_pipe, path, node_index, prev);
        _block = add_child(_pipe$1, mapper, path, node_index, next2);
        let events$1 = _block;
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new_remaining;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset - prev_count + next_count;
        loop$removed = removed;
        loop$node_index = node_index + next_count;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = prepend(change, changes);
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      }
    } else if (old.atLeastLength(1) && old.head instanceof Fragment && new$9.atLeastLength(1) && new$9.head instanceof Fragment) {
      let prev = old.head;
      let old$1 = old.tail;
      let next2 = new$9.head;
      let new$1 = new$9.tail;
      let node_index$1 = node_index + 1;
      let prev_count = prev.children_count;
      let next_count = next2.children_count;
      let composed_mapper = compose_mapper(mapper, next2.mapper);
      let child = do_diff(
        prev.children,
        prev.keyed_children,
        next2.children,
        next2.keyed_children,
        empty_set(),
        moved_offset,
        0,
        node_index$1,
        -1,
        path,
        empty_list,
        children,
        composed_mapper,
        events
      );
      let _block;
      let $ = child.patch.removed > 0;
      if ($) {
        let remove_from = node_index$1 + next_count - moved_offset;
        let patch = remove2(remove_from, child.patch.removed);
        _block = append(child.patch.changes, prepend(patch, changes));
      } else {
        _block = append(child.patch.changes, changes);
      }
      let changes$1 = _block;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset + next_count - prev_count;
      loop$removed = removed;
      loop$node_index = node_index$1 + next_count;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes$1;
      loop$children = child.patch.children;
      loop$mapper = mapper;
      loop$events = child.events;
    } else if (old.atLeastLength(1) && old.head instanceof Element && new$9.atLeastLength(1) && new$9.head instanceof Element && (old.head.namespace === new$9.head.namespace && old.head.tag === new$9.head.tag)) {
      let prev = old.head;
      let old$1 = old.tail;
      let next2 = new$9.head;
      let new$1 = new$9.tail;
      let composed_mapper = compose_mapper(mapper, next2.mapper);
      let child_path = add2(path, node_index, next2.key);
      let controlled = is_controlled(
        events,
        next2.namespace,
        next2.tag,
        child_path
      );
      let $ = diff_attributes(
        controlled,
        child_path,
        composed_mapper,
        events,
        prev.attributes,
        next2.attributes,
        empty_list,
        empty_list
      );
      let added_attrs = $.added;
      let removed_attrs = $.removed;
      let events$1 = $.events;
      let _block;
      if (added_attrs.hasLength(0) && removed_attrs.hasLength(0)) {
        _block = empty_list;
      } else {
        _block = toList([update(added_attrs, removed_attrs)]);
      }
      let initial_child_changes = _block;
      let child = do_diff(
        prev.children,
        prev.keyed_children,
        next2.children,
        next2.keyed_children,
        empty_set(),
        0,
        0,
        0,
        node_index,
        child_path,
        initial_child_changes,
        empty_list,
        composed_mapper,
        events$1
      );
      let _block$1;
      let $1 = child.patch;
      if ($1 instanceof Patch && $1.removed === 0 && $1.changes.hasLength(0) && $1.children.hasLength(0)) {
        _block$1 = children;
      } else {
        _block$1 = prepend(child.patch, children);
      }
      let children$1 = _block$1;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children$1;
      loop$mapper = mapper;
      loop$events = child.events;
    } else if (old.atLeastLength(1) && old.head instanceof Text2 && new$9.atLeastLength(1) && new$9.head instanceof Text2 && old.head.content === new$9.head.content) {
      let prev = old.head;
      let old$1 = old.tail;
      let next2 = new$9.head;
      let new$1 = new$9.tail;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events;
    } else if (old.atLeastLength(1) && old.head instanceof Text2 && new$9.atLeastLength(1) && new$9.head instanceof Text2) {
      let old$1 = old.tail;
      let next2 = new$9.head;
      let new$1 = new$9.tail;
      let child = new$4(
        node_index,
        0,
        toList([replace_text(next2.content)]),
        empty_list
      );
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = prepend(child, children);
      loop$mapper = mapper;
      loop$events = events;
    } else if (old.atLeastLength(1) && old.head instanceof UnsafeInnerHtml && new$9.atLeastLength(1) && new$9.head instanceof UnsafeInnerHtml) {
      let prev = old.head;
      let old$1 = old.tail;
      let next2 = new$9.head;
      let new$1 = new$9.tail;
      let composed_mapper = compose_mapper(mapper, next2.mapper);
      let child_path = add2(path, node_index, next2.key);
      let $ = diff_attributes(
        false,
        child_path,
        composed_mapper,
        events,
        prev.attributes,
        next2.attributes,
        empty_list,
        empty_list
      );
      let added_attrs = $.added;
      let removed_attrs = $.removed;
      let events$1 = $.events;
      let _block;
      if (added_attrs.hasLength(0) && removed_attrs.hasLength(0)) {
        _block = empty_list;
      } else {
        _block = toList([update(added_attrs, removed_attrs)]);
      }
      let child_changes = _block;
      let _block$1;
      let $1 = prev.inner_html === next2.inner_html;
      if ($1) {
        _block$1 = child_changes;
      } else {
        _block$1 = prepend(
          replace_inner_html(next2.inner_html),
          child_changes
        );
      }
      let child_changes$1 = _block$1;
      let _block$2;
      if (child_changes$1.hasLength(0)) {
        _block$2 = children;
      } else {
        _block$2 = prepend(
          new$4(node_index, 0, child_changes$1, toList([])),
          children
        );
      }
      let children$1 = _block$2;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children$1;
      loop$mapper = mapper;
      loop$events = events$1;
    } else {
      let prev = old.head;
      let old_remaining = old.tail;
      let next2 = new$9.head;
      let new_remaining = new$9.tail;
      let prev_count = advance(prev);
      let next_count = advance(next2);
      let change = replace3(node_index - moved_offset, prev_count, next2);
      let _block;
      let _pipe = events;
      let _pipe$1 = remove_child(_pipe, path, node_index, prev);
      _block = add_child(_pipe$1, mapper, path, node_index, next2);
      let events$1 = _block;
      loop$old = old_remaining;
      loop$old_keyed = old_keyed;
      loop$new = new_remaining;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset - prev_count + next_count;
      loop$removed = removed;
      loop$node_index = node_index + next_count;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = prepend(change, changes);
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events$1;
    }
  }
}
function diff2(events, old, new$9) {
  return do_diff(
    toList([old]),
    empty2(),
    toList([new$9]),
    empty2(),
    empty_set(),
    0,
    0,
    0,
    0,
    root2,
    empty_list,
    empty_list,
    identity3,
    tick(events)
  );
}

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var Reconciler = class {
  offset = 0;
  #root = null;
  #dispatch = () => {
  };
  #useServerEvents = false;
  constructor(root3, dispatch, { useServerEvents = false } = {}) {
    this.#root = root3;
    this.#dispatch = dispatch;
    this.#useServerEvents = useServerEvents;
  }
  mount(vdom) {
    appendChild(this.#root, this.#createElement(vdom));
  }
  #stack = [];
  push(patch) {
    const offset = this.offset;
    if (offset) {
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
          case move_kind:
            change.before = (change.before | 0) + offset;
            break;
          case remove_kind:
          case replace_kind:
            change.from = (change.from | 0) + offset;
            break;
        }
      });
      iterate(patch.children, (child) => {
        child.index = (child.index | 0) + offset;
      });
    }
    this.#stack.push({ node: this.#root, patch });
    this.#reconcile();
  }
  // PATCHING ------------------------------------------------------------------
  #reconcile() {
    const self = this;
    while (self.#stack.length) {
      const { node, patch } = self.#stack.pop();
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
            self.#insert(node, change.children, change.before);
            break;
          case move_kind:
            self.#move(node, change.key, change.before, change.count);
            break;
          case remove_key_kind:
            self.#removeKey(node, change.key, change.count);
            break;
          case remove_kind:
            self.#remove(node, change.from, change.count);
            break;
          case replace_kind:
            self.#replace(node, change.from, change.count, change.with);
            break;
          case replace_text_kind:
            self.#replaceText(node, change.content);
            break;
          case replace_inner_html_kind:
            self.#replaceInnerHtml(node, change.inner_html);
            break;
          case update_kind:
            self.#update(node, change.added, change.removed);
            break;
        }
      });
      if (patch.removed) {
        self.#remove(
          node,
          node.childNodes.length - patch.removed,
          patch.removed
        );
      }
      iterate(patch.children, (child) => {
        self.#stack.push({ node: childAt(node, child.index), patch: child });
      });
    }
  }
  // CHANGES -------------------------------------------------------------------
  #insert(node, children, before) {
    const fragment3 = createDocumentFragment();
    iterate(children, (child) => {
      const el = this.#createElement(child);
      addKeyedChild(node, el);
      appendChild(fragment3, el);
    });
    insertBefore(node, fragment3, childAt(node, before));
  }
  #move(node, key, before, count) {
    let el = getKeyedChild(node, key);
    const beforeEl = childAt(node, before);
    for (let i = 0; i < count && el !== null; ++i) {
      const next2 = el.nextSibling;
      if (SUPPORTS_MOVE_BEFORE) {
        node.moveBefore(el, beforeEl);
      } else {
        insertBefore(node, el, beforeEl);
      }
      el = next2;
    }
  }
  #removeKey(node, key, count) {
    this.#removeFromChild(node, getKeyedChild(node, key), count);
  }
  #remove(node, from2, count) {
    this.#removeFromChild(node, childAt(node, from2), count);
  }
  #removeFromChild(parent, child, count) {
    while (count-- > 0 && child !== null) {
      const next2 = child.nextSibling;
      const key = child[meta].key;
      if (key) {
        parent[meta].keyedChildren.delete(key);
      }
      for (const [_, { timeout }] of child[meta].debouncers) {
        clearTimeout(timeout);
      }
      parent.removeChild(child);
      child = next2;
    }
  }
  #replace(parent, from2, count, child) {
    this.#remove(parent, from2, count);
    const el = this.#createElement(child);
    addKeyedChild(parent, el);
    insertBefore(parent, el, childAt(parent, from2));
  }
  #replaceText(node, content) {
    node.data = content ?? "";
  }
  #replaceInnerHtml(node, inner_html) {
    node.innerHTML = inner_html ?? "";
  }
  #update(node, added, removed) {
    iterate(removed, (attribute3) => {
      const name2 = attribute3.name;
      if (node[meta].handlers.has(name2)) {
        node.removeEventListener(name2, handleEvent);
        node[meta].handlers.delete(name2);
        if (node[meta].throttles.has(name2)) {
          node[meta].throttles.delete(name2);
        }
        if (node[meta].debouncers.has(name2)) {
          clearTimeout(node[meta].debouncers.get(name2).timeout);
          node[meta].debouncers.delete(name2);
        }
      } else {
        node.removeAttribute(name2);
        ATTRIBUTE_HOOKS[name2]?.removed?.(node, name2);
      }
    });
    iterate(added, (attribute3) => {
      this.#createAttribute(node, attribute3);
    });
  }
  // CONSTRUCTORS --------------------------------------------------------------
  #createElement(vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = createElement(vnode);
        this.#createAttributes(node, vnode);
        this.#insert(node, vnode.children, 0);
        return node;
      }
      case text_kind: {
        const node = createTextNode(vnode.content);
        initialiseMetadata(node, vnode.key);
        return node;
      }
      case fragment_kind: {
        const node = createDocumentFragment();
        const head = createTextNode();
        initialiseMetadata(head, vnode.key);
        appendChild(node, head);
        iterate(vnode.children, (child) => {
          appendChild(node, this.#createElement(child));
        });
        return node;
      }
      case unsafe_inner_html_kind: {
        const node = createElement(vnode);
        this.#createAttributes(node, vnode);
        this.#replaceInnerHtml(node, vnode.inner_html);
        return node;
      }
    }
  }
  #createAttributes(node, { attributes }) {
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #createAttribute(node, attribute3) {
    const nodeMeta = node[meta];
    switch (attribute3.kind) {
      case attribute_kind: {
        const name2 = attribute3.name;
        const value3 = attribute3.value ?? "";
        if (value3 !== node.getAttribute(name2)) {
          node.setAttribute(name2, value3);
        }
        ATTRIBUTE_HOOKS[name2]?.added?.(node, value3);
        break;
      }
      case property_kind:
        node[attribute3.name] = attribute3.value;
        break;
      case event_kind: {
        if (!nodeMeta.handlers.has(attribute3.name)) {
          node.addEventListener(attribute3.name, handleEvent, {
            passive: !attribute3.prevent_default
          });
        }
        const prevent = attribute3.prevent_default;
        const stop = attribute3.stop_propagation;
        const immediate2 = attribute3.immediate;
        const include = Array.isArray(attribute3.include) ? attribute3.include : [];
        if (attribute3.limit?.kind === throttle_kind) {
          const throttle = nodeMeta.throttles.get(attribute3.name) ?? {
            last: 0,
            delay: attribute3.limit.delay
          };
          nodeMeta.throttles.set(attribute3.name, throttle);
        }
        if (attribute3.limit?.kind === debounce_kind) {
          const debounce = nodeMeta.debouncers.get(attribute3.name) ?? {
            timeout: null,
            delay: attribute3.limit.delay
          };
          nodeMeta.debouncers.set(attribute3.name, debounce);
        }
        nodeMeta.handlers.set(attribute3.name, (event4) => {
          if (prevent) event4.preventDefault();
          if (stop) event4.stopPropagation();
          const type = event4.type;
          let path = "";
          let pathNode = event4.currentTarget;
          while (pathNode !== this.#root) {
            const key = pathNode[meta].key;
            const parent = pathNode.parentNode;
            if (key) {
              path = `${separator_key}${key}${path}`;
            } else {
              const siblings = parent.childNodes;
              let index5 = [].indexOf.call(siblings, pathNode);
              if (parent === this.#root) {
                index5 -= this.offset;
              }
              path = `${separator_index}${index5}${path}`;
            }
            pathNode = parent;
          }
          path = path.slice(1);
          const data = this.#useServerEvents ? createServerEvent(event4, include) : event4;
          if (nodeMeta.throttles.has(type)) {
            const throttle = nodeMeta.throttles.get(type);
            const now = Date.now();
            const last = throttle.last || 0;
            if (now > last + throttle.delay) {
              throttle.last = now;
              this.#dispatch(data, path, type, immediate2);
            } else {
              event4.preventDefault();
            }
          } else if (nodeMeta.debouncers.has(type)) {
            const debounce = nodeMeta.debouncers.get(type);
            clearTimeout(debounce.timeout);
            debounce.timeout = setTimeout(() => {
              this.#dispatch(data, path, type, immediate2);
            }, debounce.delay);
          } else {
            this.#dispatch(data, path, type, immediate2);
          }
        });
        break;
      }
    }
  }
};
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0; i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4; list4.tail; list4 = list4.tail) {
      callback(list4.head);
    }
  }
};
var appendChild = (node, child) => node.appendChild(child);
var insertBefore = (parent, node, referenceNode) => parent.insertBefore(node, referenceNode ?? null);
var createElement = ({ key, tag, namespace }) => {
  const node = document2.createElementNS(namespace || NAMESPACE_HTML, tag);
  initialiseMetadata(node, key);
  return node;
};
var createTextNode = (text4) => document2.createTextNode(text4 ?? "");
var createDocumentFragment = () => document2.createDocumentFragment();
var childAt = (node, at) => node.childNodes[at | 0];
var meta = Symbol("lustre");
var initialiseMetadata = (node, key = "") => {
  switch (node.nodeType) {
    case ELEMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      node[meta] = {
        key,
        keyedChildren: /* @__PURE__ */ new Map(),
        handlers: /* @__PURE__ */ new Map(),
        throttles: /* @__PURE__ */ new Map(),
        debouncers: /* @__PURE__ */ new Map()
      };
      break;
    case TEXT_NODE:
      node[meta] = { key, debouncers: /* @__PURE__ */ new Map() };
      break;
  }
};
var addKeyedChild = (node, child) => {
  if (child.nodeType === DOCUMENT_FRAGMENT_NODE) {
    for (child = child.firstChild; child; child = child.nextSibling) {
      addKeyedChild(node, child);
    }
    return;
  }
  const key = child[meta].key;
  if (key) {
    node[meta].keyedChildren.set(key, new WeakRef(child));
  }
};
var getKeyedChild = (node, key) => node[meta].keyedChildren.get(key).deref();
var handleEvent = (event4) => {
  const target = event4.currentTarget;
  const handler = target[meta].handlers.get(event4.type);
  if (event4.type === "submit") {
    event4.detail ??= {};
    event4.detail.formData = [...new FormData(event4.target).entries()];
  }
  handler(event4);
};
var createServerEvent = (event4, include = []) => {
  const data = {};
  if (event4.type === "input" || event4.type === "change") {
    include.push("target.value");
  }
  if (event4.type === "submit") {
    include.push("detail.formData");
  }
  for (const property3 of include) {
    const path = property3.split(".");
    for (let i = 0, input2 = event4, output = data; i < path.length; i++) {
      if (i === path.length - 1) {
        output[path[i]] = input2[path[i]];
        break;
      }
      output = output[path[i]] ??= {};
      input2 = input2[path[i]];
    }
  }
  return data;
};
var syncedBooleanAttribute = (name2) => {
  return {
    added(node) {
      node[name2] = true;
    },
    removed(node) {
      node[name2] = false;
    }
  };
};
var syncedAttribute = (name2) => {
  return {
    added(node, value3) {
      node[name2] = value3;
    }
  };
};
var ATTRIBUTE_HOOKS = {
  checked: syncedBooleanAttribute("checked"),
  selected: syncedBooleanAttribute("selected"),
  value: syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => node.focus?.());
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root3) => {
  const vdom = virtualise_node(root3);
  if (vdom === null || vdom.children instanceof Empty) {
    const empty3 = empty_text_node();
    initialiseMetadata(empty3);
    root3.appendChild(empty3);
    return none2();
  } else if (vdom.children instanceof NonEmpty && vdom.children.tail instanceof Empty) {
    return vdom.children.head;
  } else {
    const head = empty_text_node();
    initialiseMetadata(head);
    root3.insertBefore(head, root3.firstChild);
    return fragment2(vdom.children);
  }
};
var empty_text_node = () => {
  return document2.createTextNode("");
};
var virtualise_node = (node) => {
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const key = node.getAttribute("data-lustre-key");
      initialiseMetadata(node, key);
      if (key) {
        node.removeAttribute("data-lustre-key");
      }
      const tag = node.localName;
      const namespace = node.namespaceURI;
      const isHtmlElement = !namespace || namespace === NAMESPACE_HTML;
      if (isHtmlElement && input_elements.includes(tag)) {
        virtualise_input_events(tag, node);
      }
      const attributes = virtualise_attributes(node);
      const children = virtualise_child_nodes(node);
      const vnode = isHtmlElement ? element2(tag, attributes, children) : namespaced(namespace, tag, attributes, children);
      return key ? to_keyed(key, vnode) : vnode;
    }
    case TEXT_NODE:
      initialiseMetadata(node);
      return text2(node.data);
    case DOCUMENT_FRAGMENT_NODE:
      initialiseMetadata(node);
      return node.childNodes.length > 0 ? fragment2(virtualise_child_nodes(node)) : null;
    default:
      return null;
  }
};
var input_elements = ["input", "select", "textarea"];
var virtualise_input_events = (tag, node) => {
  const value3 = node.value;
  const checked2 = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked2) return;
  if (tag === "input" && node.type === "radio" && !checked2) return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value3) return;
  queueMicrotask(() => {
    node.value = value3;
    node.checked = checked2;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (document2.activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var virtualise_child_nodes = (node) => {
  let children = empty_list;
  let child = node.lastChild;
  while (child) {
    const vnode = virtualise_node(child);
    const next2 = child.previousSibling;
    if (vnode) {
      children = new NonEmpty(vnode, children);
    } else {
      node.removeChild(child);
    }
    child = next2;
  }
  return children;
};
var virtualise_attributes = (node) => {
  let index5 = node.attributes.length;
  let attributes = empty_list;
  while (index5-- > 0) {
    attributes = new NonEmpty(
      virtualise_attribute(node.attributes[index5]),
      attributes
    );
  }
  return attributes;
};
var virtualise_attribute = (attr) => {
  const name2 = attr.localName;
  const value3 = attr.value;
  return attribute2(name2, value3);
};

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!document2;
var is_reference_equal = (a2, b) => a2 === b;
var Runtime = class {
  constructor(root3, [model, effects], view2, update3) {
    this.root = root3;
    this.#model = model;
    this.#view = view2;
    this.#update = update3;
    this.#reconciler = new Reconciler(this.root, (event4, path, name2) => {
      const [events, msg] = handle(this.#events, path, name2, event4);
      this.#events = events;
      if (msg.isOk()) {
        this.dispatch(msg[0], false);
      }
    });
    this.#vdom = virtualise(this.root);
    this.#events = new$5();
    this.#shouldFlush = true;
    this.#tick(effects);
  }
  // PUBLIC API ----------------------------------------------------------------
  root = null;
  set offset(offset) {
    this.#reconciler.offset = offset;
  }
  dispatch(msg, immediate2 = false) {
    this.#shouldFlush ||= immediate2;
    if (this.#shouldQueue) {
      this.#queue.push(msg);
    } else {
      const [model, effects] = this.#update(this.#model, msg);
      this.#model = model;
      this.#tick(effects);
    }
  }
  emit(event4, data) {
    const target = this.root.host ?? this.root;
    target.dispatchEvent(
      new CustomEvent(event4, {
        detail: data,
        bubbles: true,
        composed: true
      })
    );
  }
  // PRIVATE API ---------------------------------------------------------------
  #model;
  #view;
  #update;
  #vdom;
  #events;
  #reconciler;
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #shouldFlush = false;
  #actions = {
    dispatch: (msg, immediate2) => this.dispatch(msg, immediate2),
    emit: (event4, data) => this.emit(event4, data),
    select: () => {
    },
    root: () => this.root
  };
  // A `#tick` is where we process effects and trigger any synchronous updates.
  // Once a tick has been processed a render will be scheduled if none is already.
  // p0
  #tick(effects) {
    this.#shouldQueue = true;
    while (true) {
      for (let list4 = effects.synchronous; list4.tail; list4 = list4.tail) {
        list4.head(this.#actions);
      }
      this.#beforePaint = listAppend(this.#beforePaint, effects.before_paint);
      this.#afterPaint = listAppend(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length) break;
      [this.#model, effects] = this.#update(this.#model, this.#queue.shift());
    }
    this.#shouldQueue = false;
    if (this.#shouldFlush) {
      cancelAnimationFrame(this.#renderTimer);
      this.#render();
    } else if (!this.#renderTimer) {
      this.#renderTimer = requestAnimationFrame(() => {
        this.#render();
      });
    }
  }
  #render() {
    this.#shouldFlush = false;
    this.#renderTimer = null;
    const next2 = this.#view(this.#model);
    const { patch, events } = diff2(this.#events, this.#vdom, next2);
    this.#events = events;
    this.#vdom = next2;
    this.#reconciler.push(patch);
    if (this.#beforePaint instanceof NonEmpty) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
    if (this.#afterPaint instanceof NonEmpty) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      requestAnimationFrame(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
  }
};
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
function listAppend(a2, b) {
  if (a2 instanceof Empty) {
    return b;
  } else if (b instanceof Empty) {
    return a2;
  } else {
    return append(a2, b);
  }
}

// build/dev/javascript/lustre/lustre/vdom/events.mjs
var Events = class extends CustomType {
  constructor(handlers, dispatched_paths, next_dispatched_paths) {
    super();
    this.handlers = handlers;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
};
function new$5() {
  return new Events(
    empty2(),
    empty_list,
    empty_list
  );
}
function tick(events) {
  return new Events(
    events.handlers,
    events.next_dispatched_paths,
    empty_list
  );
}
function do_remove_event(handlers, path, name2) {
  return remove(handlers, event2(path, name2));
}
function remove_event(events, path, name2) {
  let handlers = do_remove_event(events.handlers, path, name2);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function remove_attributes(handlers, path, attributes) {
  return fold2(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name2 = attribute3.name;
        return do_remove_event(events, path, name2);
      } else {
        return events;
      }
    }
  );
}
function handle(events, path, name2, event4) {
  let next_dispatched_paths = prepend(path, events.next_dispatched_paths);
  let _block;
  let _record = events;
  _block = new Events(
    _record.handlers,
    _record.dispatched_paths,
    next_dispatched_paths
  );
  let events$1 = _block;
  let $ = get3(
    events$1.handlers,
    path + separator_event + name2
  );
  if ($.isOk()) {
    let handler = $[0];
    return [events$1, run(event4, handler)];
  } else {
    return [events$1, new Error(toList([]))];
  }
}
function has_dispatched_events(events, path) {
  return matches(path, events.dispatched_paths);
}
function do_add_event(handlers, mapper, path, name2, handler) {
  return insert4(
    handlers,
    event2(path, name2),
    map4(handler, identity3(mapper))
  );
}
function add_event(events, mapper, path, name2, handler) {
  let handlers = do_add_event(events.handlers, mapper, path, name2, handler);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function add_attributes(handlers, mapper, path, attributes) {
  return fold2(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name2 = attribute3.name;
        let handler = attribute3.handler;
        return do_add_event(events, mapper, path, name2, handler);
      } else {
        return events;
      }
    }
  );
}
function compose_mapper(mapper, child_mapper) {
  let $ = is_reference_equal(mapper, identity3);
  let $1 = is_reference_equal(child_mapper, identity3);
  if ($1) {
    return mapper;
  } else if ($ && !$1) {
    return child_mapper;
  } else {
    return (msg) => {
      return mapper(child_mapper(msg));
    };
  }
}
function do_remove_children(loop$handlers, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let path = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children.hasLength(0)) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_remove_child(_pipe, path, child_index, child);
      loop$handlers = _pipe$1;
      loop$path = path;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_remove_child(handlers, parent, child_index, child) {
  if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path = add2(parent, child_index, child.key);
    let _pipe = handlers;
    let _pipe$1 = remove_attributes(_pipe, path, attributes);
    return do_remove_children(_pipe$1, path, 0, children);
  } else if (child instanceof Fragment) {
    let children = child.children;
    return do_remove_children(handlers, parent, child_index + 1, children);
  } else if (child instanceof UnsafeInnerHtml) {
    let attributes = child.attributes;
    let path = add2(parent, child_index, child.key);
    return remove_attributes(handlers, path, attributes);
  } else {
    return handlers;
  }
}
function remove_child(events, parent, child_index, child) {
  let handlers = do_remove_child(events.handlers, parent, child_index, child);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function do_add_children(loop$handlers, loop$mapper, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let mapper = loop$mapper;
    let path = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children.hasLength(0)) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_add_child(_pipe, mapper, path, child_index, child);
      loop$handlers = _pipe$1;
      loop$mapper = mapper;
      loop$path = path;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_add_child(handlers, mapper, parent, child_index, child) {
  if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let _pipe = handlers;
    let _pipe$1 = add_attributes(_pipe, composed_mapper, path, attributes);
    return do_add_children(_pipe$1, composed_mapper, path, 0, children);
  } else if (child instanceof Fragment) {
    let children = child.children;
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let child_index$1 = child_index + 1;
    return do_add_children(
      handlers,
      composed_mapper,
      parent,
      child_index$1,
      children
    );
  } else if (child instanceof UnsafeInnerHtml) {
    let attributes = child.attributes;
    let path = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return add_attributes(handlers, composed_mapper, path, attributes);
  } else {
    return handlers;
  }
}
function add_child(events, mapper, parent, index5, child) {
  let handlers = do_add_child(events.handlers, mapper, parent, index5, child);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function add_children(events, mapper, path, child_index, children) {
  let handlers = do_add_children(
    events.handlers,
    mapper,
    path,
    child_index,
    children
  );
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}

// build/dev/javascript/lustre/lustre/element.mjs
function element2(tag, attributes, children) {
  return element(
    "",
    identity3,
    "",
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function namespaced(namespace, tag, attributes, children) {
  return element(
    "",
    identity3,
    namespace,
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function text2(content) {
  return text("", identity3, content);
}
function none2() {
  return text("", identity3, "");
}
function count_fragment_children(loop$children, loop$count) {
  while (true) {
    let children = loop$children;
    let count = loop$count;
    if (children.hasLength(0)) {
      return count;
    } else if (children.atLeastLength(1) && children.head instanceof Fragment) {
      let children_count = children.head.children_count;
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + children_count;
    } else {
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + 1;
    }
  }
}
function fragment2(children) {
  return fragment(
    "",
    identity3,
    children,
    empty2(),
    count_fragment_children(children, 0)
  );
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text3(content) {
  return text2(content);
}
function div(attrs, children) {
  return element2("div", attrs, children);
}
function a(attrs, children) {
  return element2("a", attrs, children);
}
function table(attrs, children) {
  return element2("table", attrs, children);
}
function tbody(attrs, children) {
  return element2("tbody", attrs, children);
}
function td(attrs, children) {
  return element2("td", attrs, children);
}
function th(attrs, children) {
  return element2("th", attrs, children);
}
function thead(attrs, children) {
  return element2("thead", attrs, children);
}
function tr(attrs, children) {
  return element2("tr", attrs, children);
}
function button(attrs, children) {
  return element2("button", attrs, children);
}
function datalist(attrs, children) {
  return element2("datalist", attrs, children);
}
function input(attrs) {
  return element2("input", attrs, empty_list);
}
function label(attrs, children) {
  return element2("label", attrs, children);
}
function option(attrs, label2) {
  return element2("option", attrs, toList([text2(label2)]));
}
function select(attrs, children) {
  return element2("select", attrs, children);
}

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
var EffectDispatchedMessage = class extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
};
var EffectEmitEvent = class extends CustomType {
  constructor(name2, data) {
    super();
    this.name = name2;
    this.data = data;
  }
};
var SystemRequestedShutdown = class extends CustomType {
};

// build/dev/javascript/lustre/lustre/component.mjs
var Config2 = class extends CustomType {
  constructor(open_shadow_root, adopt_styles, attributes, properties, is_form_associated, on_form_autofill, on_form_reset, on_form_restore) {
    super();
    this.open_shadow_root = open_shadow_root;
    this.adopt_styles = adopt_styles;
    this.attributes = attributes;
    this.properties = properties;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
  }
};
function new$6(options) {
  let init3 = new Config2(
    false,
    true,
    empty_dict(),
    empty_dict(),
    false,
    option_none,
    option_none,
    option_none
  );
  return fold2(
    options,
    init3,
    (config, option2) => {
      return option2.apply(config);
    }
  );
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
var Spa = class _Spa {
  static start({ init: init3, update: update3, view: view2 }, selector, flags) {
    if (!is_browser()) return new Error(new NotABrowser());
    const root3 = selector instanceof HTMLElement ? selector : document2.querySelector(selector);
    if (!root3) return new Error(new ElementNotFound(selector));
    return new Ok(new _Spa(root3, init3(flags), update3, view2));
  }
  #runtime;
  constructor(root3, [init3, effects], update3, view2) {
    this.#runtime = new Runtime(root3, [init3, effects], view2, update3);
  }
  send(message) {
    switch (message.constructor) {
      case EffectDispatchedMessage: {
        this.dispatch(message.message, false);
        break;
      }
      case EffectEmitEvent: {
        this.emit(message.name, message.data);
        break;
      }
      case SystemRequestedShutdown:
        break;
    }
  }
  dispatch(msg, immediate2) {
    this.#runtime.dispatch(msg, immediate2);
  }
  emit(event4, data) {
    this.#runtime.emit(event4, data);
  }
};
var start = Spa.start;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init3, update3, view2, config) {
    super();
    this.init = init3;
    this.update = update3;
    this.view = view2;
    this.config = config;
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
function application(init3, update3, view2) {
  return new App(init3, update3, view2, new$6(empty_list));
}
function start3(app, selector, start_args) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, start_args);
    }
  );
}

// build/dev/javascript/gleam_stdlib/gleam/uri.mjs
var Uri = class extends CustomType {
  constructor(scheme, userinfo, host, port, path, query, fragment3) {
    super();
    this.scheme = scheme;
    this.userinfo = userinfo;
    this.host = host;
    this.port = port;
    this.path = path;
    this.query = query;
    this.fragment = fragment3;
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
function to_string5(uri) {
  let _block;
  let $ = uri.fragment;
  if ($ instanceof Some) {
    let fragment3 = $[0];
    _block = toList(["#", fragment3]);
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
  document.addEventListener("click", (event4) => {
    const a2 = find_anchor(event4.target);
    if (!a2) return;
    try {
      const url = new URL(a2.href);
      const uri = uri_from_url(url);
      const is_external = url.host !== window.location.host;
      if (!options.handle_external_links && is_external) return;
      if (!options.handle_internal_links && !is_external) return;
      event4.preventDefault();
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
function init(handler) {
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
var Patch2 = class extends CustomType {
};
var Http = class extends CustomType {
};
var Https = class extends CustomType {
};
function method_to_string(method) {
  if (method instanceof Connect) {
    return "CONNECT";
  } else if (method instanceof Delete) {
    return "DELETE";
  } else if (method instanceof Get) {
    return "GET";
  } else if (method instanceof Head) {
    return "HEAD";
  } else if (method instanceof Options2) {
    return "OPTIONS";
  } else if (method instanceof Patch2) {
    return "PATCH";
  } else if (method instanceof Post) {
    return "POST";
  } else if (method instanceof Put) {
    return "PUT";
  } else if (method instanceof Trace) {
    return "TRACE";
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
function new$7() {
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

// build/dev/javascript/gleam_fetch/gleam_fetch_ffi.mjs
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
function request_common(request) {
  let url = to_string5(to_uri(request));
  let method = method_to_string(request.method).toUpperCase();
  let options = {
    headers: make_headers(request.headers),
    method
  };
  return [url, options];
}
function to_fetch_request(request) {
  let [url, options] = request_common(request);
  if (options.method !== "GET" && options.method !== "HEAD") options.body = request.body;
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
function send2(request) {
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
  let _pipe = send2(req);
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
function send3(req, expect) {
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
            let json2 = $[0];
            return new Ok(json2);
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
var ImportTransactions = class extends CustomType {
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
  constructor(p2) {
    super();
    this.p = p2;
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
  constructor(name2) {
    super();
    this.name = name2;
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
var UserUpdatedFile = class extends CustomType {
};
var SystemReadFile = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ImportTransactionResult = class extends CustomType {
  constructor(t) {
    super();
    this.t = t;
  }
};
var ImportSelectedTransactions = class extends CustomType {
};
var ImportSelectedTransactionsResult = class extends CustomType {
  constructor(t) {
    super();
    this.t = t;
  }
};
var Model = class extends CustomType {
  constructor(login_form, current_user, cycle, route, cycle_end_day, show_all_transactions, categories_groups, categories, transactions, allocations, selected_category, show_add_category_ui, user_category_name_input, transaction_add_input, target_edit_form, selected_transaction, transaction_edit_form, suggestions, show_add_category_group_ui, new_category_group_name, category_group_change_input, imported_transactions) {
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
    this.imported_transactions = imported_transactions;
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
function get_file_content(callback) {
  const file = document.getElementById("file-input").files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const fileContent = e.target.result;
    callback(fileContent);
  };
  reader.readAsText(file);
}

// build/dev/javascript/budget_fe/budget_fe/internals/effects.mjs
function uri_to_route(uri) {
  let $ = path_segments(uri.path);
  if ($.hasLength(1) && $.head === "transactions") {
    return new TransactionsRoute();
  } else if ($.hasLength(1) && $.head === "import") {
    return new ImportTransactions();
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
var is_prod = false;
function request_with_auth() {
  let _block;
  let _pipe = read_localstorage("jwt");
  echo(_pipe, "src/budget_fe/internals/effects.gleam", 36);
  _block = unwrap2(_pipe, "");
  let jwt = _block;
  let _block$1;
  let $ = is_prod;
  if ($) {
    let _pipe$12 = new$7();
    let _pipe$22 = set_host(_pipe$12, "budget-be.fly.dev");
    let _pipe$32 = set_port(_pipe$22, 443);
    _block$1 = set_scheme(_pipe$32, new Https());
  } else {
    let _pipe$12 = new$7();
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
function make_request(method, path, json2, decoder, to_msg) {
  let _block;
  let _pipe = request_with_auth();
  let _pipe$1 = set_method(_pipe, method);
  _block = set_path(_pipe$1, path);
  let req = _block;
  let _block$1;
  if (json2 instanceof Some) {
    let json$1 = json2[0];
    let _pipe$2 = req;
    _block$1 = set_body(_pipe$2, json$1);
  } else {
    _block$1 = req;
  }
  let req_with_body = _block$1;
  return send3(
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
function make_post(path, json2, decoder, to_msg) {
  return make_request(
    new Post(),
    path,
    new Some(json2),
    decoder,
    to_msg
  );
}
function add_transaction_eff(transaction_form, amount, cat) {
  let t = new Transaction(
    guidv4(),
    (() => {
      let _pipe = transaction_form.date;
      let _pipe$1 = string_to_date(_pipe);
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
function add_category(name2, group_id) {
  return make_post(
    "category/add",
    to_string2(
      object2(
        toList([
          ["name", string3(name2)],
          ["group_id", string3(group_id)]
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
  return send3(
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
function import_selected_transactions(transactions) {
  let body = to_string2(
    array2(
      transactions,
      (t) => {
        return encode_import_transaction(t);
      }
    )
  );
  return make_post(
    "import/selected",
    body,
    list2(hash_decoder()),
    (var0) => {
      return new ImportSelectedTransactionsResult(var0);
    }
  );
}
function send_csv_request(body, decoder, to_msg) {
  let _block;
  let _pipe = request_with_auth();
  let _pipe$1 = set_method(_pipe, new Post());
  let _pipe$2 = set_path(_pipe$1, "import/csv");
  let _pipe$3 = set_header(_pipe$2, "Content-Type", "text/csv");
  _block = set_body(_pipe$3, body);
  let req = _block;
  return send3(req, expect_json(decoder, to_msg));
}
function import_csv(content) {
  return send_csv_request(
    content,
    list2(import_transaction_decoder()),
    (var0) => {
      return new ImportTransactionResult(var0);
    }
  );
}
function get_categories() {
  let path = "categories";
  let decoder = list2(category_decoder());
  return send3(
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
  return send3(
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
  return send3(
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
function add_new_group_eff(name2) {
  return make_post(
    "category/group/add",
    to_string2(object2(toList([["name", string3(name2)]]))),
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
        toList([["login", string3(login)], ["pass", string3(pass)]])
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
  return send3(
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
function echo$inspectDict(map7) {
  let body = "dict.from_list([";
  let first2 = true;
  let key_value_pairs = [];
  map7.forEach((value3, key) => {
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
  const name2 = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${echo$inspect(k)}: ${echo$inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name2 === "Object" ? "" : name2 + " ";
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

// build/dev/javascript/lustre/lustre/event.mjs
function is_immediate_event(name2) {
  if (name2 === "input") {
    return true;
  } else if (name2 === "change") {
    return true;
  } else if (name2 === "focus") {
    return true;
  } else if (name2 === "focusin") {
    return true;
  } else if (name2 === "focusout") {
    return true;
  } else if (name2 === "blur") {
    return true;
  } else if (name2 === "select") {
    return true;
  } else {
    return false;
  }
}
function on(name2, handler) {
  return event(
    name2,
    handler,
    empty_list,
    false,
    false,
    is_immediate_event(name2),
    new NoLimit(0)
  );
}
function on_click(msg) {
  return on("click", success(msg));
}
function on_input(msg) {
  return on(
    "input",
    subfield(
      toList(["target", "value"]),
      string2,
      (value3) => {
        return success(msg(value3));
      }
    )
  );
}
function on_change(msg) {
  return on(
    "change",
    subfield(
      toList(["target", "value"]),
      string2,
      (value3) => {
        return success(msg(value3));
      }
    )
  );
}
function on_check(msg) {
  return on(
    "change",
    subfield(
      toList(["target", "checked"]),
      bool,
      (checked2) => {
        return success(msg(checked2));
      }
    )
  );
}

// build/dev/javascript/budget_fe/budget_fe/internals/view.mjs
function auth_screen(form) {
  return div(
    toList([class$("mt-3 rounded-3 p-2")]),
    toList([
      text3("Log in:"),
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
          styles(toList([["width", "120px"]])),
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
          styles(toList([["width", "120px"]])),
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
        toList([text2("Login")])
      )
    ])
  );
}
function section_buttons(route) {
  let _block;
  if (route instanceof Home) {
    _block = ["active", "", ""];
  } else if (route instanceof TransactionsRoute) {
    _block = ["", "active", ""];
  } else {
    _block = ["", "", "active"];
  }
  let $ = _block;
  let cat_active = $[0];
  let transactions_active = $[1];
  let import_active = $[2];
  return div(
    toList([
      class$("btn-group "),
      styles(toList([["height", "fit-content"]]))
    ]),
    toList([
      a(
        toList([
          attribute2("aria-current", "page"),
          class$("btn btn-primary " + cat_active),
          href("/")
        ]),
        toList([text3("Budget")])
      ),
      a(
        toList([
          class$("btn btn-primary " + transactions_active),
          href("/transactions")
        ]),
        toList([text3("Transactions")])
      ),
      a(
        toList([
          class$("btn btn-primary " + import_active),
          href("/import")
        ]),
        toList([text3("Import")])
      )
    ])
  );
}
function row2(class$2, style, fun) {
  return div(
    toList([
      class$("d-flex flex-row " + class$2),
      styles(style)
    ]),
    fun()
  );
}
function column2(class$2, style, fun) {
  return div(
    toList([
      class$("d-flex flex-column  p-1" + class$2),
      styles(style)
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
  let start4 = $[0];
  let end = $[1];
  return (() => {
    let _pipe = start4;
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
            styles(toList([["height", "fit-content"]])),
            on_click(new CycleShift(new ShiftLeft()))
          ]),
          toList([text2("<")])
        ),
        column(
          () => {
            return toList([
              div(
                toList([
                  class$("text-center fs-4"),
                  styles(
                    toList([["justify-content", "center"], ["width", "170px"]])
                  )
                ]),
                toList([
                  text2(
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
                  styles(toList([["width", "200px"]]))
                ]),
                toList([text2(current_cycle_bounds(model))])
              )
            ]);
          }
        ),
        button(
          toList([
            class$("btn btn-secondary mt-2 "),
            styles(toList([["height", "fit-content"]])),
            on_click(new CycleShift(new ShiftRight()))
          ]),
          toList([text2(">")])
        )
      ]);
    }
  );
}
function current_cycle_transactions(model) {
  let $ = cycle_bounds(model.cycle, model.cycle_end_day);
  let start4 = $[0];
  let end = $[1];
  return filter(
    model.transactions,
    (t) => {
      return is_between(t.date, start4, end);
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
  let custom2 = $[1];
  return div(
    toList([
      attribute2("aria-label", "Basic example"),
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
        toList([text3("Monthly")])
      ),
      button(
        toList([
          on_click(new EditTargetCadence(false)),
          class$("btn btn-primary" + custom2),
          type_("button")
        ]),
        toList([text3("Custom")])
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
      styles(
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
          text2(
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
        toList([text2("Ready to Assign")])
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
        toList([text3(label2)])
      )
    ])
  );
}
function get_file_content2() {
  return from(
    (dispatch) => {
      let file_read_callback = (file_content) => {
        let _pipe = file_content;
        let _pipe$1 = new SystemReadFile(_pipe);
        return dispatch(_pipe$1);
      };
      return get_file_content(file_read_callback);
    }
  );
}
function imported_transaction_list_item_html(it, model) {
  return tr(
    toList([]),
    toList([
      td(
        toList([]),
        toList([text3(to_date_string(it.date))])
      ),
      td(toList([]), toList([text3(it.payee)])),
      td(toList([]), toList([text3(it.transaction_type)])),
      td(toList([]), toList([text3(it.reference)])),
      td(
        toList([]),
        toList([
          text3(
            (() => {
              let _pipe = it.value;
              return money_to_string(_pipe);
            })()
          )
        ])
      )
    ])
  );
}
function import_transactions(model) {
  return div(
    toList([class$("w-100")]),
    toList([
      div(
        toList([]),
        toList([
          input(
            toList([
              type_("file"),
              accept(toList([".xml", ".csv"])),
              id("file-input"),
              on_change((str) => {
                return new UserUpdatedFile();
              })
            ])
          ),
          button(
            toList([
              class$("float-end"),
              on_click(new ImportSelectedTransactions())
            ]),
            toList([text2("Import")])
          )
        ])
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
                  th(toList([]), toList([text3("Date")])),
                  th(toList([]), toList([text3("Partner Name")])),
                  th(toList([]), toList([text3("Type")])),
                  th(toList([]), toList([text3("Reference")])),
                  th(toList([]), toList([text3("Amount")]))
                ])
              )
            ])
          ),
          tbody(
            toList([]),
            (() => {
              let _pipe = model.imported_transactions;
              return map2(
                _pipe,
                (_capture) => {
                  return imported_transaction_list_item_html(_capture, model);
                }
              );
            })()
          )
        ])
      )
    ])
  );
}
function manage_transaction_buttons(t, selected_id, category_name, is_edit) {
  let $ = selected_id === t.id;
  if (!$) {
    return text3("");
  } else {
    return div(
      toList([class$("mt-1")]),
      toList([
        (() => {
          if (is_edit) {
            return button(
              toList([on_click(new UpdateTransaction())]),
              toList([text2("Save")])
            );
          } else {
            return button(
              toList([
                on_click(new EditTransaction(t, category_name))
              ]),
              toList([text2("Edit")])
            );
          }
        })(),
        button(
          toList([
            class$("ms-1"),
            on_click(new DeleteTransaction(t.id))
          ]),
          toList([text2("Delete")])
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
              styles(toList([["width", "140px"]]))
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
              styles(toList([["width", "160px"]])),
              attribute2("list", "payees_list")
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
                (p2) => {
                  return option(toList([value(p2)]), "");
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
              styles(toList([["width", "160px"]])),
              attribute2("list", "categories_list")
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
                (p2) => {
                  return option(toList([value(p2)]), "");
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
              styles(toList([["width", "160px"]]))
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
          toList([text3(to_date_string(t.date))])
        ),
        td(toList([]), toList([text3(t.payee)])),
        td(toList([]), toList([text3(category_name)])),
        td(
          toList([]),
          toList([
            text3(
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
              attribute2("list", "payees_list"),
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
                (p2) => {
                  return option(toList([value(p2)]), "");
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
                (p2) => {
                  return option(toList([value(p2)]), p2);
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
              styles(toList([["width", "120px"]])),
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
            toList([text2("Add")])
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
                  th(toList([]), toList([text3("Date")])),
                  th(toList([]), toList([text3("Payee")])),
                  th(toList([]), toList([text3("Category")])),
                  th(toList([]), toList([text3("Amount")]))
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
    return text3("");
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
            text2(
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
    return text3("");
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
            text2(
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
function div_context(text4, color) {
  return div(
    toList([
      class$("ms-2 p-1"),
      styles(
        toList([["background-color", color], ["width", "fit-content"]])
      )
    ]),
    toList([text3(text4)])
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
    _block$1 = text3("");
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
          td(toList([]), toList([text3(c.name)])),
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
    _block$1 = text3("");
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
              toList([text2("Add")])
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
      toList([text2(btn_label)])
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
      toList([text2(btn_label)])
    );
  }
  let collapse_ui = _block$3;
  let group_ui$1 = tr(
    toList([
      styles(toList([["background-color", "rgb(199, 208, 201)"]]))
    ]),
    toList([
      td(
        toList([]),
        toList([text3(group.name), add_btn, collapse_ui])
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
  let size2 = _block;
  return table(
    toList([class$(size2 + " table table-sm table-hover")]),
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
                  text3("Categories groups"),
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
                      toList([text2(btn_label)])
                    );
                  })()
                ])
              ),
              th(toList([]), toList([text3("Balance")]))
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
                        toList([text2("Create group")])
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
      styles(
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
          styles(toList([["width", "200px"]])),
          value(sc.input_name),
          class$("mb-2")
        ])
      ),
      button(
        toList([
          class$("me-3"),
          on_click(new UpdateCategoryName(category))
        ]),
        toList([text2("Update")])
      ),
      button(
        toList([on_click(new DeleteCategory())]),
        toList([text2("Delete")])
      )
    ])
  );
}
function category_details_change_group_ui(cat, model) {
  return div(
    toList([
      class$("mt-3 rounded-3 p-2"),
      styles(
        toList([["background-color", edit_name_side_panel_color]])
      )
    ]),
    toList([
      text3("Change group"),
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
          styles(toList([["width", "160px"]])),
          attribute2("list", "group_list")
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
            (p2) => {
              return option(toList([value(p2)]), "");
            }
          );
        })()
      ),
      button(
        toList([
          class$("mt-1"),
          on_click(new ChangeGroupForCategory(cat))
        ]),
        toList([text2("Change group")])
      )
    ])
  );
}
var side_panel_color = "rgb(134, 217, 192)";
function category_details_allocation_ui(sc, allocation) {
  return div(
    toList([
      class$("mt-3 rounded-3 p-2"),
      styles(toList([["background-color", side_panel_color]]))
    ]),
    toList([
      text3("Allocated: "),
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
          styles(toList([["width", "120px"]])),
          value(sc.allocation)
        ])
      ),
      button(
        toList([
          class$("mt-1"),
          on_click(new SaveAllocation(allocation))
        ]),
        toList([text2("Save")])
      )
    ])
  );
}
function category_details_target_ui(cat, target_edit_option) {
  return div(
    toList([
      class$("mt-3 rounded-3 p-2 col mt-3"),
      styles(toList([["background-color", side_panel_color]]))
    ]),
    (() => {
      if (target_edit_option instanceof Some) {
        let target_edit = target_edit_option[0];
        return toList([
          div(
            toList([]),
            toList([
              text3("Target"),
              button(
                toList([
                  class$("ms-3 me-1"),
                  on_click(new SaveTarget(cat))
                ]),
                toList([text2("Save")])
              ),
              button(
                toList([on_click(new DeleteTarget(cat))]),
                toList([text2("Delete")])
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
                  text3("Amount needed for date: "),
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
                      styles(toList([["width", "120px"]])),
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
                  text3("Amount monthly: "),
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
                      styles(toList([["width", "120px"]])),
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
              text3("Target"),
              button(
                toList([
                  class$("ms-3"),
                  on_click(new StartEditTarget(cat))
                ]),
                toList([text2("Edit")])
              )
            ])
          ),
          div(
            toList([class$("mt-2")]),
            toList([text3(target_string(cat))])
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
      styles(
        toList([["background-color", activity_side_panel_color]])
      )
    ]),
    toList([
      div(
        toList([class$("col")]),
        toList([
          div(toList([]), toList([text3("Activity")])),
          div(
            toList([]),
            toList([
              text3(
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
    return text3("");
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
                  styles(toList([["width", "100%"]]))
                ]),
                toList([ready_to_assign(model)])
              ),
              div(
                toList([
                  class$("d-flex align-items-center fs-5"),
                  styles(toList([]))
                ]),
                toList([
                  (() => {
                    let $ = model.current_user;
                    if ($ instanceof None) {
                      return text3("");
                    } else {
                      let user = $[0];
                      return text3(user.name);
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
                  } else if ($1 instanceof TransactionsRoute) {
                    return budget_transactions(model);
                  } else {
                    return import_transactions(model);
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
function init2(_) {
  return [
    new Model(
      new LoginForm(new None(), new None(), false),
      new None(),
      calculate_current_cycle(),
      new ImportTransactions(),
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
      "",
      toList([])
    ),
    batch(
      toList([init(on_route_change), load_user_eff()])
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
  let _pipe$1 = string_to_date(_pipe);
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
function update2(model, msg) {
  debug(msg);
  if (msg instanceof OnRouteChange) {
    let route = msg.route;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof LoginSubmit) {
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
    let p2 = msg.pass;
    let _block;
    if (l instanceof Some) {
      let l$1 = l[0];
      _block = new Some(l$1);
    } else {
      _block = model.login_form.login;
    }
    let login = _block;
    let _block$1;
    if (p2 instanceof Some) {
      let p$1 = p2[0];
      _block$1 = new Some(p$1);
    } else {
      _block$1 = model.login_form.pass;
    }
    let pass = _block$1;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          })(),
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof ShowAddCategoryUI) {
    let group_id = msg.group_id;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof AddCategory) {
    let group_id = msg.group_id;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      add_category(model.user_category_name_input, group_id)
    ];
  } else if (msg instanceof UserUpdatedCategoryName) {
    let name2 = msg.cat_name;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          name2,
          _record.transaction_add_input,
          _record.target_edit_form,
          _record.selected_transaction,
          _record.transaction_edit_form,
          _record.suggestions,
          _record.show_add_category_group_ui,
          _record.new_category_group_name,
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof AddCategoryResult && msg.c.isOk()) {
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
          return new Model(
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
            _record.category_group_change_input,
            _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionDate) {
    let date = msg.date;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionAmount) {
    let amount = msg.amount;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionIsInflow) {
    let is_inflow = msg.is_inflow;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof StartEditTarget) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof SaveTarget) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      update_category_target_eff(c, model.target_edit_form)
    ];
  } else if (msg instanceof DeleteTarget) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      delete_target_eff(c)
    ];
  } else if (msg instanceof UserTargetUpdateAmount) {
    let amount = msg.amount;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof EditTargetCadence) {
    let is_monthly = msg.is_monthly;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserTargetUpdateCustomDate) {
    let date = msg.date;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof DeleteTransaction) {
    let id2 = msg.t_id;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserTransactionEditDate) {
    let d = msg.d;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserTransactionEditAmount) {
    let a2 = msg.a;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserEditTransactionIsInflow) {
    let is_inflow = msg.is_inflow;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserTransactionEditCategory) {
    let c = msg.c;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UpdateTransaction) {
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
    let name2 = msg.n;
    return [
      (() => {
        let _record = model;
        return new Model(
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
                  name2,
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      batch(toList([get_transactions(), get_allocations()]))
    ];
  } else if (msg instanceof UserInputShowAllTransactions) {
    let show = msg.show;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof Suggestions && msg.trans.isOk()) {
    let suggestions = msg.trans[0];
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedCategoryGroupName) {
    let input_group_name = msg.name;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
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
          return new Model(
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
            "",
            _record.imported_transactions
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
  } else if (msg instanceof UserInputCategoryGroupChange) {
    let group_name = msg.group_name;
    return [
      (() => {
        let _record = model;
        return new Model(
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
          group_name,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserUpdatedFile) {
    return [model, get_file_content2()];
  } else if (msg instanceof SystemReadFile) {
    let content = msg[0];
    return [model, import_csv(content)];
  } else if (msg instanceof ImportTransactionResult && msg.t.isOk()) {
    let import_transactions2 = msg.t[0];
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          import_transactions2
        );
      })(),
      none()
    ];
  } else if (msg instanceof ImportTransactionResult && !msg.t.isOk()) {
    return [model, none()];
  } else if (msg instanceof ImportSelectedTransactions) {
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          toList([])
        );
      })(),
      import_selected_transactions(model.imported_transactions)
    ];
  } else if (msg instanceof ImportSelectedTransactionsResult && msg.t.isOk()) {
    let imported = msg.t[0];
    return [
      (() => {
        let _record = model;
        return new Model(
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
          _record.category_group_change_input,
          _record.imported_transactions
        );
      })(),
      none()
    ];
  } else {
    return [model, none()];
  }
}
function main() {
  let app = application(init2, update2, view);
  let $ = start3(app, "#app", void 0);
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "budget_fe",
      24,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
