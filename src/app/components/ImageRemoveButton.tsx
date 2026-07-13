import { X } from 'lucide-react';

interface ImageRemoveButtonProps {
  onRemove: () => void;
}

export default function ImageRemoveButton({ onRemove }: ImageRemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}
