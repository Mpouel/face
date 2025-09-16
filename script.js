// script.js
// Full version with debug + age detection + PiP + color logic
// Requires: face-api.js and models/ folder with weights

// DOM elements
const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ageDisplay = document.getElementById("ageDisplay");

let stream = null;
let analyzing = false;


// Initialization


async function loadModels() {
  try {
    console.log("Loading models...");
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.ageGenderNet.loadFromUri("/models");
    console.log("✅ Models loaded successfully.");
  } catch (err) {
    console.error("❌ Failed to load models:", err);
    alert("Could not load models. Make sure /models folder exists.");
  }
}


// Start camera


async function startCamera() {
  try {
    console.log("Requesting camera...");
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    await video.play();
    console.log("✅ Camera started.");
  } catch (err) {
    console.error("❌ Camera error:", err);
    alert("Could not access the camera.");
  }
}


// Picture-in-Picture


async function enablePiP() {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      console.log("Exited PiP.");
    } else {
      await video.requestPictureInPicture();
      console.log("Entered PiP.");
    }
  } catch (err) {
    console.error("❌ PiP error:", err);
  }
}


// Age detection


function getColorForAge(age) {
  if (age >= 40) return "red";
  if (age >= 30) return "yellow";
  return "white";
}

async function analyzeLoop() {
  if (!analyzing) return;

  try {
    const detections = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    if (detections && detections.age) {
      const age = Math.round(detections.age);
      const color = getColorForAge(age);

      document.body.style.backgroundColor = color;

      ageDisplay.innerText = `Age: ${age} (${color})`;

      // Debug log
      console.log(`Detected age: ${age}, bg=${color}`);

      // Draw box on canvas
      const dims = faceapi.matchDimensions(canvas, video, true);
      const resizedDetections = faceapi.resizeResults(detections, dims);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
    } else {
      ageDisplay.innerText = "No face detected";
      document.body.style.backgroundColor = "white";
    }
  } catch (err) {
    console.error("❌ Detection error:", err);
  }

  requestAnimationFrame(analyzeLoop);
}


// Button handler


startBtn.addEventListener("click", async () => {
  if (analyzing) {
    console.log("Stopping analysis...");
    analyzing = false;
    startBtn.innerText = "Start";
    return;
  }

  console.log("Initializing...");
  await loadModels();
  await startCamera();

  // Hide video and canvas if you want only PiP
  video.style.display = "none";
  canvas.style.display = "none";

  analyzing = true;
  startBtn.innerText = "Stop";

  analyzeLoop();
  enablePiP();
});


// Extra logging (for debugging)

window.addEventListener("error", (e) => {
  console.error("Global Error:", e.message);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled Promise Rejection:", e.reason);
});


// Helper: resize canvas with video


video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  console.log(`Canvas resized: ${canvas.width}x${canvas.height}`);
});
