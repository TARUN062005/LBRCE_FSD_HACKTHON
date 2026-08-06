export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-10 text-center dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm font-semibold text-red-800 dark:text-red-200">{title}</p>
      {message && (
        <p className="mt-1 max-w-md text-sm text-red-700/90 dark:text-red-300/90">{message}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Try again
        </button>
      )}
    </div>
  )
}
