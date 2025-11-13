import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import ReactMarkdown from 'react-markdown';
import { Button } from './ui';
import type { Tab } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: TabSuggestion[];
  timestamp: Date;
}

interface TabSuggestion {
  tabId?: string;
  tabTitle?: string;
  type: 'replace' | 'modify' | 'create';
  title?: string;
  role?: 'system' | 'user';
  position?: number;
  originalContent?: string;
  newContent: string;
  explanation: string;
  applied?: boolean;
  appliedAt?: Date;
}

interface Chat {
  id: string;
  profileId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface EditorAssistantProps {
  profileId: string;
  tabs: Tab[];
  onApplySuggestion: (tabId: string, newContent: string) => Promise<void>;
  onCreateTab: (title: string, role: 'system' | 'user', content: string, position: number) => Promise<void>;
}

export function EditorAssistant({ profileId, tabs, onApplySuggestion, onCreateTab }: EditorAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);

  // Load chats when opening
  useEffect(() => {
    if (isOpen && profileId) {
      loadChats();
    }
  }, [isOpen, profileId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle @ mentions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionsRef.current && !mentionsRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };

    if (showMentions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMentions]);

  const loadChats = async () => {
    try {
      const response = await fetch(`/api/users/me/ai-chats/${profileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      
      // Convert timestamp strings to Date objects
      const chatsWithDates = (data.chats || []).map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      
      setChats(chatsWithDates);
      
      // Load last active chat or create new one
      if (chatsWithDates.length > 0) {
        const lastChat = chatsWithDates[chatsWithDates.length - 1];
        setCurrentChatId(lastChat.id);
        setMessages(lastChat.messages);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const response = await fetch(`/api/users/me/ai-chats/${profileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setChats(prev => [...prev, data.chat]);
      setCurrentChatId(data.chat.id);
      setMessages([]);
      setShowChatList(false);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const switchChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      // Ensure timestamps are Date objects
      const messagesWithDates = chat.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
      }));
      setMessages(messagesWithDates);
      setShowChatList(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!confirm('Delete this chat?')) return;
    
    try {
      await fetch(`/api/users/me/ai-chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const newChats = chats.filter(c => c.id !== chatId);
      setChats(newChats);
      
      if (currentChatId === chatId) {
        if (newChats.length > 0) {
          switchChat(newChats[0].id);
        } else {
          setCurrentChatId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentChatId || !confirm('Delete this message and all following messages?')) return;
    
    try {
      const response = await fetch(`/api/users/me/ai-chats/${currentChatId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      
      // Convert timestamps
      const messagesWithDates = data.chat.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(messagesWithDates);
      
      // Update chat in list
      const updatedChat = {
        ...data.chat,
        messages: messagesWithDates,
        updatedAt: new Date(data.chat.updatedAt)
      };
      setChats(prev => prev.map(c => c.id === currentChatId ? updatedChat : c));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);

    // Check for @ mention
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
      setMentionSearch('');
      setShowMentions(true);
    } else if (lastAtIndex !== -1) {
      const searchText = textBeforeCursor.slice(lastAtIndex + 1);
      if (!searchText.includes(' ')) {
        setMentionSearch(searchText);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (tabTitle: string) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    const newText = 
      textBeforeCursor.slice(0, lastAtIndex) +
      `@${tabTitle} ` +
      textAfterCursor;

    setInput(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    (mentionSearch === '' && tab.title !== 'chat history')
  );

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/users/me/editor-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: input,
          chatId: currentChatId,
          profileId,
          tabs: tabs.map(t => ({ id: t.id, title: t.title, role: t.role, content: t.content, enabled: t.enabled })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        suggestions: data.suggestions || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentChatId(data.chatId);
      
      // Update chats list
      if (data.chat) {
        const chatWithDates = {
          ...data.chat,
          createdAt: new Date(data.chat.createdAt),
          updatedAt: new Date(data.chat.updatedAt),
          messages: data.chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        };
        
        setChats(prev => {
          const existing = prev.find(c => c.id === chatWithDates.id);
          if (existing) {
            return prev.map(c => c.id === chatWithDates.id ? chatWithDates : c);
          }
          return [...prev, chatWithDates];
        });
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (suggestion: TabSuggestion, messageId: string) => {
    try {
      // Store original content for undo
      let originalContent = '';
      if (suggestion.type !== 'create' && suggestion.tabId) {
        const tab = tabs.find(t => t.id === suggestion.tabId);
        originalContent = tab?.content || '';
      }

      if (suggestion.type === 'create') {
        await onCreateTab(
          suggestion.title || 'New Tab',
          suggestion.role || 'system',
          suggestion.newContent,
          suggestion.position || tabs.length
        );
      } else if (suggestion.tabId) {
        await onApplySuggestion(suggestion.tabId, suggestion.newContent);
      }
      
      // Mark as applied and save to backend
      const updatedSuggestion = {
        ...suggestion,
        applied: true,
        appliedAt: new Date(),
        originalContent
      };

      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.suggestions) {
          return {
            ...msg,
            suggestions: msg.suggestions.map(s =>
              s === suggestion ? updatedSuggestion : s
            ),
          };
        }
        return msg;
      }));

      // Update in backend
      await updateSuggestionStatus(currentChatId!, messageId, suggestion, true, originalContent);
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      alert('Failed to apply suggestion');
    }
  };

  const handleUndo = async (suggestion: TabSuggestion, messageId: string) => {
    if (!suggestion.originalContent || !suggestion.tabId) return;
    
    try {
      // Restore original content
      await onApplySuggestion(suggestion.tabId, suggestion.originalContent);
      
      // Mark as not applied
      const updatedSuggestion = {
        ...suggestion,
        applied: false,
        appliedAt: undefined,
        originalContent: undefined
      };

      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.suggestions) {
          return {
            ...msg,
            suggestions: msg.suggestions.map(s =>
              s === suggestion ? updatedSuggestion : s
            ),
          };
        }
        return msg;
      }));

      // Update in backend
      await updateSuggestionStatus(currentChatId!, messageId, suggestion, false);
    } catch (error) {
      console.error('Failed to undo suggestion:', error);
      alert('Failed to undo suggestion');
    }
  };

  const updateSuggestionStatus = async (
    chatId: string,
    messageId: string,
    suggestion: TabSuggestion,
    applied: boolean,
    originalContent?: string
  ) => {
    try {
      await fetch(`/api/users/me/ai-chats/${chatId}/messages/${messageId}/suggestion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          suggestion: {
            ...suggestion,
            applied,
            appliedAt: applied ? new Date() : undefined,
            originalContent: applied ? originalContent : undefined
          }
        }),
      });
    } catch (error) {
      console.error('Failed to update suggestion status:', error);
    }
  };

  const handleReject = (messageId: string, suggestionIndex: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.suggestions) {
        const newSuggestions = [...msg.suggestions];
        newSuggestions.splice(suggestionIndex, 1);
        return { ...msg, suggestions: newSuggestions };
      }
      return msg;
    }));
  };

  // Format message content with tab mentions
  const formatMessageContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const tabName = part.slice(1);
        const tab = tabs.find(t => t.title.toLowerCase() === tabName.toLowerCase());
        if (tab) {
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-1/20 border border-accent-1/30 text-accent-1 font-medium text-sm"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                tab.role === 'system'
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-blue-500/30 text-blue-300'
              }`}>
                {tab.role === 'system' ? 'S' : 'U'}
              </span>
              {tab.title}
            </span>
          );
        }
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-accent-1 to-accent-2 rounded-full shadow-2xl flex items-center justify-center z-40 hover:shadow-accent-1/50 transition-shadow"
        title="AI Assistant"
      >
        <Icon icon="lucide:sparkles" className="w-6 h-6 text-white" />
      </motion.button>

      {/* Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-bg-2 border-l border-white/14 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/14">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent-1 to-accent-2 rounded-xl flex items-center justify-center">
                    <Icon icon="lucide:sparkles" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">AI Assistant</h2>
                    <p className="text-xs text-white/60">Ask questions about your prompts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowChatList(!showChatList)}
                    className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors relative"
                    title="Chat History"
                  >
                    <Icon icon="lucide:history" className="w-5 h-5" />
                    {chats.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-1 rounded-full text-xs flex items-center justify-center font-bold">
                        {chats.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={createNewChat}
                    className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
                    title="New Chat"
                  >
                    <Icon icon="lucide:plus" className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <Icon icon="lucide:x" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat List Dropdown */}
              <AnimatePresence>
                {showChatList && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-white/14 bg-white/5 overflow-hidden"
                  >
                    <div className="max-h-64 overflow-y-auto p-4 space-y-2">
                      {chats.length === 0 ? (
                        <p className="text-center text-white/40 text-sm py-4">No chats yet</p>
                      ) : (
                        chats.map(chat => (
                          <div
                            key={chat.id}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                              currentChatId === chat.id
                                ? 'bg-accent-1/20 border border-accent-1/30'
                                : 'bg-white/5 border border-white/10 hover:bg-white/10'
                            }`}
                            onClick={() => switchChat(chat.id)}
                          >
                            <Icon icon="lucide:message-circle" className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{chat.title}</div>
                              <div className="text-xs text-white/40">
                                {chat.messages.length} messages
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                            >
                              <Icon icon="lucide:trash-2" className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Icon icon="lucide:message-circle" className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                    <p className="text-white/60 text-sm mb-4">
                      Ask me anything about your prompts. Use @ to mention specific tabs.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Improve this prompt', 'Make it shorter', 'Add examples'].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setInput(suggestion)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/14 rounded-lg text-xs transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center flex-shrink-0">
                        <Icon icon="lucide:sparkles" className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-accent-1/20 border border-accent-1/30'
                            : 'bg-white/5 border border-white/14'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <div className="text-sm whitespace-pre-wrap">
                            {formatMessageContent(message.content)}
                          </div>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-2 prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <div
                              key={idx}
                              className="bg-white/5 border border-white/14 rounded-xl p-4"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Icon 
                                    icon={suggestion.type === 'create' ? 'lucide:file-plus' : 'lucide:file-edit'} 
                                    className="w-4 h-4 text-accent-1" 
                                  />
                                  <span className="font-medium text-sm">
                                    {suggestion.type === 'create' ? suggestion.title : suggestion.tabTitle}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    suggestion.type === 'create'
                                      ? 'bg-green-500/20 text-green-400'
                                      : suggestion.type === 'replace'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {suggestion.type}
                                  </span>
                                  {suggestion.type === 'create' && (
                                    <span className="text-xs text-white/40">
                                      at position {suggestion.position}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-white/60 mb-3">{suggestion.explanation}</p>

                              {/* Preview */}
                              <details className="mb-3">
                                <summary className="cursor-pointer text-xs text-accent-1 hover:text-accent-2 transition-colors">
                                  View {suggestion.type === 'create' ? 'content' : 'changes'}
                                </summary>
                                <div className="mt-2 p-3 bg-black/30 rounded-lg border border-white/10">
                                  <pre className="text-xs whitespace-pre-wrap font-mono">
                                    {suggestion.newContent}
                                  </pre>
                                </div>
                              </details>

                              {/* Actions */}
                              {!suggestion.applied && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleApply(suggestion, message.id)}
                                    className="flex-1"
                                  >
                                    <Icon icon="lucide:check" className="w-4 h-4" />
                                    {suggestion.type === 'create' ? 'Create' : 'Apply'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReject(message.id, idx)}
                                    className="flex-1"
                                  >
                                    <Icon icon="lucide:x" className="w-4 h-4" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {suggestion.applied && (
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-green-400 flex items-center gap-1 flex-1">
                                    <Icon icon="lucide:check-circle" className="w-3 h-3" />
                                    Applied {suggestion.appliedAt && `at ${new Date(suggestion.appliedAt).toLocaleTimeString()}`}
                                  </div>
                                  {suggestion.type !== 'create' && suggestion.originalContent && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUndo(suggestion, message.id)}
                                      className="text-yellow-400 hover:text-yellow-300"
                                    >
                                      <Icon icon="lucide:undo" className="w-4 h-4" />
                                      Undo
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={`flex items-center gap-2 mt-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="text-xs text-white/40">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                        {message.role === 'user' && (
                          <button
                            onClick={() => deleteMessage(message.id)}
                            className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="lucide:user" className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-1 to-accent-2 flex items-center justify-center">
                      <Icon icon="lucide:sparkles" className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white/5 border border-white/14 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Mentions Dropdown */}
              {showMentions && filteredTabs.length > 0 && (
                <div
                  ref={mentionsRef}
                  className="absolute bg-bg-2 border border-white/14 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-10"
                  style={{
                    bottom: '140px',
                    left: '24px',
                    right: '24px',
                  }}
                >
                  {filteredTabs.slice(0, 5).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => insertMention(tab.title)}
                      className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                        tab.role === 'system'
                          ? 'bg-purple-500/25 text-purple-400'
                          : 'bg-blue-500/25 text-blue-400'
                      }`}>
                        {tab.role === 'system' ? 'S' : 'U'}
                      </span>
                      <span className="text-sm">{tab.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-6 border-t border-white/14">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Ask a question... (use @ to mention tabs)"
                      className="input min-h-[80px] resize-none pr-12"
                      disabled={isLoading}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-white/40">
                      {input.length}/2000
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="self-end"
                  >
                    <Icon icon="lucide:send" className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Tip: Use @TabName to reference specific tabs in your question
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
