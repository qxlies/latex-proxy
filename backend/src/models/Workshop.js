const mongoose = require('mongoose');

/**
 * Tab snapshot stored inside a WorkshopVersion.
 * This is a minimal, immutable slice of a Profile tab at publish time.
 * Order is preserved by array position; we keep index for convenience and potential migrations.
 */
const TabSnapshotSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    index: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * WorkshopProfile — top-level publication card.
 * - Stores owner, metadata, visibility, aggregate stats and currentVersion.
 * - Preferred models/provider are advisory (display-only).
 */
const WorkshopProfileSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '' }, // markdown (will be sanitized at render)
    visibility: {
      type: String,
      enum: ['public', 'hidden', 'deleted'],
      default: 'public',
      index: true,
    },

    // Advisory display fields at profile level (can change between updates)
    preferredModels: { type: [String], default: [] }, // e.g. ['gpt-4o', 'grok-4', 'deepseek/deepseek-r1']
    preferredProviderType: {
      type: String,
      enum: ['openrouter', 'aistudio', 'gorouter', 'free', 'custom', ''],
      default: '',
    },

    // Catalog
    tags: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },

    // Versioning
    currentVersion: { type: Number, default: 0 }, // incremented on each publish/update
    lastPublishedAt: { type: Date, default: null },

    // Stats (extend later if needed: likes, downloads, etc.)
    stats: {
      views: { type: Number, default: 0 },
      imports: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

/**
 * WorkshopVersion — immutable version of a publication.
 * - Holds a full snapshot of tabs and the advisory models/provider at that time.
 * - includeAllTabs remembers the author's choice at publish time (for reference).
 */
const WorkshopVersionSchema = new mongoose.Schema(
  {
    workshopProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkshopProfile',
      required: true,
      index: true,
    },
    versionNumber: { type: Number, required: true }, // starts at 1
    changelog: { type: String, default: '' }, // markdown (sanitized on render)
    tabs: { type: [TabSnapshotSchema], default: [] },

    // Advisory snapshot at the moment of publish
    preferredModels: { type: [String], default: [] },
    preferredProviderType: {
      type: String,
      enum: ['openrouter', 'aistudio', 'gorouter', 'custom', ''],
      default: '',
    },

    // Author's publish option for this version (all tabs vs enabled only)
    includeAllTabs: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Helpful compound index for listing/sorting versions of a specific profile
WorkshopVersionSchema.index(
  { workshopProfileId: 1, versionNumber: -1 },
  { unique: true, name: 'profile_version_unique_desc' }
);

const WorkshopProfile = mongoose.model('WorkshopProfile', WorkshopProfileSchema);
const WorkshopVersion = mongoose.model('WorkshopVersion', WorkshopVersionSchema);

module.exports = {
  WorkshopProfile,
  WorkshopVersion,
};