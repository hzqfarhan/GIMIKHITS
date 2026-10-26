import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const event = sqliteTable('event', {
  id:integer('id').primaryKey(), epoch:text('epoch').notNull(), quota:integer('quota').notNull().default(100),
  boost:integer('boost').notNull().default(0), paused:integer('paused').notNull().default(0),
  phase:text('phase').notNull().default('collecting'), code:text('code').notNull(),
  launchedAt:integer('launched_at'), videoUrl:text('video_url').notNull().default(''),
  audioSettings:text('audio_settings').notNull().default('{"musicVolume":25,"sfxVolume":100,"musicUrl":""}'),
});
export const activations = sqliteTable('activations', {
  epoch:text('epoch').notNull(), device:text('device').notNull(),
}, t=>[primaryKey({columns:[t.epoch,t.device]})]);
export const loginAttempts = sqliteTable('login_attempts', {
  bucket:text('bucket').primaryKey(), attempts:integer('attempts').notNull().default(0),
});
