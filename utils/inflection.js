'use strict';

const { paramCase } = require('change-case');
const path = require('path');

function componentNameToPath(name) {
  return name.split('::') .map(paramCase).join(path.sep);
}

module.exports = {
  componentNameToPath,
};
