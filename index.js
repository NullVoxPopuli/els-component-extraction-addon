"use strict";

const { TextEdit, Position, Range, Command } = require("vscode-languageserver");
const { URI } = require("vscode-uri");

const {
  normalizeToAngleBracketComponent,
  waitForFileNameContains,
  watcherFn,
} = require("./utils");
const { transformSelection } = require("./transformers");

/**
 * Entrypoint to this ELS addon.
 * 1. Asks user for input
 * 2. Invokes another command to actually do the extraction.
 *
 */
async function onCodeAction(_, params) {
  if (!params.textDocument.uri.endsWith(".hbs")) {
    return;
  }
  const act = Command.create(
    "Extract selection to component",
    "els.getUserInput",
    {
      placeHolder: "Enter component name",
    },
    "els.extractSourceCodeToComponent",
    {
      source: params.document.getText(params.range),
      range: params.range,
      uri: params.textDocument.uri,
    }
  );
  return [act];

}

async function extractTemplateCodeToComponent(server, filePath, [rawComponentName, { range, source, uri }]) {
  if (!rawComponentName.trim()) {
    console.log("Name of component is required.");
    return;
  }

  try {
    let result = {
      code: source,
      shape: {},
      args: [],
    };
    // let rootRegistry = server.getRegistry(project.root);

    try {
      // const helpers = Object.keys(rootRegistry["helper"]);
      // const components = Object.keys(rootRegistry["component"]);
      // const modifiers = Object.keys(rootRegistry["modifier"]);

      result = transformSelection(
        source,
        // [].concat(helpers, components, modifiers)
      );
    } catch (e) {
      console.log(e.toString());
    }

    let { code, args } = result;

    if (args.length) {
      args = "  " + args.join("\n  ");
      args = `  \n${args} \n`;
    } else {
      args = "";
    }

    const componentName = rawComponentName.trim().split(" ").pop();
    const tagName = normalizeToAngleBracketComponent(componentName);
    const waiter = waitForFileNameContains(componentName);

    // TODO: should there be a confirm step?
    await createEmptyComponent(filePath, rawComponentName);

    try {
      await waiter;
    } catch (e) {
      console.log("unable to find document change event");
    }

    const registry = server.getRegistry(project.root);

    if (!(componentName in registry.component)) {
      console.log(
        `Unable to find component ${componentName} in registry ${JSON.stringify(
          Object.keys(registry.component)
        )}`
      );
      return;
    }

    const componentRegistry = registry["component"][componentName];
    const fileName = componentRegistry.find((file) =>
      file.endsWith(".hbs")
    );

    if (!fileName) {
      console.log(
        `Unable to find template file for component ${componentName}`
      );
      return;
    }

    const fileUri = URI.file(fileName).toString();

    const edit = {
      changes: {
        [uri]: [TextEdit.replace(range, `<${tagName} ${args} />`)],
        [fileUri]: [
          TextEdit.replace(
            Range.create(
              Position.create(0, 0),
              Position.create(0, code.length)
            ),
            code
          ),
        ],
      },
    };

    await server.connection.workspace.applyEdit(edit);
  } catch (e) {
    console.log(e.toString());
  }

}


module.exports = {
  onInit(_, project) {
    project.addWatcher(watcherFn);

    project.executors["els.extractSourceCodeToComponent"] = extractTemplateCodeToComponent;
  },

  onCodeAction,
};

