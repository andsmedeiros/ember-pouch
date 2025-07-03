import { attr, hasMany } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class TacoSaladModel extends Model {
  @hasMany('food-item', { async: true, inverse: null }) ingredients;
  @attr('string') flavor;
}
