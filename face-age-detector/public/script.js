// Config variables
const MIN_AGE = 35;        // âge minimum
const AGE_HOLD_TIME = 1500; // temps en ms avant de confirmer

let overAgeStart = null;   // quand on a commencé à détecter un âge > MIN_AGE

async function startVideo() {
  const video = document.getElementById("video");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}

async function run() {
  console.log("Loading local models...");
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
  await faceapi.nets.ageGenderNet.loadFromUri("./models");

  console.log("Models loaded. Starting detection...");

  const video = document.getElementById("video");

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    if (detections.length > 0) {
      const age = detections[0].age;
      console.log("Detected age:", age);

      if (age > MIN_AGE) {
        if (!overAgeStart) {
          // Premier instant où on dépasse l’âge
          overAgeStart = Date.now();
        }
        // Vérifier si assez de temps écoulé
        if (Date.now() - overAgeStart >= AGE_HOLD_TIME) {
          document.body.style.backgroundColor = "red";
        }
      } else {
        // Réinitialiser si l'âge redescend
        overAgeStart = null;
        document.body.style.backgroundColor = "white";
      }
    } else {
      // Pas de visage → reset
      overAgeStart = null;
      document.body.style.backgroundColor = "white";
    }
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  startVideo();
  const video = document.getElementById("video");
  video.addEventListener("play", run);
});
