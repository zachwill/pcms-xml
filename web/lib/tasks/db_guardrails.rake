# Safety guardrails for a shared database.
#
# This app intentionally points at a long-lived database where auth data lives.
# Block destructive Rails DB tasks that can drop/truncate `web.users`.

blocked_tasks = %w[
  db:drop
  db:drop:all
  db:purge
  db:purge:all
  db:reset
  db:migrate:reset
  db:schema:load
  db:seed:replant
  db:setup
  test:db
].freeze

blocked_tasks.each do |task_name|
  next unless Rake::Task.task_defined?(task_name)

  Rake::Task[task_name].clear

  task task_name do
    abort <<~MSG
      Blocked task: #{task_name}

      This command is disabled to protect auth data in web.users.
      Use safe commands instead (for example: `bin/rails db:prepare`, `bin/rails db:migrate`, `bin/rails db:seed`).
    MSG
  end
end
