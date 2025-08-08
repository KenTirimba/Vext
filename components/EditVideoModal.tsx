'use client';

import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface Addon {
  name: string;
  cost: number;
  unit: string;
}

export function EditVideoModal({
  video,
  onClose,
  onSaved
}: {
  video: any;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState(video.title || '');
  const [description, setDescription] = useState(video.description || '');
  const [cost, setCost] = useState(video.serviceCost || 0);
  const [hours, setHours] = useState(video.timeTaken?.hours || 0);
  const [minutes, setMinutes] = useState(video.timeTaken?.minutes || 0);
  const [addons, setAddons] = useState<Addon[]>(video.addons || []);
  const [addonName, setAddonName] = useState('');
  const [addonCost, setAddonCost] = useState(0);
  const [addonUnit, setAddonUnit] = useState('');

  const handleAddAddon = () => {
    const trimmedName = addonName.trim();
    const trimmedUnit = addonUnit.trim();
    if (trimmedName && trimmedUnit && addonCost > 0) {
      setAddons(prev => [...prev, { name: trimmedName, cost: addonCost, unit: trimmedUnit }]);
      setAddonName('');
      setAddonCost(0);
      setAddonUnit('');
    }
  };

  const handleSave = async () => {
    const validAddons = addons.filter(a => a.name && a.unit && a.cost > 0);

    await updateDoc(doc(db, 'videos', video.id), {
      title,
      description,
      serviceCost: cost,
      timeTaken: { hours, minutes },
      addons: validAddons,
    });

    onClose();
    onSaved?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="bg-white text-black p-6 rounded-lg w-[360px] space-y-4">
        <h2 className="text-xl font-semibold">Edit Service Details</h2>

        <input
          className="w-full px-3 py-2 border rounded text-black"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          className="w-full px-3 py-2 border rounded text-black"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <span className="mr-1 font-semibold">KSHS</span>
            <input
              type="number"
              className="w-24 px-2 py-1 border rounded text-black"
              value={cost}
              onChange={e => setCost(+e.target.value)}
              placeholder="Price"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex flex-col text-sm">
              Hrs
              <input
                type="number"
                min={0}
                max={12}
                className="w-16 px-2 py-1 border rounded text-black text-center"
                value={hours}
                onChange={e => setHours(+e.target.value)}
              />
            </label>
            <label className="flex flex-col text-sm">
              Min
              <input
                type="number"
                min={0}
                max={59}
                step={15}
                className="w-16 px-2 py-1 border rounded text-black text-center"
                value={minutes}
                onChange={e => setMinutes(+e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="border rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Add‑ons</h3>
            <button
              onClick={handleAddAddon}
              className="text-blue-600 font-bold text-xl leading-none"
            >
              ➕
            </button>
          </div>

          {addons.map((a, idx) => (
            <div key={idx} className="flex justify-between mb-1">
              <span className="flex-1">{a.name}</span>
              <span className="w-20 text-right">{a.cost.toFixed(0)}</span>
              <span className="ml-1">/ {a.unit}</span>
            </div>
          ))}

          <div className="flex space-x-2 mt-2">
            <input
              type="text"
              className="flex-1 px-2 py-1 border rounded text-black"
              placeholder="Addon name"
              value={addonName}
              onChange={e => setAddonName(e.target.value)}
            />
            <input
              type="number"
              className="w-20 px-2 py-1 border rounded text-black"
              placeholder="Cost"
              value={addonCost}
              onChange={e => setAddonCost(+e.target.value)}
            />
            <input
              type="text"
              className="w-20 px-2 py-1 border rounded text-black"
              placeholder="Unit"
              value={addonUnit}
              onChange={e => setAddonUnit(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-200 text-black rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}