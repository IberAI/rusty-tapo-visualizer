use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use three_d::*;
use ndarray::{Array2, ArrayBase, OwnedRepr, Dim};
use web_sys::console;
use georaster::geotiff::{GeoTiffReader, RasterValue};
use std::io::Cursor;


type ElevationResult = (ArrayBase<OwnedRepr<f32>, Dim<[usize; 2]>>, usize, usize);
// Entry point for wasm
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    console::log_1(&"Wasm module started...".into());
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    Ok(())
}

#[wasm_bindgen]
pub fn process_file(file_data: &[u8]) -> Result<(), JsValue> {

    let window = setup_window(None)?;
    console::log_1(&"Window initialized.".into());

    let context = window.gl();
    console::log_1(&"Context created.".into());

    let camera = initialize_camera(&window);
    console::log_1(&"Camera initialized.".into());

    let (elevation, width, height) = read_calculate(file_data)?;
    console::log_1(&"Elevation data calculated.".into());

    let positions = generate_positions(&elevation);
    console::log_1(&"Positions generated.".into());

    let indices = generate_indices(width, height);
    console::log_1(&"Indices generated.".into());

    let model = initialize_model(&context, positions, indices)?;
    console::log_1(&"Model initialized.".into());


    render_loop(window, camera, model);
 

    Ok(())
}


fn read_calculate(file_data: &[u8]) -> Result<ElevationResult, JsValue> {
    console::log_1(&"Reading and calculating elevation data...".into());
    let cursor = Cursor::new(file_data);
    let mut reader = GeoTiffReader::open(cursor).map_err(|e| JsValue::from_str(&e.to_string()))?;
    console::log_1(&"GeoTiffReader initialized...".into());

    let image_info = reader.image_info();
    let (width, height) = image_info
        .dimensions
        .ok_or_else(|| JsValue::from_str("Failed to get dimensions"))?;
    let width = width as usize;
    let height = height as usize;
    console::log_1(&format!("Image dimensions: {}x{}", width, height).into());

    let mut elevation_data = Array2::<f32>::zeros((height, width));

    let pixels = reader.pixels(0, 0, width as u32, height as u32);

    for (x, y, pixel) in pixels {
        let pixel_value = match pixel {
            RasterValue::F32(value) => value,
            RasterValue::F64(value) => value as f32,
            RasterValue::I16(value) => value as f32,
            RasterValue::I32(value) => value as f32,
            RasterValue::I64(value) => value as f32,
            RasterValue::I8(value) => value as f32,
            RasterValue::U16(value) => value as f32,
            RasterValue::U32(value) => value as f32,
            RasterValue::U64(value) => value as f32,
            RasterValue::U8(value) => value as f32,
            _ => 0.0,
        };
        elevation_data[[y as usize, x as usize]] = pixel_value;
    }
    Ok((elevation_data, width, height))
}

fn generate_positions(elevation_data: &Array2<f32>) -> Vec<Vec3> {
    console::log_1(&"Generating positions...".into());
    let (height, width) = elevation_data.dim();
    let mut positions = Vec::with_capacity(height * width);

    for (y, row) in elevation_data.axis_iter(ndarray::Axis(0)).enumerate() {
        for (x, &z) in row.iter().enumerate() {
            positions.push(vec3(x as f32, y as f32, z * 0.1));
        }
    }
    positions
}

fn generate_indices(width: usize, height: usize) -> Vec<u32> {
    console::log_1(&"Generating indices...".into());
    let mut indices = Vec::with_capacity((width - 1) * (height - 1) * 6);

    for y in 0..height - 1 {
        for x in 0..width - 1 {
            let top_left = (y * width + x) as u32;
            let top_right = top_left + 1;
            let bottom_left = top_left + width as u32;
            let bottom_right = bottom_left + 1;

            indices.extend_from_slice(&[
                top_left, bottom_left, top_right,
                top_right, bottom_left, bottom_right,
            ]);
        }
    }
    indices
}

fn setup_window(max_size: Option<(u32, u32)>) -> Result<Window, JsValue> {
    console::log_1(&"Setting up window...".into());
    let settings = WindowSettings {
        max_size,
        ..Default::default()
    };
    Window::new(settings).map_err(|e| JsValue::from_str(&e.to_string()))
}

fn initialize_camera(window: &Window) -> Camera {
    Camera::new_perspective(
        window.viewport(),
        vec3(0.0, 0.0, 100.0),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        degrees(45.0),
        0.1,
        1000.0,
    )
}

fn initialize_model(context: &Context, positions: Vec<Vec3>, indices: Vec<u32>) -> Result<Gm<Mesh, ColorMaterial>, JsValue> {
    let cpu_mesh = CpuMesh {
        positions: Positions::F32(positions),
        indices: Indices::U32(indices),
        colors: None,
        ..Default::default()
    };
    let mut model = Gm::new(Mesh::new(context, &cpu_mesh), ColorMaterial::default());
    model.set_transformation(Mat4::from_angle_z(degrees(-45.0)));
    Ok(model)
}

fn render_loop(window: Window, mut camera: Camera, mut model: Gm<Mesh, ColorMaterial>) {
    window.render_loop(move |frame_input| {
        camera.set_viewport(frame_input.viewport);
        model.animate(frame_input.accumulated_time as f32);

        handle_camera_control(&mut camera, &frame_input.events);

        frame_input
            .screen()
            .clear(ClearState::color_and_depth(0.8, 0.8, 0.8, 1.0, 1.0))
            .render(&camera, &model, &[]); 

        FrameOutput { exit: false, ..Default::default() }
    });
}
fn handle_camera_control(camera: &mut Camera, events: &[Event]) {
    for event in events.iter() {
        if let Event::KeyPress { kind, .. } = event {
            match kind {
                Key::W => camera.translate(&vec3(0.0, 0.0, -1.0)),
                Key::S => camera.translate(&vec3(0.0, 0.0, 1.0)),
                Key::A => camera.translate(&vec3(-1.0, 0.0, 0.0)),
                Key::D => camera.translate(&vec3(1.0, 0.0, 0.0)),
                _ => {}
            }
        }
    }
}
