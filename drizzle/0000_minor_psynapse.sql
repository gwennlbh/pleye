CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"repository_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"name" text NOT NULL,
	"pull_request_number" integer,
	"pull_request_title" text,
	"pull_request_state" text
);
--> statement-breakpoint
CREATE TABLE "errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"result_id" integer,
	"step_id" integer,
	"run_id" integer,
	"file_path" text,
	"location_in_file" "point",
	"message" text,
	"stack" text,
	"snippet" text,
	"value" text,
	CONSTRAINT "errors_linked_to_something" CHECK (not ("errors"."result_id" is null and "errors"."step_id" is null and "errors"."run_id" is null))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"name" text NOT NULL,
	"match" json NOT NULL,
	"ignore" json NOT NULL,
	"timeout_ms" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"github_id" integer NOT NULL,
	"github_owner" text NOT NULL,
	"github_repo" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "repositories_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" serial PRIMARY KEY NOT NULL,
	"testrun_id" integer NOT NULL,
	"annotations" json NOT NULL,
	"duration" interval hour to second NOT NULL,
	"trace_viewer_url" text,
	"retry" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"status" text,
	"stderr" text NOT NULL,
	"stdout" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"github_job_id" bigint NOT NULL,
	"github_job_name" text NOT NULL,
	"github_run_id" bigint NOT NULL,
	"github_run_name" text NOT NULL,
	"base_directory" text,
	"commit_sha" text NOT NULL,
	"commit_title" text NOT NULL,
	"commit_description" text NOT NULL,
	"commit_author_name" text NOT NULL,
	"commit_author_username" text,
	"commit_author_email" text NOT NULL,
	"committed_at" timestamp,
	"branch" text NOT NULL,
	"branch_id" integer,
	"pull_request_number" integer,
	"pull_request_title" text,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"testruns_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"result" text
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"testrun_id" integer NOT NULL,
	"retry" integer DEFAULT 0 NOT NULL,
	"index" integer NOT NULL,
	"title" text NOT NULL,
	"path" text NOT NULL,
	"annotations" json NOT NULL,
	"category" text NOT NULL,
	"duration" interval hour to second,
	"file_path" text,
	"location_in_file" "point",
	"started_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testruns" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"outcome" text,
	"expected_status" text,
	"started_at" timestamp NOT NULL,
	"duration" interval hour to second,
	"retries" integer NOT NULL,
	"retries_limit" integer NOT NULL,
	"timeout_ms" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"path" text NOT NULL,
	"title" text NOT NULL,
	"file_path" text NOT NULL,
	"annotations" json NOT NULL,
	"tags" json NOT NULL,
	"location_in_file" "point" NOT NULL,
	"steps_count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "errors" ADD CONSTRAINT "errors_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "errors" ADD CONSTRAINT "errors_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "errors" ADD CONSTRAINT "errors_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_testrun_id_testruns_id_fk" FOREIGN KEY ("testrun_id") REFERENCES "public"."testruns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_testrun_id_testruns_id_fk" FOREIGN KEY ("testrun_id") REFERENCES "public"."testruns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testruns" ADD CONSTRAINT "testruns_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testruns" ADD CONSTRAINT "testruns_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testruns" ADD CONSTRAINT "testruns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key" ON "api_keys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "branches_by_repository" ON "branches" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_repository_and_name" ON "branches" USING btree ("repository_id","name");--> statement-breakpoint
CREATE INDEX "errors_by_result" ON "errors" USING btree ("result_id");--> statement-breakpoint
CREATE INDEX "errors_by_step" ON "errors" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "errors_by_run" ON "errors" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "projects_by_repository" ON "projects" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_repository_and_name" ON "projects" USING btree ("repository_id","name");--> statement-breakpoint
CREATE INDEX "repositories_by_owner_and_repo" ON "repositories" USING btree ("github_owner","github_repo");--> statement-breakpoint
CREATE UNIQUE INDEX "repositories_github_id" ON "repositories" USING btree ("github_id");--> statement-breakpoint
CREATE INDEX "results_by_testrun" ON "results" USING btree ("testrun_id");--> statement-breakpoint
CREATE UNIQUE INDEX "results_testrun_and_retry" ON "results" USING btree ("testrun_id","retry");--> statement-breakpoint
CREATE INDEX "runs_by_repository" ON "runs" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "runs_by_commit" ON "runs" USING btree ("repository_id","commit_sha");--> statement-breakpoint
CREATE INDEX "runs_by_pr" ON "runs" USING btree ("repository_id","pull_request_number");--> statement-breakpoint
CREATE INDEX "runs_by_branch" ON "runs" USING btree ("repository_id","branch");--> statement-breakpoint
CREATE UNIQUE INDEX "runs_repo_and_job" ON "runs" USING btree ("repository_id","github_job_id");--> statement-breakpoint
CREATE INDEX "steps_by_testrun" ON "steps" USING btree ("testrun_id");--> statement-breakpoint
CREATE UNIQUE INDEX "steps_testrun_retry_and_index" ON "steps" USING btree ("testrun_id","retry","index");--> statement-breakpoint
CREATE INDEX "testruns_by_run" ON "testruns" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "testruns_by_test" ON "testruns" USING btree ("test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "testruns_test_run_and_retries" ON "testruns" USING btree ("test_id","run_id","retries");--> statement-breakpoint
CREATE INDEX "tests_by_repository" ON "tests" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tests_repo_and_full_path" ON "tests" USING btree ("repository_id","file_path","path","title");