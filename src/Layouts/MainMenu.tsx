import React, {useState, useRef} from "react";
import DefaultButton from "../Components/Buttons";

import { sendFileToIframe } from "../Utils/Messanger";


const MainMenu: React.FC = () =>  {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      setSelectedFile(file);
      sendFileToIframe(file, "3d-viewer", "http://localhost:5173/");
    }
  };

  // Function to trigger file input when button is clicked
  const handleTryItOutClick = () => {
    fileInputRef.current?.click();  // Safely trigger the click event
  };
  return (
    <div className="flex flex-col space-y-6">
      <div id="title-box" className="flex flex-row items-center justify-center">
        <h1 className="text-sunset text-5xl">
          Rusty Tapographic Map Visualizer
        </h1>
      </div>

      <section className="flex flex-row p-6 border-2 border-mint">
        <div id="Basic info text" className="max-h-fit w-1/2 text-center">
          <p className="text-lemon text-balance text-2xl">

            Hello and welcome to IberAI’s first topographic map visualizer! This tool is designed to parse TIFF files and visualize them in 3D.
            To get started, simply click the “Try it out” button if you have your own TIFF topographic map.
            Don't have one? No worries! Click on the "Example" button to see how it works with a sample file.
          </p>

        </div>
        <div id="Actions" className="flex flex-col w-1/2 items-center justify-center">
          <div id="Buttons" className="flex flex-row space-x-2 text-xl">
            <DefaultButton label="Try It out" onClick={handleTryItOutClick} color="blue" size="medium"/>
            <DefaultButton label="Show Example" onClick={()=>{}} color="green" size="medium"/>
            <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".tif"
            />
          </div>
          <div id="SelectedInfo">
            <p className="text-lemon text-lg">
              Currently Loading: <span id="SelectedPath" className="text-sunset">{selectedFile ? selectedFile.name : 'None'}</span>
            </p>
          </div>

        </div>
      </section>
      
    </div>
  );
}

export default MainMenu;

