import { attr, belongsTo } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class FoodItemModel extends Model {
  @attr('string') name;
  @belongsTo('taco-soup', { inverse: 'ingredients', async: true }) soup;
}
