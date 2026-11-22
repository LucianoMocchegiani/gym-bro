import { PublicPlatformController } from './public-platform.controller';

describe('PublicPlatformController', () => {
  it('omits packs hidden from the landing without changing visible packs', async () => {
    const controller = new PublicPlatformController(
      {
        listPublicPlatformPacks: jest
          .fn()
          .mockResolvedValue([{ id: 'visible' }, { id: 'hidden' }]),
      } as never,
      {
        visiblePlatformPackIds: jest
          .fn()
          .mockResolvedValue(new Set(['visible'])),
      } as never,
    );

    await expect(controller.listPacks()).resolves.toEqual([{ id: 'visible' }]);
  });
});
