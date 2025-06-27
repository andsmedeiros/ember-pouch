import ApplicationSerializer from './application';

export default class TacoRecipeSerializer extends ApplicationSerializer {
  attrs = {
    coverImage: 'cover_image',
    photos: { key: 'photo_gallery' },
  };
}
