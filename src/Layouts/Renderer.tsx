
const Renderer: React.FC = () => {
  return (
    <section className="flex-grow">
      <iframe id="3d-viewer" className="h-full w-full" src="/3dviewer.html">
      </iframe>
    </section> 
  )
}

export default Renderer;
