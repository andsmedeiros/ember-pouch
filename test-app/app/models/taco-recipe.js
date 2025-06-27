import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class TacoRecipeModel extends Model {
  @attr('attachment') coverImage;
  @attr('attachments') photos;
}
