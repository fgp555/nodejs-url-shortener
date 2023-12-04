const express = require("express");
const bodyParser = require("body-parser");
const shortid = require("shortid");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 3000;
const dataFilePath = "data.json";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

async function loadData() {
  try {
    const jsonData = await fs.readFile(dataFilePath, "utf8");
    return JSON.parse(jsonData);
  } catch (error) {
    return {};
  }
}

async function saveData(data) {
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

app.get("/data", async (req, res) => {
  const data = await loadData();
  res.json(data);
});

app.post("/reset-visits", async (req, res) => {
  const data = await loadData();
  Object.keys(data).forEach((shortUrl) => {
    data[shortUrl].visits = 0;
  });

  await saveData(data);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/del", (req, res) => {
  res.sendFile(path.join(__dirname, "delete.html"));
});

app.get("/asdf", (req, res) => {
  console.log("Accessed /admin route");
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/data-admin", (req, res) => {
  res.download(dataFilePath, "data.json");
});

app.post("/data-upload", async (req, res) => {
  try {
    const uploadedData = req.body;

    if (!uploadedData || typeof uploadedData !== "object") {
      throw new Error("Invalid data format");
    }

    await saveData(uploadedData);
    res.status(200).send("Data uploaded successfully");
  } catch (error) {
    console.error("Error uploading data:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "upload.html"));
});

app.post("/shorten", async (req, res) => {
  const { longUrl, customBackHalf } = req.body;
  if (!longUrl) {
    return res.status(400).send("Missing longUrl parameter");
  }

  const data = await loadData();
  const shortUrl = customBackHalf || shortid.generate();
  data[shortUrl] = { longUrl, visits: 0 };

  await saveData(data);

  const shortUrlWithHost = `${req.protocol}://${req.get("host")}/${shortUrl}`;
  res.json({ shortUrl: shortUrlWithHost });
});

app.delete("/delete/:shortUrl", async (req, res) => {
  const { shortUrl } = req.params;
  const data = await loadData();

  if (data[shortUrl]) {
    delete data[shortUrl];
    await saveData(data);
    res.sendStatus(200);
  } else {
    res.status(404).send("Short URL not found");
  }
});

app.get("/:shortUrl", async (req, res) => {
  const { shortUrl } = req.params;
  const data = await loadData();
  const urlData = data[shortUrl];

  if (urlData) {
    urlData.visits = (urlData.visits || 0) + 1;
    await saveData(data);

    res.redirect(urlData.longUrl);
  } else {
    res.status(404).sendFile(path.join(__dirname, "404.html"));
  }
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "404.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
