import React, { useState } from 'react';
import { Tool, ToolParameter, api } from '../services/api';

interface ToolParametersProps {
  tool: Tool;
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onRun: () => void;
  loading: boolean;
}

export const ToolParameters: React.FC<ToolParametersProps> = ({
  tool,
  values,
  onChange,
  onRun,
  loading,
}) => {
  // Helper to render a cost badge
  const renderCostBadge = (cost?: number) =>
    cost !== undefined ? (
      <span className="ml-2 text-xs font-medium text-primary-foreground bg-secondary rounded px-1 py-0.5">
        {cost} ⚡
      </span>
    ) : null;

  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const handleFileUpload = async (name: string, file: File) => {
    try {
      setUploading((prev) => ({ ...prev, [name]: true }));
      const uploaded = await api.uploadFile(file);
      onChange(name, uploaded.id);
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploading((prev) => ({ ...prev, [name]: false }));
    }
  };

  const renderParameter = (name: string, param: ToolParameter) => {
    // Skip the main image input – it is handled separately elsewhere if needed
    if (name === 'image') return null;

    const value = values[name] ?? param.default;

    // Boolean – render as a checkbox
    if (param.type === 'boolean') {
      return (
        <div key={name} className="mb-4 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            {param.description}{renderCostBadge(param.cost)}
          </label>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(name, e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          />
        </div>
      );
    }

    // Image – file upload UI with status gauge
    if (param.type === 'image') {
      const isUploaded = !!value;
      const isUploading = uploading[name];

      return (
        <div key={name} className="mb-4">
          <label className="block text-sm font-medium mb-2 text-foreground">
            {param.description}{renderCostBadge(param.cost)}
          </label>
          <div className="relative">
            {!isUploaded ? (
              <label
                className={`
                  flex flex-col items-center justify-center w-full h-32 
                  border-2 border-dashed rounded-lg cursor-pointer transition-colors
                  ${isUploading
                    ? 'bg-muted border-muted-foreground/50'
                    : 'bg-secondary/20 border-border hover:bg-secondary/30'}
                `}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-xs text-muted-foreground">Загрузка...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-muted-foreground text-center px-2">Нажмите для загрузки</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(name, file);
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg border border-border">
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 bg-green-500/20 text-green-500 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground truncate">Изображение загружено</span>
                </div>
                <button
                  onClick={() => onChange(name, null)}
                  className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                  title="Удалить"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Upload status gauge */}
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-1 transition-all duration-500 ${isUploaded ? 'bg-green-500 w-full' : 'bg-red-500 w-[5%]'}`}
                />
              </div>
              <span className={`text-[10px] font-medium ${isUploaded ? 'text-green-500' : 'text-red-500'}`}>
                {isUploaded ? 'Готово' : 'Не загружено'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Enum – render a select dropdown
    if (param.enum) {
      return (
        <div key={name} className="mb-4">
          <label className="block text-sm font-medium mb-2 text-foreground">
            {param.description}{renderCostBadge(param.cost)}
          </label>
          <select
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : e.target.value;
              onChange(name, val);
            }}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {param.enum.map((option) => (
              <option key={String(option)} value={option ?? ''}>
                {option === null ? 'Нет' : option}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Number – render a range slider
    if (param.type === 'number') {
      return (
        <div key={name} className="mb-4">
          <label className="block text-sm font-medium mb-2 text-foreground">
            {param.description}{renderCostBadge(param.cost)}
          </label>
          <input
            type="range"
            min={param.min ?? 0}
            max={param.max ?? 1}
            step={0.1}
            value={value}
            onChange={(e) => onChange(name, parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-muted-foreground mt-1">{value}</div>
        </div>
      );
    }

    // String – render a text input (excluding background_image which is handled elsewhere)
    if (param.type === 'string') {
      return (
        <div key={name} className="mb-4">
          <label className="block text-sm font-medium mb-2 text-foreground">
            {param.description}{renderCostBadge(param.cost)}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-6 mb-4 pointer-events-auto max-h-[60vh] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 text-card-foreground">
        {tool.display_name}{tool.cost !== undefined && renderCostBadge(tool.cost)}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>

      {Object.entries(tool.parameters.properties).map(([name, param]) => renderParameter(name, param))}

      <button
        onClick={onRun}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 hover:cursor-pointer disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground transition-colors mt-4"
      >
        {loading ? 'Обработка...' : 'Запустить'}
      </button>
    </div>
  );
};