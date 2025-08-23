const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  const profiles = await Profile.find({ userId: req.user.userId });
  res.status(200).json({ profiles });
});

router.post('/', async (req, res) => {
  req.body.userId = req.user.userId;
  const profile = await Profile.create(req.body);
  res.status(201).json({ profile });
});

router.put('/:id', async (req, res) => {
  const {
    user: { userId },
    params: { id: profileId },
    body: { name, proxyEndpoint, proxyApiKey, model, activeTabId, tabs, extraParams },
  } = req;

  const updateData = {};
  if (name) updateData.name = name;
  if (proxyEndpoint) updateData.proxyEndpoint = proxyEndpoint;
  if (typeof proxyApiKey !== 'undefined') updateData.proxyApiKey = proxyApiKey;
  if (model) updateData.model = model;
  if (activeTabId) updateData.activeTabId = activeTabId;
  if (tabs) updateData.tabs = tabs;
  if (extraParams) updateData.extraParams = extraParams;


  if (name === '') {
    return res.status(400).send('Name cannot be empty');
  }

  const profile = await Profile.findOneAndUpdate(
    { _id: profileId, userId: userId },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!profile) {
    return res.status(404).send(`No profile with id ${profileId}`);
  }

  res.status(200).json({ profile });
});

router.delete('/:id', async (req, res) => {
    const {
        user: { userId },
        params: { id: profileId },
    } = req;

    const profile = await Profile.findOneAndDelete({
        _id: profileId,
        userId: userId,
    });

    if (!profile) {
        return res.status(404).send(`No profile with id ${profileId}`);
    }

    res.status(200).send();
});

// --- Tab Routes ---

router.post('/:id/tabs', async (req, res) => {
    const newTab = { ...req.body, id: uuidv4() };
    try {
        const profile = await Profile.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { $push: { tabs: newTab } },
            { new: true, runValidators: true }
        );
        if (!profile) {
            return res.status(404).send('Profile not found');
        }
        res.status(201).json({ tab: newTab });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id/tabs/move', async (req, res) => {
    const { tabs } = req.body;
    try {
        const profile = await Profile.findOne({ _id: req.params.id, userId: req.user.userId });
        if (!profile) {
            return res.status(404).send('Profile not found');
        }
        profile.tabs = tabs;
        await profile.save();
        res.status(200).json({ tabs: profile.tabs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id/tabs/:tabId', async (req, res) => {
    const { role, title, content, enabled, isPinned } = req.body;
    const fieldsToUpdate = {};
    if (role) fieldsToUpdate['tabs.$.role'] = role;
    if (title) fieldsToUpdate['tabs.$.title'] = title;
    if (content) fieldsToUpdate['tabs.$.content'] = content;
    if (typeof enabled === 'boolean') fieldsToUpdate['tabs.$.enabled'] = enabled;
    if (typeof isPinned === 'boolean') fieldsToUpdate['tabs.$.isPinned'] = isPinned;

    try {
        const profile = await Profile.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId, "tabs.id": req.params.tabId },
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
        );
        if (!profile) {
            return res.status(404).send('Profile or tab not found');
        }
        const updatedTab = profile.tabs.find(t => t.id === req.params.tabId);
        res.status(200).json({ tab: updatedTab });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id/tabs/:tabId', async (req, res) => {
    try {
        const profile = await Profile.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { $pull: { tabs: { id: req.params.tabId } } },
            { new: true }
        );
        if (!profile) {
            return res.status(404).send('Profile not found');
        }
        res.status(200).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/clone', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    try {
        const originalProfile = await Profile.findOne({ _id: id, userId });
        if (!originalProfile) {
            return res.status(404).send('Original profile not found');
        }

        const clonedProfileData = originalProfile.toObject();
        delete clonedProfileData._id;
        clonedProfileData.name = `${originalProfile.name} (copy)`;
        clonedProfileData.tabs = originalProfile.tabs.map(t => ({ ...t, id: uuidv4() }));

        const clonedProfile = await Profile.create(clonedProfileData);
        res.status(201).json({ profile: clonedProfile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;