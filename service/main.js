import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/ws/lib/constants.js
var require_constants = __commonJS(function(exports, module) {
  var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
  var hasBlob = typeof Blob !== "undefined";
  if (hasBlob)
    BINARY_TYPES.push("blob");
  module.exports = {
    BINARY_TYPES,
    CLOSE_TIMEOUT: 30000,
    EMPTY_BUFFER: Buffer.alloc(0),
    GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
    hasBlob,
    kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
    kListener: Symbol("kListener"),
    kStatusCode: Symbol("status-code"),
    kWebSocket: Symbol("websocket"),
    NOOP: () => {}
  };
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS(function(exports, module) {
  var { websocketMask, websocketUnmask } = __require("http");
  var { EMPTY_BUFFER } = require_constants();
  var FastBuffer = Buffer[Symbol.species];
  function concat(list, totalLength) {
    if (list.length === 0)
      return EMPTY_BUFFER;
    if (list.length === 1)
      return list[0];
    const target = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (let i = 0;i < list.length; i++) {
      const buf = list[i];
      target.set(buf, offset);
      offset += buf.length;
    }
    if (offset < totalLength) {
      return new FastBuffer(target.buffer, target.byteOffset, offset);
    }
    return target;
  }
  function _mask(source, mask, output, offset, length) {
    for (let i = 0;i < length; i++) {
      output[offset + i] = source[i] ^ mask[i & 3];
    }
  }
  function _unmask(buffer, mask) {
    for (let i = 0;i < buffer.length; i++) {
      buffer[i] ^= mask[i & 3];
    }
  }
  function toArrayBuffer(buf) {
    if (buf.length === buf.buffer.byteLength) {
      return buf.buffer;
    }
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  }
  function toBuffer(data) {
    toBuffer.readOnly = true;
    if (Buffer.isBuffer(data))
      return data;
    let buf;
    if (data instanceof ArrayBuffer) {
      buf = new FastBuffer(data);
    } else if (ArrayBuffer.isView(data)) {
      buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
    } else {
      buf = Buffer.from(data);
      toBuffer.readOnly = false;
    }
    return buf;
  }
  module.exports = {
    concat,
    mask: _mask,
    toArrayBuffer,
    toBuffer,
    unmask: _unmask
  };
  if (websocketMask) {
    module.exports.mask = function(source, mask, output, offset, length) {
      if (length < 24)
        _mask(source, mask, output, offset, length);
      else
        websocketMask(source, mask, output, offset, length);
    };
    module.exports.unmask = function(buffer, mask) {
      if (buffer.length < 24)
        _unmask(buffer, mask);
      else
        websocketUnmask(buffer, mask);
    };
  } else if (!process.env.WS_NO_BUFFER_UTIL) {
    try {
      const bufferUtil = (()=>{throw new Error("Cannot require module "+"bufferutil");})();
      module.exports.mask = function(source, mask2, output, offset, length) {
        if (length < 48)
          _mask(source, mask2, output, offset, length);
        else
          bufferUtil.mask(source, mask2, output, offset, length);
      };
      module.exports.unmask = function(buffer, mask) {
        if (buffer.length < 32)
          _unmask(buffer, mask);
        else
          bufferUtil.unmask(buffer, mask);
      };
    } catch (e) {}
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS(function(exports, module) {
  var kDone = Symbol("kDone");
  var kRun = Symbol("kRun");

  class Limiter {
    constructor(concurrency) {
      this[kDone] = () => {
        this.pending--;
        this[kRun]();
      };
      this.concurrency = concurrency || Infinity;
      this.jobs = [];
      this.pending = 0;
    }
    add(job) {
      this.jobs.push(job);
      this[kRun]();
    }
    [kRun]() {
      if (this.pending === this.concurrency)
        return;
      if (this.jobs.length) {
        const job = this.jobs.shift();
        this.pending++;
        job(this[kDone]);
      }
    }
  }
  module.exports = Limiter;
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS(function(exports, module) {
  var zlib = __require("zlib");
  var bufferUtil = require_buffer_util();
  var Limiter = require_limiter();
  var { kStatusCode } = require_constants();
  var FastBuffer = Buffer[Symbol.species];
  var TRAILER = Buffer.from([0, 0, 255, 255]);
  var kPerMessageDeflate = Symbol("permessage-deflate");
  var kTotalLength = Symbol("total-length");
  var kCallback = Symbol("callback");
  var kBuffers = Symbol("buffers");
  var kError = Symbol("error");
  var zlibLimiter;

  class PerMessageDeflate {
    constructor(options) {
      this._options = options || {};
      this._threshold = this._options.threshold !== undefined ? this._options.threshold : 1024;
      this._maxPayload = this._options.maxPayload | 0;
      this._isServer = !!this._options.isServer;
      this._deflate = null;
      this._inflate = null;
      this.params = null;
      if (!zlibLimiter) {
        const concurrency = this._options.concurrencyLimit !== undefined ? this._options.concurrencyLimit : 10;
        zlibLimiter = new Limiter(concurrency);
      }
    }
    static get extensionName() {
      return "permessage-deflate";
    }
    offer() {
      const params = {};
      if (this._options.serverNoContextTakeover) {
        params.server_no_context_takeover = true;
      }
      if (this._options.clientNoContextTakeover) {
        params.client_no_context_takeover = true;
      }
      if (this._options.serverMaxWindowBits) {
        params.server_max_window_bits = this._options.serverMaxWindowBits;
      }
      if (this._options.clientMaxWindowBits) {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      } else if (this._options.clientMaxWindowBits == null) {
        params.client_max_window_bits = true;
      }
      return params;
    }
    accept(configurations) {
      configurations = this.normalizeParams(configurations);
      this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
      return this.params;
    }
    cleanup() {
      if (this._inflate) {
        this._inflate.close();
        this._inflate = null;
      }
      if (this._deflate) {
        const callback = this._deflate[kCallback];
        this._deflate.close();
        this._deflate = null;
        if (callback) {
          callback(new Error("The deflate stream was closed while data was being processed"));
        }
      }
    }
    acceptAsServer(offers) {
      const opts = this._options;
      const accepted = offers.find((params) => {
        if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
          return false;
        }
        return true;
      });
      if (!accepted) {
        throw new Error("None of the extension offers can be accepted");
      }
      if (opts.serverNoContextTakeover) {
        accepted.server_no_context_takeover = true;
      }
      if (opts.clientNoContextTakeover) {
        accepted.client_no_context_takeover = true;
      }
      if (typeof opts.serverMaxWindowBits === "number") {
        accepted.server_max_window_bits = opts.serverMaxWindowBits;
      }
      if (typeof opts.clientMaxWindowBits === "number") {
        accepted.client_max_window_bits = opts.clientMaxWindowBits;
      } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
        delete accepted.client_max_window_bits;
      }
      return accepted;
    }
    acceptAsClient(response) {
      const params = response[0];
      if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
        throw new Error('Unexpected parameter "client_no_context_takeover"');
      }
      if (!params.client_max_window_bits) {
        if (typeof this._options.clientMaxWindowBits === "number") {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        }
      } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
        throw new Error('Unexpected or invalid parameter "client_max_window_bits"');
      }
      return params;
    }
    normalizeParams(configurations) {
      configurations.forEach((params) => {
        Object.keys(params).forEach((key) => {
          let value = params[key];
          if (value.length > 1) {
            throw new Error(`Parameter "${key}" must have only a single value`);
          }
          value = value[0];
          if (key === "client_max_window_bits") {
            if (value !== true) {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
              }
              value = num;
            } else if (!this._isServer) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
          } else if (key === "server_max_window_bits") {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
            value = num;
          } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
            if (value !== true) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
          } else {
            throw new Error(`Unknown parameter "${key}"`);
          }
          params[key] = value;
        });
      });
      return configurations;
    }
    decompress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._decompress(data, fin, (err, result) => {
          done();
          callback(err, result);
        });
      });
    }
    compress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._compress(data, fin, (err, result) => {
          done();
          callback(err, result);
        });
      });
    }
    _decompress(data, fin, callback) {
      const endpoint = this._isServer ? "client" : "server";
      if (!this._inflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._inflate = zlib.createInflateRaw({
          ...this._options.zlibInflateOptions,
          windowBits
        });
        this._inflate[kPerMessageDeflate] = this;
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];
        this._inflate.on("error", inflateOnError);
        this._inflate.on("data", inflateOnData);
      }
      this._inflate[kCallback] = callback;
      this._inflate.write(data);
      if (fin)
        this._inflate.write(TRAILER);
      this._inflate.flush(() => {
        const err = this._inflate[kError];
        if (err) {
          this._inflate.close();
          this._inflate = null;
          callback(err);
          return;
        }
        const data = bufferUtil.concat(this._inflate[kBuffers], this._inflate[kTotalLength]);
        if (this._inflate._readableState.endEmitted) {
          this._inflate.close();
          this._inflate = null;
        } else {
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._inflate.reset();
          }
        }
        callback(null, data);
      });
    }
    _compress(data, fin, callback) {
      const endpoint = this._isServer ? "server" : "client";
      if (!this._deflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._deflate = zlib.createDeflateRaw({
          ...this._options.zlibDeflateOptions,
          windowBits
        });
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        this._deflate.on("data", deflateOnData);
      }
      this._deflate[kCallback] = callback;
      this._deflate.write(data);
      this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
        if (!this._deflate) {
          return;
        }
        let data = bufferUtil.concat(this._deflate[kBuffers], this._deflate[kTotalLength]);
        if (fin) {
          data = new FastBuffer(data.buffer, data.byteOffset, data.length - 4);
        }
        this._deflate[kCallback] = null;
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._deflate.reset();
        }
        callback(null, data);
      });
    }
  }
  module.exports = PerMessageDeflate;
  function deflateOnData(chunk) {
    this[kBuffers].push(chunk);
    this[kTotalLength] += chunk.length;
  }
  function inflateOnData(chunk) {
    this[kTotalLength] += chunk.length;
    if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
      this[kBuffers].push(chunk);
      return;
    }
    this[kError] = new RangeError("Max payload size exceeded");
    this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
    this[kError][kStatusCode] = 1009;
    this.removeListener("data", inflateOnData);
    this.reset();
  }
  function inflateOnError(err) {
    this[kPerMessageDeflate]._inflate = null;
    if (this[kError]) {
      this[kCallback](this[kError]);
      return;
    }
    err[kStatusCode] = 1007;
    this[kCallback](err);
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS(function(exports, module) {
  var { isUtf8 } = __require("buffer");
  var { hasBlob } = require_constants();
  var tokenChars = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    1,
    0,
    1,
    0
  ];
  function isValidStatusCode(code) {
    return code >= 1000 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3000 && code <= 4999;
  }
  function _isValidUTF8(buf) {
    const len = buf.length;
    let i = 0;
    while (i < len) {
      if ((buf[i] & 128) === 0) {
        i++;
      } else if ((buf[i] & 224) === 192) {
        if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
          return false;
        }
        i += 2;
      } else if ((buf[i] & 240) === 224) {
        if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || buf[i] === 237 && (buf[i + 1] & 224) === 160) {
          return false;
        }
        i += 3;
      } else if ((buf[i] & 248) === 240) {
        if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
          return false;
        }
        i += 4;
      } else {
        return false;
      }
    }
    return true;
  }
  function isBlob(value) {
    return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
  }
  module.exports = {
    isBlob,
    isValidStatusCode,
    isValidUTF8: _isValidUTF8,
    tokenChars
  };
  if (isUtf8) {
    module.exports.isValidUTF8 = function(buf) {
      return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
    };
  } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
    try {
      const isValidUTF8 = (()=>{throw new Error("Cannot require module "+"utf-8-validate");})();
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
      };
    } catch (e) {}
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS(function(exports, module) {
  var { Writable } = __require("stream");
  var PerMessageDeflate = require_permessage_deflate();
  var {
    BINARY_TYPES,
    EMPTY_BUFFER,
    kStatusCode,
    kWebSocket
  } = require_constants();
  var { concat, toArrayBuffer, unmask } = require_buffer_util();
  var { isValidStatusCode, isValidUTF8 } = require_validation();
  var FastBuffer = Buffer[Symbol.species];
  var GET_INFO = 0;
  var GET_PAYLOAD_LENGTH_16 = 1;
  var GET_PAYLOAD_LENGTH_64 = 2;
  var GET_MASK = 3;
  var GET_DATA = 4;
  var INFLATING = 5;
  var DEFER_EVENT = 6;

  class Receiver extends Writable {
    constructor(options = {}) {
      super();
      this._allowSynchronousEvents = options.allowSynchronousEvents !== undefined ? options.allowSynchronousEvents : true;
      this._binaryType = options.binaryType || BINARY_TYPES[0];
      this._extensions = options.extensions || {};
      this._isServer = !!options.isServer;
      this._maxBufferedChunks = options.maxBufferedChunks | 0;
      this._maxFragments = options.maxFragments | 0;
      this._maxPayload = options.maxPayload | 0;
      this._skipUTF8Validation = !!options.skipUTF8Validation;
      this[kWebSocket] = undefined;
      this._bufferedBytes = 0;
      this._buffers = [];
      this._compressed = false;
      this._payloadLength = 0;
      this._mask = undefined;
      this._fragmented = 0;
      this._masked = false;
      this._fin = false;
      this._opcode = 0;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._numFragments = 0;
      this._fragments = [];
      this._errored = false;
      this._loop = false;
      this._state = GET_INFO;
    }
    _write(chunk, encoding, cb) {
      if (this._opcode === 8 && this._state == GET_INFO)
        return cb();
      if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
        cb(this.createError(RangeError, "Too many buffered chunks", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS"));
        return;
      }
      this._bufferedBytes += chunk.length;
      this._buffers.push(chunk);
      this.startLoop(cb);
    }
    consume(n) {
      this._bufferedBytes -= n;
      if (n === this._buffers[0].length)
        return this._buffers.shift();
      if (n < this._buffers[0].length) {
        const buf = this._buffers[0];
        this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
        return new FastBuffer(buf.buffer, buf.byteOffset, n);
      }
      const dst = Buffer.allocUnsafe(n);
      do {
        const buf = this._buffers[0];
        const offset = dst.length - n;
        if (n >= buf.length) {
          dst.set(this._buffers.shift(), offset);
        } else {
          dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
          this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
        }
        n -= buf.length;
      } while (n > 0);
      return dst;
    }
    startLoop(cb) {
      this._loop = true;
      do {
        switch (this._state) {
          case GET_INFO:
            this.getInfo(cb);
            break;
          case GET_PAYLOAD_LENGTH_16:
            this.getPayloadLength16(cb);
            break;
          case GET_PAYLOAD_LENGTH_64:
            this.getPayloadLength64(cb);
            break;
          case GET_MASK:
            this.getMask();
            break;
          case GET_DATA:
            this.getData(cb);
            break;
          case INFLATING:
          case DEFER_EVENT:
            this._loop = false;
            return;
        }
      } while (this._loop);
      if (!this._errored)
        cb();
    }
    getInfo(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      const buf = this.consume(2);
      if ((buf[0] & 48) !== 0) {
        const error = this.createError(RangeError, "RSV2 and RSV3 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_2_3");
        cb(error);
        return;
      }
      const compressed = (buf[0] & 64) === 64;
      if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
        const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
        cb(error);
        return;
      }
      this._fin = (buf[0] & 128) === 128;
      this._opcode = buf[0] & 15;
      this._payloadLength = buf[1] & 127;
      if (this._opcode === 0) {
        if (compressed) {
          const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
          cb(error);
          return;
        }
        if (!this._fragmented) {
          const error = this.createError(RangeError, "invalid opcode 0", true, 1002, "WS_ERR_INVALID_OPCODE");
          cb(error);
          return;
        }
        this._opcode = this._fragmented;
      } else if (this._opcode === 1 || this._opcode === 2) {
        if (this._fragmented) {
          const error = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
          cb(error);
          return;
        }
        this._compressed = compressed;
      } else if (this._opcode > 7 && this._opcode < 11) {
        if (!this._fin) {
          const error = this.createError(RangeError, "FIN must be set", true, 1002, "WS_ERR_EXPECTED_FIN");
          cb(error);
          return;
        }
        if (compressed) {
          const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
          cb(error);
          return;
        }
        if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
          const error = this.createError(RangeError, `invalid payload length ${this._payloadLength}`, true, 1002, "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");
          cb(error);
          return;
        }
      } else {
        const error = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
        cb(error);
        return;
      }
      if (!this._fin && !this._fragmented)
        this._fragmented = this._opcode;
      this._masked = (buf[1] & 128) === 128;
      if (this._isServer) {
        if (!this._masked) {
          const error = this.createError(RangeError, "MASK must be set", true, 1002, "WS_ERR_EXPECTED_MASK");
          cb(error);
          return;
        }
      } else if (this._masked) {
        const error = this.createError(RangeError, "MASK must be clear", true, 1002, "WS_ERR_UNEXPECTED_MASK");
        cb(error);
        return;
      }
      if (this._payloadLength === 126)
        this._state = GET_PAYLOAD_LENGTH_16;
      else if (this._payloadLength === 127)
        this._state = GET_PAYLOAD_LENGTH_64;
      else
        this.haveLength(cb);
    }
    getPayloadLength16(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      this._payloadLength = this.consume(2).readUInt16BE(0);
      this.haveLength(cb);
    }
    getPayloadLength64(cb) {
      if (this._bufferedBytes < 8) {
        this._loop = false;
        return;
      }
      const buf = this.consume(8);
      const num = buf.readUInt32BE(0);
      if (num > Math.pow(2, 53 - 32) - 1) {
        const error = this.createError(RangeError, "Unsupported WebSocket frame: payload length > 2^53 - 1", false, 1009, "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");
        cb(error);
        return;
      }
      this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
      this.haveLength(cb);
    }
    haveLength(cb) {
      if (this._payloadLength && this._opcode < 8) {
        this._totalPayloadLength += this._payloadLength;
        if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
          const error = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
          cb(error);
          return;
        }
      }
      if (this._masked)
        this._state = GET_MASK;
      else
        this._state = GET_DATA;
    }
    getMask() {
      if (this._bufferedBytes < 4) {
        this._loop = false;
        return;
      }
      this._mask = this.consume(4);
      this._state = GET_DATA;
    }
    getData(cb) {
      let data = EMPTY_BUFFER;
      if (this._payloadLength) {
        if (this._bufferedBytes < this._payloadLength) {
          this._loop = false;
          return;
        }
        data = this.consume(this._payloadLength);
        if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
          unmask(data, this._mask);
        }
      }
      this._mask = undefined;
      if (this._opcode > 7) {
        this.controlMessage(data, cb);
        return;
      }
      if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
        const error = this.createError(RangeError, "Too many message fragments", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS");
        cb(error);
        return;
      }
      if (this._compressed) {
        this._state = INFLATING;
        this.decompress(data, cb);
        return;
      }
      if (data.length) {
        this._messageLength = this._totalPayloadLength;
        this._fragments.push(data);
      }
      this.dataMessage(cb);
    }
    decompress(data, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      perMessageDeflate.decompress(data, this._fin, (err, buf) => {
        if (err)
          return cb(err);
        if (buf.length) {
          this._messageLength += buf.length;
          if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
            cb(error);
            return;
          }
          this._fragments.push(buf);
        }
        this.dataMessage(cb);
        if (this._state === GET_INFO)
          this.startLoop(cb);
      });
    }
    dataMessage(cb) {
      if (!this._fin) {
        this._state = GET_INFO;
        return;
      }
      const messageLength = this._messageLength;
      const fragments = this._fragments;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._fragmented = 0;
      this._numFragments = 0;
      this._fragments = [];
      if (this._opcode === 2) {
        let data;
        if (this._binaryType === "nodebuffer") {
          data = concat(fragments, messageLength);
        } else if (this._binaryType === "arraybuffer") {
          data = toArrayBuffer(concat(fragments, messageLength));
        } else if (this._binaryType === "blob") {
          data = new Blob(fragments);
        } else {
          data = fragments;
        }
        if (this._allowSynchronousEvents) {
          this.emit("message", data, true);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", data, true);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      } else {
        const buf = concat(fragments, messageLength);
        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
          const error = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
          cb(error);
          return;
        }
        if (this._state === INFLATING || this._allowSynchronousEvents) {
          this.emit("message", buf, false);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", buf, false);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
    }
    controlMessage(data, cb) {
      if (this._opcode === 8) {
        if (data.length === 0) {
          this._loop = false;
          this.emit("conclude", 1005, EMPTY_BUFFER);
          this.end();
        } else {
          const code = data.readUInt16BE(0);
          if (!isValidStatusCode(code)) {
            const error = this.createError(RangeError, `invalid status code ${code}`, true, 1002, "WS_ERR_INVALID_CLOSE_CODE");
            cb(error);
            return;
          }
          const buf = new FastBuffer(data.buffer, data.byteOffset + 2, data.length - 2);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
            cb(error);
            return;
          }
          this._loop = false;
          this.emit("conclude", code, buf);
          this.end();
        }
        this._state = GET_INFO;
        return;
      }
      if (this._allowSynchronousEvents) {
        this.emit(this._opcode === 9 ? "ping" : "pong", data);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    }
    createError(ErrorCtor, message, prefix, statusCode, errorCode) {
      this._loop = false;
      this._errored = true;
      const err = new ErrorCtor(prefix ? `Invalid WebSocket frame: ${message}` : message);
      Error.captureStackTrace(err, this.createError);
      err.code = errorCode;
      err[kStatusCode] = statusCode;
      return err;
    }
  }
  module.exports = Receiver;
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS(function(exports, module) {
  var { Duplex } = __require("stream");
  var { randomFillSync } = __require("crypto");
  var {
    types: { isUint8Array }
  } = __require("util");
  var PerMessageDeflate = require_permessage_deflate();
  var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
  var { isBlob, isValidStatusCode } = require_validation();
  var { mask: applyMask, toBuffer } = require_buffer_util();
  var kByteLength = Symbol("kByteLength");
  var maskBuffer = Buffer.alloc(4);
  var RANDOM_POOL_SIZE = 8 * 1024;
  var randomPool;
  var randomPoolPointer = RANDOM_POOL_SIZE;
  var DEFAULT = 0;
  var DEFLATING = 1;
  var GET_BLOB_DATA = 2;

  class Sender {
    constructor(socket, extensions, generateMask) {
      this._extensions = extensions || {};
      if (generateMask) {
        this._generateMask = generateMask;
        this._maskBuffer = Buffer.alloc(4);
      }
      this._socket = socket;
      this._firstFragment = true;
      this._compress = false;
      this._bufferedBytes = 0;
      this._queue = [];
      this._state = DEFAULT;
      this.onerror = NOOP;
      this[kWebSocket] = undefined;
    }
    static frame(data, options) {
      let mask;
      let merge = false;
      let offset = 2;
      let skipMasking = false;
      if (options.mask) {
        mask = options.maskBuffer || maskBuffer;
        if (options.generateMask) {
          options.generateMask(mask);
        } else {
          if (randomPoolPointer === RANDOM_POOL_SIZE) {
            if (randomPool === undefined) {
              randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
            }
            randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
            randomPoolPointer = 0;
          }
          mask[0] = randomPool[randomPoolPointer++];
          mask[1] = randomPool[randomPoolPointer++];
          mask[2] = randomPool[randomPoolPointer++];
          mask[3] = randomPool[randomPoolPointer++];
        }
        skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
        offset = 6;
      }
      let dataLength;
      if (typeof data === "string") {
        if ((!options.mask || skipMasking) && options[kByteLength] !== undefined) {
          dataLength = options[kByteLength];
        } else {
          data = Buffer.from(data);
          dataLength = data.length;
        }
      } else {
        dataLength = data.length;
        merge = options.mask && options.readOnly && !skipMasking;
      }
      let payloadLength = dataLength;
      if (dataLength >= 65536) {
        offset += 8;
        payloadLength = 127;
      } else if (dataLength > 125) {
        offset += 2;
        payloadLength = 126;
      }
      const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
      target[0] = options.fin ? options.opcode | 128 : options.opcode;
      if (options.rsv1)
        target[0] |= 64;
      target[1] = payloadLength;
      if (payloadLength === 126) {
        target.writeUInt16BE(dataLength, 2);
      } else if (payloadLength === 127) {
        target[2] = target[3] = 0;
        target.writeUIntBE(dataLength, 4, 6);
      }
      if (!options.mask) {
        return dataLength ? [target, data] : [target];
      }
      target[1] |= 128;
      target[offset - 4] = mask[0];
      target[offset - 3] = mask[1];
      target[offset - 2] = mask[2];
      target[offset - 1] = mask[3];
      if (!dataLength)
        return [target];
      if (skipMasking)
        return [target, data];
      if (merge) {
        applyMask(data, mask, target, offset, dataLength);
        return [target];
      }
      applyMask(data, mask, data, 0, dataLength);
      return [target, data];
    }
    close(code, data, mask, cb) {
      let buf;
      if (code === undefined) {
        buf = EMPTY_BUFFER;
      } else if (typeof code !== "number" || !isValidStatusCode(code)) {
        throw new TypeError("First argument must be a valid error code number");
      } else if (data === undefined || !data.length) {
        buf = Buffer.allocUnsafe(2);
        buf.writeUInt16BE(code, 0);
      } else {
        const length = Buffer.byteLength(data);
        if (length > 123) {
          throw new RangeError("The message must not be greater than 123 bytes");
        }
        buf = Buffer.allocUnsafe(2 + length);
        buf.writeUInt16BE(code, 0);
        if (typeof data === "string") {
          buf.write(data, 2);
        } else if (isUint8Array(data)) {
          buf.set(data, 2);
        } else {
          throw new TypeError("Second argument must be a string or a Uint8Array");
        }
      }
      const options = {
        [kByteLength]: buf.length,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 8,
        readOnly: false,
        rsv1: false
      };
      if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, buf, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(buf, options), cb);
      }
    }
    ping(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 9,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    pong(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 10,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    send(data, options, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      let opcode = options.binary ? 2 : 1;
      let rsv1 = options.compress;
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (this._firstFragment) {
        this._firstFragment = false;
        if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
          rsv1 = byteLength >= perMessageDeflate._threshold;
        }
        this._compress = rsv1;
      } else {
        rsv1 = false;
        opcode = 0;
      }
      if (options.fin)
        this._firstFragment = true;
      const opts = {
        [kByteLength]: byteLength,
        fin: options.fin,
        generateMask: this._generateMask,
        mask: options.mask,
        maskBuffer: this._maskBuffer,
        opcode,
        readOnly,
        rsv1
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
        } else {
          this.getBlobData(data, this._compress, opts, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, this._compress, opts, cb]);
      } else {
        this.dispatch(data, this._compress, opts, cb);
      }
    }
    getBlobData(blob, compress, options, cb) {
      this._bufferedBytes += options[kByteLength];
      this._state = GET_BLOB_DATA;
      blob.arrayBuffer().then((arrayBuffer) => {
        if (this._socket.destroyed) {
          const err = new Error("The socket was closed while the blob was being read");
          process.nextTick(callCallbacks, this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        const data = toBuffer(arrayBuffer);
        if (!compress) {
          this._state = DEFAULT;
          this.sendFrame(Sender.frame(data, options), cb);
          this.dequeue();
        } else {
          this.dispatch(data, compress, options, cb);
        }
      }).catch((err) => {
        process.nextTick(onError, this, err, cb);
      });
    }
    dispatch(data, compress, options, cb) {
      if (!compress) {
        this.sendFrame(Sender.frame(data, options), cb);
        return;
      }
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      this._bufferedBytes += options[kByteLength];
      this._state = DEFLATING;
      perMessageDeflate.compress(data, options.fin, (_, buf) => {
        if (this._socket.destroyed) {
          const err = new Error("The socket was closed while data was being compressed");
          callCallbacks(this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        this._state = DEFAULT;
        options.readOnly = false;
        this.sendFrame(Sender.frame(buf, options), cb);
        this.dequeue();
      });
    }
    dequeue() {
      while (this._state === DEFAULT && this._queue.length) {
        const params = this._queue.shift();
        this._bufferedBytes -= params[3][kByteLength];
        Reflect.apply(params[0], this, params.slice(1));
      }
    }
    enqueue(params) {
      this._bufferedBytes += params[3][kByteLength];
      this._queue.push(params);
    }
    sendFrame(list, cb) {
      if (list.length === 2) {
        this._socket.cork();
        this._socket.write(list[0]);
        this._socket.write(list[1], cb);
        this._socket.uncork();
      } else {
        this._socket.write(list[0], cb);
      }
    }
  }
  module.exports = Sender;
  function callCallbacks(sender, err, cb) {
    if (typeof cb === "function")
      cb(err);
    for (let i = 0;i < sender._queue.length; i++) {
      const params = sender._queue[i];
      const callback = params[params.length - 1];
      if (typeof callback === "function")
        callback(err);
    }
  }
  function onError(sender, err, cb) {
    callCallbacks(sender, err, cb);
    sender.onerror(err);
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS(function(exports, module) {
  var { kForOnEventAttribute, kListener } = require_constants();
  var kCode = Symbol("kCode");
  var kData = Symbol("kData");
  var kError = Symbol("kError");
  var kMessage = Symbol("kMessage");
  var kReason = Symbol("kReason");
  var kTarget = Symbol("kTarget");
  var kType = Symbol("kType");
  var kWasClean = Symbol("kWasClean");

  class Event {
    constructor(type) {
      this[kTarget] = null;
      this[kType] = type;
    }
    get target() {
      return this[kTarget];
    }
    get type() {
      return this[kType];
    }
  }
  Object.defineProperty(Event.prototype, "target", { enumerable: true });
  Object.defineProperty(Event.prototype, "type", { enumerable: true });

  class CloseEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kCode] = options.code === undefined ? 0 : options.code;
      this[kReason] = options.reason === undefined ? "" : options.reason;
      this[kWasClean] = options.wasClean === undefined ? false : options.wasClean;
    }
    get code() {
      return this[kCode];
    }
    get reason() {
      return this[kReason];
    }
    get wasClean() {
      return this[kWasClean];
    }
  }
  Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });

  class ErrorEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kError] = options.error === undefined ? null : options.error;
      this[kMessage] = options.message === undefined ? "" : options.message;
    }
    get error() {
      return this[kError];
    }
    get message() {
      return this[kMessage];
    }
  }
  Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
  Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });

  class MessageEvent2 extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kData] = options.data === undefined ? null : options.data;
    }
    get data() {
      return this[kData];
    }
  }
  Object.defineProperty(MessageEvent2.prototype, "data", { enumerable: true });
  var EventTarget = {
    addEventListener(type, handler, options = {}) {
      for (const listener of this.listeners(type)) {
        if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          return;
        }
      }
      let wrapper;
      if (type === "message") {
        wrapper = function onMessage(data, isBinary) {
          const event = new MessageEvent2("message", {
            data: isBinary ? data : data.toString()
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "close") {
        wrapper = function onClose(code, message) {
          const event = new CloseEvent("close", {
            code,
            reason: message.toString(),
            wasClean: this._closeFrameReceived && this._closeFrameSent
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "error") {
        wrapper = function onError(error) {
          const event = new ErrorEvent("error", {
            error,
            message: error.message
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "open") {
        wrapper = function onOpen() {
          const event = new Event("open");
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else {
        return;
      }
      wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
      wrapper[kListener] = handler;
      if (options.once) {
        this.once(type, wrapper);
      } else {
        this.on(type, wrapper);
      }
    },
    removeEventListener(type, handler) {
      for (const listener of this.listeners(type)) {
        if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          this.removeListener(type, listener);
          break;
        }
      }
    }
  };
  module.exports = {
    CloseEvent,
    ErrorEvent,
    Event,
    EventTarget,
    MessageEvent: MessageEvent2
  };
  function callListener(listener, thisArg, event) {
    if (typeof listener === "object" && listener.handleEvent) {
      listener.handleEvent.call(listener, event);
    } else {
      listener.call(thisArg, event);
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS(function(exports, module) {
  var { tokenChars } = require_validation();
  function push(dest, name, elem) {
    if (dest[name] === undefined)
      dest[name] = [elem];
    else
      dest[name].push(elem);
  }
  function parse(header) {
    const offers = Object.create(null);
    let params = Object.create(null);
    let mustUnescape = false;
    let isEscaping = false;
    let inQuotes = false;
    let extensionName;
    let paramName;
    let start = -1;
    let code = -1;
    let end = -1;
    let i = 0;
    for (;i < header.length; i++) {
      code = header.charCodeAt(i);
      if (extensionName === undefined) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          const name = header.slice(start, end);
          if (code === 44) {
            push(offers, name, params);
            params = Object.create(null);
          } else {
            extensionName = name;
          }
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (paramName === undefined) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (code === 32 || code === 9) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          push(params, header.slice(start, end), true);
          if (code === 44) {
            push(offers, extensionName, params);
            params = Object.create(null);
            extensionName = undefined;
          }
          start = end = -1;
        } else if (code === 61 && start !== -1 && end === -1) {
          paramName = header.slice(start, i);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else {
        if (isEscaping) {
          if (tokenChars[code] !== 1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (start === -1)
            start = i;
          else if (!mustUnescape)
            mustUnescape = true;
          isEscaping = false;
        } else if (inQuotes) {
          if (tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (code === 34 && start !== -1) {
            inQuotes = false;
            end = i;
          } else if (code === 92) {
            isEscaping = true;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
          inQuotes = true;
        } else if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (start !== -1 && (code === 32 || code === 9)) {
          if (end === -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          let value = header.slice(start, end);
          if (mustUnescape) {
            value = value.replace(/\\/g, "");
            mustUnescape = false;
          }
          push(params, paramName, value);
          if (code === 44) {
            push(offers, extensionName, params);
            params = Object.create(null);
            extensionName = undefined;
          }
          paramName = undefined;
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
    }
    if (start === -1 || inQuotes || code === 32 || code === 9) {
      throw new SyntaxError("Unexpected end of input");
    }
    if (end === -1)
      end = i;
    const token = header.slice(start, end);
    if (extensionName === undefined) {
      push(offers, token, params);
    } else {
      if (paramName === undefined) {
        push(params, token, true);
      } else if (mustUnescape) {
        push(params, paramName, token.replace(/\\/g, ""));
      } else {
        push(params, paramName, token);
      }
      push(offers, extensionName, params);
    }
    return offers;
  }
  function format(extensions) {
    return Object.keys(extensions).map((extension) => {
      let configurations = extensions[extension];
      if (!Array.isArray(configurations))
        configurations = [configurations];
      return configurations.map((params) => {
        return [extension].concat(Object.keys(params).map((k) => {
          let values = params[k];
          if (!Array.isArray(values))
            values = [values];
          return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
        })).join("; ");
      }).join(", ");
    }).join(", ");
  }
  module.exports = { format, parse };
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS(function(exports, module) {
  var EventEmitter = __require("events");
  var https = __require("https");
  var http = __require("http");
  var net = __require("net");
  var querystring = __require("querystring");
  var tls = __require("tls");
  var { randomBytes, createHash } = __require("crypto");
  var { Duplex, Readable } = __require("stream");
  var { URL: URL2 } = __require("url");
  var PerMessageDeflate = require_permessage_deflate();
  var Receiver = require_receiver();
  var Sender = require_sender();
  var { isBlob } = require_validation();
  var {
    BINARY_TYPES,
    CLOSE_TIMEOUT,
    EMPTY_BUFFER,
    GUID,
    kForOnEventAttribute,
    kListener,
    kStatusCode,
    kWebSocket,
    NOOP
  } = require_constants();
  var {
    EventTarget: { addEventListener, removeEventListener }
  } = require_event_target();
  var { format, parse } = require_extension();
  var { toBuffer } = require_buffer_util();
  var kAborted = Symbol("kAborted");
  var protocolVersions = [8, 13];
  var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
  var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;

  class WebSocket extends EventEmitter {
    constructor(address, protocols, options) {
      super();
      this._binaryType = BINARY_TYPES[0];
      this._closeCode = 1006;
      this._closeFrameReceived = false;
      this._closeFrameSent = false;
      this._closeMessage = EMPTY_BUFFER;
      this._closeTimer = null;
      this._errorEmitted = false;
      this._extensions = {};
      this._paused = false;
      this._protocol = "";
      this._readyState = WebSocket.CONNECTING;
      this._receiver = null;
      this._sender = null;
      this._socket = null;
      if (address !== null) {
        this._bufferedAmount = 0;
        this._isServer = false;
        this._redirects = 0;
        if (protocols === undefined) {
          if (!options || options.protocols === undefined) {
            protocols = [];
          } else if (Array.isArray(options.protocols)) {
            protocols = options.protocols;
          } else {
            protocols = [options.protocols];
          }
        } else if (!Array.isArray(protocols)) {
          if (typeof protocols === "object" && protocols !== null) {
            options = protocols;
            if (options.protocols === undefined) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else {
            protocols = [protocols];
          }
        }
        options = initAsClient(this, address, protocols, options);
      } else {
        this._isServer = true;
      }
      if (options.autoPong) {
        this._autoPong = true;
        this._autoPongComplete = () => autoPongComplete(this);
        this._pendingAutoPongs = 0;
        this._maxPendingAutoPongs = options.maxPendingAutoPongs | 0;
      }
      this._closeTimeout = options.closeTimeout;
    }
    get binaryType() {
      return this._binaryType;
    }
    set binaryType(type) {
      if (!BINARY_TYPES.includes(type))
        return;
      this._binaryType = type;
      if (this._receiver)
        this._receiver._binaryType = type;
    }
    get bufferedAmount() {
      if (!this._socket)
        return this._bufferedAmount;
      return this._socket._writableState.length + this._sender._bufferedBytes;
    }
    get extensions() {
      return Object.keys(this._extensions).join();
    }
    get isPaused() {
      return this._paused;
    }
    get onclose() {
      return null;
    }
    get onerror() {
      return null;
    }
    get onopen() {
      return null;
    }
    get onmessage() {
      return null;
    }
    get protocol() {
      return this._protocol;
    }
    get readyState() {
      return this._readyState;
    }
    get url() {
      return this._url;
    }
    setSocket(socket, head, options) {
      const receiver = new Receiver({
        allowSynchronousEvents: options.allowSynchronousEvents,
        binaryType: this.binaryType,
        extensions: this._extensions,
        isServer: this._isServer,
        maxBufferedChunks: options.maxBufferedChunks,
        maxFragments: options.maxFragments,
        maxPayload: options.maxPayload,
        skipUTF8Validation: options.skipUTF8Validation
      });
      const sender = new Sender(socket, this._extensions, options.generateMask);
      this._receiver = receiver;
      this._sender = sender;
      this._socket = socket;
      receiver[kWebSocket] = this;
      sender[kWebSocket] = this;
      socket[kWebSocket] = this;
      receiver.on("conclude", receiverOnConclude);
      receiver.on("drain", receiverOnDrain);
      receiver.on("error", receiverOnError);
      receiver.on("message", receiverOnMessage);
      receiver.on("ping", receiverOnPing);
      receiver.on("pong", receiverOnPong);
      sender.onerror = senderOnError;
      if (socket.setTimeout)
        socket.setTimeout(0);
      if (socket.setNoDelay)
        socket.setNoDelay();
      if (head.length > 0)
        socket.unshift(head);
      socket.on("close", socketOnClose);
      socket.on("data", socketOnData);
      socket.on("end", socketOnEnd);
      socket.on("error", socketOnError);
      this._readyState = WebSocket.OPEN;
      this.emit("open");
    }
    emitClose() {
      if (!this._socket) {
        this._readyState = WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
        return;
      }
      if (this._extensions[PerMessageDeflate.extensionName]) {
        this._extensions[PerMessageDeflate.extensionName].cleanup();
      }
      this._receiver.removeAllListeners();
      this._readyState = WebSocket.CLOSED;
      this.emit("close", this._closeCode, this._closeMessage);
    }
    close(code, data) {
      if (this.readyState === WebSocket.CLOSED)
        return;
      if (this.readyState === WebSocket.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this.readyState === WebSocket.CLOSING) {
        if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
          this._socket.end();
        }
        return;
      }
      this._sender.close(code, data, !this._isServer, (err) => {
        if (err)
          return;
        this._closeFrameSent = true;
        if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
          this._socket.end();
        }
      });
      this._readyState = WebSocket.CLOSING;
      setCloseTimer(this);
    }
    pause() {
      if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
        return;
      }
      this._paused = true;
      this._socket.pause();
    }
    ping(data, mask, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = undefined;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = undefined;
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === undefined)
        mask = !this._isServer;
      this._sender.ping(data || EMPTY_BUFFER, mask, cb);
    }
    pong(data, mask, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = undefined;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = undefined;
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === undefined)
        mask = !this._isServer;
      this._sender.pong(data || EMPTY_BUFFER, mask, cb);
    }
    resume() {
      if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
        return;
      }
      this._paused = false;
      if (!this._receiver._writableState.needDrain)
        this._socket.resume();
    }
    send(data, options, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      const opts = {
        binary: typeof data !== "string",
        mask: !this._isServer,
        compress: true,
        fin: true,
        ...options
      };
      if (!this._extensions[PerMessageDeflate.extensionName]) {
        opts.compress = false;
      }
      this._sender.send(data || EMPTY_BUFFER, opts, cb);
    }
    terminate() {
      if (this.readyState === WebSocket.CLOSED)
        return;
      if (this.readyState === WebSocket.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this._socket) {
        this._readyState = WebSocket.CLOSING;
        this._socket.destroy();
      }
    }
  }
  Object.defineProperty(WebSocket, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket.prototype, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket.prototype, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket.prototype, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  Object.defineProperty(WebSocket.prototype, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  [
    "binaryType",
    "bufferedAmount",
    "extensions",
    "isPaused",
    "protocol",
    "readyState",
    "url"
  ].forEach((property) => {
    Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
  });
  ["open", "error", "close", "message"].forEach((method) => {
    Object.defineProperty(WebSocket.prototype, `on${method}`, {
      enumerable: true,
      get() {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute])
            return listener[kListener];
        }
        return null;
      },
      set(handler) {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute]) {
            this.removeListener(method, listener);
            break;
          }
        }
        if (typeof handler !== "function")
          return;
        this.addEventListener(method, handler, {
          [kForOnEventAttribute]: true
        });
      }
    });
  });
  WebSocket.prototype.addEventListener = addEventListener;
  WebSocket.prototype.removeEventListener = removeEventListener;
  module.exports = WebSocket;
  function initAsClient(websocket, address, protocols, options) {
    const opts = {
      allowSynchronousEvents: true,
      autoPong: true,
      closeTimeout: CLOSE_TIMEOUT,
      protocolVersion: protocolVersions[1],
      maxBufferedChunks: 256 * 1024,
      maxFragments: 16 * 1024,
      maxPayload: 100 * 1024 * 1024,
      maxPendingAutoPongs: 60,
      skipUTF8Validation: false,
      perMessageDeflate: true,
      followRedirects: false,
      maxRedirects: 10,
      ...options,
      socketPath: undefined,
      hostname: undefined,
      protocol: undefined,
      protocols: undefined,
      timeout: undefined,
      method: "GET",
      host: undefined,
      path: undefined,
      port: undefined
    };
    if (!protocolVersions.includes(opts.protocolVersion)) {
      throw new RangeError(`Unsupported protocol version: ${opts.protocolVersion} ` + `(supported versions: ${protocolVersions.join(", ")})`);
    }
    let parsedUrl;
    if (address instanceof URL2) {
      parsedUrl = address;
    } else {
      try {
        parsedUrl = new URL2(address);
      } catch {
        throw new SyntaxError(`Invalid URL: ${address}`);
      }
    }
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      parsedUrl = new URL2(parsedUrl);
      parsedUrl.protocol = parsedUrl.protocol === "http:" ? "ws:" : "wss:";
    }
    websocket._url = parsedUrl.href;
    const isSecure = parsedUrl.protocol === "wss:";
    const isIpcUrl = parsedUrl.protocol === "ws+unix:";
    let invalidUrlMessage;
    if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
      invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", ` + '"http:", "https:", or "ws+unix:"';
    } else if (isIpcUrl && !parsedUrl.pathname) {
      invalidUrlMessage = "The URL's pathname is empty";
    } else if (parsedUrl.hash) {
      invalidUrlMessage = "The URL contains a fragment identifier";
    }
    if (invalidUrlMessage) {
      const err = new SyntaxError(invalidUrlMessage);
      if (websocket._redirects === 0) {
        throw err;
      } else {
        emitErrorAndClose(websocket, err);
        return;
      }
    }
    const defaultPort = isSecure ? 443 : 80;
    const key = randomBytes(16).toString("base64");
    const request3 = isSecure ? https.request : http.request;
    const protocolSet = new Set;
    let perMessageDeflate;
    opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
    opts.defaultPort = opts.defaultPort || defaultPort;
    opts.port = parsedUrl.port || defaultPort;
    opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
    opts.headers = {
      ...opts.headers,
      "Sec-WebSocket-Version": opts.protocolVersion,
      "Sec-WebSocket-Key": key,
      Connection: "Upgrade",
      Upgrade: "websocket"
    };
    opts.path = parsedUrl.pathname + parsedUrl.search;
    opts.timeout = opts.handshakeTimeout;
    if (opts.perMessageDeflate) {
      perMessageDeflate = new PerMessageDeflate({
        ...opts.perMessageDeflate,
        isServer: false,
        maxPayload: opts.maxPayload
      });
      opts.headers["Sec-WebSocket-Extensions"] = format({
        [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
      });
    }
    if (protocols.length) {
      for (const protocol of protocols) {
        if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
          throw new SyntaxError("An invalid or duplicated subprotocol was specified");
        }
        protocolSet.add(protocol);
      }
      opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
    }
    if (opts.origin) {
      if (opts.protocolVersion < 13) {
        opts.headers["Sec-WebSocket-Origin"] = opts.origin;
      } else {
        opts.headers.Origin = opts.origin;
      }
    }
    if (parsedUrl.username || parsedUrl.password) {
      const username = querystring.unescape(parsedUrl.username);
      const password = querystring.unescape(parsedUrl.password);
      opts.auth = `${username}:${password}`;
    }
    if (isIpcUrl) {
      const i = opts.path.indexOf(":");
      if (i === -1) {
        opts.socketPath = opts.path;
        opts.path = "";
      } else {
        opts.socketPath = opts.path.slice(0, i);
        opts.path = opts.path.slice(i + 1);
      }
    }
    let req;
    if (opts.followRedirects) {
      if (websocket._redirects === 0) {
        websocket._originalIpc = isIpcUrl;
        websocket._originalSecure = isSecure;
        websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
        const headers = options && options.headers;
        options = { ...options, headers: {} };
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            options.headers[key.toLowerCase()] = value;
          }
        }
      } else if (websocket.listenerCount("redirect") === 0) {
        const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
        if (!isSameHost || websocket._originalSecure && !isSecure) {
          delete opts.headers.authorization;
          delete opts.headers.cookie;
          if (!isSameHost)
            delete opts.headers.host;
          opts.auth = undefined;
        }
      }
      if (opts.auth && !options.headers.authorization) {
        options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
      }
      req = websocket._req = request3(opts);
      if (websocket._redirects) {
        websocket.emit("redirect", websocket.url, req);
      }
    } else {
      req = websocket._req = request3(opts);
    }
    if (opts.timeout) {
      req.on("timeout", () => {
        abortHandshake(websocket, req, "Opening handshake has timed out");
      });
    }
    req.on("error", (err) => {
      if (req === null || req[kAborted])
        return;
      req = websocket._req = null;
      emitErrorAndClose(websocket, err);
    });
    req.on("response", (res) => {
      const location = res.headers.location;
      const statusCode = res.statusCode;
      if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
        if (++websocket._redirects > opts.maxRedirects) {
          abortHandshake(websocket, req, "Maximum redirects exceeded");
          return;
        }
        req.abort();
        let addr;
        try {
          addr = new URL2(location, address);
        } catch (e) {
          const err = new SyntaxError(`Invalid URL: ${location}`);
          emitErrorAndClose(websocket, err);
          return;
        }
        initAsClient(websocket, addr, protocols, options);
      } else if (!websocket.emit("unexpected-response", req, res)) {
        abortHandshake(websocket, req, `Unexpected server response: ${res.statusCode}`);
      }
    });
    req.on("upgrade", (res, socket, head) => {
      websocket.emit("upgrade", res);
      if (websocket.readyState !== WebSocket.CONNECTING)
        return;
      req = websocket._req = null;
      const upgrade = res.headers.upgrade;
      if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
        abortHandshake(websocket, socket, "Invalid Upgrade header");
        return;
      }
      const digest = createHash("sha1").update(key + GUID).digest("base64");
      if (res.headers["sec-websocket-accept"] !== digest) {
        abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
        return;
      }
      const serverProt = res.headers["sec-websocket-protocol"];
      let protError;
      if (serverProt !== undefined) {
        if (!protocolSet.size) {
          protError = "Server sent a subprotocol but none was requested";
        } else if (!protocolSet.has(serverProt)) {
          protError = "Server sent an invalid subprotocol";
        }
      } else if (protocolSet.size) {
        protError = "Server sent no subprotocol";
      }
      if (protError) {
        abortHandshake(websocket, socket, protError);
        return;
      }
      if (serverProt)
        websocket._protocol = serverProt;
      const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
      if (secWebSocketExtensions !== undefined) {
        if (!perMessageDeflate) {
          const message = "Server sent a Sec-WebSocket-Extensions header but no extension " + "was requested";
          abortHandshake(websocket, socket, message);
          return;
        }
        let extensions;
        try {
          extensions = parse(secWebSocketExtensions);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket, socket, message);
          return;
        }
        const extensionNames = Object.keys(extensions);
        if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
          const message = "Server indicated an extension that was not requested";
          abortHandshake(websocket, socket, message);
          return;
        }
        try {
          perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket, socket, message);
          return;
        }
        websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
      }
      websocket.setSocket(socket, head, {
        allowSynchronousEvents: opts.allowSynchronousEvents,
        generateMask: opts.generateMask,
        maxBufferedChunks: opts.maxBufferedChunks,
        maxFragments: opts.maxFragments,
        maxPayload: opts.maxPayload,
        skipUTF8Validation: opts.skipUTF8Validation
      });
    });
    if (opts.finishRequest) {
      opts.finishRequest(req, websocket);
    } else {
      req.end();
    }
    return opts;
  }
  function emitErrorAndClose(websocket, err) {
    websocket._readyState = WebSocket.CLOSING;
    websocket._errorEmitted = true;
    websocket.emit("error", err);
    websocket.emitClose();
  }
  function netConnect(options) {
    options.path = options.socketPath;
    return net.connect(options);
  }
  function tlsConnect(options) {
    options.path = undefined;
    if (!options.servername && options.servername !== "") {
      options.servername = net.isIP(options.host) ? "" : options.host;
    }
    return tls.connect(options);
  }
  function abortHandshake(websocket, stream, message) {
    websocket._readyState = WebSocket.CLOSING;
    const err = new Error(message);
    Error.captureStackTrace(err, abortHandshake);
    if (stream.setHeader) {
      stream[kAborted] = true;
      stream.abort();
      if (stream.socket && !stream.socket.destroyed) {
        stream.socket.destroy();
      }
      process.nextTick(emitErrorAndClose, websocket, err);
    } else {
      stream.destroy(err);
      stream.once("error", websocket.emit.bind(websocket, "error"));
      stream.once("close", websocket.emitClose.bind(websocket));
    }
  }
  function sendAfterClose(websocket, data, cb) {
    if (data) {
      const length = isBlob(data) ? data.size : toBuffer(data).length;
      if (websocket._socket)
        websocket._sender._bufferedBytes += length;
      else
        websocket._bufferedAmount += length;
    }
    if (cb) {
      const err = new Error(`WebSocket is not open: readyState ${websocket.readyState} ` + `(${readyStates[websocket.readyState]})`);
      process.nextTick(cb, err);
    }
  }
  function receiverOnConclude(code, reason) {
    const websocket = this[kWebSocket];
    websocket._closeFrameReceived = true;
    websocket._closeCode = code;
    if (reason.length === 0) {
      websocket._closeMessage = EMPTY_BUFFER;
    } else {
      websocket._closeMessage = Buffer.allocUnsafeSlow(reason.length);
      websocket._closeMessage.set(reason);
    }
    if (websocket._socket[kWebSocket] === undefined)
      return;
    websocket._socket.removeListener("data", socketOnData);
    process.nextTick(resume, websocket._socket);
    if (code === 1005)
      websocket.close();
    else
      websocket.close(code, reason);
  }
  function receiverOnDrain() {
    const websocket = this[kWebSocket];
    if (!websocket.isPaused)
      websocket._socket.resume();
  }
  function receiverOnError(err) {
    const websocket = this[kWebSocket];
    if (websocket._socket[kWebSocket] !== undefined) {
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      websocket.close(err[kStatusCode]);
    }
    if (!websocket._errorEmitted) {
      websocket._errorEmitted = true;
      websocket.emit("error", err);
    }
  }
  function receiverOnFinish() {
    this[kWebSocket].emitClose();
  }
  function receiverOnMessage(data, isBinary) {
    this[kWebSocket].emit("message", data, isBinary);
  }
  function receiverOnPing(data) {
    const websocket = this[kWebSocket];
    if (websocket._autoPong && websocket.readyState === WebSocket.OPEN) {
      if (websocket._maxPendingAutoPongs > 0 && websocket._pendingAutoPongs >= websocket._maxPendingAutoPongs) {
        websocket.terminate();
      } else {
        websocket._pendingAutoPongs++;
        websocket.pong(data, !this._isServer, websocket._autoPongComplete);
      }
    }
    websocket.emit("ping", data);
  }
  function autoPongComplete(websocket) {
    websocket._pendingAutoPongs--;
  }
  function receiverOnPong(data) {
    this[kWebSocket].emit("pong", data);
  }
  function resume(stream) {
    stream.resume();
  }
  function senderOnError(err) {
    const websocket = this[kWebSocket];
    if (websocket.readyState === WebSocket.CLOSED)
      return;
    if (websocket.readyState === WebSocket.OPEN) {
      websocket._readyState = WebSocket.CLOSING;
      setCloseTimer(websocket);
    }
    this._socket.end();
    if (!websocket._errorEmitted) {
      websocket._errorEmitted = true;
      websocket.emit("error", err);
    }
  }
  function setCloseTimer(websocket) {
    websocket._closeTimer = setTimeout(websocket._socket.destroy.bind(websocket._socket), websocket._closeTimeout);
  }
  function socketOnClose() {
    const websocket = this[kWebSocket];
    this.removeListener("close", socketOnClose);
    this.removeListener("data", socketOnData);
    this.removeListener("end", socketOnEnd);
    websocket._readyState = WebSocket.CLOSING;
    if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
      const chunk = this.read(this._readableState.length);
      websocket._receiver.write(chunk);
    }
    websocket._receiver.end();
    this[kWebSocket] = undefined;
    clearTimeout(websocket._closeTimer);
    if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
      websocket.emitClose();
    } else {
      websocket._receiver.on("error", receiverOnFinish);
      websocket._receiver.on("finish", receiverOnFinish);
    }
  }
  function socketOnData(chunk) {
    if (!this[kWebSocket]._receiver.write(chunk)) {
      this.pause();
    }
  }
  function socketOnEnd() {
    const websocket = this[kWebSocket];
    websocket._readyState = WebSocket.CLOSING;
    websocket._receiver.end();
    this.end();
  }
  function socketOnError() {
    const websocket = this[kWebSocket];
    this.removeListener("error", socketOnError);
    this.on("error", NOOP);
    if (websocket) {
      websocket._readyState = WebSocket.CLOSING;
      this.destroy();
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS(function(exports, module) {
  var WebSocket = require_websocket();
  var { Duplex } = __require("stream");
  function emitClose(stream) {
    stream.emit("close");
  }
  function duplexOnEnd() {
    if (!this.destroyed && this._writableState.finished) {
      this.destroy();
    }
  }
  function duplexOnError(err) {
    this.removeListener("error", duplexOnError);
    this.destroy();
    if (this.listenerCount("error") === 0) {
      this.emit("error", err);
    }
  }
  function createWebSocketStream(ws, options) {
    let terminateOnDestroy = true;
    const duplex = new Duplex({
      ...options,
      autoDestroy: false,
      emitClose: false,
      objectMode: false,
      writableObjectMode: false
    });
    ws.on("message", function message(msg, isBinary) {
      const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
      if (!duplex.push(data))
        ws.pause();
    });
    ws.once("error", function error(err) {
      if (duplex.destroyed)
        return;
      terminateOnDestroy = false;
      duplex.destroy(err);
    });
    ws.once("close", function close() {
      if (duplex.destroyed)
        return;
      duplex.push(null);
    });
    duplex._destroy = function(err, callback) {
      if (ws.readyState === ws.CLOSED) {
        callback(err);
        process.nextTick(emitClose, duplex);
        return;
      }
      let called = false;
      ws.once("error", function error(err) {
        called = true;
        callback(err);
      });
      ws.once("close", function close() {
        if (!called)
          callback(err);
        process.nextTick(emitClose, duplex);
      });
      if (terminateOnDestroy)
        ws.terminate();
    };
    duplex._final = function(callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._final(callback);
        });
        return;
      }
      if (ws._socket === null)
        return;
      if (ws._socket._writableState.finished) {
        callback();
        if (duplex._readableState.endEmitted)
          duplex.destroy();
      } else {
        ws._socket.once("finish", function finish() {
          callback();
        });
        ws.close();
      }
    };
    duplex._read = function() {
      if (ws.isPaused)
        ws.resume();
    };
    duplex._write = function(chunk, encoding, callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._write(chunk, encoding, callback);
        });
        return;
      }
      ws.send(chunk, callback);
    };
    duplex.on("end", duplexOnEnd);
    duplex.on("error", duplexOnError);
    return duplex;
  }
  module.exports = createWebSocketStream;
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS(function(exports, module) {
  var { tokenChars } = require_validation();
  function parse(header) {
    const protocols = new Set;
    let start = -1;
    let end = -1;
    let i = 0;
    for (i;i < header.length; i++) {
      const code = header.charCodeAt(i);
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1)
          start = i;
      } else if (i !== 0 && (code === 32 || code === 9)) {
        if (end === -1 && start !== -1)
          end = i;
      } else if (code === 44) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (end === -1)
          end = i;
        const protocol = header.slice(start, end);
        if (protocols.has(protocol)) {
          throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
        }
        protocols.add(protocol);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
    if (start === -1 || end !== -1) {
      throw new SyntaxError("Unexpected end of input");
    }
    const protocol = header.slice(start, i);
    if (protocols.has(protocol)) {
      throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
    }
    protocols.add(protocol);
    return protocols;
  }
  module.exports = { parse };
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS(function(exports, module) {
  var EventEmitter = __require("events");
  var http = __require("http");
  var { Duplex } = __require("stream");
  var { createHash } = __require("crypto");
  var extension = require_extension();
  var PerMessageDeflate = require_permessage_deflate();
  var subprotocol = require_subprotocol();
  var WebSocket = require_websocket();
  var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
  var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
  var RUNNING = 0;
  var CLOSING = 1;
  var CLOSED = 2;

  class WebSocketServer extends EventEmitter {
    constructor(options, callback) {
      super();
      options = {
        allowSynchronousEvents: true,
        autoPong: true,
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        maxPendingAutoPongs: 60,
        skipUTF8Validation: false,
        perMessageDeflate: false,
        handleProtocols: null,
        clientTracking: true,
        closeTimeout: CLOSE_TIMEOUT,
        verifyClient: null,
        noServer: false,
        backlog: null,
        server: null,
        host: null,
        path: null,
        port: null,
        WebSocket,
        ...options
      };
      if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
        throw new TypeError('One and only one of the "port", "server", or "noServer" options ' + "must be specified");
      }
      if (options.port != null) {
        this._server = http.createServer((req, res) => {
          const body = http.STATUS_CODES[426];
          res.writeHead(426, {
            "Content-Length": body.length,
            "Content-Type": "text/plain"
          });
          res.end(body);
        });
        this._server.listen(options.port, options.host, options.backlog, callback);
      } else if (options.server) {
        this._server = options.server;
      }
      if (this._server) {
        const emitConnection = this.emit.bind(this, "connection");
        this._removeListeners = addListeners(this._server, {
          listening: this.emit.bind(this, "listening"),
          error: this.emit.bind(this, "error"),
          upgrade: (req, socket, head) => {
            this.handleUpgrade(req, socket, head, emitConnection);
          }
        });
      }
      if (options.perMessageDeflate === true)
        options.perMessageDeflate = {};
      if (options.clientTracking) {
        this.clients = new Set;
        this._shouldEmitClose = false;
      }
      this.options = options;
      this._state = RUNNING;
    }
    address() {
      if (this.options.noServer) {
        throw new Error('The server is operating in "noServer" mode');
      }
      if (!this._server)
        return null;
      return this._server.address();
    }
    close(cb) {
      if (this._state === CLOSED) {
        if (cb) {
          this.once("close", () => {
            cb(new Error("The server is not running"));
          });
        }
        process.nextTick(emitClose, this);
        return;
      }
      if (cb)
        this.once("close", cb);
      if (this._state === CLOSING)
        return;
      this._state = CLOSING;
      if (this.options.noServer || this.options.server) {
        if (this._server) {
          this._removeListeners();
          this._removeListeners = this._server = null;
        }
        if (this.clients) {
          if (!this.clients.size) {
            process.nextTick(emitClose, this);
          } else {
            this._shouldEmitClose = true;
          }
        } else {
          process.nextTick(emitClose, this);
        }
      } else {
        const server = this._server;
        this._removeListeners();
        this._removeListeners = this._server = null;
        server.close(() => {
          emitClose(this);
        });
      }
    }
    shouldHandle(req) {
      if (this.options.path) {
        const index = req.url.indexOf("?");
        const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
        if (pathname !== this.options.path)
          return false;
      }
      return true;
    }
    handleUpgrade(req, socket, head, cb) {
      socket.on("error", socketOnError);
      const key = req.headers["sec-websocket-key"];
      const upgrade = req.headers.upgrade;
      const version = +req.headers["sec-websocket-version"];
      if (req.method !== "GET") {
        const message = "Invalid HTTP method";
        abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
        return;
      }
      if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
        const message = "Invalid Upgrade header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (key === undefined || !keyRegex.test(key)) {
        const message = "Missing or invalid Sec-WebSocket-Key header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (version !== 13 && version !== 8) {
        const message = "Missing or invalid Sec-WebSocket-Version header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
          "Sec-WebSocket-Version": "13, 8"
        });
        return;
      }
      if (!this.shouldHandle(req)) {
        abortHandshake(socket, 400);
        return;
      }
      const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
      let protocols = new Set;
      if (secWebSocketProtocol !== undefined) {
        try {
          protocols = subprotocol.parse(secWebSocketProtocol);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Protocol header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
      const extensions = {};
      if (this.options.perMessageDeflate && secWebSocketExtensions !== undefined) {
        const perMessageDeflate = new PerMessageDeflate({
          ...this.options.perMessageDeflate,
          isServer: true,
          maxPayload: this.options.maxPayload
        });
        try {
          const offers = extension.parse(secWebSocketExtensions);
          if (offers[PerMessageDeflate.extensionName]) {
            perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
            extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
          }
        } catch (err) {
          const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      if (this.options.verifyClient) {
        const info = {
          origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
          secure: !!(req.socket.authorized || req.socket.encrypted),
          req
        };
        if (this.options.verifyClient.length === 2) {
          this.options.verifyClient(info, (verified, code, message, headers) => {
            if (!verified) {
              return abortHandshake(socket, code || 401, message, headers);
            }
            this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
          });
          return;
        }
        if (!this.options.verifyClient(info))
          return abortHandshake(socket, 401);
      }
      this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
    }
    completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
      if (!socket.readable || !socket.writable)
        return socket.destroy();
      if (socket[kWebSocket]) {
        throw new Error("server.handleUpgrade() was called more than once with the same " + "socket, possibly due to a misconfiguration");
      }
      if (this._state > RUNNING)
        return abortHandshake(socket, 503);
      const digest = createHash("sha1").update(key + GUID).digest("base64");
      const headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${digest}`
      ];
      const ws = new this.options.WebSocket(null, undefined, this.options);
      if (protocols.size) {
        const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
        if (protocol) {
          headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
          ws._protocol = protocol;
        }
      }
      if (extensions[PerMessageDeflate.extensionName]) {
        const params = extensions[PerMessageDeflate.extensionName].params;
        const value = extension.format({
          [PerMessageDeflate.extensionName]: [params]
        });
        headers.push(`Sec-WebSocket-Extensions: ${value}`);
        ws._extensions = extensions;
      }
      this.emit("headers", headers, req);
      socket.write(headers.concat(`\r
`).join(`\r
`));
      socket.removeListener("error", socketOnError);
      ws.setSocket(socket, head, {
        allowSynchronousEvents: this.options.allowSynchronousEvents,
        maxBufferedChunks: this.options.maxBufferedChunks,
        maxFragments: this.options.maxFragments,
        maxPayload: this.options.maxPayload,
        skipUTF8Validation: this.options.skipUTF8Validation
      });
      if (this.clients) {
        this.clients.add(ws);
        ws.on("close", () => {
          this.clients.delete(ws);
          if (this._shouldEmitClose && !this.clients.size) {
            process.nextTick(emitClose, this);
          }
        });
      }
      cb(ws, req);
    }
  }
  module.exports = WebSocketServer;
  function addListeners(server, map) {
    for (const event of Object.keys(map))
      server.on(event, map[event]);
    return function removeListeners() {
      for (const event of Object.keys(map)) {
        server.removeListener(event, map[event]);
      }
    };
  }
  function emitClose(server) {
    server._state = CLOSED;
    server.emit("close");
  }
  function socketOnError() {
    this.destroy();
  }
  function abortHandshake(socket, code, message, headers) {
    message = message || http.STATUS_CODES[code];
    headers = {
      Connection: "close",
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(message),
      ...headers
    };
    socket.once("finish", socket.destroy);
    socket.end(`HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join(`\r
`) + `\r
\r
` + message);
  }
  function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
    if (server.listenerCount("wsClientError")) {
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
      server.emit("wsClientError", err, socket, req);
    } else {
      abortHandshake(socket, code, message, headers);
    }
  }
});

// service/server.ts
import http from "node:http";
import os4 from "node:os";
import path4 from "node:path";
// node_modules/@openchamber/sdk/dist/scrollbar-style.js
var GUEST_SCROLLING_ATTRIBUTE = "data-oc-scrolling";
var GUEST_SCROLLBAR_CSS = `
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [${GUEST_SCROLLING_ATTRIBUTE}] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [${GUEST_SCROLLING_ATTRIBUTE}]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;
function installGuestScrollbarActivity(doc) {
  const root = doc.documentElement;
  if (root.hasAttribute("data-oc-scrollbar-activity"))
    return;
  root.setAttribute("data-oc-scrollbar-activity", "");
  const timers = new WeakMap;
  doc.addEventListener("scroll", (event) => {
    const target = event.target === doc ? root : event.target;
    if (!(target instanceof Element))
      return;
    if (!target.hasAttribute("data-oc-scrolling"))
      target.setAttribute("data-oc-scrolling", "");
    const pending = timers.get(target);
    if (pending !== undefined)
      clearTimeout(pending);
    timers.set(target, setTimeout(() => {
      timers.delete(target);
      target.removeAttribute("data-oc-scrolling");
    }, 1000));
  }, { capture: true, passive: true });
}
var GUEST_SCROLLBAR_SCRIPT = `(${installGuestScrollbarActivity.toString()})(document);`;
// node_modules/@openchamber/sdk/dist/manifest.js
var TRACKER_URL_TOKENS = ["{id}", "{segment}", "{segments+}"];
var TRACKER_URL_TOKEN_SET = new Set(TRACKER_URL_TOKENS);
// node_modules/@openchamber/sdk/dist/session-events.js
var GUEST_SESSION_EVENT_TYPES = [
  "turn-finished",
  "turn-failed",
  "permission-asked",
  "question-asked",
  "turn-started",
  "session-created",
  "session-archived",
  "session-deleted"
];
var SESSION_EVENTS_IDLE_MS = 10 * 60000;
var EVENT_TYPES = new Set(GUEST_SESSION_EVENT_TYPES);
// node_modules/@openchamber/sdk/dist/service-host.js
var SERVICE_HOST_PATH = "/service/call";
var OPENCHAMBER_HOST_CALLBACK_URL_ENV = "OPENCHAMBER_HOST_CALLBACK_URL";
var SERVICE_HOST_TIMEOUT_MS = 30000;
var SERVICE_SCHEDULE_IDLE_MS = 10 * 60000;
var MENTIONS_SEARCH_PATH = "/mentions/search";
var MENTIONS_RESOLVE_PATH = "/mentions/resolve";
var MENTIONS_IDLE_MS = 10 * 60000;
class ServiceHostError extends Error {
  code;
  status;
  constructor(message, code, status) {
    super(message);
    this.name = "ServiceHostError";
    this.code = code;
    this.status = status;
  }
}
var createServiceHost = ({ env }) => {
  const call = async (method, input) => {
    const base = env[OPENCHAMBER_HOST_CALLBACK_URL_ENV];
    const token = env.OPENCHAMBER_SERVICE_TOKEN;
    if (!base || !token)
      throw new ServiceHostError("This service was not started by OpenChamber.", "HOST_UNAVAILABLE", 0);
    let response;
    try {
      response = await fetch(`${base.replace(/\/+$/, "")}${SERVICE_HOST_PATH}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ method, input }),
        signal: AbortSignal.timeout(SERVICE_HOST_TIMEOUT_MS)
      });
    } catch {
      throw new ServiceHostError("OpenChamber did not answer.", "HOST_UNAVAILABLE", 0);
    }
    const body = await response.json().catch(() => null);
    if (response.ok && body?.result !== undefined)
      return body.result;
    throw new ServiceHostError(body?.error?.message ?? `OpenChamber answered HTTP ${response.status}.`, body?.error?.code ?? "HOST_UNAVAILABLE", response.status);
  };
  return {
    sessions: {
      start: (input) => call("sessions.start", input),
      send: (sessionId, prompt) => call("sessions.send", { sessionId, prompt }),
      retry: (sessionId) => call("sessions.retry", { sessionId }),
      status: (sessionId) => call("sessions.status", { sessionId }),
      lastReply: (sessionId) => call("sessions.lastReply", { sessionId }),
      stop: (sessionId) => call("sessions.stop", { sessionId }),
      answerPermission: (sessionId, requestId, answer) => call("sessions.answerPermission", { sessionId, requestId, ...answer }),
      answerForm: (sessionId, formId, values, message) => call("sessions.answerForm", { sessionId, formId, values, ...message === undefined ? {} : { message } })
    },
    setInstructions: (directory, text) => call("instructions.set", { directory, text }),
    emit: (topic, data) => call("panels.emit", { topic, data }),
    readSettings: () => call("settings.read", {}).then(({ settings }) => settings),
    needsConfiguration: (message) => call("status.set", { needsConfiguration: message })
  };
};
// node_modules/@openchamber/sdk/dist/file-editor.js
var patternExpressions = new Map;
// node_modules/@openchamber/sdk/dist/contract.js
var GUEST_FILE_STAT_KINDS = ["file", "directory", "other", "missing"];
var GUEST_GENERATE_LATE_KEEP_MS = 60 * 60000;
var HOST_REQUEST_ERROR_CODES = [
  "HOST_UNAVAILABLE",
  "HOST_TIMEOUT",
  "HOST_REJECTED",
  "DISCONNECTED",
  "DISABLED",
  "BAD_PATH",
  "NO_INTEGRATION",
  "NO_SERVICE",
  "SERVICE_FAILED",
  "REQUEST_FAILED",
  "RESPONSE_TOO_LARGE",
  "NO_SESSION",
  "SESSION_BUSY",
  "NOT_GRANTED",
  "NO_DIRECTORY",
  "NOT_FOUND",
  "FILE_TOO_LARGE",
  "DENIED",
  "NO_MODEL",
  "MODEL_FAILED",
  "UNSUPPORTED"
];
var SERVICE_STATUS_VALUES = ["stopped", "starting", "ready", "failed"];
var hostRequestErrorCodeSet = new Set(HOST_REQUEST_ERROR_CODES);
var serviceStatusSet = new Set(SERVICE_STATUS_VALUES);
var fileStatKindSet = new Set(GUEST_FILE_STAT_KINDS);
var HOST_PUSH_TYPES = new Set([
  "workspace",
  "shells",
  "ready",
  "directory",
  "session",
  "connection",
  "settings",
  "session-lifecycle",
  "item",
  "resolve",
  "action",
  "service-event",
  "status-control-event",
  "popover-closed",
  "file-open",
  "file-snapshot",
  "file-saved",
  "generate-late"
]);
// node_modules/@openchamber/sdk/dist/service-providers.js
var BROWSER_PROVIDER_PATH = "/browser-control";
var BROWSER_CONTROL_ACTIONS = [
  "browser.open",
  "browser.snapshot",
  "browser.click",
  "browser.type",
  "browser.select",
  "browser.scroll",
  "browser.back",
  "browser.forward",
  "browser.inspect",
  "browser.capture",
  "browser.resize",
  "browser.close"
];
var BROWSER_PROVIDER_OPEN_TIMEOUT_MS = 45000;
var BROWSER_PROVIDER_ACTION_TIMEOUT_MS = 20000;
var BROWSER_PROVIDER_IDLE_MS = 10 * 60000;
var CONTROL_ACTIONS = new Set(BROWSER_CONTROL_ACTIONS);
var isBrowserControlAction = (value) => CONTROL_ACTIONS.has(value);
var readContext = (wire) => {
  const directory = wire?.directory;
  const sessionId = wire?.sessionId;
  return {
    directory: String(directory) === directory && directory.length > 0 ? directory : null,
    sessionId: String(sessionId) === sessionId && sessionId.length > 0 ? sessionId : null
  };
};
var readBrowserProviderRequest = (body) => {
  let wire;
  try {
    const parsed = JSON.parse(body);
    if (Object(parsed) !== parsed || parsed === null)
      return null;
    wire = parsed;
  } catch {
    return null;
  }
  const { requestId, action, parameters, context } = wire;
  if (String(requestId) !== requestId || requestId.length === 0)
    return null;
  if (String(action) !== action || !isBrowserControlAction(action))
    return null;
  if (Object(parameters) !== parameters)
    return null;
  return { requestId, action, parameters, context: readContext(context) };
};
var SOURCE_CONTROL_PROVIDER_IDLE_MS = 10 * 60000;
var OPENCHAMBER_SERVICE_DATA_DIR = "OPENCHAMBER_SERVICE_DATA_DIR";
var NOTIFICATIONS_PROVIDER_IDLE_MS = 10 * 60000;
var TRACKER_PROVIDER_IDLE_MS = 10 * 60000;
var QUOTA_PROVIDER_IDLE_MS = 10 * 60000;
// node_modules/@openchamber/sdk/dist/service-surface.js
var SURFACE_FRAME_PATH = "/surface/frame";
var SURFACE_INPUT_PATH = "/surface/input";
var SURFACE_CONTROL_PATH = "/surface/control";
var SURFACE_RESIZE_PATH = "/surface/resize";
var SURFACE_CLIPBOARD_PATH = "/surface/clipboard";
var SURFACE_SEQ_HEADER = "x-surface-seq";
var SURFACE_WIDTH_HEADER = "x-surface-width";
var SURFACE_HEIGHT_HEADER = "x-surface-height";
var SURFACE_TITLE_HEADER = "x-surface-title";
var SURFACE_AGENT_ACTIVE_HEADER = "x-surface-agent-active";
var SURFACE_FRAME_SEQ_HEADER = "x-surface-frame-seq";
var SURFACE_FRAME_WAIT_MS = 25000;
var SURFACE_FRAME_MAX_BYTES = 8000000;
var SURFACE_INPUT_BATCH_MAX = 256;
var SURFACE_TEXT_MAX = 64000;
var SURFACE_DIMENSION_MAX = 16384;
var SURFACE_CONTROLLERS = ["none", "agent", "user"];
var isFiniteNumber = (value) => Number(value) === value && Number.isFinite(value);
var isBool = (value) => value === true || value === false;
var isText = (value) => String(value) === value;
var readModifiers = (value) => {
  if (Object(value) !== value || value === null)
    return null;
  const wire = value;
  if (!isBool(wire.alt) || !isBool(wire.ctrl) || !isBool(wire.meta) || !isBool(wire.shift))
    return null;
  return { alt: wire.alt, ctrl: wire.ctrl, meta: wire.meta, shift: wire.shift };
};
var readEvent = (value) => {
  if (value.type === "text") {
    if (!isText(value.text) || value.text.length > SURFACE_TEXT_MAX)
      return null;
    return { type: "text", text: value.text };
  }
  const modifiers = readModifiers(value.modifiers);
  if (!modifiers)
    return null;
  if (value.type === "pointer") {
    if (value.action !== "down" && value.action !== "up" && value.action !== "move")
      return null;
    if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.button) || !isFiniteNumber(value.buttons))
      return null;
    return { type: "pointer", action: value.action, x: value.x, y: value.y, button: value.button, buttons: value.buttons, modifiers };
  }
  if (value.type === "wheel") {
    if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.deltaX) || !isFiniteNumber(value.deltaY))
      return null;
    return { type: "wheel", x: value.x, y: value.y, deltaX: value.deltaX, deltaY: value.deltaY, modifiers };
  }
  if (value.type === "key") {
    if (value.action !== "down" && value.action !== "up")
      return null;
    if (!isText(value.key) || !isText(value.code) || value.key.length > 64 || value.code.length > 64)
      return null;
    if (value.keyCode === undefined)
      return { type: "key", action: value.action, key: value.key, code: value.code, modifiers };
    if (!isFiniteNumber(value.keyCode) || !Number.isInteger(value.keyCode) || value.keyCode < 0 || value.keyCode > 255)
      return null;
    return { type: "key", action: value.action, key: value.key, code: value.code, keyCode: value.keyCode, modifiers };
  }
  return null;
};
var readSurfaceInputBatch = (body) => {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (Object(parsed) !== parsed || parsed === null || !Array.isArray(parsed.events))
    return null;
  if (parsed.events.length > SURFACE_INPUT_BATCH_MAX)
    return null;
  const events = [];
  for (const item of parsed.events) {
    if (Object(item) !== item || item === null)
      return null;
    const event = readEvent(item);
    if (!event)
      return null;
    events.push(event);
  }
  return { events };
};
var CONTROLLERS = new Set(SURFACE_CONTROLLERS);
var readSurfaceControlNotice = (body) => {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (Object(parsed) !== parsed || parsed === null)
    return null;
  const { controller, viewer } = parsed;
  if (!isText(controller) || !CONTROLLERS.has(controller))
    return null;
  const notice = { controller };
  if (controller === "user" && isText(viewer) && viewer.length > 0)
    notice.viewer = viewer;
  return notice;
};
var readSurfaceResizeRequest = (body) => {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (Object(parsed) !== parsed || parsed === null)
    return null;
  const { width, height } = parsed;
  if (!isFiniteNumber(width) || !isFiniteNumber(height))
    return null;
  if (width < 1 || height < 1 || width > SURFACE_DIMENSION_MAX || height > SURFACE_DIMENSION_MAX)
    return null;
  return { width: Math.round(width), height: Math.round(height) };
};
// service/browser-provider.ts
import fs2 from "node:fs";
import os2 from "node:os";
import path2 from "node:path";

// shared/types.ts
function asString(value, fallback = "") {
  if (typeof value === "string")
    return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value === null || value === undefined)
    return fallback;
  return JSON.stringify(value);
}
function sanitizeSessionName(raw) {
  const cleaned = raw.trim().replace(/[^A-Za-z0-9_-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/g, "");
  return cleaned || `session-${Date.now().toString(36)}`;
}
function nextAvailableSessionName(existing) {
  const used = new Set(existing);
  if (!used.has("default"))
    return "default";
  let idx = 2;
  while (used.has(`session-${idx}`)) {
    idx += 1;
  }
  return `session-${idx}`;
}
function normalizeNavigationUrl(raw, emptyFallback) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    if (emptyFallback !== undefined)
      return emptyFallback;
    throw new Error("Enter a URL to navigate");
  }
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    throw new Error("Unsupported URL scheme");
  }
  if (/^about:/i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  const hostPart = trimmed.split(/[/?#]/, 1)[0] ?? "";
  const isLocalHost = /^(?:localhost|(?:[a-zA-Z0-9-]+\.)*localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(?::\d+)?$/i.test(hostPart);
  return `${isLocalHost ? "http" : "https"}://${trimmed}`;
}

// service/daemon-client.ts
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
function buildAgentBrowserEnv(baseEnv = process.env) {
  const home = baseEnv.HOME || os.homedir();
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const runtimeCandidate = baseEnv.XDG_RUNTIME_DIR || (uid !== null ? `/run/user/${uid}` : "");
  const xdgRuntimeDir = runtimeCandidate && fs.existsSync(runtimeCandidate) ? runtimeCandidate : undefined;
  const extraPaths = [
    path.join(home, ".local", "share", "mise", "shims"),
    path.join(home, ".local", "bin"),
    path.join(home, ".cargo", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin"
  ];
  const existingParts = (baseEnv.PATH ?? "").split(path.delimiter).filter(Boolean);
  const mergedPath = [...new Set([...existingParts, ...extraPaths])].join(path.delimiter);
  return {
    ...baseEnv,
    HOME: home,
    PATH: mergedPath,
    ...xdgRuntimeDir ? { XDG_RUNTIME_DIR: xdgRuntimeDir } : {}
  };
}
function resolveCandidateSocketDirs(baseEnv = process.env) {
  const env = buildAgentBrowserEnv(baseEnv);
  const candidates = [];
  if (env.AGENT_BROWSER_SOCKET_DIR) {
    candidates.push(env.AGENT_BROWSER_SOCKET_DIR);
  }
  if (env.XDG_RUNTIME_DIR) {
    candidates.push(path.join(env.XDG_RUNTIME_DIR, "agent-browser"));
  }
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  if (uid !== null) {
    candidates.push(`/run/user/${uid}/agent-browser`);
  }
  const home = env.HOME || os.homedir();
  if (home) {
    candidates.push(path.join(home, ".agent-browser"));
  }
  candidates.push(path.join(os.tmpdir(), "agent-browser"));
  const roots = [...new Set(candidates)];
  const expanded = [];
  for (const root of roots) {
    expanded.push(root);
    const nsDir = path.join(root, "namespaces");
    try {
      if (fs.existsSync(nsDir) && fs.statSync(nsDir).isDirectory()) {
        for (const entry of fs.readdirSync(nsDir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            const runDir = path.join(nsDir, entry.name, "run");
            if (fs.existsSync(runDir)) {
              expanded.push(runDir);
            }
          }
        }
      }
    } catch {}
  }
  return [...new Set(expanded)];
}
function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0)
    return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = err.code;
    return code === "EPERM";
  }
}
function readSmallTrimmedFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
}
function discoverDaemonSessions(baseEnv = process.env) {
  const dirs = resolveCandidateSocketDirs(baseEnv);
  const byName = new Map;
  for (const dir of dirs) {
    let entries;
    try {
      if (!fs.existsSync(dir))
        continue;
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".stream"))
        continue;
      const session = entry.name.slice(0, -".stream".length);
      if (!session || session === "dashboard" || byName.has(session))
        continue;
      const streamRaw = readSmallTrimmedFile(path.join(dir, entry.name));
      const pidRaw = readSmallTrimmedFile(path.join(dir, `${session}.pid`));
      const streamPort = Number(streamRaw);
      const pid = Number(pidRaw);
      if (!Number.isInteger(streamPort) || streamPort <= 0 || streamPort > 65535)
        continue;
      if (!isPidAlive(pid))
        continue;
      const sockPath = path.join(dir, `${session}.sock`);
      const engine = readSmallTrimmedFile(path.join(dir, `${session}.engine`)) || "chrome";
      const provider = readSmallTrimmedFile(path.join(dir, `${session}.provider`)) || null;
      byName.set(session, {
        session,
        socketDir: dir,
        sockPath,
        streamPort,
        pid,
        engine,
        provider: provider || null
      });
    }
  }
  return [...byName.values()].sort((a, b) => {
    if (a.session === "default")
      return -1;
    if (b.session === "default")
      return 1;
    return a.session.localeCompare(b.session);
  });
}
function sendDaemonSocketCommand(sockPath, action, params = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const id = `oc-${crypto.randomUUID().slice(0, 8)}`;
    const payload = `${JSON.stringify({ id, action, ...params })}
`;
    const socket = net.createConnection({ path: sockPath });
    let settled = false;
    let buffer = "";
    const finish = (fn) => {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => reject(new Error(`Daemon command "${action}" timed out after ${timeoutMs}ms`)));
    }, timeoutMs);
    socket.setEncoding("utf8");
    socket.once("connect", () => {
      socket.write(payload);
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf(`
`);
      if (newlineIndex === -1)
        return;
      const line = buffer.slice(0, newlineIndex).trim();
      finish(() => {
        try {
          const parsed = JSON.parse(line);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Malformed daemon JSON response for "${action}": ${String(err)}`));
        }
      });
    });
    socket.once("error", (err) => {
      finish(() => reject(err));
    });
    socket.once("end", () => {
      if (!settled) {
        const trimmed = buffer.trim();
        if (trimmed) {
          finish(() => {
            try {
              resolve(JSON.parse(trimmed));
            } catch (err) {
              reject(new Error(`Incomplete daemon response for "${action}": ${String(err)}`));
            }
          });
        } else {
          finish(() => reject(new Error(`Daemon closed socket before answering "${action}"`)));
        }
      }
    });
  });
}
function extractAgentBrowserCliError(res) {
  let parsed = null;
  if (res.stdout) {
    try {
      const candidate = JSON.parse(res.stdout);
      if (candidate && typeof candidate === "object") {
        parsed = candidate;
      }
    } catch {}
  }
  if (parsed?.success === false) {
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    return res.stderr || "agent-browser command failed";
  }
  if (res.exitCode !== 0) {
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    return res.stderr || res.stdout || `agent-browser exited with code ${res.exitCode ?? "unknown"}`;
  }
  return null;
}
function execAgentBrowserCli(args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 25000;
  const env = buildAgentBrowserEnv(options.baseEnv);
  delete env.AGENT_BROWSER_STREAM_PORT;
  delete env.AGENT_BROWSER_DASHBOARD_ALLOWED_ORIGINS;
  return new Promise((resolve, reject) => {
    const child = spawn("agent-browser", args, {
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let finished = false;
    let killEscalationTimer = null;
    const clearTimers = () => {
      clearTimeout(timer);
      if (killEscalationTimer) {
        clearTimeout(killEscalationTimer);
        killEscalationTimer = null;
      }
    };
    const timer = setTimeout(() => {
      if (finished)
        return;
      finished = true;
      child.kill("SIGTERM");
      killEscalationTimer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {}
      }, 1500);
      killEscalationTimer.unref?.();
      reject(new Error(`agent-browser ${args.join(" ")} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (stdout.length < 2000000)
        stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 200000)
        stderr += chunk;
    });
    child.once("error", (err) => {
      if (finished)
        return;
      finished = true;
      clearTimers();
      reject(err);
    });
    child.once("close", (code) => {
      if (finished)
        return;
      finished = true;
      clearTimers();
      resolve({ exitCode: code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}
async function checkDashboardServer(baseEnv = process.env, fallbackPort = 4848) {
  let port = fallbackPort;
  for (const dir of resolveCandidateSocketDirs(baseEnv)) {
    const cfgRaw = readSmallTrimmedFile(path.join(dir, "dashboard.config"));
    const pidRaw = readSmallTrimmedFile(path.join(dir, "dashboard.pid"));
    if (cfgRaw && pidRaw && isPidAlive(Number(pidRaw))) {
      try {
        const cfg = JSON.parse(cfgRaw);
        if (typeof cfg.port === "number" && cfg.port > 0 && cfg.port <= 65535) {
          port = cfg.port;
        }
      } catch {}
      break;
    }
  }
  const origin = `http://127.0.0.1:${port}`;
  try {
    const res = await fetch(`${origin}/api/sessions`, {
      headers: { Origin: origin },
      signal: AbortSignal.timeout(1200)
    });
    return {
      running: res.ok,
      port,
      url: `http://localhost:${port}`
    };
  } catch {
    return {
      running: false,
      port,
      url: `http://localhost:${port}`
    };
  }
}
async function ensureDashboardRunning(port = 4848, baseEnv = process.env) {
  const existing = await checkDashboardServer(baseEnv, port);
  if (existing.running)
    return existing;
  try {
    await execAgentBrowserCli(["dashboard", "start", "--port", String(port)], {
      timeoutMs: 1e4,
      baseEnv
    });
  } catch (err) {
    return {
      running: false,
      port,
      url: `http://localhost:${port}`,
      error: err instanceof Error ? err.message : String(err)
    };
  }
  for (let i = 0;i < 10; i += 1) {
    const check = await checkDashboardServer(baseEnv, port);
    if (check.running)
      return check;
    await new Promise((r) => setTimeout(r, 150));
  }
  return {
    running: false,
    port,
    url: `http://localhost:${port}`,
    error: `Dashboard did not respond on http://127.0.0.1:${port}`
  };
}

// service/browser-provider.ts
var PRESET_DIMENSIONS = {
  mobile: { width: 390, height: 844, mobile: true },
  tablet: { width: 768, height: 1024, mobile: false },
  desktop: { width: 1280, height: 800, mobile: false }
};

class AgentBrowserOpenChamberProvider {
  scopes = new Map;
  hooks;
  constructor(hooks) {
    this.hooks = hooks;
  }
  sessionNameForContext(ctx) {
    if (ctx.sessionId) {
      const clean = ctx.sessionId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16);
      return clean ? `oc-${clean}` : "default";
    }
    return "default";
  }
  getScopeMeta(session) {
    let meta = this.scopes.get(session);
    if (!meta) {
      meta = {
        viewport: { mode: "desktop", width: 1280, height: 800 },
        openedTabs: [],
        initialized: false
      };
      this.scopes.set(session, meta);
    }
    return meta;
  }
  findDaemon(session) {
    return discoverDaemonSessions().find((item) => item.session === session) ?? null;
  }
  async ensureDaemon(session, initialUrl = "about:blank") {
    const existing = this.findDaemon(session);
    if (existing)
      return existing;
    try {
      const cliRes = await execAgentBrowserCli(["--session", session, "open", initialUrl, "--json"], {
        timeoutMs: 30000
      });
      const cliErr = extractAgentBrowserCliError(cliRes);
      if (cliErr) {
        throw new Error(cliErr);
      }
      const launched = this.findDaemon(session);
      if (!launched) {
        throw new Error(`Failed to start agent-browser daemon for session "${session}"`);
      }
      const meta = this.getScopeMeta(session);
      meta.initialized = initialUrl !== "about:blank";
      return launched;
    } catch (err) {
      const orphan = this.findDaemon(session);
      if (orphan) {
        await sendDaemonSocketCommand(orphan.sockPath, "close", {}, 1500).catch(() => {
          try {
            process.kill(orphan.pid, "SIGTERM");
          } catch {}
        });
      } else {
        await execAgentBrowserCli(["--session", session, "close"], {
          timeoutMs: 1500
        }).catch(() => {});
      }
      throw err;
    }
  }
  async listTabs(sockPath) {
    const res = await sendDaemonSocketCommand(sockPath, "tab_list");
    if (!res.success || !Array.isArray(res.data?.tabs))
      return [];
    return res.data.tabs.map((tab, idx) => ({
      id: asString(tab.tabId, `t${idx + 1}`),
      title: asString(tab.title),
      url: asString(tab.url),
      active: Boolean(tab.active)
    }));
  }
  async switchIfTabRequested(sockPath, tabId) {
    if (!tabId)
      return null;
    const tabs = await this.listTabs(sockPath);
    if (tabs.length === 0 || !tabs.some((t) => t.id === tabId)) {
      return `Unknown tabId "${tabId}". Run browser.snapshot to see open tab ids.`;
    }
    const active = tabs.find((t) => t.active);
    if (active?.id !== tabId) {
      const sw = await sendDaemonSocketCommand(sockPath, "tab_switch", {
        tabId
      });
      if (!sw.success) {
        return sw.error || `Could not switch to tab "${tabId}"`;
      }
    }
    return null;
  }
  async evalJson(sockPath, expression) {
    const res = await sendDaemonSocketCommand(sockPath, "evaluate", {
      script: expression
    });
    if (!res.success) {
      throw new Error(res.error || "Page script evaluation failed");
    }
    return res.data?.result;
  }
  async handleRequest(req) {
    const deadlineMs = req.action === "browser.open" ? BROWSER_PROVIDER_OPEN_TIMEOUT_MS - 2000 : BROWSER_PROVIDER_ACTION_TIMEOUT_MS - 2000;
    return Promise.race([
      this.executeAction(req),
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: false,
            error: `${req.action} exceeded ${Math.round(deadlineMs / 1000)}s deadline; check if the page is stalled.`
          });
        }, deadlineMs);
      })
    ]);
  }
  async executeAction(req) {
    const session = this.sessionNameForContext(req.context);
    if (this.hooks.isSessionUserControlled(session)) {
      return {
        ok: false,
        error: `The user currently controls the browser surface for session "${session}". Wait for them to hand control back or ask first.`
      };
    }
    this.hooks.markAgentActive(session);
    const meta = this.getScopeMeta(session);
    try {
      if (req.action === "browser.open") {
        const { url, viewport, tabId } = req.parameters;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          return {
            ok: false,
            error: "URL must start with http:// or https://"
          };
        }
        const existing = this.findDaemon(session);
        let daemon;
        let resolvedTabId;
        if (!existing) {
          daemon = await this.ensureDaemon(session, url);
          const tabs = await this.listTabs(daemon.sockPath);
          resolvedTabId = tabs.find((t) => t.active)?.id ?? tabs[0]?.id;
          if (resolvedTabId)
            meta.openedTabs.push(resolvedTabId);
        } else {
          daemon = existing;
          if (tabId) {
            const tabErr = await this.switchIfTabRequested(daemon.sockPath, tabId);
            if (tabErr)
              return { ok: false, error: tabErr };
            const nav = await sendDaemonSocketCommand(daemon.sockPath, "navigate", { url }, 35000);
            if (!nav.success)
              return { ok: false, error: nav.error || `Failed to open ${url}` };
            resolvedTabId = tabId;
          } else {
            const currentTabs = await this.listTabs(daemon.sockPath);
            if (currentTabs.length === 1 && currentTabs[0]?.url === "about:blank" && !meta.initialized) {
              const nav = await sendDaemonSocketCommand(daemon.sockPath, "navigate", { url }, 35000);
              if (!nav.success)
                return {
                  ok: false,
                  error: nav.error || `Failed to open ${url}`
                };
              meta.initialized = true;
              resolvedTabId = currentTabs[0].id;
              meta.openedTabs.push(resolvedTabId);
            } else {
              const created = await sendDaemonSocketCommand(daemon.sockPath, "tab_new", { url }, 35000);
              if (!created.success) {
                return {
                  ok: false,
                  error: created.error || `Failed to open new tab for ${url}`
                };
              }
              const updatedTabs = await this.listTabs(daemon.sockPath);
              resolvedTabId = created.data?.tabId ?? updatedTabs.find((t) => t.active)?.id ?? updatedTabs.at(-1)?.id;
              if (resolvedTabId)
                meta.openedTabs.push(resolvedTabId);
            }
          }
        }
        if (viewport) {
          await this.applyViewportPreset(daemon.sockPath, meta, viewport);
        }
        const pageInfo = await this.evalJson(daemon.sockPath, `({ url: location.href, title: document.title || '', readyState: document.readyState })`);
        this.hooks.onSessionTouched(session, { follow: true });
        const openData = {
          ...resolvedTabId ? { tabId: resolvedTabId } : {},
          session,
          url: pageInfo.url || url,
          title: pageInfo.title || "",
          opened: true,
          settled: pageInfo.readyState === "complete",
          viewport: meta.viewport
        };
        return {
          ok: true,
          data: openData
        };
      }
      const daemon = this.findDaemon(session);
      if (!daemon) {
        const activeOthers = discoverDaemonSessions().map((d) => d.session).filter((name) => name !== session);
        const otherHint = activeOthers.length > 0 ? ` Active panel/CLI agent-browser sessions (${activeOthers.join(", ")}) are separate from this chat's openchamber_web scope ("${session}") and can be inspected via agent-browser CLI.` : "";
        return {
          ok: false,
          error: `No browser page is open yet for session "${session}". Call browser.open with an http(s) URL first.${otherHint}`
        };
      }
      if (req.action === "browser.close") {
        const tabs = await this.listTabs(daemon.sockPath);
        const targetTab = req.parameters.tabId ?? meta.openedTabs.at(-1);
        if (!targetTab || !tabs.some((t) => t.id === targetTab)) {
          return { ok: false, error: "No matching agent-opened tab to close." };
        }
        if (tabs.length <= 1) {
          await sendDaemonSocketCommand(daemon.sockPath, "close");
          this.scopes.delete(session);
          this.hooks.onSessionTouched(session);
          const closeData = {
            closed: true,
            tabId: targetTab,
            session
          };
          return { ok: true, data: closeData };
        }
        const closed = await sendDaemonSocketCommand(daemon.sockPath, "tab_close", { tabId: targetTab });
        if (!closed.success) {
          return {
            ok: false,
            error: closed.error || `Could not close tab "${targetTab}"`
          };
        }
        meta.openedTabs = meta.openedTabs.filter((id) => id !== targetTab);
        this.hooks.onSessionTouched(session);
        const closeData = {
          closed: true,
          tabId: targetTab,
          session
        };
        return { ok: true, data: closeData };
      }
      const tabErr = await this.switchIfTabRequested(daemon.sockPath, req.parameters.tabId);
      if (tabErr)
        return { ok: false, error: tabErr };
      if (req.action === "browser.resize") {
        await this.applyViewportPreset(daemon.sockPath, meta, req.parameters.viewport);
        this.hooks.onSessionTouched(session);
        return { ok: true, data: { viewport: meta.viewport } };
      }
      if (req.action === "browser.back" || req.action === "browser.forward") {
        const navAction = req.action === "browser.back" ? "back" : "forward";
        const res = await sendDaemonSocketCommand(daemon.sockPath, navAction);
        if (!res.success)
          return { ok: false, error: res.error || `Cannot go ${navAction}` };
        const info = await this.evalJson(daemon.sockPath, `({ url: location.href, title: document.title || '' })`);
        this.hooks.onSessionTouched(session);
        return { ok: true, data: { url: info.url, title: info.title } };
      }
      if (req.action === "browser.snapshot") {
        const tabs = await this.listTabs(daemon.sockPath);
        const problems = this.hooks.getConsoleProblems(session);
        const snap = await this.evalJson(daemon.sockPath, buildProviderSnapshotScript(req.parameters.selector));
        this.hooks.onSessionTouched(session);
        const snapData = {
          ...snap,
          session,
          viewport: meta.viewport,
          ...problems.length > 0 ? { consoleProblems: [...problems] } : {},
          ...tabs.length > 0 ? { tabs } : {}
        };
        return {
          ok: true,
          data: snapData
        };
      }
      if (req.action === "browser.click") {
        const { selector, text } = req.parameters;
        const resolved = await this.evalJson(daemon.sockPath, buildResolveClickTargetScript(selector, text));
        if (!resolved.ok || !resolved.selector) {
          return {
            ok: false,
            error: resolved.error || "No matching clickable element found"
          };
        }
        const clicked = await sendDaemonSocketCommand(daemon.sockPath, "click", { selector: resolved.selector });
        if (!clicked.success) {
          return {
            ok: false,
            error: clicked.error || `Could not click ${resolved.selector}`
          };
        }
        const urlRes = await sendDaemonSocketCommand(daemon.sockPath, "url");
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            clicked: resolved.selector,
            label: resolved.label || resolved.selector,
            url: String(urlRes.data?.url ?? "")
          }
        };
      }
      if (req.action === "browser.type") {
        const { selector, value, submit } = req.parameters;
        const filled = await sendDaemonSocketCommand(daemon.sockPath, "fill", {
          selector,
          value
        });
        if (!filled.success) {
          return {
            ok: false,
            error: filled.error || `No editable element matches ${selector}`
          };
        }
        if (submit) {
          await sendDaemonSocketCommand(daemon.sockPath, "press", {
            key: "Enter"
          });
        }
        const urlRes = await sendDaemonSocketCommand(daemon.sockPath, "url");
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            selector,
            url: String(urlRes.data?.url ?? "")
          }
        };
      }
      if (req.action === "browser.select") {
        const { selector } = req.parameters;
        const byLabel = "label" in req.parameters ? req.parameters.label : undefined;
        const byValue = "value" in req.parameters ? req.parameters.value : undefined;
        const selected = await this.evalJson(daemon.sockPath, buildStrictNativeSelectScript(selector, byLabel, byValue));
        if (!selected.ok) {
          return {
            ok: false,
            error: selected.error || `Cannot select option on ${selector}`
          };
        }
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            selector,
            label: selected.label ?? "",
            value: selected.value ?? "",
            url: selected.url ?? ""
          }
        };
      }
      if (req.action === "browser.scroll") {
        const { selector, direction } = req.parameters;
        const scrolled = await this.evalJson(daemon.sockPath, buildScrollScript(selector, direction));
        if (!scrolled.ok) {
          return {
            ok: false,
            error: scrolled.error || "Scroll target not found"
          };
        }
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            scrollY: scrolled.scrollY ?? 0,
            maxScrollY: scrolled.maxScrollY ?? 0,
            atTop: Boolean(scrolled.atTop),
            atBottom: Boolean(scrolled.atBottom),
            ...scrolled.scrolledTo ? { scrolledTo: scrolled.scrolledTo } : {},
            ...direction ? { direction } : {}
          }
        };
      }
      if (req.action === "browser.inspect") {
        const { selector } = req.parameters;
        const inspected = await this.evalJson(daemon.sockPath, buildInspectScript(selector));
        if (!inspected.ok || !inspected.bounds || !inspected.styles) {
          return {
            ok: false,
            error: inspected.error || `No element matches ${selector}`
          };
        }
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            selector,
            tag: inspected.tag ?? "div",
            label: inspected.label ?? "",
            bounds: inspected.bounds,
            inViewport: Boolean(inspected.inViewport),
            styles: inspected.styles
          }
        };
      }
      if (req.action === "browser.capture") {
        const captureDir = path2.join(this.hooks.dataDir || os2.tmpdir(), "captures");
        fs2.mkdirSync(captureDir, { recursive: true });
        const filePath = path2.join(captureDir, `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`);
        const shot = await sendDaemonSocketCommand(daemon.sockPath, "screenshot", {
          path: filePath,
          format: "png"
        });
        if (!shot.success) {
          return {
            ok: false,
            error: shot.error || "Failed to capture screenshot"
          };
        }
        const actualPath = shot.data?.path || filePath;
        const bytes = fs2.readFileSync(actualPath);
        try {
          fs2.unlinkSync(actualPath);
        } catch {}
        const info = await this.evalJson(daemon.sockPath, `({ url: location.href, title: document.title || '', width: window.innerWidth, height: window.innerHeight })`);
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            base64: bytes.toString("base64"),
            mime: "image/png",
            width: info.width || meta.viewport.width || 1280,
            height: info.height || meta.viewport.height || 800,
            url: info.url,
            title: info.title,
            viewport: meta.viewport
          }
        };
      }
      return { ok: false, error: "Unsupported browser action" };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  async applyViewportPreset(sockPath, meta, mode) {
    if (mode === "fill") {
      await sendDaemonSocketCommand(sockPath, "viewport", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      meta.viewport = { mode: "fill", width: null, height: null };
      return;
    }
    const spec = PRESET_DIMENSIONS[mode];
    await sendDaemonSocketCommand(sockPath, "viewport", {
      width: spec.width,
      height: spec.height,
      deviceScaleFactor: 1,
      mobile: spec.mobile
    });
    meta.viewport = { mode, width: spec.width, height: spec.height };
  }
}
function buildProviderSnapshotScript(scopeSelector) {
  return `(() => {
    const scopeSel = ${JSON.stringify(scopeSelector ?? null)};
    const root = scopeSel ? document.querySelector(scopeSel) : document.body;
    if (scopeSel && !root) {
      throw new Error('No element matches scope selector ' + scopeSel);
    }
    const targetRoot = root || document.documentElement;
    const cssPath = (node) => {
      if (!(node instanceof Element)) return 'body';
      if (node.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(node.id)) return '#' + CSS.escape(node.id);
      const parts = [];
      let cur = node;
      while (cur && cur.nodeType === 1 && parts.length < 5) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { parts.unshift('#' + CSS.escape(cur.id)); break; }
        const parent = cur.parentElement;
        if (parent) {
          const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
        }
        parts.unshift(part);
        cur = parent;
      }
      return parts.join(' > ') || 'body';
    };

    const rawText = ((targetRoot instanceof HTMLElement ? targetRoot.innerText : targetRoot.textContent) || '').trim();
    const maxText = 6000;
    const textTruncated = rawText.length > maxText;
    const text = textTruncated ? rawText.slice(0, maxText) : rawText;

    const candidates = Array.from(targetRoot.querySelectorAll('a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="menuitem"], [tabindex]:not([tabindex="-1"])'));
    const visible = candidates.filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });

    const maxEls = 120;
    const elementsTruncated = visible.length > maxEls;
    const elements = visible.slice(0, maxEls).map((el) => {
      const tag = el.tagName.toLowerCase();
      const r = el.getBoundingClientRect();
      const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
      const role = el.getAttribute('role') || undefined;
      const type = el.getAttribute('type') || undefined;
      const label = (
        el.getAttribute('aria-label') ||
        (el.labels && el.labels[0] ? el.labels[0].innerText : '') ||
        el.getAttribute('placeholder') ||
        el.getAttribute('title') ||
        (el instanceof HTMLElement ? el.innerText : '') ||
        ''
      ).trim().replace(/\\s+/g, ' ').slice(0, 120);
      const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';

      const item = {
        selector: cssPath(el),
        tag,
        bounds: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
      };
      if (inViewport) item.inViewport = true;
      if (type) item.type = type;
      if (role) item.role = role;
      if (label) item.label = label;
      else item.missingAccessibleName = true;
      if (disabled) item.disabled = true;

      if (el instanceof HTMLSelectElement) {
        item.multiple = el.multiple;
        const rawOpts = Array.from(el.options);
        let optTrunc = rawOpts.length > 32;
        item.options = rawOpts.slice(0, 32).map((o) => {
          const rawL = o.label || o.text || '';
          const rawV = o.value || '';
          if (rawL.length > 80 || rawV.length > 80) optTrunc = true;
          return {
            label: rawL.slice(0, 80),
            value: rawV.slice(0, 80),
            selected: o.selected,
            disabled: o.disabled,
          };
        });
        if (optTrunc) item.optionsTruncated = true;
      }
      return item;
    });

    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const out = {
      url: location.href,
      title: document.title || '',
      scope: scopeSel || 'document',
      scrollY: Math.round(window.scrollY),
      maxScrollY: Math.round(maxScrollY),
      text,
      elements,
    };
    if (textTruncated) {
      out.textTruncated = true;
      out.textTotalChars = rawText.length;
    }
    if (elementsTruncated) {
      out.elementsTruncated = true;
      out.interactiveElementsOnPage = visible.length;
    }
    return out;
  })()`;
}
function buildResolveClickTargetScript(selector, text) {
  return `(() => {
    const sel = ${JSON.stringify(selector ?? null)};
    const txt = ${JSON.stringify(text ?? null)};
    const cssPath = (node) => {
      if (node.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(node.id)) return '#' + CSS.escape(node.id);
      const parts = [];
      let cur = node;
      while (cur && cur.nodeType === 1 && parts.length < 6) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { parts.unshift('#' + CSS.escape(cur.id)); break; }
        const p = cur.parentElement;
        if (p) {
          const sibs = Array.from(p.children).filter((c) => c.tagName === cur.tagName);
          if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
        }
        parts.unshift(part);
        cur = p;
      }
      return parts.join(' > ');
    };
    if (sel) {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, error: 'No element matches ' + sel };
      const label = ((el instanceof HTMLElement ? el.innerText : '') || el.getAttribute('aria-label') || sel).trim().slice(0, 80);
      return { ok: true, selector: sel, label };
    }
    if (txt) {
      const norm = txt.trim().toLowerCase();
      const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], [role="link"], input[type="submit"], input[type="button"], summary, label'));
      const found = candidates.find((el) => {
        const t = ((el instanceof HTMLElement ? el.innerText : '') || el.getAttribute('aria-label') || el.getAttribute('value') || '').trim().toLowerCase();
        return t === norm || t.includes(norm);
      });
      if (!found) return { ok: false, error: 'No clickable element matches visible label "' + txt + '"' };
      return { ok: true, selector: cssPath(found), label: txt };
    }
    return { ok: false, error: 'Provide selector or text to click' };
  })()`;
}
function buildStrictNativeSelectScript(selector, label, value) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { ok: false, error: 'No element matches ' + ${JSON.stringify(selector)} };
    if (!(el instanceof HTMLSelectElement)) {
      return { ok: false, error: 'Target is not a native HTML <select> element' };
    }
    if (el.multiple) {
      return { ok: false, error: 'Multiple <select> elements are not supported by browser.select' };
    }
    if (el.disabled) {
      return { ok: false, error: 'Target <select> element is disabled' };
    }
    const wantLabel = ${JSON.stringify(label ?? null)};
    const wantValue = ${JSON.stringify(value ?? null)};
    const opts = Array.from(el.options);
    const matches = opts.filter((o) => wantLabel !== null ? (o.label === wantLabel || o.text === wantLabel) : o.value === wantValue);
    if (matches.length === 0) {
      return { ok: false, error: 'No option matches ' + (wantLabel !== null ? 'label "' + wantLabel + '"' : 'value "' + wantValue + '"') };
    }
    if (matches.length > 1) {
      return { ok: false, error: 'Ambiguous option match on ' + ${JSON.stringify(selector)} };
    }
    const chosen = matches[0];
    if (chosen.disabled) {
      return { ok: false, error: 'Matching <option> is disabled' };
    }
    el.value = chosen.value;
    chosen.selected = true;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, label: chosen.label || chosen.text, value: chosen.value, url: location.href };
  })()`;
}
function buildScrollScript(selector, direction) {
  return `(() => {
    const sel = ${JSON.stringify(selector ?? null)};
    const dir = ${JSON.stringify(direction ?? null)};
    let scrolledTo;
    if (sel) {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, error: 'No element matches ' + sel };
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      scrolledTo = sel;
    } else if (dir === 'top') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (dir === 'bottom') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    } else if (dir === 'up') {
      window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: 'instant' });
    } else {
      window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: 'instant' });
    }
    const maxScrollY = Math.max(0, Math.round(document.documentElement.scrollHeight - window.innerHeight));
    const scrollY = Math.round(window.scrollY);
    return {
      ok: true,
      scrollY,
      maxScrollY,
      atTop: scrollY <= 1,
      atBottom: scrollY >= maxScrollY - 1,
      ...(scrolledTo ? { scrolledTo } : {}),
    };
  })()`;
}
function buildInspectScript(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { ok: false, error: 'No element matches ' + ${JSON.stringify(selector)} };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const props = [
      'display', 'position', 'width', 'height', 'padding', 'margin',
      'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight',
      'lineHeight', 'textAlign', 'border', 'borderRadius', 'boxShadow',
      'opacity', 'visibility', 'overflow', 'zIndex', 'flexDirection',
      'justifyContent', 'alignItems', 'gap', 'gridTemplateColumns'
    ];
    const styles = {};
    for (const p of props) {
      styles[p] = String(cs[p] ?? '');
    }
    const label = ((el instanceof HTMLElement ? el.innerText : '') || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 120);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return {
      ok: true,
      tag: el.tagName.toLowerCase(),
      label,
      bounds: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
      inViewport,
      styles,
    };
  })()`;
}

// service/cdp-bridge.ts
import crypto2 from "node:crypto";

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// service/input-translator.ts
var CODE_TO_VK = {
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  NumpadEnter: 13,
  ShiftLeft: 16,
  ShiftRight: 16,
  ControlLeft: 17,
  ControlRight: 17,
  AltLeft: 18,
  AltRight: 18,
  Escape: 27,
  Space: 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Insert: 45,
  Delete: 46,
  Semicolon: 186,
  Equal: 187,
  Comma: 188,
  Minus: 189,
  Period: 190,
  Slash: 191,
  Backquote: 192,
  BracketLeft: 219,
  Backslash: 220,
  BracketRight: 221,
  Quote: 222
};
var INITIAL_CLICK_TRACKER = {
  lastTimeMs: 0,
  lastX: -100,
  lastY: -100,
  lastButton: -1,
  count: 0
};
function nextClickTracker(prev, x, y, button, nowMs) {
  const dt = nowMs - prev.lastTimeMs;
  const dx = Math.abs(x - prev.lastX);
  const dy = Math.abs(y - prev.lastY);
  const chained = button === prev.lastButton && dt >= 0 && dt <= 500 && dx <= 4 && dy <= 4;
  const count = chained ? prev.count % 3 + 1 : 1;
  return { lastTimeMs: nowMs, lastX: x, lastY: y, lastButton: button, count };
}
function modifiersBitmask(modifiers) {
  return (modifiers.alt ? 1 : 0) | (modifiers.ctrl ? 2 : 0) | (modifiers.meta ? 4 : 0) | (modifiers.shift ? 8 : 0);
}
function virtualKeyCodeForEvent(event) {
  if (typeof event.keyCode === "number" && event.keyCode > 0) {
    return event.keyCode;
  }
  const mapped = CODE_TO_VK[event.code];
  if (mapped !== undefined)
    return mapped;
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.charCodeAt(3);
  }
  if (/^Digit[0-9]$/.test(event.code)) {
    return event.code.charCodeAt(5);
  }
  if (/^F([1-9]|1[0-2])$/.test(event.code)) {
    return 111 + Number(event.code.slice(1));
  }
  return;
}
function resolveMouseButton(event) {
  if (event.action === "down" || event.action === "up") {
    if (event.button === 0)
      return "left";
    if (event.button === 1)
      return "middle";
    if (event.button === 2)
      return "right";
    return "none";
  }
  if ((event.buttons & 1) !== 0)
    return "left";
  if ((event.buttons & 4) !== 0)
    return "middle";
  if ((event.buttons & 2) !== 0)
    return "right";
  return "none";
}
function scaleCoordinate(frameCoord, frameSize, cssViewportSize) {
  if (frameSize <= 0 || cssViewportSize <= 0 || frameSize === cssViewportSize) {
    return Math.round(frameCoord * 100) / 100;
  }
  return Math.round(frameCoord * cssViewportSize / frameSize * 100) / 100;
}
function translateSurfaceEventsToWsMessages(events, dimensions, initialTracker, nowMs = Date.now()) {
  let tracker = initialTracker;
  const messages = [];
  for (const event of events) {
    if (event.type === "pointer") {
      const x = scaleCoordinate(event.x, dimensions.frameWidth, dimensions.viewportWidth);
      const y = scaleCoordinate(event.y, dimensions.frameHeight, dimensions.viewportHeight);
      const button = resolveMouseButton(event);
      const modifiers = modifiersBitmask(event.modifiers);
      if (event.action === "down") {
        tracker = nextClickTracker(tracker, x, y, event.button, nowMs);
        messages.push({
          type: "input_mouse",
          eventType: "mousePressed",
          x,
          y,
          button,
          clickCount: tracker.count,
          ...modifiers ? { modifiers } : {}
        });
      } else if (event.action === "up") {
        messages.push({
          type: "input_mouse",
          eventType: "mouseReleased",
          x,
          y,
          button,
          clickCount: Math.max(1, tracker.count),
          ...modifiers ? { modifiers } : {}
        });
      } else {
        messages.push({
          type: "input_mouse",
          eventType: "mouseMoved",
          x,
          y,
          ...button !== "none" ? { button } : {},
          ...modifiers ? { modifiers } : {}
        });
      }
      continue;
    }
    if (event.type === "wheel") {
      const x = scaleCoordinate(event.x, dimensions.frameWidth, dimensions.viewportWidth);
      const y = scaleCoordinate(event.y, dimensions.frameHeight, dimensions.viewportHeight);
      const modifiers = modifiersBitmask(event.modifiers);
      messages.push({
        type: "input_mouse",
        eventType: "mouseWheel",
        x,
        y,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        ...modifiers ? { modifiers } : {}
      });
      continue;
    }
    if (event.type === "key") {
      const isAltGrPrintable = event.modifiers.ctrl && event.modifiers.alt && !event.modifiers.meta && event.key.length === 1;
      const effectiveModifiers = isAltGrPrintable ? { ...event.modifiers, ctrl: false, alt: false } : event.modifiers;
      const modifiers = modifiersBitmask(effectiveModifiers);
      const vk = virtualKeyCodeForEvent(event);
      const isPrintable = event.action === "down" && event.key.length === 1 && !effectiveModifiers.ctrl && !effectiveModifiers.meta && !effectiveModifiers.alt;
      messages.push({
        type: "input_keyboard",
        eventType: event.action === "down" ? "keyDown" : "keyUp",
        ...event.key ? { key: event.key } : {},
        ...event.code ? { code: event.code } : {},
        ...isPrintable ? { text: event.key } : {},
        ...vk !== undefined ? { windowsVirtualKeyCode: vk } : {},
        ...modifiers ? { modifiers } : {}
      });
      continue;
    }
    if (event.type === "text") {
      for (const ch of event.text) {
        messages.push({
          type: "input_keyboard",
          eventType: "char",
          text: ch
        });
      }
    }
  }
  return { messages, tracker };
}

// service/cdp-bridge.ts
var MAX_CDP_PAYLOAD = 64 * 1024 * 1024;
var COPY_BINDING = "openchamberDevtoolsCopy";
var ALLOWED_DEVTOOLS_DOMAINS = new Set([
  "Accessibility",
  "Animation",
  "Audits",
  "CSS",
  "CacheStorage",
  "Console",
  "DOM",
  "DOMDebugger",
  "DOMSnapshot",
  "DOMStorage",
  "Database",
  "Debugger",
  "Emulation",
  "Fetch",
  "HeapProfiler",
  "IO",
  "IndexedDB",
  "Input",
  "Inspector",
  "LayerTree",
  "Log",
  "Media",
  "Memory",
  "Network",
  "Overlay",
  "Page",
  "Performance",
  "PerformanceTimeline",
  "Preload",
  "Profiler",
  "Runtime",
  "Security",
  "ServiceWorker",
  "Storage",
  "Target",
  "Tracing",
  "WebAudio",
  "WebAuthn"
]);
var BLOCKED_DEVTOOLS_METHODS = new Set([
  "Page.setDownloadBehavior",
  "DOM.setFileInputFiles",
  "Input.dispatchDragEvent",
  "Emulation.setDeviceMetricsOverride",
  "Emulation.clearDeviceMetricsOverride",
  "Browser.close",
  "Browser.crash"
]);
var DEVTOOLS_FRONTEND_SCRIPT = `(() => {
  const boot = () => {
    if (globalThis.__ocAbDevtoolsReady) return;
    globalThis.__ocAbDevtoolsReady = true;
    void Promise.all([import('./ui/legacy/legacy.js'), import('./core/host/host.js')])
      .then(([legacy, hostMod]) => {
        if (legacy?.ContextMenu?.ContextMenu) {
          legacy.ContextMenu.ContextMenu.useSoftMenu = true;
        }
        const inst = hostMod?.InspectorFrontendHost?.InspectorFrontendHostInstance;
        if (inst && typeof inst.copyText === 'function') {
          const orig = inst.copyText.bind(inst);
          inst.copyText = (text) => {
            if (text !== null && text !== undefined && typeof globalThis.${COPY_BINDING} === 'function') {
              globalThis.${COPY_BINDING}(String(text));
            }
            orig(text);
          };
        }
      })
      .catch(() => {});
  };
  if (document.readyState === 'complete') boot();
  else addEventListener('load', boot, { once: true });
})()`;
function rawDataToUtf8(raw) {
  if (Buffer.isBuffer(raw))
    return raw.toString("utf8");
  if (Array.isArray(raw))
    return Buffer.concat(raw).toString("utf8");
  return Buffer.from(raw).toString("utf8");
}

class CdpClient {
  ws;
  nextId = 1;
  pending = new Map;
  listeners = new Set;
  closed = false;
  constructor(ws) {
    this.ws = ws;
    ws.on("message", (raw, isBinary) => {
      if (isBinary)
        return;
      let msg;
      try {
        msg = JSON.parse(rawDataToUtf8(raw));
      } catch {
        return;
      }
      if (typeof msg.id === "number") {
        const entry = this.pending.get(msg.id);
        if (!entry)
          return;
        this.pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error && typeof msg.error === "object") {
          const errObj = msg.error;
          entry.reject(new Error(errObj.message || "CDP command error"));
        } else {
          entry.resolve(msg.result ?? {});
        }
        return;
      }
      if (typeof msg.method === "string") {
        const event = {
          method: msg.method,
          params: msg.params ?? {},
          ...typeof msg.sessionId === "string" ? { sessionId: msg.sessionId } : {}
        };
        for (const listener of this.listeners) {
          listener(event);
        }
      }
    });
    const onClose = () => {
      this.closed = true;
      for (const [, entry] of this.pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error("CDP WebSocket closed"));
      }
      this.pending.clear();
    };
    ws.on("close", onClose);
    ws.on("error", onClose);
  }
  static connect(wsUrl, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      const ws = new import_websocket.default(wsUrl, {
        maxPayload: MAX_CDP_PAYLOAD,
        perMessageDeflate: false
      });
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error(`CDP connect timed out (${wsUrl})`));
      }, timeoutMs);
      ws.once("open", () => {
        clearTimeout(timer);
        resolve(new CdpClient(ws));
      });
      ws.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
  get isOpen() {
    return !this.closed && this.ws.readyState === import_websocket.default.OPEN;
  }
  onEvent(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  send(method, params = {}, sessionId, timeoutMs = 1e4) {
    if (!this.isOpen) {
      return Promise.reject(new Error(`CDP connection closed while calling ${method}`));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      const payload = JSON.stringify({
        id,
        method,
        params,
        ...sessionId ? { sessionId } : {}
      });
      this.ws.send(payload);
    });
  }
  close() {
    this.closed = true;
    try {
      this.ws.close();
    } catch {
      this.ws.terminate();
    }
  }
}
async function findActivePageTarget(cdp, preferredUrl) {
  const res = await cdp.send("Target.getTargets");
  const rawList = Array.isArray(res.targetInfos) ? res.targetInfos : [];
  const pages = [];
  for (const item of rawList) {
    if (!item || typeof item !== "object")
      continue;
    const info = item;
    const type = asString(info.type);
    const url = asString(info.url);
    if (type !== "page" && type !== "webview")
      continue;
    if (url.startsWith("devtools://") || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
      continue;
    }
    pages.push({
      targetId: asString(info.targetId),
      type,
      title: asString(info.title),
      url,
      ...typeof info.browserContextId === "string" ? { browserContextId: info.browserContextId } : {}
    });
  }
  if (pages.length === 0)
    return null;
  if (preferredUrl) {
    const exact = pages.find((p) => p.url === preferredUrl);
    if (exact)
      return exact;
  }
  return pages[0] ?? null;
}
async function applyScreenScale(cdp, targetSessionId, scale) {
  try {
    const infoRes = await cdp.send("Emulation.getScreenInfos", {}, targetSessionId, 3000);
    const infos = Array.isArray(infoRes.screenInfos) ? infoRes.screenInfos : [];
    const primary = infos[0];
    if (primary && typeof primary.id === "string") {
      await cdp.send("Emulation.updateScreen", {
        id: primary.id,
        devicePixelRatio: scale
      }, targetSessionId, 3000);
    }
  } catch {}
}
async function applyBaseSelectCompatibility(cdp, targetSessionId, enabled) {
  const script = `(() => {
    const id = '__oc_ab_base_select_style__';
    const existing = document.getElementById(id);
    if (!${enabled ? "true" : "false"}) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = 'select:not([multiple]) { appearance: base-select !important; }';
    (document.head || document.documentElement).appendChild(style);
  })()`;
  await cdp.send("Runtime.evaluate", { expression: script }, targetSessionId, 4000).catch(() => {});
}
function filterDevToolsCommand(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { allow: false };
  }
  const id = typeof parsed.id === "number" ? parsed.id : null;
  const method = typeof parsed.method === "string" ? parsed.method : "";
  if (!method || id === null)
    return { allow: false };
  if (method === "Browser.getVersion") {
    return { allow: true, rewritten: rawText };
  }
  const domain = method.split(".")[0] ?? "";
  if (!ALLOWED_DEVTOOLS_DOMAINS.has(domain) || BLOCKED_DEVTOOLS_METHODS.has(method)) {
    return {
      allow: false,
      syntheticErrorResponse: JSON.stringify({
        id,
        error: {
          code: -32601,
          message: `Method ${method} blocked by OpenChamber DevTools policy`
        }
      })
    };
  }
  if (method === "Page.navigate") {
    const params = parsed.params ?? {};
    const url = asString(params.url);
    if (url !== "about:blank" && !url.startsWith("http://") && !url.startsWith("https://")) {
      return {
        allow: false,
        syntheticErrorResponse: JSON.stringify({
          id,
          error: {
            code: -32602,
            message: "Only http(s) and about:blank navigations are permitted"
          }
        })
      };
    }
  }
  return { allow: true, rewritten: rawText };
}

class DevToolsSurfaceController {
  cdp = null;
  relayServer = null;
  activeLink = null;
  browserContextId = null;
  frontendTargetId = null;
  frontendSessionId = null;
  token = "";
  cssWidth = 1280;
  cssHeight = 800;
  scale = 1;
  lastFrameWidth = 1280;
  lastFrameHeight = 800;
  clickTracker = INITIAL_CLICK_TRACKER;
  lastCopiedText = "";
  unsubEvents = null;
  get isOpen() {
    return Boolean(this.cdp?.isOpen && this.frontendSessionId);
  }
  get clipboardText() {
    return this.lastCopiedText;
  }
  async open(options) {
    await this.close();
    const cdp = await CdpClient.connect(options.browserWsUrl);
    this.cdp = cdp;
    this.cssWidth = Math.max(480, Math.min(3840, Math.round(options.width || 1280)));
    this.cssHeight = Math.max(360, Math.min(2400, Math.round(options.height || 800)));
    this.scale = options.scale;
    this.token = crypto2.randomBytes(32).toString("hex");
    const target = await findActivePageTarget(cdp, options.preferredPageUrl);
    if (!target) {
      cdp.close();
      this.cdp = null;
      throw new Error("No inspectable page target found in this Chrome session");
    }
    const pageWsUrl = (() => {
      const parsed = new URL(options.browserWsUrl);
      parsed.pathname = `/devtools/page/${encodeURIComponent(target.targetId)}`;
      return parsed.href;
    })();
    const relayPort = await new Promise((resolve, reject) => {
      const wss = new import_websocket_server.default({
        host: "127.0.0.1",
        port: 0,
        maxPayload: MAX_CDP_PAYLOAD,
        perMessageDeflate: false,
        verifyClient: ({
          origin,
          req
        }) => origin === "devtools://devtools" && req.url === `/devtools/${this.token}`
      });
      wss.on("connection", (client) => {
        this.activeLink?.close();
        const upstream = new import_websocket.default(pageWsUrl, {
          maxPayload: MAX_CDP_PAYLOAD,
          perMessageDeflate: false
        });
        const queue = [];
        const link = {
          close: () => {
            client.terminate();
            upstream.terminate();
          }
        };
        this.activeLink = link;
        client.on("message", (data, isBinary) => {
          if (isBinary) {
            link.close();
            return;
          }
          const check = filterDevToolsCommand(rawDataToUtf8(data));
          if (check.allow && check.rewritten) {
            if (upstream.readyState === import_websocket.default.OPEN) {
              upstream.send(check.rewritten);
            } else if (upstream.readyState === import_websocket.default.CONNECTING && queue.length < 512) {
              queue.push(check.rewritten);
            } else {
              link.close();
            }
          } else if (check.syntheticErrorResponse && client.readyState === import_websocket.default.OPEN) {
            client.send(check.syntheticErrorResponse);
          } else {
            link.close();
          }
        });
        upstream.on("open", () => {
          for (const item of queue.splice(0)) {
            upstream.send(item);
          }
        });
        upstream.on("message", (data, isBinary) => {
          if (!isBinary && client.readyState === import_websocket.default.OPEN) {
            client.send(rawDataToUtf8(data));
          }
        });
        client.on("close", () => link.close());
        client.on("error", () => link.close());
        upstream.on("close", () => link.close());
        upstream.on("error", () => link.close());
      });
      wss.once("error", reject);
      wss.once("listening", () => {
        this.relayServer = wss;
        const addr = wss.address();
        resolve(typeof addr === "object" && addr ? addr.port : 0);
      });
    });
    const ctxRes = await cdp.send("Target.createBrowserContext", {
      proxyBypassList: `<-loopback>;127.0.0.1:${relayPort}`
    });
    const browserContextId = asString(ctxRes.browserContextId);
    if (!browserContextId) {
      await this.close();
      throw new Error("Failed to create isolated DevTools browser context");
    }
    this.browserContextId = browserContextId;
    const targetRes = await cdp.send("Target.createTarget", {
      url: `devtools://devtools/bundled/inspector.html?ws=127.0.0.1:${relayPort}/devtools/${this.token}`,
      browserContextId,
      newWindow: true,
      background: true
    });
    const frontendTargetId = asString(targetRes.targetId);
    if (!frontendTargetId) {
      await this.close();
      throw new Error("Failed to launch bundled Chrome DevTools target");
    }
    this.frontendTargetId = frontendTargetId;
    const attachRes = await cdp.send("Target.attachToTarget", {
      targetId: frontendTargetId,
      flatten: true
    });
    const sessionId = asString(attachRes.sessionId);
    this.frontendSessionId = sessionId;
    this.unsubEvents = cdp.onEvent((ev) => {
      if (ev.method === "Target.targetDestroyed" && ev.params.targetId === this.frontendTargetId) {
        this.close();
        options.onClosed?.();
        return;
      }
      if (ev.sessionId !== this.frontendSessionId)
        return;
      if (ev.method === "Runtime.bindingCalled" && ev.params.name === COPY_BINDING) {
        const copied = asString(ev.params.payload);
        this.lastCopiedText = copied;
        options.onCopy?.(copied);
        return;
      }
      if (ev.method === "Page.screencastFrame") {
        const sessionSeq = ev.params.sessionId;
        if (typeof sessionSeq === "number" && this.frontendSessionId) {
          cdp.send("Page.screencastFrameAck", { sessionId: sessionSeq }, this.frontendSessionId).catch(() => {});
        }
        const b64 = typeof ev.params.data === "string" ? ev.params.data : "";
        if (!b64)
          return;
        const meta = ev.params.metadata ?? {};
        const bytes = Buffer.from(b64, "base64");
        const metaW = Number(meta.deviceWidth) || this.cssWidth;
        const metaH = Number(meta.deviceHeight) || this.cssHeight;
        const pixelW = Math.round(metaW * this.scale);
        const pixelH = Math.round(metaH * this.scale);
        this.lastFrameWidth = pixelW;
        this.lastFrameHeight = pixelH;
        options.onFrame({
          bytes,
          width: pixelW,
          height: pixelH,
          title: `DevTools — ${target.title || target.url}`
        });
      }
    });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Runtime.addBinding", { name: COPY_BINDING }, sessionId);
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: DEVTOOLS_FRONTEND_SCRIPT }, sessionId);
    await cdp.send("Runtime.evaluate", { expression: DEVTOOLS_FRONTEND_SCRIPT }, sessionId).catch(() => {});
    await applyScreenScale(cdp, sessionId, this.scale);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: this.cssWidth,
      height: this.cssHeight,
      deviceScaleFactor: this.scale,
      mobile: false
    }, sessionId);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: options.colorScheme }
      ]
    }, sessionId).catch(() => {});
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 90,
      maxWidth: this.cssWidth * this.scale,
      maxHeight: this.cssHeight * this.scale,
      everyNthFrame: 1
    }, sessionId);
  }
  async resize(width, height, scale) {
    if (!this.cdp?.isOpen || !this.frontendSessionId)
      return;
    this.cssWidth = Math.max(480, Math.min(3840, Math.round(width)));
    this.cssHeight = Math.max(360, Math.min(2400, Math.round(height)));
    this.scale = scale;
    await applyScreenScale(this.cdp, this.frontendSessionId, scale);
    await this.cdp.send("Emulation.setDeviceMetricsOverride", {
      width: this.cssWidth,
      height: this.cssHeight,
      deviceScaleFactor: scale,
      mobile: false
    }, this.frontendSessionId).catch(() => {});
    await this.cdp.send("Page.stopScreencast", {}, this.frontendSessionId).catch(() => {});
    await this.cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 90,
      maxWidth: this.cssWidth * scale,
      maxHeight: this.cssHeight * scale,
      everyNthFrame: 1
    }, this.frontendSessionId).catch(() => {});
  }
  async dispatchSurfaceInput(events) {
    if (!this.cdp?.isOpen || !this.frontendSessionId)
      return;
    const sessionId = this.frontendSessionId;
    const now = Date.now();
    for (const event of events) {
      if (event.type === "pointer") {
        const x = scaleCoordinate(event.x, this.lastFrameWidth, this.cssWidth);
        const y = scaleCoordinate(event.y, this.lastFrameHeight, this.cssHeight);
        const button = resolveMouseButton(event);
        const modifiers = modifiersBitmask(event.modifiers);
        if (event.action === "down") {
          this.clickTracker = nextClickTracker(this.clickTracker, x, y, event.button, now);
          await this.cdp.send("Input.dispatchMouseEvent", {
            type: "mousePressed",
            x,
            y,
            button,
            buttons: event.buttons,
            clickCount: this.clickTracker.count,
            modifiers
          }, sessionId).catch(() => {});
        } else if (event.action === "up") {
          await this.cdp.send("Input.dispatchMouseEvent", {
            type: "mouseReleased",
            x,
            y,
            button,
            buttons: event.buttons,
            clickCount: Math.max(1, this.clickTracker.count),
            modifiers
          }, sessionId).catch(() => {});
        } else {
          await this.cdp.send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x,
            y,
            button,
            buttons: event.buttons,
            modifiers
          }, sessionId).catch(() => {});
        }
        continue;
      }
      if (event.type === "wheel") {
        const x = scaleCoordinate(event.x, this.lastFrameWidth, this.cssWidth);
        const y = scaleCoordinate(event.y, this.lastFrameHeight, this.cssHeight);
        await this.cdp.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x,
          y,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          modifiers: modifiersBitmask(event.modifiers)
        }, sessionId).catch(() => {});
        continue;
      }
      if (event.type === "key") {
        const vk = virtualKeyCodeForEvent(event);
        const isPrintable = event.action === "down" && event.key.length === 1 && !event.modifiers.ctrl && !event.modifiers.meta && !event.modifiers.alt;
        await this.cdp.send("Input.dispatchKeyEvent", {
          type: event.action === "down" ? "keyDown" : "keyUp",
          key: event.key,
          code: event.code,
          ...isPrintable ? { text: event.key, unmodifiedText: event.key } : {},
          ...vk !== undefined ? { windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk } : {},
          modifiers: modifiersBitmask(event.modifiers)
        }, sessionId).catch(() => {});
        continue;
      }
      if (event.type === "text" && event.text) {
        await this.cdp.send("Input.insertText", { text: event.text }, sessionId).catch(() => {});
      }
    }
  }
  async close() {
    this.unsubEvents?.();
    this.unsubEvents = null;
    this.activeLink?.close();
    this.activeLink = null;
    if (this.relayServer) {
      const server = this.relayServer;
      this.relayServer = null;
      await new Promise((resolve) => server.close(() => resolve()));
    }
    const cdp = this.cdp;
    this.cdp = null;
    const frontendTargetId = this.frontendTargetId;
    const browserContextId = this.browserContextId;
    this.frontendTargetId = null;
    this.frontendSessionId = null;
    this.browserContextId = null;
    if (cdp?.isOpen) {
      if (frontendTargetId) {
        await cdp.send("Target.closeTarget", { targetId: frontendTargetId }, undefined, 2000).catch(() => {});
      }
      if (browserContextId) {
        await cdp.send("Target.disposeBrowserContext", { browserContextId }, undefined, 2000).catch(() => {});
      }
    }
    cdp?.close();
  }
}
function buildHoverPickScript(cssX, cssY, refsMap) {
  return `(() => {
    const x = ${Number.isFinite(cssX) ? cssX : 0};
    const y = ${Number.isFinite(cssY) ? cssY : 0};
    const refs = ${JSON.stringify(refsMap)};
    const hostId = '__oc_ab_pick_overlay__';
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<div id="box" style="position:fixed;border:2px solid #3b82f6;background:rgba(59,130,246,0.12);border-radius:4px;box-sizing:border-box;display:none;"></div><div id="tag" style="position:fixed;background:#0f172a;color:#f8fafc;font:600 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 7px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.35);white-space:nowrap;display:none;"></div>';
      document.documentElement.appendChild(host);
    }
    host.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    host.style.display = 'block';
    const shadow = host.shadowRoot;
    if (!el || !shadow) return false;
    const rect = el.getBoundingClientRect();
    const box = shadow.getElementById('box');
    const badge = shadow.getElementById('tag');
    if (!box || !badge) return false;
    box.style.display = 'block';
    box.style.left = rect.left + 'px';
    box.style.top = rect.top + 'px';
    box.style.width = Math.max(2, rect.width) + 'px';
    box.style.height = Math.max(2, rect.height) + 'px';

    const tagName = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || (tagName === 'button' ? 'button' : tagName === 'a' ? 'link' : tagName === 'input' ? 'textbox' : '');
    const label = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().slice(0, 48);
    let matchedRef = '';
    for (const [refKey, meta] of Object.entries(refs)) {
      const mName = (meta?.name || '').trim();
      const mRole = (meta?.role || '').trim();
      if (mName && label && mName === label && (!mRole || !role || mRole === role)) {
        matchedRef = '@' + refKey;
        break;
      }
    }
    const prefix = matchedRef ? matchedRef + ' · ' : '';
    badge.style.display = 'block';
    badge.textContent = prefix + '<' + tagName + '>' + (label ? ' "' + label.slice(0, 28) + '"' : '') + ' · ' + Math.round(rect.width) + '×' + Math.round(rect.height);
    badge.style.left = Math.max(4, Math.min(window.innerWidth - 220, rect.left)) + 'px';
    badge.style.top = (rect.top > 28 ? rect.top - 26 : rect.bottom + 6) + 'px';
    return true;
  })()`;
}
var CLEAR_PICK_OVERLAY_SCRIPT = `(() => {
  document.getElementById('__oc_ab_pick_overlay__')?.remove();
  return true;
})()`;
function buildCapturePickedElementScript(cssX, cssY, sessionName, refsMap) {
  return `(() => {
    const overlay = document.getElementById('__oc_ab_pick_overlay__');
    if (overlay) overlay.remove();
    const x = ${Number.isFinite(cssX) ? cssX : 0};
    const y = ${Number.isFinite(cssY) ? cssY : 0};
    const refs = ${JSON.stringify(refsMap)};
    const el = document.elementFromPoint(x, y);
    if (!el) return null;

    const cssPath = (node) => {
      if (!(node instanceof Element)) return 'body';
      if (node.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(node.id)) {
        return '#' + CSS.escape(node.id);
      }
      const parts = [];
      let cur = node;
      while (cur && cur.nodeType === 1 && parts.length < 5) {
        let part = cur.tagName.toLowerCase();
        const testId = cur.getAttribute('data-testid');
        if (testId) {
          parts.unshift(part + '[data-testid="' + CSS.escape(testId) + '"]');
          break;
        }
        if (cur.id) {
          parts.unshift('#' + CSS.escape(cur.id));
          break;
        }
        const parent = cur.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (siblings.length > 1) {
            part += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
          }
        }
        parts.unshift(part);
        cur = parent;
      }
      return parts.join(' > ') || 'body';
    };

    const tag = el.tagName.toLowerCase();
    const implicitRole =
      tag === 'button' ? 'button'
      : tag === 'a' && el.hasAttribute('href') ? 'link'
      : tag === 'input' ? (el.getAttribute('type') === 'checkbox' ? 'checkbox' : 'textbox')
      : tag === 'select' ? 'combobox'
      : tag === 'textarea' ? 'textbox'
      : null;
    const role = el.getAttribute('role') || implicitRole;
    const accessibleName = (
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.getAttribute('placeholder') ||
      el.getAttribute('alt') ||
      (el instanceof HTMLElement ? el.innerText : '') ||
      ''
    ).trim().replace(/\\s+/g, ' ').slice(0, 120) || null;

    let matchedRef = null;
    for (const [refKey, meta] of Object.entries(refs)) {
      const mName = (meta?.name || '').trim().replace(/\\s+/g, ' ');
      const mRole = (meta?.role || '').trim();
      if (mName && accessibleName && (mName === accessibleName || accessibleName.startsWith(mName))) {
        if (!mRole || !role || mRole === role) {
          matchedRef = '@' + refKey;
          break;
        }
      }
    }

    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const styleKeys = [
      'display', 'position', 'width', 'height', 'padding', 'margin',
      'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight',
      'lineHeight', 'border', 'borderRadius', 'opacity', 'zIndex', 'overflow'
    ];
    const styles = {};
    for (const k of styleKeys) {
      const val = cs[k];
      if (val) styles[k] = String(val);
    }

    return {
      session: ${JSON.stringify(sessionName)},
      url: location.href,
      title: document.title || location.href,
      ref: matchedRef,
      selector: cssPath(el),
      tag,
      role,
      accessibleName,
      textSnippet: ((el instanceof HTMLElement ? el.innerText : el.textContent) || '').trim().replace(/\\s+/g, ' ').slice(0, 200),
      bounds: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles,
    };
  })()`;
}
function formatPickedElementMarkdown(picked) {
  const heading = picked.ref ? `### Picked Element \`${picked.ref}\` (\`<${picked.tag}>\` in session \`${picked.session}\`)` : `### Picked Element \`<${picked.tag}>\` (session \`${picked.session}\`)`;
  const stylePairs = Object.entries(picked.styles).slice(0, 10).map(([k, v]) => `${k}: ${v}`).join("; ");
  const lines = [
    heading,
    `- **Page**: ${picked.title} (${picked.url})`,
    ...picked.ref ? [
      `- **agent-browser ref**: \`${picked.ref}\` (e.g. \`agent-browser --session ${picked.session} click ${picked.ref}\`)`
    ] : [],
    `- **CSS Selector**: \`${picked.selector}\``,
    ...picked.role ? [`- **ARIA Role**: \`${picked.role}\``] : [],
    ...picked.accessibleName ? [`- **Accessible Name**: ${JSON.stringify(picked.accessibleName)}`] : [],
    `- **Bounds**: \`${picked.bounds.width}×${picked.bounds.height}\` at \`(${picked.bounds.x}, ${picked.bounds.y})\``,
    ...picked.textSnippet ? [`- **Text**: ${JSON.stringify(picked.textSnippet)}`] : [],
    ...stylePairs ? [`- **Computed Styles**: \`${stylePairs}\``] : []
  ];
  return lines.join(`
`);
}

// service/session-hub.ts
import fs3 from "node:fs";
import os3 from "node:os";
import path3 from "node:path";

// service/redact.ts
var SECRET_NAME_RE = /(?:auth|bearer|cookie|password|passwd|secret|token|credential|api[-_]?key|access[-_]?key|private[-_]?key|session[-_]?id|signature|csrf|xsrf|^key$|^code$|jwt)/i;
var BEARER_VALUE_RE = /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{6,}/gi;
var REDACTED = "[REDACTED]";
function isSensitiveKey(name) {
  return SECRET_NAME_RE.test(name.trim());
}
function redactText(text, maxChars = 4000) {
  const scrubbed = text.replace(BEARER_VALUE_RE, (_match, scheme) => `${scheme} ${REDACTED}`);
  return scrubbed.length > maxChars ? `${scrubbed.slice(0, maxChars)}…` : scrubbed;
}
function redactUrl(rawUrl) {
  if (!rawUrl)
    return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    const hasCredentials = parsed.username !== "" || parsed.password !== "";
    let changed = hasCredentials;
    if (hasCredentials) {
      parsed.username = REDACTED;
      parsed.password = "";
    }
    for (const [key] of parsed.searchParams.entries()) {
      if (isSensitiveKey(key)) {
        parsed.searchParams.set(key, REDACTED);
        changed = true;
      }
    }
    if (parsed.hash.includes("=")) {
      const rawHash = parsed.hash.slice(1);
      const hashParams = new URLSearchParams(rawHash);
      let hashChanged = false;
      for (const [key] of hashParams.entries()) {
        if (isSensitiveKey(key)) {
          hashParams.set(key, REDACTED);
          hashChanged = true;
        }
      }
      if (hashChanged) {
        parsed.hash = `#${hashParams.toString()}`;
        changed = true;
      }
    }
    return changed ? decodeURIComponent(parsed.toString()).replaceAll(encodeURIComponent(REDACTED), REDACTED) : rawUrl;
  } catch {
    return redactText(rawUrl, 2000);
  }
}
function redactHeaders(headers) {
  if (!headers)
    return {};
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [
    key,
    isSensitiveKey(key) ? REDACTED : redactText(asString(value), 2000)
  ]));
}
function redactUnknown(value, depth = 0) {
  if (depth > 5)
    return "[…]";
  if (value === null || value === undefined)
    return value;
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return redactUrl(value);
    }
    return redactText(value, 2000);
  }
  if (typeof value === "number" || typeof value === "boolean")
    return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => redactUnknown(entry, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 60).map(([k, v]) => [
      k,
      isSensitiveKey(k) ? REDACTED : redactUnknown(v, depth + 1)
    ]));
  }
  return asString(value);
}
function redactBodyText(body, mimeType, maxChars = 8000) {
  if (body === null || body === undefined || body === "")
    return null;
  const trimmed = body.trim();
  const normalizedMime = (mimeType ?? "").toLowerCase();
  if (normalizedMime.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      const serialized = JSON.stringify(redactUnknown(parsed), null, 2);
      return serialized.length > maxChars ? `${serialized.slice(0, maxChars)}…` : serialized;
    } catch {
      return redactText(body, maxChars);
    }
  }
  if (normalizedMime.includes("x-www-form-urlencoded")) {
    try {
      const params = new URLSearchParams(body);
      const next = new URLSearchParams;
      for (const [key, val] of params.entries()) {
        next.append(key, isSensitiveKey(key) ? REDACTED : redactText(val, 500));
      }
      const out = next.toString();
      return out.length > maxChars ? `${out.slice(0, maxChars)}…` : out;
    } catch {
      return redactText(body, maxChars);
    }
  }
  return redactText(body, maxChars);
}
function formatPreviewJson(value, maxChars = 1200) {
  if (value === null || value === undefined)
    return null;
  const safe = redactUnknown(value);
  const text = typeof safe === "string" ? safe : JSON.stringify(safe);
  if (!text || text === "{}" || text === "null")
    return null;
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

// service/session-hub.ts
var MAX_ACTIVITY_EVENTS = 250;
var MAX_CONSOLE_EVENTS = 250;
var MAX_LATENCY_POINTS = 40;
var AGENT_ACTIVE_WINDOW_MS = 4000;
var VIEWPORT_PRESET_SIZES = {
  mobile: { width: 390, height: 844, mobile: true },
  tablet: { width: 768, height: 1024, mobile: false },
  desktop: { width: 1280, height: 800, mobile: false }
};

class ServiceHttpError extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.name = "ServiceHttpError";
    this.status = status;
  }
}

class SessionHub {
  records = new Map;
  devtools = new DevToolsSurfaceController;
  activeSession = null;
  sessionPinned = false;
  mode = "viewport";
  viewportPreset = "fit";
  customViewport = { width: 1280, height: 800 };
  panelFitSize = { width: 1280, height: 800 };
  viewerScale = 1;
  colorScheme = "dark";
  selectCompatibility = false;
  harRecording = false;
  lastHarPath = null;
  dashboardPort = 4848;
  dashboardRunning = false;
  controller = "none";
  controllingViewer = null;
  surfaceSeq = 0;
  viewGeneration = 1;
  firstSeqOfCurrentView = 1;
  currentSurfaceFrame = null;
  frameWaiters = new Set;
  lastViewerPollAt = 0;
  eventSeq = 1;
  pickRefsCache = {};
  lastPickHoverAt = 0;
  hoverInFlight = false;
  statusCloseMap = new Map;
  pendingSessions = new Set;
  seedInFlight = new Set;
  lastInstructionsText = "";
  emitStateTimer = null;
  emitStatePriority = false;
  emitWindowStart = 0;
  emitCountInWindow = 0;
  discoveryTimer = null;
  serviceHost;
  dataDir;
  constructor(options) {
    this.serviceHost = options.serviceHost;
    this.dataDir = options.dataDir;
  }
  start() {
    this.refreshSessions();
    this.discoveryTimer = setInterval(() => {
      this.refreshSessions();
    }, 2000);
    this.discoveryTimer.unref?.();
  }
  async dispose() {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    if (this.emitStateTimer) {
      clearTimeout(this.emitStateTimer);
      this.emitStateTimer = null;
    }
    for (const waiter of this.frameWaiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    this.frameWaiters.clear();
    await this.devtools.close();
    for (const [, rec] of this.records) {
      rec.ws?.terminate();
      rec.ws = null;
    }
    this.records.clear();
  }
  isSessionUserControlled(session) {
    return this.controller === "user" && this.activeSession === session;
  }
  markAgentActive(session) {
    const rec = this.records.get(session);
    if (rec) {
      rec.agentActiveUntil = Date.now() + AGENT_ACTIVE_WINDOW_MS;
    }
  }
  isActiveSurfaceAgentDriving() {
    if (!this.activeSession)
      return false;
    const rec = this.records.get(this.activeSession);
    return Boolean(rec && rec.agentActiveUntil > Date.now());
  }
  getConsoleProblems(session) {
    const rec = this.records.get(session);
    if (!rec)
      return [];
    return rec.consoleEvents.filter((e) => e.level === "warn" || e.level === "error" || e.kind === "page_error").slice(-50).map((e) => ({
      level: e.level === "warn" ? "warning" : "error",
      message: e.text,
      source: e.kind === "page_error" ? "exception" : "console"
    }));
  }
  bumpViewFence() {
    this.viewGeneration += 1;
    this.firstSeqOfCurrentView = this.surfaceSeq + 1;
    this.currentSurfaceFrame = null;
  }
  checkFrameFence(frameSeqHeader) {
    if (!frameSeqHeader)
      return true;
    const seq = Number(frameSeqHeader);
    if (!Number.isFinite(seq) || seq <= 0)
      return true;
    return seq >= this.firstSeqOfCurrentView;
  }
  publishSurfaceFrame(bytes, width, height, title, upstreamSeq = 0) {
    this.surfaceSeq += 1;
    const frame = {
      seq: this.surfaceSeq,
      upstreamSeq,
      bytes,
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
      title: title.replace(/[^\x20-\x7E]/g, " ").trim().slice(0, 200)
    };
    this.currentSurfaceFrame = frame;
    const matched = [];
    for (const waiter of this.frameWaiters) {
      if (frame.seq > waiter.afterSeq) {
        matched.push(waiter);
      }
    }
    for (const waiter of matched) {
      this.frameWaiters.delete(waiter);
      clearTimeout(waiter.timer);
      waiter.resolve(frame);
    }
  }
  ackUpstreamIfViewerActive(rec, seq) {
    if (this.mode !== "devtools" && this.activeSession === rec.daemon.session && Date.now() - this.lastViewerPollAt < 30000 && rec.ws?.readyState === import_websocket.default.OPEN && seq > rec.ackedUpstreamSeq) {
      rec.ackedUpstreamSeq = seq;
      rec.ws.send(JSON.stringify({ type: "ack", seq }));
    }
  }
  async waitForSurfaceFrame(afterSeq, waitMs) {
    const wasColdViewer = Date.now() - this.lastViewerPollAt >= 30000;
    this.lastViewerPollAt = Date.now();
    if (this.activeSession) {
      const rec = this.records.get(this.activeSession);
      if (rec) {
        this.ensureSessionWebSocket(rec);
        if (wasColdViewer && rec.latestUpstreamFrame) {
          this.ackUpstreamIfViewerActive(rec, rec.latestUpstreamFrame.seq);
        }
        if (this.mode !== "devtools" && (!this.currentSurfaceFrame || this.currentSurfaceFrame.seq < this.firstSeqOfCurrentView)) {
          if (rec.latestUpstreamFrame) {
            this.publishSurfaceFrame(rec.latestUpstreamFrame.bytes, rec.latestUpstreamFrame.width, rec.latestUpstreamFrame.height, rec.title || rec.url || rec.daemon.session, rec.latestUpstreamFrame.seq);
          } else {
            this.seedInitialScreenshot(rec);
          }
        }
      }
    }
    if (this.currentSurfaceFrame && this.currentSurfaceFrame.seq > afterSeq) {
      if (this.activeSession) {
        const rec = this.records.get(this.activeSession);
        if (rec && this.currentSurfaceFrame.upstreamSeq > 0) {
          this.ackUpstreamIfViewerActive(rec, this.currentSurfaceFrame.upstreamSeq);
        }
      }
      return this.currentSurfaceFrame;
    }
    const boundedWait = Math.max(50, Math.min(25000, waitMs));
    return new Promise((resolve) => {
      const waiter = {
        afterSeq,
        resolve,
        timer: setTimeout(() => {
          this.frameWaiters.delete(waiter);
          resolve(null);
        }, boundedWait)
      };
      this.frameWaiters.add(waiter);
    });
  }
  async seedInitialScreenshot(rec) {
    if (this.seedInFlight.has(rec.daemon.session))
      return;
    this.seedInFlight.add(rec.daemon.session);
    try {
      const dir = path3.join(this.dataDir || os3.tmpdir(), "seed");
      fs3.mkdirSync(dir, { recursive: true });
      const tmpFile = path3.join(dir, `seed-${rec.daemon.session}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`);
      const shot = await sendDaemonSocketCommand(rec.daemon.sockPath, "screenshot", { path: tmpFile, format: "jpeg", quality: 80 }, 5000);
      if (!shot.success)
        return;
      const actual = shot.data?.path || tmpFile;
      const bytes = fs3.readFileSync(actual);
      try {
        fs3.unlinkSync(actual);
      } catch {}
      if (this.activeSession === rec.daemon.session && this.mode !== "devtools") {
        rec.latestUpstreamFrame = {
          seq: rec.latestUpstreamFrame?.seq ?? 1,
          bytes,
          width: rec.viewportWidth * this.viewerScale,
          height: rec.viewportHeight * this.viewerScale
        };
        this.publishSurfaceFrame(bytes, rec.viewportWidth * this.viewerScale, rec.viewportHeight * this.viewerScale, rec.title || rec.url || rec.daemon.session, rec.latestUpstreamFrame.seq);
      }
    } catch {} finally {
      this.seedInFlight.delete(rec.daemon.session);
    }
  }
  async refreshSessions(options = {}) {
    const readTargetId = (daemon) => {
      try {
        const raw = fs3.readFileSync(path3.join(daemon.socketDir, `${daemon.session}.target`), "utf8");
        const parsed = JSON.parse(raw);
        return typeof parsed.targetId === "string" && parsed.targetId ? parsed.targetId : null;
      } catch {
        return null;
      }
    };
    const discovered = discoverDaemonSessions();
    const seen = new Set;
    let changed = false;
    for (const daemon of discovered) {
      seen.add(daemon.session);
      const targetId = readTargetId(daemon);
      const existing = this.records.get(daemon.session);
      if (!existing) {
        const rec = {
          daemon,
          lastTargetId: targetId,
          ws: null,
          connecting: false,
          connected: true,
          screencasting: false,
          recording: false,
          url: "",
          title: "",
          viewportWidth: 1280,
          viewportHeight: 800,
          tabs: [],
          activity: [],
          consoleEvents: [],
          latenciesMs: [],
          latestUpstreamFrame: null,
          ackedUpstreamSeq: 0,
          agentActiveUntil: 0,
          clickTracker: INITIAL_CLICK_TRACKER
        };
        this.records.set(daemon.session, rec);
        this.ensureSessionWebSocket(rec);
        if (!options.skipAutoSelect) {
          this.hydrateSessionMetadata(rec);
        }
        changed = true;
      } else if (existing.daemon.streamPort !== daemon.streamPort || existing.daemon.pid !== daemon.pid) {
        existing.ws?.terminate();
        existing.ws = null;
        existing.daemon = daemon;
        existing.lastTargetId = targetId;
        this.ensureSessionWebSocket(existing);
        if (!options.skipAutoSelect) {
          this.hydrateSessionMetadata(existing);
        }
        changed = true;
      } else {
        if (targetId && targetId !== existing.lastTargetId) {
          existing.lastTargetId = targetId;
          if (!options.skipAutoSelect) {
            this.hydrateSessionMetadata(existing);
          }
        }
        if (!existing.ws && !existing.connecting) {
          this.ensureSessionWebSocket(existing);
        }
      }
    }
    for (const [name, rec] of this.records) {
      if (!seen.has(name)) {
        rec.ws?.terminate();
        this.records.delete(name);
        changed = true;
      }
    }
    if (this.activeSession && !this.records.has(this.activeSession)) {
      if (this.mode === "devtools") {
        await this.devtools.close();
      }
      this.mode = "viewport";
      this.sessionPinned = false;
      const preferred = options.preferredSession && this.records.has(options.preferredSession) ? options.preferredSession : null;
      this.activeSession = preferred ?? discovered[0]?.session ?? null;
      this.bumpViewFence();
      changed = true;
    } else if (!options.skipAutoSelect && !this.activeSession && discovered.length > 0) {
      const preferred = options.preferredSession && this.records.has(options.preferredSession) ? options.preferredSession : null;
      this.activeSession = preferred ?? discovered[0]?.session ?? null;
      this.bumpViewFence();
      if (this.activeSession) {
        const autoRec = this.records.get(this.activeSession);
        if (autoRec && !autoRec.latestUpstreamFrame) {
          this.seedInitialScreenshot(autoRec);
        }
      }
      changed = true;
    } else if (!options.skipAutoSelect && options.followPreferred && options.preferredSession && this.records.has(options.preferredSession) && this.activeSession !== options.preferredSession && this.controller !== "user" && !this.sessionPinned) {
      await this.activateSession(options.preferredSession);
    }
    if (!options.skipDashboardCheck) {
      const dash = await checkDashboardServer(process.env, this.dashboardPort);
      if (dash.running !== this.dashboardRunning) {
        this.dashboardRunning = dash.running;
        changed = true;
      }
    }
    if (changed) {
      this.scheduleStateEmit(true);
      this.syncInstructions();
    }
  }
  async hydrateSessionMetadata(rec) {
    try {
      const [tabsRes, urlRes, titleRes] = await Promise.allSettled([
        fetch(`http://127.0.0.1:${rec.daemon.streamPort}/api/tabs`, {
          signal: AbortSignal.timeout(1500)
        }),
        sendDaemonSocketCommand(rec.daemon.sockPath, "url", {}, 2000),
        sendDaemonSocketCommand(rec.daemon.sockPath, "title", {}, 2000)
      ]);
      let updated = false;
      if (tabsRes.status === "fulfilled" && tabsRes.value.ok) {
        const rawTabs = await tabsRes.value.json();
        if (Array.isArray(rawTabs)) {
          rec.tabs = rawTabs.map((t, idx) => ({
            tabId: asString(t.tabId, `t${idx + 1}`),
            title: asString(t.title),
            url: redactUrl(asString(t.url)),
            type: asString(t.type, "page"),
            active: Boolean(t.active)
          }));
          const active = rec.tabs.find((t) => t.active);
          if (active) {
            rec.url = active.url;
            rec.title = active.title;
          }
          updated = true;
        }
      }
      if (urlRes.status === "fulfilled" && urlRes.value.success && typeof urlRes.value.data?.url === "string") {
        rec.url = redactUrl(urlRes.value.data.url);
        updated = true;
      }
      if (titleRes.status === "fulfilled" && titleRes.value.success && typeof titleRes.value.data?.title === "string") {
        rec.title = titleRes.value.data.title;
        updated = true;
      }
      if (updated) {
        this.scheduleStateEmit();
        this.syncInstructions();
      }
    } catch {}
  }
  ensureSessionWebSocket(rec) {
    if (rec.ws || rec.connecting)
      return;
    rec.connecting = true;
    const wsUrl = `ws://127.0.0.1:${rec.daemon.streamPort}/?pacing=ack&maxFps=24`;
    const ws = new import_websocket.default(wsUrl, {
      maxPayload: 32 * 1024 * 1024,
      perMessageDeflate: false
    });
    ws.once("open", () => {
      rec.connecting = false;
      rec.ws = ws;
      rec.ackedUpstreamSeq = 0;
    });
    ws.on("message", (data, isBinary) => {
      if (isBinary)
        return;
      const utf8 = Buffer.isBuffer(data) ? data.toString("utf8") : Array.isArray(data) ? Buffer.concat(data).toString("utf8") : Buffer.from(data).toString("utf8");
      this.handleStreamWsMessage(rec, utf8);
    });
    const cleanup = () => {
      rec.connecting = false;
      if (rec.ws === ws) {
        rec.ws = null;
      }
    };
    ws.on("close", cleanup);
    ws.on("error", cleanup);
  }
  handleStreamWsMessage(rec, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const type = asString(msg.type);
    if (type === "frame") {
      const b64 = typeof msg.data === "string" ? msg.data : "";
      const seq = Number(msg.seq) || 1;
      if (!b64)
        return;
      const meta = msg.metadata ?? {};
      const w = Number(meta.deviceWidth) || rec.viewportWidth || 1280;
      const h = Number(meta.deviceHeight) || rec.viewportHeight || 800;
      const bytes = Buffer.from(b64, "base64");
      rec.latestUpstreamFrame = {
        seq,
        bytes,
        width: w * this.viewerScale,
        height: h * this.viewerScale
      };
      if (this.activeSession === rec.daemon.session && this.mode !== "devtools") {
        this.publishSurfaceFrame(bytes, w * this.viewerScale, h * this.viewerScale, rec.title || rec.url || rec.daemon.session, seq);
        this.ackUpstreamIfViewerActive(rec, seq);
      }
      return;
    }
    if (type === "status") {
      rec.connected = Boolean(msg.connected);
      rec.screencasting = Boolean(msg.screencasting);
      rec.recording = Boolean(msg.recording);
      if (typeof msg.viewportWidth === "number" && msg.viewportWidth > 0) {
        rec.viewportWidth = msg.viewportWidth;
      }
      if (typeof msg.viewportHeight === "number" && msg.viewportHeight > 0) {
        rec.viewportHeight = msg.viewportHeight;
      }
      this.scheduleStateEmit();
      return;
    }
    if (type === "url") {
      const nextUrl = redactUrl(asString(msg.url));
      if (nextUrl && nextUrl !== rec.url) {
        rec.url = nextUrl;
        this.scheduleStateEmit();
        this.syncInstructions();
      }
      return;
    }
    if (type === "tabs" && Array.isArray(msg.tabs)) {
      const prevActive = rec.tabs.find((t) => t.active)?.tabId ?? null;
      const prevUrl = rec.url;
      rec.tabs = msg.tabs.map((t, idx) => ({
        tabId: asString(t.tabId, `t${idx + 1}`),
        title: asString(t.title),
        url: redactUrl(asString(t.url)),
        type: asString(t.type, "page"),
        active: Boolean(t.active)
      }));
      const active = rec.tabs.find((t) => t.active);
      if (active) {
        rec.url = active.url;
        rec.title = active.title;
        if (this.activeSession === rec.daemon.session && prevActive && prevActive !== active.tabId) {
          this.bumpViewFence();
        }
      }
      this.scheduleStateEmit();
      if (rec.url !== prevUrl || prevActive !== active?.tabId) {
        this.syncInstructions();
      }
      return;
    }
    if (type === "command") {
      const id = asString(msg.id, `cmd-${this.eventSeq}`);
      const action = asString(msg.action, "command");
      const rawParams = msg.params ?? {};
      const safeParams = redactUnknown(rawParams) ?? {};
      const item = {
        seq: this.eventSeq++,
        id,
        session: rec.daemon.session,
        action,
        params: safeParams,
        status: "running",
        durationMs: null,
        dataPreview: null,
        startedAt: Number(msg.timestamp) || Date.now(),
        finishedAt: null
      };
      rec.agentActiveUntil = Date.now() + AGENT_ACTIVE_WINDOW_MS;
      rec.activity = [...rec.activity.slice(-(MAX_ACTIVITY_EVENTS - 1)), item];
      this.emitPush("activity", item);
      this.scheduleStateEmit();
      return;
    }
    if (type === "result") {
      const id = asString(msg.id);
      const action = asString(msg.action, "command");
      const hasError = msg.error !== undefined && msg.error !== null && msg.error !== "";
      const success = hasError ? false : msg.success === true ? true : msg.data !== null && msg.data !== undefined;
      const durationMs = typeof msg.duration_ms === "number" ? Math.round(msg.duration_ms) : null;
      const finishedAt = Number(msg.timestamp) || Date.now();
      const preview = formatPreviewJson(hasError ? msg.error : msg.data, 900);
      if (durationMs !== null && durationMs >= 0) {
        rec.latenciesMs = [
          ...rec.latenciesMs.slice(-(MAX_LATENCY_POINTS - 1)),
          durationMs
        ];
      }
      const existingIdx = rec.activity.findLastIndex((a) => a.id === id);
      let updatedItem;
      if (existingIdx >= 0) {
        const prev = rec.activity[existingIdx];
        updatedItem = {
          ...prev,
          status: success ? "ok" : "error",
          durationMs,
          dataPreview: preview,
          finishedAt
        };
        rec.activity = rec.activity.map((entry, idx) => idx === existingIdx ? updatedItem : entry);
      } else {
        updatedItem = {
          seq: this.eventSeq++,
          id: id || `res-${this.eventSeq}`,
          session: rec.daemon.session,
          action,
          params: {},
          status: success ? "ok" : "error",
          durationMs,
          dataPreview: preview,
          startedAt: finishedAt - (durationMs ?? 0),
          finishedAt
        };
        rec.activity = [
          ...rec.activity.slice(-(MAX_ACTIVITY_EVENTS - 1)),
          updatedItem
        ];
      }
      this.emitPush("activity", updatedItem);
      this.scheduleStateEmit();
      return;
    }
    if (type === "console" || type === "page_error") {
      const rawLevel = asString(msg.level, type === "page_error" ? "error" : "log").toLowerCase();
      const level = rawLevel === "warn" || rawLevel === "warning" ? "warn" : rawLevel === "error" ? "error" : rawLevel === "info" ? "info" : rawLevel === "debug" ? "debug" : "log";
      const argsRaw = Array.isArray(msg.args) ? msg.args : [];
      const argsPreview = argsRaw.slice(0, 8).map((arg) => formatPreviewJson(arg, 300) ?? "").filter(Boolean);
      const entry = {
        seq: this.eventSeq++,
        session: rec.daemon.session,
        kind: type === "page_error" ? "page_error" : "console",
        level,
        text: redactText(asString(msg.text), 1500),
        argsPreview,
        line: typeof msg.line === "number" ? msg.line : null,
        column: typeof msg.column === "number" ? msg.column : null,
        timestamp: Number(msg.timestamp) || Date.now()
      };
      rec.consoleEvents = [
        ...rec.consoleEvents.slice(-(MAX_CONSOLE_EVENTS - 1)),
        entry
      ];
      this.emitPush("console", entry);
      this.scheduleStateEmit();
    }
  }
  emitPush(topic, data, priority = false) {
    if (!this.serviceHost)
      return;
    if (!priority) {
      const now = Date.now();
      if (now - this.emitWindowStart >= 1000) {
        this.emitWindowStart = now;
        this.emitCountInWindow = 0;
      }
      if (this.emitCountInWindow >= 16)
        return;
      this.emitCountInWindow += 1;
    }
    this.serviceHost.emit(topic, data).catch(() => {});
  }
  scheduleStateEmit(priority = false) {
    if (priority) {
      this.emitStatePriority = true;
    }
    if (this.emitStateTimer)
      return;
    this.emitStateTimer = setTimeout(() => {
      const highPriority = this.emitStatePriority;
      this.emitStateTimer = null;
      this.emitStatePriority = false;
      this.emitPush("state", this.getDockState(), highPriority);
    }, 80);
    this.emitStateTimer.unref?.();
  }
  async syncInstructions() {
    if (!this.serviceHost)
      return;
    const summaries = this.buildSessionSummaries();
    const sessionList = summaries.slice(0, 5).map((s) => `${s.session} (${s.url || "about:blank"}${s.errorCount > 0 ? `, ${s.errorCount} console errors` : ""})`).join("; ");
    const nextText = summaries.length === 0 ? "" : [
      `Active agent-browser sessions: ${sessionList}.`,
      `Two browser surfaces: openchamber_web uses OpenChamber's configured Browser Provider (either "builtin" in-app tab, or agent-browser session oc-<sessionId[:16]> returned in data.session); manual/panel sessions (e.g. "default", "session-2") are separate and cannot be driven by openchamber_web.`,
      `Safe read-only CLI inspection (avoids proxy/proxy-bypass Chrome relaunches caused by OpenChamber stripping NO_PROXY/HTTP_PROXY from service env): run \`env -u NO_PROXY -u no_proxy -u HTTP_PROXY -u http_proxy -u HTTPS_PROXY -u https_proxy -u ALL_PROXY -u all_proxy agent-browser --session <name> <network requests --filter <pat> --json | network request <id> --json | cookies get --json | storage local --json | get url>\` (CLI returns unredacted headers/tokens; Observatory UI and @Browser mentions redact secrets).`,
      `Note: shell-only AGENT_BROWSER_* launch overrides outside ~/.agent-browser/config.json can also relaunch an extension-started daemon's Chrome to about:blank.`
    ].join(" ").slice(0, 2000);
    if (nextText === this.lastInstructionsText)
      return;
    this.lastInstructionsText = nextText;
    await this.serviceHost.setInstructions(null, nextText).catch(() => {});
  }
  buildSessionSummaries() {
    return [...this.records.values()].map((rec) => {
      const activeTab = rec.tabs.find((t) => t.active) ?? rec.tabs[0] ?? null;
      const lastAct = rec.activity.at(-1) ?? null;
      const selectorOrTarget = lastAct ? asString(lastAct.params.selector ?? lastAct.params.url ?? lastAct.params.key) || null : null;
      const lastCommand = lastAct ? {
        action: lastAct.action,
        status: lastAct.status,
        durationMs: lastAct.durationMs,
        selectorOrTarget,
        timestamp: lastAct.finishedAt ?? lastAct.startedAt
      } : null;
      const errorCount = rec.consoleEvents.filter((c) => c.level === "error" || c.kind === "page_error").length;
      const warningCount = rec.consoleEvents.filter((c) => c.level === "warn").length;
      return {
        session: rec.daemon.session,
        port: rec.daemon.streamPort,
        pid: rec.daemon.pid,
        engine: rec.daemon.engine,
        provider: rec.daemon.provider,
        connected: rec.connected,
        screencasting: rec.screencasting,
        recording: rec.recording,
        url: rec.url || activeTab?.url || "",
        title: rec.title || activeTab?.title || "",
        viewportWidth: rec.viewportWidth,
        viewportHeight: rec.viewportHeight,
        tabs: rec.tabs,
        activeTabId: activeTab?.tabId ?? null,
        commandCount: rec.activity.length,
        errorCount,
        warningCount,
        lastCommand,
        canInspectDevTools: rec.daemon.engine === "chrome" && rec.daemon.provider === null
      };
    });
  }
  getDockState() {
    const sessions = this.buildSessionSummaries();
    const activeRec = this.activeSession ? this.records.get(this.activeSession) ?? null : null;
    return {
      sessions,
      activeSession: this.activeSession,
      sessionPinned: this.sessionPinned,
      mode: this.mode,
      viewportPreset: this.viewportPreset,
      customViewport: this.customViewport,
      viewerScale: this.viewerScale,
      selectCompatibility: this.selectCompatibility,
      harRecording: this.harRecording,
      lastHarPath: this.lastHarPath,
      dashboardUrl: `http://localhost:${this.dashboardPort}`,
      dashboardRunning: this.dashboardRunning,
      controller: this.controller,
      viewGeneration: this.viewGeneration,
      recentActivity: activeRec ? activeRec.activity.slice(-40) : [],
      recentConsole: activeRec ? activeRec.consoleEvents.slice(-40) : []
    };
  }
  getObservatorySnapshot(sessionOverride) {
    const state = this.getDockState();
    const targetName = sessionOverride ?? this.activeSession;
    const rec = targetName ? this.records.get(targetName) ?? null : null;
    return {
      state,
      activity: rec ? rec.activity : [],
      consoleEvents: rec ? rec.consoleEvents : []
    };
  }
  setControlState(controller, viewer) {
    this.controller = controller;
    this.controllingViewer = controller === "user" ? viewer ?? null : null;
    this.scheduleStateEmit();
  }
  async resizeSurface(width, height) {
    const cssW = Math.max(320, Math.min(3840, Math.round(width / this.viewerScale)));
    const cssH = Math.max(240, Math.min(2400, Math.round(height / this.viewerScale)));
    this.panelFitSize = { width: cssW, height: cssH };
    if (this.mode === "devtools" && this.devtools.isOpen) {
      await this.devtools.resize(cssW, cssH, this.viewerScale);
      return {
        width: cssW * this.viewerScale,
        height: cssH * this.viewerScale
      };
    }
    if (this.viewportPreset === "fit" && this.activeSession) {
      const rec = this.records.get(this.activeSession);
      if (rec) {
        await sendDaemonSocketCommand(rec.daemon.sockPath, "viewport", { width: cssW, height: cssH, deviceScaleFactor: 1, mobile: false }, 4000).catch(() => {});
        rec.viewportWidth = cssW;
        rec.viewportHeight = cssH;
      }
    }
    return { width: cssW * this.viewerScale, height: cssH * this.viewerScale };
  }
  async readClipboard() {
    if (this.mode === "devtools" && this.devtools.isOpen) {
      return this.devtools.clipboardText;
    }
    if (!this.activeSession)
      return "";
    const rec = this.records.get(this.activeSession);
    if (!rec)
      return "";
    try {
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "clipboard", { operation: "read" }, 3000);
      if (res.success && typeof res.data?.text === "string") {
        return res.data.text.slice(0, 32000);
      }
      const selRes = await sendDaemonSocketCommand(rec.daemon.sockPath, "evaluate", { script: 'String(window.getSelection?.() || "")' }, 2000);
      return String(selRes.data?.result ?? "").slice(0, 32000);
    } catch {
      return "";
    }
  }
  async handleSurfaceInput(events) {
    if (this.mode === "devtools" && this.devtools.isOpen) {
      await this.devtools.dispatchSurfaceInput(events);
      return;
    }
    if (!this.activeSession)
      return;
    const rec = this.records.get(this.activeSession);
    if (!rec)
      return;
    if (this.mode === "pick") {
      await this.handlePickModeInput(rec, events);
      return;
    }
    this.ensureSessionWebSocket(rec);
    if (rec.ws?.readyState !== import_websocket.default.OPEN)
      return;
    const frameW = this.currentSurfaceFrame?.width || rec.viewportWidth * this.viewerScale;
    const frameH = this.currentSurfaceFrame?.height || rec.viewportHeight * this.viewerScale;
    const { messages, tracker } = translateSurfaceEventsToWsMessages(events, {
      frameWidth: frameW,
      frameHeight: frameH,
      viewportWidth: rec.viewportWidth,
      viewportHeight: rec.viewportHeight
    }, rec.clickTracker);
    rec.clickTracker = tracker;
    for (const message of messages) {
      rec.ws.send(JSON.stringify(message));
    }
  }
  async handlePickModeInput(rec, events) {
    const frameW = this.currentSurfaceFrame?.width || rec.viewportWidth * this.viewerScale;
    const frameH = this.currentSurfaceFrame?.height || rec.viewportHeight * this.viewerScale;
    for (const event of events) {
      if (event.type === "key" && event.action === "down" && event.key === "Escape") {
        await this.setInspectMode("viewport");
        return;
      }
      if (event.type === "pointer") {
        const cssX = scaleCoordinate(event.x, frameW, rec.viewportWidth);
        const cssY = scaleCoordinate(event.y, frameH, rec.viewportHeight);
        if (event.action === "down" && event.button === 0) {
          const pickedRes = await sendDaemonSocketCommand(rec.daemon.sockPath, "evaluate", {
            script: buildCapturePickedElementScript(cssX, cssY, rec.daemon.session, this.pickRefsCache)
          }, 5000).catch(() => null);
          this.mode = "viewport";
          this.scheduleStateEmit();
          const picked = pickedRes?.data?.result ?? null;
          if (picked) {
            this.emitPush("element-picked", picked, true);
          }
          return;
        }
        if (event.action === "move" && !this.hoverInFlight && Date.now() - this.lastPickHoverAt >= 55) {
          this.lastPickHoverAt = Date.now();
          this.hoverInFlight = true;
          sendDaemonSocketCommand(rec.daemon.sockPath, "evaluate", { script: buildHoverPickScript(cssX, cssY, this.pickRefsCache) }, 1500).catch(() => {}).finally(() => {
            this.hoverInFlight = false;
          });
        }
      }
    }
  }
  async activateSession(session, options = {}) {
    if (!this.records.has(session)) {
      throw new Error(`Session "${session}" is not running`);
    }
    const switching = this.activeSession !== session;
    if (switching || options.forceRefreshView) {
      if (this.mode === "devtools") {
        await this.devtools.close();
      } else if (this.mode === "pick" && this.activeSession) {
        const oldRec = this.records.get(this.activeSession);
        if (oldRec) {
          await sendDaemonSocketCommand(oldRec.daemon.sockPath, "evaluate", { script: CLEAR_PICK_OVERLAY_SCRIPT }, 1500).catch(() => {});
        }
      }
      this.mode = "viewport";
      this.activeSession = session;
      this.bumpViewFence();
      const rec = this.records.get(session);
      if (rec.latestUpstreamFrame) {
        this.publishSurfaceFrame(rec.latestUpstreamFrame.bytes, rec.latestUpstreamFrame.width, rec.latestUpstreamFrame.height, rec.title || rec.url || session, rec.latestUpstreamFrame.seq);
      } else {
        this.seedInitialScreenshot(rec);
      }
      this.scheduleStateEmit(true);
    }
  }
  async selectSession(session) {
    await this.refreshSessions();
    if (this.activeSession !== session) {
      this.sessionPinned = false;
    }
    await this.activateSession(session);
    return this.getDockState();
  }
  setSessionPinned(pinned) {
    this.sessionPinned = pinned && Boolean(this.activeSession);
    this.scheduleStateEmit(true);
    return this.getDockState();
  }
  normalizeUrlOrThrow(raw, emptyFallback) {
    try {
      return normalizeNavigationUrl(raw, emptyFallback);
    } catch (err) {
      throw new ServiceHttpError(400, err instanceof Error ? err.message : String(err));
    }
  }
  async cleanupOrphanDaemon(session) {
    const killPid = (pid) => {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        return;
      }
      const killTimer = setTimeout(() => {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }, 400);
      killTimer.unref?.();
    };
    const orphan = discoverDaemonSessions().find((d) => d.session === session);
    if (orphan) {
      await sendDaemonSocketCommand(orphan.sockPath, "close", {}, 1500).catch(() => {
        killPid(orphan.pid);
      });
    } else {
      await execAgentBrowserCli(["--session", session, "close"], {
        timeoutMs: 1500
      }).catch(() => {});
      const lingering = discoverDaemonSessions().find((d) => d.session === session);
      if (lingering) {
        killPid(lingering.pid);
      }
    }
    await this.refreshSessions({ skipDashboardCheck: true }).catch(() => {});
  }
  async createSession(name, url = "https://example.com", options = {}) {
    const clean = sanitizeSessionName(name);
    const targetUrl = this.normalizeUrlOrThrow(url, "about:blank");
    if (!options.skipInitialRefresh) {
      await this.refreshSessions({ skipDashboardCheck: true });
    }
    const existedBefore = this.records.has(clean);
    const isPending = this.pendingSessions.has(clean);
    if ((existedBefore || isPending) && !options.allowExisting) {
      throw new ServiceHttpError(409, `Session "${clean}" already exists — select it from the session menu or choose a new name.`);
    }
    this.pendingSessions.add(clean);
    try {
      const cliRes = await execAgentBrowserCli(["--session", clean, "open", targetUrl, "--json"], { timeoutMs: 12000 });
      const cliErr = extractAgentBrowserCliError(cliRes);
      if (cliErr) {
        throw new Error(cliErr);
      }
      await this.refreshSessions({
        skipAutoSelect: true,
        skipDashboardCheck: true
      });
      const rec = this.records.get(clean);
      if (!rec) {
        throw new Error(`Agent-browser daemon for session "${clean}" did not start.`);
      }
      await this.activateSession(clean, { forceRefreshView: true });
      await this.hydrateSessionMetadata(rec);
      this.scheduleStateEmit(true);
      return this.getDockState();
    } catch (err) {
      if (!existedBefore) {
        await this.cleanupOrphanDaemon(clean);
      }
      throw err;
    } finally {
      this.pendingSessions.delete(clean);
    }
  }
  async closeSession(session) {
    const rec = this.records.get(session);
    if (rec) {
      if (this.activeSession === session && this.mode === "devtools") {
        await this.devtools.close();
        this.mode = "viewport";
      }
      await sendDaemonSocketCommand(rec.daemon.sockPath, "close", {}, 5000).catch(async () => {
        await execAgentBrowserCli(["--session", session, "close"], {
          timeoutMs: 5000
        }).catch(() => {});
      });
    }
    await this.refreshSessions();
    return this.getDockState();
  }
  async setInspectMode(nextMode, colorScheme) {
    if (colorScheme) {
      this.colorScheme = colorScheme;
    }
    if (!this.activeSession) {
      throw new Error("Start or select an agent-browser session first");
    }
    const rec = this.records.get(this.activeSession);
    if (!rec) {
      throw new Error(`Session "${this.activeSession}" is unavailable`);
    }
    if (this.mode === nextMode) {
      return this.getDockState();
    }
    if (this.mode === "devtools") {
      await this.devtools.close();
    }
    if (this.mode === "pick") {
      await sendDaemonSocketCommand(rec.daemon.sockPath, "evaluate", { script: CLEAR_PICK_OVERLAY_SCRIPT }, 1500).catch(() => {});
    }
    if (nextMode === "devtools") {
      if (rec.daemon.engine !== "chrome" || rec.daemon.provider !== null) {
        throw new Error("Bundled Chrome DevTools is available only on local Chrome sessions");
      }
      const cdpRes = await sendDaemonSocketCommand(rec.daemon.sockPath, "cdp_url", {}, 4000);
      const browserWsUrl = cdpRes.data?.cdpUrl;
      if (!cdpRes.success || !browserWsUrl) {
        throw new Error(cdpRes.error || "Could not obtain Chrome CDP WebSocket URL");
      }
      this.mode = "devtools";
      this.bumpViewFence();
      await this.devtools.open({
        browserWsUrl,
        preferredPageUrl: rec.url,
        width: this.panelFitSize.width,
        height: this.panelFitSize.height,
        scale: this.viewerScale,
        colorScheme: this.colorScheme,
        onFrame: (frame) => {
          if (this.mode === "devtools") {
            this.publishSurfaceFrame(frame.bytes, frame.width, frame.height, frame.title, 0);
          }
        },
        onClosed: () => {
          if (this.mode === "devtools") {
            this.mode = "viewport";
            this.bumpViewFence();
            this.scheduleStateEmit();
          }
        }
      });
      this.scheduleStateEmit();
      return this.getDockState();
    }
    if (nextMode === "pick") {
      this.pickRefsCache = {};
      const snapRes = await sendDaemonSocketCommand(rec.daemon.sockPath, "snapshot", { interactive: true, compact: true }, 6000).catch(() => null);
      if (snapRes?.success && snapRes.data?.refs) {
        this.pickRefsCache = snapRes.data.refs;
      }
      this.mode = "pick";
      this.scheduleStateEmit();
      return this.getDockState();
    }
    this.mode = "viewport";
    this.bumpViewFence();
    if (rec.latestUpstreamFrame) {
      this.publishSurfaceFrame(rec.latestUpstreamFrame.bytes, rec.latestUpstreamFrame.width, rec.latestUpstreamFrame.height, rec.title || rec.url || rec.daemon.session, rec.latestUpstreamFrame.seq);
    } else {
      this.seedInitialScreenshot(rec);
    }
    this.scheduleStateEmit();
    return this.getDockState();
  }
  async performNavigation(op, payload) {
    if (!this.activeSession) {
      if (op === "navigate" && payload.url) {
        const targetUrl = this.normalizeUrlOrThrow(payload.url);
        await this.refreshSessions({ skipDashboardCheck: true });
        if (!this.activeSession) {
          return this.createSession("default", targetUrl, {
            allowExisting: true,
            skipInitialRefresh: true
          });
        }
      } else {
        throw new Error("No active agent-browser session");
      }
    }
    const rec = this.records.get(this.activeSession);
    if (!rec)
      throw new Error(`Session "${this.activeSession}" is not running`);
    if (op === "navigate") {
      const url = this.normalizeUrlOrThrow(payload.url);
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "navigate", { url }, 14000);
      if (!res.success)
        throw new Error(res.error || `Navigation to ${url} failed`);
    } else if (op === "tab_new") {
      const tabUrl = payload.url?.trim() ? this.normalizeUrlOrThrow(payload.url) : undefined;
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "tab_new", tabUrl ? { url: tabUrl } : {}, 14000);
      if (!res.success)
        throw new Error(res.error || "Could not open new tab");
      this.bumpViewFence();
    } else if (op === "tab_switch") {
      if (!payload.tabId)
        throw new Error("Missing tabId");
      if (this.mode === "devtools") {
        await this.devtools.close();
        this.mode = "viewport";
      }
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "tab_switch", { tabId: payload.tabId }, 8000);
      if (!res.success)
        throw new Error(res.error || `Could not switch to ${payload.tabId}`);
      this.bumpViewFence();
    } else if (op === "tab_close") {
      if (!payload.tabId)
        throw new Error("Missing tabId");
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "tab_close", { tabId: payload.tabId }, 8000);
      if (!res.success)
        throw new Error(res.error || `Could not close ${payload.tabId}`);
      this.bumpViewFence();
    } else {
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, op, {}, 15000);
      if (!res.success)
        throw new Error(res.error || `${op} failed`);
    }
    await this.hydrateSessionMetadata(rec);
    return this.getDockState();
  }
  async updateViewportSettings(input) {
    if (input.colorScheme) {
      this.colorScheme = input.colorScheme;
    }
    if (input.viewerScale === 1 || input.viewerScale === 2 || input.viewerScale === 3) {
      this.viewerScale = input.viewerScale;
    }
    if (input.preset) {
      this.viewportPreset = input.preset;
    }
    if (typeof input.width === "number" && typeof input.height === "number") {
      this.customViewport = {
        width: Math.max(240, Math.min(3840, Math.round(input.width))),
        height: Math.max(240, Math.min(2400, Math.round(input.height)))
      };
    }
    if (typeof input.selectCompatibility === "boolean") {
      this.selectCompatibility = input.selectCompatibility;
    }
    if (this.activeSession) {
      const rec = this.records.get(this.activeSession);
      if (rec) {
        const dims = this.viewportPreset === "fit" ? { ...this.panelFitSize, mobile: false } : this.viewportPreset === "custom" ? { ...this.customViewport, mobile: false } : VIEWPORT_PRESET_SIZES[this.viewportPreset];
        await sendDaemonSocketCommand(rec.daemon.sockPath, "viewport", {
          width: dims.width,
          height: dims.height,
          deviceScaleFactor: this.viewerScale,
          mobile: dims.mobile
        }, 6000).catch(() => {});
        rec.viewportWidth = dims.width;
        rec.viewportHeight = dims.height;
        if (rec.daemon.engine === "chrome" && rec.daemon.provider === null) {
          const cdpRes = await sendDaemonSocketCommand(rec.daemon.sockPath, "cdp_url", {}, 3000).catch(() => null);
          if (cdpRes?.success && cdpRes.data?.cdpUrl) {
            try {
              const cdp = await CdpClient.connect(cdpRes.data.cdpUrl, 3000);
              const target = await findActivePageTarget(cdp, rec.url);
              if (target) {
                const att = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, undefined, 3000);
                const sid = asString(att.sessionId);
                if (sid) {
                  await applyScreenScale(cdp, sid, this.viewerScale);
                  if (typeof input.selectCompatibility === "boolean") {
                    await applyBaseSelectCompatibility(cdp, sid, this.selectCompatibility);
                  }
                  await cdp.send("Target.detachFromTarget", { sessionId: sid }, undefined, 2000).catch(() => {});
                }
              }
              cdp.close();
            } catch {}
          }
        }
      }
    }
    this.scheduleStateEmit();
    return this.getDockState();
  }
  async sendSoftKeyboardDiff(input) {
    if (!this.activeSession)
      return;
    const rec = this.records.get(this.activeSession);
    if (!rec)
      return;
    const events = [];
    for (let i = 0;i < Math.min(64, Math.max(0, input.backspaces)); i += 1) {
      events.push({
        type: "key",
        action: "down",
        key: "Backspace",
        code: "Backspace",
        keyCode: 8,
        modifiers: { alt: false, ctrl: false, meta: false, shift: false }
      });
      events.push({
        type: "key",
        action: "up",
        key: "Backspace",
        code: "Backspace",
        keyCode: 8,
        modifiers: { alt: false, ctrl: false, meta: false, shift: false }
      });
    }
    if (input.text) {
      events.push({ type: "text", text: input.text });
    }
    if (input.enter) {
      events.push({
        type: "key",
        action: "down",
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        modifiers: { alt: false, ctrl: false, meta: false, shift: false }
      });
      events.push({
        type: "key",
        action: "up",
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        modifiers: { alt: false, ctrl: false, meta: false, shift: false }
      });
    }
    await this.handleSurfaceInput(events);
  }
  async evaluateRepl(session, expression) {
    const targetName = session ?? this.activeSession;
    if (!targetName)
      return { ok: false, output: "No active session selected" };
    const rec = this.records.get(targetName);
    if (!rec)
      return { ok: false, output: `Session "${targetName}" is not running` };
    try {
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "evaluate", { script: expression }, 6000);
      if (!res.success) {
        return {
          ok: false,
          output: redactText(res.error || "Evaluation failed", 4000)
        };
      }
      const formatted = formatPreviewJson(res.data?.result, 4000) ?? asString(res.data?.result, "undefined");
      return { ok: true, output: formatted };
    } catch (err) {
      return {
        ok: false,
        output: err instanceof Error ? err.message : String(err)
      };
    }
  }
  async listNetworkRequests(session, options = {}) {
    const targetName = session ?? this.activeSession;
    if (!targetName)
      return [];
    const rec = this.records.get(targetName);
    if (!rec)
      return [];
    if (options.clear) {
      await sendDaemonSocketCommand(rec.daemon.sockPath, "requests", { clear: true }, 4000).catch(() => {});
      return [];
    }
    const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "requests", options.typeFilter ? { type: options.typeFilter } : {}, 6000).catch(() => null);
    if (!res?.success || !Array.isArray(res.data?.requests))
      return [];
    return res.data.requests.slice(-200).map((item, idx) => ({
      requestId: asString(item.requestId ?? item.request_id, `req-${idx}`),
      method: asString(item.method, "GET"),
      url: redactUrl(asString(item.url)),
      status: typeof item.status === "number" ? item.status : null,
      resourceType: asString(item.resourceType ?? item.resource_type, "other"),
      mimeType: typeof item.mimeType === "string" ? item.mimeType : typeof item.mime_type === "string" ? item.mime_type : null,
      timestamp: typeof item.timestamp === "number" ? item.timestamp : null
    }));
  }
  async getNetworkRequestDetail(session, requestId) {
    const targetName = session ?? this.activeSession;
    if (!targetName || !requestId)
      return null;
    const rec = this.records.get(targetName);
    if (!rec)
      return null;
    const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "request_detail", { requestId }, 8000).catch(() => null);
    if (!res?.success || !res.data)
      return null;
    const d = res.data;
    const mimeType = typeof d.mimeType === "string" ? d.mimeType : typeof d.mime_type === "string" ? d.mime_type : null;
    return {
      requestId: asString(d.requestId ?? d.request_id, requestId),
      method: asString(d.method, "GET"),
      url: redactUrl(asString(d.url)),
      status: typeof d.status === "number" ? d.status : null,
      resourceType: asString(d.resourceType ?? d.resource_type, "other"),
      mimeType,
      timestamp: typeof d.timestamp === "number" ? d.timestamp : null,
      headers: redactHeaders(d.headers ?? {}),
      responseHeaders: redactHeaders(d.responseHeaders ?? d.response_headers ?? {}),
      postData: redactBodyText(typeof d.postData === "string" ? d.postData : typeof d.post_data === "string" ? d.post_data : null, null, 6000),
      responseBody: redactBodyText(typeof d.responseBody === "string" ? d.responseBody : null, mimeType, 8000)
    };
  }
  async toggleHarRecording(session) {
    const targetName = session ?? this.activeSession;
    if (!targetName)
      throw new Error("No active session");
    const rec = this.records.get(targetName);
    if (!rec)
      throw new Error(`Session "${targetName}" is not running`);
    if (!this.harRecording) {
      const harDir = path3.join(this.dataDir || os3.tmpdir(), "har");
      fs3.mkdirSync(harDir, { recursive: true });
      const targetPath = path3.join(harDir, `${targetName}-${Date.now()}.har`);
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "har_start", { path: targetPath }, 6000);
      if (!res.success)
        throw new Error(res.error || "Could not start HAR capture");
      this.harRecording = true;
      this.lastHarPath = targetPath;
    } else {
      const res = await sendDaemonSocketCommand(rec.daemon.sockPath, "har_stop", {}, 8000);
      this.harRecording = false;
      if (res.success && typeof res.data?.path === "string") {
        this.lastHarPath = res.data.path;
      }
    }
    this.scheduleStateEmit();
    return this.getDockState();
  }
  async getStorageSnapshot(session) {
    const targetName = session ?? this.activeSession;
    if (!targetName)
      return null;
    const rec = this.records.get(targetName);
    if (!rec)
      return null;
    const [cookiesRes, localRes, sessionRes] = await Promise.allSettled([
      sendDaemonSocketCommand(rec.daemon.sockPath, "cookies_get", {}, 5000),
      sendDaemonSocketCommand(rec.daemon.sockPath, "storage_get", { type: "local" }, 5000),
      sendDaemonSocketCommand(rec.daemon.sockPath, "storage_get", { type: "session" }, 5000)
    ]);
    const rawCookies = cookiesRes.status === "fulfilled" && cookiesRes.value.success && Array.isArray(cookiesRes.value.data?.cookies) ? cookiesRes.value.data.cookies : [];
    const cookies = rawCookies.slice(0, 100).map((c) => {
      const name = asString(c.name);
      const httpOnly = Boolean(c.httpOnly ?? c.http_only);
      const rawVal = asString(c.value);
      return {
        name,
        value: isSensitiveKey(name) || httpOnly ? REDACTED : redactText(rawVal, 180),
        domain: asString(c.domain),
        path: asString(c.path, "/"),
        httpOnly,
        secure: Boolean(c.secure),
        sameSite: c.sameSite ? asString(c.sameSite) : null
      };
    });
    const normalizeStorage = (settled) => {
      if (settled.status !== "fulfilled" || !settled.value.success)
        return {};
      const entries = settled.value.data?.entries ?? settled.value.data?.data ?? {};
      return Object.fromEntries(Object.entries(entries).slice(0, 100).map(([k, v]) => [
        k,
        isSensitiveKey(k) ? REDACTED : redactText(asString(v), 300)
      ]));
    };
    return {
      session: targetName,
      cookies,
      localStorage: normalizeStorage(localRes),
      sessionStorage: normalizeStorage(sessionRes)
    };
  }
  async startStandaloneDashboard() {
    const result = await ensureDashboardRunning(this.dashboardPort);
    this.dashboardRunning = result.running;
    this.scheduleStateEmit();
    return {
      running: result.running,
      url: result.url,
      ...result.error ? { error: result.error } : {}
    };
  }
  async buildWorkStatusView() {
    await this.refreshSessions();
    const summaries = this.buildSessionSummaries();
    const dashboardUrl = `http://localhost:${this.dashboardPort}`;
    const clampLabel = (text, maxLen) => text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
    const controls = [
      { kind: "button", id: "new-session", label: "New" },
      ...!this.dashboardRunning ? [
        {
          kind: "button",
          id: "start-dashboard",
          label: `:${this.dashboardPort}`
        }
      ] : []
    ];
    const dashboardRow = this.dashboardRunning ? {
      kind: "line",
      id: "dashboard",
      label: "Dashboard",
      dot: "info",
      content: {
        kind: "chips",
        chips: [
          {
            id: "open-dash",
            label: `:${this.dashboardPort}`,
            tone: "info",
            url: dashboardUrl
          }
        ]
      },
      value: "listening",
      valueTone: "muted"
    } : null;
    if (summaries.length === 0) {
      return {
        rows: [
          {
            kind: "note",
            id: "empty",
            text: "No active agent-browser sessions. Run agent-browser open <url> or click New.",
            tone: "muted"
          },
          ...dashboardRow ? [dashboardRow] : []
        ],
        controls
      };
    }
    const toKebabId = (prefix, raw, idx) => {
      const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 22);
      const body = slug ? `${prefix}-${slug}-${idx}` : `${prefix}-${idx}`;
      return body.slice(0, 40).replace(/-+$/g, "");
    };
    this.statusCloseMap.clear();
    const rows = [];
    const maxRowsBeforeFooter = 16 - (dashboardRow ? 1 : 0);
    const includeAllSparklines = summaries.length <= 4;
    for (const [idx, s] of summaries.entries()) {
      const rec = this.records.get(s.session);
      const showSparkline = Boolean(rec && rec.latenciesMs.length >= 2) && (includeAllSparklines || s.session === this.activeSession);
      const sessionRowCount = showSparkline ? 3 : 2;
      const remainingAfterThis = summaries.length - idx - 1;
      const reserveOverflowRow = remainingAfterThis > 0 ? 1 : 0;
      if (rows.length + sessionRowCount + reserveOverflowRow > maxRowsBeforeFooter) {
        const hiddenCount = summaries.length - idx;
        if (rows.length < maxRowsBeforeFooter) {
          rows.push({
            kind: "note",
            id: "more-sessions",
            text: `+${hiddenCount} more active session${hiddenCount === 1 ? "" : "s"} in the Agent Browser panel.`,
            tone: "muted"
          });
        }
        break;
      }
      const pageLabel = (() => {
        if (!s.url)
          return "about:blank";
        try {
          const u = new URL(s.url);
          const hostAndPath = u.host && u.pathname && u.pathname !== "/" ? `${u.host}${u.pathname}` : u.host || u.pathname || s.url;
          return clampLabel(hostAndPath, 60);
        } catch {
          return clampLabel(s.url, 60);
        }
      })();
      const tabCount = s.tabs.length || 1;
      const cmdValue = s.lastCommand ? `${clampLabel(s.lastCommand.action, 10)}${s.lastCommand.durationMs !== null ? ` ${s.lastCommand.durationMs}ms` : ""}` : `${tabCount} tab${tabCount === 1 ? "" : "s"}`;
      const closeId = toKebabId("close", s.session, idx);
      this.statusCloseMap.set(closeId, s.session);
      const problemParts = [];
      if (s.errorCount > 0)
        problemParts.push(`${s.errorCount} errors`);
      if (s.warningCount > 0)
        problemParts.push(`${s.warningCount} warnings`);
      const sessionTooltip = clampLabel(`${s.session} (${s.engine}, ${tabCount} tab${tabCount === 1 ? "" : "s"}${problemParts.length > 0 ? `, ${problemParts.join(", ")}` : ""})`, 195);
      rows.push({
        kind: "line",
        id: toKebabId("sess", s.session, idx),
        label: clampLabel(s.session, 60),
        dot: s.errorCount > 0 ? "error" : s.warningCount > 0 ? "warning" : s.connected ? "success" : "muted",
        ...s.errorCount > 0 ? {
          badge: {
            label: `${s.errorCount} err`,
            tone: "error"
          }
        } : s.warningCount > 0 ? {
          badge: {
            label: `${s.warningCount} warn`,
            tone: "warning"
          }
        } : tabCount > 1 ? {
          value: `${tabCount} tabs`,
          valueTone: "muted"
        } : {},
        tooltip: sessionTooltip,
        actions: [
          {
            kind: "button",
            id: closeId,
            label: "Close",
            variant: "outline",
            confirm: "Close?"
          }
        ]
      });
      rows.push({
        kind: "line",
        id: toKebabId("page", s.session, idx),
        label: pageLabel,
        icon: "global",
        value: clampLabel(cmdValue, 24),
        valueTone: s.lastCommand?.status === "error" ? "error" : "muted",
        tooltip: clampLabel(`${s.title ? `${s.title} — ` : ""}${s.url || "about:blank"}${s.lastCommand ? ` · last: ${s.lastCommand.action}` : ""}`, 195)
      });
      if (showSparkline && rec) {
        const avg = Math.round(rec.latenciesMs.reduce((a, b) => a + b, 0) / rec.latenciesMs.length);
        rows.push({
          kind: "line",
          id: toKebabId("lat", s.session, idx),
          label: "Latency",
          icon: "pulse",
          content: {
            kind: "chart",
            values: rec.latenciesMs,
            unit: "count",
            tone: "accent"
          },
          value: `${avg}ms avg`,
          valueTone: "muted",
          tooltip: clampLabel(`${s.session}: ${avg}ms avg across ${rec.latenciesMs.length} commands`, 195)
        });
      }
    }
    if (dashboardRow) {
      rows.push(dashboardRow);
    }
    return {
      rows: rows.slice(0, 16),
      controls
    };
  }
  async handleStatusAction(id) {
    if (id === "new-session") {
      await this.refreshSessions({ skipDashboardCheck: true });
      const nextIdx = nextAvailableSessionName([
        ...this.records.keys(),
        ...this.pendingSessions
      ]);
      await this.createSession(nextIdx, "https://example.com", {
        skipInitialRefresh: true
      });
      return;
    }
    if (id === "start-dashboard") {
      await this.startStandaloneDashboard();
      return;
    }
    const mappedTarget = this.statusCloseMap.get(id);
    if (mappedTarget) {
      await this.closeSession(mappedTarget);
      return;
    }
    if (id.startsWith("close:")) {
      const target = id.slice("close:".length);
      if (target) {
        await this.closeSession(target);
      }
    }
  }
  searchMentions(query) {
    const q = query.trim().toLowerCase();
    const summaries = this.buildSessionSummaries();
    const items = [];
    for (const s of summaries) {
      const candidates = [
        {
          id: `${s.session}:snapshot`,
          title: `Browser (${s.session}): Interactive @eN Snapshot`,
          subtitle: `${s.title || s.url || "about:blank"}`.slice(0, 118)
        },
        {
          id: `${s.session}:errors`,
          title: `Browser (${s.session}): Console & Page Errors (${s.errorCount + s.warningCount})`,
          subtitle: `Attach recent console warnings, errors, and exceptions`.slice(0, 118)
        },
        {
          id: `${s.session}:activity`,
          title: `Browser (${s.session}): Command Activity (${s.commandCount})`,
          subtitle: `Attach chronological agent-browser commands, durations, and failures`.slice(0, 118)
        },
        {
          id: `${s.session}:network`,
          title: `Browser (${s.session}): Network Requests`,
          subtitle: `Attach recent HTTP/XHR/fetch requests and failed responses`.slice(0, 118)
        }
      ];
      for (const c of candidates) {
        if (!q || c.title.toLowerCase().includes(q) || (c.subtitle?.toLowerCase().includes(q) ?? false) || c.id.toLowerCase().includes(q)) {
          items.push({
            id: c.id.slice(0, 256),
            title: c.title.slice(0, 120),
            ...c.subtitle ? { subtitle: c.subtitle.slice(0, 120) } : {}
          });
        }
        if (items.length >= 20)
          return items;
      }
    }
    return items;
  }
  async resolveMention(id) {
    const sep = id.lastIndexOf(":");
    if (sep <= 0) {
      throw new Error(`Invalid browser mention id "${id}"`);
    }
    const session = id.slice(0, sep);
    const kind = id.slice(sep + 1);
    const rec = this.records.get(session);
    if (!rec) {
      throw new Error(`agent-browser session "${session}" is no longer running`);
    }
    if (kind === "errors") {
      const rows = rec.consoleEvents.slice(-50);
      if (rows.length === 0) {
        return `### agent-browser Console (${session} — ${rec.url || "about:blank"})
No console messages or page errors recorded.`;
      }
      const lines = rows.map((e) => `- **[${e.kind === "page_error" ? "EXCEPTION" : e.level.toUpperCase()}]** ${e.text}${e.line !== null ? ` _(line ${e.line})_` : ""}`);
      return `### agent-browser Console (${session} — ${rec.url || "about:blank"})
${lines.join(`
`)}`.slice(0, 15500);
    }
    if (kind === "activity") {
      const rows = rec.activity.slice(-50);
      if (rows.length === 0) {
        return `### agent-browser Activity (${session} — ${rec.url || "about:blank"})
No commands recorded yet.`;
      }
      const lines = rows.map((a) => `- \`${a.action}\` ${JSON.stringify(a.params)} → **${a.status.toUpperCase()}**${a.durationMs !== null ? ` (${a.durationMs}ms)` : ""}${a.dataPreview ? ` — \`${a.dataPreview.slice(0, 160)}\`` : ""}`);
      return `### agent-browser Activity (${session} — ${rec.url || "about:blank"})
${lines.join(`
`)}`.slice(0, 15500);
    }
    if (kind === "network") {
      const reqs = await this.listNetworkRequests(session);
      if (reqs.length === 0) {
        return `### agent-browser Network (${session} — ${rec.url || "about:blank"})
No network requests captured yet (tracking is now enabled for subsequent navigations).`;
      }
      const lines = reqs.slice(-60).map((r) => `- \`${r.method}\` \`${r.status ?? "pending"}\` [${r.resourceType}] ${r.url}`);
      return `### agent-browser Network (${session} — ${rec.url || "about:blank"})
${lines.join(`
`)}`.slice(0, 15500);
    }
    if (kind === "snapshot") {
      const snap = await sendDaemonSocketCommand(rec.daemon.sockPath, "snapshot", { interactive: true, compact: true }, 8000);
      if (!snap.success) {
        throw new Error(snap.error || "Could not capture snapshot");
      }
      const rawTree = typeof snap.data?.snapshot === "string" ? snap.data.snapshot : JSON.stringify(snap.data?.snapshot ?? {}, null, 2);
      return `### agent-browser Snapshot (${session} — ${rec.url || "about:blank"})
\`\`\`text
${redactText(rawTree, 14500)}
\`\`\``.slice(0, 15500);
    }
    throw new Error(`Unknown browser mention kind "${kind}"`);
  }
}

// service/server.ts
function readRequestBody(req, maxBytes = 1e6) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("Request body exceeded maximum allowed bytes"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}
function sendJson(res, status, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text)
  });
  res.end(text);
}
async function startExtensionServer(options) {
  const env = options.env ?? process.env;
  const dataDir = options.dataDir || env[OPENCHAMBER_SERVICE_DATA_DIR] || path4.join(os4.homedir(), ".local", "share", "openchamber-agent-browser");
  let serviceHost = null;
  if (env.OPENCHAMBER_HOST_CALLBACK_URL && env.OPENCHAMBER_SERVICE_TOKEN) {
    try {
      serviceHost = createServiceHost({ env });
    } catch {
      serviceHost = null;
    }
  }
  const hub = new SessionHub({ serviceHost, dataDir });
  hub.start();
  const provider = new AgentBrowserOpenChamberProvider({
    dataDir,
    isSessionUserControlled: (session) => hub.isSessionUserControlled(session),
    markAgentActive: (session) => hub.markAgentActive(session),
    getConsoleProblems: (session) => hub.getConsoleProblems(session),
    onSessionTouched: (session, opts) => {
      hub.refreshSessions({
        preferredSession: session,
        followPreferred: Boolean(opts?.follow)
      });
    }
  });
  const server = http.createServer((req, res) => {
    (async () => {
      if (req.headers.authorization !== `Bearer ${options.token}`) {
        res.writeHead(401).end();
        return;
      }
      const parsedUrl = new URL(req.url ?? "/", "http://127.0.0.1");
      const pathname = parsedUrl.pathname;
      const method = req.method ?? "GET";
      if (method === "GET" && pathname === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }
      if (pathname === "/status") {
        if (method === "GET") {
          const view = await hub.buildWorkStatusView();
          sendJson(res, 200, view);
          return;
        }
        if (method === "POST") {
          const raw = await readRequestBody(req);
          const evt = JSON.parse(raw || "{}");
          if (evt.id) {
            await hub.handleStatusAction(evt.id);
          }
          sendJson(res, 200, { ok: true });
          return;
        }
      }
      if (method === "GET" && pathname === SURFACE_FRAME_PATH) {
        const after = Math.max(0, Number(parsedUrl.searchParams.get("after") ?? "0") || 0);
        const wait = Math.min(SURFACE_FRAME_WAIT_MS, Math.max(0, Number(parsedUrl.searchParams.get("wait") ?? "5000") || 5000));
        const frame = await hub.waitForSurfaceFrame(after, wait);
        if (!frame || frame.bytes.length > SURFACE_FRAME_MAX_BYTES) {
          res.writeHead(204).end();
          return;
        }
        const headers = {
          "Content-Type": "image/jpeg",
          "Content-Length": frame.bytes.length,
          [SURFACE_SEQ_HEADER]: String(frame.seq),
          [SURFACE_WIDTH_HEADER]: String(frame.width),
          [SURFACE_HEIGHT_HEADER]: String(frame.height)
        };
        if (frame.title) {
          headers[SURFACE_TITLE_HEADER] = frame.title;
        }
        if (hub.isActiveSurfaceAgentDriving()) {
          headers[SURFACE_AGENT_ACTIVE_HEADER] = "1";
        }
        res.writeHead(200, headers);
        res.end(frame.bytes);
        return;
      }
      if (method === "POST" && pathname === SURFACE_INPUT_PATH) {
        const frameSeqHeader = req.headers[SURFACE_FRAME_SEQ_HEADER];
        if (!hub.checkFrameFence(typeof frameSeqHeader === "string" ? frameSeqHeader : undefined)) {
          res.writeHead(409).end();
          return;
        }
        const raw = await readRequestBody(req);
        const batch = readSurfaceInputBatch(raw);
        if (!batch) {
          res.writeHead(400).end();
          return;
        }
        await hub.handleSurfaceInput(batch.events);
        res.writeHead(204).end();
        return;
      }
      if (method === "POST" && pathname === SURFACE_CONTROL_PATH) {
        const raw = await readRequestBody(req);
        const notice = readSurfaceControlNotice(raw);
        if (!notice) {
          res.writeHead(400).end();
          return;
        }
        hub.setControlState(notice.controller, notice.viewer);
        res.writeHead(204).end();
        return;
      }
      if (method === "POST" && pathname === SURFACE_RESIZE_PATH) {
        const raw = await readRequestBody(req);
        const resize = readSurfaceResizeRequest(raw);
        if (!resize) {
          res.writeHead(400).end();
          return;
        }
        const settled = await hub.resizeSurface(resize.width, resize.height);
        sendJson(res, 200, settled);
        return;
      }
      if (method === "GET" && pathname === SURFACE_CLIPBOARD_PATH) {
        const text = await hub.readClipboard();
        sendJson(res, 200, { text });
        return;
      }
      if (method === "POST" && pathname === BROWSER_PROVIDER_PATH) {
        const raw = await readRequestBody(req);
        const parsed = readBrowserProviderRequest(raw);
        if (!parsed) {
          res.writeHead(400).end();
          return;
        }
        const answer = await provider.handleRequest(parsed);
        sendJson(res, 200, answer);
        return;
      }
      if (method === "POST" && pathname === MENTIONS_SEARCH_PATH) {
        const raw = await readRequestBody(req);
        const parsed = JSON.parse(raw || "{}");
        const items = hub.searchMentions(parsed.query ?? "");
        sendJson(res, 200, { items });
        return;
      }
      if (method === "POST" && pathname === MENTIONS_RESOLVE_PATH) {
        const raw = await readRequestBody(req);
        const parsed = JSON.parse(raw || "{}");
        if (!parsed.id) {
          sendJson(res, 400, { message: "Missing mention id" });
          return;
        }
        const text = await hub.resolveMention(parsed.id);
        sendJson(res, 200, { text });
        return;
      }
      if (method === "GET" && pathname === "/api/state") {
        await hub.refreshSessions();
        sendJson(res, 200, hub.getDockState());
        return;
      }
      if (method === "GET" && pathname === "/api/observatory") {
        await hub.refreshSessions();
        const sessionParam = parsedUrl.searchParams.get("session");
        sendJson(res, 200, hub.getObservatorySnapshot(sessionParam));
        return;
      }
      if (method === "POST" && pathname === "/api/session/select") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        if (!body.session) {
          sendJson(res, 400, { message: "Missing session name" });
          return;
        }
        sendJson(res, 200, await hub.selectSession(body.session));
        return;
      }
      if (method === "POST" && pathname === "/api/session/pin") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        sendJson(res, 200, hub.setSessionPinned(Boolean(body.pinned)));
        return;
      }
      if (method === "POST" && pathname === "/api/session/create") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        sendJson(res, 200, await hub.createSession(body.session || "default", body.url === undefined ? "https://example.com" : body.url, { allowExisting: Boolean(body.allowExisting) }));
        return;
      }
      if (method === "POST" && pathname === "/api/session/close") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        if (!body.session) {
          sendJson(res, 400, { message: "Missing session name" });
          return;
        }
        sendJson(res, 200, await hub.closeSession(body.session));
        return;
      }
      if (method === "POST" && pathname === "/api/nav") {
        const frameSeqHeader = req.headers[SURFACE_FRAME_SEQ_HEADER];
        if (!hub.checkFrameFence(typeof frameSeqHeader === "string" ? frameSeqHeader : undefined)) {
          sendJson(res, 409, {
            message: "View changed before command ran; retry."
          });
          return;
        }
        const body = JSON.parse(await readRequestBody(req) || "{}");
        if (!body.op) {
          sendJson(res, 400, { message: "Missing navigation op" });
          return;
        }
        sendJson(res, 200, await hub.performNavigation(body.op, {
          url: body.url,
          tabId: body.tabId
        }));
        return;
      }
      if (method === "POST" && pathname === "/api/mode") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        if (!body.mode) {
          sendJson(res, 400, { message: "Missing mode" });
          return;
        }
        sendJson(res, 200, await hub.setInspectMode(body.mode, body.colorScheme));
        return;
      }
      if (method === "POST" && pathname === "/api/viewport") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        sendJson(res, 200, await hub.updateViewportSettings(body));
        return;
      }
      if (method === "POST" && pathname === "/api/type") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        await hub.sendSoftKeyboardDiff({
          backspaces: Number(body.backspaces) || 0,
          text: String(body.text ?? ""),
          enter: Boolean(body.enter)
        });
        sendJson(res, 200, { ok: true });
        return;
      }
      if (method === "POST" && pathname === "/api/dashboard/start") {
        sendJson(res, 200, await hub.startStandaloneDashboard());
        return;
      }
      if (method === "POST" && pathname === "/api/eval") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        if (!body.expression) {
          sendJson(res, 400, {
            ok: false,
            output: "Enter a JavaScript expression"
          });
          return;
        }
        sendJson(res, 200, await hub.evaluateRepl(body.session ?? null, body.expression));
        return;
      }
      if (method === "GET" && pathname === "/api/network") {
        const session = parsedUrl.searchParams.get("session");
        const typeFilter = parsedUrl.searchParams.get("type") || undefined;
        const clear = parsedUrl.searchParams.get("clear") === "1";
        const requests = await hub.listNetworkRequests(session, {
          typeFilter,
          clear
        });
        sendJson(res, 200, { requests });
        return;
      }
      if (method === "GET" && pathname === "/api/network/detail") {
        const session = parsedUrl.searchParams.get("session");
        const requestId = parsedUrl.searchParams.get("requestId") ?? "";
        const detail = await hub.getNetworkRequestDetail(session, requestId);
        sendJson(res, detail ? 200 : 404, { detail });
        return;
      }
      if (method === "POST" && pathname === "/api/har/toggle") {
        const body = JSON.parse(await readRequestBody(req) || "{}");
        sendJson(res, 200, await hub.toggleHarRecording(body.session ?? null));
        return;
      }
      if (method === "GET" && pathname === "/api/storage") {
        const session = parsedUrl.searchParams.get("session");
        const storage = await hub.getStorageSnapshot(session);
        sendJson(res, 200, { storage });
        return;
      }
      if (method === "POST" && pathname === "/api/format-picked") {
        const raw = await readRequestBody(req);
        const picked = JSON.parse(raw);
        sendJson(res, 200, { markdown: formatPickedElementMarkdown(picked) });
        return;
      }
      sendJson(res, 404, { message: `Unknown route ${method} ${pathname}` });
    })().catch((err) => {
      if (!res.headersSent) {
        const status = err instanceof ServiceHttpError ? err.status : 500;
        sendJson(res, status, {
          message: err instanceof Error ? err.message : String(err)
        });
      } else {
        res.end();
      }
    });
  });
  const boundPort = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "127.0.0.1", () => {
      const addr = server.address();
      resolve(typeof addr === "object" && addr ? addr.port : options.port);
    });
  });
  return {
    server,
    port: boundPort,
    hub,
    close: async () => {
      await hub.dispose();
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(() => resolve()));
    }
  };
}

// service/main.ts
var port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
var token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";
if (!Number.isInteger(port) || port <= 0 || !token) {
  process.stderr.write(`Missing OPENCHAMBER_SERVICE_PORT or OPENCHAMBER_SERVICE_TOKEN
`);
  process.exit(1);
}
var running = await startExtensionServer({ port, token });
var shutdown = () => {
  running.close().finally(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
