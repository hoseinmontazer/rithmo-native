/**
 * Custom PNG icon assets — single source of truth.
 * Import from here to get typed references to all app icons.
 */

const icons = {
  // Navigation / tabs
  home:             require('./home.png'),
  profile:          require('./profile.png'),
  settings:         require('./settings.png'),

  // Health & cycle
  menstruation:     require('./menstruation.png'),
  fertilization:    require('./fertilization.png'),
  healthcare:       require('./healthcare.png'),
  betterHealth:     require('./better-health.png'),
  mentalHealth:     require('./mental-health.png'),
  wellness:         require('./wellness.png'),

  // Medications
  drugs:            require('./drugs.png'),
  drugsAlt:         require('./drugs-1.png'),

  // AI & chat
  chatbot:          require('./chatbot.png'),
  robotWriting:     require('./robot-writing.png'),
  chat:             require('./chat.png'),

  // Social / partner
  collaborate:      require('./collaborate.png'),

  // Account actions
  edit:             require('./edit.png'),
  userInfoWriting:  require('./user-info-writing.png'),
  logout:           require('./logout.png'),
  delete:           require('./delete.png'),
  secure:           require('./secure.png'),

  // Notifications
  pushNotification: require('./push-notification.png'),

  // Misc
  search:           require('./search.png'),
} as const;

export default icons;
export type AppIconName = keyof typeof icons;
