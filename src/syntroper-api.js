const { info } = require("./logger");

function mermaidImageUrl(source) {
  const encoded = Buffer.from(source, "utf8").toString("base64url");
  return `https://mermaid.ink/img/base64:${encoded}`;
}

function plantumlImageUrl(source) {
  const hex = Buffer.from(source, "utf8").toString("hex");
  return `https://www.plantuml.com/plantuml/svg/~h${hex}`;
}

function makeStaticUrls({ engine, canonicalSource, hashes }) {
  const imageUrl =
    engine === "mermaid"
      ? mermaidImageUrl(canonicalSource)
      : plantumlImageUrl(canonicalSource);

  return {
    diagramId: hashes.canonicalHash.slice(0, 16),
    imageUrl,
    interactiveUrl: imageUrl
  };
}

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
  info(`Resolving diagram (engine=${engine}, canonical=${hashes.canonicalHash.slice(0, 12)}…)`);

  // Static mode: generate public renderer URLs directly
  return makeStaticUrls({ engine, canonicalSource, hashes });
}

module.exports = { uploadDiagram, makeStaticUrls };
