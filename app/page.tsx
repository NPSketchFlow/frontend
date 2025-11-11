import Image from "next/image";
import VoiceChatPage from "./voice-chat/page";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto p-4">
                <h1 className="text-center text-3xl font-bold text-gray-800 mb-8">
                    Collaborative Whiteboard
                </h1>
                {/* Whiteboard component */}
                <VoiceChatPage />
            </div>
        </div>
  );
}
