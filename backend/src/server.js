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

const PORT = process.env.PORT || 3000
const ENDPOINT = process.env.ENDPOINT
const API_KEY = process.env.API_KEY

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
    placeholders.summary = userPersonaMatch[1].trim()
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
    systemPrompt = systemPrompt.replace(placeholder, placeholders[key])
  }

  const newFirstMessage = { ...messages[0], content: systemPrompt }
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

    const { proxyEndpoint, proxyApiKey } = activeProfile;
    if (!proxyEndpoint || !proxyApiKey) {
      return res.status(400).json({ error: 'Proxy endpoint or API key not configured in the active profile' });
    }

    const body = { ...req.body };
    const incomingSystemMessage = body.messages.find(m => m.role === 'system');
    const profileSystemPrompt = buildProfilePrompt(activeProfile);

    if (incomingSystemMessage && profileSystemPrompt) {
        const placeholderProcessedPrompt = processPlaceholders([{ role: 'system', content: profileSystemPrompt + incomingSystemMessage.content }]);
        const finalMessages = parseSpecialSystemPrompt(placeholderProcessedPrompt);
        body.messages = [...finalMessages, ...body.messages.slice(1)];
    } else {
       body.messages = parseSpecialSystemPrompt(processPlaceholders(body.messages));
    }

    const isStream = body && body.stream === true;
    const url = new URL(proxyEndpoint);
    url.pathname = path.join(url.pathname, 'chat/completions');
    console.log(proxyEndpoint);
    console.log(url);
    
    const headers = {
      authorization: `Bearer ${proxyApiKey}`,
      'content-type': 'application/json'
    };

    const r = await fetch(url, {
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
        res.send(text);
        return;
    }
    
    res.setHeader('cache-control', 'no-cache');
    res.setHeader('connection', 'keep-alive');
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value));
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