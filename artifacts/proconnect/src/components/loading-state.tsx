import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-muted-foreground gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium animate-pulse">{message}</p>
    </div>
  );
}

export function ErrorState({ error, retry }: { error?: Error | unknown, retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-destructive gap-4">
      <div className="bg-destructive/10 p-4 rounded-full">
        <span className="font-bold text-xl">!</span>
      </div>
      <div className="text-center">
        <h3 className="font-bold text-lg mb-1">Something went wrong</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {error instanceof Error ? error.message : "Failed to load data. Please try again."}
        </p>
      </div>
      {retry && (
        <button 
          onClick={retry}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
