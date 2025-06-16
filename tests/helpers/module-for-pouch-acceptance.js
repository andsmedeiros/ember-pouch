import { getOwner } from '@ember/owner';

export default function (hooks) {
  hooks.beforeEach(function () {
    this.store = function store() {
      return getOwner(this).lookup('service:store');
    };

    // At the container level, adapters are not singletons (ember-data
    // manages them). To get the instance that the app is using, we have to
    // go through the store.
    this.adapter = function adapter() {
      return this.store().adapterFor('taco-soup');
    };

    this.db = function db() {
      return this.adapter().db;
    };
  });

  hooks.afterEach(async function () {
    await Promise.all(this.adapter().indexPromises);
    const db = this.db();

    const { indexes } = await db.getIndexes();
    for (const index of indexes) {
      if (index.ddoc) {
        await db.deleteIndex(index);
      }
    }

    await db.destroy();
  });
}
