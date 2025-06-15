import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import moduleForIntegration from '../../helpers/module-for-pouch-acceptance';

module('Integration | Serializer | Attachments', function (hooks) {
  setupTest(hooks);
  moduleForIntegration(hooks);

  let id = 'E';
  let coverImage = {
    name: 'cover.jpg',
    content_type: 'image/jpeg',
    data: window.btoa('cover.jpg'),
    length: 9,
  };
  let photo1 = {
    name: 'photo-1.jpg',
    content_type: 'image/jpeg',
    data: window.btoa('photo-1.jpg'),
  };
  let photo2 = {
    name: 'photo-2.jpg',
    content_type: 'image/jpeg',
    data: window.btoa('photo-2.jpg'),
  };

  test('puts attachments into the `attachments` property when saving', async function (assert) {
    assert.expect(11);

    const newRecipe = this.store().createRecord('taco-recipe', {
      id,
      coverImage,
      photos: [photo1, photo2],
    });
    await newRecipe.save();

    const newDoc = await this.db().get('tacoRecipe_2_E');

    function checkAttachment(attachments, fileName, value, message) {
      delete attachments[fileName].revpos;
      assert.deepEqual(attachments[fileName], value, message);
    }

    checkAttachment(
      newDoc._attachments,
      'cover.jpg',
      {
        digest: 'md5-SxxZx3KOKxy2X2yyCq9c+Q==',
        content_type: 'image/jpeg',
        stub: true,
        length: 9,
      },
      'attachments are placed into the _attachments property of the doc',
    );

    assert.deepEqual(
      Object.keys(newDoc._attachments).sort(),
      [coverImage.name, photo1.name, photo2.name].sort(),
      'all attachments are included in the _attachments property of the doc',
    );

    assert.true(
      'cover_image' in newDoc.data,
      'respects the mapping provided by the serializer `attrs`',
    );

    assert.deepEqual(
      newDoc.data.cover_image,
      { 'cover.jpg': { length: 9 } },
      'the attribute contains the file name',
    );

    assert.strictEqual(
      newDoc.data.cover_image['cover.jpg'].length,
      9,
      'the attribute contains the length to avoid empty length when File objects are saved and have not been reloaded',
    );

    assert.deepEqual(
      newDoc.data.photo_gallery,
      { 'photo-1.jpg': {}, 'photo-2.jpg': {} },
      'photo gallery contains both photos',
    );

    const recordInStore = this.store().peekRecord('tacoRecipe', 'E');
    assert.strictEqual(recordInStore.coverImage.name, coverImage.name);
    assert.strictEqual(recordInStore.coverImage.data, coverImage.data);

    const photosAttr = recordInStore.photos;
    assert.strictEqual(photosAttr.length, 2, '2 photos');
    assert.strictEqual(photosAttr[0].name, photo1.name);
    assert.strictEqual(photosAttr[0].data, photo1.data);
  });
});
