import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';

import installContext from '../../helpers/install-context';

/*
 * Tests for the default automatic change listener.
 */

function delay(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

module('Integration | Adapter | Default Change Watcher', function (hooks) {
  setupTest(hooks);
  installContext(hooks);

  hooks.beforeEach(function () {
    return this.db().bulkDocs([
      {
        _id: 'taco-soup_2_A',
        data: { flavor: 'al pastor', ingredients: ['X', 'Y'] },
      },
      {
        _id: 'taco-soup_2_B',
        data: { flavor: 'black bean', ingredients: ['Z'] },
      },
      { _id: 'food-item_2_X', data: { name: 'pineapple', soup: 'A' } },
      { _id: 'food-item_2_Y', data: { name: 'pork loin', soup: 'A' } },
      { _id: 'food-item_2_Z', data: { name: 'black beans', soup: 'B' } },
    ]);
  });

  test('a loaded instance automatically reflects directly-made database changes', async function (assert) {
    const soupB = await this.store().findRecord('taco-soup', 'B');
    assert.strictEqual(
      soupB.flavor,
      'black bean',
      'the loaded instance should reflect the initial test data',
    );

    const soupBRecord = await this.db().get('taco-soup_2_B');
    soupBRecord.data.flavor = 'carnitas';
    await this.db().put(soupBRecord);

    await delay(10);

    const alreadyLoadedSoupB = this.store().peekRecord('taco-soup', 'B');
    assert.strictEqual(
      alreadyLoadedSoupB.flavor,
      'carnitas',
      'the loaded instance should automatically reflect the change in the database',
    );
  });

  test('a record that is not loaded stays not loaded when it is changed', async function (assert) {
    assert.strictEqual(
      this.store().peekRecord('taco-soup', 'A'),
      null,
      'test setup: record should not be loaded already',
    );

    const soupARecord = await this.db().get('taco-soup_2_A');
    soupARecord.data.flavor = 'barbacoa';
    await this.db().put(soupARecord);

    await delay(10);

    assert.strictEqual(
      this.store().peekRecord('taco-soup', 'A'),
      null,
      'the corresponding instance should still not be loaded',
    );
  });

  test('a new record is not automatically loaded', async function (assert) {
    assert.strictEqual(
      this.store().peekRecord('taco-soup', 'C'),
      null,
      'test setup: record should not be loaded already',
    );

    await this.db().put({
      _id: 'taco-soup_2_C',
      data: { flavor: 'sofritas' },
    });

    await delay(10);

    assert.strictEqual(
      this.store().peekRecord('taco-soup', 'C'),
      null,
      'the corresponding instance should still not be loaded',
    );
  });

  test('a deleted record is automatically marked deleted', async function (assert) {
    const soupB = await this.store().findRecord('taco-soup', 'B');
    assert.strictEqual(
      soupB.flavor,
      'black bean',
      'the loaded instance should reflect the initial test data',
    );

    const soupBRecord = await this.db().get('taco-soup_2_B');
    await this.db().remove(soupBRecord);

    await delay(10);

    assert.true(
      soupB.isDeleted,
      'the corresponding instance should now be deleted',
    );
  });

  test('a change to a record with a non-relational-pouch ID does not cause an error', async function (assert) {
    let success = false;

    try {
      await this.store().findRecord('taco-soup', 'B');
      await this.db().put({
        _id: '_design/ingredient-use',
      });

      success = true;
    } finally {
      assert.true(success, 'no error should have occurred');
    }
  });

  test('a change to a record of an unknown type does not cause an error', async function (assert) {
    let success = false;

    try {
      await this.store().findRecord('taco-soup', 'B');
      await this.db().put({
        _id: 'burrito-shake_2_X',
        data: { consistency: 'chunky' },
      });

      success = true;
    } finally {
      assert.true(success, 'no error should have occurred');
    }
  });
});

module(
  'Integration | Adapter | With unloadedDocumentChanged implementation to load new docs into store',
  function (hooks) {
    setupTest(hooks);
    installContext(hooks);

    hooks.beforeEach(async function () {
      // This replaces database and adapter previously instantiated in
      // `module-for-pouch-acceptance` with new ones bound to
      // `taco-salad` model.
      // This is OK, but we should do this in another way, probably.
      await this.db().destroy();

      this.adapter = function adapter() {
        return this.store().adapterFor('taco-salad');
      };
      this.db = function db() {
        return this.adapter().db;
      };

      await this.db().bulkDocs([
        {
          _id: 'taco-salad_2_A',
          data: { flavor: 'al pastor', ingredients: ['X', 'Y'] },
        },
        {
          _id: 'taco-salad_2_B',
          data: { flavor: 'black bean', ingredients: ['Z'] },
        },
        { _id: 'food-item_2_X', data: { name: 'pineapple' } },
        { _id: 'food-item_2_Y', data: { name: 'pork loin' } },
        { _id: 'food-item_2_Z', data: { name: 'black beans' } },
      ]);
    });

    test('a new record is automatically loaded', async function (assert) {
      const soupB = await this.store().findRecord('taco-salad', 'B');
      assert.strictEqual(
        soupB.flavor,
        'black bean',
        'the loaded instance should reflect the initial test data',
      );

      assert.strictEqual(
        this.store().peekRecord('taco-salad', 'C'),
        null,
        'test setup: record should not be loaded already',
      );

      await this.db().put({
        _id: 'taco-salad_2_C',
        data: { flavor: 'sofritas' },
      });

      await delay(10);

      const alreadyLoadedSaladC = this.store().peekRecord('taco-salad', 'C');
      assert.ok(
        alreadyLoadedSaladC,
        'the corresponding instance should now be loaded',
      );
      assert.strictEqual(
        alreadyLoadedSaladC.flavor,
        'sofritas',
        'the corresponding instance should now be loaded with the right data',
      );
    });
  },
);
