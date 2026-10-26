/** Error thrown when a calculation breakdown contains invalid or incomplete input. */
export class CalculationBreakdownError extends Error {
    code;
    /**
     * Creates a calculation breakdown error.
     *
     * @param code - Stable code suitable for programmatic error handling.
     * @param message - Human-readable explanation of the failure.
     */
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'CalculationBreakdownError';
    }
}
//# sourceMappingURL=calculation-breakdown.error.js.map