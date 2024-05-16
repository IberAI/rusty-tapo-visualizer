
// Utility function to send a file to an iframe
function sendFileToIframe(file: File, iframeId: string, targetOrigin: string): void {
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (!iframe) {
        console.error('Iframe not found:', iframeId);
        return;
    }

    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result) {
            const message = {
                type: 'fileData',
                fileName: file.name,
                content: event.target.result
            };
            iframe.contentWindow?.postMessage(message, targetOrigin);
        }
    };

    // Read the file as ArrayBuffer, you can change this to readAsDataURL or readAsText based on your requirements
    reader.readAsArrayBuffer(file);
}

export {sendFileToIframe};
