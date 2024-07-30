import { existsSync, mkdirSync, writeFileSync } from 'fs';

/**
 * Writes a file to the ./exports directory.
 *
 * @param fileName The name of the file to write (including extension).
 * @param content The content to write to the file.
 */
export function writeFileToExports(fileName: string, content: string) {
	// If the ./exports directory doesn't exist, create it.
	if (!existsSync('./exports')) {
		mkdirSync('./exports');
	}

	writeFileSync(`./exports/${fileName}`, content);
}
