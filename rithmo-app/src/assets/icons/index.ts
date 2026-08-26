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

  // Energy scale (ثبت امروز) — 1 critical … 5 full. Ordered by how much of
  // the battery is filled, so the row reads as a scale on sight.
  energy1:          require('./energy-1.png'),
  energy2:          require('./energy-2.png'),
  energy3:          require('./energy-3.png'),
  energy4:          require('./energy-4.png'),
  energy5:          require('./energy-5.png'),

  // Mood scale (ثبت امروز) — 1 heavy … 5 great
  moodExhausted:    require('./exhausted.png'),
  moodCute:         require('./cute.png'),
  moodDisappointed: require('./dissapointment.png'),
  moodAngel:        require('./angel.png'),
  moodHappy:        require('./happy.png'),

  // Misc
  search:           require('./search.png'),
} as const;

export default icons;
export type AppIconName = keyof typeof icons;
