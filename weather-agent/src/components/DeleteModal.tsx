import { motion } from "framer-motion";

export default function DeleteModal({ onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            ZyroChat
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            Delete this conversation?
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This will permanently remove the conversation from your local
            ZyroChat history.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
