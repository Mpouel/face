import * as faceapi from "../node_modules/face-api.js/dist/face-api.esm.js";

const video = document.getElementById("video");

async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
  } catch (err) {
    console.error("Erreur caméra:", err);
  }
}

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
  await faceapi.nets.ageGenderNet.loadFromUri("./models");
}

async function detect() {
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withAgeAndGender();

  if (detections.length > 0) {
    const age = detections[0].age;
    console.log("Âge estimé:", age.toFixed(0));

    if (age > 30) {
      document.body.style.background = "red";
    } else {
      document.body.style.background = "white";
    }
  } else {
    document.body.style.background = "white";
  }
}

video.addEventListener("play", () => {
  setInterval(detect, 1000);
});

loadModels().then(startVideo);
