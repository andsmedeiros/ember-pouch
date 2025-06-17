import { attr, hasMany } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class TacoSaladModel extends Model {
  @attr('string') flavor;
  @hasMany('food-item', { async: true, inverse: null }) ingredients;
}
