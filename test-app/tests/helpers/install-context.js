import { getOwner } from '@ember/owner';

export default function installContext(hooks) {
  hooks.beforeEach(function () {
    this.store = function store() {
      return getOwner(this).lookup('service:store');
    };

    this.adapter = function adapter() {
      return this.store().adapterFor('taco-soup');
    };

    this.db = function db() {
      return this.adapter().db;
    };
  });

  hooks.afterEach(async function () {
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
