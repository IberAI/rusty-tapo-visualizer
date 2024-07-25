let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

function isLikeNone(x) {
    return x === undefined || x === null;
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error(`expected a number argument, found ${typeof(n)}`);
}

let cachedFloat64Memory0 = null;

function getFloat64Memory0() {
    if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
        cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

    heap[idx] = obj;
    return idx;
}

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error(`expected a boolean argument, found ${typeof(n)}`);
    }
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (typeof(arg) !== 'string') throw new Error(`expected a string argument, found ${typeof(arg)}`);

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    wasm.__wbindgen_export_2.get(state.dtor)(state.a, state.b)
});

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}
function __wbg_adapter_28(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h38b8cf52c743a73b(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_31(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h1959cba098a664ac(arg0, arg1);
}

function __wbg_adapter_34(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hce6c509e21a142fa(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_37(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h1fdb278efea0c3ec(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_40(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hd4b3c2eb972f504e(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_43(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h0a0a222e67370b6a(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_46(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__habdf97b896e97568(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_49(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h52646fb0f56bee8b(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_52(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hf0c8e1bdcf512f99(arg0, arg1, addHeapObject(arg2));
}

/**
*/
export function start() {
    wasm.start();
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @param {Uint8Array} file_data
*/
export function process_file(file_data) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(file_data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.process_file(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

let cachedFloat32Memory0 = null;

function getFloat32Memory0() {
    if (cachedFloat32Memory0 === null || cachedFloat32Memory0.byteLength === 0) {
        cachedFloat32Memory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32Memory0;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32Memory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32Memory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'number' ? obj : undefined;
        if (!isLikeNone(ret)) {
            _assertNum(ret);
        }
        getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_error_f851667af71bcfc6 = function() { return logError(function (arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    }, arguments) };
    imports.wbg.__wbg_new_abda76e883ba8a5f = function() { return logError(function () {
        const ret = new Error();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_stack_658279fe44541cf6 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        _assertNum(ret);
        return ret;
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_set_f975102236d3c502 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    }, arguments) };
    imports.wbg.__wbg_instanceof_WebGl2RenderingContext_6b8f92d566ced9e1 = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof WebGL2RenderingContext;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_bindVertexArray_239574d42dbbd203 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).bindVertexArray(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_bufferData_c787516945ba48c2 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_createVertexArray_4f450ed4d4a69acf = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createVertexArray();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_drawBuffers_6d32a0c370b9cb7f = function() { return logError(function (arg0, arg1) {
        getObject(arg0).drawBuffers(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_framebufferTextureLayer_45cb5a2978de4939 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).framebufferTextureLayer(arg1 >>> 0, arg2 >>> 0, getObject(arg3), arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_texStorage2D_0fff70234489e5a8 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).texStorage2D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_texStorage3D_7d322e9790add281 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).texStorage3D(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5, arg6);
    }, arguments) };
    imports.wbg.__wbg_uniform1fv_9114da29f9f1f35b = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform1fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform1iv_e372f959c335fb72 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform1iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform1uiv_cc697cfdcc1d6ed6 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform1uiv(getObject(arg1), getArrayU32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform2fv_4bd352337ccc4530 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform2fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform2iv_829bd2f635ddf819 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform2iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform2uiv_6ae4fe2845703965 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform2uiv(getObject(arg1), getArrayU32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform3fv_3d2854c81603e498 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform3fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform3iv_71333eb685ad9616 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform3iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform3uiv_998cd5452e009d35 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform3uiv(getObject(arg1), getArrayU32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform4fv_39cdcce4b1acc767 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform4fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform4iv_f54116c4cfdcd96e = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform4iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform4uiv_c1b79c253aa0271f = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform4uiv(getObject(arg1), getArrayU32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniformMatrix2fv_756ddcf41f02aa75 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniformMatrix2fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_uniformMatrix3fv_f26b98137276fd3d = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniformMatrix3fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_uniformMatrix4fv_5d8e0e047546456b = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_vertexAttribDivisor_8479e8b81c913ed6 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_vertexAttribIPointer_69f2f4bd74cf0bcb = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).vertexAttribIPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_activeTexture_d42cec3a26e47a5b = function() { return logError(function (arg0, arg1) {
        getObject(arg0).activeTexture(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_attachShader_2112634b3ffa9e9f = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_bindBuffer_90d4fb91538001d5 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_bindFramebuffer_4f950b884dc4be83 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_bindTexture_75a698c47a923814 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_blendEquationSeparate_34aa4cecd02882ab = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_blendFuncSeparate_3c342f57887c2900 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_checkFramebufferStatus_faf497a8869b5585 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).checkFramebufferStatus(arg1 >>> 0);
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_clear_8e2508724944df18 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).clear(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_clearColor_480962bfac4e1cbd = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).clearColor(arg1, arg2, arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_clearDepth_f5b4a73c4b8050eb = function() { return logError(function (arg0, arg1) {
        getObject(arg0).clearDepth(arg1);
    }, arguments) };
    imports.wbg.__wbg_colorMask_21a93d0180bcbffa = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
    }, arguments) };
    imports.wbg.__wbg_compileShader_f40e0c51a7a836fd = function() { return logError(function (arg0, arg1) {
        getObject(arg0).compileShader(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_createBuffer_7f57647465d111f0 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createBuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createFramebuffer_8ebfde8c77472024 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createFramebuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createProgram_7759fb2effb5d9b3 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createProgram();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createShader_b474ef421ec0f80b = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createShader(arg1 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createTexture_18b4a88c14cb086e = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createTexture();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_cullFace_fe427cdf8d0ea4e2 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).cullFace(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_deleteBuffer_fca5d765302c9a4e = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteBuffer(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_deleteFramebuffer_da681ed1dfa6d543 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteFramebuffer(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_deleteProgram_a06d69620332cc70 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteProgram(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_deleteShader_138a810cc0ca9986 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteShader(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_deleteTexture_eae7abcfa3015f09 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteTexture(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_depthFunc_5527d3ee35e25a8d = function() { return logError(function (arg0, arg1) {
        getObject(arg0).depthFunc(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_depthMask_9120207d491c649a = function() { return logError(function (arg0, arg1) {
        getObject(arg0).depthMask(arg1 !== 0);
    }, arguments) };
    imports.wbg.__wbg_detachShader_6cdc9c293ddee02e = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).detachShader(getObject(arg1), getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_disable_f0ef6e9a7ac6ddd7 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).disable(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_disableVertexAttribArray_e4f458e34e54fe78 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).disableVertexAttribArray(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_drawArrays_5bf0d92947e472af = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).drawArrays(arg1 >>> 0, arg2, arg3);
    }, arguments) };
    imports.wbg.__wbg_drawElements_565a93d1efa4da07 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
    }, arguments) };
    imports.wbg.__wbg_enable_8b3019da8846ce76 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).enable(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_enableVertexAttribArray_9d7b7e199f86e09b = function() { return logError(function (arg0, arg1) {
        getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_framebufferRenderbuffer_0144c6e35e2edb19 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4));
    }, arguments) };
    imports.wbg.__wbg_framebufferTexture2D_a6ad7148f7983ae6 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5);
    }, arguments) };
    imports.wbg.__wbg_generateMipmap_806e608c7c4d9b60 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).generateMipmap(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_getActiveAttrib_d118e124ba3a57b0 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getActiveAttrib(getObject(arg1), arg2 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getActiveUniform_0144bd4ecf222daf = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getActiveUniform(getObject(arg1), arg2 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getAttribLocation_4e2b9fe88dcc9802 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).getAttribLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getError_d02c89917f45dd5e = function() { return logError(function (arg0) {
        const ret = getObject(arg0).getError();
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getExtension_bef4112494c87f34 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getExtension(getStringFromWasm0(arg1, arg2));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getParameter_aa9af66884d2b210 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).getParameter(arg1 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getProgramInfoLog_4d189135f8d5a2de = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_getProgramParameter_7b04ca71a79d9047 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getShaderInfoLog_d5de3e4eab06fc46 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_getSupportedExtensions_7a174085f9e1983a = function() { return logError(function (arg0) {
        const ret = getObject(arg0).getSupportedExtensions();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getUniformLocation_51ec30e3755e574d = function() { return logError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_linkProgram_eabc664217816e72 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).linkProgram(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_pixelStorei_162a23ba7872b886 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).pixelStorei(arg1 >>> 0, arg2);
    }, arguments) };
    imports.wbg.__wbg_scissor_726eea865bbd6809 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).scissor(arg1, arg2, arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_shaderSource_7943d06f24862a3b = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_texParameteri_8f70dffce11d7da1 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
    }, arguments) };
    imports.wbg.__wbg_useProgram_757fab437af29c20 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).useProgram(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_vertexAttribPointer_4416f0325c02aa13 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
    }, arguments) };
    imports.wbg.__wbg_viewport_7414e7e2a83afc72 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).viewport(arg1, arg2, arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_instanceof_Window_f401953a2cf86220 = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Window;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_document_5100775d18896c16 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).document;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_innerWidth_758af301ca4baa3e = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).innerWidth;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_innerHeight_c1ef73925c3d3e9c = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).innerHeight;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_devicePixelRatio_efc553b59506f64c = function() { return logError(function (arg0) {
        const ret = getObject(arg0).devicePixelRatio;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_matchMedia_66bb21e3ef19270c = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).matchMedia(getStringFromWasm0(arg1, arg2));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_d36d61640bbf4503 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0)[getStringFromWasm0(arg1, arg2)];
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_cancelAnimationFrame_111532f326e480af = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).cancelAnimationFrame(arg1);
    }, arguments) };
    imports.wbg.__wbg_requestAnimationFrame_549258cfa66011f0 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).requestAnimationFrame(getObject(arg1));
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_clearTimeout_ba63ae54a36e111e = function() { return logError(function (arg0, arg1) {
        getObject(arg0).clearTimeout(arg1);
    }, arguments) };
    imports.wbg.__wbg_setTimeout_c172d5704ef82276 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).setTimeout(getObject(arg1), arg2);
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_defaultView_0330843f48c914bc = function() { return logError(function (arg0) {
        const ret = getObject(arg0).defaultView;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_fullscreenElement_1bef71098bd8dfde = function() { return logError(function (arg0) {
        const ret = getObject(arg0).fullscreenElement;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createElement_8bae7856a4bb7411 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).createElement(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_exitFullscreen_5679ad2b002921bd = function() { return logError(function (arg0) {
        getObject(arg0).exitFullscreen();
    }, arguments) };
    imports.wbg.__wbg_getElementsByTagName_7d0ffbf0086bbbd1 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getElementsByTagName(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getBoundingClientRect_91e6d57c4e65f745 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).getBoundingClientRect();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_requestFullscreen_ed1a3c7a09a7655d = function() { return handleError(function (arg0) {
        getObject(arg0).requestFullscreen();
    }, arguments) };
    imports.wbg.__wbg_setAttribute_3c9f6c303b696daa = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).setAttribute(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_setPointerCapture_0fdaad7a916c8486 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).setPointerCapture(arg1);
    }, arguments) };
    imports.wbg.__wbg_bufferData_5d1e6b8eaa7d23c8 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_uniform1fv_c8526e876e1ab4cb = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform1fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform1iv_3e12a0cd690008b1 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform1iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform2fv_dcb8b73e2637092a = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform2fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform2iv_fc73855d9dec793a = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform2iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform3fv_3e32c897d3ed1eaa = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform3fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform3iv_2b3fa9d97dff01a2 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform3iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform4fv_980ce05d950ee599 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform4fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniform4iv_f112dcc4401f5469 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).uniform4iv(getObject(arg1), getArrayI32FromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_uniformMatrix2fv_4417ed4d88a140be = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniformMatrix2fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_uniformMatrix3fv_d46553a1248946b5 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniformMatrix3fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_uniformMatrix4fv_cd46ed81bccb0cb2 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_activeTexture_5f084e1b3f14853e = function() { return logError(function (arg0, arg1) {
        getObject(arg0).activeTexture(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_attachShader_6397dc4fd87343d3 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_bindBuffer_1e5043751efddd4f = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_bindFramebuffer_c301d73a2c2842bb = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_bindTexture_772f5eb022019d87 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_blendEquationSeparate_721f30ba584a5233 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_blendFuncSeparate_abe2ad4272c8365e = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_checkFramebufferStatus_2380be4caf464ead = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).checkFramebufferStatus(arg1 >>> 0);
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_clear_f9731a47df2e70d8 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).clear(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_clearColor_42707553c40e0e0f = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).clearColor(arg1, arg2, arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_clearDepth_42ac48f2ab25c419 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).clearDepth(arg1);
    }, arguments) };
    imports.wbg.__wbg_colorMask_03aa359acc86fd70 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
    }, arguments) };
    imports.wbg.__wbg_compileShader_3af4719dfdb508e3 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).compileShader(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_createBuffer_34e01f5c10929b41 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createBuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createFramebuffer_49ca64e9e1c6f5eb = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createFramebuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createProgram_9affbfa62b7b2608 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createProgram();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createShader_55ca04b44164bd41 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createShader(arg1 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createTexture_c13c31b2b132c17f = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createTexture();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_cullFace_af37bb1c2d22ab73 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).cullFace(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_deleteBuffer_96df38349e3487d2 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteBuffer(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_deleteFramebuffer_417b62b6156d4894 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteFramebuffer(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_deleteProgram_641402f7551587d8 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteProgram(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_deleteShader_e5c778f25b722e68 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteShader(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_deleteTexture_f89d8e417b156960 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).deleteTexture(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_depthFunc_1ee4bf1e0127bf7f = function() { return logError(function (arg0, arg1) {
        getObject(arg0).depthFunc(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_depthMask_dd6cd8a9aff90e5c = function() { return logError(function (arg0, arg1) {
        getObject(arg0).depthMask(arg1 !== 0);
    }, arguments) };
    imports.wbg.__wbg_detachShader_2be0011a543a788a = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).detachShader(getObject(arg1), getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_disable_5dd8c3842de93e92 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).disable(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_disableVertexAttribArray_12bc9adefa738796 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).disableVertexAttribArray(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_drawArrays_f619a26a53ab5ab3 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).drawArrays(arg1 >>> 0, arg2, arg3);
    }, arguments) };
    imports.wbg.__wbg_drawElements_0861624300587fcd = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
    }, arguments) };
    imports.wbg.__wbg_enable_7abe812a71c76206 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).enable(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_enableVertexAttribArray_6d44444aa994f42a = function() { return logError(function (arg0, arg1) {
        getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_framebufferRenderbuffer_e1c9c64aea848b39 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4));
    }, arguments) };
    imports.wbg.__wbg_framebufferTexture2D_66e1968fd5b7b3e3 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5);
    }, arguments) };
    imports.wbg.__wbg_generateMipmap_cd6c5ba2828aac7e = function() { return logError(function (arg0, arg1) {
        getObject(arg0).generateMipmap(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_getActiveAttrib_0750343119e6d917 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getActiveAttrib(getObject(arg1), arg2 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getActiveUniform_eed3c598e3e75d14 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getActiveUniform(getObject(arg1), arg2 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getAttribLocation_0a3d71a11394d043 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).getAttribLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getError_fd1f7b2b2ba5a860 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).getError();
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getProgramInfoLog_bf1fba8fa90667c7 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_getProgramParameter_10c8a43809fb8c2e = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getShaderInfoLog_0262cb299092ce92 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_getUniformLocation_6eedfb513ccce732 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_linkProgram_af5fed9dc3f1cdf9 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).linkProgram(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_pixelStorei_054e50b5fdc17824 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).pixelStorei(arg1 >>> 0, arg2);
    }, arguments) };
    imports.wbg.__wbg_scissor_75ba2245d4db0eaf = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).scissor(arg1, arg2, arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_shaderSource_7891a1fcb69a0023 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
    }, arguments) };
    imports.wbg.__wbg_texParameteri_d1035ed45d6c5655 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
    }, arguments) };
    imports.wbg.__wbg_useProgram_c637e43f9cd4c07a = function() { return logError(function (arg0, arg1) {
        getObject(arg0).useProgram(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_vertexAttribPointer_c25e4c5ed17f8a1d = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
    }, arguments) };
    imports.wbg.__wbg_viewport_221ade2aef6032c8 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).viewport(arg1, arg2, arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_x_c0e76d143979338a = function() { return logError(function (arg0) {
        const ret = getObject(arg0).x;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_y_047a9fda606ab8ef = function() { return logError(function (arg0) {
        const ret = getObject(arg0).y;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_charCode_358ab311d74487af = function() { return logError(function (arg0) {
        const ret = getObject(arg0).charCode;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_keyCode_2af7775f99bf8e33 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).keyCode;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_altKey_2e6c34c37088d8b1 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).altKey;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_ctrlKey_bb5b6fef87339703 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).ctrlKey;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_shiftKey_5911baf439ab232b = function() { return logError(function (arg0) {
        const ret = getObject(arg0).shiftKey;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_metaKey_6bf4ae4e83a11278 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).metaKey;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_key_dccf9e8aa1315a8e = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg1).key;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_code_3b0c3912a2351163 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg1).code;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_getModifierState_081302a3ea0063ad = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getModifierState(getStringFromWasm0(arg1, arg2));
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_matches_e14ed9ff8291cf24 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).matches;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_addListener_143ad0a501fabc3a = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).addListener(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_removeListener_46f3ee00c5b95320 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).removeListener(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_matches_dd4fdea75008ad05 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).matches;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_ownerDocument_a93c92720a050068 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).ownerDocument;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_pointerId_e030fa156647fedd = function() { return logError(function (arg0) {
        const ret = getObject(arg0).pointerId;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_pressure_99cd07399f942a7c = function() { return logError(function (arg0) {
        const ret = getObject(arg0).pressure;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_pointerType_0f2f0383406aa7fa = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg1).pointerType;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_drawBuffersWEBGL_4c663e042e093892 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).drawBuffersWEBGL(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_style_c3fc3dd146182a2d = function() { return logError(function (arg0) {
        const ret = getObject(arg0).style;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_error_6e987ee48d9fdf45 = function() { return logError(function (arg0, arg1) {
        console.error(getObject(arg0), getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_log_5bb5f88f245d7762 = function() { return logError(function (arg0) {
        console.log(getObject(arg0));
    }, arguments) };
    imports.wbg.__wbg_setProperty_ea7d15a2b591aa97 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).setProperty(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_clientX_fef6bf7a6bcf41b8 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).clientX;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_clientY_df42f8fceab3cef2 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).clientY;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_offsetX_1a40c03298c0d8b6 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).offsetX;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_offsetY_f75e8c25b9d9b679 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).offsetY;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_ctrlKey_008695ce60a588f5 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).ctrlKey;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_shiftKey_1e76dbfcdd36a4b4 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).shiftKey;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_altKey_07da841b54bd3ed6 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).altKey;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_metaKey_86bfd3b0d3a8083f = function() { return logError(function (arg0) {
        const ret = getObject(arg0).metaKey;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_button_367cdc7303e3cf9b = function() { return logError(function (arg0) {
        const ret = getObject(arg0).button;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_buttons_d004fa75ac704227 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).buttons;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_movementX_b800a0cacd14d9bf = function() { return logError(function (arg0) {
        const ret = getObject(arg0).movementX;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_movementY_7907e03eb8c0ea1e = function() { return logError(function (arg0) {
        const ret = getObject(arg0).movementY;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_size_c65dc0ea96919b30 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).size;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_type_482767003bd3054b = function() { return logError(function (arg0) {
        const ret = getObject(arg0).type;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_name_6806bde7ef1355ad = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg1).name;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_vertexAttribDivisorANGLE_b258d7388e466921 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).vertexAttribDivisorANGLE(arg1 >>> 0, arg2 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_target_2fc177e386c8b7b0 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).target;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_cancelBubble_c0aa3172524eb03c = function() { return logError(function (arg0) {
        const ret = getObject(arg0).cancelBubble;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_preventDefault_b1a4aafc79409429 = function() { return logError(function (arg0) {
        getObject(arg0).preventDefault();
    }, arguments) };
    imports.wbg.__wbg_stopPropagation_fa5b666049c9fd02 = function() { return logError(function (arg0) {
        getObject(arg0).stopPropagation();
    }, arguments) };
    imports.wbg.__wbg_addEventListener_53b787075bd5e003 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).addEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3));
    }, arguments) };
    imports.wbg.__wbg_addEventListener_4283b15b4f039eb5 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).addEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3), getObject(arg4));
    }, arguments) };
    imports.wbg.__wbg_removeEventListener_92cb9b3943463338 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).removeEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3));
    }, arguments) };
    imports.wbg.__wbg_removeEventListener_f3689e55cc5b09c4 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).removeEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3), getObject(arg4));
    }, arguments) };
    imports.wbg.__wbg_bindVertexArrayOES_abe2fd389c6a2f56 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).bindVertexArrayOES(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_createVertexArrayOES_886be8a08db32ce6 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).createVertexArrayOES();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_instanceof_HtmlCanvasElement_46bdbf323b0b18d1 = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof HTMLCanvasElement;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_width_aee8b8809b033b05 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).width;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_setwidth_080107476e633963 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).width = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_height_80053d3c71b338e0 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).height;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_setheight_dc240617639f1f51 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).height = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_getContext_fec464290556673c = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2), getObject(arg3));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_item_4d089d561e1633ef = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).item(arg1 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_now_4e659b3d15f470d9 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).now();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_deltaX_206576827ededbe5 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).deltaX;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_deltaY_032e327e216f2b2b = function() { return logError(function (arg0) {
        const ret = getObject(arg0).deltaY;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_deltaMode_294b2eaf54047265 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).deltaMode;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_16b304a2cfa7ff4a = function() { return logError(function () {
        const ret = new Array();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_bd8e338fbd5f5cc8 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_length_cd7af8117672b8b8 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).length;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_of_4a2b313a453ec059 = function() { return logError(function (arg0) {
        const ret = Array.of(getObject(arg0));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_push_a5b05aedc7234f9f = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).push(getObject(arg1));
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_newnoargs_e258087cd0daa0ea = function() { return logError(function (arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_27c0f87801dedf93 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_is_010fdc0f4ab96916 = function() { return logError(function (arg0, arg1) {
        const ret = Object.is(getObject(arg0), getObject(arg1));
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_72fb9a18b5ae2624 = function() { return logError(function () {
        const ret = new Object();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_d1e6af4856ba331b = function() { return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_self_ce0dbfc45cf2f5be = function() { return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_c6fb939a7f436783 = function() { return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_207b558942527489 = function() { return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function() { return logError(function (arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbg_buffer_12d079cc21e14bdb = function() { return logError(function (arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_e3c254076557e348 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_set_1f9b04f170055d33 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_rethrow = function(arg0) {
        throw takeObject(arg0);
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper1912 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 61, __wbg_adapter_28);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper6115 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 509, __wbg_adapter_31);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper6117 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 501, __wbg_adapter_34);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper6119 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 505, __wbg_adapter_37);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper6121 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 507, __wbg_adapter_40);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper6123 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 503, __wbg_adapter_43);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper6125 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 499, __wbg_adapter_46);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper6127 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 497, __wbg_adapter_49);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper6751 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 547, __wbg_adapter_52);
        return addHeapObject(ret);
    }, arguments) };

    return imports;
}

function __wbg_init_memory(imports, maybe_memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedFloat32Memory0 = null;
    cachedFloat64Memory0 = null;
    cachedInt32Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;

    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(input) {
    if (wasm !== undefined) return wasm;

    if (typeof input === 'undefined') {
        input = new URL('wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await input, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync }
export default __wbg_init;
