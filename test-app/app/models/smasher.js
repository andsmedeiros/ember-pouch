import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class SmasherModel extends Model {
  @attr('string') name;
  @attr('string') series;
  @attr debut;
}
