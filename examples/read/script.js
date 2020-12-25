import { decodeRGBE } from "../../build/io-rgbe.module.js";

let hdri;
let exposure = 1;
let canvas, ctx;

window.onload = () => {
    document.body.addEventListener("drop", onDrop);
    document.body.addEventListener("dragover", onDragOver);
    document.getElementById("exposureRange").addEventListener("change", e => onExposureChange(e.target.value));
    canvas = document.getElementById("image");
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

    let fileReader = new FileReader();
    fileReader.onload = event => processHDR(event.target.result);
    fileReader.readAsArrayBuffer(file);
}

function processHDR(data)
{
    document.getElementById("progress").classList.add("hidden");
    document.getElementById("endContainer").classList.remove("hidden");
    hdri = decodeRGBE(new DataView(data));
    updateImage();
}

function onExposureChange(value)
{
    exposure = value;
    updateImage();
}

function updateImage()
{
    const data = hdri.array;
    const tgt = new Uint8ClampedArray(data.length / 3 * 4);
    const gamma = 1.0 / 2.2;

    for (let i = 0, j = 0; i < data.length; i += 3) {
        tgt[j] = Math.pow(data[i] * exposure, gamma) * 0xff;
        tgt[j + 1] = Math.pow(data[i + 1] * exposure, gamma) * 0xff;
        tgt[j + 2] = Math.pow(data[i + 2] * exposure, gamma) * 0xff;
        tgt[j + 3] = 0xff;
        j += 4;
    }

    const imgData = new ImageData(tgt, hdri.width, hdri.height);
    canvas.width = hdri.width;
    canvas.height = hdri.height;
    canvas.style.width = "100vw";
    canvas.style.height = Math.round(hdri.height / hdri.width * 100) + "vw";
    ctx.clearRect(0, 0, hdri.width, hdri.height);
    ctx.putImageData(imgData, 0, 0);
}
