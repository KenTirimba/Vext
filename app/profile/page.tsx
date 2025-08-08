'use client';

import { useState, useEffect } from 'react';
import { auth, db, storage } from '../../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import LocationPicker from '@/components/LocationPicker';

export default function ProfilePage() {
  const [user] = useAuthState(auth);
  const [isProvider, setIsProvider] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [services, setServices] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [bio, setBio] = useState('');
  const [picFile, setPicFile] = useState<File | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  // Geolocation fields
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [street, setStreet] = useState('');
  const [town, setTown] = useState('');
  const [county, setCounty] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data() as any;
        setUsername(d.username || '');
        setFullName(d.fullName || '');
        setPhone(d.phone || '');
        setEmail(d.email || user.email || '');
        setGender(d.gender || '');
        setLocation(d.location || '');
        setIsProvider(d.isProvider || false);
        setBusinessName(d.businessName || '');
        setServices(d.services || '');
        setOperatingHours(d.operatingHours || '');
        setBio(d.bio || '');
        if (d.profilePhoto) setProfilePhotoUrl(d.profilePhoto);
        if (d.lat && d.lng) {
          setLat(d.lat);
          setLng(d.lng);
          setStreet(d.street || '');
          setTown(d.town || '');
          setCounty(d.county || '');
        }
      }
    })();
  }, [user]);

  const saveChanges = async () => {
    if (!user) return;
    if (!fullName.trim() || !phone) {
      return alert('Full name and phone number are required.');
    }
    if (isProvider && (!businessName || !services || !operatingHours || !bio)) {
      return alert('Please fill in all service provider details.');
    }

    const updates: any = {
      username,
      fullName,
      phone,
      email,
      gender,
      location,
      isProvider,
    };
    if (isProvider) {
      updates.businessName = businessName;
      updates.services = services;
      updates.operatingHours = operatingHours;
      updates.bio = bio;
      if (lat !== null && lng !== null) {
        updates.lat = lat;
        updates.lng = lng;
        updates.street = street;
        updates.town = town;
        updates.county = county;
      }
    }
    if (picFile) {
      const picRef = ref(storage, `profiles/${user.uid}/${picFile.name}`);
      await uploadBytes(picRef, picFile);
      updates.profilePhoto = await getDownloadURL(picRef);
    }
    await updateDoc(doc(db, 'users', user.uid), updates);
    alert('Profile updated');
  };

  if (!user) return <p className="p-6">Please sign in to view this page.</p>;

  return (
    <div className="pt-20 max-w-lg mx-auto p-4 space-y-6 bg-white rounded-lg mt-10 shadow-md">
      <h2 className="text-2xl font-semibold">Profile Settings</h2>

      <div className="flex items-center space-x-4">
        {profilePhotoUrl ? (
          <img src={profilePhotoUrl} alt="profile" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 bg-gray-300 rounded-full" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={e => setPicFile(e.target.files?.[0] || null)}
        />
      </div>

      <label className="block">
        <span>Full Name*:</span>
        <input
          type="text"
          className="mt-1 block w-full border rounded px-3 py-2"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
      </label>

      <label className="block">
        <span>Username:</span>
        <input
          type="text"
          className="mt-1 block w-full border rounded px-3 py-2"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </label>

      <label className="block">
        <span>Phone Number*:</span>
        <PhoneInput
          international
          defaultCountry="KE"
          value={phone}
          onChange={(value) => setPhone(value || '')}
          className="mt-1 block w-full"
          required
        />
      </label>

      <label className="block">
        <span>Email:</span>
        <input
          type="email"
          className="mt-1 block w-full border rounded px-3 py-2"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </label>

      <label className="block">
        <span>Gender:</span>
        <input
          type="text"
          className="mt-1 block w-full border rounded px-3 py-2"
          value={gender}
          onChange={e => setGender(e.target.value)}
        />
      </label>

      <label className="block">
        <span>Location:</span>
        <input
          type="text"
          className="mt-1 block w-full border rounded px-3 py-2"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
      </label>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={isProvider}
          onChange={e => setIsProvider(e.target.checked)}
        />
        <span>I am a service provider</span>
      </label>

      {isProvider && (
        <div className="space-y-4 p-4 border rounded">
          {/* Location Picker */}
          <LocationPicker
            initialLatLng={lat !== null && lng !== null ? { lat, lng } : undefined}
            onLocationSelect={(latVal, lngVal, addr) => {
              setLat(latVal);
              setLng(lngVal);
              setStreet(addr.street || '');
              setTown(addr.town || '');
              setCounty(addr.county || '');
            }}
          />

          <label className="block">
            <span>Street / Building / Floor / Room:</span>
            <input
              type="text"
              className="mt-1 w-full border rounded px-3 py-2"
              value={street}
              onChange={e => setStreet(e.target.value)}
            />
          </label>

          <label className="block">
            <span>Town:</span>
            <input
              type="text"
              className="mt-1 w-full border rounded px-3 py-2"
              value={town}
              onChange={e => setTown(e.target.value)}
            />
          </label>

          <label className="block">
            <span>County / State:</span>
            <input
              type="text"
              className="mt-1 w-full border rounded px-3 py-2"
              value={county}
              onChange={e => setCounty(e.target.value)}
            />
          </label>

          <label className="block">
            <span>Business Name*:</span>
            <input
              type="text"
              className="mt-1 block w-full border rounded px-3 py-2"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span>Services Provided*:</span>
            <input
              type="text"
              className="mt-1 block w-full border rounded px-3 py-2"
              value={services}
              onChange={e => setServices(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span>Operating Hours*:</span>
            <input
              type="text"
              className="mt-1 block w-full border rounded px-3 py-2"
              value={operatingHours}
              onChange={e => setOperatingHours(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span>Business Bio*:</span>
            <textarea
              className="mt-1 block w-full border rounded px-3 py-2"
              value={bio}
              onChange={e => setBio(e.target.value)}
              required
            />
          </label>
        </div>
      )}

      <button
        onClick={saveChanges}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Save Changes
      </button>
    </div>
  );
}