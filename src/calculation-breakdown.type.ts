import type {
    ICalculationBreakdownConstantValue,
    ICalculationBreakdownDurationValue,
    ICalculationBreakdownGroup,
    ICalculationBreakdownMoneyValue,
    ICalculationBreakdownNumberValue,
    ICalculationBreakdownOperation,
    ICalculationBreakdownPercentValue,
} from './calculation-breakdown.interface.js';

/** Binary operations that can be recorded in a calculation breakdown. */
export type TCalculationBreakdownOperator =
    | 'add'
    | 'subtract'
    | 'multiply'
    | 'divide'
    | 'minimum'
    | 'maximum';

/** Decimal.js-style aliases accepted when constructing an operation. */
export type TCalculationBreakdownOperatorAlias =
    | 'sub'
    | 'mul'
    | 'div'
    | 'min'
    | 'max';

/** Any operator name accepted by the builder. */
export type TCalculationBreakdownOperatorInput =
    | TCalculationBreakdownOperator
    | TCalculationBreakdownOperatorAlias;

/** Units available for duration values. */
export type TCalculationBreakdownDurationUnit =
    | 'milliseconds'
    | 'seconds'
    | 'minutes'
    | 'hours'
    | 'days';

/** Direction used when rounding a duration to a step. */
export type TCalculationBreakdownRounding = 'up' | 'down' | 'nearest';

/** Semantic role of a grouped expression. */
export type TCalculationBreakdownGroupRole = 'detail' | 'summary';

/** Preferred flow of a detail group in structured renderers. */
export type TCalculationBreakdownGroupOrientation =
    | 'horizontal'
    | 'vertical';

/** A semantic value that can be recorded as the authoritative result. */
export type TCalculationBreakdownValue<Semantic extends string> =
    | ICalculationBreakdownMoneyValue<Semantic>
    | ICalculationBreakdownDurationValue<Semantic>
    | ICalculationBreakdownNumberValue<Semantic>
    | ICalculationBreakdownPercentValue<Semantic>;

/** Any node that can appear in a calculation breakdown tree. */
export type TCalculationBreakdownNode<Semantic extends string> =
    | TCalculationBreakdownValue<Semantic>
    | ICalculationBreakdownConstantValue
    | ICalculationBreakdownOperation<Semantic>
    | ICalculationBreakdownGroup<Semantic>;
