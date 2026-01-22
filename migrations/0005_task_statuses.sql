ALTER TABLE task_assignments ADD COLUMN status_updated_by_user_id INTEGER;
ALTER TABLE task_assignments ADD COLUMN status_note TEXT;

ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'ACTIVE';

UPDATE task_assignments
SET status = CASE
  WHEN lower(status) IN ('active', 'new', 'pending', 'accepted', 'in_progress') THEN 'ACTIVE'
  WHEN lower(status) IN ('done', 'completed') THEN 'DONE'
  WHEN lower(status) IN ('rejected') THEN 'CANNOT_DO'
  ELSE 'ACTIVE'
END
WHERE status IS NOT NULL;

UPDATE tasks
SET status = CASE
  WHEN lower(status) IN ('active', 'new', 'pending') THEN 'ACTIVE'
  WHEN lower(status) IN ('done', 'completed') THEN 'DONE'
  ELSE 'ACTIVE'
END
WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS task_assignments_user_status_index ON task_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS task_assignments_created_at_index ON task_assignments(created_at);
CREATE INDEX IF NOT EXISTS tasks_status_index ON tasks(status);
