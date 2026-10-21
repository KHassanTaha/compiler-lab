import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { toast } from "../lib/toast";
import type {
  EngineCardStatus,
  EngineKey,
  EngineResult,
  Example,
  SnippetSummary,
} from "../lib/types";
import { CodePanel } from "../features/workspace/CodePanel";
import { GrammarPanel } from "../features/workspace/GrammarPanel";
import { OutputPanel } from "../features/workspace/OutputPanel";
import { SnippetDialog } from "../features/workspace/SnippetDialog";
import { ENGINE_BY_KEY } from "../features/workspace/engineConfig";

const STARTER = 'likho("Namaste, ZubaanScript!");';
const MAX_CODE = 10_000;
const ENGINE_KEYS: EngineKey[] = ["lexer", "parser", "semantic", "icg"];

type EngineMap = Partial<Record<EngineKey, EngineResult>>;

function statusOf(result: EngineResult): EngineCardStatus {
  return result.status === "success" ? "success" : "error";
}

function idleStatuses(): Record<EngineKey, EngineCardStatus> {
  return { lexer: "idle", parser: "idle", semantic: "idle", icg: "idle" };
}

export function WorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const redoId = searchParams.get("redo");

  const [code, setCode] = useState(STARTER);
  const [results, setResults] = useState<EngineMap>({});
  const [statuses, setStatuses] = useState<Record<EngineKey, EngineCardStatus>>(idleStatuses);
  const [running, setRunning] = useState(false);
  const [shareRunId, setShareRunId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loadedName, setLoadedName] = useState<string | null>(null);

  const [examples, setExamples] = useState<Example[]>([]);
  const [snippets, setSnippets] = useState<SnippetSummary[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSnippetId, setEditingSnippetId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    api
      .examples()
      .then((response) => active && setExamples(response.items))
      .catch(() => undefined);
    api
      .listSnippets()
      .then((response) => active && setSnippets(response.items))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const scrollToFirstError = (map: EngineMap) => {
    const errored = ENGINE_KEYS.find((engine) => map[engine]?.status === "error");
    if (!errored) return;
    document
      .querySelector(`[data-testid="engine-card-${errored}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runAll = async (source: string) => {
    if (source.trim().length === 0 || source.length > MAX_CODE) return;
    setRunning(true);
    setStatuses({ lexer: "running", parser: "running", semantic: "running", icg: "running" });
    try {
      const response = await api.runAll(source);
      const map: EngineMap = {
        lexer: response.lex,
        parser: response.parse,
        semantic: response.semantic,
        icg: response.icg,
      };
      setResults(map);
      setStatuses({
        lexer: statusOf(response.lex),
        parser: statusOf(response.parse),
        semantic: statusOf(response.semantic),
        icg: statusOf(response.icg),
      });
      setShareRunId(response.run_id);
      const failed = ENGINE_KEYS.filter((engine) => map[engine]?.status === "error");
      if (failed.length > 0) {
        toast.info(`${failed.length} stage${failed.length > 1 ? "s" : ""} reported errors.`);
        scrollToFirstError(map);
      } else {
        toast.success("All stages passed.");
      }
    } catch (error) {
      setStatuses(idleStatuses());
      if (error instanceof ApiError && error.status === 422) {
        toast.error("Code exceeds the 10,000-character limit.");
      } else {
        toast.error("Run failed. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  };

  const runOneEngine = async (engine: EngineKey, source: string) => {
    if (source.trim().length === 0) return;
    setStatuses((prev) => ({ ...prev, [engine]: "running" }));
    try {
      const result = await api.runEngine(ENGINE_BY_KEY[engine].slug, source);
      setResults((prev) => ({ ...prev, [engine]: result }));
      setStatuses((prev) => ({ ...prev, [engine]: statusOf(result) }));
      setShareRunId(result.run_id ?? null);
    } catch {
      setStatuses((prev) => ({ ...prev, [engine]: "error" }));
    }
  };

  // Handle /workspace?redo={id}: prefill the code and re-run the same stage.
  useEffect(() => {
    if (!redoId) return;
    const id = Number(redoId);
    if (Number.isNaN(id)) {
      setSearchParams({}, { replace: true });
      return;
    }

    let active = true;
    api
      .historyRun(id)
      .then((run) => {
        if (!active) return;
        setCode(run.code);
        setDirty(false);
        setLoadedName(null);
        if (!run.engine || run.engine === "all") {
          void runAll(run.code);
        } else {
          const key = ENGINE_KEYS.find((candidate) => candidate === run.engine);
          if (key) void runOneEngine(key, run.code);
        }
      })
      .catch(() => {
        if (active) toast.error("Could not load the run to redo.");
      })
      .finally(() => {
        if (active) setSearchParams({}, { replace: true });
      });
    return () => {
      active = false;
    };
    // runAll/runOneEngine are stable per render; redoId drives this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redoId]);

  const onChangeCode = (next: string) => {
    setCode(next);
    setDirty(true);
  };

  const onLoadExample = (example: Example) => {
    setCode(example.code);
    setDirty(false);
    setLoadedName(example.title);
    setEditingSnippetId(null);
    setResults({});
    setStatuses(idleStatuses());
    toast.info(`Loaded example: ${example.title}`);
  };

  const onLoadSnippet = async (id: number) => {
    try {
      const snippet = await api.getSnippet(id);
      setCode(snippet.code);
      setDirty(false);
      setEditingSnippetId(id);
      setLoadedName(snippets.find((item) => item.id === id)?.name ?? null);
      toast.success("Snippet loaded.");
    } catch {
      toast.error("Could not load that snippet.");
    }
  };

  const onSaved = (id: number, name: string) => {
    setEditingSnippetId(id);
    setLoadedName(name);
    setDirty(false);
    api
      .listSnippets()
      .then((response) => setSnippets(response.items))
      .catch(() => undefined);
  };

  const overLimit = code.length > MAX_CODE;

  return (
    <section data-testid="workspace-root" className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-brand-brown-900">Workspace</h1>
        <p className="mt-1 text-brand-brown-500">
          Write ZubaanScript, then run every compiler stage at once.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-6">
          <CodePanel
            code={code}
            onChange={onChangeCode}
            onRunAll={() => void runAll(code)}
            onSave={() => setDialogOpen(true)}
            examples={examples}
            snippets={snippets}
            onLoadExample={onLoadExample}
            onLoadSnippet={onLoadSnippet}
            running={running}
            dirty={dirty}
            loadedName={loadedName}
          />
          <GrammarPanel />
        </div>

        <OutputPanel
          results={results}
          statuses={statuses}
          onRunEngine={(engine) => void runOneEngine(engine, code)}
          onRunAll={() => void runAll(code)}
          running={running}
          shareRunId={shareRunId}
        />
      </div>

      {overLimit && (
        <p className="mt-4 text-sm text-status-error-fg">
          Your program is over the 10,000-character limit and cannot be run.
        </p>
      )}

      <SnippetDialog
        open={dialogOpen}
        code={code}
        editingId={editingSnippetId}
        initialName={editingSnippetId ? (loadedName ?? "") : ""}
        onClose={() => setDialogOpen(false)}
        onSaved={onSaved}
      />
    </section>
  );
}
