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
    for (let _ of this) {
      if (desired <= 0)
        return true;
      desired--;
    }
    return desired <= 0;
  }
  // @internal
  hasLength(desired) {
    for (let _ of this) {
      if (desired <= 0)
        return false;
      desired--;
    }
    return desired === 0;
  }
  // @internal
  countLength() {
    let length4 = 0;
    for (let _ of this)
      length4++;
    return length4;
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
var BitArray = class _BitArray {
  constructor(buffer) {
    if (!(buffer instanceof Uint8Array)) {
      throw "BitArray can only be constructed from a Uint8Array";
    }
    this.buffer = buffer;
  }
  // @internal
  get length() {
    return this.buffer.length;
  }
  // @internal
  byteAt(index3) {
    return this.buffer[index3];
  }
  // @internal
  floatFromSlice(start3, end, isBigEndian) {
    return byteArrayToFloat(this.buffer, start3, end, isBigEndian);
  }
  // @internal
  intFromSlice(start3, end, isBigEndian, isSigned) {
    return byteArrayToInt(this.buffer, start3, end, isBigEndian, isSigned);
  }
  // @internal
  binaryFromSlice(start3, end) {
    return new _BitArray(this.buffer.slice(start3, end));
  }
  // @internal
  sliceAfter(index3) {
    return new _BitArray(this.buffer.slice(index3));
  }
};
var UtfCodepoint = class {
  constructor(value3) {
    this.value = value3;
  }
};
function byteArrayToInt(byteArray, start3, end, isBigEndian, isSigned) {
  const byteSize = end - start3;
  if (byteSize <= 6) {
    let value3 = 0;
    if (isBigEndian) {
      for (let i = start3; i < end; i++) {
        value3 = value3 * 256 + byteArray[i];
      }
    } else {
      for (let i = end - 1; i >= start3; i--) {
        value3 = value3 * 256 + byteArray[i];
      }
    }
    if (isSigned) {
      const highBit = 2 ** (byteSize * 8 - 1);
      if (value3 >= highBit) {
        value3 -= highBit * 2;
      }
    }
    return value3;
  } else {
    let value3 = 0n;
    if (isBigEndian) {
      for (let i = start3; i < end; i++) {
        value3 = (value3 << 8n) + BigInt(byteArray[i]);
      }
    } else {
      for (let i = end - 1; i >= start3; i--) {
        value3 = (value3 << 8n) + BigInt(byteArray[i]);
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
}
function byteArrayToFloat(byteArray, start3, end, isBigEndian) {
  const view2 = new DataView(byteArray.buffer);
  const byteSize = end - start3;
  if (byteSize === 8) {
    return view2.getFloat64(start3, !isBigEndian);
  } else if (byteSize === 4) {
    return view2.getFloat32(start3, !isBigEndian);
  } else {
    const msg = `Sized floats must be 32-bit or 64-bit on JavaScript, got size of ${byteSize * 8} bits`;
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
  let values = [x, y];
  while (values.length) {
    let a2 = values.pop();
    let b = values.pop();
    if (a2 === b)
      continue;
    if (!isObject(a2) || !isObject(b))
      return false;
    let unequal = !structurallyCompatibleObjects(a2, b) || unequalDates(a2, b) || unequalBuffers(a2, b) || unequalArrays(a2, b) || unequalMaps(a2, b) || unequalSets(a2, b) || unequalRegExps(a2, b);
    if (unequal)
      return false;
    const proto = Object.getPrototypeOf(a2);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a2.equals(b))
          continue;
        else
          return false;
      } catch {
      }
    }
    let [keys2, get] = getters(a2);
    for (let k of keys2(a2)) {
      values.push(get(a2, k), get(b, k));
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
  return a2.buffer instanceof ArrayBuffer && a2.BYTES_PER_ELEMENT && !(a2.byteLength === b.byteLength && a2.every((n, i) => n === b[i]));
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
  if (nonstructural.some((c) => a2 instanceof c))
    return false;
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
  for (let k in extra)
    error[k] = extra[k];
  return error;
}

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

// build/dev/javascript/gleam_stdlib/gleam/regex.mjs
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

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function insert(dict, key, value3) {
  return map_insert(key, value3, dict);
}
function reverse_and_concat(loop$remaining, loop$accumulator) {
  while (true) {
    let remaining = loop$remaining;
    let accumulator = loop$accumulator;
    if (remaining.hasLength(0)) {
      return accumulator;
    } else {
      let item = remaining.head;
      let rest = remaining.tail;
      loop$remaining = rest;
      loop$accumulator = prepend(item, accumulator);
    }
  }
}
function do_keys_loop(loop$list, loop$acc) {
  while (true) {
    let list = loop$list;
    let acc = loop$acc;
    if (list.hasLength(0)) {
      return reverse_and_concat(acc, toList([]));
    } else {
      let first2 = list.head;
      let rest = list.tail;
      loop$list = rest;
      loop$acc = prepend(first2[0], acc);
    }
  }
}
function keys(dict) {
  let list_of_pairs = map_to_list(dict);
  return do_keys_loop(list_of_pairs, toList([]));
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
function length_loop(loop$list, loop$count) {
  while (true) {
    let list = loop$list;
    let count = loop$count;
    if (list.atLeastLength(1)) {
      let list$1 = list.tail;
      loop$list = list$1;
      loop$count = count + 1;
    } else {
      return count;
    }
  }
}
function length(list) {
  return length_loop(list, 0);
}
function reverse_loop(loop$remaining, loop$accumulator) {
  while (true) {
    let remaining = loop$remaining;
    let accumulator = loop$accumulator;
    if (remaining.hasLength(0)) {
      return accumulator;
    } else {
      let item = remaining.head;
      let rest$1 = remaining.tail;
      loop$remaining = rest$1;
      loop$accumulator = prepend(item, accumulator);
    }
  }
}
function reverse(list) {
  return reverse_loop(list, toList([]));
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let new_acc = (() => {
        let $ = fun(first$1);
        if ($) {
          return prepend(first$1, acc);
        } else {
          return acc;
        }
      })();
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list, predicate) {
  return filter_loop(list, predicate, toList([]));
}
function filter_map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let new_acc = (() => {
        let $ = fun(first$1);
        if ($.isOk()) {
          let first$2 = $[0];
          return prepend(first$2, acc);
        } else {
          return acc;
        }
      })();
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter_map(list, fun) {
  return filter_map_loop(list, fun, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map2(list, fun) {
  return map_loop(list, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first2 = loop$first;
    let second = loop$second;
    if (first2.hasLength(0)) {
      return second;
    } else {
      let item = first2.head;
      let rest$1 = first2.tail;
      loop$first = rest$1;
      loop$second = prepend(item, second);
    }
  }
}
function append(first2, second) {
  return append_loop(reverse(first2), second);
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
function concat_loop(loop$lists, loop$acc) {
  while (true) {
    let lists = loop$lists;
    let acc = loop$acc;
    if (lists.hasLength(0)) {
      return reverse(acc);
    } else {
      let list = lists.head;
      let further_lists = lists.tail;
      loop$lists = further_lists;
      loop$acc = reverse_and_prepend(list, acc);
    }
  }
}
function flatten2(lists) {
  return concat_loop(lists, toList([]));
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list.hasLength(0)) {
      return initial;
    } else {
      let x = list.head;
      let rest$1 = list.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, x);
      loop$fun = fun;
    }
  }
}
function index_fold_loop(loop$over, loop$acc, loop$with, loop$index) {
  while (true) {
    let over = loop$over;
    let acc = loop$acc;
    let with$ = loop$with;
    let index3 = loop$index;
    if (over.hasLength(0)) {
      return acc;
    } else {
      let first$1 = over.head;
      let rest$1 = over.tail;
      loop$over = rest$1;
      loop$acc = with$(acc, first$1, index3);
      loop$with = with$;
      loop$index = index3 + 1;
    }
  }
}
function index_fold(list, initial, fun) {
  return index_fold_loop(list, initial, fun, 0);
}
function fold_until(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
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
    let list = loop$list;
    let is_desired = loop$is_desired;
    if (list.hasLength(0)) {
      return new Error(void 0);
    } else {
      let x = list.head;
      let rest$1 = list.tail;
      let $ = is_desired(x);
      if ($) {
        return new Ok(x);
      } else {
        loop$list = rest$1;
        loop$is_desired = is_desired;
      }
    }
  }
}
function find_map(loop$list, loop$fun) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    if (list.hasLength(0)) {
      return new Error(void 0);
    } else {
      let x = list.head;
      let rest$1 = list.tail;
      let $ = fun(x);
      if ($.isOk()) {
        let x$1 = $[0];
        return new Ok(x$1);
      } else {
        loop$list = rest$1;
        loop$fun = fun;
      }
    }
  }
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function slice(string3, idx, len) {
  let $ = len < 0;
  if ($) {
    return "";
  } else {
    let $1 = idx < 0;
    if ($1) {
      let translated_idx = string_length(string3) + idx;
      let $2 = translated_idx < 0;
      if ($2) {
        return "";
      } else {
        return string_slice(string3, translated_idx, len);
      }
    } else {
      return string_slice(string3, idx, len);
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
    let string3 = loop$string;
    let times = loop$times;
    let acc = loop$acc;
    let $ = times <= 0;
    if ($) {
      return acc;
    } else {
      loop$string = string3;
      loop$times = times - 1;
      loop$acc = acc + string3;
    }
  }
}
function repeat(string3, times) {
  return repeat_loop(string3, times, "");
}
function padding(size, pad_string) {
  let pad_string_length = string_length(pad_string);
  let num_pads = divideInt(size, pad_string_length);
  let extra = remainderInt(size, pad_string_length);
  return repeat(pad_string, num_pads) + slice(pad_string, 0, extra);
}
function pad_start(string3, desired_length, pad_string) {
  let current_length = string_length(string3);
  let to_pad_length = desired_length - current_length;
  let $ = to_pad_length <= 0;
  if ($) {
    return string3;
  } else {
    return padding(to_pad_length, pad_string) + string3;
  }
}
function pad_left(string3, desired_length, pad_string) {
  return pad_start(string3, desired_length, pad_string);
}
function drop_start(loop$string, loop$num_graphemes) {
  while (true) {
    let string3 = loop$string;
    let num_graphemes = loop$num_graphemes;
    let $ = num_graphemes > 0;
    if (!$) {
      return string3;
    } else {
      let $1 = pop_grapheme(string3);
      if ($1.isOk()) {
        let string$1 = $1[0][1];
        loop$string = string$1;
        loop$num_graphemes = num_graphemes - 1;
      } else {
        return string3;
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
function unwrap2(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}
function lazy_unwrap(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$();
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
function int(data) {
  return decode_int(data);
}
function any(decoders) {
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
        return any(decoders$1)(data);
      }
    }
  };
}
function push_path(error, name) {
  let name$1 = identity(name);
  let decoder = any(
    toList([string, (x) => {
      return map3(int(x), to_string);
    }])
  );
  let name$2 = (() => {
    let $ = decoder(name$1);
    if ($.isOk()) {
      let name$22 = $[0];
      return name$22;
    } else {
      let _pipe = toList(["<", classify_dynamic(name$1), ">"]);
      let _pipe$1 = concat(_pipe);
      return identity(_pipe$1);
    }
  })();
  return error.withFields({ path: prepend(name$2, error.path) });
}
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
var tempDataView = new DataView(new ArrayBuffer(8));
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
  if (u === null)
    return 1108378658;
  if (u === void 0)
    return 1108378659;
  if (u === true)
    return 1108378657;
  if (u === false)
    return 1108378656;
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
      const newArray = spliceIn(root.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap | bit,
        array: newArray
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
var unequalDictSymbol = Symbol();

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
function float_to_string(float3) {
  const string3 = float3.toString().replace("+", "");
  if (string3.indexOf(".") >= 0) {
    return string3;
  } else {
    const index3 = string3.indexOf("e");
    if (index3 >= 0) {
      return string3.slice(0, index3) + ".0" + string3.slice(index3);
    } else {
      return string3 + ".0";
    }
  }
}
function int_to_base_string(int3, base) {
  return int3.toString(base).toUpperCase();
}
function string_length(string3) {
  if (string3 === "") {
    return 0;
  }
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    let i = 0;
    for (const _ of iterator) {
      i++;
    }
    return i;
  } else {
    return string3.match(/./gsu).length;
  }
}
function graphemes(string3) {
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    return List.fromArray(Array.from(iterator).map((item) => item.segment));
  } else {
    return List.fromArray(string3.match(/./gsu));
  }
}
var segmenter = void 0;
function graphemes_iterator(string3) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string3)[Symbol.iterator]();
  }
}
function pop_grapheme(string3) {
  let first2;
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    first2 = iterator.next().value?.segment;
  } else {
    first2 = string3.match(/./su)?.[0];
  }
  if (first2) {
    return new Ok([first2, string3.slice(first2.length)]);
  } else {
    return new Error(Nil);
  }
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
function string_slice(string3, idx, len) {
  if (len <= 0 || idx >= string3.length) {
    return "";
  }
  const iterator = graphemes_iterator(string3);
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
    return string3.match(/./gsu).slice(idx, idx + len).join("");
  }
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
var trim_start_regex = new RegExp(`^[${unicode_whitespaces}]*`);
var trim_end_regex = new RegExp(`[${unicode_whitespaces}]*$`);
function print_debug(string3) {
  if (typeof process === "object" && process.stderr?.write) {
    process.stderr.write(string3 + "\n");
  } else if (typeof Deno === "object") {
    Deno.stderr.writeSync(new TextEncoder().encode(string3 + "\n"));
  } else {
    console.log(string3);
  }
}
function floor(float3) {
  return Math.floor(float3);
}
function round(float3) {
  return Math.round(float3);
}
function truncate(float3) {
  return Math.trunc(float3);
}
function random_uniform() {
  const random_uniform_result = Math.random();
  if (random_uniform_result === 1) {
    return random_uniform();
  }
  return random_uniform_result;
}
function regex_check(regex, string3) {
  regex.lastIndex = 0;
  return regex.test(string3);
}
function compile_regex(pattern, options) {
  try {
    let flags = "gu";
    if (options.case_insensitive)
      flags += "i";
    if (options.multi_line)
      flags += "m";
    return new Ok(new RegExp(pattern, flags));
  } catch (error) {
    const number = (error.columnNumber || 0) | 0;
    return new Error(new CompileError(error.message, number));
  }
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
function try_get_field(value3, field3, or_else) {
  try {
    return field3 in value3 ? new Ok(new Some(value3[field3])) : or_else();
  } catch {
    return or_else();
  }
}
function bitwise_and(x, y) {
  return Number(BigInt(x) & BigInt(y));
}
function bitwise_not(x) {
  return Number(~BigInt(x));
}
function bitwise_or(x, y) {
  return Number(BigInt(x) | BigInt(y));
}
function bitwise_shift_left(x, y) {
  return Number(BigInt(x) << BigInt(y));
}
function inspect(v) {
  const t = typeof v;
  if (v === true)
    return "True";
  if (v === false)
    return "False";
  if (v === null)
    return "//js(null)";
  if (v === void 0)
    return "Nil";
  if (t === "string")
    return inspectString(v);
  if (t === "bigint" || Number.isInteger(v))
    return v.toString();
  if (t === "number")
    return float_to_string(v);
  if (Array.isArray(v))
    return `#(${v.map(inspect).join(", ")})`;
  if (v instanceof List)
    return inspectList(v);
  if (v instanceof UtfCodepoint)
    return inspectUtfCodepoint(v);
  if (v instanceof BitArray)
    return inspectBitArray(v);
  if (v instanceof CustomType)
    return inspectCustomType(v);
  if (v instanceof Dict)
    return inspectDict(v);
  if (v instanceof Set)
    return `//js(Set(${[...v].map(inspect).join(", ")}))`;
  if (v instanceof RegExp)
    return `//js(${v})`;
  if (v instanceof Date)
    return `//js(Date("${v.toISOString()}"))`;
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
    let char = str[i];
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
    if (!first2)
      body = body + ", ";
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
function inspectList(list) {
  return `[${list.toArray().map(inspect).join(", ")}]`;
}
function inspectBitArray(bits) {
  return `<<${Array.from(bits.buffer).join(", ")}>>`;
}
function inspectUtfCodepoint(codepoint2) {
  return `//utfcodepoint(${String.fromCodePoint(codepoint2.value)})`;
}

// build/dev/javascript/gleam_stdlib/gleam/float.mjs
function negate(x) {
  return -1 * x;
}
function round2(x) {
  let $ = x >= 0;
  if ($) {
    return round(x);
  } else {
    return 0 - round(negate(x));
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
  return round2(_pipe$1);
}
function divide(dividend, divisor) {
  if (divisor === 0) {
    return new Error(void 0);
  } else {
    let divisor$1 = divisor;
    return new Ok(divideInt(dividend, divisor$1));
  }
}

// build/dev/javascript/gleam_stdlib/gleam/io.mjs
function debug(term) {
  let _pipe = term;
  let _pipe$1 = inspect2(_pipe);
  print_debug(_pipe$1);
  return term;
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
      let accumulator$1 = (() => {
        if (segment === "") {
          let accumulator$12 = accumulator;
          return accumulator$12;
        } else if (segment === ".") {
          let accumulator$12 = accumulator;
          return accumulator$12;
        } else if (segment === ".." && accumulator.hasLength(0)) {
          return toList([]);
        } else if (segment === ".." && accumulator.atLeastLength(1)) {
          let accumulator$12 = accumulator.tail;
          return accumulator$12;
        } else {
          let segment$1 = segment;
          let accumulator$12 = accumulator;
          return prepend(segment$1, accumulator$12);
        }
      })();
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

// build/dev/javascript/gluid/gluid.mjs
function format_uuid(src) {
  return slice(src, 0, 8) + "-" + slice(src, 8, 4) + "-" + slice(
    src,
    12,
    4
  ) + "-" + slice(src, 16, 4) + "-" + slice(src, 20, 12);
}
function guidv4() {
  let randoma = random(4294967295);
  let a2 = (() => {
    let _pipe = to_base16(randoma);
    return pad_left(_pipe, 8, "0");
  })();
  let randomb = random(4294967295);
  let clear_mask = bitwise_not(bitwise_shift_left(15, 12));
  let randomb$1 = bitwise_and(randomb, clear_mask);
  let value_mask = bitwise_shift_left(4, 12);
  let randomb$2 = bitwise_or(randomb$1, value_mask);
  let b = (() => {
    let _pipe = to_base16(randomb$2);
    return pad_left(_pipe, 8, "0");
  })();
  let randomc = random(4294967295);
  let clear_mask$1 = bitwise_not(bitwise_shift_left(3, 30));
  let randomc$1 = bitwise_and(randomc, clear_mask$1);
  let value_mask$1 = bitwise_shift_left(2, 30);
  let randomc$2 = bitwise_or(randomc$1, value_mask$1);
  let c = (() => {
    let _pipe = to_base16(randomc$2);
    return pad_left(_pipe, 8, "0");
  })();
  let randomd = random(4294967295);
  let d = (() => {
    let _pipe = randomd;
    let _pipe$1 = to_base16(_pipe);
    return pad_left(_pipe$1, 8, "0");
  })();
  let concatened = a2 + b + c + d;
  return format_uuid(concatened);
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function to_int(bool3) {
  if (!bool3) {
    return 0;
  } else {
    return 1;
  }
}
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(all) {
    super();
    this.all = all;
  }
};
function custom(run3) {
  return new Effect(
    toList([
      (actions) => {
        return run3(actions.dispatch, actions.emit, actions.select, actions.root);
      }
    ])
  );
}
function from(effect) {
  return custom((dispatch, _, _1, _2) => {
    return effect(dispatch);
  });
}
function none() {
  return new Effect(toList([]));
}
function batch(effects) {
  return new Effect(
    fold(
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
var Text = class extends CustomType {
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
    (handlers3, element2, index3) => {
      let key$1 = key + "-" + to_string(index3);
      return do_handlers(element2, handlers3, key$1);
    }
  );
}
function do_handlers(loop$element, loop$handlers, loop$key) {
  while (true) {
    let element2 = loop$element;
    let handlers2 = loop$handlers;
    let key = loop$key;
    if (element2 instanceof Text) {
      return handlers2;
    } else if (element2 instanceof Map2) {
      let subtree = element2.subtree;
      loop$element = subtree();
      loop$handlers = handlers2;
      loop$key = key;
    } else {
      let attrs = element2.attrs;
      let children2 = element2.children;
      let handlers$1 = fold(
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
    fold(
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
  return new Text(content);
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict) {
    super();
    this.dict = dict;
  }
};
function new$2() {
  return new Set2(new_map());
}
function contains(set, member) {
  let _pipe = set.dict;
  let _pipe$1 = map_get(_pipe, member);
  return is_ok(_pipe$1);
}
var token = void 0;
function from_list2(members) {
  let dict = fold(
    members,
    new_map(),
    (m, k) => {
      return insert(m, k, token);
    }
  );
  return new Set2(dict);
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
    new$2()
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
    while (next3.subtree !== void 0)
      next3 = next3.subtree();
    if (next3.content !== void 0) {
      if (!prev2) {
        const created = document.createTextNode(next3.content);
        parent.appendChild(created);
        out ??= created;
      } else if (prev2.nodeType === Node.TEXT_NODE) {
        if (prev2.textContent !== next3.content)
          prev2.textContent = next3.content;
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
    if (innertText !== void 0)
      el.value = innertText;
  }
  const delegated = [];
  for (const attr of next2.attrs) {
    const name = attr[0];
    const value3 = attr[1];
    if (attr.as_property) {
      if (el[name] !== value3)
        el[name] = value3;
      if (canMorph)
        prevAttributes.delete(name);
    } else if (name.startsWith("on")) {
      const eventName = name.slice(2);
      const callback = dispatch(value3, eventName === "input");
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      if (canMorph)
        prevHandlers.delete(eventName);
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
      if (el.getAttribute(name) !== value3)
        el.setAttribute(name, value3);
      if (name === "value" || name === "selected")
        el[name] = value3;
      if (canMorph)
        prevAttributes.delete(name);
    }
  }
  if (className !== null) {
    el.setAttribute("class", className);
    if (canMorph)
      prevAttributes.delete("class");
  }
  if (style2 !== null) {
    el.setAttribute("style", style2);
    if (canMorph)
      prevAttributes.delete("style");
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
      if (key)
        keyedChildren.set(key, child);
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
    if (!is_browser())
      return new Error(new NotABrowser());
    const root = selector instanceof HTMLElement ? selector : document.querySelector(selector);
    if (!root)
      return new Error(new ElementNotFound(selector));
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
    this.#tickScheduled = window.requestAnimationFrame(
      () => this.#tick(effects.all.toArray(), true)
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
        this.#tickScheduled = window.cancelAnimationFrame(this.#tickScheduled);
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
        this.#tickScheduled = window.cancelAnimationFrame(this.#tickScheduled);
        this.#tick();
      } else if (!this.#tickScheduled) {
        this.#tickScheduled = window.requestAnimationFrame(() => this.#tick());
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
      this.#tickScheduled = window.cancelAnimationFrame(this.#tickScheduled);
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
      const select = () => {
      };
      const root = this.root;
      effect({ dispatch, emit: emit2, select, root });
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
        if (!decoder)
          continue;
        const msg = decoder(attr[1]);
        if (msg instanceof Error)
          continue;
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
      if (!handler)
        return;
      const msg = handler(action[1]);
      if (msg instanceof Error)
        return;
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
      const select = () => {
      };
      const root = null;
      effect({ dispatch, emit: emit2, select, root });
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

// build/dev/javascript/lustre/lustre/element/html.mjs
function text2(content) {
  return text(content);
}
function div(attrs, children2) {
  return element("div", attrs, children2);
}
function p(attrs, children2) {
  return element("p", attrs, children2);
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

// build/dev/javascript/lustre_http/lustre_http.mjs
var InternalServerError = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var NotFound = class extends CustomType {
};

// build/dev/javascript/modem/modem.ffi.mjs
var defaults = {
  handle_external_links: false,
  handle_internal_links: true
};
var initial_location = window?.location?.href;
var do_initial_uri = () => {
  if (!initial_location) {
    return new Error(void 0);
  } else {
    return new Ok(uri_from_url(new URL(initial_location)));
  }
};
var do_init = (dispatch, options = defaults) => {
  document.addEventListener("click", (event2) => {
    const a2 = find_anchor(event2.target);
    if (!a2)
      return;
    try {
      const url = new URL(a2.href);
      const uri = uri_from_url(url);
      const is_external = url.host !== window.location.host;
      if (!options.handle_external_links && is_external)
        return;
      if (!options.handle_internal_links && !is_external)
        return;
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

// build/dev/javascript/nibble/nibble/lexer.mjs
var Matcher = class extends CustomType {
  constructor(run3) {
    super();
    this.run = run3;
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
function custom2(f) {
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
function run(source, lexer2) {
  let _pipe = graphemes(source);
  let _pipe$1 = new State(_pipe, toList([]), [1, 1, ""], 1, 1);
  return ((_capture) => {
    return do_run(lexer2, void 0, _capture);
  })(_pipe$1);
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
  let parse3 = parser3[0];
  return parse3(state);
}
function next(state) {
  let $ = map_get(state.src, state.idx);
  if (!$.isOk()) {
    return [new None(), state];
  } else {
    let span$1 = $[0].span;
    let tok = $[0].value;
    return [
      new Some(tok),
      state.withFields({ idx: state.idx + 1, pos: span$1 })
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
function map6(parser3, f) {
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
function run2(src, parser3) {
  let src$1 = index_fold(
    src,
    new_map(),
    (dict, tok, idx) => {
      return insert(dict, idx, tok);
    }
  );
  let init4 = new State2(src$1, 0, new Span(1, 1, 1, 1), toList([]));
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
function one_of(parsers) {
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
function optional(parser3) {
  return one_of(
    toList([
      map6(parser3, (var0) => {
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
  let $ = compile_regex("^[0-9]+$", options);
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
    return regex_check(digits_regex, str);
  };
  return simple(
    toList([
      custom2(
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
var Text2 = class extends CustomType {
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
  if (token3 instanceof Text2) {
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
    (text3) => {
      return do$(
        take_while(is_text),
        (rest) => {
          let joined = (() => {
            let _pipe = map2(
              prepend(text3, rest),
              (entry) => {
                if (!(entry instanceof Text2)) {
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
            return concat2(_pipe);
          })();
          return return$(new Literal(joined));
        }
      );
    }
  );
}
function quoted_help(result) {
  return one_of(
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
            one_of(
              toList([
                (() => {
                  let _pipe = take_if("Expecting an Quote", is_quote);
                  return map6(_pipe, (_2) => {
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
  return fold(
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
  return one_of(
    toList([
      (() => {
        let _pipe = one_of(
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
  let alpha = (() => {
    let _pipe = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let _pipe$1 = graphemes(_pipe);
    return from_list2(_pipe$1);
  })();
  let is_alpha$1 = (char) => {
    return contains(alpha, char);
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
      custom2(
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
            return new Ok(new Text2(lexeme));
          }
        }
      )
    ])
  );
  let tokens_result = run(str, l);
  if (tokens_result.isOk()) {
    let tokens = tokens_result[0];
    let _pipe = run2(tokens, parser(toList([])));
    return unwrap2(_pipe, toList([new Literal(str)]));
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
    optional(token2(new Dash())),
    (negative) => {
      let negative$1 = (() => {
        let _pipe = negative;
        let _pipe$1 = map(_pipe, (_) => {
          return "-";
        });
        return unwrap(_pipe$1, "");
      })();
      return do$(
        (() => {
          let _pipe = parse_digit();
          return take_exactly(_pipe, 4);
        })(),
        (tokens) => {
          let str = (() => {
            let _pipe = map2(
              tokens,
              (token3) => {
                if (!(token3 instanceof Digit)) {
                  throw makeError(
                    "let_assert",
                    "rada/date",
                    1091,
                    "",
                    "Pattern match failed, no pattern matched the value.",
                    { value: token3 }
                  );
                }
                let str2 = token3[0];
                return str2;
              }
            );
            return concat2(_pipe);
          })();
          let $ = parse_int(negative$1 + str);
          if (!$.isOk()) {
            throw makeError(
              "let_assert",
              "rada/date",
              1096,
              "",
              "Pattern match failed, no pattern matched the value.",
              { value: $ }
            );
          }
          let int3 = $[0];
          return return$(int3);
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
      let str = (() => {
        let _pipe = map2(
          tokens,
          (token3) => {
            if (!(token3 instanceof Digit)) {
              throw makeError(
                "let_assert",
                "rada/date",
                1109,
                "",
                "Pattern match failed, no pattern matched the value.",
                { value: token3 }
              );
            }
            let str2 = token3[0];
            return str2;
          }
        );
        return concat2(_pipe);
      })();
      let $ = parse_int(str);
      if (!$.isOk()) {
        throw makeError(
          "let_assert",
          "rada/date",
          1114,
          "",
          "Pattern match failed, no pattern matched the value.",
          { value: $ }
        );
      }
      let int3 = $[0];
      return return$(int3);
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
      let str = (() => {
        let _pipe = map2(
          tokens,
          (token3) => {
            if (!(token3 instanceof Digit)) {
              throw makeError(
                "let_assert",
                "rada/date",
                1127,
                "",
                "Pattern match failed, no pattern matched the value.",
                { value: token3 }
              );
            }
            let str2 = token3[0];
            return str2;
          }
        );
        return concat2(_pipe);
      })();
      let $ = parse_int(str);
      if (!$.isOk()) {
        throw makeError(
          "let_assert",
          "rada/date",
          1132,
          "",
          "Pattern match failed, no pattern matched the value.",
          { value: $ }
        );
      }
      let int3 = $[0];
      return return$(int3);
    }
  );
}
function parse_month_and_day(extended) {
  return do$(
    int_2(),
    (month2) => {
      let dash_count = to_int(extended);
      return do$(
        one_of(
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
          1143,
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
          1145,
          "",
          "Pattern match failed, no pattern matched the value.",
          { value: $ }
        );
      }
      let int3 = $[0];
      return return$(int3);
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
          let dash_count = to_int(extended);
          return do$(
            one_of(
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
  return one_of(
    toList([
      (() => {
        let _pipe = token2(new Dash());
        return then$3(
          _pipe,
          (_) => {
            return one_of(
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
  let prefix = (() => {
    let $ = value3 < 0;
    if ($) {
      return "-";
    } else {
      return "";
    }
  })();
  let suffix = (() => {
    let _pipe = value3;
    let _pipe$1 = absolute_value(_pipe);
    let _pipe$2 = to_string(_pipe$1);
    return pad_left(_pipe$2, length4, "0");
  })();
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
  let value$1 = (() => {
    let $2 = value_mod_100 < 20;
    if ($2) {
      return value_mod_100;
    } else {
      return modulo_unwrap(value_mod_100, 10);
    }
  })();
  let $ = min(value$1, 4);
  if ($ === 1) {
    return "st";
  } else if ($ === 2) {
    return "nd";
  } else if ($ === 3) {
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
function days_before_month(year2, month2) {
  let leap_days = to_int(is_leap_year(year2));
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
  let n = (() => {
    let $4 = r1 === 0;
    if ($4) {
      return 0;
    } else {
      return 1;
    }
  })();
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
        let _pipe$3 = pad_left(_pipe$2, 2, "0");
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
        let _pipe$3 = pad_left(_pipe$2, 2, "0");
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
        return pad_left(_pipe$2, 2, "0");
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
        return pad_left(_pipe$2, 2, "0");
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
        return pad_left(_pipe$2, 2, "0");
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
        return pad_left(_pipe$2, 2, "0");
      } else if (length4 === 3) {
        let _pipe = date;
        let _pipe$1 = ordinal_day(_pipe);
        let _pipe$2 = to_string(_pipe$1);
        return pad_left(_pipe$2, 3, "0");
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
  return fold(
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
  let tokens = (() => {
    let _pipe = pattern_text;
    let _pipe$1 = from_string2(_pipe);
    return reverse(_pipe$1);
  })();
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
function diff2(unit, date1, date2) {
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
  let days_in_year = (() => {
    let $2 = is_leap_year(year2);
    if ($2) {
      return 366;
    } else {
      return 365;
    }
  })();
  let $ = !is_between_int(ordinal, 1, days_in_year);
  if ($) {
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
function from_week_parts(week_year2, week_number2, weekday_number2) {
  let weeks_in_year = (() => {
    let $2 = is_53_week_year(week_year2);
    if ($2) {
      return 53;
    } else {
      return 52;
    }
  })();
  let $ = is_between_int(week_number2, 1, weeks_in_year);
  let $1 = is_between_int(weekday_number2, 1, 7);
  if (!$) {
    return new Error(
      "Invalid week date: " + ("week " + to_string(week_number2) + " is out of range") + (" (1 to " + to_string(
        weeks_in_year
      ) + ")") + (" for " + to_string(week_year2)) + ("; received (year " + to_string(
        week_year2
      ) + ", week " + to_string(week_number2) + ", weekday " + to_string(
        weekday_number2
      ) + ")")
    );
  } else if ($ && !$1) {
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
  let $ = run(str, lexer());
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "rada/date",
      950,
      "from_iso_string",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  let tokens = $[0];
  let result = run2(
    tokens,
    (() => {
      let _pipe = parser2();
      return then$3(
        _pipe,
        (val) => {
          return one_of(
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
function is_between(value3, lower, upper) {
  let value_rd = value3[0];
  let lower_rd = lower[0];
  let upper_rd = upper[0];
  return is_between_int(value_rd, lower_rd, upper_rd);
}

// build/dev/javascript/budget_fe/date_utils.mjs
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
function days_in_month2(year2, month2) {
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

// build/dev/javascript/budget_fe/budget_fe.mjs
var Home = class extends CustomType {
};
var TransactionsRoute = class extends CustomType {
};
var UserRoute = class extends CustomType {
};
var OnRouteChange = class extends CustomType {
  constructor(route) {
    super();
    this.route = route;
  }
};
var Initial = class extends CustomType {
  constructor(user, cycle, initial_route) {
    super();
    this.user = user;
    this.cycle = cycle;
    this.initial_route = initial_route;
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
var SelectUser = class extends CustomType {
  constructor(u) {
    super();
    this.u = u;
  }
};
var ShowAddCategoryUI = class extends CustomType {
};
var UserUpdatedCategoryName = class extends CustomType {
  constructor(cat_name) {
    super();
    this.cat_name = cat_name;
  }
};
var AddCategory = class extends CustomType {
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
var AddTransactionResult = class extends CustomType {
  constructor(c) {
    super();
    this.c = c;
  }
};
var EditTarget = class extends CustomType {
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
  constructor(alloc_id) {
    super();
    this.alloc_id = alloc_id;
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
var Model2 = class extends CustomType {
  constructor(user, cycle, route, cycle_end_day, show_all_transactions, categories2, transactions2, allocations2, selected_category, show_add_category_ui, user_category_name_input, transaction_add_input, target_edit, selected_transaction, transaction_edit_form) {
    super();
    this.user = user;
    this.cycle = cycle;
    this.route = route;
    this.cycle_end_day = cycle_end_day;
    this.show_all_transactions = show_all_transactions;
    this.categories = categories2;
    this.transactions = transactions2;
    this.allocations = allocations2;
    this.selected_category = selected_category;
    this.show_add_category_ui = show_add_category_ui;
    this.user_category_name_input = user_category_name_input;
    this.transaction_add_input = transaction_add_input;
    this.target_edit = target_edit;
    this.selected_transaction = selected_transaction;
    this.transaction_edit_form = transaction_edit_form;
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
  constructor(date, payee, category, amount) {
    super();
    this.date = date;
    this.payee = payee;
    this.category = category;
    this.amount = amount;
  }
};
var ShiftLeft = class extends CustomType {
};
var ShiftRight = class extends CustomType {
};
var TransactionEditForm = class extends CustomType {
  constructor(id2, date, payee, category, amount) {
    super();
    this.id = id2;
    this.date = date;
    this.payee = payee;
    this.category = category;
    this.amount = amount;
  }
};
var TargetEdit = class extends CustomType {
  constructor(cat_id, enabled, target) {
    super();
    this.cat_id = cat_id;
    this.enabled = enabled;
    this.target = target;
  }
};
var Cycle = class extends CustomType {
  constructor(year2, month2) {
    super();
    this.year = year2;
    this.month = month2;
  }
};
var User = class extends CustomType {
  constructor(id2, name) {
    super();
    this.id = id2;
    this.name = name;
  }
};
var Category = class extends CustomType {
  constructor(id2, name, target) {
    super();
    this.id = id2;
    this.name = name;
    this.target = target;
  }
};
var Money = class extends CustomType {
  constructor(s, b) {
    super();
    this.s = s;
    this.b = b;
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
var Transaction = class extends CustomType {
  constructor(id2, date, payee, category_id, value3) {
    super();
    this.id = id2;
    this.date = date;
    this.payee = payee;
    this.category_id = category_id;
    this.value = value3;
  }
};
var AllocationEffectResult = class extends CustomType {
  constructor(alloc, is_created) {
    super();
    this.alloc = alloc;
    this.is_created = is_created;
  }
};
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
function delete_category_eff(c_id) {
  return from(
    (dispatch) => {
      return dispatch(new CategoryDeleteResult(new Ok(c_id)));
    }
  );
}
function string_to_money(s) {
  let $ = (() => {
    let _pipe = split2(s, ".");
    return map2(
      _pipe,
      (s2) => {
        let _pipe$1 = parse_int(s2);
        return unwrap2(_pipe$1, 0);
      }
    );
  })();
  if ($.atLeastLength(2)) {
    let s$1 = $.head;
    let b = $.tail.head;
    return new Money(s$1, b);
  } else {
    return new Money(0, 0);
  }
}
function update_transaction_eff(tef, categories2) {
  let money = string_to_money(tef.amount);
  return from(
    (dispatch) => {
      return dispatch(
        new TransactionEditResult(
          new Ok(
            new Transaction(
              tef.id,
              (() => {
                let _pipe = tef.date;
                let _pipe$1 = from_date_string(_pipe);
                return unwrap2(_pipe$1, today());
              })(),
              tef.payee,
              (() => {
                let _pipe = categories2;
                let _pipe$1 = find_map(
                  _pipe,
                  (c) => {
                    let $ = c.name === tef.category;
                    if ($) {
                      return new Ok(c.id);
                    } else {
                      return new Error("");
                    }
                  }
                );
                return unwrap2(_pipe$1, "");
              })(),
              money
            )
          )
        )
      );
    }
  );
}
function delete_transaction_eff(t_id) {
  return from(
    (dispatch) => {
      return dispatch(new TransactionDeleteResult(new Ok(t_id)));
    }
  );
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
function save_target_eff(category, target_edit) {
  return from(
    (dispatch) => {
      return dispatch(
        new CategorySaveTarget(
          new Ok(category.withFields({ target: target_edit }))
        )
      );
    }
  );
}
function delete_target_eff(category) {
  return from(
    (dispatch) => {
      return dispatch(
        new CategorySaveTarget(
          new Ok(category.withFields({ target: new None() }))
        )
      );
    }
  );
}
function uri_to_route(uri) {
  let $ = path_segments(uri.path);
  if ($.hasLength(1) && $.head === "transactions") {
    return new TransactionsRoute();
  } else if ($.hasLength(1) && $.head === "user") {
    return new UserRoute();
  } else {
    return new Home();
  }
}
function on_route_change(uri) {
  let route = uri_to_route(uri);
  return new OnRouteChange(route);
}
function initial_eff() {
  let today2 = today();
  let cycle = new Cycle(
    year(today2),
    (() => {
      let _pipe = today2;
      return month(_pipe);
    })()
  );
  let path = (() => {
    let $ = do_initial_uri();
    if ($.isOk()) {
      let uri = $[0];
      return uri_to_route(uri);
    } else {
      return new Home();
    }
  })();
  return from(
    (dispatch) => {
      return dispatch(new Initial(new User("id2", "Sergey"), cycle, path));
    }
  );
}
function init3(_) {
  let today2 = today();
  let cycle = new Cycle(
    year(today2),
    (() => {
      let _pipe = today2;
      return month(_pipe);
    })()
  );
  return [
    new Model2(
      new User("id1", "Sergey"),
      cycle,
      new Home(),
      new Some(26),
      false,
      toList([]),
      toList([]),
      toList([]),
      new None(),
      false,
      "",
      new TransactionForm("", "", new None(), new None()),
      new TargetEdit("", false, new Monthly(new Money(0, 0))),
      new None(),
      new None()
    ),
    batch(toList([init2(on_route_change), initial_eff()]))
  ];
}
function add_transaction_eff(transaction_form) {
  return from(
    (dispatch) => {
      return dispatch(
        (() => {
          let $ = transaction_form.category;
          let $1 = transaction_form.amount;
          if ($ instanceof Some && $1 instanceof Some) {
            let cat = $[0];
            let amount = $1[0];
            return new AddTransactionResult(
              new Ok(
                new Transaction(
                  guidv4(),
                  (() => {
                    let _pipe = transaction_form.date;
                    let _pipe$1 = from_date_string(_pipe);
                    return unwrap2(_pipe$1, today());
                  })(),
                  transaction_form.payee,
                  cat.id,
                  amount
                )
              )
            );
          } else {
            return new AddTransactionResult(
              new Error(new InternalServerError("parse error"))
            );
          }
        })()
      );
    }
  );
}
function add_category(name) {
  return from(
    (dispatch) => {
      return dispatch(
        new AddCategoryResult(
          new Ok(new Category(guidv4(), name, new None()))
        )
      );
    }
  );
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
function cycle_to_text(c) {
  return (() => {
    let _pipe = c.month;
    return month_to_name2(_pipe);
  })() + " " + (() => {
    let _pipe = c.year;
    return to_string(_pipe);
  })();
}
function user_selection(m) {
  let $ = (() => {
    let $1 = m.user;
    if ($1 instanceof User && $1.id === "id1") {
      return ["active", ""];
    } else {
      return ["", "active"];
    }
  })();
  let serg_active_class = $[0];
  let kate_active_class = $[1];
  return div(
    toList([class$("d-flex flex-row")]),
    toList([
      div(
        toList([class$("btn-group")]),
        toList([
          a(
            toList([
              class$("btn btn-primary" + serg_active_class),
              href("#"),
              on_click(new SelectUser(new User("id1", "Sergey")))
            ]),
            toList([text2("Sergey")])
          ),
          a(
            toList([
              class$("btn btn-primary" + kate_active_class),
              href("#"),
              on_click(new SelectUser(new User("id2", "Kate")))
            ]),
            toList([text2("Ekaterina")])
          )
        ])
      )
    ])
  );
}
function target_switcher_ui(et) {
  let $ = (() => {
    let $1 = et.target;
    if ($1 instanceof Custom) {
      return ["", "active"];
    } else {
      return ["active", ""];
    }
  })();
  let monthly = $[0];
  let custom3 = $[1];
  return div(
    toList([
      attribute("aria-label", "Basic example"),
      role("group"),
      class$("btn-group")
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
  let today2 = today();
  let final_date = from_calendar_date(
    date.year,
    number_to_month(date.month),
    28
  );
  let months_count = diff2(new Months(), today2, final_date) + 1;
  return new Money(divideInt(m.s, months_count), divideInt(m.b, months_count));
}
function target_money(category) {
  let $ = category.target;
  if ($ instanceof None) {
    return new Money(0, 0);
  } else if ($ instanceof Some && $[0] instanceof Custom) {
    let amount = $[0].target;
    let date_till = $[0].date;
    return custom_target_money_in_month(amount, date_till);
  } else {
    let amount = $[0].target;
    return amount;
  }
}
function manage_transaction_buttons(t, selected_id, category_name, is_edit) {
  let $ = selected_id === t.id;
  if (!$) {
    return text2("");
  } else {
    return div(
      toList([]),
      toList([
        (() => {
          if (is_edit) {
            return button(
              toList([on_click(new UpdateTransaction())]),
              toList([text("Save")])
            );
          } else {
            return button(
              toList([on_click(new EditTransaction(t, category_name))]),
              toList([text("Edit")])
            );
          }
        })(),
        button(
          toList([on_click(new DeleteTransaction(t.id))]),
          toList([text("Delete")])
        )
      ])
    );
  }
}
function transaction_category_name(t, cats) {
  let category_name = (() => {
    let $ = find(cats, (c) => {
      return c.id === t.category_id;
    });
    if ($.isOk()) {
      let c = $[0];
      return c.name;
    } else {
      return "not found";
    }
  })();
  return category_name;
}
function transaction_amount(t) {
  return (() => {
    let _pipe = t.value.s;
    return to_string(_pipe);
  })() + "." + (() => {
    let _pipe = t.value.b;
    return to_string(_pipe);
  })();
}
function transaction_list_item(t, model) {
  let selected_id = (() => {
    let _pipe = model.selected_transaction;
    return unwrap(_pipe, "");
  })();
  let active_class = (() => {
    let $2 = selected_id === t.id;
    if ($2) {
      return "table-active";
    } else {
      return "";
    }
  })();
  let transaction_edit_id = (() => {
    let _pipe = model.transaction_edit_form;
    let _pipe$1 = map(_pipe, (tef) => {
      return tef.id;
    });
    return unwrap(_pipe$1, "-1");
  })();
  let is_edit_mode = transaction_edit_id === t.id;
  let category_name = transaction_category_name(t, model.categories);
  let $ = model.transaction_edit_form;
  if (is_edit_mode && $ instanceof Some) {
    let tef = $[0];
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
                let _pipe$1 = map2(_pipe, (t2) => {
                  return t2.payee;
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
                value(tef.category),
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
                style(toList([["width", "160px"]]))
              ])
            ),
            manage_transaction_buttons(t, selected_id, category_name, true)
          ])
        )
      ])
    );
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
            text2(transaction_amount(t)),
            manage_transaction_buttons(t, selected_id, category_name, false)
          ])
        )
      ])
    );
  }
}
function add_transaction_ui(transactions2, categories2) {
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
              type_("date")
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
              attribute("list", "payees_list")
            ])
          ),
          datalist(
            toList([id("payees_list")]),
            (() => {
              let _pipe = transactions2;
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
                  return new UserUpdatedTransactionCategory(var0);
                }
              ),
              placeholder("category"),
              id("addTransactionCategoryId"),
              class$("form-control"),
              type_("text"),
              attribute("list", "categories_list")
            ])
          ),
          datalist(
            toList([id("categories_list")]),
            (() => {
              let _pipe = categories2;
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
              style(toList([["width", "120px"]]))
            ])
          ),
          button(
            toList([on_click(new AddTransaction())]),
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
      div(
        toList([class$("form-check")]),
        toList([
          input(
            toList([
              id("flexCheckDefault"),
              value(""),
              type_("checkbox"),
              class$("form-check-input"),
              checked(model.show_all_transactions)
            ])
          ),
          label(
            toList([
              for$("flexCheckDefault"),
              class$("form-check-label")
            ]),
            toList([text2("Show all transactions")])
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
                  add_transaction_ui(model.transactions, model.categories)
                ]),
                map2(
                  model.transactions,
                  (t) => {
                    return transaction_list_item(t, model);
                  }
                )
              ])
            )
          )
        ])
      )
    ])
  );
}
function prepend4(body, prefix) {
  return prefix + body;
}
function money_to_string_no_sign(m) {
  return (() => {
    let _pipe = m.s;
    return to_string(_pipe);
  })() + "." + (() => {
    let _pipe = m.b;
    return to_string(_pipe);
  })();
}
function money_to_string(m) {
  return "\u20AC" + money_to_string_no_sign(m);
}
function money_sum(a2, b) {
  let base_sum = a2.b + b.b;
  let $ = (() => {
    let $1 = base_sum >= 100;
    if ($1) {
      return [1, remainderInt(base_sum, 100)];
    } else {
      return [0, base_sum];
    }
  })();
  let euro = $[0];
  let base = $[1];
  return new Money(a2.s + b.s + euro, base);
}
function category_activity(cat, transactions2) {
  let _pipe = transactions2;
  let _pipe$1 = filter(_pipe, (t) => {
    return t.category_id === cat.id;
  });
  return fold(
    _pipe$1,
    new Money(0, 0),
    (m, t) => {
      return money_sum(m, t.value);
    }
  );
}
function category_target(cat, model) {
  let target_money$1 = target_money(cat);
  let activity = category_activity(cat, model.transactions);
  let _pipe = money_sum(target_money$1, activity);
  return money_to_string(_pipe);
}
function budget_categories(model) {
  let size = (() => {
    let $ = model.selected_category;
    if ($ instanceof None) {
      return "";
    } else {
      return "w-75";
    }
  })();
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
                  text2("Category"),
                  (() => {
                    let btn_label = (() => {
                      let $ = model.show_add_category_ui;
                      if ($) {
                        return "-";
                      } else {
                        return "+";
                      }
                    })();
                    return button(
                      toList([on_click(new ShowAddCategoryUI())]),
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
          let cats_ui = map2(
            model.categories,
            (c) => {
              let active_class = (() => {
                let $ = model.selected_category;
                if ($ instanceof None) {
                  return "";
                } else {
                  let selected_cat = $[0];
                  let $1 = selected_cat.id === c.id;
                  if ($1) {
                    return "table-active";
                  } else {
                    return "";
                  }
                }
              })();
              return tr(
                toList([
                  on_click(new SelectCategory(c)),
                  class$(active_class)
                ]),
                toList([
                  td(toList([]), toList([text2(c.name)])),
                  td(
                    toList([]),
                    toList([text2(category_target(c, model))])
                  )
                ])
              );
            }
          );
          let add_cat_ui = (() => {
            let $ = model.show_add_category_ui;
            if (!$) {
              return toList([]);
            } else {
              return toList([
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
                                return new UserUpdatedCategoryName(var0);
                              }
                            ),
                            placeholder("category name"),
                            id("exampleFormControlInput1"),
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
                          toList([on_click(new AddCategory())]),
                          toList([text("Add")])
                        )
                      ])
                    )
                  ])
                )
              ]);
            }
          })();
          return flatten2(toList([add_cat_ui, cats_ui]));
        })()
      )
    ])
  );
}
function money_minus(a2, b) {
  let base_sum = a2.b - b.b;
  let $ = (() => {
    let $1 = base_sum < 0;
    if ($1) {
      return [1, 100 + base_sum];
    } else {
      return [0, base_sum];
    }
  })();
  let euro = $[0];
  let base = $[1];
  return new Money(a2.s - b.s - euro, base);
}
function ready_to_assign(transactions2, allocations2, cycle) {
  let income = (() => {
    let _pipe2 = transactions2;
    let _pipe$1 = filter(_pipe2, (t) => {
      return t.category_id === "0";
    });
    return fold(
      _pipe$1,
      new Money(0, 0),
      (m, t) => {
        return money_sum(m, t.value);
      }
    );
  })();
  let outcome = (() => {
    let _pipe2 = allocations2;
    let _pipe$1 = filter_map(
      _pipe2,
      (a2) => {
        let $ = isEqual(a2.date, cycle);
        if ($) {
          return new Ok(a2.amount);
        } else {
          return new Error("");
        }
      }
    );
    return fold(
      _pipe$1,
      new Money(0, 0),
      (m, t) => {
        return money_sum(m, t);
      }
    );
  })();
  let _pipe = money_minus(income, outcome);
  return money_to_string_no_sign(_pipe);
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
function category_target_ui(c, et) {
  let $ = et.cat_id;
  let $1 = et.enabled;
  if ($1) {
    return div(
      toList([class$("col")]),
      toList([
        div(
          toList([]),
          toList([
            text2("Target"),
            button(
              toList([on_click(new SaveTarget(c))]),
              toList([text("Save")])
            ),
            button(
              toList([on_click(new DeleteTarget(c))]),
              toList([text("Delete")])
            )
          ])
        ),
        target_switcher_ui(et),
        (() => {
          let $2 = et.target;
          if ($2 instanceof Custom) {
            return div(
              toList([]),
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
                    style(toList([["width", "120px"]]))
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
                    class$("form-control"),
                    type_("date")
                  ])
                )
              ])
            );
          } else {
            return div(
              toList([]),
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
                    style(toList([["width", "120px"]]))
                  ])
                )
              ])
            );
          }
        })()
      ])
    );
  } else {
    return div(
      toList([class$("col")]),
      toList([
        div(
          toList([]),
          toList([
            text2("Target"),
            button(
              toList([on_click(new EditTarget(c))]),
              toList([text("Edit")])
            )
          ])
        ),
        div(toList([]), toList([text2(target_string(c))]))
      ])
    );
  }
}
function category_details(category, model, sc, allocation) {
  return div(
    toList([class$("col")]),
    toList([
      div(
        toList([]),
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
              style(toList([["width", "90px"]])),
              value(sc.input_name)
            ])
          ),
          button(
            toList([on_click(new UpdateCategoryName(category))]),
            toList([text("Update")])
          ),
          button(
            toList([on_click(new DeleteCategory())]),
            toList([text("Delete")])
          )
        ])
      ),
      div(
        toList([class$("row")]),
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
                        category,
                        model.transactions
                      );
                      let _pipe$1 = money_to_string(_pipe);
                      return prepend4(_pipe$1, "-");
                    })()
                  )
                ])
              )
            ])
          )
        ])
      ),
      category_target_ui(category, model.target_edit),
      div(
        toList([]),
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
              on_click(
                new SaveAllocation(
                  (() => {
                    let _pipe = allocation;
                    return map(_pipe, (a2) => {
                      return a2.id;
                    });
                  })()
                )
              )
            ]),
            toList([text("Save")])
          )
        ])
      )
    ])
  );
}
function view(model) {
  return div(
    toList([class$("container-fluid")]),
    toList([
      div(
        toList([class$("col")]),
        toList([
          div(
            toList([class$("d-flex flex-row")]),
            toList([
              div(
                toList([class$("btn-group")]),
                toList([
                  a(
                    toList([
                      attribute("aria-current", "page"),
                      class$("btn btn-primary active"),
                      href("/")
                    ]),
                    toList([text2("Budget")])
                  ),
                  a(
                    toList([
                      class$("btn btn-primary"),
                      href("/transactions")
                    ]),
                    toList([text2("Transactions")])
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  button(
                    toList([on_click(new CycleShift(new ShiftLeft()))]),
                    toList([text("<")])
                  ),
                  p(
                    toList([class$("text-start fs-4")]),
                    toList([
                      text(
                        (() => {
                          let _pipe = model.cycle;
                          return cycle_to_text(_pipe);
                        })()
                      )
                    ])
                  ),
                  button(
                    toList([on_click(new CycleShift(new ShiftRight()))]),
                    toList([text(">")])
                  )
                ])
              ),
              div(
                toList([
                  class$("bg-success text-white"),
                  style(toList([["width", "120px"]]))
                ]),
                toList([
                  p(
                    toList([class$("text-start fs-4")]),
                    toList([
                      text(
                        ready_to_assign(
                          model.transactions,
                          model.allocations,
                          model.cycle
                        )
                      )
                    ])
                  ),
                  p(
                    toList([class$("text-start")]),
                    toList([text("Ready to Assign")])
                  )
                ])
              ),
              div(
                toList([
                  class$("bg-info ms-auto text-white"),
                  style(toList([["width", "120px"]]))
                ]),
                toList([
                  a(
                    toList([class$(""), href("/user")]),
                    toList([text2(model.user.name)])
                  )
                ])
              )
            ])
          ),
          div(
            toList([class$("d-flex flex-row")]),
            toList([
              (() => {
                let $ = model.route;
                if ($ instanceof Home) {
                  return budget_categories(model);
                } else if ($ instanceof TransactionsRoute) {
                  return budget_transactions(model);
                } else {
                  return user_selection(model);
                }
              })(),
              div(
                toList([]),
                toList([
                  (() => {
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
                        (() => {
                          let _pipe = model.allocations;
                          let _pipe$1 = find(
                            _pipe,
                            (a2) => {
                              return a2.id === c.id;
                            }
                          );
                          return from_result(_pipe$1);
                        })()
                      );
                    } else {
                      return text2("");
                    }
                  })()
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function allocations(cycle) {
  let c = new Cycle(2024, new Dec());
  let _pipe = toList([
    new Allocation("1", new Money(80, 0), "1", c),
    new Allocation("2", new Money(120, 0), "2", c),
    new Allocation("3", new Money(150, 0), "3", c),
    new Allocation("4", new Money(100, 2), "4", c),
    new Allocation("5", new Money(200, 2), "5", c),
    new Allocation("6", new Money(500, 2), "6", c)
  ]);
  return filter(_pipe, (a2) => {
    return isEqual(a2.date, cycle);
  });
}
function find_alloc_by_id(id2, cycle) {
  let _pipe = allocations(cycle);
  return find(_pipe, (a2) => {
    return a2.id === id2;
  });
}
function save_allocation_eff(alloc_id, allocation, category_id, cycle) {
  let money = (() => {
    let _pipe = allocation;
    return string_to_money(_pipe);
  })();
  if (alloc_id instanceof Some) {
    let id2 = alloc_id[0];
    let alloc = find_alloc_by_id(id2, cycle);
    return from(
      (dispatch) => {
        return dispatch(
          (() => {
            if (alloc.isOk()) {
              let alloc_entity = alloc[0];
              return new SaveAllocationResult(
                new Ok(
                  new AllocationEffectResult(
                    alloc_entity.withFields({ amount: money }),
                    false
                  )
                )
              );
            } else {
              return new SaveAllocationResult(
                new Error(new NotFound())
              );
            }
          })()
        );
      }
    );
  } else {
    return from(
      (dispatch) => {
        return dispatch(
          new SaveAllocationResult(
            new Ok(
              new AllocationEffectResult(
                new Allocation(guidv4(), money, category_id, cycle),
                true
              )
            )
          )
        );
      }
    );
  }
}
function find_alloc_by_cat_id(cat_id, cycle) {
  let _pipe = allocations(cycle);
  return find(
    _pipe,
    (a2) => {
      return a2.category_id === cat_id && isEqual(a2.date, cycle);
    }
  );
}
function get_allocations(cycle) {
  return from(
    (dispatch) => {
      return dispatch(new Allocations(new Ok(allocations(cycle))));
    }
  );
}
function categories() {
  return toList([
    new Category(
      "1",
      "Subscriptions",
      new Some(new Monthly(new Money(60, 0)))
    ),
    new Category(
      "2",
      "Shopping",
      new Some(new Monthly(new Money(40, 0)))
    ),
    new Category(
      "3",
      "Goals",
      new Some(new Custom(new Money(150, 0), new MonthInYear(2, 2025)))
    ),
    new Category(
      "4",
      "Vacation",
      new Some(new Monthly(new Money(100, 0)))
    ),
    new Category(
      "5",
      "Entertainment",
      new Some(new Monthly(new Money(200, 0)))
    ),
    new Category(
      "6",
      "Groceries",
      new Some(new Monthly(new Money(500, 0)))
    )
  ]);
}
function get_categories() {
  return from(
    (dispatch) => {
      return dispatch(new Categories(new Ok(categories())));
    }
  );
}
function transactions() {
  return toList([
    new Transaction(
      "1",
      from_calendar_date(2025, new Jan(), 1),
      "Amazon",
      "5",
      new Money(-10, 0)
    ),
    new Transaction(
      "1",
      from_calendar_date(2024, new Dec(), 2),
      "Amazon",
      "5",
      new Money(-50, 0)
    ),
    new Transaction(
      "2",
      from_calendar_date(2024, new Dec(), 2),
      "Bauhaus",
      "5",
      new Money(-50, 0)
    ),
    new Transaction(
      "3",
      from_calendar_date(2024, new Dec(), 2),
      "Rewe",
      "6",
      new Money(-50, 0)
    ),
    new Transaction(
      "4",
      from_calendar_date(2024, new Dec(), 2),
      "Vodafone",
      "1",
      new Money(-50, 0)
    ),
    new Transaction(
      "5",
      from_calendar_date(2024, new Dec(), 2),
      "Steam",
      "5",
      new Money(-50, 0)
    ),
    new Transaction(
      "6",
      from_calendar_date(2024, new Dec(), 2),
      "Duo",
      "1",
      new Money(-50, 60)
    ),
    new Transaction(
      "7",
      from_calendar_date(2024, new Dec(), 2),
      "O2",
      "1",
      new Money(-50, 0)
    ),
    new Transaction(
      "8",
      from_calendar_date(2024, new Dec(), 2),
      "Trade Republic",
      "0",
      new Money(1e3, 0)
    ),
    new Transaction(
      "8",
      from_calendar_date(2024, new Nov(), 27),
      "O2",
      "1",
      new Money(-1, 50)
    ),
    new Transaction(
      "8",
      from_calendar_date(2024, new Nov(), 26),
      "O2",
      "1",
      new Money(-1, 50)
    )
  ]);
}
function get_transactions(start3, end) {
  return from(
    (dispatch) => {
      return dispatch(
        new Transactions(
          new Ok(
            (() => {
              let _pipe = transactions();
              return filter(
                _pipe,
                (t) => {
                  return is_between(t.date, start3, end);
                }
              );
            })()
          )
        )
      );
    }
  );
}
function update(model, msg) {
  debug(msg);
  if (msg instanceof OnRouteChange) {
    let route = msg.route;
    return [model.withFields({ route }), none()];
  } else if (msg instanceof Initial) {
    let user = msg.user;
    let cycle = msg.cycle;
    let initial_path = msg.initial_route;
    let $ = cycle_bounds(cycle, model.cycle_end_day);
    let start3 = $[0];
    let end = $[1];
    return [
      model.withFields({ user, cycle, route: initial_path }),
      batch(
        toList([
          get_categories(),
          get_transactions(start3, end),
          get_allocations(cycle)
        ])
      )
    ];
  } else if (msg instanceof Categories && msg.cats.isOk()) {
    let cats = msg.cats[0];
    let $ = cycle_bounds(model.cycle, model.cycle_end_day);
    let start3 = $[0];
    let end = $[1];
    return [
      model.withFields({ categories: cats }),
      get_transactions(start3, end)
    ];
  } else if (msg instanceof Categories && !msg.cats.isOk()) {
    return [model, none()];
  } else if (msg instanceof Transactions && msg.trans.isOk()) {
    let t = msg.trans[0];
    return [model.withFields({ transactions: t }), none()];
  } else if (msg instanceof Transactions && !msg.trans.isOk()) {
    return [model, none()];
  } else if (msg instanceof Allocations && msg.a.isOk()) {
    let a2 = msg.a[0];
    return [model.withFields({ allocations: a2 }), none()];
  } else if (msg instanceof Allocations && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof SelectCategory) {
    let c = msg.c;
    return [
      model.withFields({
        selected_category: new Some(
          new SelectedCategory(
            c.id,
            c.name,
            (() => {
              let _pipe = find_alloc_by_cat_id(c.id, model.cycle);
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
        )
      }),
      none()
    ];
  } else if (msg instanceof SelectUser) {
    let user = msg.u;
    return [model.withFields({ user }), none()];
  } else if (msg instanceof ShowAddCategoryUI) {
    return [
      model.withFields({ show_add_category_ui: !model.show_add_category_ui }),
      none()
    ];
  } else if (msg instanceof AddCategory) {
    return [
      model.withFields({ user_category_name_input: "" }),
      add_category(model.user_category_name_input)
    ];
  } else if (msg instanceof UserUpdatedCategoryName) {
    let name = msg.cat_name;
    return [
      model.withFields({ user_category_name_input: name }),
      none()
    ];
  } else if (msg instanceof AddCategoryResult && msg.c.isOk()) {
    let c = msg.c[0];
    return [
      model.withFields({
        categories: flatten2(toList([model.categories, toList([c])]))
      }),
      none()
    ];
  } else if (msg instanceof AddCategoryResult && !msg.c.isOk()) {
    return [model, none()];
  } else if (msg instanceof AddTransaction) {
    return [
      model.withFields({
        transaction_add_input: new TransactionForm(
          "",
          "",
          new None(),
          new None()
        )
      }),
      add_transaction_eff(model.transaction_add_input)
    ];
  } else if (msg instanceof AddTransactionResult && msg.c.isOk()) {
    let t = msg.c[0];
    return [
      model.withFields({
        transactions: flatten2(toList([model.transactions, toList([t])]))
      }),
      none()
    ];
  } else if (msg instanceof AddTransactionResult && !msg.c.isOk()) {
    return [model, none()];
  } else if (msg instanceof UserUpdatedTransactionCategory) {
    let category_name = msg.cat;
    return [
      model.withFields({
        transaction_add_input: model.transaction_add_input.withFields({
          category: (() => {
            let _pipe = model.categories;
            let _pipe$1 = find(
              _pipe,
              (c) => {
                return c.name === category_name;
              }
            );
            return from_result(_pipe$1);
          })()
        })
      }),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionDate) {
    let date = msg.date;
    return [
      model.withFields({
        transaction_add_input: model.transaction_add_input.withFields({
          date
        })
      }),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionPayee) {
    let payee = msg.payee;
    return [
      model.withFields({
        transaction_add_input: model.transaction_add_input.withFields({
          payee
        })
      }),
      none()
    ];
  } else if (msg instanceof UserUpdatedTransactionAmount) {
    let amount = msg.amount;
    return [
      model.withFields({
        transaction_add_input: model.transaction_add_input.withFields({
          amount: (() => {
            let _pipe = parse_int(amount);
            let _pipe$1 = map3(
              _pipe,
              (amount2) => {
                return new Money(amount2, 0);
              }
            );
            return from_result(_pipe$1);
          })()
        })
      }),
      none()
    ];
  } else if (msg instanceof EditTarget) {
    return [
      model.withFields({
        target_edit: model.target_edit.withFields({ enabled: true })
      }),
      none()
    ];
  } else if (msg instanceof SaveTarget) {
    let c = msg.c;
    return [
      model.withFields({
        target_edit: model.target_edit.withFields({ enabled: false })
      }),
      save_target_eff(
        c,
        (() => {
          let _pipe = model.target_edit.target;
          return new Some(_pipe);
        })()
      )
    ];
  } else if (msg instanceof DeleteTarget) {
    let c = msg.c;
    return [
      model.withFields({
        target_edit: model.target_edit.withFields({ enabled: false })
      }),
      delete_target_eff(c)
    ];
  } else if (msg instanceof UserTargetUpdateAmount) {
    let amount = msg.amount;
    let amount$1 = (() => {
      let _pipe = amount;
      let _pipe$1 = parse_int(_pipe);
      return unwrap2(_pipe$1, 0);
    })();
    let target = (() => {
      let $ = model.target_edit.target;
      if ($ instanceof Custom) {
        let date = $.date;
        return new Custom(new Money(amount$1, 0), date);
      } else {
        return new Monthly(new Money(amount$1, 0));
      }
    })();
    return [
      model.withFields({
        target_edit: model.target_edit.withFields({ target })
      }),
      none()
    ];
  } else if (msg instanceof EditTargetCadence) {
    let is_monthly = msg.is_monthly;
    let target = (() => {
      let $ = model.target_edit.target;
      if ($ instanceof Custom && is_monthly) {
        let money = $.target;
        return new Monthly(money);
      } else if ($ instanceof Monthly && !is_monthly) {
        let money = $.target;
        return new Custom(money, date_to_month(today()));
      } else {
        let target2 = $;
        return target2;
      }
    })();
    return [
      model.withFields({
        target_edit: model.target_edit.withFields({ target })
      }),
      none()
    ];
  } else if (msg instanceof UserTargetUpdateCustomDate) {
    let date = msg.date;
    let parsed_date = (() => {
      let _pipe = from_date_string(date);
      return lazy_unwrap(_pipe, () => {
        return today();
      });
    })();
    let target = (() => {
      let $ = model.target_edit.target;
      if ($ instanceof Custom) {
        let money = $.target;
        return new Custom(money, date_to_month(parsed_date));
      } else {
        let money = $.target;
        return new Monthly(money);
      }
    })();
    return [
      model.withFields({
        target_edit: model.target_edit.withFields({ target })
      }),
      none()
    ];
  } else if (msg instanceof CategorySaveTarget && msg.a.isOk()) {
    let cat = msg.a[0];
    return [
      model.withFields({
        categories: (() => {
          let _pipe = model.categories;
          return map2(
            _pipe,
            (c) => {
              let $ = c.id === cat.id;
              if (!$) {
                return c;
              } else {
                return cat;
              }
            }
          );
        })()
      }),
      none()
    ];
  } else if (msg instanceof CategorySaveTarget && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof SelectTransaction) {
    let t = msg.t;
    return [
      model.withFields({ selected_transaction: new Some(t.id) }),
      none()
    ];
  } else if (msg instanceof DeleteTransaction) {
    let id2 = msg.t_id;
    return [
      model.withFields({ selected_transaction: new None() }),
      delete_transaction_eff(id2)
    ];
  } else if (msg instanceof EditTransaction) {
    let t = msg.t;
    let category_name = msg.category_name;
    return [
      model.withFields({
        transaction_edit_form: new Some(
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
            })()
          )
        )
      }),
      none()
    ];
  } else if (msg instanceof TransactionDeleteResult && msg.a.isOk()) {
    let id2 = msg.a[0];
    return [
      model.withFields({
        transactions: (() => {
          let _pipe = model.transactions;
          return filter(_pipe, (t) => {
            return t.id !== id2;
          });
        })()
      }),
      none()
    ];
  } else if (msg instanceof TransactionDeleteResult && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof TransactionEditResult && msg.a.isOk()) {
    let transaction = msg.a[0];
    return [
      model.withFields({
        transactions: (() => {
          let _pipe = model.transactions;
          return map2(
            _pipe,
            (t) => {
              let $ = t.id === transaction.id;
              if ($) {
                return transaction;
              } else {
                return t;
              }
            }
          );
        })()
      }),
      none()
    ];
  } else if (msg instanceof TransactionEditResult && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof UserTransactionEditPayee) {
    let payee = msg.p;
    return [
      model.withFields({
        transaction_edit_form: (() => {
          let _pipe = model.transaction_edit_form;
          return map(
            _pipe,
            (tef) => {
              return tef.withFields({ payee });
            }
          );
        })()
      }),
      none()
    ];
  } else if (msg instanceof UserTransactionEditDate) {
    let d = msg.d;
    return [
      model.withFields({
        transaction_edit_form: (() => {
          let _pipe = model.transaction_edit_form;
          return map(
            _pipe,
            (tef) => {
              return tef.withFields({ date: d });
            }
          );
        })()
      }),
      none()
    ];
  } else if (msg instanceof UserTransactionEditAmount) {
    let a2 = msg.a;
    return [
      model.withFields({
        transaction_edit_form: (() => {
          let _pipe = model.transaction_edit_form;
          return map(
            _pipe,
            (tef) => {
              return tef.withFields({ amount: a2 });
            }
          );
        })()
      }),
      none()
    ];
  } else if (msg instanceof UserTransactionEditCategory) {
    let c = msg.c;
    return [
      model.withFields({
        transaction_edit_form: (() => {
          let _pipe = model.transaction_edit_form;
          return map(
            _pipe,
            (tef) => {
              return tef.withFields({ category: c });
            }
          );
        })()
      }),
      none()
    ];
  } else if (msg instanceof UpdateTransaction) {
    return [
      model.withFields({
        selected_transaction: new None(),
        transaction_edit_form: new None()
      }),
      (() => {
        let $ = model.transaction_edit_form;
        if ($ instanceof None) {
          return none();
        } else {
          let tef = $[0];
          return update_transaction_eff(tef, model.categories);
        }
      })()
    ];
  } else if (msg instanceof DeleteCategory) {
    return [
      model.withFields({ selected_category: new None() }),
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
      model.withFields({ selected_category: new None() }),
      (() => {
        let $ = model.selected_category;
        if ($ instanceof Some) {
          let sc = $[0];
          return save_target_eff(
            cat.withFields({ name: sc.input_name }),
            cat.target
          );
        } else {
          return none();
        }
      })()
    ];
  } else if (msg instanceof UserInputCategoryUpdateName) {
    let name = msg.n;
    return [
      model.withFields({
        selected_category: (() => {
          let _pipe = model.selected_category;
          return map(
            _pipe,
            (sc) => {
              return sc.withFields({ input_name: name });
            }
          );
        })()
      }),
      none()
    ];
  } else if (msg instanceof CategoryDeleteResult && msg.a.isOk()) {
    let id2 = msg.a[0];
    return [
      model.withFields({
        categories: (() => {
          let _pipe = model.categories;
          return filter(_pipe, (c) => {
            return c.id !== id2;
          });
        })()
      }),
      none()
    ];
  } else if (msg instanceof CategoryDeleteResult && !msg.a.isOk()) {
    return [model, none()];
  } else if (msg instanceof SaveAllocation) {
    let a2 = msg.alloc_id;
    return [
      model,
      (() => {
        let $ = model.selected_category;
        if ($ instanceof Some) {
          let sc = $[0];
          return save_allocation_eff(a2, sc.allocation, sc.id, model.cycle);
        } else {
          return none();
        }
      })()
    ];
  } else if (msg instanceof SaveAllocationResult && msg[0].isOk()) {
    let aer = msg[0][0];
    return [
      model.withFields({
        allocations: (() => {
          let $ = aer.is_created;
          if ($) {
            return append(model.allocations, toList([aer.alloc]));
          } else {
            let _pipe = model.allocations;
            return map2(
              _pipe,
              (a2) => {
                let $1 = a2.id === aer.alloc.id;
                if (!$1) {
                  return a2;
                } else {
                  return aer.alloc;
                }
              }
            );
          }
        })()
      }),
      none()
    ];
  } else if (msg instanceof SaveAllocationResult && !msg[0].isOk()) {
    return [model, none()];
  } else if (msg instanceof UserAllocationUpdate) {
    let a2 = msg.amount;
    return [
      model.withFields({
        selected_category: (() => {
          let _pipe = model.selected_category;
          return map(
            _pipe,
            (sc) => {
              return sc.withFields({ allocation: a2 });
            }
          );
        })()
      }),
      none()
    ];
  } else {
    let shift = msg.shift;
    let new_cycle = (() => {
      if (shift instanceof ShiftLeft) {
        return cycle_decrease(model.cycle);
      } else {
        return cycle_increase(model.cycle);
      }
    })();
    let $ = cycle_bounds(new_cycle, model.cycle_end_day);
    let start3 = $[0];
    let end = $[1];
    return [
      model.withFields({ cycle: new_cycle }),
      batch(
        toList([get_transactions(start3, end), get_allocations(new_cycle)])
      )
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
      174,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
