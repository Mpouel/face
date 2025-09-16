const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const statusEl = document.getElementById('status');

// Colors
const GREEN = "#00FF00";
const YELLOW = "#FFFF00";
const RED = "#FF0000";

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
    statusEl.innerText = "✅ Camera started.";
  } catch (err) {
    console.error("Error starting camera:", err);
    statusEl.innerText = "❌ Camera failed.";
  }
}

async function loadModels() {
  statusEl.innerText = "Loading models...";
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.ageGenderNet.loadFromUri("/models");
    statusEl.innerText = "✅ Models loaded successfully.";
  } catch (err) {
    console.error("Error loading models:", err);
    statusEl.innerText = "❌ Could not load models. Ensure /models exists.";
  }
}

function getAgeColor(age) {
  if (age < 30) return GREEN;
  if (age < 40) return YELLOW;
  return RED;
}

async function onPlay() {
  if (video.paused || video.ended) {
    return setTimeout(() => onPlay());
  }

  const options = new faceapi.TinyFaceDetectorOptions();
  const detections = await faceapi
    .detectAllFaces(video, options)
    .withAgeAndGender();

  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  detections.forEach(det => {
    const { age, gender, detection } = det;
    const box = detection.box;

    // Draw box
    ctx.strokeStyle = getAgeColor(age);
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw label
    ctx.fillStyle = getAgeColor(age);
    ctx.font = "16px Arial";
    ctx.fillText(`${Math.round(age)} yrs (${gender})`, box.x, box.y - 5);

    // Change background color
    document.body.style.background = getAgeColor(age);
  });

  requestAnimationFrame(onPlay);
}

video.addEventListener('play', onPlay);

// Init
(async () => {
  await loadModels();
  await startCamera();
})();
