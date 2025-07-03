import { attr, belongsTo } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class FoodItemModel extends Model {
  @belongsTo('taco-soup', { inverse: 'ingredients', async: true }) soup;
  @attr('string') name;
}
