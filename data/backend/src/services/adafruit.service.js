const AIO_USERNAME = process.env.AIO_USERNAME;
const AIO_KEY = process.env.AIO_KEY;

async function pushValue(feedKey, value) {
  if (!AIO_USERNAME || !AIO_KEY) {
    return { skipped: true };
  }

  const url = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feedKey}/data`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AIO-Key": AIO_KEY
    },
    body: JSON.stringify({ value: String(value) })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Adafruit error: ${text}`);
  }

  return response.json();
}

async function pushReadingToAdafruit({ temperature, humidity, lightLevel, irDetected }) {
  const tasks = [];

  if (temperature !== null) tasks.push(pushValue("temperature", temperature));
  if (humidity !== null) tasks.push(pushValue("humidity", humidity));
  if (lightLevel !== null) tasks.push(pushValue("light", lightLevel));
  if (irDetected !== null) tasks.push(pushValue("motion", irDetected ? 1 : 0));

  return Promise.all(tasks);
}

module.exports = {
  pushReadingToAdafruit
};