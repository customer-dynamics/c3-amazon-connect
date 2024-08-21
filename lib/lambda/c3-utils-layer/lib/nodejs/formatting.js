/**
 * Removes any HTML tags from the given text.
 *
 * This function is useful for formatting messages to be spoken, to
 * ensure that the SSML is not spoken as part of the message.
 *
 * @param {string} text The text to strip HTML tags from.
 * @returns {string} The text with HTML tags removed.
 */
export function stripTagsFromText(text) {
	return text.replace(/<[^>]*>/g, '');
}
