import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, Button, Input, ModalDisclosure, ToggleSwitch, PopoverSelect, ConfirmModal } from '../components/ui';
import { Link } from 'react-router-dom';
import { EditorAssistant } from '../components/EditorAssistant';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { tokenCount, getErrorMessage, debounce } from '../lib/utils';
import { notify } from '../store/notifications';
import type { Tab } from '../types';

export function EditorPage() {
  const { getCurrentProfile, updateProfile, updateTab, removeTab, reorderTabs } = useStore();
  const profile = getCurrentProfile();

  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [tabTitle, setTabTitle] = useState('');
  const [tabContent, setTabContent] = useState('');
  const [tabRole, setTabRole] = useState<Tab['role']>('system');
  const [mergeRoles, setMergeRoles] = useState(true);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement | null>(null);

  // Resizable height state (desktop)
  const [paneHeight, setPaneHeight] = useState<number>(600);
  const panesRef = useRef<HTMLDivElement | null>(null);
  const isVResizingRef = useRef(false);

  // Workshop publish/update modals state
  const [publishOpen, setPublishOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  // Confirm delete tab modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTabId, setDeleteTabId] = useState<string | null>(null);

  // Publish fields
  const [pubTitle, setPubTitle] = useState(profile?.name || '');
  const [pubDescription, setPubDescription] = useState('');
  const [pubPreferredModels, setPubPreferredModels] = useState('');
  const [pubProviderType, setPubProviderType] = useState<string>('');
  const [pubIncludeAllTabs, setPubIncludeAllTabs] = useState(true);

  // Update fields
  const [updChangelog, setUpdChangelog] = useState('');
  const [updTitle, setUpdTitle] = useState<string>('');
  const [updDescription, setUpdDescription] = useState<string>('');
  const [updPreferredModels, setUpdPreferredModels] = useState<string>('');
  const [updProviderType, setUpdProviderType] = useState<string>('');
  const [updIncludeAllTabs, setUpdIncludeAllTabs] = useState<boolean>(true);

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
  const totalTokens = useMemo(
    () => (profile ? profile.tabs.reduce((sum, t) => sum + tokenCount(t.content), 0) : 0),
    [profile?.tabs]
  );

  useEffect(() => {
    if (profile) {
      setMergeRoles(profile.mergeConsecutiveRoles ?? true);
      if (!selectedTabId && profile.tabs.length > 0) {
        setSelectedTabId(profile.tabs[0].id);
      }
    }
  }, [profile, selectedTabId]);

  useEffect(() => {
    setPubTitle(profile?.name || '');
    setUpdIncludeAllTabs(profile?.workshopIncludeAllTabs ?? true);
  }, [profile?._id]);

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

  const handleRoleChange = (value: Tab['role']) => {
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
      
      if (chatIdx !== -1) {
        existing.splice(chatIdx, 0, tab as Tab);
      } else {
        existing.push(tab as Tab);
      }

      reorderTabs(profile._id, existing);
      await api.moveTabs(profile._id, existing);
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const requestDeleteTab = (tabId: string) => {
    setDeleteTabId(tabId);
    setDeleteOpen(true);
  };

  const confirmDeleteTab = async () => {
    if (!profile || !deleteTabId) {
      setDeleteOpen(false);
      return;
    }
    if (profile.tabs.length <= 1) {
      notify("Can't delete the last tab", 'warning');
      setDeleteOpen(false);
      setDeleteTabId(null);
      return;
    }
    try {
      await api.deleteTab(profile._id, deleteTabId);
      removeTab(profile._id, deleteTabId);
      if (selectedTabId === deleteTabId) {
        setSelectedTabId(profile.tabs[0]?.id || null);
      }
      notify('Tab deleted', 'success');
    } catch (err) {
      notify(getErrorMessage(err as any), 'error');
    } finally {
      setDeleteOpen(false);
      setDeleteTabId(null);
    }
  };

  const handleToggleTab = async (tab: Tab) => {
    if (!profile) return;
    try {
      await api.updateTab(profile._id, tab.id, { enabled: !tab.enabled });
      updateTab(profile._id, tab.id, { enabled: !tab.enabled });
    } catch (err) {
      notify(getErrorMessage(err), 'error');
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

  const handleApplySuggestion = async (tabId: string, newContent: string) => {
    if (!profile) return;
    try {
      await api.updateTab(profile._id, tabId, { content: newContent });
      updateTab(profile._id, tabId, { content: newContent });
      
      // If this is the selected tab, update the local state
      if (selectedTabId === tabId) {
        setTabContent(newContent);
      }
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const handleCreateTabFromAI = async (
    title: string,
    role: Tab['role'],
    content: string,
    position: number
  ) => {
    if (!profile) return;
    try {
      const newTab: Partial<Tab> = {
        role,
        title,
        content,
        enabled: true,
      };
      const { tab } = await api.createTab(profile._id, newTab);

      const existing = [...profile.tabs];
      const chatIdx = existing.findIndex((t) => t.content === '{chat_history}');

      let insertPos = position;

      if (chatIdx !== -1 && position >= chatIdx) {
        insertPos = chatIdx;
      }
      
      existing.splice(insertPos, 0, tab as Tab);

      reorderTabs(profile._id, existing);
      await api.moveTabs(profile._id, existing);
      
      setSelectedTabId(tab.id);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

 const parseModels = (s: string) => s.split(',').map(m => m.trim()).filter(Boolean);

 const handlePublishSubmit = async () => {
   if (!profile) return;
   try {
     const { profile: wp } = await api.publishWorkshop({
       profileId: profile._id,
       title: (pubTitle && pubTitle.trim()) || profile.name,
       description: pubDescription,
       preferredModels: parseModels(pubPreferredModels),
       preferredProviderType: pubProviderType,
       includeAllTabs: pubIncludeAllTabs,
     });
     // Update local linkage metadata optimistically
     updateProfile(profile._id, {
       workshopPublishedId: (wp as any)._id,
       workshopIncludeAllTabs: pubIncludeAllTabs,
     } as any);
     setPublishOpen(false);
     notify('Published to Workshop', 'success');
   } catch (err) {
     notify(getErrorMessage(err as any), 'error');
   }
 };

 // Prefill Update modal with current Workshop metadata
 const openUpdateModal = async () => {
   if (!profile?.workshopPublishedId) {
     setUpdateOpen(true);
     return;
   }
   try {
     const res = await api.getWorkshopDetail(profile.workshopPublishedId, { includeAllVersions: false, versionsLimit: 1 });
     const wp = (res as any).profile;
     const last = (res as any).versions?.[0];

     setUpdTitle(wp?.title ?? '');
     setUpdDescription(wp?.description ?? '');
     setUpdPreferredModels(Array.isArray(wp?.preferredModels) ? wp.preferredModels.join(', ') : '');
     setUpdProviderType((wp?.preferredProviderType as any) || '');
     if (last && typeof last.includeAllTabs === 'boolean') {
       setUpdIncludeAllTabs(!!last.includeAllTabs);
     }
   } catch {
     // ignore and still open
   } finally {
     setUpdateOpen(true);
   }
 };

 const handleUpdateSubmit = async () => {
   if (!profile || !profile.workshopPublishedId) return;
   try {
     await api.updateWorkshop(profile.workshopPublishedId, {
       profileId: profile._id,
       changelog: updChangelog,
       title: updTitle && updTitle.trim() ? updTitle.trim() : undefined,
       description: updDescription !== '' ? updDescription : undefined,
       preferredModels: updPreferredModels ? parseModels(updPreferredModels) : undefined,
       preferredProviderType: updProviderType || undefined,
       includeAllTabs: updIncludeAllTabs,
     });
     setUpdateOpen(false);
     notify('Workshop publication updated', 'success');
   } catch (err) {
     notify(getErrorMessage(err as any), 'error');
   }
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
          <p className="text-white/60 mt-1">
            Total tokens (all tabs): <span className="text-accent-1 font-semibold">{totalTokens}</span>
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
        {/* Workshop Publish/Update */}
        <div className="flex items-center gap-2">
          {profile.workshopPublishedId ? (
            <>
              <Button variant="primary" onClick={openUpdateModal}>
                <Icon icon="lucide:upload" className="w-4 h-4" />
                Update
              </Button>
              <Link to={`/workshop/${profile.workshopPublishedId}`}>
                <Button variant="ghost">
                  <Icon icon="lucide:external-link" className="w-4 h-4" />
                  View
                </Button>
              </Link>
            </>
          ) : (
            <Button variant="success" onClick={() => setPublishOpen(true)}>
              <Icon icon="lucide:rocket" className="w-4 h-4" />
              Publish
            </Button>
          )}

          {/* Linked profile controls */}
          {profile.workshopLinkedId && (
            <div className="flex items-center gap-2 ml-3">
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <Icon icon="lucide:link" className="w-3.5 h-3.5" />
                Linked{profile.workshopAutoUpdate ? ' (auto)' : ''}
              </span>
              <ToggleSwitch
                checked={!!profile.workshopAutoUpdate}
                onChange={async (v) => {
                  try {
                    await api.updateProfile(profile._id, { workshopAutoUpdate: v } as any);
                    updateProfile(profile._id, { workshopAutoUpdate: v } as any);
                    notify(`Auto-update ${v ? 'enabled' : 'disabled'}`, 'success');
                  } catch (err) {
                    notify(getErrorMessage(err as any), 'error');
                  }
                }}
                label="Auto-update"
              />
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    const { profile: p } = await api.syncLinkedProfile(profile._id);
                    updateProfile(profile._id, p as any);
                    notify('Linked profile synced', 'success');
                  } catch (err) {
                    notify(getErrorMessage(err as any), 'error');
                  }
                }}
              >
                <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                Sync
              </Button>
              <Link to={`/workshop/${profile.workshopLinkedId}`}>
                <Button variant="ghost">
                  <Icon icon="lucide:external-link" className="w-4 h-4" />
                  View
                </Button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* Editor Grid with Resizer */}
      <div className="flex flex-col gap-0">
        <div ref={panesRef} className="grid gap-6 items-stretch lg:grid-cols-[360px_1fr]" style={{ height: window.innerWidth >= 1024 ? paneHeight : 'auto' }}>
          {/* Tabs List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:overflow-hidden"
          >
            <Card className="lg:h-full flex flex-col lg:overflow-hidden">
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
                                : 'bg-white/3 border-white/20 cursor-pointer'
                            } ${!tab.enabled ? 'border-dashed' : 'border-solid'}`}
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
                                    !tab.enabled
                                      ? 'bg-white/8 border border-white/20 text-white/50'
                                      : tab.content === '{chat_history}'
                                      ? 'bg-yellow-500/25 border border-yellow-500/50 text-yellow-400'
                                      : tab.content.includes('{lorebooks}')
                                      ? 'bg-pink-500/25 border border-pink-500/50 text-pink-400'
                                      : tab.role === 'system'
                                      ? 'bg-purple-500/25 border border-purple-500/50 text-purple-400'
                                      : tab.role === 'assistant'
                                      ? 'bg-blue-500/25 border border-blue-500/50 text-blue-400'
                                      : 'bg-blue-500/25 border border-blue-500/50 text-blue-400'
                                  }`}
                                >
                                  {tab.content === '{chat_history}' ? (
                                    'C'
                                  ) : tab.content.includes('{lorebooks}') ? (
                                    'L'
                                  ) : tab.role === 'system' ? (
                                    'S'
                                  ) : tab.role === 'assistant' ? (
                                    <Icon icon="lucide:bot" className="w-3.5 h-3.5" />
                                  ) : (
                                    'U'
                                  )}
                                </span>

                                {/* Title */}
                                <span className={`flex-1 font-medium text-sm truncate ${!tab.enabled ? (selectedTabId === tab.id ? 'text-white/80' : 'text-white/50') : ''}`}>
                                  {tab.title}
                                </span>

                                {/* Token Count */}
                                <span className={`text-xs flex-shrink-0 ${!tab.enabled ? (selectedTabId === tab.id ? 'text-white/50' : 'text-white/40') : 'text-white/60'}`}>
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
                                      requestDeleteTab(tab.id);
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
          >
          {selectedTab ? (
            <Card className="lg:h-full flex flex-col lg:overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Edit Tab</h3>
                {isProtectedTab && (
                  <span className="badge badge-warning text-xs">
                    <Icon icon="lucide:lock" className="w-3 h-3" />
                    Protected
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 flex flex-col overflow-hidden gap-3">
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
                          {(['system','user','assistant'] as const).map((role) => (
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
                                  ${
                                    role === 'system'
                                      ? 'bg-purple-500/25 border border-purple-500/50 text-purple-400'
                                      : 'bg-blue-500/25 border border-blue-500/50 text-blue-400'
                                  }`}>
                                  {role === 'system' ? 'S' : role === 'assistant' ? <Icon icon="lucide:bot" className="w-3.5 h-3.5" /> : 'U'}
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
                <div className="flex flex-col min-h-0 flex-1">
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
                    className="input flex-1 min-h-0 max-h-full font-mono text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {isProtectedTab && (
                    <p className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                      <Icon icon="lucide:info" className="w-3 h-3" />
                      This is a special system tab and cannot be edited
                    </p>
                  )}
                </div>

                {/* Placeholders Help */}
                <div className="mt-auto bg-white/5 border border-white/14 rounded-xl p-4 flex-shrink-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <Icon icon="lucide:help-circle" className="w-4 h-4" />
                    Available Placeholders
                  </div>
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
                </div>
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

      {/* Confirm Delete Tab Modal */}
      <ConfirmModal
        open={deleteOpen}
        title="Delete this tab?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={confirmDeleteTab}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteTabId(null);
        }}
      />

      {/* Publish Modal */}
      {publishOpen && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl" onClick={() => setPublishOpen(false)} />
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <Card className="w-full max-w-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold">Publish to Workshop</div>
                <button className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center" onClick={() => setPublishOpen(false)}>
                  <Icon icon="lucide:x" className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <Input
                  label="Title"
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  placeholder="Publication title"
                />
                <div>
                  <label className="block text-xs text-white/60 mb-2 font-medium">Description (Markdown)</label>
                  <textarea
                    className="input min-h-[120px]"
                    value={pubDescription}
                    onChange={(e) => setPubDescription(e.target.value)}
                    placeholder="Describe your profile..."
                  />
                </div>
                <Input
                  label="Preferred models (comma-separated)"
                  value={pubPreferredModels}
                  onChange={(e) => setPubPreferredModels(e.target.value)}
                  placeholder="gpt-4o, x-ai/grok-4, deepseek/deepseek-r1"
                />
                <div>
                  <label className="block text-xs text-white/60 mb-2 font-medium">Preferred provider</label>
                  <PopoverSelect<string>
                    value={(pubProviderType as any) || ''}
                    onChange={(val: string) => setPubProviderType(val)}
                    placeholder="None"
                    options={[
                      { value: 'openrouter' as any, label: 'openrouter' },
                      { value: 'aistudio' as any, label: 'aistudio' },
                      { value: 'gorouter' as any, label: 'gorouter' },
                      // { value: 'free' as any, label: 'free' },
                      { value: 'custom' as any, label: 'custom' },
                      { value: '' as any, label: 'None' },
                    ]}
                    renderBadge={(val: string) => (
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        val === 'openrouter' ? 'bg-blue-500/25 border border-blue-500/50 text-blue-400'
                        : val === 'aistudio' ? 'bg-orange-500/25 border border-orange-500/50 text-orange-400'
                        : val === 'gorouter' ? 'bg-green-500/25 border border-green-500/50 text-green-400'
                        : val === 'custom' ? 'bg-purple-500/25 border border-purple-500/50 text-purple-400'
                        // : val === 'free' ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-400'
                        : 'bg-white/10 border border-white/20 text-white/60'
                      }`}>
                        {(val || 'N').slice(0,1).toUpperCase()}
                      </span>
                    )}
                  />
                </div>
                <ToggleSwitch
                  checked={pubIncludeAllTabs}
                  onChange={setPubIncludeAllTabs}
                  label="Include all tabs (not only enabled)"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setPublishOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handlePublishSubmit}>
                  <Icon icon="lucide:rocket" className="w-4 h-4" />
                  Publish
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Update Modal */}
      {updateOpen && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl" onClick={() => setUpdateOpen(false)} />
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <Card className="w-full max-w-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold">Update Publication</div>
                <button className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center" onClick={() => setUpdateOpen(false)}>
                  <Icon icon="lucide:x" className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-2 font-medium">Changelog (Markdown)</label>
                  <textarea
                    className="input min-h-[120px]"
                    value={updChangelog}
                    onChange={(e) => setUpdChangelog(e.target.value)}
                    placeholder="What changed in this version?"
                  />
                </div>

                <ModalDisclosure title="Update metadata (optional)">
                  <Input
                    label="New title (optional)"
                    value={updTitle}
                    onChange={(e) => setUpdTitle(e.target.value)}
                    placeholder="Leave empty to keep current"
                  />
                  <div className="mt-3">
                    <label className="block text-xs text-white/60 mb-2 font-medium">New description (optional, Markdown)</label>
                    <textarea
                      className="input min-h-[100px]"
                      value={updDescription}
                      onChange={(e) => setUpdDescription(e.target.value)}
                      placeholder="Leave empty to keep current"
                    />
                  </div>
                  <Input
                    label="Preferred models (override, comma-separated; optional)"
                    value={updPreferredModels}
                    onChange={(e) => setUpdPreferredModels(e.target.value)}
                    placeholder="Leave empty to keep current"
                  />
                  <div className="mt-3">
                    <label className="block text-xs text-white/60 mb-2 font-medium">Preferred provider (override; optional)</label>
                    <PopoverSelect<string>
                      value={(updProviderType as any) || ''}
                      onChange={(val: string) => setUpdProviderType(val)}
                      placeholder="Keep current"
                      options={[
                        { value: 'openrouter' as any, label: 'openrouter' },
                        { value: 'aistudio' as any, label: 'aistudio' },
                        { value: 'gorouter' as any, label: 'gorouter' },
                        // { value: 'free' as any, label: 'free' },
                        { value: 'custom' as any, label: 'custom' },
                        { value: '' as any, label: 'Keep current' },
                      ]}
                      renderBadge={(val: string) => (
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          val === 'openrouter' ? 'bg-blue-500/25 border border-blue-500/50 text-blue-400'
                          : val === 'aistudio' ? 'bg-orange-500/25 border border-orange-500/50 text-orange-400'
                          : val === 'gorouter' ? 'bg-green-500/25 border border-green-500/50 text-green-400'
                          : val === 'custom' ? 'bg-purple-500/25 border border-purple-500/50 text-purple-400'
                          // : val === 'free' ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-400'
                          : 'bg-white/10 border border-white/20 text-white/60'
                        }`}>
                          {(val || 'K').slice(0,1).toUpperCase()}
                        </span>
                      )}
                    />
                  </div>
                  <div className="mt-3">
                    <ToggleSwitch
                      checked={updIncludeAllTabs}
                      onChange={setUpdIncludeAllTabs}
                      label="Include all tabs (not only enabled)"
                    />
                  </div>
                </ModalDisclosure>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setUpdateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleUpdateSubmit}>
                  <Icon icon="lucide:upload" className="w-4 h-4" />
                  Update
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* AI Assistant */}
      <EditorAssistant
        profileId={profile._id}
        tabs={profile.tabs}
        onApplySuggestion={handleApplySuggestion}
        onCreateTab={handleCreateTabFromAI}
      />
    </div>
  );
}