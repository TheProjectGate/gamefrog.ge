import { AvatarConfig, ChatContext } from '../../types';
import spriteSheetIdle from '../../../chat/animation_img/cratos_iddl.png';
import spriteSheetTalk from '../../../chat/animation_img/cratos_talk.png';
import chatBackground from '../../../chat/animation_img/cratos.svg';

const translateOrFallback = (
  context: ChatContext | undefined,
  key: string,
  fallback: string
) => (context?.translate ? context.translate(key) : fallback);

export const kratosConfig: AvatarConfig = {
  id: 'kratos',
  name: 'kratos',
  displayName: 'Kratos',
  sprites: {
    idle: spriteSheetIdle,
    talk: spriteSheetTalk,
  },
  animations: {
    idle: {
      frameDuration: 900,
      frameColumns: 4,
      frameRows: 4,
      frameCount: 16,
      frameSize: 256,
    },
    talk: {
      frameDuration: 450,
      frameColumns: 4,
      frameRows: 4,
      frameCount: 16,
      frameSize: 256,
    },
  },
  frameCorrections: [
    {
      frameIndex: 11,
      offsetY: 0,
      animationType: 'talk',
    },
    // Коррекция горизонтального смещения отдельных кадров idle (1px влево)
    ...[0, 1, 5, 6, 10, 11, 15].map(frameIndex => ({
      frameIndex,
      offsetX: 0,
      animationType: 'idle' as const,
    })),
  ],
  dialogueRules: [
    {
      patterns: ['привет', 'hi', 'hello', 'hey', 'გამარჯობა'],
      response: (context) =>
        translateOrFallback(
          context,
          'chat.kratos.responses.hello',
          'Hey there! Axe is warmed up. What do you need on GameFrog?'
        ),
      priority: 10,
    },
    {
      patterns: ['скид', 'sale', 'discount', 'ფასდაკლება'],
      response: (context) =>
        translateOrFallback(
          context,
          'chat.kratos.responses.sale',
          'Sales are on fire until midnight! Tap the Sale button up top.'
        ),
      priority: 10,
    },
    {
      patterns: ['игр', 'game', 'games', 'жанр', 'genre', 'platform', 'პლატფორმ', 'თამ'],
      response: (context) =>
        translateOrFallback(
          context,
          'chat.kratos.responses.platform',
          'Tell me a genre or platform and I will curate something from the catalog.'
        ),
      priority: 10,
    },
    {
      patterns: ['подборка', 'bundle', 'ნაკრები'],
      response: (context) =>
        translateOrFallback(
          context,
          'chat.kratos.responses.bundle',
          'Say "bundle" and I will highlight the bundle of the week.'
        ),
      priority: 5,
    },
    {
      patterns: ['админ', 'admin'],
      response: (context) =>
        translateOrFallback(
          context,
          'chat.kratos.responses.admin',
          'Want the admin panel? Tap my head and then hit "Admin" in the header.'
        ),
      priority: 5,
    },
    {
      patterns: [],
      response: (context) => {
        const replyKeys: Array<{ key: string; fallback: string }> = [
          {
            key: 'chat.kratos.responses.followups.ideas',
            fallback: 'Noted. Want me to assemble a set of games for your style?'
          },
          {
            key: 'chat.kratos.responses.followups.sale',
            fallback: 'Head to the Sale section—discounts are stacked right now.'
          },
          {
            key: 'chat.kratos.responses.followups.bundle',
            fallback: 'Need bundles? Say "bundle" and I will highlight the weekly picks.'
          },
          {
            key: 'chat.kratos.responses.followups.wishlist',
            fallback: 'Your wishlist is waiting for new trophies. Don’t stall.'
          },
        ];
        const choice = replyKeys[Math.floor(Math.random() * replyKeys.length)];
        return translateOrFallback(context, choice.key, choice.fallback);
      },
      priority: 1,
    },
  ],
  greeting: 'chat.kratos.greeting',
  backgroundImage: chatBackground,
  avatarScale: 0.9,
};

