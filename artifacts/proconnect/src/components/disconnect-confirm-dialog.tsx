import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { UserMinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface DisconnectConfirmDialogProps {
  open: boolean;
  profileName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DisconnectConfirmDialog({ open, profileName, onConfirm, onCancel }: DisconnectConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/50"
        />
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl",
          )}
        >
          <AlertDialogPrimitive.Title asChild>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <UserMinusIcon className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-base font-semibold text-gray-900">Remove connection?</span>
            </div>
          </AlertDialogPrimitive.Title>

          <AlertDialogPrimitive.Description className="text-sm text-gray-600 leading-relaxed pl-[52px] mb-5">
            {profileName
              ? <>Are you sure you want to disconnect from <span className="font-semibold text-gray-800">{profileName}</span>? They won't be notified.</>
              : "Are you sure you want to remove this connection? They won't be notified."}
          </AlertDialogPrimitive.Description>

          <div className="flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
            >
              Cancel
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={(e) => { e.stopPropagation(); onConfirm(); }}
              className={cn(buttonVariants(), "rounded-full bg-red-600 hover:bg-red-700 text-white")}
            >
              Remove
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
