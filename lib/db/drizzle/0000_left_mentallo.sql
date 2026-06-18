CREATE TABLE "notion_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"workspace_id" text NOT NULL,
	"workspace_name" text,
	"workspace_icon" text,
	"bot_id" text NOT NULL,
	"token_status" text DEFAULT 'active' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"state" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_mappings" (
	"user_id" text NOT NULL,
	"database_type" text NOT NULL,
	"notion_database_id" text,
	"mappings" json DEFAULT '{}'::json NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_mappings_user_id_database_type_pk" PRIMARY KEY("user_id","database_type")
);
--> statement-breakpoint
CREATE TABLE "staging_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"database_type" text NOT NULL,
	"data" json NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
