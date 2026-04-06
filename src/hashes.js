const crypto = require("crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function makeHashes({ engine, canonicalSource, renderConfig }) {
  const canonicalPayload = JSON.stringify({
    engine,
    canonicalSource
  });

  const canonicalHash = sha256(canonicalPayload);

  const renderPayload = JSON.stringify({
    engine,
    canonicalHash,
    renderConfig
  });

  const renderHash = sha256(renderPayload);

  const rawSourceHash = sha256(canonicalSource);

  return { rawSourceHash, canonicalHash, renderHash };
}

module.exports = { makeHashes, sha256 };
