/**
 * Custom PNG icon assets.
 * Import from here to get typed references to all app icons.
 */

const icons = {
  home:             require('./home.png'),
  healthcare:       require('./healthcare.png'),
  menstruation:     require('./menstruation.png'),
  chatbot:          require('./chatbot.png'),
  robotWriting:     require('./robot-writing.png'),
  profile:          require('./profile.png'),
  search:           require('./search.png'),
  userInfoWriting:  require('./user-info-writing.png'),
  betterHealth:     require('./better-health.png'),
  mentalHealth:     require('./mental-health.png'),
  collaborate:      require('./collaborate.png'),
  drugs:            require('./drugs.png'),
  drugsAlt:         require('./drugs-1.png'),
  edit:             require('./edit.png'),
} as const;

export default icons;
export type AppIconName = keyof typeof icons;
