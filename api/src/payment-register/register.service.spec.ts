import { attachProductSalesToLedger } from './register.service';
import type { LedgerMovementRow } from '../payment/ledger-row';

const rows = [
  {
    items: [
      {
        id: 'product-item',
        kind: 'PACK',
        title: 'Pack',
        productQuantity: null,
      },
      { id: 'pack-item', kind: 'PACK', title: 'Pack', productQuantity: null },
    ],
  },
] as unknown as LedgerMovementRow[];

describe('attachProductSalesToLedger', () => {
  it('labels matching product lines and leaves other lines unchanged', () => {
    expect(
      attachProductSalesToLedger(rows, [
        {
          transaction_item_id: 'product-item',
          name: 'Botella',
          quantity: 3,
        },
      ])[0]?.items,
    ).toEqual([
      expect.objectContaining({
        id: 'product-item',
        kind: 'PRODUCT',
        title: 'Botella',
        productQuantity: 3,
      }),
      expect.objectContaining({
        id: 'pack-item',
        kind: 'PACK',
        title: 'Pack',
      }),
    ]);
  });
});
