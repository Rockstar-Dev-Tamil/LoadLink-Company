import type { PostgisPoint } from '../types/database.types';

type NominatimResult = {
  lat: string;
  lon: string;
};

export const geocodingService = {
  async geocodeAddress(address: string): Promise<PostgisPoint> {
    const params = new URLSearchParams({
      q: address,
      format: 'jsonv2',
      limit: '1',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      throw new Error('Address lookup failed. Please try again.');
    }

    const results = (await response.json()) as NominatimResult[];
    const top = results[0];

    if (!top) {
      throw new Error(`No coordinates found for "${address}".`);
    }

    return {
      type: 'Point',
      coordinates: [Number(top.lon), Number(top.lat)],
    };
  },

  formatToWKT(lng: number, lat: number): string {
    return `SRID=4326;POINT(${lng} ${lat})`;
  }
};
