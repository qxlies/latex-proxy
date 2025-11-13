const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { fetch } = require('undici');

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

router.put('/me/profile-order', async (req, res) => {
   const { profileOrder } = req.body;
   try {
       const user = await User.findByIdAndUpdate(
           req.user.userId,
           { profileOrder },
           { new: true }
       );
       if (!user) {
           return res.status(404).send('User not found');
       }
       res.status(200).json({ profileOrder: user.profileOrder });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

router.put('/me/global-provider', async (req, res) => {
   const { globalProviderType, globalProviders } = req.body;
   try {
       const updateData = {};
       if (globalProviderType !== undefined) {
           updateData.globalProviderType = globalProviderType;
       }
       if (globalProviders !== undefined) {
           updateData.globalProviders = globalProviders;
       }
       
       const user = await User.findByIdAndUpdate(
           req.user.userId,
           updateData,
           { new: true }
       ).select('-password');
       
       if (!user) {
           return res.status(404).send('User not found');
       }
       res.status(200).json({
           globalProviderType: user.globalProviderType,
           globalProviders: user.globalProviders
       });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Get content filters and groups
router.get('/me/content-filters', async (req, res) => {
   try {
       const user = await User.findById(req.user.userId).select('contentFilters filterGroups lastRequestData');
       if (!user) {
           return res.status(404).send('User not found');
       }
       res.status(200).json({
           contentFilters: user.contentFilters || [],
           filterGroups: user.filterGroups || [],
           lastRequestData: user.lastRequestData || null
       });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Add content filter
router.post('/me/content-filters', async (req, res) => {
   const { pattern, replacement, caseSensitive, group } = req.body;
   try {
       const user = await User.findById(req.user.userId);
       if (!user) {
           return res.status(404).send('User not found');
       }
       
       const newFilter = {
           id: require('uuid').v4(),
           pattern,
           replacement: replacement || null,
           caseSensitive: caseSensitive || false,
           enabled: true,
           group: group || null,
           createdAt: new Date()
       };
       
       user.contentFilters.push(newFilter);
       await user.save();
       
       res.status(201).json({ filter: newFilter });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Bulk add content filters
router.post('/me/content-filters/bulk', async (req, res) => {
   const { filters } = req.body;
   
   if (!Array.isArray(filters) || filters.length === 0) {
       return res.status(400).json({ msg: 'Filters array is required' });
   }
   
   try {
       const user = await User.findById(req.user.userId);
       if (!user) {
           return res.status(404).send('User not found');
       }
       
       const newFilters = filters.map(f => ({
           id: require('uuid').v4(),
           pattern: f.pattern,
           replacement: f.replacement || null,
           caseSensitive: f.caseSensitive || false,
           enabled: true,
           group: f.group || null,
           createdAt: new Date()
       }));
       
       user.contentFilters.push(...newFilters);
       await user.save();
       
       res.status(201).json({ filters: newFilters });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Toggle all filters in a group
router.put('/me/content-filters/group/toggle', async (req, res) => {
   const { group, enabled } = req.body;
   
   try {
       const user = await User.findById(req.user.userId);
       if (!user) {
           return res.status(404).send('User not found');
       }
       
       let count = 0;
       user.contentFilters.forEach(filter => {
           if (filter.group === group) {
               filter.enabled = enabled;
               count++;
           }
       });
       
       await user.save();
       
       res.status(200).json({ count });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Delete all filters in a group
router.delete('/me/content-filters/group/:group', async (req, res) => {
   const { group } = req.params;
   const decodedGroup = decodeURIComponent(group);
   
   try {
       const user = await User.findById(req.user.userId);
       if (!user) {
           return res.status(404).send('User not found');
       }
       
       const initialLength = user.contentFilters.length;
       user.contentFilters = user.contentFilters.filter(f => f.group !== decodedGroup);
       const count = initialLength - user.contentFilters.length;
       
       await user.save();
       
       res.status(200).json({ count });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Update content filter
router.put('/me/content-filters/:filterId', async (req, res) => {
   const { filterId } = req.params;
   const { pattern, replacement, caseSensitive, enabled } = req.body;
   
   try {
       const user = await User.findById(req.user.userId);
       if (!user) {
           return res.status(404).send('User not found');
       }
       
       const filter = user.contentFilters.find(f => f.id === filterId);
       if (!filter) {
           return res.status(404).send('Filter not found');
       }
       
       if (pattern !== undefined) filter.pattern = pattern;
       if (replacement !== undefined) filter.replacement = replacement;
       if (caseSensitive !== undefined) filter.caseSensitive = caseSensitive;
       if (enabled !== undefined) filter.enabled = enabled;
       
       await user.save();
       
       res.status(200).json({ filter });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Delete content filter
router.delete('/me/content-filters/:filterId', async (req, res) => {
   const { filterId } = req.params;
   
   try {
       const user = await User.findById(req.user.userId);
       if (!user) {
           return res.status(404).send('User not found');
       }
       
       user.contentFilters = user.contentFilters.filter(f => f.id !== filterId);
       await user.save();
       
       res.status(200).json({ success: true });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Rename filter group
router.put('/me/filter-groups/:groupId', async (req, res) => {
   const { groupId } = req.params;
   const { name } = req.body;
   
   if (!name || typeof name !== 'string' || name.trim().length === 0) {
       return res.status(400).json({ msg: 'Group name is required' });
   }
   
   try {
       const user = await User.findById(req.user.userId);
       if (!user) {
           return res.status(404).send('User not found');
       }
       
       // Find or create group metadata
       let group = user.filterGroups.find(g => g.id === groupId);
       if (!group) {
           group = {
               id: groupId,
               name: name.trim(),
               createdAt: new Date()
           };
           user.filterGroups.push(group);
       } else {
           group.name = name.trim();
       }
       
       await user.save();
       
       res.status(200).json({ group });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// AI Prompt Analysis
router.post('/me/analyze-prompt', async (req, res) => {
   try {
       const { question } = req.body;
       
       if (!question || typeof question !== 'string' || question.trim().length === 0) {
           return res.status(400).json({ msg: 'Question is required' });
       }

       const user = await User.findById(req.user.userId).select('lastRequestData');
       if (!user) {
           return res.status(404).json({ msg: 'User not found' });
       }

       if (!user.lastRequestData || !user.lastRequestData.placeholders) {
           return res.status(400).json({ msg: 'No request data available for analysis' });
       }

       // Format only relevant placeholders for analysis
       const relevantKeys = ['scenario', 'bot_persona', 'example_dialogs', 'lorebooks'];
       let promptContext = 'CURRENT PROMPT CONTENT:\n\n';
       
       for (const key of relevantKeys) {
           const value = user.lastRequestData.placeholders[key];
           if (value && value.trim()) {
               promptContext += `<${key}>\n${value}\n</${key}>\n\n`;
           }
       }

       // System prompt for AI analyst - emphasize language matching and replacements
       const systemPrompt = `You are an expert prompt engineer specializing in content filtering and prompt optimization. Your role is to analyze prompts and identify problematic content that should be blocked OR replaced with better alternatives.

**CRITICAL LANGUAGE RULE:**
You MUST write your entire analysis in the SAME LANGUAGE as the user's question. If the user asks in Russian, respond in Russian. If in English, respond in English. This is NON-NEGOTIABLE.

**YOUR TASK:**
1. Analyze the provided prompt content (scenario, bot persona, example dialogs, lorebooks)
2. Identify text that should be:
   - **BLOCKED** (removed completely): Repetitive phrases, unnecessary filler, conflicting instructions, problematic content
   - **REPLACED** (substituted with better text): Verbose descriptions that can be simplified, unclear instructions that can be clarified, weak phrasing that can be strengthened

**IMPORTANT RULES:**
- Focus on BLOCKING or REPLACING existing content
- Do NOT suggest adding completely new content
- For replacements, provide concise, clear alternatives
- Write your analysis in the SAME LANGUAGE as the user's question

**RESPONSE FORMAT:**
Write your analysis in markdown format with clear sections:

1. **Summary** - Brief overview of what you found
2. **Issues Identified** - List specific problems with reasoning

After your analysis, add a clear separator line (---) and then list all actions.

**CRITICAL FORMATTING RULES:**
- Write the analysis part FIRST (Summary + Issues)
- Then add a separator: ---
- Then add ONLY the action tags at the very end
- Do NOT mix action tags with analysis text
- Do NOT include any explanatory text after the separator

**ACTION TAGS:**
For blocking (complete removal):
<block>
exact text to remove
</block>

For replacement (substitute with better text):
<replace>
<from>exact text to replace</from>
<to>replacement text</to>
</replace>

Example structure:
[Your analysis here in markdown]

---

<block>
exact text 1
</block>

<replace>
<from>verbose text</from>
<to>concise version</to>
</replace>

<block>
exact text 2
</block>`;

       // Call Grok API
       const endpoint = process.env.ENDPOINT;
       const apiKey = process.env.API_KEY;

       if (!apiKey) {
           return res.status(500).json({ msg: 'API key not configured' });
       }

       const response = await fetch(endpoint, {
           method: 'POST',
           headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
           },
           body: JSON.stringify({
               model: 'x-ai/grok-4-fast',
               messages: [
                   {
                       role: 'system',
                       content: systemPrompt
                   },
                   {
                       role: 'user',
                       content: `${promptContext}\n\nUSER QUESTION: ${question}`
                   }
               ],
               temperature: 0.7,
               max_tokens: 2000,
               reasoning: {
                enabled: true
               }
           })
       });

       if (!response.ok) {
           const errorText = await response.text();
           console.error('API error:', errorText);
           return res.status(response.status).json({ msg: 'AI analysis failed', error: errorText });
       }

       const data = await response.json();
       const analysis = data.choices?.[0]?.message?.content;

       if (!analysis) {
           return res.status(500).json({ msg: 'No analysis received from AI' });
       }

       // Extract block suggestions (for removal)
       const blockRegex = /<block>([\s\S]*?)<\/block>/g;
       const blockSuggestions = [];
       let match;
       
       while ((match = blockRegex.exec(analysis)) !== null) {
           blockSuggestions.push({
               type: 'block',
               pattern: match[1].trim()
           });
       }

       // Extract replace suggestions (for substitution)
       const replaceRegex = /<replace>\s*<from>([\s\S]*?)<\/from>\s*<to>([\s\S]*?)<\/to>\s*<\/replace>/g;
       const replaceSuggestions = [];
       
       while ((match = replaceRegex.exec(analysis)) !== null) {
           replaceSuggestions.push({
               type: 'replace',
               pattern: match[1].trim(),
               replacement: match[2].trim()
           });
       }

       // Combine all suggestions
       const suggestions = [...blockSuggestions, ...replaceSuggestions];

       res.status(200).json({
           analysis,
           suggestions,
           usage: data.usage
       });

   } catch (error) {
       console.error('AI analysis error:', error);
       res.status(500).json({ msg: 'Internal server error', error: error.message });
   }
});

module.exports = router;