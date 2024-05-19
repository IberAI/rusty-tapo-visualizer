use three_d::*;


fn setup_window(max_size: Option<(u32, u32)>) {
    let settings = WindowSettings {
        max_size,
        ..Default::default()
    };
    let window = Window::new(settings).unwrap();

}
pub fn main() {
    // Create a window (a canvas on web)
    let window = Window::new(WindowSettings {
        title: "Triangle!".to_string(),

        ..Default::default()
    })
    .unwrap();

    // Get the graphics context from the window
    let context = window.gl();

    // Create a camera
    let mut camera = Camera::new_perspective(
        window.viewport(),
        vec3(0.0, 0.0, 2.0),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        degrees(45.0),
        0.1,
        10.0,
    );


    // Define the positions for a cube
    let positions = vec![
        vec3(-0.5, -0.5, -0.5), // 0: bottom left back
        vec3(0.5, -0.5, -0.5),  // 1: bottom right back
        vec3(0.5, 0.5, -0.5),   // 2: top right back
        vec3(-0.5, 0.5, -0.5),  // 3: top left back
        vec3(-0.5, -0.5, 0.5),  // 4: bottom left front
        vec3(0.5, -0.5, 0.5),   // 5: bottom right front
        vec3(0.5, 0.5, 0.5),    // 6: top right front
        vec3(-0.5, 0.5, 0.5),   // 7: top left front
    ];

    // Define the colors for each vertex
    let colors = vec![
        Srgba::RED,    // 0
        Srgba::GREEN,  // 1
        Srgba::BLUE,   // 2
        Srgba::RED, // 3
        Srgba::GREEN,   // 4
        Srgba::BLUE,// 5
        Srgba::WHITE,  // 6
        Srgba::BLACK,  // 7
    ];

    // Define the indices for the triangles that make up the cube
    let indices = vec![
        // Back face
        0, 1, 2, 0, 2, 3,
        // Front face
        4, 5, 6, 4, 6, 7,
        // Left face
        0, 3, 7, 0, 7, 4,
        // Right face
        1, 5, 6, 1, 6, 2,
        // Top face
        3, 2, 6, 3, 6, 7,
        // Bottom face
        0, 1, 5, 0, 5, 4,
    ];

    let cpu_mesh = CpuMesh {
        positions: Positions::F32(positions),
        indices: Indices::U32(indices),
        colors: Some(colors),
        ..Default::default()
    };
    // Construct a model, with a default color material, thereby transferring the mesh data to the GPU
    let mut model = Gm::new(Mesh::new(&context, &cpu_mesh), ColorMaterial::default());

    // Add an animation to the triangle.
    model.set_animation(|time| Mat4::from_angle_y(radians(time * 0.005)));

    // Start the main render loop
    window.render_loop(
        move |frame_input| // Begin a new frame with an updated frame input
    {
        // Ensure the viewport matches the current window viewport which changes if the window is resized
        camera.set_viewport(frame_input.viewport);

        // Update the animation of the triangle
        model.animate(frame_input.accumulated_time as f32);

        // Get the screen render target to be able to render something on the screen
        frame_input.screen()
            // Clear the color and depth of the screen render target
            .clear(ClearState::color_and_depth(0.8, 0.8, 0.8, 1.0, 1.0))
            // Render the triangle with the color material which uses the per vertex colors defined at construction
            .render(
                &camera, &model, &[]
            );

        // Returns default frame output to end the frame
        FrameOutput::default()
    },
    );
}
