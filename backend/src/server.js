const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true })
const express = require('express')
const { fetch } = require('undici')

const app = express()

// Database
const connectDB = require('./db/connect')
const User = require('./models/User')

// Middleware
const authMiddleware = require('./middleware/auth')

// Routers
const profileRouter = require('./routes/profiles')
const userRouter = require('./routes/user')
const logRouter = require('./routes/logs')

const PORT = process.env.PORT || 3000
const FREE_ENDPOINT = process.env.ENDPOINT
const FREE_API_KEY = process.env.API_KEY

app.use(express.static(path.join(__dirname, '../../frontend')))

app.use((req, res, next) => {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type, authorization')
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  next()
})

app.use(express.json({ limit: '1mb' }))

app.use('/api/profiles', authMiddleware, profileRouter)
app.use('/api/users', authMiddleware, userRouter)
app.use('/api/logs', authMiddleware, logRouter)

app.post('/api/auth/register', async (req, res) => {
  const { login, password } = req.body

  if (!login || !password) {
    return res.status(400).json({ msg: 'Please provide login and password' })
  }
  try {
    const user = await User.create({ ...req.body })
    const token = user.createJWT()
    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(201).json({ user: userResponse, token })
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).json({ msg: messages });
    }
    if (error.code === 11000) {
        return res.status(400).json({ msg: 'Login already exists.' });
    }
    res.status(500).json({ msg: 'Server error, please try again later.' });
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body

  if (!login || !password) {
    return res.status(400).json({ msg: 'Please provide login and password' })
  }
  const user = await User.findOne({ login })
  if (!user) {
    return res.status(401).json({ msg: 'Invalid Credentials' })
  }
  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    return res.status(401).json({ msg: 'Invalid Credentials' })
  }
  const token = user.createJWT()
  res.status(200).json({ user: { login: user.login }, token })
})

function buildUrl(p) {
  const base = ENDPOINT || ''
  const u = new URL(p, base)
  return u.toString()
}

function processPlaceholders(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages[0].role !== 'system') {
    return messages
  }

  const content = messages[0].content
  const placeholders = {}

  const personaRegex = /<([a-zA-Z0-9_ ]+?'s Persona)>([\s\S]*?)<\/\1>/
  const scenarioRegex = /<Scenario>([\s\S]*?)<\/Scenario>/
  const userPersonaRegex = /<UserPersona>([\s\S]*?)<\/UserPersona>/
  const summaryRegex = /<summary>([\s\S]*?)<\/summary>/
  
  const userName = /<user>([a-zA-Z0-9_ ]+?)<\/user>/
  const characterName = /<character>([a-zA-Z0-9_ ]+?)<\/character>/

  const botPersonaMatch = content.match(personaRegex)
  if (botPersonaMatch) {
    placeholders.bot_persona = botPersonaMatch[2].trim()
  }

  const scenarioMatch = content.match(scenarioRegex)
  if (scenarioMatch) {
    placeholders.scenario = scenarioMatch[1].trim()
  }

  const userPersonaMatch = content.match(userPersonaRegex)
  if (userPersonaMatch) {
    placeholders.user_persona = userPersonaMatch[1].trim()
  }

  const summaryRegexMatch = content.match(summaryRegex)
  if (summaryRegexMatch) {
    placeholders.summary = summaryRegexMatch[1].trim()
  }

  const userNameMatch = content.match(userName)
  if (userNameMatch) {
    placeholders.user = userNameMatch[1].trim()
  }

  const characterNameMatch = content.match(characterName)
  if (characterNameMatch) {
    placeholders.char = characterNameMatch[1].trim()
  }

  let systemPrompt = content
    .replace(personaRegex, '')
    .replace(scenarioRegex, '')
    .replace(userPersonaRegex, '')
    .replace(summaryRegex, '')
    .replace(userName, '')
    .replace(characterName, '')
    .trim()

  for (const key in placeholders) {
    let placeholder
    if (key == 'user' || key == 'char') {
      placeholder = new RegExp(`{{${key}}}`, 'g')
    } else {
      placeholder = new RegExp(`{${key}}`, 'g')
    }
    systemPrompt = systemPrompt.replace(placeholder, placeholders[key] || '')
  }

  const finalLines = [];
  const lines = systemPrompt.split('\n');
  for (const line of lines) {
    if (line.includes('{summary}') && (!placeholders.summary || placeholders.summary.trim() === '')) {
      continue;
    }
    finalLines.push(line);
  }

  const finalSystemPrompt = finalLines.join('\n');

  const newFirstMessage = { ...messages[0], content: finalSystemPrompt }
  return [newFirstMessage, ...messages.slice(1)]
}

function buildProfilePrompt(profile) {
  if (!profile || !profile.tabs || profile.tabs.length === 0) {
    return '';
  }
  const enabledTabs = profile.tabs.filter(t => t.enabled);
  return enabledTabs.map(t => `<${t.role}>\n${t.content || ''}\n</${t.role}>`).join('\n');
}

function parseSpecialSystemPrompt(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages
  }
  const firstMessage = messages[0]
  if (firstMessage.role !== 'system' || !firstMessage.content.includes('<system>')) {
    return messages
  }
  const newMessages = []
  const regex = /<(system|user)>(.*?)<\/\1>/gs
  const matches = firstMessage.content.matchAll(regex)
  for (const match of matches) {
    const role = match[1]
    const content = match[2].trim()
    newMessages.push({ role, content })
  }
  if (newMessages.length > 0) {
    return [...newMessages, ...messages.slice(1)]
  }
  return messages
}

const Profile = require('./models/Profile');
const Log = require('./models/Log');

app.post('/v1/chat/completions', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.activeProfileId) {
      return res.status(400).json({ error: 'User or active profile not found' });
    }

    const activeProfile = await Profile.findById(user.activeProfileId);
    if (!activeProfile) {
      return res.status(400).json({ error: 'Active profile not found' });
    }

    let { proxyEndpoint, proxyApiKey, model } = activeProfile;
    if (!proxyEndpoint || !proxyApiKey) {
      return res.status(400).json({ error: 'Proxy endpoint or API key not configured in the active profile' });
    }

    const body = { ...req.body };

    if (model) {
      body.model = model;
    }

    if (proxyEndpoint === 'free') {
      proxyEndpoint = FREE_ENDPOINT;
      proxyApiKey = FREE_API_KEY;

      switch (body.model) {
        case 'deepseek-r1-0528':
          body.model = 'deepseek-r1-0528-p:8';
          break;

        case 'deepseek-v3-0324':
          body.model = 'deepseek-v3-0324-p:8';
          break;

        default:
          throw new Error(`Unsupported model in free provider: ${body.model}`);
      }
    }

    const finalMessages = [];
    const userMessages = body.messages.filter(m => m.role !== 'system');
    const incomingSystem = body.messages.find(m => m.role === 'system');

    activeProfile.tabs.forEach(tab => {
        if (!tab.enabled) return;

        if (tab.content === '{chat_history}') {
            finalMessages.push(...userMessages);
        } else {
            finalMessages.push({
                role: tab.role,
                content: tab.content
            });
        }
    });

    if (incomingSystem) {
        const processed = processPlaceholders([incomingSystem]);
        if (processed && processed[0] && processed[0].content) {
            finalMessages.unshift(processed[0]);
        }
    }
    
    body.messages = finalMessages;

   console.log(body.messages);

    const isStream = body && body.stream === true;
    const url = new URL(proxyEndpoint);
    url.pathname = path.join(url.pathname, 'chat/completions');
    
    const headers = {
      authorization: `Bearer ${proxyApiKey}`,
      'content-type': 'application/json'
    };

    const r = await fetch(url.toString(), {
        method: 'POST',
        headers: { ...headers, ...(isStream && { accept: 'text/event-stream' }) },
        body: JSON.stringify(body)
    });

    const ctUp = r.headers.get('content-type') || '';
    const reqId = r.headers.get('x-request-id');
    
    res.status(r.status);
    if (ctUp) res.setHeader('content-type', ctUp);
    if (reqId) res.setHeader('x-request-id', reqId);

    if (!isStream || !ctUp.toLowerCase().startsWith('text/event-stream')) {
        const text = await r.text();
        try {
            const responseData = JSON.parse(text);
            await Log.create({
                userId: req.user.userId,
                profileId: activeProfile._id,
                statusCode: r.status,
                statusText: r.statusText,
                responseBody: responseData,
                usage: responseData.usage,
            });
        } catch (e) { }
        res.send(text);
        return;
    }
    
    res.setHeader('cache-control', 'no-cache');
    res.setHeader('connection', 'keep-alive');
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let usage = null;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
            const data = line.substring(5).trim();
            if (data === '[DONE]') continue;
            
            try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                    accumulatedContent += parsed.choices[0].delta.content;
                }
                if (parsed.usage) {
                    usage = parsed.usage;
                }
            } catch (e) { }
        }
        res.write(chunk);
    }
    
    try {
        await Log.create({
            userId: req.user.userId,
            profileId: activeProfile._id,
            statusCode: r.status,
            statusText: r.statusText,
            responseBody: { 
                stream_ended: true, 
                full_content: accumulatedContent,
                usage: usage 
            },
            usage: usage,
        });
    } catch(e) {
        console.error("Failed to log stream response:", e);
    }

    res.end();
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: { message: e.message, type: 'proxy_error' } });
    else if (!res.writableEnded) res.end();
  }
});

const KEY_PATH = process.env.SSL_KEY
const CERT_PATH = process.env.SSL_CERT
let server
if (KEY_PATH && CERT_PATH && fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
  server = https.createServer({ key: fs.readFileSync(KEY_PATH), cert: fs.readFileSync(CERT_PATH) }, app)
} else {
  server = http.createServer(app)
}
server.listen(PORT, async () => {
  try {
    await connectDB(process.env.MONGO_URI)
    console.log(`Server is listening on port ${PORT}...`)
  } catch (error) {
    console.log(error)
  }
})