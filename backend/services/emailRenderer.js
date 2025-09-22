// services/emailRenderer.js
const fs = require("fs/promises");
const Handlebars = require("handlebars");

// ---- Register tiny helpers used in the template (once) ----
let helpersRegistered = false;
function registerHelpersOnce() {
  if (helpersRegistered) return;
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("ne", (a, b) => a !== b);
  Handlebars.registerHelper("and", (a, b) => Boolean(a && b));
  helpersRegistered = true;
}

// ---- Cache the compiled template in memory ----
let compiledTemplate = null;

async function getCompiledTemplate() {
  if (compiledTemplate) return compiledTemplate;

  // Resolve and load the template file
  const templatePath = require.resolve("../emails/issue_leader.html");
  const src = await fs.readFile(templatePath, "utf8");

  // Compile with default escaping ON (safer). Remove the second arg.
  compiledTemplate = Handlebars.compile(src);
  return compiledTemplate;
}

/**
 * Render the "issue leader" email HTML
 * @param {Object} data - Matches the placeholders in the template.

 */
async function renderIssueLeaderEmail(data) {
  registerHelpersOnce();
  const tpl = await getCompiledTemplate();
  return tpl(data);
}

module.exports = { renderIssueLeaderEmail };
