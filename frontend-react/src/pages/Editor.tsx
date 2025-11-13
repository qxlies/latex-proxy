import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, Button, Input } from '../components/ui';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { tokenCount, getErrorMessage, debounce } from '../lib/utils';
import type { Tab } from '../types';

export function EditorPage() {
  const { getCurrentProfile, updateProfile, updateTab, removeTab, reorderTabs } = useStore();
  const profile = getCurrentProfile();

  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [tabTitle, setTabTitle] = useState('');
  const [tabContent, setTabContent] = useState('');
  const [tabRole, setTabRole] = useState<'system' | 'user'>('system');
  const [mergeRoles, setMergeRoles] = useState(true);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement | null>(null);

  // Resizable height state (desktop)
  const [paneHeight, setPaneHeight] = useState<number>(600);
  const panesRef = useRef<HTMLDivElement | null>(null);
  const isVResizingRef = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panesRef.current || !isVResizingRef.current) return;
      const rect = panesRef.current.getBoundingClientRect();

      const minH = 350;
      const maxH = 1000;
      const nextH = Math.max(minH, Math.min(maxH, Math.floor(e.clientY - rect.top)));
      setPaneHeight(nextH);
      e.preventDefault();
    };

    const onUp = () => {
      if (!isVResizingRef.current) return;
      isVResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);


 useEffect(() => {
    if (!roleOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [roleOpen]);

  const selectedTab = profile?.tabs.find((t) => t.id === selectedTabId);
  const isChatHistory = selectedTab?.content === '{chat_history}';
  const isProtectedTab = isChatHistory;

  useEffect(() => {
    if (profile) {
      setMergeRoles(profile.mergeConsecutiveRoles ?? true);
      if (!selectedTabId && profile.tabs.length > 0) {
        setSelectedTabId(profile.tabs[0].id);
      }
    }
  }, [profile, selectedTabId]);

  useEffect(() => {
    if (selectedTab) {
      setTabTitle(selectedTab.title);
      setTabContent(selectedTab.content);
      setTabRole(selectedTab.role);
    }
  }, [selectedTabId]);

  const saveTab = debounce(async (updates: Partial<Tab>) => {
    if (!profile || !selectedTabId) return;
    try {
      await api.updateTab(profile._id, selectedTabId, updates);
      updateTab(profile._id, selectedTabId, updates);
    } catch (err) {
      console.error('Failed to save tab:', err);
    }
  }, 500);

  const handleTitleChange = (value: string) => {
    setTabTitle(value);
    saveTab({ title: value });
  };

  const handleContentChange = (value: string) => {
    setTabContent(value);
    saveTab({ content: value });
  };

  const handleRoleChange = (value: 'system' | 'user') => {
    setTabRole(value);
    saveTab({ role: value });
  };

  const handleMergeRolesChange = async (checked: boolean) => {
    if (!profile) return;
    setMergeRoles(checked);
    try {
      await api.updateProfile(profile._id, { mergeConsecutiveRoles: checked });
      updateProfile(profile._id, { mergeConsecutiveRoles: checked });
    } catch (err) {
      console.error('Failed to update merge roles:', err);
    }
  };

  const handleAddTab = async () => {
    if (!profile) return;
    try {
      const newTab: Partial<Tab> = {
        role: 'system',
        title: 'New Tab',
        content: '',
        enabled: true,
      };
      const { tab } = await api.createTab(profile._id, newTab);

      setSelectedTabId(tab.id);

      const existing = [...profile.tabs];
      const chatIdx = existing.findIndex((t) => t.content === '{chat_history}');
     
      let chatTab: Tab | undefined;
      if (chatIdx !== -1) {
        chatTab = existing.splice(chatIdx, 1)[0];
      }
      const newOrder: Tab[] = [tab as Tab, ...existing];
      if (chatTab) newOrder.push(chatTab);

      reorderTabs(profile._id, newOrder);
      await api.moveTabs(profile._id, newOrder);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteTab = async (tabId: string) => {
    if (!profile) return;
    if (profile.tabs.length <= 1) {
      alert("Can't delete the last tab");
      return;
    }
    if (!confirm('Delete this tab?')) return;

    try {
      await api.deleteTab(profile._id, tabId);
      removeTab(profile._id, tabId);
      if (selectedTabId === tabId) {
        setSelectedTabId(profile.tabs[0]?.id || null);
      }
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleToggleTab = async (tab: Tab) => {
    if (!profile) return;
    try {
      await api.updateTab(profile._id, tab.id, { enabled: !tab.enabled });
      updateTab(profile._id, tab.id, { enabled: !tab.enabled });
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };


  const handleDragEnd = async (result: DropResult) => {
    if (!profile || !result.destination) return;

    const items = Array.from(profile.tabs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderTabs(profile._id, items);
    await api.moveTabs(profile._id, items);
  };

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="text-center py-12">
          <Icon icon="lucide:folder-x" className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h2 className="text-xl font-semibold mb-2">No Profile Selected</h2>
          <p className="text-white/60 mb-6">
            Please select or create a profile to start editing tabs
          </p>
          <Button variant="primary">
            <Icon icon="lucide:folder-plus" className="w-4 h-4" />
            Go to Profiles
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Tab Editor</h1>
          <p className="text-white/60">
            Profile: <span className="text-white font-medium">{profile.name}</span>
          </p>
        </div>
        
        {/* Merge Roles Toggle (custom switch) */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/14 rounded-xl px-4 py-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={mergeRoles}
            onClick={() => handleMergeRolesChange(!mergeRoles)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMergeRolesChange(!mergeRoles);
              }
            }}
            className={`relative inline-flex w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${
              mergeRoles ? 'bg-emerald-500' : 'bg-white/20'
            }`}
            title="Merge Consecutive Roles"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                mergeRoles ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Merge Consecutive Roles</span>
            <div className="group relative">
              <Icon icon="lucide:info" className="w-4 h-4 text-white/40 hover:text-white/60" />
              <div className="absolute right-0 left-auto top-full mt-2 w-64 max-w-[80vw] break-words p-3 bg-bg-2 border border-white/14 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity text-xs text-white/80 leading-relaxed pointer-events-none z-50">
                When enabled, consecutive messages with the same role will be merged into one. Disable for advanced experimentation.
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Editor Grid with Resizer */}
      <div className="flex flex-col gap-0">
        <div ref={panesRef} className="grid gap-6 items-stretch lg:grid-cols-[360px_1fr]" style={{ height: paneHeight }}>
          {/* Tabs List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="overflow-hidden"
          >
            <Card className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Tabs</h3>
              <Button variant="success" size="sm" onClick={handleAddTab}>
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add
              </Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tabs">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2"
                  >
                    {profile.tabs.map((tab, index) => (
                      <Draggable
                        key={tab.id}
                        draggableId={tab.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            onClick={() => setSelectedTabId(tab.id)}
                            className={`group rounded-xl border transition-all ${
                              snapshot.isDragging
                                ? 'shadow-xl scale-105 bg-white/10 border-accent-1/40'
                                : selectedTabId === tab.id
                                ? 'bg-accent-1/10 border-accent-1/40'
                                : tab.enabled
                                ? 'bg-white/5 border-white/14 hover:bg-white/8 cursor-pointer'
                                : 'bg-white/3 border-white/10 opacity-60 cursor-pointer'
                            }`}
                          >
                            <div className="p-3">
                              <div className="flex items-center gap-2 mb-2">
                                {/* Drag Handle */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/60 p-1 -m-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Icon icon="lucide:grip-vertical" className="w-4 h-4" />
                                </div>

                                {/* Role Badge */}
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                    tab.content === '{chat_history}'
                                      ? 'bg-yellow-500/25 border border-yellow-500/50 text-yellow-400'
                                      : tab.content.includes('{lorebooks}')
                                      ? 'bg-pink-500/25 border border-pink-500/50 text-pink-400'
                                      : tab.role === 'system'
                                      ? 'bg-purple-500/25 border border-purple-500/50 text-purple-400'
                                      : 'bg-blue-500/25 border border-blue-500/50 text-blue-400'
                                  }`}
                                >
                                  {tab.content === '{chat_history}'
                                    ? 'C'
                                    : tab.content.includes('{lorebooks}')
                                    ? 'L'
                                    : tab.role === 'system'
                                    ? 'S'
                                    : 'U'}
                                </span>

                                {/* Title */}
                                <span className="flex-1 font-medium text-sm truncate">
                                  {tab.title}
                                </span>

                                {/* Token Count */}
                                <span className="text-xs text-white/60 flex-shrink-0">
                                  {tokenCount(tab.content)}
                                </span>
                              </div>

                              {selectedTabId === tab.id && !(tab.content === '{chat_history}') && (
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTab(tab);
                                    }}
                                    className="flex-1 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                    title={tab.enabled ? 'Disable' : 'Enable'}
                                  >
                                    <Icon
                                      icon={tab.enabled ? 'lucide:eye' : 'lucide:eye-off'}
                                      className="w-3.5 h-3.5"
                                    />
                                    {tab.enabled ? 'Enabled' : 'Disabled'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTab(tab.id);
                                    }}
                                    className="flex-1 p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                    title="Delete"
                                  >
                                    <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Card>
          </motion.div>

          {/* Editor */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:flex-1"
          >
          {selectedTab ? (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Edit Tab</h3>
                {isProtectedTab && (
                  <span className="badge badge-warning text-xs">
                    <Icon icon="lucide:lock" className="w-3 h-3" />
                    Protected
                  </span>
                )}
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                {/* Role & Title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-2 font-medium">
                      Role
                    </label>
                    <div className="relative" ref={roleRef}>
                      <button
                        type="button"
                        onClick={() => !isProtectedTab && setRoleOpen((v) => !v)}
                        onBlur={() => setTimeout(() => setRoleOpen(false), 150)}
                        disabled={isProtectedTab}
                        className={`input flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${isProtectedTab ? 'cursor-not-allowed' : ''}`}
                      >
                        <span className="capitalize">{tabRole}</span>
                        <Icon icon="lucide:chevron-down" className="w-4 h-4 opacity-70" />
                      </button>
                      {roleOpen && !isProtectedTab && (
                        <div className="absolute z-20 mt-2 w-full bg-bg-2/95 backdrop-blur-sm border border-white/14 rounded-xl shadow-2xl overflow-hidden">
                          {(['system','user'] as const).map((role) => (
                            <button
                              key={role}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                handleRoleChange(role);
                                setRoleOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${tabRole === role ? 'text-accent-1' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold
                                  ${role === 'system' ? 'bg-purple-500/25 border border-purple-500/50 text-purple-400' : 'bg-blue-500/25 border border-blue-500/50 text-blue-400'}`}>
                                  {role === 'system' ? 'S' : 'U'}
                                </span>
                                <span className="capitalize">{role}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Title"
                    value={tabTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Tab title"
                    disabled={isProtectedTab}
                  />
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-white/60 font-medium">
                      Content
                    </label>
                    <span className="text-xs text-accent-1 font-medium">
                      {tokenCount(tabContent)} tokens
                    </span>
                  </div>
                  <textarea
                    value={tabContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    readOnly={isProtectedTab}
                    placeholder="Enter tab content..."
                    className="input min-h-[300px] font-mono text-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {isProtectedTab && (
                    <p className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                      <Icon icon="lucide:info" className="w-3 h-3" />
                      This is a special system tab and cannot be edited
                    </p>
                  )}
                </div>

                {/* Placeholders Help */}
                <details className="bg-white/5 border border-white/14 rounded-xl p-4">
                  <summary className="cursor-pointer font-medium text-sm flex items-center gap-2">
                    <Icon icon="lucide:help-circle" className="w-4 h-4" />
                    Available Placeholders
                  </summary>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[
                      '{bot_persona}',
                      '{scenario}',
                      '{user_persona}',
                      '{summary}',
                      '{example_dialogs}',
                      '{lorebooks}',
                      '{{user}}',
                      '{{char}}',
                    ].map((placeholder) => (
                      <code
                        key={placeholder}
                        className="bg-accent-1/10 border border-accent-1/25 text-accent-1 px-2 py-1 rounded font-mono"
                      >
                        {placeholder}
                      </code>
                    ))}
                  </div>
                </details>
              </div>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <Icon icon="lucide:file-text" className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <h3 className="text-lg font-semibold mb-2">No Tab Selected</h3>
              <p className="text-white/60">
                Select a tab from the list or create a new one
              </p>
            </Card>
            )}
          </motion.div>
        </div>

        {/* Vertical resize handle for both panes (desktop) */}
        <div
          className="hidden lg:flex items-center justify-center cursor-row-resize bg-white/10 hover:bg-accent-1/30 active:bg-accent-1/40 transition-colors rounded-lg mt-2"
          onMouseDown={() => {
            isVResizingRef.current = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
          }}
          style={{ height: '10px', borderRadius: '6px' }}
        >
          <div className="flex gap-1">
            <div className="w-10 h-1 bg-white/40 rounded-full" />
            <div className="w-10 h-1 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}