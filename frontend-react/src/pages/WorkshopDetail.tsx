import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ReactMarkdown from 'react-markdown';
import { api } from '../lib/api';
import { Button, Card, Modal, Input, ConfirmModal } from '../components/ui';
import type { WorkshopDetailResponse, WorkshopProfile, WorkshopVersion } from '../types';
import { useStore } from '../store/useStore';
import { notify } from '../store/notifications';

export function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, addProfile } = useStore() as any;

  const [data, setData] = useState<WorkshopDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'link' | 'copy'>('copy');
  const [importName, setImportName] = useState('');
  const isAdmin = !!user?.isAdmin;
  const isOwner = data?.profile && user ? (data.profile as any).ownerId === user._id : false;
  const canManage = isAdmin || isOwner;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await api.getWorkshopDetail(id, { includeAllVersions: false, versionsLimit: 10 });
        if (!ignore) setData(res);
      } catch (e) {
        console.error('Failed to load workshop detail:', e);
        if (!ignore) setData(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [id]);

  const profile = data?.profile as WorkshopProfile | undefined;
  const versions = data?.versions || [];

  // const latestVersion = useMemo(() => {
  //   if (!versions.length) return null;
  //   return versions[0];
  // }, [versions]);

  const openImport = (mode: 'copy' | 'link') => {
    setImportMode(mode);
    setImportName(profile?.title || 'Imported profile');
    setImportOpen(true);
  };

  const submitImport = async () => {
    if (!id || importing) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/workshop/${id}/import/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ mode: importMode, name: importName || (profile?.title || 'Imported profile') }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Import failed');
      }
      const json = await res.json();
      const created = json.profile;
      addProfile(created);
      setImportOpen(false);
      notify('Profile imported successfully', 'success');
      navigate('/profiles');
    } catch (e: any) {
      console.error('Import failed:', e);
      notify(e?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const performManageAction = async (action: 'hide' | 'unhide' | 'delete') => {
    if (!id) return;
    try {
      if (action === 'delete') {
        await api.deleteWorkshopProfile(id);
        notify('Publication deleted', 'success');
        navigate('/workshop');
        return;
      }
      
      const result = action === 'hide'
        ? await api.hideWorkshopProfile(id)
        : await api.unhideWorkshopProfile(id);
      
      setData((prev) => prev ? { ...prev, profile: result.profile } : prev);
      notify(`Publication ${action === 'hide' ? 'hidden' : 'shown'}`, 'success');
    } catch (e: any) {
      console.error('Manage action failed:', e);
      notify(e?.message || 'Action failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="p-8 text-center text-white/60">
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="p-8 text-center">
          <Icon icon="lucide:alert-triangle" className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <div className="font-semibold">Publication not found</div>
          <div className="text-white/60 text-sm mt-1">It may be hidden or deleted.</div>
          <div className="mt-4">
            <Link to="/workshop">
              <Button variant="ghost">
                <Icon icon="lucide:arrow-left" className="w-4 h-4" />
                Back to Workshop
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold truncate">{profile.title}</h1>
            <VisibilityBadge visibility={profile.visibility} />
          </div>
          <div className="text-xs text-white/50">
            v{profile.currentVersion || 1} {profile.lastPublishedAt && `• Updated ${new Date(profile.lastPublishedAt).toLocaleString()}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="success" disabled={importing} onClick={() => openImport('link')}>
            <Icon icon="lucide:link" className="w-4 h-4" />
            Use as Linked (auto-update)
          </Button>
          <Button variant="primary" disabled={importing} onClick={() => openImport('copy')}>
            <Icon icon="lucide:copy" className="w-4 h-4" />
            Copy
          </Button>
          {canManage && (
            <div className="flex items-center gap-2 ml-2">
              {profile.visibility !== 'hidden' && profile.visibility !== 'deleted' && (
                <Button variant="ghost" onClick={() => performManageAction('hide')}>
                  <Icon icon="lucide:eye-off" className="w-4 h-4" />
                  Hide
                </Button>
              )}
              {profile.visibility === 'hidden' && (
                <Button variant="ghost" onClick={() => performManageAction('unhide')}>
                  <Icon icon="lucide:eye" className="w-4 h-4" />
                  Show
                </Button>
              )}
              <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {profile.description && (
        <Card className="p-5">
          <div className="prose prose-invert max-w-none prose-sm prose-p:my-2 prose-headings:my-2 prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10">
            <ReactMarkdown>{profile.description}</ReactMarkdown>
          </div>
        </Card>
      )}

      {/* Preferred models */}
      {(profile.preferredModels?.length || profile.preferredProviderType) && (
        <Card className="p-5">
          <div className="text-sm">
            <div className="font-semibold mb-1">Preferred</div>
            <div className="flex items-center flex-wrap gap-2 text-white/70">
              {profile.preferredProviderType && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-white/5 border border-white/14">
                  <Icon icon="lucide:server" className="w-3.5 h-3.5" />
                  Provider: {profile.preferredProviderType}
                </span>
              )}
              {profile.preferredModels?.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-white/5 border border-white/14">
                  <Icon icon="lucide:cpu" className="w-3.5 h-3.5" />
                  {m}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Versions */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Versions</div>
          <Link to={`/workshop/${profile._id}?all=1`} className="text-xs text-white/50 hover:text-white/80">
            Latest 10 shown
          </Link>
        </div>
        {versions.length === 0 && (
          <div className="text-sm text-white/60">No versions yet</div>
        )}
        <div className="space-y-3">
          {versions.map((v) => (
            <VersionItem key={v._id} v={v} />
          ))}
        </div>
      </Card>

      {/* Import Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Icon icon={importMode === 'link' ? 'lucide:link' : 'lucide:copy'} className="w-5 h-5" />
            {importMode === 'link' ? 'Use as Linked' : 'Copy Profile'}
          </div>
        }
        size="md"
      >
        <div className="space-y-3">
          <div className="text-sm text-white/70">
            {importMode === 'link'
              ? 'Create a new profile linked to this publication. It can auto-update to the latest version.'
              : 'Create a new independent copy of this publication.'}
          </div>
          <Input
            label="Profile name"
            value={importName}
            onChange={(e) => setImportName((e.target as HTMLInputElement).value)}
            placeholder={profile?.title || 'Imported profile'}
          />
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/12">
              <Icon icon="lucide:cpu" className="w-3.5 h-3.5" />
              v{profile?.currentVersion || 1}
            </span>
            {importMode === 'link' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <Icon icon="lucide:refresh-ccw" className="w-3.5 h-3.5" />
                Auto-update enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300">
                <Icon icon="lucide:scissors" className="w-3.5 h-3.5" />
                Independent copy
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setImportOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" isLoading={importing} onClick={submitImport}>
            <Icon icon="lucide:check" className="w-4 h-4" />
            Create
          </Button>
        </div>
      </Modal>

      {/* Confirm Delete Publication (admin) */}
      <ConfirmModal
        open={confirmDeleteOpen}
        title="Delete this publication?"
        description="This action will hide it from users and cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          performManageAction('delete');
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      {/* Import Modal */}
    </div>
  );
}

function VersionItem({ v }: { v: WorkshopVersion }) {
  return (
    <div className="rounded-xl border border-white/14 p-3 bg-white/5">
      <div className="flex items-center justify-between">
        <div className="font-medium">v{v.versionNumber}</div>
        <div className="text-xs text-white/50">{new Date(v.createdAt).toLocaleString()}</div>
      </div>
      {v.changelog && (
        <div className="mt-2 prose prose-invert max-w-none prose-sm prose-p:my-2 prose-headings:my-2">
          <ReactMarkdown>{v.changelog}</ReactMarkdown>
        </div>
      )}
      <div className="mt-2 text-xs text-white/50">
        Tabs: {v.tabs.length} • Include All Tabs: {v.includeAllTabs ? 'yes' : 'no'}
      </div>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: WorkshopProfile['visibility'] }) {
  switch (visibility) {
    case 'public':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
          Public
        </span>
      );
    case 'hidden':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          Hidden
        </span>
      );
    case 'deleted':
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
          Deleted
        </span>
      );
    default:
      return null;
  }
}

export default WorkshopDetailPage;