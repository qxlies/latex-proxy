import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { api } from '../lib/api';
import type { WorkshopListResponse, WorkshopProfile } from '../types';
import { Button, Card, Input } from '../components/ui';

function useDebounce<T>(value: T, delay: number = 300) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function WorkshopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState<string>(() => searchParams.get('q') || '');
  const [page, setPage] = useState<number>(() => {
    const p = Number(searchParams.get('page') || '1');
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<WorkshopListResponse | null>(null);

  const debouncedQ = useDebounce(q, 400);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedQ) next.set('q', debouncedQ);
    else next.delete('q');
    next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [debouncedQ, page]);

  useEffect(() => {
    let ignore = false;
    const fetchList = async () => {
      setIsLoading(true);
      try {
        const list = await api.getWorkshopList(debouncedQ, page, 20);
        if (!ignore) setData(list);
      } catch (e) {
        console.error('Failed to load workshop list:', e);
        if (!ignore) setData({ items: [], total: 0, page: 1, pages: 1 });
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    fetchList();
    return () => {
      ignore = true;
    };
  }, [debouncedQ, page]);

  const hasItems = (data?.items?.length || 0) > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workshop</h1>
          <p className="text-white/60">
            Explore published prompt profiles from the community
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/editor">
            <Button variant="primary">
              <Icon icon="lucide:upload" className="w-4 h-4" />
              Publish from Editor
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search profiles, descriptions, tags..."
            />
            <Icon
              icon="lucide:search"
              className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2"
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setQ('');
              setPage(1);
            }}
          >
            <Icon icon="lucide:eraser" className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {isLoading && (
          <Card className="p-6 text-white/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '120ms' }} />
              <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '240ms' }} />
              <span className="ml-2">Loading...</span>
            </div>
          </Card>
        )}

        {!isLoading && !hasItems && (
          <Card className="p-10 text-center">
            <Icon icon="lucide:inbox" className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <div className="text-lg font-semibold mb-1">No results</div>
            <div className="text-white/60">Try another query or reset filters</div>
          </Card>
        )}

        {!isLoading && hasItems && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data!.items.map((p) => (
              <ProfileCard key={p._id} item={p} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {hasItems && data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Icon icon="lucide:chevron-left" className="w-4 h-4" />
            Prev
          </Button>
          <div className="text-sm text-white/80">
            Page {data.page} of {data.pages}
          </div>
          <Button
            variant="ghost"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
          >
            Next
            <Icon icon="lucide:chevron-right" className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ item }: { item: WorkshopProfile }) {
  return (
    <Link to={`/workshop/${item._id}`}>
      <Card className="p-4 h-full hover:bg-white/5 transition-colors border-white/14">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold truncate">{item.title}</div>
              <VisibilityBadge visibility={item.visibility} />
            </div>
            {item.description && (
              <div className="text-sm text-white/60 mt-1 line-clamp-3">
                {item.description}
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-white/50">v{item.currentVersion || 1}</div>
            {item.preferredModels?.length ? (
              <div className="text-[11px] text-white/50 mt-1">
                {item.preferredModels.slice(0, 2).join(', ')}
                {item.preferredModels.length > 2 ? '…' : ''}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Icon icon="lucide:eye" className="w-3.5 h-3.5" />
              {item.stats?.views ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon icon="lucide:download" className="w-3.5 h-3.5" />
              {item.stats?.imports ?? 0}
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <Icon icon="lucide:clock-4" className="w-3.5 h-3.5" />
            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}
          </span>
        </div>
      </Card>
    </Link>
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


export default WorkshopPage;