import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface DeleteModalProps {
  onClose: () => void;
  onConfirm: () => void;
  chatTitle?: string;
}

/**
 * Confirmation dialog for permanently deleting a chat conversation.
 */
export default function DeleteModal({ onClose, onConfirm, chatTitle }: DeleteModalProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-modal flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 10 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
        className="w-full max-w-[min(380px,calc(100vw-32px))] rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-[#12151e]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              AI Workspace
            </p>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Delete conversation?
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {chatTitle ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-200">"{chatTitle}"</span>?
            </>
          ) : (
            "Are you sure you want to delete this conversation?"
          )} This action cannot be undone and will permanently remove it from your local storage.
        </p>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 shadow-sm cursor-pointer"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
