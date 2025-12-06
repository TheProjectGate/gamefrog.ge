// Импортируем изображения аватаров (WebP format - 89% smaller!)
import spiderMan from '../img/avatars/spider_man-avatar.webp';
import darthVader from '../img/avatars/darth_vader-avatar.webp';
import captainAmerica from '../img/avatars/captain_america-avatar.webp';
import johnWick from '../img/avatars/john_wick-avatar.webp';
import venom from '../img/avatars/venom-avatar.webp';
import lukeSkywalker from '../img/avatars/luke_skywalker-avatar.webp';
import madMax from '../img/avatars/mad_max-avatar.webp';
import hanSolo from '../img/avatars/han_solo-avatar.webp';
import redHulk from '../img/avatars/red_hulk-avatar.webp';
import gollum from '../img/avatars/gollum-avatar.webp';
import v from '../img/avatars/v-avatar.webp';
import rocket from '../img/avatars/rocket-avatar.webp';
import jaws from '../img/avatars/jaws-avatar.webp';
import chubaka from '../img/avatars/chubaka-avatar.webp';
import stormtrooper from '../img/avatars/stormtrooper-avatar.webp';
import johnWinchester from '../img/avatars/john_winchester-avatar.webp';
import breakingBad from '../img/avatars/breaking_bad-avatar.webp';
import aPlagueTale from '../img/avatars/a_plague_tale-avatar.webp';

// Набор аватарок из файлов
export const AVATARS = [
  { id: 0, image: spiderMan, name: 'Spider-Man' },
  { id: 1, image: darthVader, name: 'Darth Vader' },
  { id: 2, image: captainAmerica, name: 'Captain America' },
  { id: 3, image: johnWick, name: 'John Wick' },
  { id: 4, image: venom, name: 'Venom' },
  { id: 5, image: lukeSkywalker, name: 'Luke Skywalker' },
  { id: 6, image: madMax, name: 'Mad Max' },
  { id: 7, image: hanSolo, name: 'Han Solo' },
  { id: 8, image: redHulk, name: 'Red Hulk' },
  { id: 9, image: gollum, name: 'Gollum' },
  { id: 10, image: v, name: 'V' },
  { id: 11, image: rocket, name: 'Rocket' },
  { id: 12, image: jaws, name: 'Jaws' },
  { id: 13, image: chubaka, name: 'Chewbacca' },
  { id: 14, image: stormtrooper, name: 'Stormtrooper' },
  { id: 15, image: johnWinchester, name: 'John Winchester' },
  { id: 16, image: breakingBad, name: 'Breaking Bad' },
  { id: 17, image: aPlagueTale, name: 'A Plague Tale' },
];

export const getAvatar = (id?: number) => {
  if (id === undefined || id === null) return AVATARS[0];
  return AVATARS[id] || AVATARS[0];
};

