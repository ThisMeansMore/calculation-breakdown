import type {
    TCalculationBreakdownDurationUnit,
    TCalculationBreakdownGroupRole,
    TCalculationBreakdownGroupOrientation,
    TCalculationBreakdownNode,
    TCalculationBreakdownOperator,
    TCalculationBreakdownOperatorInput,
    TCalculationBreakdownRounding,
    TCalculationBreakdownValue,
} from './calculation-breakdown.type.js';

/** Optional rounding rules for a duration value. */
export interface ICalculationBreakdownDurationOptions {
    /** Direction in which the duration is rounded. Must be used with `step`. */
    rounding?: TCalculationBreakdownRounding;
    /** Positive interval to which the duration is rounded. Must be used with `rounding`. */
    step?: number;
}

/** A monetary value represented by an exact decimal string and currency code. */
export interface ICalculationBreakdownMoneyValue<Semantic extends string> {
    /** Discriminator for a monetary value. */
    readonly type: 'money';
    /** Domain-specific meaning of the value. */
    readonly semantic: Semantic;
    /** Exact decimal amount. */
    readonly amount: string;
    /** Three-letter uppercase currency code, such as `USD`. */
    readonly currency: string;
}

/** A duration represented by an exact decimal string and unit. */
export interface ICalculationBreakdownDurationValue<Semantic extends string>
    extends ICalculationBreakdownDurationOptions {
    /** Discriminator for a duration value. */
    readonly type: 'duration';
    /** Domain-specific meaning of the value. */
    readonly semantic: Semantic;
    /** Exact decimal duration. */
    readonly amount: string;
    /** Unit in which the duration is expressed. */
    readonly unit: TCalculationBreakdownDurationUnit;
}

/** A dimensionless semantic number represented by an exact decimal string. */
export interface ICalculationBreakdownNumberValue<Semantic extends string> {
    /** Discriminator for a semantic number. */
    readonly type: 'number';
    /** Domain-specific meaning of the value. */
    readonly semantic: Semantic;
    /** Exact decimal value. */
    readonly value: string;
}

/** A percentage represented as an exact fractional decimal string. */
export interface ICalculationBreakdownPercentValue<Semantic extends string> {
    /** Discriminator for a percentage value. */
    readonly type: 'percent';
    /** Domain-specific meaning of the value. */
    readonly semantic: Semantic;
    /** Exact fractional value, where `0.20` represents 20%. */
    readonly value: string;
}

/** A dimensionless numeric literal used inside an expression. */
export interface ICalculationBreakdownConstantValue {
    /** Discriminator for a constant. */
    readonly type: 'constant';
    /** Exact decimal value. */
    readonly value: string;
}

/** A binary operation recorded in a calculation breakdown. */
export interface ICalculationBreakdownOperation<Semantic extends string> {
    /** Discriminator for an operation. */
    readonly type: 'operation';
    /** Operation applied to the two operands. */
    readonly operator: TCalculationBreakdownOperator;
    /** Left and right operands, in evaluation order. */
    readonly operands: readonly [
        TCalculationBreakdownNode<Semantic>,
        TCalculationBreakdownNode<Semantic>,
    ];
}

/** Optional presentation hints for an explicitly grouped expression. */
export interface ICalculationBreakdownGroupOptions<
    Semantic extends string = string,
> {
    /** Suggests that renderers place this group on its own visual line. */
    readonly wrap?: boolean;
    /** Domain-specific meaning of the grouped expression. */
    readonly semantic?: Semantic;
    /** Authoritative result of the grouped expression, such as a line subtotal. */
    readonly result?: TCalculationBreakdownValue<Semantic>;
    /** Identifies a roll-up whose authoritative result may be emphasized by renderers. */
    readonly role?: TCalculationBreakdownGroupRole;
    /** Preferred flow for detail values. Omitted groups default to horizontal. */
    readonly orientation?: TCalculationBreakdownGroupOrientation;
}

/** An explicitly grouped subexpression. */
export interface ICalculationBreakdownGroup<Semantic extends string>
    extends ICalculationBreakdownGroupOptions<Semantic> {
    /** Discriminator for a group. */
    readonly type: 'group';
    /** Expression enclosed by the group. */
    readonly expression: TCalculationBreakdownNode<Semantic>;
}

/** Serializable, immutable record of how an externally calculated result was derived. */
export interface ICalculationBreakdown<Semantic extends string> {
    /** Root node describing the operations and values in the calculation. */
    readonly breakdown: TCalculationBreakdownNode<Semantic>;
    /** Authoritative result supplied by the calling application. */
    readonly result: TCalculationBreakdownValue<Semantic>;
}

/** Factory methods available inside breakdown and result callbacks. */
export interface ICalculationBreakdownNodeBuilder<Semantic extends string> {
    /** Creates a monetary value. */
    money(
        semantic: Semantic,
        amount: string,
        currency: string,
    ): ICalculationBreakdownMoneyValue<Semantic>;
    /** Creates a duration value, optionally with a rounding rule. */
    duration(
        semantic: Semantic,
        amount: string,
        unit: TCalculationBreakdownDurationUnit,
        options?: ICalculationBreakdownDurationOptions,
    ): ICalculationBreakdownDurationValue<Semantic>;
    /** Creates a semantic, dimensionless number. */
    number(
        semantic: Semantic,
        value: string,
    ): ICalculationBreakdownNumberValue<Semantic>;
    /** Creates a percentage from a fractional decimal, such as `0.20` for 20%. */
    percent(
        semantic: Semantic,
        value: string,
    ): ICalculationBreakdownPercentValue<Semantic>;
    /** Creates a dimensionless numeric literal. */
    constant(value: string): ICalculationBreakdownConstantValue;
    /** Preserves an explicit grouping and optional presentation hints. */
    group(
        expression: TCalculationBreakdownNode<Semantic>,
        options?: ICalculationBreakdownGroupOptions<Semantic>,
    ): ICalculationBreakdownGroup<Semantic>;
    /** Creates a binary operation using any supported operator. */
    operator(
        left: TCalculationBreakdownNode<Semantic>,
        operator: TCalculationBreakdownOperatorInput,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Adds two expressions. */
    add(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Subtracts the right expression from the left expression. */
    subtract(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Decimal.js-style alias for `subtract`. */
    sub(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Multiplies two expressions. */
    multiply(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Decimal.js-style alias for `multiply`. */
    mul(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Divides the left expression by the right expression. */
    divide(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Decimal.js-style alias for `divide`. */
    div(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Selects the smaller of two expressions. */
    minimum(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Decimal.js-style alias for `minimum`. */
    min(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Selects the larger of two expressions. */
    maximum(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
    /** Decimal.js-style alias for `maximum`. */
    max(
        left: TCalculationBreakdownNode<Semantic>,
        right: TCalculationBreakdownNode<Semantic>,
    ): ICalculationBreakdownOperation<Semantic>;
}
