interface IconActionButtonProps {
  readonly onClick: () => void;
  readonly label: string;
  readonly title: string;
  readonly disabled?: boolean;
  readonly tone?: "neutral" | "primary" | "danger";
  readonly children: React.ReactNode;
}

export function IconActionButton({
  onClick,
  label,
  title,
  disabled = false,
  tone = "neutral",
  children,
}: IconActionButtonProps) {
  let toneClass = "text-gray-700 hover:bg-gray-100";
  if (tone === "danger") {
    toneClass = "text-red-600 hover:bg-red-50";
  } else if (tone === "primary") {
    toneClass = "text-indigo-700 hover:bg-indigo-50";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent ${toneClass} disabled:opacity-60`}
    >
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
