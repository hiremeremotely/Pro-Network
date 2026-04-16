import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlusIcon, XIcon } from "lucide-react";

interface ConnectModalProps {
  profile: {
    id: number;
    name: string;
    headline?: string | null;
    avatarUrl?: string | null;
  };
  onSend: (message: string) => void;
  onClose: () => void;
}

const MAX_CHARS = 300;

export function ConnectModal({ profile, onSend, onClose }: ConnectModalProps) {
  const [message, setMessage] = useState("");
  const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSend = () => {
    onSend(message.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <Avatar className="w-12 h-12 border border-gray-100 flex-shrink-0">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900">{profile.name}</p>
            {profile.headline && <p className="text-sm text-gray-500 truncate max-w-[240px]">{profile.headline}</p>}
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-800 mb-1">Add a note <span className="text-gray-400 font-normal">(optional)</span></p>
        <p className="text-xs text-gray-400 mb-3">
          People are more likely to accept requests with a personal message.
        </p>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
          placeholder={`Hi ${profile.name.split(" ")[0]}, I'd like to connect with you…`}
          rows={4}
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
        <p className="text-[11px] text-gray-400 text-right mt-1 mb-4">
          {message.length}/{MAX_CHARS}
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 rounded-full gap-1.5" onClick={handleSend}>
            <UserPlusIcon className="w-4 h-4" />
            Send Request
          </Button>
        </div>
      </div>
    </div>
  );
}
