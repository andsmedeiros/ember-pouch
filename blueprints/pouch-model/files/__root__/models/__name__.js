import { Model } from 'ember-pouch';
<%= importedModules.length ? `import { ${importedModules} } from '@ember-data/model';` : '' %>

export default class <%= classifiedModuleName %>Model extends Model {
  <%= attrs.length ? attrs : '' %>
}
