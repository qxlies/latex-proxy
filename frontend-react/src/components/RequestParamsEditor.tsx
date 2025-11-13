import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Card } from './ui';

interface ParamConfig {
  key: string;
  enabled: boolean;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object';
}

interface RequestParamsEditorProps {
  value: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
}

const DEFAULT_PARAMS: ParamConfig[] = [
  { key: 'test', enabled: false, value: 0.0, type: 'number' },
];

function inferType(val: any): 'string' | 'number' | 'boolean' | 'object' {
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'object' && val !== null) return 'object';
  return 'string';
}

export function RequestParamsEditor({ value, onChange }: RequestParamsEditorProps) {
  const initializeParams = (val: Record<string, any>) => {
    // Initialize from value or defaults
    const existing = Object.entries(val || {}).map(([key, val]) => ({
      key,
      enabled: true,
      value: val,
      type: inferType(val),
    }));

    // Add defaults that aren't in existing
    const existingKeys = new Set(existing.map(p => p.key));
    const defaults = DEFAULT_PARAMS.filter(p => !existingKeys.has(p.key));

    return [...existing, ...defaults];
  };

  const [params, setParams] = useState<ParamConfig[]>(() => initializeParams(value));
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [showAddParam, setShowAddParam] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Update params when value prop changes (only on first load)
  useEffect(() => {
    if (!isInitialized && value && Object.keys(value).length > 0) {
      setParams(initializeParams(value));
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  const updateParams = (newParams: ParamConfig[]) => {
    setParams(newParams);
    
    // Build output object with only enabled params
    const output: Record<string, any> = {};
    newParams.forEach(p => {
      if (p.enabled) {
        output[p.key] = p.value;
      }
    });
    
    onChange(output);
  };

  const toggleParam = (index: number) => {
    const newParams = [...params];
    newParams[index].enabled = !newParams[index].enabled;
    updateParams(newParams);
  };

  const updateParamValue = (index: number, newValue: any) => {
    const newParams = [...params];
    newParams[index].value = newValue;
    updateParams(newParams);
  };

  const deleteParam = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    updateParams(newParams);
  };

  const addCustomParam = () => {
    if (!newParamKey.trim()) return;

    let parsedValue: any = newParamValue;
    
    // Try to parse as JSON for objects
    if (newParamValue.trim().startsWith('{') || newParamValue.trim().startsWith('[')) {
      try {
        parsedValue = JSON.parse(newParamValue);
      } catch {
        // Keep as string if parse fails
      }
    } else if (newParamValue === 'true' || newParamValue === 'false') {
      parsedValue = newParamValue === 'true';
    } else if (!isNaN(Number(newParamValue)) && newParamValue.trim() !== '') {
      parsedValue = Number(newParamValue);
    }

    const newParam: ParamConfig = {
      key: newParamKey.trim(),
      enabled: true,
      value: parsedValue,
      type: inferType(parsedValue),
    };

    updateParams([...params, newParam]);
    setNewParamKey('');
    setNewParamValue('');
    setShowAddParam(false);
  };

  const renderValueInput = (param: ParamConfig, index: number) => {
    if (param.type === 'boolean') {
      return (
        <button
          onClick={() => updateParamValue(index, !param.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            param.value
              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
              : 'bg-red-500/20 text-red-400 border border-red-500/40'
          }`}
        >
          {param.value ? 'true' : 'false'}
        </button>
      );
    }

    if (param.type === 'object') {
      return (
        <textarea
          value={JSON.stringify(param.value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              updateParamValue(index, parsed);
            } catch {
              // Invalid JSON, don't update
            }
          }}
          className="input text-xs font-mono min-h-[60px] resize-y"
          placeholder='{"key": "value"}'
        />
      );
    }

    return (
      <input
        type={param.type === 'number' ? 'number' : 'text'}
        value={param.value}
        onChange={(e) => {
          const val = param.type === 'number' ? Number(e.target.value) : e.target.value;
          updateParamValue(index, val);
        }}
        step={param.type === 'number' ? 'any' : undefined}
        className="input text-sm"
        placeholder={`Enter ${param.key}`}
      />
    );
  };

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:sliders-horizontal" className="w-5 h-5 text-accent-1" />
          <h3 className="text-lg font-semibold">Request Parameters</h3>
        </div>
        <button
          onClick={() => setShowAddParam(!showAddParam)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-1/10 hover:bg-accent-1/20 border border-accent-1/30 text-accent-1 text-sm font-medium transition-colors"
        >
          <Icon icon="lucide:plus" className="w-4 h-4" />
          Add Custom
        </button>
      </div>

      <p className="text-xs text-white/60 mb-4">
        Enable or disable parameters to include in API requests. Custom parameters support objects like{' '}
        <code className="bg-white/10 px-1 py-0.5 rounded">reasoning: {`{enabled: true}`}</code>
      </p>

      {/* Add Custom Parameter Form */}
      {showAddParam && (
        <div className="mb-4 p-4 bg-white/5 border border-white/14 rounded-xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newParamKey}
              onChange={(e) => setNewParamKey(e.target.value)}
              placeholder="Parameter name (e.g., reasoning)"
              className="input text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustomParam();
              }}
            />
            <input
              type="text"
              value={newParamValue}
              onChange={(e) => setNewParamValue(e.target.value)}
              placeholder='Value (e.g., {"enabled": true})'
              className="input text-sm font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustomParam();
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addCustomParam}
              className="flex-1 px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 text-sm font-medium transition-colors"
            >
              Add Parameter
            </button>
            <button
              onClick={() => {
                setShowAddParam(false);
                setNewParamKey('');
                setNewParamValue('');
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/14 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Parameters List */}
      <div className="space-y-2">
        {params.map((param, index) => (
          <div
            key={`${param.key}-${index}`}
            className={`p-3 rounded-xl border transition-all ${
              param.enabled
                ? 'bg-white/5 border-white/14'
                : 'bg-white/2 border-white/8 opacity-60'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Toggle */}
              <button
                onClick={() => toggleParam(index)}
                className={`mt-1 w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                  param.enabled ? 'bg-green-500' : 'bg-white/20'
                }`}
                title={param.enabled ? 'Enabled' : 'Disabled'}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    param.enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{param.key}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60">
                      {param.type}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteParam(index)}
                    className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete parameter"
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </button>
                </div>

                {param.enabled && (
                  <div className="w-full">
                    {renderValueInput(param, index)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {params.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <Icon icon="lucide:inbox" className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">No parameters configured</p>
          </div>
        )}
      </div>
    </Card>
  );
}