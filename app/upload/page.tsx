'use client';

import { useState } from 'react';
import { UploadModal } from '@/components/UploadModal';

export default function UploadPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {isOpen && (
        <UploadModal
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
