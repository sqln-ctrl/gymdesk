INSERT OR IGNORE INTO "Permission" ("id", "key", "name", "description", "createdAt", "updatedAt") VALUES
  ('perm_class_book_v1', 'class.book', 'Book members into classes', 'Book members into classes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_class_manage_v1', 'class.manage', 'Manage classes and attendance', 'Manage classes and attendance', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_class_read_v1', 'class.read', 'View classes and class schedules', 'View classes and class schedules', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_equipment_manage_v1', 'equipment.manage', 'Manage equipment and maintenance', 'Manage equipment and maintenance', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_equipment_read_v1', 'equipment.read', 'View equipment and maintenance', 'View equipment and maintenance', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "RolePermission" ("roleId", "permissionId")
SELECT "Role"."id", "Permission"."id"
FROM "Role" CROSS JOIN "Permission"
WHERE "Role"."key" IN ('OWNER', 'BRANCH_ADMIN')
  AND "Permission"."key" IN ('class.book', 'class.manage', 'class.read', 'equipment.manage', 'equipment.read');

INSERT OR IGNORE INTO "RolePermission" ("roleId", "permissionId")
SELECT "Role"."id", "Permission"."id"
FROM "Role" CROSS JOIN "Permission"
WHERE "Role"."key" = 'RECEPTIONIST'
  AND "Permission"."key" IN ('class.book', 'class.read', 'equipment.read');

INSERT OR IGNORE INTO "RolePermission" ("roleId", "permissionId")
SELECT "Role"."id", "Permission"."id"
FROM "Role" CROSS JOIN "Permission"
WHERE "Role"."key" = 'TRAINER'
  AND "Permission"."key" IN ('class.manage', 'class.read');
