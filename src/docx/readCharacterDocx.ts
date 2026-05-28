import mammoth from 'mammoth';
import { parseCharacterHtml } from './parseCharacterHtml.js';
import type { CharacterBook } from '../model/CharacterBook.js';

export async function readCharacterDocx(path: string): Promise<CharacterBook> {
  const result = await mammoth.convertToHtml({ path });
  return parseCharacterHtml(result.value);
}
