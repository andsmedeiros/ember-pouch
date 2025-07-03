import RESTSerializer from '@ember-data/serializer/rest';

import { shouldSaveRelationship } from '../utils.js';

export default class PouchSerializer extends RESTSerializer {
  #isAttachment(attribute) {
    return ['attachment', 'attachments'].includes(attribute.type);
  }

  extractAttributes(modelClass, resourceHash) {
    const attributes = super.extractAttributes(modelClass, resourceHash);

    for (const key of modelClass.transformedAttributes.keys()) {
      const attribute = modelClass.attributes.get(key);
      if (this.#isAttachment(attribute)) {
        // put the corresponding _attachments entries from the response into the attribute
        for (const fileName of Object.keys(attributes[key])) {
          attributes[key][fileName] = resourceHash.attachments[fileName];
        }
      }
    }

    return attributes;
  }
extractRelationships(modelClass, ...args) {
    const relationships = super.extractRelationships(modelClass, ...args);

    for (const [name, relationship] of modelClass.relationshipsByName) {
      if (
        relationship.kind === 'hasMany' &&
        !shouldSaveRelationship(this, relationship) &&
        !!relationship.options.async
      ) {
        relationships[name] = { links: { related: name } };
      }
    }

    return relationships;
  }
serializeAttribute(snapshot, json, key, attribute) {
    super.serializeAttribute(snapshot, json, key, attribute);

    if (this.#isAttachment(attribute)) {
      const payloadKey =
        this.attrs?.[key]?.key ?? // attrs = { key: { key: "..." } }
        this.attrs?.[key] ?? // attrs = { key: "..." }
        this.keyForAttribute(key, 'serialize');

      // Merge any attachments in this attribute into the `attachments` property.
      // relational-pouch will put these in the special CouchDB `_attachments` property
      // of the document.
      // This will conflict with any 'attachments' attr in the model. Suggest that
      // #toRawDoc in relational-pouch should allow _attachments to be specified
      json.attachments = {
        ...(json.attachments ?? {}),
        ...json[payloadKey],
      };

      const serialized = {};
      for (const fileName of Object.keys(json[payloadKey])) {
        const serializedPayload = { ...json[payloadKey][fileName] };
        delete serializedPayload.data;
        delete serializedPayload.content_type;
        serialized[fileName] = serializedPayload;
      }

      json[payloadKey] = serialized;
    }
  }
shouldSerializeHasMany(snapshot, key, relationship) {
    return shouldSaveRelationship(this, relationship);
  }






}
