import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { XIcon, CheckCircle2Icon } from "lucide-react";

export function ExpressInterestModal({
  candidateId,
  candidateName,
  companyProfileId,
  onClose,
}: {
  candidateId: number;
  candidateName: string;
  companyProfileId: number;
  onClose: () => void;
}) {
  const BASE = import.meta.env.BASE_URL;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const mutate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}api/interest-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyProfileId,
          candidateProfileId: candidateId,
          companyNote: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not send interest request.");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interest-requests-by-company", companyProfileId] });
      setSent(true);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {sent ? "Interest sent" : `Express interest in ${candidateName}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-8 text-center space-y-3">
            <CheckCircle2Icon className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-sm text-gray-700">
              Your interest has been sent to {candidateName}. You'll hear back if they'd like to connect.
            </p>
            <Button onClick={onClose} className="rounded-full mt-2">Got it</Button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-3">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder={`Add a short note for ${candidateName} — what role, what you liked about their profile, what makes this opportunity interesting. (optional)`}
                rows={5}
                className="text-sm resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{note.length}/500</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <Button variant="ghost" onClick={onClose} className="rounded-full">Cancel</Button>
              <Button onClick={() => mutate.mutate()} disabled={mutate.isPending} className="rounded-full">
                {mutate.isPending ? "Sending…" : "Send Interest"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
