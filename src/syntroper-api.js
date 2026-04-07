const { info } = require("./logger");

const API_BASE = "https://api.syntroper.com/v1";

async function uploadDiagram({
  token,
  engine,
  rawSource,
  canonicalSource,
  hashes,
  filePath,
  repository,
  commitSha
}) {
  info(`Uploading diagram (engine=${engine}, canonical=${hashes.canonicalHash.slice(0, 12)}…)`);

  const response = await fetch(`${API_BASE}/diagrams/upsert`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      engine,
      rawSource,
      canonicalSource,
      canonicalHash: hashes.canonicalHash,
      renderHash: hashes.renderHash,
      source: {
        repository,
        filePath,
        commitSha
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Syntroper API error ${response.status}: ${text}`);
  }

  // Expected response: { diagramId, imageUrl, interactiveUrl }
  return response.json();
}

module.exports = { uploadDiagram };
