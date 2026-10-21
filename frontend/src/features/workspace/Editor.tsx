import CodeMirror from "@uiw/react-codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { zubaanHighlight, zubaanLanguage } from "./zubaanLanguage";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  height?: string;
  readOnly?: boolean;
  /** Marks the editor as mounted for the screenshot script. */
  testId?: string;
}

/** Thin CodeMirror wrapper, preconfigured for ZubaanScript. */
export function Editor({
  value,
  onChange,
  onRun,
  height = "420px",
  readOnly = false,
  testId,
}: EditorProps) {
  const extensions: Extension[] = [zubaanLanguage, zubaanHighlight, EditorView.lineWrapping];

  if (onRun && !readOnly) {
    extensions.push(
      Prec.high(
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => {
              onRun();
              return true;
            },
          },
        ]),
      ),
    );
  }

  return (
    <div
      data-testid={testId}
      className="overflow-hidden rounded-lg border border-brand-border bg-white"
    >
      <CodeMirror
        value={value}
        height={height}
        readOnly={readOnly}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
        }}
        onChange={onChange}
      />
    </div>
  );
}
