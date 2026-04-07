const { info } = require("./logger");

function mermaidImageUrl(source) {
  const encoded = Buffer.from(source, "utf8").toString("base64url");
  return `https://mermaid.ink/img/base64:${encoded}`;
}

function plantumlImageUrl(source) {
  const hex = Buffer.from(source, "utf8").toString("hex");
  return `https://www.plantuml.com/plantuml/svg/~h${hex}`;
}

function ditaaImageUrl(source) {
  const wrapped = `@startditaa\n${source}\n@endditaa`;
  const hex = Buffer.from(wrapped, "utf8").toString("hex");
  return `https://www.plantuml.com/plantuml/svg/~h${hex}`;
}

function krokiImageUrl(engine, source) {
  const encoded = Buffer.from(source, "utf8").toString("base64url");
  return `https://kroki.io/${engine}/svg/${encoded}`;
}

function getImageUrl(engine, source) {
  switch (engine) {
    case "mermaid":
      return mermaidImageUrl(source);
    case "plantuml":
      return plantumlImageUrl(source);
    case "ditaa":
      return ditaaImageUrl(source);
    case "graphviz":
      return krokiImageUrl("graphviz", source);
    case "d2":
      return krokiImageUrl("d2", source);
    case "svgbob":
      return krokiImageUrl("svgbob", source);
    case "ascii":
      return krokiImageUrl("svgbob", source);
    default:
      return krokiImageUrl(engine, source);
  }
}

function makeStaticUrls({ engine, canonicalSource, hashes }) {
  const imageUrl = getImageUrl(engine, canonicalSource);

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
