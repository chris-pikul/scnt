/**
 * Type for an object holding a string key, and string array values.
 */
export type ExtensionMap = {
  [key:string]:string[]
};

/**
 * The extension map holds the information mapping a file type to its accepted
 * extensions. This information is held as an object with string keys matching
 * to the file type, with the value being a string array of accepted extensions.
 */
const extensionMap:ExtensionMap = {
  javascript: [
    'js',
    'jsx',
    'mjs',
  ],
};

/**
 * Checks if the extension map contains a listing for the given file type.
 * 
 * @param type String type to check for
 * @returns True if the extension map contains that type
 */
export function hasType(type:string):boolean {
  const cleanType = type.toLowerCase().trim();

  return !!(extensionMap[cleanType]);
}

/**
 * Returns the extensions available to a given type. Will return an empty array
 * if no valid type is found.
 * 
 * @param type String type to check for
 * @returns Array of string extensions, or empty if no type matches
 */
export function getTypeExtensions(type:string):string[] {
  const cleanType = type.toLowerCase().trim();

  if(!extensionMap[cleanType])
    return [] as string[];

  return extensionMap[cleanType];
}

/**
 * Searches the extension map for a type that matches the provided one.
 * Will return the type name if one is found, otherwise an empty string.
 * 
 * @param ext String extension to search for
 * @returns The type string, or an empty string if nothing matches
 */
export function getExtensionType(ext:string):string {
  const cleanExt = ext.toLowerCase().trim();

  if(cleanExt.length === 0)
    return '';

  for(const [ type, arr ] of Object.entries(extensionMap)) {
    if(arr.includes(cleanExt))
      return type;
  }

  return '';
}

/**
 * Adds a new type listing to the extension map.
 * 
 * If the type identifier already exists, then the extensions supplied are
 * merged into it.
 * 
 * Otherwise a new listing is created.
 * 
 * All type keys and extension keys are normalized before usage.
 * 
 * @param type String type identifier
 * @param exts Array of string extensions
 */
export function addExtensionType(type:string, exts:string[] = []):void {
  const cleanType = type.toLowerCase().trim();

  if(cleanType.length === 0)
    return;

  if(extensionMap[cleanType]) {
    // Normalize the extensions, remove duds, de-dupe them, then add them
    exts.map(ext => ext.toLowerCase().trim())
      .filter(ext => !!(ext && ext.length > 0))
      .filter(ext => !extensionMap[cleanType].includes(ext))
      .forEach(ext => extensionMap[cleanType].push(ext));
  } else {
    extensionMap[cleanType] = exts.map(ext => ext.toLowerCase().trim())
      .filter(ext => !!(ext && ext.length > 0));
  }
}

/**
 * Adds new extensions to an existing type.
 * 
 * Will not create a new type if one does not match, use `addExtensionType` for
 * that functionality.
 * 
 * Each extension is normalized before adding, and duplicates will be ignored.
 * 
 * @param type String type to add to
 * @param exts Array of string extensions
 */
export function addExtensionsToType(type:string, exts:string[]):void {
  const cleanType = type.toLowerCase().trim();

  if(extensionMap[cleanType]) {
    // Normalize the extensions, remove duds, de-dupe them, then add them
    exts.map(ext => ext.toLowerCase().trim())
      .filter(ext => !!(ext && ext.length > 0))
      .filter(ext => !extensionMap[cleanType].includes(ext))
      .forEach(ext => extensionMap[cleanType].push(ext));
  }
}
