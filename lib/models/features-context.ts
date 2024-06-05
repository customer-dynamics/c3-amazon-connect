import { SubjectLookupMode } from './enums/subject-lookup-mode';

export interface FeaturesContext {
	agentAssistedIVR: boolean;
	agentAssistedLink: boolean;
	selfServiceIVR: boolean;
	subjectLookup: SubjectLookupMode;
}

/**
 * Validates the feature context variables. Throws an error if any of the required variables are missing.
 *
 * @param featuresContext The feature context variables.
 */
export function validateFeaturesContext(
	featuresContext: FeaturesContext,
): void {
	if (!featuresContext) {
		throw new Error('Feature context variables are required.');
	} else if (
		!Object.values(SubjectLookupMode).includes(featuresContext.subjectLookup)
	) {
		throw new Error(
			`features.subjectLookup context variable is invalid. Must be one of: ${Object.values(SubjectLookupMode).join(', ')}`,
		);
	} else if (
		featuresContext.subjectLookup &&
		!(featuresContext.agentAssistedIVR || featuresContext.agentAssistedLink)
	) {
		throw new Error(
			'features.subjectLookup requires features.agentAssistedIVR or features.agentAssistedLink to be enabled.',
		);
	}
}
