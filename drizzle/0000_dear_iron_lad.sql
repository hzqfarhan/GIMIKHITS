CREATE TABLE `activations` (
	`epoch` text NOT NULL,
	`device` text NOT NULL,
	PRIMARY KEY(`epoch`, `device`)
);
--> statement-breakpoint
CREATE TABLE `event` (
	`id` integer PRIMARY KEY NOT NULL,
	`epoch` text NOT NULL,
	`quota` integer DEFAULT 100 NOT NULL,
	`boost` integer DEFAULT 0 NOT NULL,
	`paused` integer DEFAULT 0 NOT NULL,
	`phase` text DEFAULT 'collecting' NOT NULL,
	`code` text NOT NULL,
	`launched_at` integer,
	`video_url` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`bucket` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
