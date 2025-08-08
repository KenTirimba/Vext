'use client';

import { useState, useEffect } from 'react';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

export default function LocationPicker({
  initialLatLng,
  onLocationSelect,
  initialAddress = {}
}: {
  initialLatLng?: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number, address: { street?: string; town?: string; county?: string }) => void;
  initialAddress?: { street?: string; town?: string; county?: string };
}) {
  const libraries = ['places'] as any;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(
    initialLatLng || { lat: -1.286389, lng: 36.817223 } // Default: Nairobi
  );

  const [address, setAddress] = useState(initialAddress);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: ['ke'] },
    },
    debounce: 300,
    cache: 86400,
  });

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    const results = await getGeocode({ address: description });
    const { lat, lng } = await getLatLng(results[0]);

    setMarkerPos({ lat, lng });

    const components = results[0].address_components;
    const street = components.find(c => c.types.includes('route'))?.long_name;
    const town = components.find(c => c.types.includes('locality') || c.types.includes('postal_town'))?.long_name;
    const county = components.find(c => c.types.includes('administrative_area_level_2'))?.long_name;

    const addr = { street, town, county };
    setAddress(addr);
    onLocationSelect(lat, lng, addr);
  };

  const handleMapClick = (ev: google.maps.MapMouseEvent) => {
    if (ev.latLng) {
      const lat = ev.latLng.lat();
      const lng = ev.latLng.lng();
      setMarkerPos({ lat, lng });
      onLocationSelect(lat, lng, address);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarkerPos({ lat, lng });
        onLocationSelect(lat, lng, address);
      },
      () => alert('Unable to fetch location')
    );
  };

  if (loadError) return <p>Error loading map</p>;
  if (!isLoaded) return <p>Loading map…</p>;

  return (
    <div className="space-y-2">
      <button onClick={useCurrentLocation} className="text-blue-600 underline">
        Use current device location
      </button>

      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Search address"
        className="w-full border rounded px-2 py-1"
      />
      {status === 'OK' && (
        <div className="border rounded bg-white max-h-40 overflow-auto">
          {data.map(s => (
            <div
              key={s.place_id}
              onClick={() => handleSelect(s.description)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {s.description}
            </div>
          ))}
        </div>
      )}

      <div style={{ height: '300px', width: '100%' }}>
        <GoogleMap
          center={markerPos}
          zoom={15}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
        >
          <Marker
            position={markerPos}
            draggable
            onDragEnd={e => {
              if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                setMarkerPos({ lat, lng });
                onLocationSelect(lat, lng, address);
              }
            }}
          />
        </GoogleMap>
      </div>
    </div>
  );
}