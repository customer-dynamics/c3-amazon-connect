import { SpeakingRate, SpeakingVolume } from './enums';

export interface IvrSpeakingContext {
	rate: SpeakingRate;
	volume: SpeakingVolume;
}

/**
 * Validates the IVR speaking context variables. Throws an error if any of the required variables are missing or invalid.
 *
 * @param ivrSpeakingContext The IVR speaking context variables.
 */
export function validateIvrSpeakingContext(
	ivrSpeakingContext: IvrSpeakingContext,
): void {
	if (!ivrSpeakingContext) {
		throw new Error('IVR speaking context variables are required.');
	} else if (!ivrSpeakingContext.rate) {
		throw new Error('ivrSpeaking.rate context variable is required.');
	} else if (!Object.values(SpeakingRate).includes(ivrSpeakingContext.rate)) {
		throw new Error(
			`ivrSpeaking.rate context variable is invalid. Must be one of: ${Object.values(SpeakingRate).join(', ')}`,
		);
	} else if (!ivrSpeakingContext.volume) {
		throw new Error('ivrSpeaking.volume context variable is required.');
	} else if (
		!Object.values(SpeakingVolume).includes(ivrSpeakingContext.volume)
	) {
		throw new Error(
			`ivrSpeaking.volume context variable is invalid. Must be one of: ${Object.values(SpeakingVolume).join(', ')}`,
		);
	}
}
