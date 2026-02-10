import diff from 'fast-diff';
import { format, lint } from './oxlint.js';

export const oxlint = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Lint with Oxlint',
      category: 'Oxlint',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        additionalProperties: true,
      },
    ],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const filePath = context.filename;
    const options = context.options[0] || {};

    if (!filePath) {
      return {};
    }

    return {
      Program() {
        const code = sourceCode.getText();
        try {
          // 1. Linting
          const result = lint(code, filePath, options);

          if (result && result.diagnostics) {
            for (const diagnostic of result.diagnostics) {
              const label = diagnostic.labels?.[0];
              if (!label || !label.span) continue;

              const span = label.span;
              // Ensure we don't crash if span is out of bounds (though unlikely with exact code match)
              try {
                const loc = {
                  start: sourceCode.getLocFromIndex(span.offset),
                  // defensive math
                  end: sourceCode.getLocFromIndex(Math.min(span.offset + span.length, code.length)),
                };

                context.report({
                  loc,
                  message: `${diagnostic.message} (${diagnostic.code})`,
                });
              } catch (error) {
                // Fallback or ignore invalid spans
                console.warn(
                  `[eslint-plugin-oxlint-x] Invalid span for ${diagnostic.code}:`,
                  error.message,
                );
              }
            }
          }

          // 2. Formatting / Fixing
          const formattedCode = format(code, filePath, options);

          if (formattedCode !== code) {
            const diffs = diff(code, formattedCode);
            const hasChanges = diffs.some(([mode]) => mode !== 0);

            if (hasChanges) {
              context.report({
                loc: { line: 1, column: 0 },
                message: 'Oxlint found fixable issues.',
                fix(fixer) {
                  const results = [];
                  let cursor = 0;

                  for (const [mode, text] of diffs) {
                    if (mode === 0) {
                      cursor += text.length;
                    } else if (mode === -1) {
                      results.push(fixer.removeRange([cursor, cursor + text.length]));
                      cursor += text.length;
                    } else if (mode === 1) {
                      results.push(fixer.insertTextAfterRange([cursor, cursor], text));
                    }
                  }
                  return results;
                },
              });
            }
          }
        } catch (error) {
          console.warn('[eslint-plugin-oxlint-x] Error running oxlint:', error);
        }
      },
    };
  },
};
