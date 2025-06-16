import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';
import PouchDBRelational from 'relational-pouch';

export default PouchDB.plugin(PouchDBFind).plugin(PouchDBRelational);
