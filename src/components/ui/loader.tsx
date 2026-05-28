import { LoaderCircle } from "lucide-react"

export function FullPageLoader() {
    return (
        <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
}

export function ErrorDisplay({ message }: { message: string }) {
    return (
        <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
            <div>
                <h3 className="font-bold">An Error Occurred</h3>
                <p className="text-sm">{message}</p>
            </div>
        </div>
    )
}
