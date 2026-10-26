/** Machine-readable codes emitted when breakdown construction fails. */
export type TCalculationBreakdownErrorCode =
    | 'INVALID_SEMANTIC'
    | 'INVALID_DECIMAL'
    | 'INVALID_CURRENCY'
    | 'INVALID_DURATION_UNIT'
    | 'INVALID_OPERATOR'
    | 'INVALID_ROUNDING'
    | 'INVALID_ROUNDING_STEP'
    | 'INVALID_GROUP_ROLE'
    | 'INVALID_GROUP_ORIENTATION'
    | 'INVALID_NODE'
    | 'MISSING_BREAKDOWN'
    | 'MISSING_RESULT';

/** Error thrown when a calculation breakdown contains invalid or incomplete input. */
export class CalculationBreakdownError extends Error {
    /**
     * Creates a calculation breakdown error.
     *
     * @param code - Stable code suitable for programmatic error handling.
     * @param message - Human-readable explanation of the failure.
     */
    constructor(
        readonly code: TCalculationBreakdownErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'CalculationBreakdownError';
    }
}
