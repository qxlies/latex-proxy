const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { WorkshopProfile, WorkshopVersion } = require('../models/Workshop');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper: build immutable tab snapshot from a Profile
 * - Excludes special service tabs like {chat_history}
 * - includeAllTabs: if false, keep only enabled tabs
 * - Preserves original order via index
 */
function buildTabSnapshot(profile, includeAllTabs = true) {
  const tabs = Array.isArray(profile.tabs) ? profile.tabs : [];
  const filtered = tabs
    .map((t, idx) => ({ ...t.toObject?.() ?? t, __idx: idx }))
    .filter(
      (t) =>
        t.content !== '{chat_history}' &&
        (includeAllTabs ? true : !!t.enabled)
    )
    .map((t) => ({
      role: t.role,
      title: t.title,
      content: t.content || '',
      enabled: !!t.enabled,
      index: t.__idx,
    }));
  return filtered;
}

/**
 * Validate provider type (advisory field)
 */
function validateProviderType(pt) {
  const allowed = ['openrouter', 'aistudio', 'gorouter', 'custom', ''];
  return allowed.includes(pt || '') ? pt || '' : '';
}

/**
 * GET /api/workshop
 * List public (or own) workshop profiles, with optional search.
 * Query: q, page=1, limit=20, visibility? (admin only)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { q = '', page = 1, limit = 20, visibility } = req.query;

    const user = await User.findById(req.user.userId);
    const isAdmin = !!(user && user.isAdmin);

    const query = {};
    const and = [];

    if (q) {
      and.push({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $elemMatch: { $regex: q, $options: 'i' } } },
        ],
      });
    }

    if (visibility) {
      // Only admins can filter arbitrary visibility
      if (isAdmin) {
        and.push({ visibility });
      } else {
        return res.status(403).json({ msg: 'Forbidden' });
      }
    } else {
      // Non-admins see only public plus their own hidden
      if (isAdmin) {
        and.push({ visibility: { $ne: 'deleted' } });
      } else {
        and.push({
          $or: [
            { visibility: 'public' },
            { visibility: 'hidden', ownerId: req.user.userId },
          ],
        });
      }
    }

    if (and.length) query.$and = and;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const [items, total] = await Promise.all([
      WorkshopProfile.find(query)
        .sort({ updatedAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      WorkshopProfile.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('Workshop list error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * GET /api/workshop/:id
 * Get profile details + recent versions (or all if requested).
 * Query: versionsLimit? (default 10), includeAllVersions?=false
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const prof = await WorkshopProfile.findById(req.params.id);
    if (!prof) return res.status(404).json({ msg: 'Not found' });

    const user = await User.findById(req.user.userId);
    const isAdmin = !!(user && user.isAdmin);
    const isOwner = prof.ownerId.toString() === req.user.userId;

    if (prof.visibility === 'deleted') {
      if (!isAdmin) return res.status(404).json({ msg: 'Not found' });
    } else if (prof.visibility === 'hidden') {
      if (!(isAdmin || isOwner)) return res.status(404).json({ msg: 'Not found' });
    }

    const includeAllVersions = req.query.includeAllVersions === 'true';
    const versionsLimit = includeAllVersions ? 0 : Math.max(parseInt(req.query.versionsLimit, 10) || 10, 1);

    const vq = { workshopProfileId: prof._id };
    const versionsCursor = WorkshopVersion.find(vq).sort({ versionNumber: -1 });
    const versions = includeAllVersions ? await versionsCursor.lean() : await versionsCursor.limit(versionsLimit).lean();

    res.json({
      profile: prof,
      versions,
    });
  } catch (err) {
    console.error('Workshop detail error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * POST /api/workshop/publish
 * Create a publication from a Profile.
 * Body: { profileId, title, description, preferredModels?: string[], preferredProviderType?: string, includeAllTabs?: boolean }
 */
router.post('/publish', auth, async (req, res) => {
  try {
    const {
      profileId,
      title,
      description = '',
      preferredModels = [],
      preferredProviderType = '',
      includeAllTabs = true,
    } = req.body || {};

    if (!profileId) return res.status(400).json({ msg: 'profileId is required' });
    if (!title || !title.trim()) return res.status(400).json({ msg: 'title is required' });

    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ msg: 'Profile not found' });
    if (profile.userId.toString() !== req.user.userId) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const tabs = buildTabSnapshot(profile, !!includeAllTabs);

    const wp = await WorkshopProfile.create({
      ownerId: req.user.userId,
      title: title.trim(),
      description: String(description || ''),
      preferredModels: Array.isArray(preferredModels) ? preferredModels.slice(0, 50) : [],
      preferredProviderType: validateProviderType(preferredProviderType),
      visibility: 'public', // per spec: publish is immediately public
      currentVersion: 0,
      lastPublishedAt: null,
      tags: [],
      stats: { views: 0, imports: 0 },
    });

    const v1 = await WorkshopVersion.create({
      workshopProfileId: wp._id,
      versionNumber: 1,
      changelog: '', // first publish has no changelog
      tabs,
      preferredModels: Array.isArray(preferredModels) ? preferredModels.slice(0, 50) : [],
      preferredProviderType: validateProviderType(preferredProviderType),
      includeAllTabs: !!includeAllTabs,
    });

    wp.currentVersion = 1;
    wp.lastPublishedAt = new Date();
    await wp.save();

    // Link source profile to published Workshop profile (for owner convenience)
    try {
      await Profile.findByIdAndUpdate(profileId, {
        $set: {
          workshopPublishedId: wp._id,
          workshopIncludeAllTabs: !!includeAllTabs,
        },
      });
    } catch (e) {
      console.error('Failed to set workshopPublishedId on source profile:', e);
    }

    res.json({
      profile: wp,
      version: v1,
    });
  } catch (err) {
    console.error('Workshop publish error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * PUT /api/workshop/:id/update
 * Create a new version from current Profile state.
 * Body: { profileId, changelog, title?, description?, preferredModels?, preferredProviderType?, includeAllTabs? }
 */
router.put('/:id/update', auth, async (req, res) => {
  try {
    const {
      profileId,
      changelog = '',
      title,
      description,
      preferredModels,
      preferredProviderType,
      includeAllTabs = true,
    } = req.body || {};

    if (!profileId) return res.status(400).json({ msg: 'profileId is required' });

    const wp = await WorkshopProfile.findById(req.params.id);
    if (!wp) return res.status(404).json({ msg: 'Not found' });
    if (wp.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    if (wp.visibility === 'deleted') {
      return res.status(400).json({ msg: 'Cannot update a deleted publication' });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ msg: 'Profile not found' });
    if (profile.userId.toString() !== req.user.userId) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    const tabs = buildTabSnapshot(profile, !!includeAllTabs);
    const nextVersion = (wp.currentVersion || 0) + 1;

    const versionDoc = await WorkshopVersion.create({
      workshopProfileId: wp._id,
      versionNumber: nextVersion,
      changelog: String(changelog || ''),
      tabs,
      preferredModels: Array.isArray(preferredModels) ? preferredModels.slice(0, 50) : wp.preferredModels,
      preferredProviderType: validateProviderType(
        preferredProviderType !== undefined ? preferredProviderType : wp.preferredProviderType
      ),
      includeAllTabs: !!includeAllTabs,
    });

    // Update profile metadata (optional title/description and advisory fields)
    if (typeof title === 'string' && title.trim()) wp.title = title.trim();
    if (typeof description === 'string') wp.description = String(description || '');
    if (Array.isArray(preferredModels)) wp.preferredModels = preferredModels.slice(0, 50);
    if (typeof preferredProviderType === 'string') wp.preferredProviderType = validateProviderType(preferredProviderType);

    wp.currentVersion = nextVersion;
    wp.lastPublishedAt = new Date();
    await wp.save();

    res.json({
      profile: wp,
      version: versionDoc,
    });
  } catch (err) {
    console.error('Workshop update error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * POST /api/workshop/:id/hide (owner or admin)
 */
router.post('/:id/hide', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const wp = await WorkshopProfile.findById(req.params.id);
    if (!wp) return res.status(404).json({ msg: 'Not found' });

    const isAdmin = !!(user && user.isAdmin);
    const isOwner = wp.ownerId.toString() === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    wp.visibility = 'hidden';
    await wp.save();
    res.json({ profile: wp });
  } catch (err) {
    console.error('Workshop hide error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * POST /api/workshop/:id/unhide (owner or admin)
 */
router.post('/:id/unhide', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const wp = await WorkshopProfile.findById(req.params.id);
    if (!wp) return res.status(404).json({ msg: 'Not found' });

    const isAdmin = !!(user && user.isAdmin);
    const isOwner = wp.ownerId.toString() === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    wp.visibility = 'public';
    await wp.save();
    res.json({ profile: wp });
  } catch (err) {
    console.error('Workshop unhide error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * DELETE /api/workshop/:id (owner or admin)
 * Soft-delete by marking as 'deleted'
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const wp = await WorkshopProfile.findById(req.params.id);
    if (!wp) return res.status(404).json({ msg: 'Not found' });

    const isAdmin = !!(user && user.isAdmin);
    const isOwner = wp.ownerId.toString() === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    wp.visibility = 'deleted';
    await wp.save();
    res.status(204).send();
  } catch (err) {
    console.error('Workshop delete error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * POST /api/workshop/:id/import
 * Returns latest version snapshot for client-side import.
 * Body: { mode?: 'link' | 'copy' }  // 'link' to be supported in next iteration (server-side attachment)
 */
router.post('/:id/import', auth, async (req, res) => {
  try {
    const { mode = 'copy' } = req.body || {};
    const wp = await WorkshopProfile.findById(req.params.id);
    if (!wp) return res.status(404).json({ msg: 'Not found' });

    if (wp.visibility === 'deleted') return res.status(404).json({ msg: 'Not found' });
    if (wp.visibility === 'hidden') {
      // hidden visible only to owner or admins
      const user = await User.findById(req.user.userId);
      const isAdmin = !!(user && user.isAdmin);
      const isOwner = wp.ownerId.toString() === req.user.userId;
      if (!(isAdmin || isOwner)) return res.status(404).json({ msg: 'Not found' });
    }

    const last = await WorkshopVersion.findOne({ workshopProfileId: wp._id })
      .sort({ versionNumber: -1 })
      .lean();

    if (!last) return res.status(400).json({ msg: 'No versions available' });

    // For now we just return snapshot; client will decide to clone or link.
    res.json({
      workshopProfileId: String(wp._id),
      versionNumber: last.versionNumber,
      mode: mode === 'link' ? 'link' : 'copy',
      preferredModels: last.preferredModels,
      preferredProviderType: last.preferredProviderType,
      includeAllTabs: last.includeAllTabs,
      tabs: last.tabs,
    });
  } catch (err) {
    console.error('Workshop import error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * POST /api/workshop/sync-linked/:profileId
 * If profile is linked to a Workshop profile and auto-update is on,
 * update its tabs from the latest WorkshopVersion snapshot.
 */
router.post('/sync-linked/:profileId', auth, async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await Profile.findOne({ _id: profileId, userId: req.user.userId });
    if (!profile) return res.status(404).json({ msg: 'Profile not found' });

    if (!profile.workshopLinkedId) {
      return res.status(400).json({ msg: 'Profile is not linked to a Workshop publication' });
    }

    if (profile.workshopAutoUpdate === false) {
      return res.status(200).json({ profile });
    }

    const wp = await WorkshopProfile.findById(profile.workshopLinkedId);
    if (!wp || wp.visibility === 'deleted') {
      return res.status(404).json({ msg: 'Linked Workshop publication not found' });
    }

    const last = await WorkshopVersion.findOne({ workshopProfileId: wp._id }).sort({ versionNumber: -1 }).lean();
    if (!last) {
      return res.status(400).json({ msg: 'No versions available for linked Workshop publication' });
    }

    if (profile.workshopLinkedVersion && last.versionNumber <= profile.workshopLinkedVersion) {
      // Already up to date
      return res.status(200).json({ profile });
    }

    // Preserve any special {chat_history} tabs and their target positions if possible
    const specialTabs = Array.isArray(profile.tabs)
      ? profile.tabs
          .map((t, idx) => ({ ...t, __idx: idx }))
          .filter(t => t.content === '{chat_history}')
      : [];

    // Build new tabs from snapshot, preserving order by index
    const orderedSnapshots = [...last.tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const newTabs = orderedSnapshots.map(s => ({
      id: uuidv4(),
      role: s.role,
      title: s.title,
      content: s.content || '',
      enabled: !!s.enabled,
      isPinned: false,
    }));

    // Re-insert special tabs near their previous indices
    for (const st of specialTabs) {
      const insertAt = Math.min(Math.max(st.__idx, 0), newTabs.length);
      newTabs.splice(insertAt, 0, {
        id: st.id || uuidv4(),
        role: st.role || 'user',
        title: st.title || 'Chat History',
        content: '{chat_history}',
        enabled: typeof st.enabled === 'boolean' ? st.enabled : true,
        isPinned: !!st.isPinned,
      });
    }

    profile.tabs = newTabs;
    profile.workshopLinkedVersion = last.versionNumber;
    profile.workshopIncludeAllTabs = !!last.includeAllTabs;

    await profile.save();
    res.json({ profile });
  } catch (err) {
    console.error('Sync linked profile error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

/**
 * POST /api/workshop/:id/import/apply
 * Create a new Profile for current user from latest Workshop snapshot.
 * Body: { mode?: 'link' | 'copy', name?: string }
 */
router.post('/:id/import/apply', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { mode = 'copy', name } = req.body || {};

    const wp = await WorkshopProfile.findById(id);
    if (!wp) return res.status(404).json({ msg: 'Not found' });
    if (wp.visibility === 'deleted') return res.status(404).json({ msg: 'Not found' });

    const last = await WorkshopVersion.findOne({ workshopProfileId: wp._id }).sort({ versionNumber: -1 }).lean();
    if (!last) return res.status(400).json({ msg: 'No versions available' });

    // Build tabs from snapshot
    const orderedSnapshots = [...last.tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const tabs = orderedSnapshots.map(s => ({
      id: uuidv4(),
      role: s.role,
      title: s.title,
      content: s.content || '',
      enabled: !!s.enabled,
      isPinned: false,
    }));

    // Ensure special Chat History tab is present at the end
    const hasChatHistory = tabs.some(t => t.content === '{chat_history}');
    if (!hasChatHistory) {
      tabs.push({
        id: uuidv4(),
        role: 'user',
        title: 'Chat History',
        content: '{chat_history}',
        enabled: true,
        isPinned: false,
      });
    }

    const created = await Profile.create({
      userId: req.user.userId,
      name: name && String(name).trim().length ? String(name).trim() : `${wp.title}`,
      useGlobalProvider: true,
      providerType: 'openrouter', // default; user can switch later
      providers: {
        openrouter: { apiKey: '', model: '' },
        aistudio: { apiKey: '', model: 'gemini-2.5-pro' },
        gorouter: { apiKey: '', model: '', thinkingEnabled: false, effort: 'medium', provider: 'Google' },
        // free: { model: 'gemini-2.5-pro' },
        custom: { endpoint: '', apiKey: '', model: '' },
      },
      proxyEndpoint: 'https://openrouter.ai/api/v1',
      proxyApiKey: '',
      model: 'deepseek/deepseek-r1-0528:free',
      extraParams: '{}',
      mergeConsecutiveRoles: true,
      tabs,
      // Linkage metadata
      workshopLinkedId: mode === 'link' ? wp._id : null,
      workshopLinkedVersion: mode === 'link' ? last.versionNumber : null,
      workshopAutoUpdate: mode === 'link' ? true : false,
      workshopIncludeAllTabs: !!last.includeAllTabs,
    });

    res.status(201).json({ profile: created });
  } catch (err) {
    console.error('Workshop import apply error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

module.exports = router;