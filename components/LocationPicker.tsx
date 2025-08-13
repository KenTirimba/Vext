'use client';

import { useState } from 'react';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';

export default function LocationPicker({
  initialLatLng,
  onLocationSelect
}: {
  initialLatLng?: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  const libraries = ['places'] as any;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(
    initialLatLng || { lat: -1.286389, lng: 36.817223 } // Default Nairobi
  );

  const handleMapClick = (ev: google.maps.MapMouseEvent) => {
    if (ev.latLng) {
      const lat = ev.latLng.lat();
      const lng = ev.latLng.lng();
      setMarkerPos({ lat, lng });
      onLocationSelect(lat, lng);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarkerPos({ lat, lng });
        onLocationSelect(lat, lng);
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
                onLocationSelect(lat, lng);
              }
            }}
          />
        </GoogleMap>
      </div>

      <p className="text-sm text-gray-600">
        Location link:{" "}
        <a
          href={`https://www.google.com/maps?q=${markerPos.lat},${markerPos.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          View on Google Maps
        </a>
      </p>
    </div>
  );
}