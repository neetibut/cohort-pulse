import mongoose from 'mongoose';

export const PULSE_TYPES = ['stuck', 'shipped', 'question', 'idea'];

const pulseSchema = new mongoose.Schema(
  {
    author: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: PULSE_TYPES, required: true },
    text: { type: String, required: true, trim: true, maxlength: 280 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Pulse = mongoose.model('Pulse', pulseSchema);
