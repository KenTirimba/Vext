// app/video/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import VideoFeed from "@/components/VideoFeed"; // your main feed component
import { Video } from "@/types/video";

export default function VideoPage() {
  const { id } = useParams(); // video shortId
  const [video, setVideo] = useState<Video | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;
      const docRef = doc(db, "videos", id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setVideo({ id: docSnap.id, ...docSnap.data() } as Video);
      } else {
        setVideo(null);
      }
    };
    fetchVideo();
  }, [id]);

  if (video === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-500">Video not found</p>
      </div>
    );
  }

  // Instead of showing only this video, render the full feed with this one highlighted
  return (
    <div className="w-full h-full">
      <VideoFeed highlightedVideoId={id as string} />
    </div>
  );
}