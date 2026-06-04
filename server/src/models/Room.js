import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    // url-safe, lowercased, unique — e.g. "cohort-7".
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Owner is implicitly a moderator; not necessarily listed here.
    moderatorIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    isPrivate: { type: Boolean, default: false },
    // Required iff isPrivate; never returned to clients (see toPublicJSON).
    accessCode: { type: String },
    // Membership tracking: the users who have joined this room.
    members: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Public-safe shape (contract §3): all fields except accessCode.
roomSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  delete obj.accessCode;
  return obj;
};

export const Room = mongoose.model('Room', roomSchema);
