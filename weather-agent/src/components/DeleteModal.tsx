import { motion } from "framer-motion";

export default function DeleteModal({ onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {/* 🔥 Animated Box */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#020617] p-6 rounded-xl border border-white/10 w-80 shadow-xl"
      >
        <p className="mb-4 text-sm text-gray-300">
          Delete this chat permanently?
        </p>

        <div className="flex justify-end gap-3">
          {/* Cancel */}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            Cancel
          </button>

          {/* Delete */}
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
