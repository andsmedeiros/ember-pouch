import Model, { attr } from '@ember-data/model';

export default class PouchModel extends Model {
  @attr('string') rev;
}
