const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const statusEl = document.getElementById('status');

const startPipBtn = document.getElementById('start-pip');
const stopPipBtn = document.getElementById('stop-pip');
const colorPipe = document.getElementById('colorPipe');

const GREEN = "#00FF00", YELLOW = "#FFFF00", RED = "#FF0000";
let stream = null, sampling = false, samplerInterval = null;

const hiddenCanvas = document.createElement('canvas');
const hiddenCtx = hiddenCanvas.getContext('2d');

const colorStream = () => hiddenCanvas.captureStream(30);

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        statusEl.innerText = "✅ Camera started";
        hiddenCanvas.width = 64; hiddenCanvas.height = 36;
    } catch (err) {
        console.error(err);
        statusEl.innerText = "❌ Camera failed";
    }
}

async function loadModels() {
    statusEl.innerText = "Loading models...";
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.ageGenderNet.loadFromUri("/models");
        statusEl.innerText = "✅ Models loaded";
        startPipBtn.disabled = false;
    } catch (err) {
        console.error(err);
        statusEl.innerText = "❌ Could not load models";
    }
}

function getAgeColor(age) { return age < 30 ? GREEN : age < 40 ? YELLOW : RED; }

async function onPlay() {
    if (video.paused || video.ended) return setTimeout(onPlay, 100);
    const options = new faceapi.TinyFaceDetectorOptions();
    const detections = await faceapi.detectAllFaces(video, options).withAgeAndGender();

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    detections.forEach(det => {
        const { age, gender, detection } = det;
        const box = detection.box;
        ctx.strokeStyle = getAgeColor(age);
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = getAgeColor(age);
        ctx.font = "16px Arial";
        ctx.fillText(`${Math.round(age)} yrs (${gender})`, box.x, box.y - 5);
        document.body.style.background = getAgeColor(age);
    });
    requestAnimationFrame(onPlay);
}
video.addEventListener('play', onPlay);

function computeAverageColor() {
    hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    const data = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
    return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

function drawColorRect({ r, g, b }) { hiddenCtx.fillStyle = `rgb(${r},${g},${b})`; hiddenCtx.fillRect(0, 0, hiddenCanvas.width, hiddenCanvas.height); }

async function startPipColor() {
    if (!stream) return alert('Start camera first');

    colorPipe.srcObject = colorStream();

    await new Promise(resolve => {
        colorPipe.onloadedmetadata = () => { colorPipe.oncanplay = () => resolve(); }
    });

    await colorPipe.play();

    sampling = true;
    samplerInterval = setInterval(() => {
        const avg = computeAverageColor();
        drawColorRect(avg);
    }, 100);

    try {
        await colorPipe.requestPictureInPicture();
        startPipBtn.disabled = false;
        stopPipBtn.disabled = false;
    } catch (err) {
        console.error('PiP failed', err);
        stopSampling();
    }
}

function stopSampling() {
    sampling = false;
    if (samplerInterval) { clearInterval(samplerInterval); samplerInterval = null; }
    if (document.pictureInPictureElement) { document.exitPictureInPicture().catch(() => { }); }
    startPipBtn.disabled = false;
    stopPipBtn.disabled = true;
}

startPipBtn.addEventListener('click', startPipColor);
stopPipBtn.addEventListener('click', stopSampling);
document.addEventListener('leavepictureinpicture', stopSampling);

(async () => { await loadModels(); await startCamera(); })();