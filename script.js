const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const statusEl = document.getElementById('status');

// Hidden video for PiP
const pipVideo = document.createElement('video');
pipVideo.autoplay = true;
pipVideo.muted = true;
pipVideo.playsInline = true;

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
    // Only the models we actually use
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
    return setTimeout(() => onPlay(), 200);
  }

  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;

  const options = new faceapi.TinyFaceDetectorOptions();
  const detections = await faceapi
    .detectAllFaces(video, options)
    .withAgeAndGender();

  // Draw the camera feed
  ctx.drawImage(video, 0, 0, overlay.width, overlay.height);

  // Draw detections
  detections.forEach(det => {
    const { age, gender, detection } = det;
    const box = detection.box;

    ctx.strokeStyle = getAgeColor(age);
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    ctx.fillStyle = getAgeColor(age);
    ctx.font = "16px Arial";
    ctx.fillText(`${Math.round(age)} yrs (${gender})`, box.x, box.y - 5);

    // Feedback background
    document.body.style.background = getAgeColor(age);
  });

  requestAnimationFrame(onPlay);
}

// ---- PiP setup ----
const stream = overlay.captureStream();
pipVideo.srcObject = stream;

// Add a PiP toggle button dynamically
const pipBtn = document.createElement('button');
pipBtn.innerText = "📺 Toggle PiP";
pipBtn.style.position = "fixed";
pipBtn.style.top = "10px";
pipBtn.style.right = "10px";
pipBtn.style.zIndex = 1000;
pipBtn.disabled = true; // wait until ready
document.body.appendChild(pipBtn);

// Enable PiP only when pipVideo has metadata
pipVideo.addEventListener('loadedmetadata', () => {
  pipBtn.disabled = false;
});

// Handle PiP button
pipBtn.addEventListener('click', async () => {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await pipVideo.requestPictureInPicture();
    }
  } catch (err) {
    console.error("PiP error:", err);
  }
});

// Init
(async () => {
  await loadModels();
  await startCamera();
  video.addEventListener('play', onPlay);
})();
