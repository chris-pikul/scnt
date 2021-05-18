/**
 * Checks to see if the provided filename has an extension.
 * This is a simple 
 * 
 * @param fileName string filename
 * @returns boolean true if an extension exists
 */
export function hasExtension(fileName:string):boolean {
  if(typeof fileName !== 'string' || fileName.length === 0)
    return false;
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 1 && (fileName.length - lastDot) > 1;
}

// Regular expresion matching what should be commonly acceptable extensions.
const regexpExtension = /([\0\\/:*'"<>|.]+)/;

/**
 * Internally used to clean and normalize a given extension string.
 * 
 * @param ext String of a file extension
 * @returns String of a file extension
 */
export function cleanExtension(ext:string):string {
  if(typeof ext !== 'string' || ext.length === 0)
    return '';
  
  const lastDot = ext.lastIndexOf('.');
  const cln = lastDot === -1 ? ext : ext.substr(lastDot + 1);
  if(regexpExtension.test(cln))
    return '';
  
  return (cln.toLocaleLowerCase().trim());
}

/**
 * Attempts to extract the extension from a given filename.
 * 
 * Will return undefined if the string is empty, there is no period character
 * in the filename, or if the period is the first and only character.
 * 
 * @param fileName string filename
 * @returns string or undefined
 */
export function extractExtension(fileName:string):string {
  if(!hasExtension(fileName))
    return '';
  
  // Find the last dot character in the name
  const lastDotPos = fileName.lastIndexOf('.');

  // Return the extension, without the dot and normalized
  return cleanExtension(fileName.substr(lastDotPos + 1));
}
