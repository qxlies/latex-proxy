import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import ReactMarkdown from 'react-markdown';
import { Button, Card } from '../components/ui';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import type { ContentFilter, FilterGroup, LastRequestData, AISuggestion } from '../types';

export function ContentFiltersPage() {
  const { user, setUser } = useStore();
  const [filters, setFilters] = useState<ContentFilter[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [lastRequestData, setLastRequestData] = useState<LastRequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newPattern, setNewPattern] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [expandedPlaceholder, setExpandedPlaceholder] = useState<string | null>(null);
  const [editingFilter, setEditingFilter] = useState<ContentFilter | null>(null);
  const [editPattern, setEditPattern] = useState('');
  const [editReplacement, setEditReplacement] = useState('');
  const [clickedFilter, setClickedFilter] = useState<ContentFilter | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [currentAnalysisGroup, setCurrentAnalysisGroup] = useState<string | null>(null);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameGroupValue, setRenameGroupValue] = useState('');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      setIsLoading(true);
      const data = await api.getContentFilters();
      setFilters(data.contentFilters || []);
      setFilterGroups(data.filterGroups || []);
      setLastRequestData(data.lastRequestData || null);
    } catch (error) {
      console.error('Failed to load content filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFilter = async () => {
    if (!newPattern.trim()) return;

    try {
      const { filter } = await api.createContentFilter({
        pattern: newPattern,
        replacement: newReplacement.trim() || null,
        caseSensitive,
        group: null, // Manual filters go to General group
      });
      setFilters([...filters, filter]);
      setNewPattern('');
      setNewReplacement('');
      setCaseSensitive(false);
    } catch (error) {
      console.error('Failed to create filter:', error);
      alert('Failed to create filter');
    }
  };

  const handleToggleFilter = async (filterId: string, enabled: boolean) => {
    try {
      const { filter } = await api.updateContentFilter(filterId, { enabled });
      setFilters(filters.map((f) => (f.id === filterId ? filter : f)));
    } catch (error) {
      console.error('Failed to toggle filter:', error);
    }
  };

  const handleDeleteFilter = async (filterId: string) => {
    if (!confirm('Are you sure you want to delete this filter?')) return;

    try {
      await api.deleteContentFilter(filterId);
      setFilters(filters.filter((f) => f.id !== filterId));
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString();
    
    if (text && text.trim().length > 0) {
      setSelectedText(text);
      
      // Get selection position
      const range = selection?.getRangeAt(0);
      if (range) {
        setSelectionRect(range.getBoundingClientRect());
      }
    } else {
      setSelectedText('');
      setSelectionRect(null);
    }
  };

  const handleBlockSelected = async () => {
    if (!selectedText) return;
    
    try {
      const { filter } = await api.createContentFilter({
        pattern: selectedText,
        caseSensitive: false,
      });
      setFilters([...filters, filter]);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to create filter:', error);
      alert('Failed to create filter');
    }
  };

  const handleFilterClick = (filter: ContentFilter, e: React.MouseEvent) => {
    e.stopPropagation();
    setClickedFilter(clickedFilter?.id === filter.id ? null : filter);
  };

  const handleRemoveFilter = async (filterId: string) => {
    try {
      await api.deleteContentFilter(filterId);
      setFilters(filters.filter((f) => f.id !== filterId));
      setClickedFilter(null);
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
  };

  const handleToggleFilterFromText = async (filter: ContentFilter) => {
    try {
      const { filter: updated } = await api.updateContentFilter(filter.id, { 
        enabled: !filter.enabled 
      });
      setFilters(filters.map((f) => (f.id === filter.id ? updated : f)));
      setClickedFilter(null);
    } catch (error) {
      console.error('Failed to toggle filter:', error);
    }
  };

  const highlightBannedText = (text: string, placeholder: string): React.ReactNode => {
    if (!filters.length) return text;

    let result: React.ReactNode[] = [];
    let lastIndex = 0;
    const matches: Array<{ 
      start: number; 
      end: number; 
      filter: ContentFilter;
    }> = [];

    // Find all matches
    filters.forEach(filter => {
      try {
        // Escape special regex characters if it's plain text
        const pattern = filter.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(pattern, filter.caseSensitive ? 'g' : 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            filter
          });
        }
      } catch (e) {
        // Invalid regex, skip
      }
    });

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Merge overlapping matches
    const mergedMatches: Array<{ 
      start: number; 
      end: number; 
      filter: ContentFilter;
    }> = [];
    matches.forEach(match => {
      if (mergedMatches.length === 0) {
        mergedMatches.push(match);
      } else {
        const last = mergedMatches[mergedMatches.length - 1];
        if (match.start <= last.end) {
          last.end = Math.max(last.end, match.end);
        } else {
          mergedMatches.push(match);
        }
      }
    });

    // Build result with highlights
    mergedMatches.forEach((match, i) => {
      // Add text before match
      if (lastIndex < match.start) {
        result.push(text.substring(lastIndex, match.start));
      }
      
      // Different colors for enabled/disabled filters
      const bgColor = match.filter.enabled 
        ? 'bg-red-500/20 hover:bg-red-500/30' 
        : 'bg-white/10 hover:bg-white/15';
      const textColor = match.filter.enabled 
        ? 'text-red-300' 
        : 'text-white/40';
      
      // Add highlighted match with click handler
      result.push(
        <span 
          key={`${placeholder}-${i}`}
          className={`${bgColor} ${textColor} px-0.5 rounded cursor-pointer transition-colors`}
          onClick={(e) => handleFilterClick(match.filter, e)}
          title={match.filter.enabled ? 'Click to manage filter' : 'Filter disabled'}
        >
          {text.substring(match.start, match.end)}
        </span>
      );
      lastIndex = match.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }

    return result.length > 0 ? result : text;
  };

  const openEditModal = (filter: ContentFilter) => {
    setEditingFilter(filter);
    setEditPattern(filter.pattern);
    setEditReplacement(filter.replacement || '');
  };

  const closeEditModal = () => {
    setEditingFilter(null);
    setEditPattern('');
    setEditReplacement('');
  };

  const handleSaveEdit = async () => {
    if (!editingFilter || !editPattern.trim()) return;

    try {
      const { filter } = await api.updateContentFilter(editingFilter.id, {
        pattern: editPattern,
        replacement: editReplacement.trim() || null,
      });
      setFilters(filters.map((f) => (f.id === editingFilter.id ? filter : f)));
      closeEditModal();
    } catch (error) {
      console.error('Failed to update filter:', error);
      alert('Failed to update filter');
    }
  };

  const toggleLogging = async () => {
    if (!user) return;
    try {
      await api.updateUserLogging(!user.isLoggingEnabled);
      setUser({ ...user, isLoggingEnabled: !user.isLoggingEnabled });
    } catch (error) {
      console.error('Failed to toggle logging:', error);
    }
  };

  const handleAiAnalysis = async () => {
    if (!aiQuestion.trim() || !lastRequestData) return;

    try {
      setIsAnalyzing(true);
      const result = await api.analyzePrompt(aiQuestion);
      
      // Split by separator (---) to separate analysis from blocks
      let cleanAnalysis = result.analysis;
      const separatorIndex = cleanAnalysis.indexOf('---');
      
      if (separatorIndex !== -1) {
        cleanAnalysis = cleanAnalysis.substring(0, separatorIndex).trim();
      } else {
        const blockRegex = /<block>[\s\S]*?<\/block>/g;
        cleanAnalysis = cleanAnalysis.replace(blockRegex, '').trim();
      }
      
      // Generate unique group name for this analysis
      const groupName = `Analysis #${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      setAiAnalysis(cleanAnalysis);
      setAiSuggestions(result.suggestions || []);
      setCurrentAnalysisGroup(groupName);
      setAddedSuggestions(new Set());
    } catch (error) {
      console.error('Failed to analyze prompt:', error);
      alert('Failed to analyze prompt. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestion = async (suggestion: AISuggestion, index: number) => {
    try {
      const { filter } = await api.createContentFilter({
        pattern: suggestion.pattern,
        replacement: suggestion.replacement || null,
        caseSensitive: false,
        group: currentAnalysisGroup,
      });
      setFilters([...filters, filter]);
      setAddedSuggestions(prev => new Set(prev).add(index));
    } catch (error) {
      console.error('Failed to create filter from suggestion:', error);
      alert('Failed to create filter');
    }
  };

  const handleAddAllSuggestions = async () => {
    if (aiSuggestions.length === 0) return;
    
    try {
      const filtersToAdd = aiSuggestions.map(suggestion => ({
        pattern: suggestion.pattern,
        replacement: suggestion.replacement || null,
        caseSensitive: false,
        group: currentAnalysisGroup,
      }));
      
      const { filters: newFilters } = await api.createContentFiltersBulk(filtersToAdd);
      setFilters([...filters, ...newFilters]);
      setAddedSuggestions(new Set(aiSuggestions.map((_, i) => i)));
    } catch (error) {
      console.error('Failed to add all suggestions:', error);
      alert('Failed to add all suggestions');
    }
  };

  const handleToggleGroup = async (group: string | null, enabled: boolean) => {
    try {
      // For null group, pass 'null' as string to match backend expectation
      const groupKey = group === null ? 'null' : group;
      await api.toggleGroupFilters(groupKey, enabled);
      setFilters(filters.map(f => {
        // Match if group is the same, or both are null/undefined
        const matches = group === null
          ? (f.group === null || f.group === undefined)
          : f.group === group;
        return matches ? { ...f, enabled } : f;
      }));
    } catch (error) {
      console.error('Failed to toggle group:', error);
    }
  };

  const handleDeleteGroup = async (group: string | null) => {
    const groupName = group || 'General';
    if (!confirm(`Delete all filters in "${groupName}" group?`)) return;
    
    try {
      // For null group, pass 'null' as string to match backend expectation
      const groupKey = group === null ? 'null' : group;
      await api.deleteGroupFilters(groupKey);
      // Filter out items where group matches OR both are null/undefined
      setFilters(filters.filter(f => {
        if (group === null) {
          return f.group !== null && f.group !== undefined;
        }
        return f.group !== group;
      }));
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const toggleGroupCollapse = (group: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

  const handleRenameGroup = async (groupId: string) => {
    if (!renameGroupValue.trim()) return;
    
    try {
      await api.renameFilterGroup(groupId, renameGroupValue.trim());
      setFilterGroups(prev => {
        const existing = prev.find(g => g.id === groupId);
        if (existing) {
          return prev.map(g => g.id === groupId ? { ...g, name: renameGroupValue.trim() } : g);
        } else {
          return [...prev, { id: groupId, name: renameGroupValue.trim(), createdAt: new Date().toISOString() }];
        }
      });
      setRenamingGroup(null);
      setRenameGroupValue('');
    } catch (error) {
      console.error('Failed to rename group:', error);
      alert('Failed to rename group');
    }
  };

  const getGroupDisplayName = (groupId: string | null): string => {
    if (!groupId) return 'General';
    const group = filterGroups.find(g => g.id === groupId);
    return group?.name || groupId;
  };

  // Group filters
  const groupedFilters = filters.reduce((acc, filter) => {
    const groupKey = filter.group || 'General';
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(filter);
    return acc;
  }, {} as Record<string, ContentFilter[]>);

  const placeholderLabels: Record<string, string> = {
    user: 'User Name',
    char: 'Character Name',
    bot_persona: 'Bot Persona',
    scenario: 'Scenario',
    user_persona: 'User Persona',
    summary: 'Summary',
    lorebooks: 'Lorebooks',
    example_dialogs: 'Example Dialogs',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Filters</h1>
          <p className="text-white/60 mt-1">
            Block specific text patterns from being sent to the model
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60">Request Logging</span>
          <button
            onClick={toggleLogging}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              user?.isLoggingEnabled ? 'bg-emerald-500' : 'bg-white/20'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                user?.isLoggingEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      {!user?.isLoggingEnabled && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-start gap-3">
            <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-400">Logging Disabled</h3>
              <p className="text-sm text-white/70 mt-1">
                Enable request logging to preview incoming data and create filters from selected text.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* AI Prompt Analyzer */}
      {user?.isLoggingEnabled && lastRequestData && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Icon icon="lucide:sparkles" className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-purple-400">AI Prompt Analyzer</h3>
                <p className="text-sm text-white/60">
                  Get professional analysis and suggestions for your prompt
                </p>
              </div>
            </div>
            <Icon
              icon={showAiPanel ? 'lucide:chevron-up' : 'lucide:chevron-down'}
              className="w-5 h-5 text-white/60"
            />
          </button>

          <AnimatePresence>
            {showAiPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4">
                  {/* Question Input */}
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">
                      Ask the AI about your prompt:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        placeholder="e.g., 'Analyze this prompt for potential issues' or 'How can I improve this?'"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAiAnalysis();
                          }
                        }}
                        disabled={isAnalyzing}
                      />
                      <Button
                        onClick={handleAiAnalysis}
                        disabled={!aiQuestion.trim() || isAnalyzing}
                        className="bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Icon icon="lucide:send" className="w-4 h-4" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-white/40 mt-1">Press Enter to analyze</p>
                  </div>

                  {/* AI Analysis Result */}
                  {aiAnalysis && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Analysis Text with Markdown */}
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon icon="lucide:brain" className="w-4 h-4 text-purple-400" />
                          <h4 className="font-semibold text-sm">Analysis</h4>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-semibold text-white mb-2 mt-3">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-semibold text-white/90 mb-1 mt-2">{children}</h3>,
                              p: ({ children }) => <p className="text-sm text-white/80 mb-2 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside text-sm text-white/80 mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-white/80 mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="text-white/80">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                              em: ({ children }) => <em className="italic text-white/90">{children}</em>,
                              code: ({ children }) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono text-purple-300">{children}</code>,
                              pre: ({ children }) => <pre className="bg-white/10 p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                            }}
                          >
                            {aiAnalysis}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Suggestions */}
                      {aiSuggestions.length > 0 && (
                        <div className="bg-white/5 border border-emerald-500/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Icon icon="lucide:lightbulb" className="w-4 h-4 text-emerald-400" />
                            <h4 className="font-semibold text-sm text-emerald-400">
                              Suggested Blocks ({aiSuggestions.length})
                            </h4>
                          </div>
                          <div className="space-y-3">
                            {/* Add All Button */}
                            <div className="flex justify-end">
                              <Button
                                onClick={handleAddAllSuggestions}
                                disabled={addedSuggestions.size === aiSuggestions.length}
                                className="bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30"
                              >
                                <Icon icon="lucide:download" className="w-4 h-4" />
                                Add All ({aiSuggestions.length - addedSuggestions.size} remaining)
                              </Button>
                            </div>
                            
                            {/* Suggestions List */}
                           <div className="space-y-2">
                             {aiSuggestions.map((suggestion, index) => {
                               const isAdded = addedSuggestions.has(index);
                               const isReplace = suggestion.type === 'replace';
                               return (
                                 <div
                                   key={index}
                                   className={`flex items-start gap-2 p-3 rounded-lg border transition-all ${
                                     isAdded
                                       ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60'
                                       : 'bg-white/5 border-white/10'
                                   }`}
                                 >
                                   <div className="flex-1 space-y-2">
                                     <div className="flex items-center gap-2">
                                       <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                         isReplace
                                           ? 'bg-blue-500/20 text-blue-400'
                                           : 'bg-red-500/20 text-red-400'
                                       }`}>
                                         {isReplace ? 'Replace' : 'Block'}
                                       </span>
                                     </div>
                                     <div className="font-mono text-xs text-white/80 whitespace-pre-wrap break-all">
                                       {suggestion.pattern}
                                     </div>
                                     {isReplace && suggestion.replacement && (
                                       <div className="pl-3 border-l-2 border-blue-500/30">
                                         <div className="text-xs text-blue-400 mb-1">→ Replace with:</div>
                                         <div className="font-mono text-xs text-white/80 whitespace-pre-wrap break-all">
                                           {suggestion.replacement}
                                         </div>
                                       </div>
                                     )}
                                   </div>
                                   {isAdded ? (
                                     <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold shrink-0 px-3 py-1.5">
                                       <Icon icon="lucide:check" className="w-3 h-3" />
                                       Added
                                     </div>
                                   ) : (
                                     <Button
                                       size="sm"
                                       onClick={() => handleApplySuggestion(suggestion, index)}
                                       className="bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30 shrink-0"
                                     >
                                       <Icon icon="lucide:plus" className="w-3 h-3" />
                                       Add
                                     </Button>
                                   )}
                                 </div>
                               );
                             })}
                           </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Filters List */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Active Filters</h2>

            {/* Add New Filter */}
            <div className="space-y-3 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Pattern to block/replace:</label>
                <textarea
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="Enter text pattern (supports multiple lines)..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-vertical min-h-[80px] focus:border-blue-400 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleAddFilter();
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">
                  Replacement text (optional - leave empty to block):
                </label>
                <textarea
                  value={newReplacement}
                  onChange={(e) => setNewReplacement(e.target.value)}
                  placeholder="Enter replacement text (leave empty to block completely)..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-vertical min-h-[60px] focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded border-white/20 bg-white/10"
                  />
                  <span>Case sensitive</span>
                </label>
                <div className="flex flex-col gap-1">
                  <Button onClick={handleAddFilter} disabled={!newPattern.trim()}>
                    <Icon icon="lucide:plus" className="w-4 h-4" />
                    {newReplacement.trim() ? 'Add Replacement' : 'Add Block'}
                  </Button>
                  <span className="text-xs text-white/40 text-right">Ctrl+Enter to add</span>
                </div>
              </div>
            </div>

            {/* Grouped Filters List */}
            <div className="space-y-3">
              {filters.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Icon icon="lucide:filter-x" className="w-12 h-12 mx-auto mb-2" />
                  <p>No filters yet</p>
                  <p className="text-sm mt-1">Add patterns to block from requests</p>
                </div>
              ) : (
                Object.entries(groupedFilters).map(([groupName, groupFilters]) => {
                  const isCollapsed = collapsedGroups.has(groupName);
                  const allEnabled = groupFilters.every(f => f.enabled);
                  const someEnabled = groupFilters.some(f => f.enabled);
                  
                  return (
                    <div key={groupName} className="border border-white/10 rounded-lg overflow-hidden">
                      {/* Group Header */}
                      <div className="bg-white/5 px-4 py-3 flex items-center justify-between">
                        {renamingGroup === groupName ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={renameGroupValue}
                              onChange={(e) => setRenameGroupValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameGroup(groupName);
                                } else if (e.key === 'Escape') {
                                  setRenamingGroup(null);
                                  setRenameGroupValue('');
                                }
                              }}
                              className="flex-1 bg-white/10 border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameGroup(groupName)}
                              className="p-1 hover:bg-emerald-500/20 rounded"
                              title="Save"
                            >
                              <Icon icon="lucide:check" className="w-4 h-4 text-emerald-400" />
                            </button>
                            <button
                              onClick={() => {
                                setRenamingGroup(null);
                                setRenameGroupValue('');
                              }}
                              className="p-1 hover:bg-red-500/20 rounded"
                              title="Cancel"
                            >
                              <Icon icon="lucide:x" className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleGroupCollapse(groupName)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            <Icon
                              icon={isCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'}
                              className="w-4 h-4 text-white/60"
                            />
                            <span className="font-semibold text-sm">
                              {getGroupDisplayName(groupName === 'General' ? null : groupName)}
                            </span>
                            <span className="text-xs text-white/50">
                              ({groupFilters.length})
                            </span>
                          </button>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {groupName !== 'General' && !renamingGroup && (
                            <button
                              onClick={() => {
                                setRenamingGroup(groupName);
                                setRenameGroupValue(getGroupDisplayName(groupName));
                              }}
                              className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                              title="Rename group"
                            >
                              <Icon icon="lucide:edit" className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleGroup(
                              groupName === 'General' ? null : groupName,
                              !allEnabled
                            )}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              allEnabled
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : someEnabled
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                            title={allEnabled ? 'Disable all' : 'Enable all'}
                          >
                            <Icon icon={allEnabled ? 'lucide:eye-off' : 'lucide:eye'} className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(groupName === 'General' ? null : groupName)}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Delete group"
                          >
                            <Icon icon="lucide:trash-2" className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Group Filters */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-2">
                          <AnimatePresence>
                            {groupFilters.map((filter) => (
                              <motion.div
                                key={filter.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`p-3 rounded-lg border transition-colors ${
                                  filter.enabled
                                    ? 'bg-white/5 border-white/10'
                                    : 'bg-white/5 border-white/5 opacity-50'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={() => handleToggleFilter(filter.id, !filter.enabled)}
                                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      filter.enabled
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'border-white/30'
                                    }`}
                                  >
                                    {filter.enabled && (
                                      <Icon icon="lucide:check" className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="space-y-1">
                                      <div className="font-mono text-sm break-all whitespace-pre-wrap">
                                        {filter.pattern.length <= 100
                                          ? filter.pattern
                                          : `${filter.pattern.substring(0, 100)}...`}
                                      </div>
                                      {filter.replacement && (
                                        <div className="pl-3 border-l-2 border-blue-500/30">
                                          <div className="text-xs text-blue-400 mb-0.5">→ Replace with:</div>
                                          <div className="font-mono text-xs text-white/70 break-all whitespace-pre-wrap">
                                            {filter.replacement.length <= 80
                                              ? filter.replacement
                                              : `${filter.replacement.substring(0, 80)}...`}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {(filter.pattern.length > 100 || (filter.replacement && filter.replacement.length > 80)) && (
                                      <button
                                        onClick={() => openEditModal(filter)}
                                        className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                                      >
                                        View/Edit full text
                                      </button>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                                      {filter.replacement ? (
                                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Replace</span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Block</span>
                                      )}
                                      {filter.caseSensitive && (
                                        <span className="px-1.5 py-0.5 bg-white/10 rounded">Aa</span>
                                      )}
                                      <span>{new Date(filter.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openEditModal(filter)}
                                      className="p-1.5 hover:bg-blue-500/20 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Icon icon="lucide:edit" className="w-4 h-4 text-blue-400" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFilter(filter.id)}
                                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Icon icon="lucide:trash-2" className="w-4 h-4 text-red-400" />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Last Request Preview */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Last Request Preview</h2>

            {!user?.isLoggingEnabled ? (
              <div className="text-center py-12 text-white/40">
                <Icon icon="lucide:eye-off" className="w-12 h-12 mx-auto mb-2" />
                <p>Logging is disabled</p>
                <p className="text-sm mt-1">Enable logging to see request data</p>
              </div>
            ) : !lastRequestData ? (
              <div className="text-center py-12 text-white/40">
                <Icon icon="lucide:inbox" className="w-12 h-12 mx-auto mb-2" />
                <p>No requests yet</p>
                <p className="text-sm mt-1">Make a request to see data here</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-white/50 mb-4">
                  Last updated: {new Date(lastRequestData.timestamp).toLocaleString()}
                </div>

                {Object.entries(lastRequestData.placeholders).map(([key, value]) => {
                  if (!value || !value.trim()) return null;

                  const isExpanded = expandedPlaceholder === key;
                  const preview = value.length > 150 ? value.substring(0, 150) + '...' : value;

                  return (
                    <div
                      key={key}
                      className="border border-white/10 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedPlaceholder(isExpanded ? null : key)}
                        className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-sm text-blue-400">
                          {placeholderLabels[key] || key}
                        </span>
                        <Icon
                          icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                          className="w-4 h-4"
                        />
                      </button>

                      {!isExpanded && value.length > 150 && (
                        <div
                          className="px-4 py-2 text-sm text-white/60 cursor-pointer hover:bg-white/5"
                          onClick={() => setExpandedPlaceholder(key)}
                        >
                          {preview}
                        </div>
                      )}

                      {isExpanded && (
                        <div className="relative">
                          <div
                            className="px-4 py-3 text-sm whitespace-pre-wrap select-text cursor-text"
                            onMouseUp={handleTextSelection}
                          >
                            {highlightBannedText(value, key)}
                          </div>
                          <div className="px-4 pb-3 text-xs text-white/40">
                            Select text to create filter • Click highlighted text to manage
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Filter Click Popup */}
      <AnimatePresence>
        {clickedFilter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setClickedFilter(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-2 border border-white/20 rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold mb-4">Manage Filter</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-white/60 mb-2">Pattern:</div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                    {clickedFilter.pattern}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleToggleFilterFromText(clickedFilter)}
                    className={clickedFilter.enabled ? 'bg-yellow-500/20 border-yellow-500/40' : 'bg-emerald-500/20 border-emerald-500/40'}
                  >
                    <Icon icon={clickedFilter.enabled ? 'lucide:eye-off' : 'lucide:eye'} className="w-4 h-4" />
                    {clickedFilter.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    onClick={() => handleRemoveFilter(clickedFilter.id)}
                    variant="danger"
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => setClickedFilter(null)}
                    variant="ghost"
                    className="ml-auto"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Filter Modal */}
      <AnimatePresence>
        {editingFilter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-2 border border-white/20 rounded-xl p-6 max-w-2xl w-full"
            >
              <h3 className="text-lg font-semibold mb-4">Edit Filter</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Pattern to block/replace:</label>
                  <textarea
                    value={editPattern}
                    onChange={(e) => setEditPattern(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono resize-vertical min-h-[200px] focus:border-blue-400 focus:outline-none whitespace-pre-wrap"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Replacement text (optional - leave empty to block):
                  </label>
                  <textarea
                    value={editReplacement}
                    onChange={(e) => setEditReplacement(e.target.value)}
                    placeholder="Leave empty to block completely..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono resize-vertical min-h-[120px] focus:border-blue-400 focus:outline-none whitespace-pre-wrap"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} disabled={!editPattern.trim()}>
                    <Icon icon="lucide:save" className="w-4 h-4" />
                    Save
                  </Button>
                  <Button onClick={closeEditModal} variant="ghost">
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Selection Popup */}
      <AnimatePresence>
        {selectedText && selectionRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              left: `${selectionRect.left + selectionRect.width / 2}px`,
              top: `${selectionRect.top - 10}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999,
            }}
            className="pointer-events-auto"
          >
            <div className="bg-[#0d1530] border border-emerald-500/40 rounded-lg shadow-2xl p-3 min-w-[200px] backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-400">
                  Selected Text
                </span>
                <button
                  onClick={() => {
                    setSelectedText('');
                    setSelectionRect(null);
                  }}
                  className="p-0.5 hover:bg-white/10 rounded"
                >
                  <Icon icon="lucide:x" className="w-3 h-3" />
                </button>
              </div>
              <div className="text-xs text-white/70 font-mono break-all whitespace-pre-wrap max-h-20 overflow-y-auto mb-3 bg-white/5 p-2 rounded">
                {selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}
              </div>
              <Button
                size="sm"
                onClick={handleBlockSelected}
                className="w-full bg-red-500/20 border-red-500/40 hover:bg-red-500/30"
              >
                <Icon icon="lucide:ban" className="w-3 h-3" />
                Block This Text
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}