import RESTSerializer from '@ember-data/serializer/rest';
import { getOwner } from '@ember/owner';

import { shouldSaveRelationship } from '../utils';

const { keys } = Object;

export default class PouchSerializer extends RESTSerializer {
  shouldSerializeHasMany(snapshot, key, relationship) {
    let result = shouldSaveRelationship(this, relationship);
    return result;
  }

  #isAttachment(attribute) {
    return ['attachment', 'attachments'].includes(attribute.type);
  }

  serializeAttribute(snapshot, json, key, attribute) {
    super.serializeAttribute(snapshot, json, key, attribute);

    if (this.#isAttachment(attribute)) {
      // if provided, use the mapping provided by `attrs` in the serializer
      const modelClass = getOwner(this)
        .lookup('service:store')
        .modelFor(snapshot.modelName);

      let payloadKey = this.attrs?.[key]?.key ?? this.attrs?.[key] ?? key;

      if (payloadKey === key) {
        payloadKey = this.keyForAttribute(key, 'serialize');
      }

      // Merge any attachments in this attribute into the `attachments` property.
      // relational-pouch will put these in the special CouchDB `_attachments` property
      // of the document.
      // This will conflict with any 'attachments' attr in the model. Suggest that
      // #toRawDoc in relational-pouch should allow _attachments to be specified
      json.attachments = {
        ...(json.attachments ?? {}),
        ...json[payloadKey],
      };

      json[payloadKey] = keys(json[payloadKey]).reduce((attr, fileName) => {
        attr[fileName] = { ...json[payloadKey][fileName] };
        delete attr[fileName].data;
        delete attr[fileName].content_type;
        return attr;
      }, {});
    }
  }

  extractAttributes(modelClass, resourceHash) {
    const attributes = super.extractAttributes(modelClass, resourceHash);
    const modelAttrs = modelClass.attributes;

    modelClass.eachTransformedAttribute((key) => {
      const attribute = modelAttrs.get(key);
      if (this.#isAttachment(attribute)) {
        // put the corresponding _attachments entries from the response into the attribute
        const fileNames = keys(attributes[key]);
        fileNames.forEach((fileName) => {
          attributes[key][fileName] = resourceHash.attachments[fileName];
        });
      }
    });

    return attributes;
  }

  extractRelationships(modelClass, ...args) {
    const relationships = super.extractRelationships(modelClass, ...args);

    modelClass.eachRelationship((key, relationshipMeta) => {
      if (
        relationshipMeta.kind === 'hasMany' &&
        !shouldSaveRelationship(this, relationshipMeta) &&
        !!relationshipMeta.options.async
      ) {
        relationships[key] = { links: { related: key } };
      }
    });

    return relationships;
  }
}
