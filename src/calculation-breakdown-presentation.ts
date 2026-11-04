import type {
    ICalculationBreakdown,
    ICalculationBreakdownGroup,
} from './calculation-breakdown.interface.js';
import type {
    TCalculationBreakdownDurationUnit,
    TCalculationBreakdownNode,
    TCalculationBreakdownValue,
} from './calculation-breakdown.type.js';

export type TCalculationBreakdownPresentationOperator =
    | 'add'
    | 'subtract'
    | 'equals';

export type TCalculationBreakdownPresentationValue =
    | { readonly money: { readonly amount: string; readonly currency: string } }
    | {
          readonly duration: {
              readonly amount: string;
              readonly unit: TCalculationBreakdownDurationUnit;
              readonly rounding?: 'up' | 'down' | 'nearest';
              readonly step?: number;
          };
      }
    | { readonly number: { readonly value: string } }
    | { readonly percent: { readonly value: string } };

export type TCalculationBreakdownPresentationRow = Readonly<{
    id: string;
    operator?: TCalculationBreakdownPresentationOperator;
}> &
    TCalculationBreakdownPresentationValue;

export interface ICalculationBreakdownPresentationSection {
    readonly id: string;
    readonly rows: readonly TCalculationBreakdownPresentationRow[];
    readonly result: TCalculationBreakdownPresentationRow;
}

export interface ICalculationBreakdownPresentation {
    readonly sections: readonly ICalculationBreakdownPresentationSection[];
}

function deepFreeze<Value>(value: Value): Value {
    if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
        return value;
    }
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
}

function presentationValue<Semantic extends string>(
    value: TCalculationBreakdownValue<Semantic>,
): TCalculationBreakdownPresentationValue {
    if (value.type === 'money') {
        return { money: { amount: value.amount, currency: value.currency } };
    }
    if (value.type === 'duration') {
        return {
            duration: {
                amount: value.amount,
                unit: value.unit,
                ...(value.rounding !== undefined
                    ? { rounding: value.rounding }
                    : {}),
                ...(value.step !== undefined ? { step: value.step } : {}),
            },
        };
    }
    if (value.type === 'number') {
        return { number: { value: value.value } };
    }
    return { percent: { value: value.value } };
}

function row<Semantic extends string>(
    id: string,
    value: TCalculationBreakdownValue<Semantic>,
    operator?: TCalculationBreakdownPresentationOperator,
): TCalculationBreakdownPresentationRow {
    return {
        id,
        ...(operator !== undefined ? { operator } : {}),
        ...presentationValue(value),
    };
}

function collectRows<Semantic extends string>(
    node: TCalculationBreakdownNode<Semantic>,
    rows: TCalculationBreakdownPresentationRow[],
    seen: Set<string>,
    operator?: TCalculationBreakdownPresentationOperator,
): void {
    if (node.type === 'operation') {
        collectRows(node.operands[0], rows, seen, operator);
        const rightOperator =
            node.operator === 'add'
                ? 'add'
                : node.operator === 'subtract'
                  ? 'subtract'
                  : undefined;
        collectRows(node.operands[1], rows, seen, rightOperator);
        return;
    }
    if (node.type === 'group') {
        if (node.semantic !== undefined && node.result !== undefined) {
            const id = node.id ?? node.semantic;
            if (!seen.has(id)) {
                seen.add(id);
                rows.push(row(id, node.result, operator));
            }
            return;
        }
        collectRows(node.expression, rows, seen, operator);
        return;
    }
    if (node.type === 'constant' || seen.has(node.semantic)) return;
    seen.add(node.semantic);
    rows.push(row(node.semantic, node, operator));
}

function sectionFromGroup<Semantic extends string>(
    group: ICalculationBreakdownGroup<Semantic> & {
        readonly semantic: Semantic;
        readonly result: TCalculationBreakdownValue<Semantic>;
    },
): ICalculationBreakdownPresentationSection {
    const rows: TCalculationBreakdownPresentationRow[] = [];
    collectRows(group.expression, rows, new Set());
    return {
        id: group.id ?? group.semantic,
        rows,
        result: row(group.result.semantic, group.result, 'equals'),
    };
}

function collectSections<Semantic extends string>(
    node: TCalculationBreakdownNode<Semantic>,
    sections: ICalculationBreakdownPresentationSection[],
): void {
    if (node.type === 'operation') {
        node.operands.forEach((operand) => collectSections(operand, sections));
        return;
    }
    if (node.type !== 'group') return;
    if (node.semantic !== undefined && node.result !== undefined) {
        sections.push(
            sectionFromGroup(
                node as ICalculationBreakdownGroup<Semantic> & {
                    readonly semantic: Semantic;
                    readonly result: TCalculationBreakdownValue<Semantic>;
                },
            ),
        );
        return;
    }
    collectSections(node.expression, sections);
}

/** Creates a compact, framework-independent representation for UI rendering. */
export function toPresentation<Semantic extends string>(
    calculation: ICalculationBreakdown<Semantic>,
): ICalculationBreakdownPresentation {
    const sections: ICalculationBreakdownPresentationSection[] = [];
    collectSections(calculation.breakdown, sections);

    if (sections.length === 0) {
        const rows: TCalculationBreakdownPresentationRow[] = [];
        collectRows(calculation.breakdown, rows, new Set());
        sections.push({
            id: calculation.result.semantic,
            rows,
            result: row(
                calculation.result.semantic,
                calculation.result,
                'equals',
            ),
        });
    }

    return deepFreeze({ sections });
}
