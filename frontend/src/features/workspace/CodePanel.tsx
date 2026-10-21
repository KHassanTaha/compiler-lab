import type { Example, SnippetSummary } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { Editor } from "./Editor";

interface CodePanelProps {
  code: string;
  onChange: (code: string) => void;
  onRunAll: () => void;
  onSave: () => void;
  examples: Example[];
  snippets: SnippetSummary[];
  onLoadExample: (example: Example) => void;
  onLoadSnippet: (id: number) => void;
  running: boolean;
  dirty: boolean;
  loadedName: string | null;
}

const MAX_CODE = 10_000;

/** Left column: example/snippet pickers, editor, counts and actions. */
export function CodePanel({
  code,
  onChange,
  onRunAll,
  onSave,
  examples,
  snippets,
  onLoadExample,
  onLoadSnippet,
  running,
  dirty,
  loadedName,
}: CodePanelProps) {
  const lineCount = code.split("\n").length;
  const overLimit = code.length > MAX_CODE;

  const handleExample = (value: string) => {
    const example = examples.find((item) => item.id === value);
    if (example) onLoadExample(example);
  };

  return (
    <div
      data-testid="editor-ready"
      className="flex flex-col gap-3 rounded-xl border border-brand-border bg-white p-4 shadow-warm"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-brand-brown-700">
          Load example
          <select
            aria-label="Load example"
            defaultValue=""
            onChange={(event) => {
              handleExample(event.target.value);
              event.target.value = "";
            }}
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-brown-900"
          >
            <option value="" disabled>
              Choose an example…
            </option>
            {examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.title} ({example.category})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-brand-brown-700">
          My snippets
          <select
            aria-label="My snippets"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) onLoadSnippet(Number(event.target.value));
              event.target.value = "";
            }}
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-brown-900"
          >
            <option value="" disabled>
              {snippets.length === 0 ? "No snippets yet" : "Choose a snippet…"}
            </option>
            {snippets.map((snippet) => (
              <option key={snippet.id} value={snippet.id}>
                {snippet.name}
              </option>
            ))}
          </select>
        </label>

        <Button variant="secondary" onClick={onSave} disabled={code.trim().length === 0}>
          Save
        </Button>
      </div>

      {loadedName && (
        <p className="text-xs text-brand-brown-500">
          Loaded: <span className="text-brand-brown-700">{loadedName}</span>
          {dirty && " · unsaved changes"}
        </p>
      )}

      <Editor value={code} onChange={onChange} onRun={onRunAll} testId="code-editor" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-brand-brown-500">
          <span>{code.length.toLocaleString()} chars</span>
          <span>{lineCount} lines</span>
          <span className="hidden sm:inline">Ctrl+Enter to run</span>
          {overLimit && (
            <span className="text-status-error-fg">Over the 10,000-char limit</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="rounded-full bg-status-warning-bg px-2.5 py-0.5 text-xs text-status-warning-fg">
              Unsaved
            </span>
          )}
          <Button
            onClick={onRunAll}
            loading={running}
            disabled={code.trim().length === 0 || overLimit || running}
          >
            Run All
          </Button>
        </div>
      </div>
    </div>
  );
}
