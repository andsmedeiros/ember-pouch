import { getOwner } from '@ember/owner';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

const testSerializedData = {
  'hello.txt': {
    content_type: 'text/plain',
    data: 'aGVsbG8gd29ybGQ=',
    digest: 'md5-7mkg+nM0HN26sZkLN8KVSA==',
    // CouchDB doesn't add 'length'
  },
  'stub.txt': {
    stub: true,
    content_type: 'text/plain',
    digest: 'md5-7mkg+nM0HN26sZkLN8KVSA==',
    length: 11,
  },
};

const testDeserializedData = [
  {
    name: 'hello.txt',
    content_type: 'text/plain',
    data: 'aGVsbG8gd29ybGQ=',
    digest: 'md5-7mkg+nM0HN26sZkLN8KVSA==',
  },
  {
    name: 'stub.txt',
    content_type: 'text/plain',
    stub: true,
    digest: 'md5-7mkg+nM0HN26sZkLN8KVSA==',
    length: 11,
  },
];

module('Unit | Transform | attachments', function (hooks) {
  setupTest(hooks);

  test('it serializes an attachment', function (assert) {
    const transform = getOwner(this).lookup('transform:attachments');
    assert.strictEqual(
      transform.serialize(null),
      null,
      'attachment transform should serialize null into null',
    );
    assert.strictEqual(
      transform.serialize(undefined),
      null,
      'attachment transform should serialize undefined into null',
    );
    assert.deepEqual(
      transform.serialize([]),
      {},
      'attachment transform should serialize empty array into empty object',
    );

    const serializedData = transform.serialize(testDeserializedData);

    const hello = testDeserializedData[0].name;
    assert.strictEqual(
      hello,
      'hello.txt',
      'attachment transform should preserve attached file name',
    );
    assert.strictEqual(
      serializedData[hello].content_type,
      testSerializedData[hello].content_type,
      'attachment transform should preserve attached MIME type',
    );
    assert.strictEqual(
      serializedData[hello].data,
      testSerializedData[hello].data,
      'serialized data does not match what was expected',
    );

    const stub = testDeserializedData[1].name;
    assert.strictEqual(
      stub,
      'stub.txt',
      'attachment transform should preserve attached file name',
    );
    assert.strictEqual(
      serializedData[stub].content_type,
      testSerializedData[stub].content_type,
      'attachment transform should preserve attached file MIME type',
    );
    assert.true(
      serializedData[stub].stub,
      'attachment transform should preserve attachment stub marker',
    );
  });

  test('it deserializes an attachment', function (assert) {
    const transform = getOwner(this).lookup('transform:attachments');
    assert.deepEqual(
      transform.deserialize(null),
      [],
      'attachment transform should deserialize null into empty array',
    );
    assert.deepEqual(
      transform.deserialize(undefined),
      [],
      'attachment transform should deserialize undefined into empty array',
    );

    const deserializedData = transform.deserialize(testSerializedData);

    assert.strictEqual(
      deserializedData[0].name,
      testDeserializedData[0].name,
      'attachment transform should preserve attached file name',
    );
    assert.strictEqual(
      deserializedData[0].content_type,
      testDeserializedData[0].content_type,
      'attachment transform should preserve attached file MIME type',
    );
    assert.strictEqual(
      deserializedData[0].data,
      testDeserializedData[0].data,
      'serialized data does not match what was expected',
    );
    assert.strictEqual(
      deserializedData[0].digest,
      testDeserializedData[0].digest,
      'attachment transform produced an unexpected digest',
    );

    assert.strictEqual(
      deserializedData[1].name,
      testDeserializedData[1].name,
      'attachment transform should preserve attached file name',
    );
    assert.strictEqual(
      deserializedData[1].content_type,
      testDeserializedData[1].content_type,
      'attachment transform should preserve attached file MIME type',
    );
    assert.true(
      deserializedData[1].stub,
      'attachment transform should preserve attachment stub marker',
    );
    assert.strictEqual(
      deserializedData[1].digest,
      testDeserializedData[1].digest,
      'attachment transform produced an unexpected digest',
    );
    assert.strictEqual(
      deserializedData[1].length,
      testDeserializedData[1].length,
      'attachment transform deserialized data with unexpected length',
    );
  });
});
