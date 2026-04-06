const core = require("@actions/core");

function info(message) {
  core.info(message);
}

function warning(message) {
  core.warning(message);
}

module.exports = { info, warning };
