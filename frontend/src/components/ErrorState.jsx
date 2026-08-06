export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}) {
  return (
    <div className="ui-card flex flex-col items-center justify-center border-red-200/80 bg-red-50/80 px-6 py-12 text-center dark:border-red-900/60 dark:bg-red-950/30">
      <p className="text-sm font-semibold text-red-800 dark:text-red-200">{title}</p>
      {message && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-red-700/90 dark:text-red-300/90">
          {message}
        </p>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className="ui-btn ui-btn-primary mt-5 !bg-red-700 hover:!bg-red-800">
          Try again
        </button>
      )}
    </div>
  )
}
