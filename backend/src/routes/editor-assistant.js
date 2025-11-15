const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { fetch } = require('undici');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { v4: uuidv4 } = require('uuid');

// Get all chats for current profile
router.get('/me/ai-chats/:profileId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const profileChats = user.aiChats.filter(
      chat => chat.profileId.toString() === req.params.profileId
    );

    res.json({ chats: profileChats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// Create new chat
router.post('/me/ai-chats/:profileId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const newChat = {
      id: uuidv4(),
      profileId: req.params.profileId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    user.aiChats.push(newChat);
    user.lastActiveChatId.set(req.params.profileId, newChat.id);
    await user.save();

    res.json({ chat: newChat });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// Delete chat
router.delete('/me/ai-chats/:chatId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const chatIndex = user.aiChats.findIndex(c => c.id === req.params.chatId);
    if (chatIndex === -1) {
      return res.status(404).json({ msg: 'Chat not found' });
    }

    user.aiChats.splice(chatIndex, 1);

    // If this was the last active chat, clear it
    for (const [profileId, chatId] of user.lastActiveChatId.entries()) {
      if (chatId === req.params.chatId) {
        user.lastActiveChatId.delete(profileId);
      }
    }

    await user.save();
    res.status(204).send();
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// Delete message from chat
router.delete('/me/ai-chats/:chatId/messages/:messageId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const chat = user.aiChats.find(c => c.id === req.params.chatId);
    if (!chat) {
      return res.status(404).json({ msg: 'Chat not found' });
    }

    const messageIndex = chat.messages.findIndex(m => m.id === req.params.messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    // Remove this message and all messages after it
    chat.messages.splice(messageIndex);
    chat.updatedAt = new Date();
    
    await user.save();
    res.json({ chat });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// Update suggestion status in message
router.put('/me/ai-chats/:chatId/messages/:messageId/suggestion', auth, async (req, res) => {
  try {
    const { suggestion } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const chat = user.aiChats.find(c => c.id === req.params.chatId);
    if (!chat) {
      return res.status(404).json({ msg: 'Chat not found' });
    }

    const message = chat.messages.find(m => m.id === req.params.messageId);
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    // Update the suggestion in the message
    if (message.suggestions && Array.isArray(message.suggestions)) {
      const suggestionIndex = message.suggestions.findIndex(s => {
        if (suggestion.tabId) {
          return s.tabId === suggestion.tabId && s.type === suggestion.type;
        }
        return s.title === suggestion.title && s.type === suggestion.type;
      });

      if (suggestionIndex !== -1) {
        message.suggestions[suggestionIndex] = suggestion;
      }
    }

    chat.updatedAt = new Date();
    await user.save();

    res.json({ message });
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// Send message to AI assistant
router.post('/me/editor-assistant', auth, async (req, res) => {
  try {
    const { message, chatId, profileId, tabs } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'Message is required' });
    }

    if (!profileId) {
      return res.status(400).json({ msg: 'Profile ID is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ msg: 'Profile not found' });
    }

    // Find or create chat
    let chat = user.aiChats.find(c => c.id === chatId);
    if (!chat) {
      chat = {
        id: uuidv4(),
        profileId: profileId,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      user.aiChats.push(chat);
    }

    // Add user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    chat.messages.push(userMessage);

    // Extract mentioned tabs
    const mentionedTabs = [];
    const mentionRegex = /@([^\s]+)/g;
    let msgMatch;
    
    while ((msgMatch = mentionRegex.exec(message)) !== null) {
      const tabTitle = msgMatch[1];
      const tab = tabs.find(t => t.title.toLowerCase() === tabTitle.toLowerCase());
      if (tab) {
        mentionedTabs.push(tab);
      }
    }

    // Build context
    const context = mentionedTabs.length > 0
      ? mentionedTabs.map(t => `Tab "${t.title}" (${t.role}):\n${t.content}`).join('\n\n---\n\n')
      : tabs.filter(t => t.content !== '{chat_history}')
          .map(t => `Tab "${t.title}" (${t.role}):\n${t.content}`)
          .join('\n\n---\n\n');

    // Build system prompt
    const tabsList = tabs.map((t, idx) => `${idx}. "${t.title}" (${t.role}) - ${t.enabled ? 'enabled' : 'disabled'}`).join('\n');
    const systemPrompt = `You are an expert prompt engineer helping users improve their AI prompt templates. You have access to their tab-based prompt system.

**CAPABILITIES:**
1. Answer questions about prompts and best practices
2. Suggest improvements to existing tabs (ONLY when 100% confident)
3. Propose new tabs when clearly beneficial
4. Explain prompt engineering concepts
5. Help optimize prompts for better AI responses

**AVAILABLE TABS:**
${tabsList}

**CURRENT CONTEXT:**
${context}

**CRITICAL RULES:**
- ONLY suggest changes when you are 100% confident they will improve the prompt
- If unsure, just answer the question without suggesting changes
- Always explain your reasoning clearly
- Consider the tab's role (system/user/assistant) and purpose
- Maintain consistency across tabs

**RESPONSE FORMAT:**
1. First, provide your answer/explanation in markdown
2. Then, if you're 100% confident about improvements, add XML blocks at the END

For modifying existing tabs:
<suggestion>
<tab>Exact Tab Title</tab>
<type>replace</type>
<explanation>Clear reason why this improves the prompt</explanation>
<content>
Complete new content here
</content>
</suggestion>

For creating new tabs:
<create_tab>
<title>New Tab Name</title>
<role>system</role>
<position>3</position>
<explanation>Why this tab is needed</explanation>
<content>
Tab content here
</content>
</create_tab>

**IMPORTANT:** XML blocks are parsed and shown as action buttons. Only include them when you're certain the changes are beneficial.`;

    // Build conversation history
    const conversationHistory = chat.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];

    // Call Grok API
    const grokResponse = await fetch(process.env.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`,
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4-fast',
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        reasoning: {
          enabled: true
        }
      }),
    });

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.error('Grok API error:', errorText);
      return res.status(500).json({ msg: 'AI service error' });
    }

    const grokData = await grokResponse.json();
    const aiResponse = grokData.choices[0]?.message?.content || 'No response';

    // Parse suggestions for modifying existing tabs
    const suggestions = [];
    
    console.log('AI Response length:', aiResponse.length);
    console.log('AI Response preview:', aiResponse.substring(0, 500));
    
    // Regex for suggestion blocks - simplified, less strict about whitespace
    const suggestionRegex = /<suggestion>\s*<tab>(.*?)<\/tab>\s*<type>(.*?)<\/type>\s*<explanation>(.*?)<\/explanation>\s*<content>([\s\S]*?)<\/content>\s*<\/suggestion>/gi;
    
    let match;
    while ((match = suggestionRegex.exec(aiResponse)) !== null) {
      const tabTitle = match[1].trim();
      const type = match[2].trim();
      const explanation = match[3].trim();
      const content = match[4].trim();

      console.log('Found suggestion:', { tabTitle, type, explanation: explanation.substring(0, 50) });

      const tab = tabs.find(t =>
        t.title.toLowerCase() === tabTitle.toLowerCase()
      );

      if (tab) {
        suggestions.push({
          tabId: tab.id,
          tabTitle: tab.title,
          type: type === 'replace' ? 'replace' : 'modify',
          newContent: content,
          explanation,
        });
      } else {
        console.log('Tab not found for suggestion:', tabTitle);
      }
    }

    // Parse create_tab suggestions - simplified regex
    const createTabRegex = /<create_tab>\s*<title>(.*?)<\/title>\s*<role>(.*?)<\/role>\s*<position>(.*?)<\/position>\s*<explanation>(.*?)<\/explanation>\s*<content>([\s\S]*?)<\/content>\s*<\/create_tab>/gi;
    
    while ((match = createTabRegex.exec(aiResponse)) !== null) {
      const title = match[1].trim();
      const role = match[2].trim();
      const position = parseInt(match[3].trim());
      const explanation = match[4].trim();
      const content = match[5].trim();

      console.log('Found create_tab:', { title, role, position, explanation: explanation.substring(0, 50) });

      suggestions.push({
        type: 'create',
        title,
        role: role === 'assistant' ? 'assistant' : role === 'user' ? 'user' : 'system',
        position: isNaN(position) ? tabs.length : position,
        newContent: content,
        explanation,
      });
    }
    
    console.log('Total suggestions found:', suggestions.length);

    // Remove ALL XML-like tags from response (suggestion, create_tab, change, new_tab, etc.)
    let cleanResponse = aiResponse
      .replace(/<suggestion>[\s\S]*?<\/suggestion>/g, '')
      .replace(/<create_tab>[\s\S]*?<\/create_tab>/g, '')
      .replace(/<change[\s\S]*?<\/change>/g, '')
      .replace(/<new_tab[\s\S]*?<\/new_tab>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .trim();

    // Add assistant message to chat
    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: cleanResponse || aiResponse,
      suggestions,
      timestamp: new Date()
    };
    chat.messages.push(assistantMessage);
    chat.updatedAt = new Date();

    // Update last active chat
    user.lastActiveChatId.set(profileId, chat.id);
    
    await user.save();

    res.json({
      response: cleanResponse || aiResponse,
      suggestions,
      usage: grokData.usage,
      chatId: chat.id,
      chat
    });

  } catch (error) {
    console.error('Editor assistant error:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

module.exports = router;
