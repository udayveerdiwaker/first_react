import { motion } from "framer-motion";

/**
 * A confirmation modal for deleting a chat conversation.
 *
 * This component:
 * 1. Displays a centered dialog box asking the user to confirm deletion
 * 2. Explains that this removes the conversation from local history
 * 3. Provides two buttons: "Cancel" to close, or "Delete" to confirm
 * 4. Uses Framer Motion to smoothly animate the modal appearing
 *
 * The parent component passes two callbacks:
 * - onClose: Called when user clicks "Cancel"
 * - onConfirm: Called when user clicks "Delete"
 *
 * @param onClose - Function to call when user dismisses the modal
 * @param onConfirm - Function to call when user confirms deletion
 */
export default function DeleteModal({ onClose, onConfirm }: any) {
  return (
    // Dark overlay covering the entire screen to focus attention on the modal
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      {/* Animated modal box with smooth scale and fade-in effect */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900/95"
      >
        {/* Modal header with branding and title */}
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

        {/* Action buttons at the bottom of the modal */}
        <div className="flex justify-end gap-3">
          {/* Cancel button - dismisses the modal without deleting */}
          <button
            onClick={onClose}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
          >
            Cancel
          </button>

          {/* Delete button - confirms and removes the conversation */}
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
