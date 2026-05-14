type InventoryTransactionInput = {
  id?: number;
  transactionType: string;
  transactionDate: Date | string;
  quantity: number;
  revertedFromId?: number | null;
};

type ProductInventoryInput = {
  currentQty: number;
  transactions: InventoryTransactionInput[];
};

const ADDING_TRANSACTION_TYPES = new Set(['ORDER', 'RESTOCK', 'REVERT_WRITE_OFF']);
const REMOVING_TRANSACTION_TYPES = new Set(['SALE', 'WRITE_OFF']);

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function getInventoryMovement(transaction: InventoryTransactionInput): number {
  if (ADDING_TRANSACTION_TYPES.has(transaction.transactionType)) {
    return transaction.quantity;
  }

  if (REMOVING_TRANSACTION_TYPES.has(transaction.transactionType)) {
    return -transaction.quantity;
  }

  return 0;
}

export function calculateHistoricalInventoryMetrics(
  products: ProductInventoryInput[],
  startDate: Date,
  endDate: Date
) {
  let currentInventory = 0;
  let netMovementSinceStart = 0;
  let unitsAddedInPeriod = 0;
  let inventorySoldInPeriod = 0;
  let unitsWrittenOffInPeriod = 0;
  const writeOffIdsInPeriod = new Set<number>();

  products.forEach((product) => {
    product.transactions.forEach((transaction) => {
      const transactionDate = toDate(transaction.transactionDate);
      const isInPeriod = transactionDate >= startDate && transactionDate <= endDate;

      if (isInPeriod && transaction.transactionType === 'WRITE_OFF' && transaction.id) {
        writeOffIdsInPeriod.add(transaction.id);
      }
    });
  });

  products.forEach((product) => {
    currentInventory += product.currentQty;

    product.transactions.forEach((transaction) => {
      const transactionDate = toDate(transaction.transactionDate);
      const isAfterStart = transactionDate >= startDate;
      const isInPeriod = isAfterStart && transactionDate <= endDate;

      if (isAfterStart) {
        netMovementSinceStart += getInventoryMovement(transaction);
      }

      if (isInPeriod) {
        const isSamePeriodWriteOffRevert =
          transaction.transactionType === 'REVERT_WRITE_OFF' &&
          transaction.revertedFromId != null &&
          writeOffIdsInPeriod.has(transaction.revertedFromId);

        if (
          ADDING_TRANSACTION_TYPES.has(transaction.transactionType) &&
          !isSamePeriodWriteOffRevert
        ) {
          unitsAddedInPeriod += transaction.quantity;
        }

        if (transaction.transactionType === 'SALE') {
          inventorySoldInPeriod += transaction.quantity;
        }

        if (transaction.transactionType === 'WRITE_OFF') {
          unitsWrittenOffInPeriod += transaction.quantity;
        }
      }
    });
  });

  const startingInventory = currentInventory - netMovementSinceStart;
  const availableInventory = startingInventory + unitsAddedInPeriod;
  const sellThroughRate =
    availableInventory > 0 ? (inventorySoldInPeriod / availableInventory) * 100 : 0;

  return {
    currentInventory,
    startingInventory,
    unitsAddedInPeriod,
    availableInventory,
    inventorySoldInPeriod,
    unitsWrittenOffInPeriod,
    sellThroughRate,
  };
}
