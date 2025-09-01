'use client';
import { useState } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

interface Addon {
  name: string;
  cost: number;
  unit: string;
}

export function UploadModal({ onClose }: { onClose: () => void }) {
  const [user] = useAuthState(auth);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [addonName, setAddonName] = useState('');
  const [addonCost, setAddonCost] = useState<number>(0);
  const [addonUnit, setAddonUnit] = useState('');
  const [addons, setAddons] = useState<Addon[]>([]);

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

  const handleUpload = async () => {
    if (!user || !file) return alert('Select a file and sign in');
    const storageRef = ref(storage, `videos/${user.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    const validAddons = addons.filter(a => a.name && a.unit && a.cost > 0);

    // ✅ create new doc
    const docRef = await addDoc(collection(db, 'videos'), {
      userId: user.uid,
      title,
      description,
      url,
      serviceCost: cost,
      timeTaken: { hours, minutes },
      addons: validAddons,
      createdAt: Date.now(),
    });

    // ✅ store the document ID inside the doc for easy retrieval
    await updateDoc(doc(db, 'videos', docRef.id), {
      videoId: docRef.id,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-[360px] space-y-4">
        <h2 className="text-xl font-semibold">Upload Service Video / Photo</h2>
        <input
          type="file"
          accept="video/*,image/*"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />

        <input
          className="w-full px-3 py-2 border rounded"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          className="w-full px-3 py-2 border rounded"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <span className="mr-1 font-semibold">KSHS</span>
            <input
              type="number"
              className="w-24 px-2 py-1 border rounded"
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
                inputMode="numeric"
                min={0}
                max={12}
                className="w-16 px-2 py-1 border rounded text-center"
                value={hours}
                onChange={e => setHours(+e.target.value)}
              />
            </label>
            <label className="flex flex-col text-sm">
              Min
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                step={15}
                className="w-16 px-2 py-1 border rounded text-center"
                value={minutes}
                onChange={e => setMinutes(+e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="border rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Add-ons</h3>
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
              className="flex-1 px-2 py-1 border rounded"
              placeholder="Addon name"
              value={addonName}
              onChange={e => setAddonName(e.target.value)}
            />
            <input
              type="number"
              className="w-20 px-2 py-1 border rounded"
              placeholder="Cost"
              value={addonCost}
              onChange={e => setAddonCost(+e.target.value)}
            />
            <input
              type="text"
              className="w-20 px-2 py-1 border rounded"
              placeholder="Unit"
              value={addonUnit}
              onChange={e => setAddonUnit(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleUpload}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Upload
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