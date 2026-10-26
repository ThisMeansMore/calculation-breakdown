import type { ICalculationBreakdown } from './calculation-breakdown.interface.js';
import type {
    TCalculationBreakdownDurationUnit,
    TCalculationBreakdownNode,
    TCalculationBreakdownValue,
} from './calculation-breakdown.type.js';

/** Locales supported by the built-in human-readable renderer. */
export type TCalculationBreakdownLocale = 'en' | 'cs';

/** A semantic label with optional explanatory copy for richer UIs. */
export interface ICalculationBreakdownDictionaryEntry {
    readonly name: string;
    readonly description: string;
}

/** A short label or a label with explanatory copy. */
export type TCalculationBreakdownDictionaryEntry =
    | string
    | ICalculationBreakdownDictionaryEntry;

/** Semantic labels grouped by supported locale. */
export type TCalculationBreakdownDictionary<Semantic extends string> = Partial<
    Record<
        TCalculationBreakdownLocale,
        Partial<Record<Semantic, TCalculationBreakdownDictionaryEntry>>
    >
>;

/** Options for rendering a calculation breakdown as human-readable text. */
export interface ICalculationBreakdownHumanStringOptions<
    Semantic extends string,
> {
    /** Language and decimal separator used by the renderer. */
    readonly locale: TCalculationBreakdownLocale;
    /** Localized labels for domain semantics. Missing labels use the semantic key. */
    readonly dictionary: TCalculationBreakdownDictionary<Semantic>;
    /** Whether semantic names are appended to values. Defaults to true. */
    readonly includeNames?: boolean;
}

const INFIX_OPERATORS = {
    add: '+',
    subtract: '−',
    multiply: '×',
    divide: '÷',
} as const;

function localizeDecimal(
    value: string,
    locale: TCalculationBreakdownLocale,
): string {
    return locale === 'cs' ? value.replace('.', ',') : value;
}

function decimalToPercent(value: string): string {
    const negative = value.startsWith('-');
    const unsigned = negative ? value.slice(1) : value;
    const [whole = '0', fraction = ''] = unsigned.split('.');
    const digits = `${whole}${fraction}`;
    const decimalIndex = whole.length + 2;
    const padded = digits.padEnd(decimalIndex, '0');
    const integer = padded
        .slice(0, decimalIndex)
        .replace(/^0+(?=\d)/, '');
    const decimals = padded.slice(decimalIndex).replace(/0+$/, '');
    return `${negative ? '-' : ''}${integer}${decimals ? `.${decimals}` : ''}`;
}

function localizeDurationUnit(
    amount: string,
    unit: TCalculationBreakdownDurationUnit,
    locale: TCalculationBreakdownLocale,
): string {
    const singularUnit = unit.slice(0, -1);
    const unitPart = new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: singularUnit,
        unitDisplay: 'long',
        useGrouping: false,
    })
        .formatToParts(Number(amount))
        .find((part) => part.type === 'unit');

    if (!unitPart) {
        throw new Error(`Unable to localize duration unit: ${unit}`);
    }

    return unitPart.value;
}

function labelValue<Semantic extends string>(
    value: string,
    semantic: Semantic,
    options: ICalculationBreakdownHumanStringOptions<Semantic>,
): string {
    if (options.includeNames === false) return value;
    const entry = options.dictionary[options.locale]?.[semantic];
    const label =
        typeof entry === 'string' ? entry : (entry?.name ?? semantic);
    return `${value} ${label}`;
}

function renderValue<Semantic extends string>(
    value: TCalculationBreakdownValue<Semantic>,
    options: ICalculationBreakdownHumanStringOptions<Semantic>,
): string {
    const rawDecimal =
        value.type === 'number' || value.type === 'percent'
            ? value.value
            : value.amount;
    const decimal = localizeDecimal(rawDecimal, options.locale);

    if (value.type === 'money') {
        return labelValue(
            `${decimal} ${value.currency}`,
            value.semantic,
            options,
        );
    }

    if (value.type === 'duration') {
        return labelValue(
            `${decimal} ${localizeDurationUnit(value.amount, value.unit, options.locale)}`,
            value.semantic,
            options,
        );
    }

    if (value.type === 'percent') {
        return labelValue(
            `${localizeDecimal(decimalToPercent(value.value), options.locale)}%`,
            value.semantic,
            options,
        );
    }

    return labelValue(decimal, value.semantic, options);
}

function renderNode<Semantic extends string>(
    node: TCalculationBreakdownNode<Semantic>,
    options: ICalculationBreakdownHumanStringOptions<Semantic>,
    nested = false,
): string {
    if (node.type === 'constant') {
        return localizeDecimal(node.value, options.locale);
    }
    if (node.type === 'group') {
        const result = node.result
            ? ` = ${renderValue(node.result, options)}`
            : '';
        return `(${renderNode(node.expression, options)}${result})`;
    }
    if (node.type !== 'operation') {
        return renderValue(node, options);
    }

    const [left, right] = node.operands;
    if (node.operator === 'minimum' || node.operator === 'maximum') {
        const functionName = node.operator === 'minimum' ? 'min' : 'max';
        return `${functionName}(${renderNode(left, options)}, ${renderNode(right, options)})`;
    }

    const rendered = `${renderNode(left, options, true)} ${INFIX_OPERATORS[node.operator]} ${renderNode(right, options, true)}`;
    return nested ? `(${rendered})` : rendered;
}

/** Renders a plain calculation breakdown without changing its serialized form. */
export function toHumanString<Semantic extends string>(
    calculation: ICalculationBreakdown<Semantic>,
    options: ICalculationBreakdownHumanStringOptions<Semantic>,
): string {
    return `${renderNode(calculation.breakdown, options)} = ${renderValue(calculation.result, options)}`;
}
