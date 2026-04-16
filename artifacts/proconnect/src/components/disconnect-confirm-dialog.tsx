import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserMinusIcon } from "lucide-react";

interface DisconnectConfirmDialogProps {
  open: boolean;
  profileName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DisconnectConfirmDialog({ open, profileName, onConfirm, onCancel }: DisconnectConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={open => { if (!open) onCancel(); }}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <UserMinusIcon className="w-5 h-5 text-red-500" />
            </div>
            <AlertDialogTitle className="text-base">Remove connection?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-gray-600 leading-relaxed pl-[52px]">
            {profileName
              ? <>Are you sure you want to disconnect from <span className="font-semibold text-gray-800">{profileName}</span>? They won't be notified.</>
              : "Are you sure you want to remove this connection? They won't be notified."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel onClick={onCancel} className="rounded-full">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-full bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
