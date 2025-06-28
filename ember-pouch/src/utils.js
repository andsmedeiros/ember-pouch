import { getOwner } from '@ember/owner';

//should this take a config?
export function shouldSaveRelationship(container, relationship) {
  if (typeof relationship.options.save === 'boolean') {
    return relationship.options.save;
  }

  if (relationship.kind === 'belongsTo') {return true;}

  //TODO: save default locally? probably on container?
  return configFlagEnabled(container, 'saveHasMany');
}

export function configFlagValue(container, key) {
  const config = getOwner(container).resolveRegistration('config:environment');
  const value = config.emberPouch?.[key];

  if (typeof value === 'boolean') {
    return value;
  }
}

export function configFlagEnabled(container, key) {
  return configFlagValue(container, key) ?? false;
}

export function configFlagDisabled(container, key) {
  const value = configFlagValue(container, key) ?? true;
  return !value;
}
