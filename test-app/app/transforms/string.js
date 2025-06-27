import {
  macroCondition,
  dependencySatisfies,
  importSync,
} from '@embroider/macros';

const { StringTransform } = (function () {
  if (macroCondition(dependencySatisfies('ember-data', '<5.3'))) {
    return importSync('@ember-data/serializer/-private');
  } else {
    return importSync('@ember-data/serializer/transform');
  }
})();

export default StringTransform;
