//import { useState } from 'react'
import MainMenu from "./Layouts/MainMenu";
import Renderer from "./Layouts/Renderer";
function App() {
  return (
    <div className="flex flex-col h-screen bg-sky">
      <MainMenu/>
      <Renderer/>
    </div>
  )
}

export default App;
