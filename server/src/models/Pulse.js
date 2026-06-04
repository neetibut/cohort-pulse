import mongoose from 'mongoose';

export const PULSE_TYPES = ['stuck', 'shipped', 'question', 'idea'];

const pulseSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalized snapshot of the author's display name for display.
    authorName: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: PULSE_TYPES, required: true },
    text: { type: String, required: true, trim: true, maxlength: 280 },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Pulse = mongoose.model('Pulse', pulseSchema);
