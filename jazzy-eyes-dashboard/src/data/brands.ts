export const BRANDS = [
  {
    name: 'Cartier',
    weight: 12,
    priceRange: [800, 1500],
    models: ['Santos', 'Panthère', 'Trinity', 'Love', 'Ballon Bleu'],
  },
  {
    name: 'Tom Ford',
    weight: 12,
    priceRange: [450, 950],
    models: ['Jennifer', 'Whitney', 'Henry', 'Anoushka', 'Cateye'],
  },
  {
    name: 'Oliver Peoples',
    weight: 11,
    priceRange: [400, 800],
    models: ['Gregory Peck', 'OV5186', 'Finley', 'Sheldrake', 'Cary Grant'],
  },
  {
    name: 'Lindberg',
    weight: 10,
    priceRange: [600, 1200],
    models: ['Strip', 'Rim', 'Air Titanium', 'Spirit', 'Precious'],
  },
  {
    name: 'Mykita',
    weight: 9,
    priceRange: [500, 900],
    models: ['Lite', 'Studio', 'Mylon', 'Decades', 'Custom'],
  },
  {
    name: 'Garrett Leight',
    weight: 10,
    priceRange: [350, 650],
    models: ['Kinney', 'Brooks', 'Hampton', 'Wilson', 'Thornton'],
  },
  {
    name: 'Jacques Marie Mage',
    weight: 8,
    priceRange: [700, 1400],
    models: ['Dealan', 'Molino', 'Zephirin', 'Enzo', 'Torino'],
  },
  {
    name: 'Moscot',
    weight: 9,
    priceRange: [300, 550],
    models: ['Lemtosh', 'Miltzen', 'Zolman', 'Yukel', 'Nebb'],
  },
  {
    name: 'Persol',
    weight: 10,
    priceRange: [350, 600],
    models: ['649', '714', '3007V', '3166V', '3152V'],
  },
  {
    name: 'Ray-Ban',
    weight: 9,
    priceRange: [300, 500],
    models: ['Wayfarer', 'Aviator', 'Clubmaster', 'Round', 'Erika'],
  },
];

export const COLORS = [
  'Black',
  'Tortoise',
  'Gold',
  'Silver',
  'Blue',
  'Green',
  'Brown',
  'Pink',
  'Clear',
  'Red',
  'Gray',
  'Havana',
];

export const FRAME_TYPES: ('Optical' | 'Sunglasses')[] = ['Optical', 'Sunglasses'];
export const GENDERS: ('Men' | 'Women' | 'Unisex')[] = ['Men', 'Women', 'Unisex'];

export function getRandomBrand() {
  const totalWeight = BRANDS.reduce((sum, brand) => sum + brand.weight, 0);
  let random = Math.random() * totalWeight;

  for (const brand of BRANDS) {
    random -= brand.weight;
    if (random <= 0) return brand;
  }

  return BRANDS[0];
}

export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
