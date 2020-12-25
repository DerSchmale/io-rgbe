import { encodeRGBE } from "../../build/io-rgbe.module.js"

let canvas, ctx;

window.onload = () => {
    document.body.addEventListener("drop", onDrop);
    document.body.addEventListener("dragover", onDragOver);
    canvas = document.createElement("Canvas");
    ctx = canvas.getContext("2d");
};

function onDragOver(event)
{
    event.preventDefault();
}

function onDrop(event)
{
    event.preventDefault();

    if (event.dataTransfer.items) {
        if (event.dataTransfer.items[0].kind === 'file') {
            let file = event.dataTransfer.items[0].getAsFile();
            loadFile(file);
        }
    } else {
        loadFile(event.dataTransfer.files[0]);
    }
}

function loadFile(file)
{
    document.getElementById("errorContainer").classList.add("hidden");
    document.getElementById("startContainer").classList.add("hidden");
    document.getElementById("endContainer").classList.add("hidden");
    document.getElementById("progress").classList.remove("hidden");

    const i = file.name.indexOf(".");
    const filename = file.name.substring(0, i) + ".hdr";

    const fileReader = new FileReader();
    fileReader.onload = event => processHDR(event.target.result, filename);
    fileReader.onprogress = event => onProgress(event.loaded / event.total);
    fileReader.readAsArrayBuffer(file);
}

function onProgress(ratio)
{
    let progress = document.getElementById("progressProgress");
    progress.style.width = Math.floor(ratio * 100) + "%";
}

function processHDR(fileData, filename)
{
    document.getElementById("progress").classList.add("hidden");
    document.getElementById("endContainer").classList.remove("hidden");

    // jump through some hoops to get to the uploaded pixel data
    let binary = "";
    const bytes = new Uint8Array(fileData);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    const base64 = "data:image/jpg;base64, " + window.btoa(binary);

    let img = new Image();
    img.src = base64;
    img.onload = () =>
    {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const blob = new Blob([ encodeRGBE(imgData) ], {type: "application/octet-stream"});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style = "display: none";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    }
}
