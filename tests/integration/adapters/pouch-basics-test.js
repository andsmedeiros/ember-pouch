import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import installContext from '../../helpers/install-context';
import config from 'dummy/config/environment';

function delay(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

function savingHasMany() {
  return config.emberPouch.saveHasMany;
}

function getDocsForRelations() {
  const tacoSoupC = { _id: 'tacoSoup_2_C', data: { flavor: 'al pastor' } };
  if (savingHasMany()) tacoSoupC.data.ingredients = ['X', 'Y'];

  const tacoSoupD = { _id: 'tacoSoup_2_D', data: { flavor: 'black bean' } };
  if (savingHasMany()) tacoSoupD.data.ingredients = ['Z'];

  const foodItemX = {
    _id: 'foodItem_2_X',
    data: { name: 'pineapple', soup: 'C' },
  };
  const foodItemY = {
    _id: 'foodItem_2_Y',
    data: { name: 'pork loin', soup: 'C' },
  };
  const foodItemZ = {
    _id: 'foodItem_2_Z',
    data: { name: 'black beans', soup: 'D' },
  };

  return [tacoSoupC, tacoSoupD, foodItemX, foodItemY, foodItemZ];
}

module('Integration | Adapter | Basic CRUD Ops', function (hooks) {
  setupTest(hooks);
  installContext(hooks);

  function allTests() {
    test('can find all', async function (assert) {
      await this.db().bulkDocs([
        { _id: 'tacoSoup_2_A', data: { flavor: 'al pastor' } },
        { _id: 'tacoSoup_2_B', data: { flavor: 'black bean' } },
        { _id: 'burritoShake_2_X', data: { consistency: 'smooth' } },
      ]);

      const found = await this.store().findAll('taco-soup');

      assert.strictEqual(
        found.length,
        2,
        'should have found the two taco soup items only',
      );
      assert.deepEqual(
        found.map(({ id }) => id),
        ['A', 'B'],
        'should have extracted the IDs correctly',
      );
      assert.deepEqual(
        found.map(({ flavor }) => flavor),
        ['al pastor', 'black bean'],
        'should have extracted the attributes also',
      );
    });

    test('can find one', async function (assert) {
      await this.db().bulkDocs([
        { _id: 'tacoSoup_2_C', data: { flavor: 'al pastor' } },
        { _id: 'tacoSoup_2_D', data: { flavor: 'black bean' } },
      ]);

      const found = await this.store().findRecord('taco-soup', 'D');

      assert.strictEqual(found.id, 'D', 'should have found the requested item');
      assert.deepEqual(
        found.flavor,
        'black bean',
        'should have extracted the attributes also',
      );
    });

    test('can query with sort', async function (assert) {
      await this.db().createIndex({ index: { fields: ['data.name'] } });
      await this.db().bulkDocs([
        {
          _id: 'smasher_2_mario',
          data: { name: 'Mario', series: 'Mario', debut: 1981 },
        },
        {
          _id: 'smasher_2_puff',
          data: { name: 'Jigglypuff', series: 'Pokemon', debut: 1996 },
        },
        {
          _id: 'smasher_2_link',
          data: { name: 'Link', series: 'Zelda', debut: 1986 },
        },
        {
          _id: 'smasher_2_dk',
          data: { name: 'Donkey Kong', series: 'Mario', debut: 1981 },
        },
        {
          _id: 'smasher_2_pika',
          data: { name: 'Pikachu', series: 'Pokemon', debut: 1996 },
        },
      ]);

      const found = await this.store().query('smasher', {
        filter: { name: { $gt: '' } },
        sort: ['name'],
      });

      assert.strictEqual(found.length, 5, 'should returns all the smashers');
      assert.deepEqual(
        found.map(({ id }) => id),
        ['dk', 'puff', 'link', 'mario', 'pika'],
        'should have extracted the IDs correctly',
      );
      assert.deepEqual(
        found.map(({ name }) => name),
        ['Donkey Kong', 'Jigglypuff', 'Link', 'Mario', 'Pikachu'],
        'should have extracted the attributes also',
      );
    });

    test('can query multi-field queries', async function (assert) {
      await this.db().createIndex({
        index: { fields: ['data.series', 'data.debut'] },
      });
      await this.db().bulkDocs([
        {
          _id: 'smasher_2_mario',
          data: { name: 'Mario', series: 'Mario', debut: 1981 },
        },
        {
          _id: 'smasher_2_puff',
          data: { name: 'Jigglypuff', series: 'Pokemon', debut: 1996 },
        },
        {
          _id: 'smasher_2_link',
          data: { name: 'Link', series: 'Zelda', debut: 1986 },
        },
        {
          _id: 'smasher_2_dk',
          data: { name: 'Donkey Kong', series: 'Mario', debut: 1981 },
        },
        {
          _id: 'smasher_2_pika',
          data: { name: 'Pikachu', series: 'Pokemon', debut: 1996 },
        },
      ]);

      const found = await this.store().query('smasher', {
        filter: { series: 'Mario' },
        sort: [{ series: 'desc' }, { debut: 'desc' }],
      });

      assert.strictEqual(found.length, 2, 'should have found the two smashers');
      assert.deepEqual(
        found.map(({ id }) => id),
        ['mario', 'dk'],
        'should have extracted the IDs correctly',
      );
      assert.deepEqual(
        found.map(({ name }) => name),
        ['Mario', 'Donkey Kong'],
        'should have extracted the attributes also',
      );
    });

    test('queryRecord returns null when no record is found', async function (assert) {
      await this.db().createIndex({ index: { fields: ['data.flavor'] } });
      await this.db().bulkDocs([
        {
          _id: 'tacoSoup_2_C',
          data: { flavor: 'al pastor', ingredients: ['X', 'Y'] },
        },
        {
          _id: 'tacoSoup_2_D',
          data: { flavor: 'black bean', ingredients: ['Z'] },
        },
        { _id: 'foodItem_2_X', data: { name: 'pineapple' } },
        { _id: 'foodItem_2_Y', data: { name: 'pork loin' } },
        { _id: 'foodItem_2_Z', data: { name: 'black beans' } },
      ]);

      const found = await this.store().queryRecord('taco-soup', {
        filter: { flavor: 'all pastor' },
      });

      assert.strictEqual(found, null, 'should be null');
    });

    test('can query one record', async function (assert) {
      await this.db().createIndex({ index: { fields: ['data.flavor'] } });
      await this.db().bulkDocs(getDocsForRelations());

      const found = await this.store().queryRecord('taco-soup', {
        filter: { flavor: 'al pastor' },
      });

      assert.strictEqual(
        found.flavor,
        'al pastor',
        'should have found the requested item',
      );
    });

    test('can query one associated records', async function (assert) {
      await this.db().createIndex({ index: { fields: ['data.flavor'] } });
      await this.db().bulkDocs(getDocsForRelations());

      const found = await this.store().queryRecord('taco-soup', {
        filter: { flavor: 'al pastor' },
      });

      assert.strictEqual(
        found.flavor,
        'al pastor',
        'should have found the requested item',
      );

      const foundIngredients = await found.ingredients;
      assert.deepEqual(
        foundIngredients.map((item) => item.id),
        ['X', 'Y'],
        'should have found both associated items',
      );
      assert.deepEqual(
        foundIngredients.map((item) => item.name),
        ['pineapple', 'pork loin'],
        'should have fully loaded the associated items',
      );
    });

    test('can find associated records', async function (assert) {
      await this.db().bulkDocs(getDocsForRelations());

      const found = await this.store().findRecord('taco-soup', 'C');
      assert.strictEqual(found.id, 'C', 'should have found the requested item');

      const foundIngredients = await found.ingredients;
      assert.deepEqual(
        foundIngredients.map((item) => item.id),
        ['X', 'Y'],
        'should have found both associated items',
      );
      assert.deepEqual(
        foundIngredients.map((item) => item.name),
        ['pineapple', 'pork loin'],
        'should have fully loaded the associated items',
      );
    });

    test('create a new record', async function (assert) {
      const newSoup = this.store().createRecord('taco-soup', {
        id: 'E',
        flavor: 'balsamic',
      });
      await newSoup.save();

      const newDoc = await this.db().get('tacoSoup_2_E');
      assert.strictEqual(
        newDoc.data.flavor,
        'balsamic',
        'should have saved the attribute',
      );

      const recordInStore = this.store().peekRecord('taco-soup', 'E');
      assert.strictEqual(
        newDoc._rev,
        recordInStore.rev,
        'should have associated the rev',
      );
    });

    test('creating an associated record stores a reference to it in the parent', async function (assert) {
      const soupDocument = {
        _id: 'tacoSoup_2_C',
        data: { flavor: 'al pastor' },
      };
      if (savingHasMany()) soupDocument.data.ingredients = [];
      await this.db().bulkDocs([soupDocument]);

      const tacoSoup = await this.store().findRecord('taco-soup', 'C');
      const newIngredient = this.store().createRecord('food-item', {
        name: 'pineapple',
        soup: tacoSoup,
      });

      await newIngredient.save();
      if (savingHasMany()) await tacoSoup.save();

      this.store().unloadAll();
      const reloadedTacoSoup = await this.store().findRecord('taco-soup', 'C');
      const foundIngredients = await reloadedTacoSoup.ingredients;

      assert.deepEqual(
        foundIngredients.map((item) => item.name),
        ['pineapple'],
        'should have fully loaded the associated items',
      );
    });

    test('update an existing record', async function (assert) {
      await this.db().bulkDocs([
        { _id: 'tacoSoup_2_C', data: { flavor: 'al pastor' } },
        { _id: 'tacoSoup_2_D', data: { flavor: 'black bean' } },
      ]);

      const found = await this.store().findRecord('taco-soup', 'C');
      found.flavor = 'pork';
      await found.save();

      const updatedDoc = await this.db().get('tacoSoup_2_C');
      assert.strictEqual(
        updatedDoc.data.flavor,
        'pork',
        'should have updated the attribute',
      );

      const recordInStore = this.store().peekRecord('taco-soup', 'C');
      assert.strictEqual(
        updatedDoc._rev,
        recordInStore.rev,
        'should have associated the updated rev',
      );
    });

    test('delete an existing record', async function (assert) {
      await this.db().bulkDocs([
        { _id: 'tacoSoup_2_C', data: { flavor: 'al pastor' } },
        { _id: 'tacoSoup_2_D', data: { flavor: 'black bean' } },
      ]);

      const found = await this.store().findRecord('taco-soup', 'C');
      await found.destroyRecord();

      assert.rejects(
        this.db().get('tacoSoup_2_C'),
        ({ status }) => status === 404,
        'document should no longer exist',
      );
    });
  }

  function asyncTests() {
    test('eventually consistency - success', async function (assert) {
      assert.timeout(1000);

      await this.db().bulkDocs([
        { _id: 'foodItem_2_X', data: { name: 'pineapple', soup: 'C' } },
      ]);

      const foodItem = await this.store().findRecord('food-item', 'X');

      let loaded = false;

      // This will insert the related record into the store after some time.
      // The relationship promise below should only be resolved when the
      // document is inserted, which occurs after the promise is awaited
      delay(10)
        .then(() =>
          this.db().bulkDocs([
            { _id: 'tacoSoup_2_C', data: { flavor: 'test' } },
          ]),
        )
        .then(() => (loaded = true));

      assert.false(loaded, 'The record should not have been loaded yet');

      // This awaits the relationship promise that will only be resolved when
      // the related record is loaded into the store
      const soup = await foodItem.soup;

      assert.true(loaded, 'The record should have been loaded by now');
      assert.strictEqual(soup.id, 'C');
      assert.strictEqual(soup.flavor, 'test');
    });

    test('eventually consistency - deleted', async function (assert) {
      assert.timeout(1000);

      await this.db().bulkDocs([
        { _id: 'foodItem_2_X', data: { name: 'pineapple', soup: 'C' } },
      ]);

      const foodItem = await this.store().findRecord('food-item', 'X');

      let loaded = false;

      delay(10)
        .then(() =>
          this.db().bulkDocs([{ _id: 'tacoSoup_2_C', _deleted: true }]),
        )
        .then(() => (loaded = true));
      assert.false(loaded, 'The record should not have been loaded yet');

      // If the record is deleted, the promise is expected to reject
      await assert.rejects(foodItem.soup, /deleted/);
      assert.true(loaded, 'The record should have been loaded by now');
    });

    test('prepare should work', async function (assert) {
      const db = this.db();
      assert.strictEqual(db.rel, undefined, 'should start without schema');

      const adapter = this.adapter();
      await adapter.prepare(this.store(), this.store().modelFor('taco-soup'));

      assert.notEqual(db.rel, undefined, 'prepare should set schema');
      assert.strictEqual(
        adapter.schema.length,
        2,
        'should have set all relationships on the schema',
      );

      await adapter.prepare(this.store(), this.store().modelFor('taco-soup'));
    });

    test('delete cascade null', async function (assert) {
      await this.db().bulkDocs(getDocsForRelations());
      const found = await this.store().findRecord('taco-soup', 'D');
      await found.destroyRecord();

      this.store().unloadAll();
      const foodItem = await this.store().findRecord('food-item', 'Z');

      assert.strictEqual(
        foodItem.belongsTo('soup').value(),
        null,
        'should set value of belongsTo to null',
      );
    });

    test('remote delete removes belongsTo relationship', async function (assert) {
      await this.db().bulkDocs(getDocsForRelations());
      const foodItemZ = await this.store().findRecord('food-item', 'Z');
      const soup = await foodItemZ.soup;

      const id = 'tacoSoup_2_' + soup.id;
      const promise = this.adapter().waitForChangeWithID(id);
      this.db().remove(id, soup.rev);
      await promise;

      const reloadedFoodItem = await this.store().findRecord('food-item', 'Z');

      assert.strictEqual(
        reloadedFoodItem.belongsTo('soup').value(),
        null,
        'should set value of belongsTo to null',
      );

      assert.strictEqual(
        await reloadedFoodItem.soup,
        null,
        'deleted soup should have cascaded to a null value',
      );
    });

    test('remote delete removes hasMany relationship', async function (assert) {
      await this.db().bulkDocs(getDocsForRelations());
      const tacoSoup = await this.store().findRecord('taco-soup', 'C');
      const liveIngredients = await tacoSoup.ingredients;

      assert.strictEqual(
        liveIngredients.length,
        2,
        'should be 2 food items initially',
      );

      const itemToDelete = liveIngredients[0];
      const id = `foodItem_2_${itemToDelete.id}`;
      const promise = this.adapter().waitForChangeWithID(id);
      this.db().remove(id, itemToDelete.rev);
      await promise;

      const reloadedSoup = await this.store().findRecord('taco-soup', 'C');
      const updatedIngredients = await reloadedSoup.ingredients;

      assert.strictEqual(
        updatedIngredients.length,
        1,
        '1 food item should be removed from the relationship',
      );
      assert.strictEqual(
        liveIngredients.length,
        1,
        '1 food item should be removed from the live relationship',
      );
    });

    module(
      'not eventually consistent',
      {
        beforeEach() {
          config.emberPouch.eventuallyConsistent = false;
        },
        afterEach() {
          config.emberPouch.eventuallyConsistent = true;
        },
      },
      function () {
        test('not found', async function (assert) {
          await assert.rejects(
            this.store().findRecord('food-item', 'non-existent'),
            /not found/,
          );
        });
      },
    );
  }

  let syncAsync = function () {
    module(
      'async',
      {
        beforeEach() {
          config.emberPouch.async = true;
        },
      },
      function () {
        allTests();
        asyncTests();
      },
    );
    module(
      'sync',
      {
        beforeEach() {
          config.emberPouch.async = false;
        },
      },
      allTests,
    );
  };

  module(
    'dont save hasMany',
    {
      beforeEach() {
        config.emberPouch.saveHasMany = false;
      },
    },
    syncAsync,
  );

  module(
    'save hasMany',
    {
      beforeEach() {
        config.emberPouch.saveHasMany = true;
      },
    },
    syncAsync,
  );
});
