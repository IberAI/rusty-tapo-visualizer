# Rusty Topographic Map Visualizer

## Description

Rusty Topographic Map Visualizer is a web application that transforms .tif files into interactive 3D topographic maps. By utilizing a combination of React, TypeScript, and Rust compiled to WebAssembly (WASM), this app reads elevation data from .tif files, generates 3D meshes, and renders them in the browser. This project aims to provide an engaging way to visualize and explore topographic data.

## Technologies

- **React**: Handles the user interface and client-side interactions.
- **TypeScript**: Enhances development by adding static types to JavaScript.
- **Rust**: Used for performance-critical components; compiles to WASM for web use.
- **WebAssembly (WASM)**: Enables running high-performance Rust code directly in the web browser.

## How it works
### Software Architecture

The Rusty Topographic Map Visualizer is composed of the following key components:

1. **Frontend (React + TypeScript)**:
    - **FileUploader Component**: A React component that allows users to upload `.tif` files.
    - **Iframe**: An iframe that hosts the WASM module responsible for rendering the 3D mesh.

2. **Backend (Rust + WASM)**:
    - **GeoTIFF Processing**: Rust code that processes the uploaded GeoTIFF files to extract elevation data.
    - **Mesh Generation**: Rust functions that convert the elevation data into 3D vertex positions and triangle indices.
    - **Rendering**: Uses the `three_d` crate to render the 3D mesh within a WebGL context.


### How to generate a mesh from an elevation data

- **Reading and Calculating Elevation Data**:
  - **File Reading**: The GeoTIFF file is read using a `GeoTiffReader`, which provides a way to access the image and its metadata.
  - **Extracting Dimensions**: The dimensions of the GeoTIFF image (width and height) are obtained to initialize a 2D array for storing elevation data.
  - **Populating Elevation Data**: The pixel values from the GeoTIFF are iterated over and converted to floating-point elevation values, which are then stored in the 2D array.

- **Generating 3D Positions**:
  - **Array Iteration**: The 2D array of elevation data is iterated row by row and column by column.
  - **Vertex Calculation**: For each elevation value, a corresponding 3D vertex position is created. The `x` and `y` coordinates are derived from the position in the array, and the `z` coordinate is the elevation value, possibly scaled to fit the desired vertical exaggeration.
  - **Vertex Storage**: These 3D positions are stored in a vector, which represents all the vertices of the 3D mesh.

- **Generating Indices for Mesh**:
  - **Grid Traversal**: The code traverses the grid of vertices (created in the previous step), excluding the last row and column to avoid out-of-bounds errors.
  - **Triangle Definition**: For each grid cell, two triangles are defined using the indices of the vertices. These triangles together form a square in the mesh.
  - **Index Storage**: The indices for the vertices of these triangles are stored in a vector, which defines how the vertices are connected to form the mesh.

- **Rendering the Mesh**:
  - **Context Initialization**: A rendering context (WebGL) is initialized, which will be used to render the mesh in the browser.
  - **Camera Setup**: A camera is set up with a perspective projection, which defines how the 3D scene is viewed.
  - **Model Initialization**: The 3D model is created using the generated positions and indices. This model is configured with necessary transformations and materials.
  - **Render Loop**: A render loop is started, which continuously renders the scene. Within this loop, the camera's viewport is updated, the model is animated if necessary, and the scene is rendered to the screen.
  - **User Interaction**: The render loop also handles user inputs to control the camera, allowing for interactive exploration of the 3D topographic map.

This process involves reading elevation data from a GeoTIFF file, converting that data into a 3D mesh, and then rendering the mesh in a web browser using WebGL and WebAssembly for high performance.
