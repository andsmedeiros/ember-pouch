import { attr, hasMany } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class TacoSoupModel extends Model {
  @attr('string') flavor;
  @hasMany('food-item', { inverse: 'soup', async: true }) ingredients;
}
