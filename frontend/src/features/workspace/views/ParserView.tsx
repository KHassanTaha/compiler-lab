import type { AstNode, ParserData } from "../../../lib/types";

function TreeNode({ node, depth }: { node: AstNode; depth: number }) {
  return (
    <li className="list-none">
      <div
        className="flex items-center gap-2 rounded-md py-0.5"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span className="font-mono text-xs text-brand-brown-900">{node.type}</span>
        {node.value !== undefined && node.value !== null && (
          <span className="rounded bg-brand-cream-200 px-1.5 py-0.5 font-mono text-[11px] text-brand-brown-700">
            {String(node.value)}
          </span>
        )}
        <span className="font-mono text-[10px] text-brand-brown-500">
          {node.line}:{node.column}
        </span>
      </div>
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child, index) => (
            <TreeNode key={index} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Parser formatted view: indented parse tree + derivation trace. */
export function ParserView({ data }: { data: ParserData }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        data-testid="parser-tree"
        className="max-h-80 overflow-auto rounded-lg border border-brand-border bg-brand-cream-50 p-3"
      >
        {data.tree ? (
          <ul>
            <TreeNode node={data.tree} depth={0} />
          </ul>
        ) : (
          <p className="text-sm text-brand-brown-500">No tree — the program did not parse.</p>
        )}
      </div>

      {data.derivation.length > 0 && (
        <details className="rounded-lg border border-brand-border">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-brand-brown-700">
            Derivation trace ({data.derivation.length} steps)
          </summary>
          <ol className="max-h-56 overflow-auto px-3 pb-3 font-mono text-xs text-brand-brown-500">
            {data.derivation.map((step) => (
              <li key={step.step} className="py-0.5">
                {step.step}. {step.rule} ⇐ {step.matched_text}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
