import { MOCK_FRAMES } from './mockFrames';
import type { Frame } from '@/types/admin';
import type { FrameFormData } from '@/lib/validations/admin';

// In-memory store for session-based persistence
let framesStore: Frame[] = [...MOCK_FRAMES.map(f => ({ ...f }))];

// Helper function to generate next Frame ID (4 digits max)
function generateNextFrameId(): string {
  const numericIds = framesStore
    .map(f => parseInt(f.frameId, 10))
    .filter(id => !isNaN(id));

  if (numericIds.length === 0) {
    return '0001';
  }

  const maxId = Math.max(...numericIds);
  const nextId = maxId + 1;

  // Cap at 4 digits (9999 max)
  if (nextId > 9999) {
    throw new Error('Frame ID limit reached (max: 9999)');
  }

  return nextId.toString().padStart(4, '0');
}

export async function mockGetFrame(frameId: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Find frame by ID (case-insensitive)
  const frame = framesStore.find(
    f => f.frameId.toLowerCase() === frameId.toLowerCase()
  );

  if (!frame) {
    throw new Error('Frame not found');
  }

  return frame;
}

export async function mockGetAllFrames(): Promise<Frame[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return [...framesStore];
}

export async function mockAddFrame(data: FrameFormData): Promise<Frame> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const newFrame: Frame = {
    frameId: generateNextFrameId(),
    brand: data.brand,
    model: data.model,
    color: data.color,
    gender: data.gender,
    frameType: data.frameType,
    costPrice: data.costPrice,
    retailPrice: data.retailPrice,
    status: 'Active',
    dateAdded: new Date().toISOString(),
    supplier: data.supplier,
    notes: data.notes || null,
  };

  framesStore.push(newFrame);

  return newFrame;
}

export async function mockUpdateFrame(frameId: string, data: FrameFormData): Promise<Frame> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const frameIndex = framesStore.findIndex(f => f.frameId === frameId);

  if (frameIndex === -1) {
    throw new Error('Frame not found');
  }

  const existingFrame = framesStore[frameIndex];

  const updatedFrame: Frame = {
    ...existingFrame,
    brand: data.brand,
    model: data.model,
    color: data.color,
    gender: data.gender,
    frameType: data.frameType,
    costPrice: data.costPrice,
    retailPrice: data.retailPrice,
    supplier: data.supplier,
    notes: data.notes || null,
  };

  framesStore[frameIndex] = updatedFrame;

  return updatedFrame;
}

export async function mockMarkAsSold(
  frameId: string,
  salePrice?: number,
  saleDate?: string
): Promise<Frame> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const frameIndex = framesStore.findIndex(f => f.frameId === frameId);

  if (frameIndex === -1) {
    throw new Error('Frame not found');
  }

  const frame = framesStore[frameIndex];

  if (frame.status === 'Sold') {
    throw new Error('Frame is already sold');
  }

  const updatedFrame: Frame = {
    ...frame,
    status: 'Sold',
    salePrice: salePrice || frame.retailPrice,
    saleDate: saleDate || new Date().toISOString(),
  };

  framesStore[frameIndex] = updatedFrame;

  return updatedFrame;
}

export async function mockMarkAsDiscontinued(frameId: string): Promise<Frame> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const frameIndex = framesStore.findIndex(f => f.frameId === frameId);

  if (frameIndex === -1) {
    throw new Error('Frame not found');
  }

  const frame = framesStore[frameIndex];

  if (frame.status === 'Sold') {
    throw new Error('Cannot discontinue a sold frame');
  }

  const updatedFrame: Frame = {
    ...frame,
    status: 'Discontinued',
  };

  framesStore[frameIndex] = updatedFrame;

  return updatedFrame;
}

export async function mockSearchFrames(
  query: string,
  status: 'All' | 'Active' | 'Sold' | 'Discontinued' = 'All'
): Promise<Frame[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  let results = [...framesStore];

  // Filter by status
  if (status !== 'All') {
    results = results.filter(f => f.status === status);
  }

  // Search by brand or model (fuzzy match)
  if (query.trim()) {
    const searchTerm = query.toLowerCase().trim();
    results = results.filter(f =>
      f.brand.toLowerCase().includes(searchTerm) ||
      f.model.toLowerCase().includes(searchTerm)
    );
  }

  return results;
}

export async function mockRecordSale(frameId: string, salePrice?: number) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const frame = framesStore.find(f => f.frameId === frameId);

  if (!frame) {
    throw new Error('Frame not found');
  }

  if (frame.status === 'Sold') {
    throw new Error('Frame already sold');
  }

  // Simulate successful sale recording
  const saleId = `SL-${Date.now()}`;

  return {
    saleId,
    frameId: frame.frameId,
    salePrice: salePrice || frame.retailPrice,
    salePriceOverride: salePrice !== undefined && salePrice !== frame.retailPrice,
    saleDate: new Date().toISOString(),
    frame: {
      brand: frame.brand,
      model: frame.model
    }
  };
}
