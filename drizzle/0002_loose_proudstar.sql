CREATE TABLE `observability_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` text NOT NULL,
	`level` text NOT NULL,
	`source` text NOT NULL,
	`event` text NOT NULL,
	`request_id` text,
	`method` text,
	`route` text,
	`status` integer,
	`duration_ms` integer,
	`actor_id` text,
	`ip_hash` text,
	`details` text,
	`content` text
);
--> statement-breakpoint
CREATE INDEX `observability_logs_occurred_at_idx` ON `observability_logs` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `observability_logs_level_occurred_at_idx` ON `observability_logs` (`level`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `observability_logs_request_id_idx` ON `observability_logs` (`request_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `observability_logs_event_occurred_at_idx` ON `observability_logs` (`event`,`occurred_at`);