import { assert } from '@ember/debug';
import { registerDestructor } from '@ember/destroyable';
import { getOwner } from '@ember/owner';
import { classify } from '@ember/string';
import { isBlank, isNone, isPresent } from '@ember/utils';
import RESTAdapter from '@ember-data/adapter/rest';
import { pluralize } from 'ember-inflector';

import { configFlagDisabled,shouldSaveRelationship } from '../utils.js';

function defer() {
  let settlers;
  const promise = new Promise((resolve, reject) => {
    settlers = { resolve, reject };
  });

  return { promise, ...settlers };
}

export default class PouchAdapter extends RESTAdapter {
  #createdRecords = new Set();
  #knownModels = new Set();
  #onChangeListener = (change) => this.onChange(change);
  #schema = [];
  #waitingForConsistency = new Map();

  get schema() {
    return this.#schema;
  }

  constructor(owner, db) {
    super(owner);
    this.db = db;

    this.#startChangesToStoreListener();
    registerDestructor(this, () => this.#stopChangesListener());
  }

  /**
   * Returns the modified selector key to comform data key
   * Ex: selector: {name: 'Mario'} wil become selector: {'data.name': 'Mario'}
   */
  #buildSelector(selector) {
    assert(
      'Data selector should be a non-null object',
      typeof selector === 'object' && isPresent(selector),
    );

    const entries = Object.entries(selector).map(([key, property]) => [
      this.#dataKey(key),
      property,
    ]);
    return Object.fromEntries(entries);
  }

  /**
   * Returns the modified sort key
   * Ex: sort: ['series'] will become ['data.series']
   * Ex: sort: [{series: 'desc'}] will become [{'data.series': 'desc'}]
   */
  #buildSort(sort) {
    return sort.map((directive) => {
      assert(
        'Sort directive should be a string or a non-null object',
        typeof directive === 'string' ||
          (typeof directive === 'object' && isPresent(directive)),
      );

      if (typeof directive === 'string') {
        return this.#dataKey(directive);
      } else {
        const entries = Object.entries(directive).map(([key, property]) => [
          this.#dataKey(key),
          property,
        ]);
        return Object.fromEntries(entries);
      }
    });
  }
  /**
   * Return key that conform to data adapter
   * ex: 'name' become 'data.name'
   */
  #dataKey(key) {
    return `data.${key}`;
  }

  async #eventuallyConsistent(type, id) {
    const deleted = await this.db.rel.isDeleted(type, id);
    switch (deleted) {
      case true:
        throw new Error(
          `Document of type "${type}" with id "${id}" is deleted.`,
        );

      case false:
        return this.#findRecord(type, id);

      // Relational Pouch reports deleted === null when the record is not
      // in the database yet
      case null: {
        const uniqueId = this.db.rel.makeDocID({ type, id });
        const deferred = defer();
        this.#waitingForConsistency.set(uniqueId, deferred);
        return deferred.promise;
      }
    }
  }

  async #findRecord(recordTypeName, id) {
    const pouchDocument = await this.db.rel.find(recordTypeName, id);

    if (isPresent(pouchDocument)) {
      const recordTypeNamePlural = pluralize(recordTypeName);
      const results =
        pouchDocument[recordTypeName] ?? pouchDocument[recordTypeNamePlural];
      if (isPresent(results)) {
        return pouchDocument;
      }
    }

    if (configFlagDisabled(this, 'eventuallyConsistent')) {
      throw new Error(
        `Document of type "${recordTypeName}" with id "${id}" not found.`,
      );
    } else {
      return await this.#eventuallyConsistent(recordTypeName, id);
    }
  }

  #recordToData(store, type, record) {
    const serializer = store.serializerFor(type.modelName);
    const serializerKey = serializer.payloadKeyFromModelName(type.modelName);
    const serializedHash = {};
    serializer.serializeIntoHash(serializedHash, type, record, {
      includeId: true,
    });

    return serializedHash[serializerKey];
  }

  async #saveRecord(store, type, record) {
    await this.prepare(store, type);

    const data = this.#recordToData(store, type, record);
    const typeName = this.getRecordTypeName(type);
    const idAndRev = await this.db.rel.save(typeName, data);
    Object.assign(data, idAndRev);
    this.#createdRecords.add(data.id);

    const typeNamePlural = pluralize(typeName);
    return {
      [typeNamePlural]: [data],
    };
  }

  #startChangesToStoreListener() {
    assert(
      'Attempted to set a PouchDB change listener, but the adapter is already listening for changes',
      isNone(this.changes),
    );

    this.changes = this.db.changes({
      since: 'now',
      live: true,
      returnDocs: false,
    });
    this.changes.addListener('change', this.#onChangeListener);
  }

  #stopChangesListener() {
    assert(
      'Attempted to clear PouchDB change listener, but it was not set',
      isPresent(this.changes),
    );

    this.changes.removeListener('change', this.#onChangeListener);
    this.changes.cancel();
  }

  changeDb(db) {
    this.#stopChangesListener();

    for (const { singular } of this.schema) {
      this.store.unloadAll(singular);
    }

    this.db = db;
    this.#startChangesToStoreListener();
  }

  async createRecord(store, type, record) {
    return await this.#saveRecord(store, type, record);
  }

  async deleteRecord(store, type, record) {
    if (record.adapterOptions && record.adapterOptions.serverPush) {return;}

    await this.prepare(store, type);
    const data = this.#recordToData(store, type, record);
    await this.db.rel.del(this.getRecordTypeName(type), data);
  }

  async findAll(store, type /*, sinceToken */) {
    // TODO: use sinceToken
    await this.prepare(store, type);
    return this.db.rel.find(this.getRecordTypeName(type));
  }

  async findHasMany(store, record, link, rel) {
    const model = store.modelFor(record.modelName);
    await this.prepare(store, model);

    const inverseRelationship = model.inverseFor(rel.key, store);
    if (inverseRelationship?.kind === 'belongsTo') {
      return await this.db.rel.findHasMany(
        rel.type,
        inverseRelationship.name,
        record.id,
      );
    } else {
      return { [pluralize(rel.type)]: [] };
    }
  }

  async findMany(store, type, ids) {
    await this.prepare(store, type);
    return this.db.rel.find(this.getRecordTypeName(type), ids);
  }

  async findRecord(store, type, id) {
    await this.prepare(store, type);
    return await this.#findRecord(this.getRecordTypeName(type), id);
  }

  /**
   * Returns the string to use for the model name part of the PouchDB document
   * ID for records of the given ember-data type.
   *
   * Historically, this method used the camelized version of the model name in
   * order to preserve data compatibility with older versions of ember-pouch
   * (pouchdb-community/ember-pouch#63).
   * However, this has been deprecated since EmberData 5.3 and planned for
   * removal at EmberData 6.0 and now, instead, model names should always
   * be in kebab-case.
   *
   * To remove deprecation notes from EmberData, we now return `modelName` as
   * is, so a model `my-model` will have a PouchDB `_id` equal to
   * `my-model_${REV}_${ID}`.
   *
   * You can override this to change the behavior. If you do, be aware that you
   * need to execute a data migration to ensure that any existing records are
   * moved to the new IDs.
   */
  getRecordTypeName(type) {
    return type.modelName;
  }

  async onChange(change) {
    // If relational_pouch isn't prepared yet, there can't be any records
    // in the store to update.
    if (isNone(this.db.rel)) {
      return;
    }

    const obj = this.db.rel.parseDocID(change.id);

    // skip changes for non-relational_pouch docs. E.g., design docs.
    if (isNone(obj.type) || isBlank(obj.id)) {
      return;
    }

    if (this.#waitingForConsistency.has(change.id)) {
      const promise = this.#waitingForConsistency.get(change.id);
      this.#waitingForConsistency.delete(change.id);

      if (change.deleted) {
        promise.reject(
          new Error(
            `Document of type "${obj.type}" with id "${obj.id}" is deleted.`,
          ),
        );
      } else {
        const record = await this.#findRecord(obj.type, obj.id);
        promise.resolve(record);
      }
      return;
    }

    try {
      this.store.modelFor(obj.type);
    } catch {
      // The record refers to a model which this version of the application
      // does not have.
      return;
    }

    const recordInStore = this.store.peekRecord(obj.type, obj.id);
    if (isNone(recordInStore)) {
      // The record hasn't been loaded into the store; no need to reload its data.
      if (this.#createdRecords.has(obj.id)) {
        this.#createdRecords.delete(obj.id);
      } else {
        this.unloadedDocumentChanged(obj);
      }

      return;
    }

    if (
      recordInStore.rev === change.changes[0].rev ||
      recordInStore.hasDirtyAttributes
    ) {
      // The record either hasn't loaded yet or has unpersisted local changes.
      // In either case, we don't want to refresh it in the store
      // (and for some substates, attempting to do so will result in an error).
      // We also ignore the change if we already have the latest revision
      return;
    }

    if (change.deleted) {
      // What should we do when the record is saving?
      if (!recordInStore.isSaving && !recordInStore.isDeleted) {
        await recordInStore.destroyRecord({
          adapterOptions: { serverPush: true },
        });
      }
    } else {
      await recordInStore.reload();
    }
  }

  // The change listener ensures that individual records are kept up to date
  // when the data in the database changes. This makes ember-data 2.0's record
  async prepare(store, type) {
    const recordTypeName = this.getRecordTypeName(type);
    const modelName = classify(recordTypeName);

    assert(
      `Please add a "rev" attribute of type "string" on "${modelName}" ` +
        `model or make it inherit directly from "PouchModel"`,
      type.attributes.has('rev'),
    );

    const singular = recordTypeName;
    const plural = pluralize(recordTypeName);

    // Known, no need to register again
    if (this.#knownModels.has(singular)) {
      return;
    }
    this.#knownModels.add(singular);

    // Unknown model; register it!
    const modelSchema = { singular, plural };
    if (isPresent(type.documentType)) {
      modelSchema.documentType = type.documentType;
    }
    this.#schema.push(modelSchema);

    for (const [name, relationship] of type.relationshipsByName) {
      assert(
        'Only "belongsTo" and "hasMany" relationships are supported',
        ['belongsTo', 'hasMany'].includes(relationship.kind),
      );

      const relatedModel = store.modelFor(relationship.type);
      assert(
        `Relationship "${name}" of "${modelName}" references ` +
          `model "${relationship.type}" unknown to the store`,
        isPresent(relatedModel),
      );

      const config = getOwner(this).resolveRegistration('config:environment');

      const relationshipOptions = { ...(relationship.options ?? {}) };
      let includeRelatedModel = true;

      // Attempts to get async flag from relationship options.
      // If it was not specified, uses the `emberPouch.async` environment config.
      // It that is also not available, defaults to true.
      relationshipOptions.async ??= config.emberPouch?.async ?? true;

      if (
        relationship.kind === 'hasMany' &&
        !shouldSaveRelationship(this, relationship)
      ) {
        const inverseRelationship = type.inverseFor(relationship.key, store);
        assert(
          `Relationship "${name}" of model "${modelName}" specified ` +
            `"saveHasMany: true", but its inverse could not be determined."`,
          isPresent(inverseRelationship),
        );

        if (inverseRelationship.kind === 'belongsTo') {
          await this.db.createIndex({
            index: { fields: [`data.${inverseRelationship.name}`, '_id'] },
          });
          if (relationshipOptions.async) {
            includeRelatedModel = false;
          } else {
            relationshipOptions.queryInverse = inverseRelationship.name;
          }
        }
      }

      if (includeRelatedModel) {
        const relationshipSchema = {
          [relationship.kind]: {
            type: this.getRecordTypeName(relatedModel),
            options: relationshipOptions,
          },
        };
        modelSchema.relations ??= {};
        modelSchema.relations[relationship.key] = relationshipSchema;
      }

      await this.prepare(store, relatedModel);
    }

    this.db.setSchema(this.#schema);
  }

  async query(store, type, query) {
    await this.prepare(store, type);

    const queryParams = {
      selector: this.#buildSelector(query.filter),
    };

    if (isPresent(query.sort)) {
      queryParams.sort = this.#buildSort(query.sort);
    }

    if (isPresent(query.limit)) {
      queryParams.limit = query.limit;
    }

    if (isPresent(query.skip)) {
      queryParams.skip = query.skip;
    }

    const pouchDocument = await this.db.find(queryParams);
    return this.db.rel.parseRelDocs(
      this.getRecordTypeName(type),
      pouchDocument.docs,
    );
  }

  async queryRecord(store, type, query) {
    const results = await this.query(store, type, query);
    const recordTypeName = this.getRecordTypeName(type);
    const recordTypeNamePlural = pluralize(recordTypeName);

    results[recordTypeName] = results[recordTypeNamePlural][0] ?? null;
    delete results[recordTypeNamePlural];
    return results;
  }

  // reloading redundant.
  shouldBackgroundReloadRecord() {
    return false;
  }

  unloadedDocumentChanged(_document) {
    /*
     * For performance purposes, we don't load records into the store that haven't previously been loaded.
     * If you want to change this, subclass this method, and push the data into the store. e.g.
     *
     *  const recordTypeName = this.getRecordTypeName(this.store.modelFor(obj.type));
     *  const doc = await this.db.rel.find(recordTypeName, obj.id);
     *  this.store.pushPayload(recordTypeName, doc);
     */
  }

  async updateRecord(store, type, record) {
    return await this.#saveRecord(store, type, record);
  }
}
