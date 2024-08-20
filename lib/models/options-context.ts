import {
	IvrSpeakingContext,
	validateIvrSpeakingContext,
} from './ivr-speaking-context';

export interface OptionsContext {
	codeSigning: boolean;
	ivrSpeaking: IvrSpeakingContext;
}

/**
 * Validates the options context variables. Throws an error if any of the required variables are missing.
 *
 * @param optionsContext The options context variables.
 */
export function validateOptionsContext(optionsContext: OptionsContext): void {
	if (!optionsContext) {
		throw new Error('Option context variables are required.');
	}
	validateIvrSpeakingContext(optionsContext.ivrSpeaking);
}
