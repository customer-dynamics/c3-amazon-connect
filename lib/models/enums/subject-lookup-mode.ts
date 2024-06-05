/**
 * The various modes of how subject lookup can be performed.
 */
export enum SubjectLookupMode {
	/** The agent must perform a lookup to proceed. The agent cannot modify the values from lookup. */
	RequiredFixed = 'required-fixed',

	/** The agent must perform a lookup to proceed. The agent can modify values from lookup. */
	RequiredEditable = 'required-editable',

	/** The agent has the option to perform a lookup. The agent can modify values from lookup. */
	OptionalEditable = 'optional-editable',

	/** The agent is not set up to perform a lookup. */
	Disabled = '',
}
