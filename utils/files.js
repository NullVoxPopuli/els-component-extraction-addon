'use strict';

const execa = require('execa');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);

const { componentNameToPath } = require('./inflection');

function createEmptyComponent(filePath, name) {
  console.log(filePath, name);

  let componentDestination = path.join(filePath, `${ name }.hbs`);

  return writeFile(componentDestination);
}

module.exports = {
  createEmptyComponent,
};
