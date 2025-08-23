const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.put('/me/active-profile', async (req, res) => {
    const { profileId } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { activeProfileId: profileId },
            { new: true }
        );
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.status(200).json({ activeProfileId: user.activeProfileId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/me', async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.put('/me/logging', async (req, res) => {
   const { isLoggingEnabled } = req.body;
   try {
       const user = await User.findByIdAndUpdate(
           req.user.userId,
           { isLoggingEnabled },
           { new: true }
       );
       if (!user) {
           return res.status(404).send('User not found');
       }
       res.status(200).json({ isLoggingEnabled: user.isLoggingEnabled });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

module.exports = router;