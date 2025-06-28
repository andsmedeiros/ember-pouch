import { isNone } from '@ember/utils';
import Transform from '@ember-data/serializer/transform';

export default class AttachmentsTransform extends Transform {
  deserialize(serialized) {
    if (isNone(serialized)) {
      return [];
    }

    return Object.keys(serialized).map((name) => {
      let { content_type, data, stub, length, digest } = serialized[name];
      return { name, content_type, data, stub, length, digest };
    });
  }

  serialize(deserialized) {
    if (!Array.isArray(deserialized)) {
      return null;
    }

    const serialized = {};
    for (const deserializedAttachment of deserialized) {
      const { name, content_type, data, stub, length, digest } =
        deserializedAttachment;

      const attachment = { content_type, length };
      if (stub) {
        attachment.stub = true;
        attachment.digest = digest;
      } else {
        attachment.data = data;
      }

      serialized[name] = attachment;
    }

    return serialized;
  }
}
