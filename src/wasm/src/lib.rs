#![allow(special_module_name)]
mod utils;

// Entry point for wasm
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    utils::main();
    Ok(())
}
