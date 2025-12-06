import { Product, FilterConfig, FilterGroup } from '../types';
import ps5Image from '../img/ps5.png';
import xboxSeriesXImage from '../img/xbox-series-x.png';
import switchOledImage from '../img/switch-oled.png';
import needForSpeedHotPursuitImage from '../img/xbox-one/need for speed hot pursued remaster.png';
import noMansSkyImage from '../img/xbox-one/no man\'s sky.png';
import overwatchImage from '../img/xbox-one/overwatch.png';
import pawPatrolMightyPupsImage from '../img/xbox-one/paw patrol mighty pups.png';
import pes2015Image from '../img/xbox-one/pes 2015.png';
import pubgImage from '../img/xbox-one/playerunkowns battlegrounds.png';
import preyImage from '../img/xbox-one/prey.png';
import projectSparkImage from '../img/xbox-one/project spark.png';
import quantumBreakImage from '../img/xbox-one/quantum break.png';
import residentEvil4Image from '../img/xbox-one/resident evil 4.png';
import residentEvil7Image from '../img/xbox-one/resident evil 7.png';
import ryseSonOfRomeImage from '../img/xbox-one/ryse son of rome.png';
import segaMegaDriveClassicImage from '../img/xbox-one/sega megadrive clssic.png';
import titanfall2Image from '../img/xbox-one/titan fall 2.png';
import titanfallImage from '../img/xbox-one/titan fall.png';
import rainbowSixSiegeImage from '../img/xbox-one/tom clancys rainbows x siedge.png';
import ghostReconImage from '../img/xbox-one/tomclamsys ghost recon.png';
import diablo3UltimateEvilImage from '../img/xbox-one/ultimate evil edition diablo 3 reaper of souls.png';
import assassinsCreedSyndicateImage from '../img/ps4/assassin\'s creed syndicate.png';
import assassinsCreedEzioCollectionImage from '../img/ps4/assassins creed the ezio collection.png';
import assassinsCreedOdysseyImage from '../img/ps4/assassins screed odyssey.png';
import batmanArkhamKnightImage from '../img/ps4/batman arkham knight.png';
import batmanReturnToArkhamImage from '../img/ps4/batman return to srkhsme.png';
import battlebornImage from '../img/ps4/battleborn.png';
import battlefield1Image from '../img/ps4/battlefild 1.png';
import battlefield5Image from '../img/ps4/battlefild 5.png';
import battlefront2Image from '../img/ps4/battlefront 2.png';
import bioshockCollectionImage from '../img/ps4/bioshok the collection.png';
import borderlands3Image from '../img/ps4/borderlands 3.png';
import codBlackOps4Image from '../img/ps4/cod black ops 4.png';
import codRemasterImage from '../img/ps4/cod remaster.png';
import crashBandicootTrilogyImage from '../img/ps4/crash bandicoot n same trylogy.png';

export const INITIAL_PLATFORM_CONFIG: FilterConfig = {
  'PlayStation': { 
    color: 'bg-[#0047AB]', 
    textColor: 'text-white', 
    symbol: 'P',
    children: {
      'PlayStation 1': { color: 'bg-[#3156C3]', textColor: 'text-white', symbol: 'P1' },
      'PlayStation 2': { color: 'bg-[#3156C3]', textColor: 'text-white', symbol: 'P2' },
      'PlayStation 3': { color: 'bg-[#3156C3]', textColor: 'text-white', symbol: 'P3' },
      'PlayStation 4': { color: 'bg-[#3156C3]', textColor: 'text-white', symbol: 'P4' },
      'PlayStation 5': { color: 'bg-[#3156C3]', textColor: 'text-white', symbol: 'P5' },
    }
  },
  'Xbox': { 
    color: 'bg-[#107C10]', 
    textColor: 'text-white', 
    symbol: 'X',
    children: {
      'Xbox Classic': { color: 'bg-[#1E8E1E]', textColor: 'text-white', symbol: 'X1' },
      'Xbox 360': { color: 'bg-[#1E8E1E]', textColor: 'text-white', symbol: '360' },
      'Xbox One': { color: 'bg-[#1E8E1E]', textColor: 'text-white', symbol: 'ONE' },
      'Xbox Series': { color: 'bg-[#1E8E1E]', textColor: 'text-white', symbol: 'XS' },
    }
  },
  'Nintendo': { 
    color: 'bg-[#E60012]', 
    textColor: 'text-white', 
    symbol: 'N',
    children: {
      'NES': { color: 'bg-[#FF4B5C]', textColor: 'text-white', symbol: 'NES' },
      'SNES': { color: 'bg-[#FF4B5C]', textColor: 'text-white', symbol: 'SNES' },
      'Nintendo 64': { color: 'bg-[#FF4B5C]', textColor: 'text-white', symbol: 'N64' },
      'GameCube': { color: 'bg-[#FF4B5C]', textColor: 'text-white', symbol: 'GC' },
      'Wii / Wii U': { color: 'bg-[#FF4B5C]', textColor: 'text-white', symbol: 'Wii' },
      'Switch': { color: 'bg-[#FF4B5C]', textColor: 'text-white', symbol: 'SW' },
    }
  },
  'PC': { 
    color: 'bg-black', 
    textColor: 'text-white', 
    symbol: 'PC',
    children: {
      'Desktop': { color: 'bg-gray-800', textColor: 'text-white', symbol: 'DT' },
      'Laptop': { color: 'bg-gray-800', textColor: 'text-white', symbol: 'LT' },
      'VR Ready': { color: 'bg-gray-800', textColor: 'text-white', symbol: 'VR' },
    }
  },
};

export const INITIAL_GENRE_CONFIG: FilterConfig = {
  'Consoles': { color: 'bg-yellow-400', textColor: 'text-black', symbol: 'CON', iconName: 'Gamepad2' },
  'RPG': { color: 'bg-purple-600', textColor: 'text-white', symbol: 'RPG', iconName: 'Sword' },
  'Action-Adventure': { color: 'bg-orange-500', textColor: 'text-white', symbol: 'ADV', iconName: 'Compass' },
  'Sci-Fi': { color: 'bg-sky-500', textColor: 'text-white', symbol: 'SCI', iconName: 'Rocket' },
  'Platformer': { color: 'bg-green-500', textColor: 'text-white', symbol: 'PLT', iconName: 'Zap' },
  'Merch': { color: 'bg-pink-500', textColor: 'text-white', symbol: 'MCH', iconName: 'ShoppingBag' },
  'Shooter': { color: 'bg-red-600', textColor: 'text-white', symbol: 'SHR', iconName: 'Target' },
  'Racing': { color: 'bg-blue-600', textColor: 'text-white', symbol: 'RAC', iconName: 'Car' },
  'Sports': { color: 'bg-emerald-600', textColor: 'text-white', symbol: 'SPT', iconName: 'Trophy' },
};

export const INITIAL_FILTER_GROUPS: FilterGroup[] = [
  { id: 'genre', label: 'Genres', items: INITIAL_GENRE_CONFIG },
  { id: 'platform', label: 'Platforms', items: INITIAL_PLATFORM_CONFIG },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "PlayStation 5",
    price: 499.99,
    description: "Experience lightning-fast loading with an ultra-high speed SSD, deeper immersion with support for haptic feedback, adaptive triggers and 3D Audio, and an all-new generation of incredible PlayStation games.",
    imageUrl: ps5Image,
    genre: "Consoles",
    condition: "new",
    stock: 25,
    tags: ["bestseller"],
    platforms: ["PlayStation"],
    goldCoins: 50,
    coinExclusive: true,
    coinPrice: 1200
  },
  {
    id: 2,
    name: "Xbox Series X",
    price: 499.99,
    description: "The fastest, most powerful Xbox ever. Explore rich new worlds with 12 teraflops of raw graphic processing power, DirectX ray tracing, a custom SSD, and 4K gaming.",
    imageUrl: xboxSeriesXImage,
    genre: "Consoles",
    condition: "new",
    stock: 15,
    tags: ["bestseller"],
    platforms: ["Xbox"],
    goldCoins: 50,
    coinExclusive: true,
    coinPrice: 1200
  },
  {
    id: 3,
    name: "Nintendo Switch - OLED",
    price: 349.99,
    description: "Feast your eyes on a vibrant 7-inch OLED screen. Play at home on the TV or on-the-go with a versatile console that transforms to suit your gaming lifestyle.",
    imageUrl: switchOledImage,
    genre: "Consoles",
    condition: "new",
    stock: 40,
    tags: ["bestseller"],
    platforms: ["Nintendo"]
  },
  {
    id: 4,
    name: 'Need for Speed Hot Pursuit Remastered',
    price: 39.99,
    description: 'Outrun rivals and the law in high-speed chases rebuilt for modern hardware with cross-platform Autolog.',
    imageUrl: needForSpeedHotPursuitImage,
    genre: 'Racing',
    condition: 'new',
    stock: 64,
    tags: ['sale'],
    platforms: ['Xbox One'],
    goldCoins: 8
  },
  {
    id: 5,
    name: "No Man's Sky",
    price: 49.99,
    description: 'Chart an infinite procedural universe, build bases across the stars, and explore with friends after years of free updates.',
    imageUrl: noMansSkyImage,
    genre: 'Sci-Fi',
    condition: 'new',
    stock: 120,
    tags: ['bestseller', 'new'],
    platforms: ['Xbox One'],
    goldCoins: 12
  },
  {
    id: 6,
    name: 'Overwatch Legendary Edition',
    price: 29.99,
    description: 'Pick your hero and jump into 6v6 objective-based action with seasonal events and cross-play hero rosters.',
    imageUrl: overwatchImage,
    genre: 'Shooter',
    condition: 'new',
    stock: 150,
    tags: ['bestseller'],
    platforms: ['Xbox One'],
    goldCoins: 10
  },
  {
    id: 7,
    name: 'Paw Patrol Mighty Pups: Save Adventure Bay',
    price: 24.99,
    description: 'Team up with the pups, unleash mighty powers, and rescue Adventure Bay in a co-op friendly platformer.',
    imageUrl: pawPatrolMightyPupsImage,
    genre: 'Platformer',
    condition: 'new',
    stock: 80,
    tags: ['new'],
    platforms: ['Xbox One'],
    goldCoins: 6
  },
  {
    id: 8,
    name: 'PES 2015',
    price: 14.99,
    description: 'Classic Konami football with responsive dribbling and tactical depth for retro season replays.',
    imageUrl: pes2015Image,
    genre: 'Sports',
    condition: 'used',
    stock: 55,
    tags: ['retro'],
    platforms: ['Xbox One'],
    goldCoins: 4
  },
  {
    id: 9,
    name: "PLAYERUNKNOWN'S Battlegrounds",
    price: 19.99,
    description: 'Drop in solo or squad up and battle to be the last team standing across iconic battlegrounds.',
    imageUrl: pubgImage,
    genre: 'Shooter',
    condition: 'new',
    stock: 140,
    tags: ['sale'],
    platforms: ['Xbox One'],
    goldCoins: 7
  },
  {
    id: 10,
    name: 'Prey',
    price: 19.99,
    description: "Awaken aboard Talos I and use mind-bending powers to fight an alien threat in Arkane's immersive sim.",
    imageUrl: preyImage,
    genre: 'Sci-Fi',
    condition: 'new',
    stock: 70,
    tags: ['sale'],
    platforms: ['Xbox One']
  },
  {
    id: 11,
    name: 'Project Spark Starter Pack',
    price: 9.99,
    description: 'Create, play, and share your own games with an accessible toolset and community templates.',
    imageUrl: projectSparkImage,
    genre: 'Platformer',
    condition: 'used',
    stock: 40,
    tags: ['retro'],
    platforms: ['Xbox One']
  },
  {
    id: 12,
    name: 'Quantum Break',
    price: 29.99,
    description: 'Manipulate time to survive cinematic shootouts tied directly into a live-action thriller.',
    imageUrl: quantumBreakImage,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 65,
    tags: ['sale'],
    platforms: ['Xbox One']
  },
  {
    id: 13,
    name: 'Resident Evil 4',
    price: 39.99,
    description: "Relive Leon's fight through rural Europe with improved controls and modern visuals.",
    imageUrl: residentEvil4Image,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 90,
    tags: ['bestseller'],
    platforms: ['Xbox One'],
    goldCoins: 9
  },
  {
    id: 14,
    name: 'Resident Evil 7: Biohazard',
    price: 29.99,
    description: 'Enter the Baker plantation in a first-person survival-horror reinvention of the series.',
    imageUrl: residentEvil7Image,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 85,
    tags: ['sale'],
    platforms: ['Xbox One']
  },
  {
    id: 15,
    name: 'Ryse: Son of Rome',
    price: 24.99,
    description: 'Lead the Roman Legion through brutal cinematic combat across a revenge-fueled campaign.',
    imageUrl: ryseSonOfRomeImage,
    genre: 'Action-Adventure',
    condition: 'used',
    stock: 60,
    tags: ['retro'],
    platforms: ['Xbox One']
  },
  {
    id: 16,
    name: 'SEGA Mega Drive Classics',
    price: 34.99,
    description: 'Over 50 16-bit era hits with rewind, mirror modes, and online multiplayer lobbies.',
    imageUrl: segaMegaDriveClassicImage,
    genre: 'Consoles',
    condition: 'new',
    stock: 75,
    tags: ['retro', 'sale'],
    platforms: ['Xbox One']
  },
  {
    id: 17,
    name: 'Titanfall 2',
    price: 24.99,
    description: "Fast, fluid pilot combat pairs with hulking titans in Respawn's acclaimed campaign and multiplayer.",
    imageUrl: titanfall2Image,
    genre: 'Sci-Fi',
    condition: 'new',
    stock: 110,
    tags: ['bestseller'],
    platforms: ['Xbox One']
  },
  {
    id: 18,
    name: 'Titanfall',
    price: 14.99,
    description: 'The original parkour-meets-mechs shooter that kicked off the modern Respawn legacy.',
    imageUrl: titanfallImage,
    genre: 'Sci-Fi',
    condition: 'used',
    stock: 70,
    tags: ['retro'],
    platforms: ['Xbox One']
  },
  {
    id: 19,
    name: "Tom Clancy's Rainbow Six Siege",
    price: 19.99,
    description: 'Tactical 5v5 sieges where destruction is part of the strategy and every operator brings unique gadgets.',
    imageUrl: rainbowSixSiegeImage,
    genre: 'Shooter',
    condition: 'new',
    stock: 160,
    tags: ['bestseller', 'sale'],
    platforms: ['Xbox One']
  },
  {
    id: 20,
    name: "Tom Clancy's Ghost Recon",
    price: 24.99,
    description: 'Lead an elite squad across massive open-world operations with drop-in co-op support.',
    imageUrl: ghostReconImage,
    genre: 'Shooter',
    condition: 'new',
    stock: 95,
    tags: ['sale'],
    platforms: ['Xbox One']
  },
  {
    id: 21,
    name: 'Diablo III: Reaper of Souls – Ultimate Evil Edition',
    price: 39.99,
    description: 'Slay through the Eternal Conflict with all expansions, Adventure Mode, and couch co-op ready loot.',
    imageUrl: diablo3UltimateEvilImage,
    genre: 'RPG',
    condition: 'new',
    stock: 130,
    tags: ['bestseller'],
    platforms: ['Xbox One'],
    goldCoins: 14
  },
  {
    id: 22,
    name: "Assassin's Creed Syndicate",
    price: 29.99,
    description: 'Take to the streets of Victorian London in this action-adventure where you play as twin assassins fighting to liberate the city.',
    imageUrl: assassinsCreedSyndicateImage,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 85,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 8
  },
  {
    id: 23,
    name: "Assassin's Creed: The Ezio Collection",
    price: 34.99,
    description: 'Relive the legendary journey of Ezio Auditore with remastered versions of Assassin\'s Creed II, Brotherhood, and Revelations.',
    imageUrl: assassinsCreedEzioCollectionImage,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 70,
    tags: ['bestseller', 'sale'],
    platforms: ['PlayStation 4'],
    goldCoins: 10
  },
  {
    id: 24,
    name: "Assassin's Creed Odyssey",
    price: 39.99,
    description: 'Embark on an epic odyssey through ancient Greece in this massive open-world RPG adventure.',
    imageUrl: assassinsCreedOdysseyImage,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 95,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 12
  },
  {
    id: 25,
    name: 'Batman: Arkham Knight',
    price: 24.99,
    description: 'The epic conclusion to the Arkham trilogy. Drive the Batmobile and face the ultimate threat to Gotham City.',
    imageUrl: batmanArkhamKnightImage,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 110,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 7
  },
  {
    id: 26,
    name: 'Batman: Return to Arkham',
    price: 29.99,
    description: 'Remastered collection featuring Batman: Arkham Asylum and Batman: Arkham City with enhanced graphics.',
    imageUrl: batmanReturnToArkhamImage,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 75,
    tags: ['sale'],
    platforms: ['PlayStation 4'],
    goldCoins: 9
  },
  {
    id: 27,
    name: 'Battleborn',
    price: 14.99,
    description: 'Hero shooter with a story campaign and competitive multiplayer modes featuring unique characters.',
    imageUrl: battlebornImage,
    genre: 'Shooter',
    condition: 'used',
    stock: 45,
    tags: ['retro'],
    platforms: ['PlayStation 4'],
    goldCoins: 5
  },
  {
    id: 28,
    name: 'Battlefield 1',
    price: 19.99,
    description: 'Experience the Great War through dynamic multiplayer battles and an emotional single-player campaign.',
    imageUrl: battlefield1Image,
    genre: 'Shooter',
    condition: 'new',
    stock: 120,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 6
  },
  {
    id: 29,
    name: 'Battlefield V',
    price: 24.99,
    description: 'Return to World War II in this immersive shooter with massive multiplayer battles and a war stories campaign.',
    imageUrl: battlefield5Image,
    genre: 'Shooter',
    condition: 'new',
    stock: 100,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 8
  },
  {
    id: 30,
    name: 'Star Wars Battlefront II',
    price: 19.99,
    description: 'Fight across iconic Star Wars locations in this action-packed shooter with heroes, vehicles, and epic space battles.',
    imageUrl: battlefront2Image,
    genre: 'Shooter',
    condition: 'new',
    stock: 130,
    tags: ['sale'],
    platforms: ['PlayStation 4'],
    goldCoins: 7
  },
  {
    id: 31,
    name: 'BioShock: The Collection',
    price: 34.99,
    description: 'Remastered collection of all three BioShock games with enhanced visuals and all DLC included.',
    imageUrl: bioshockCollectionImage,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 80,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 11
  },
  {
    id: 32,
    name: 'Borderlands 3',
    price: 39.99,
    description: 'The ultimate looter-shooter returns with billions of guns, new worlds to explore, and mayhem-filled action.',
    imageUrl: borderlands3Image,
    genre: 'Shooter',
    condition: 'new',
    stock: 105,
    tags: ['bestseller', 'new'],
    platforms: ['PlayStation 4'],
    goldCoins: 13
  },
  {
    id: 33,
    name: 'Call of Duty: Black Ops 4',
    price: 29.99,
    description: 'Multiplayer-focused Call of Duty with Blackout battle royale mode and Zombies experience.',
    imageUrl: codBlackOps4Image,
    genre: 'Shooter',
    condition: 'new',
    stock: 140,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 10
  },
  {
    id: 34,
    name: 'Call of Duty: Modern Warfare Remastered',
    price: 24.99,
    description: 'Remastered version of the classic Modern Warfare with enhanced graphics and all original content.',
    imageUrl: codRemasterImage,
    genre: 'Shooter',
    condition: 'new',
    stock: 90,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 8
  },
  {
    id: 35,
    name: 'Crash Bandicoot N. Sane Trilogy',
    price: 34.99,
    description: 'Remastered collection of the first three Crash Bandicoot games with updated graphics and gameplay.',
    imageUrl: crashBandicootTrilogyImage,
    genre: 'Platformer',
    condition: 'new',
    stock: 115,
    tags: ['bestseller'],
    platforms: ['PlayStation 4'],
    goldCoins: 11
  },
  {
    id: 36,
    name: "Assassin's Creed Legacy Bundle",
    price: 79.99,
    description: 'Trilogy pack featuring Syndicate, The Ezio Collection, and Odyssey with a combined savings for stealth fans.',
    imageUrl: assassinsCreedOdysseyImage,
    genre: 'Action-Adventure',
    condition: 'new',
    stock: 30,
    tags: ['bundle', 'bestseller'],
    platforms: ['PlayStation 4'],
    bundleItems: [22, 23, 24],
    goldCoins: 20
  },
  {
    id: 37,
    name: 'Xbox Sci-Fi Strike Pack',
    price: 74.99,
    description: 'Bundle the galaxy-spanning adventures of No Man’s Sky, Prey, and Titanfall 2 for less.',
    imageUrl: titanfall2Image,
    genre: 'Sci-Fi',
    condition: 'new',
    stock: 35,
    tags: ['bundle', 'sale'],
    platforms: ['Xbox One'],
    bundleItems: [5, 10, 17],
    goldCoins: 18
  },
  {
    id: 38,
    name: 'Squad Shooter Starter Kit',
    price: 54.99,
    description: 'Team-based action trio: Overwatch Legendary Edition, Rainbow Six Siege, and Ghost Recon.',
    imageUrl: overwatchImage,
    genre: 'Shooter',
    condition: 'new',
    stock: 40,
    tags: ['bundle', 'bestseller'],
    platforms: ['Xbox One'],
    bundleItems: [6, 19, 20],
    goldCoins: 15
  }
];

export const SALE_ENDS_AT = '2025-12-31T23:59:59Z';
