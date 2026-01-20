export default function Toast({ kind = "success", message, onClose }) {
  if (!message) return null;

  const base =
    "fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl shadow px-4 py-3 text-sm";
  const style =
    kind === "error"
      ? "bg-red-50 text-red-800 border border-red-200"
      : "bg-green-50 text-green-800 border border-green-200";

  return (
    <div className={`${base} ${style}`}>
      <div className="flex items-start gap-3">
        <div className="font-semibold">
          {kind === "error" ? "실패" : "성공"}
        </div>
        <div className="flex-1 whitespace-pre-wrap">{message}</div>
        <button
          className="text-gray-500 hover:text-gray-900"
          onClick={onClose}
          aria-label="close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}