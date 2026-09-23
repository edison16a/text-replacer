/**
 * Turns data/theme.json into CSS custom properties.
 *
 * The stylesheet names roles (--color-startButton), the data file maps each
 * role to a palette entry, and the palette holds the actual colour once. This
 * module is the join between the two, and it is where a broken mapping is
 * caught: a role pointing at a palette name that does not exist throws here,
 * instead of silently rendering an element with no colour at all.
 */

/**
 * @param {{palette: Record<string, string>, roles: Record<string, string>}} theme
 * @returns {Record<string, string>} Custom property names mapped to colours.
 */
export function themeToCustomProperties(theme) {
  /** @type {Record<string, string>} */
  const properties = {};
  for (const [role, paletteName] of Object.entries(theme.roles ?? {})) {
    const colour = theme.palette?.[paletteName];
    if (colour === undefined) {
      throw new Error(`theme role "${role}" points at unknown palette entry "${paletteName}"`);
    }
    properties[`--color-${role}`] = colour;
  }
  return properties;
}

/**
 * Writes the theme onto an element, normally documentElement so the whole
 * popup inherits it.
 *
 * @param {{palette: Record<string, string>, roles: Record<string, string>}} theme
 * @param {HTMLElement} element
 */
export function applyTheme(theme, element) {
  for (const [name, colour] of Object.entries(themeToCustomProperties(theme))) {
    element.style.setProperty(name, colour);
  }
}
