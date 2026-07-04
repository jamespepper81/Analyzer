import { Bitcoin, CircleAlert } from "lucide-react"

export function FullPageLoader({ label }: { label?: string }) {
    return (
        <div
            className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center gap-4"
            role="status"
            aria-live="polite"
        >
            <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/15 [animation-duration:1.8s]" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary [animation-duration:1.1s]" />
                <Bitcoin className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">{label ?? "Loading…"}</p>
        </div>
    )
}

export function ErrorDisplay({ message }: { message: string }) {
    return (
        <div className="flex h-[calc(100vh-12rem)] items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center shadow-sm">
                <CircleAlert className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden="true" />
                <h3 className="mb-1 text-lg font-bold text-foreground">An Error Occurred</h3>
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    )
}
