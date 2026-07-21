-- CreateTable
CREATE TABLE "staff_user_roles" (
    "staff_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "staff_user_roles_pkey" PRIMARY KEY ("staff_user_id","role_id")
);

-- CreateIndex
CREATE INDEX "staff_user_roles_role_id_idx" ON "staff_user_roles"("role_id");

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
