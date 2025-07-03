import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class SmasherModel extends Model {
  @attr debut;
  @attr('string') name;
  @attr('string') series;
}
