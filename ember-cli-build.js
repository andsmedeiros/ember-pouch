'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');
const { maybeEmbroider } = require('@embroider/test-setup');

/**
 * `EMBROIDER_TEST_SETUP_OPTIONS` is set by the Embroider scenarios for `ember-try`:
 * https://github.com/embroider-build/embroider/blob/v0.47.1/packages/test-setup/src/index.ts#L48-L90
 */
const IS_EMBROIDER_ENABLED = Boolean(process.env.EMBROIDER_TEST_SETUP_OPTIONS);

module.exports = function (defaults) {
  let app = new EmberAddon(defaults, {
    emberData: {
      deprecations: {
        DEPRECATE_STORE_EXTENDS_EMBER_OBJECT: false,
      },
    },
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  return maybeEmbroider(app, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],

    packagerOptions: {
      webpackConfig:
        IS_EMBROIDER_ENABLED === false
          ? {}
          : {
              node: {
                global: true,
              },
            },
    },
  });
};
